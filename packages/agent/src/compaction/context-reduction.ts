/**
 * Deterministic, no-LLM context reduction: transforms that shrink the context
 * BEFORE the summarizer is called, so the summarizer pays for shape rather than
 * for bytes.
 *
 * ## Provenance
 *
 * Adapted from senpi's `packages/coding-agent/src/core/extensions/builtin/
 * compaction/context-reduction.ts` (MIT, Copyright (c) 2026 Yeongyu Kim and
 * senpi contributors), which is itself a port of the plugsuits `context-collapse`
 * and `micro-compact` patterns. The algorithms — the assistant/tool-result run
 * pairing, the one-line group label, the `[response shrunk]` marker and its
 * fixed-point sizing — are theirs.
 *
 * ## What changed in the move, and why
 *
 * senpi's file is written for a flat `AgentMessage[]` that it returns a fresh
 * copy of. Four things did not survive the move unchanged:
 *
 * 1. **In place, not copied.** omp persists the session, and every history
 *    rewrite here (`pruneToolOutputs`, `pruneSupersededToolResults`) mutates the
 *    live message objects and then calls `sessionManager.rewriteEntries()`. A
 *    transform that returned new message objects would leave the session FILE
 *    holding the originals, so `/fork` and `/resume` would rebuild a prefix that
 *    diverges from the one the provider has been answering against — the exact
 *    failure the `#pruneStaleToolResults` doc comment warns about. These mutate
 *    in place and call `invalidateMessageCache`, like their siblings.
 * 2. **`SessionEntry[]`, not `AgentMessage[]`.** A branch interleaves message
 *    entries with compaction, label, model-change and custom entries, so the
 *    `i` / `i + 1` / `i += 2` index arithmetic runs over a message projection and
 *    maps back to entry indices. Walking `entries` directly would pair a tool
 *    result with whatever entry happens to follow it.
 * 3. **The real tokenizer, on both sides.** senpi estimates everything with
 *    chars/4. A savings figure is a subtraction, so measuring the original with
 *    the tokenizer and the replacement with a heuristic would report savings that
 *    never materialise. Every subtraction here is tokenizer-minus-tokenizer.
 * 4. **`keepBoundaryId`.** Entries before the latest compaction's
 *    `firstKeptEntryId` are summarized away and never sent, so rewriting them is
 *    pure history churn — the same guard `PruneConfig.keepBoundaryId` carries.
 *
 * ## Not ported
 *
 * senpi's third transform, `clearOldToolResults`, is omp's `pruneToolOutputs`
 * already. Porting it would give omp two passes blanking the same results.
 *
 * ## How an extension reaches this
 *
 * The registration seam already exists — `registerContextTransform` on the
 * public `ExtensionAPI`, backed by `tools/compaction-transforms.ts`, consumes
 * exactly `(entries, tokenizer) => PruneResult`. Both exports at the bottom of
 * this file are already that shape, so the transforms are reachable from an
 * extension with no core change:
 *
 * ```ts
 * pi.registerContextTransform({ name: "collapse-reads", transform: collapseToolResultRuns });
 * ```
 *
 * Nothing here is registered by default. Which reductions run is a product
 * decision, not a capability one, so the transforms ship as reachable
 * capability and the registry starts empty.
 */
import type { AssistantMessage, ImageContent, TextContent, ToolResultMessage } from "@oh-my-pi/pi-ai";
import type { Tokenizer } from "../tokenizer";
import type { AgentMessage } from "../types";
import type { SessionEntry, SessionMessageEntry } from "./entries";
import { invalidateMessageCache } from "./message-cache";
import type { PruneResult } from "./pruning";

/** Tool-result families whose runs are worth collapsing. */
export type CollapsedGroupKind = "read" | "search" | "shell";

/**
 * Built-in transforms, by name. The set is closed so a caller that names one
 * that does not exist is reported rather than silently reducing nothing.
 */
export type ContextReductionTransformName = "collapse" | "shrink";

/** Every built-in transform, in the order {@link reduceContext} plans them. */
export const CONTEXT_REDUCTION_TRANSFORMS: readonly ContextReductionTransformName[] = ["collapse", "shrink"];

export interface CollapsedGroup {
	type: CollapsedGroupKind;
	/** Results in the run. */
	count: number;
	/** The exact one-line replacement written over every result in the run. */
	label: string;
	originalTokens: number;
	collapsedTokens: number;
}

export interface ContextReductionConfig {
	/**
	 * Built-in transforms to run. A transform not named here is skipped entirely,
	 * which is how a caller enables one without inheriting the other. Undefined =
	 * both, the pass's full default.
	 */
	transforms?: readonly ContextReductionTransformName[];
	/** Tool names collapsed as file reads. */
	readToolNames?: string[];
	/** Tool names collapsed as searches. */
	searchToolNames?: string[];
	/** Tool names collapsed as shell runs. */
	shellToolNames?: string[];
	/** Consecutive same-kind results required before a run collapses. Default 2. */
	minGroupSize?: number;
	/** Trailing message count never collapsed. Default 5. */
	protectRecentMessages?: number;
	/** Trailing token budget never shrunk. Default 2000. */
	protectRecentTokens?: number;
	/** Assistant text above this many tokens is truncated. Default 500. */
	maxAssistantTextTokens?: number;
	/** Skip a transform whose total savings fall below this. Default 100. */
	minimumSavings?: number;
	/**
	 * Compaction boundary. Entries before this id are summarized away and never
	 * sent, so they are skipped. Undefined = no compaction (the whole branch is
	 * sent).
	 */
	keepBoundaryId?: string;
	/** Marker appended to a shrunk assistant answer. */
	replacementTemplate?: string;
}

export interface ContextReductionResult {
	/** Assistant/tool-result pairs whose result content was rewritten. */
	collapsedResults: number;
	/** Groups actually collapsed (runs of at least `minGroupSize`). */
	groups: CollapsedGroup[];
	/** Older assistant answers truncated. */
	shrunkMessages: number;
	tokensSaved: number;
}

const DEFAULT_READ_TOOL_NAMES = ["read", "Read", "read_file"];
const DEFAULT_SEARCH_TOOL_NAMES = ["grep", "Grep", "glob", "Glob"];
const DEFAULT_SHELL_TOOL_NAMES = ["bash", "Bash", "shell", "shell_execute"];

const DEFAULT_MIN_GROUP_SIZE = 2;
const DEFAULT_PROTECT_RECENT_MESSAGES = 5;
const DEFAULT_PROTECT_RECENT_TOKENS = 2000;
const DEFAULT_MAX_ASSISTANT_TEXT_TOKENS = 500;
const DEFAULT_MIN_SAVINGS_TOKENS = 100;

const MAX_HINTS_IN_LABEL = 5;
const MAX_HINT_LENGTH = 80;
const SHRUNK_RESPONSE_RATIO = 0.3;

/** Exact marker appended to an assistant answer this module truncated. */
export const RESPONSE_SHRUNK_MARKER = "response shrunk";

export const DEFAULT_REPLACEMENT_TEMPLATE = `[${RESPONSE_SHRUNK_MARKER} — {original_tokens} → {shrunk_tokens} tokens]`;

/** A message entry paired with its position in the branch's `entries` array. */
interface MessageRef {
	/** Index into the `entries` array this module was called with. */
	readonly index: number;
	readonly entry: SessionMessageEntry;
	readonly message: AgentMessage;
}

/**
 * A proposed rewrite of one message's content, held until the pass clears its
 * minimum-savings gate.
 *
 * Nothing here touches `message.content`. A transform that has already mutated
 * the branch cannot be un-mutated, so a reduction which ends up below the gate
 * would leave the session rewritten for nothing — churning the prompt cache and
 * rewriting the session file to reclaim nothing.
 */
interface PendingWrite {
	readonly ref: MessageRef;
	readonly content: (TextContent | ImageContent)[];
	readonly originalTokens: number;
	/** Token cost of `content` once written, measured with the same tokenizer. */
	readonly writtenTokens: number;
	/** Savings this single write contributes. */
	readonly saved: number;
}

interface ToolNameSets {
	read: Set<string>;
	search: Set<string>;
	shell: Set<string>;
}

/**
 * One assistant/tool-result pair that could be collapsed, with the tool-call
 * arguments already read for the label hint.
 */
interface CollapsibleOperation {
	readonly type: CollapsedGroupKind;
	/** Position within the message projection. */
	readonly assistantPos: number;
	readonly resultPos: number;
	readonly resultRef: MessageRef;
	readonly hint: string | undefined;
	readonly originalTokens: number;
}

function classifyTool(name: string, sets: ToolNameSets): CollapsedGroupKind | null {
	if (sets.read.has(name)) return "read";
	if (sets.search.has(name)) return "search";
	if (sets.shell.has(name)) return "shell";
	return null;
}

function firstToolCall(message: AgentMessage): { id: string; name: string; args: Record<string, unknown> } | null {
	if (message.role !== "assistant") return null;
	for (const block of message.content) {
		if (block.type === "toolCall") {
			return { id: block.id, name: block.name, args: block.arguments as Record<string, unknown> };
		}
	}
	return null;
}

function truncateHint(value: string): string {
	return value.length <= MAX_HINT_LENGTH ? value : `${value.slice(0, MAX_HINT_LENGTH - 1)}…`;
}

/**
 * A short, human-readable handle for the operation — the path read, the
 * `path:pattern` searched, the command run. Optional throughout: a run whose
 * arguments carry none still collapses to a counted label.
 */
function extractHint(type: CollapsedGroupKind, args: Record<string, unknown>): string | undefined {
	if (type === "read") {
		const path = args.path ?? args.filePath ?? args.file_path;
		return typeof path === "string" && path.length > 0 ? truncateHint(path) : undefined;
	}
	if (type === "search") {
		const path = typeof args.path === "string" ? args.path : undefined;
		const pattern = [args.pattern, args.glob, args.query].find(
			value => typeof value === "string" && value.length > 0,
		);
		if (path && pattern) return truncateHint(`${path}:${pattern as string}`);
		if (path) return truncateHint(path);
		return pattern ? truncateHint(pattern as string) : undefined;
	}
	const command = args.command ?? args.cmd;
	return typeof command === "string" && command.length > 0 ? truncateHint(command) : undefined;
}

function buildGroupLabel(type: CollapsedGroupKind, operations: readonly CollapsibleOperation[]): string {
	const hints: string[] = [];
	for (const operation of operations) {
		if (operation.hint && hints.length < MAX_HINTS_IN_LABEL) hints.push(operation.hint);
	}
	const noun = type === "read" ? "read results" : type === "search" ? "search results" : "shell results";
	if (hints.length === 0) return `[${operations.length} ${noun}]`;
	const more = operations.length - hints.length;
	return `[${operations.length} ${noun}: ${hints.join(", ")}${more > 0 ? `, and ${more} more` : ""}]`;
}

/**
 * Project the branch onto its message entries, dropping everything before the
 * compaction boundary. The transforms address messages positionally, so this is
 * what makes an interleaved branch addressable.
 */
function projectMessages(entries: readonly SessionEntry[], keepBoundaryId: string | undefined): MessageRef[] {
	const boundaryIndex =
		keepBoundaryId === undefined
			? 0
			: Math.max(
					0,
					entries.findIndex(entry => entry.id === keepBoundaryId),
				);
	const refs: MessageRef[] = [];
	for (let index = boundaryIndex; index < entries.length; index++) {
		const entry = entries[index];
		if (entry?.type !== "message") continue;
		refs.push({ index, entry, message: entry.message });
	}
	return refs;
}

/**
 * Every assistant/tool-result pair whose tool belongs to a collapsed family and
 * whose result is the immediately following message.
 *
 * "Immediately following" is what makes a RUN a run: a group only forms when the
 * pairs are back-to-back, because the whole point is that a summarizer can read
 * one line in place of a contiguous block.
 */
function collectCollapsibleOperations(
	refs: readonly MessageRef[],
	sets: ToolNameSets,
	tokenizer: Tokenizer,
): CollapsibleOperation[] {
	const operations: CollapsibleOperation[] = [];
	for (let pos = 0; pos + 1 < refs.length; pos++) {
		const call = firstToolCall(refs[pos]!.message);
		if (!call) continue;
		const resultRef = refs[pos + 1]!;
		const result = resultRef.message;
		if (result.role !== "toolResult") continue;
		if ((result as ToolResultMessage).toolCallId !== call.id) continue;
		const type = classifyTool(call.name, sets);
		if (!type) continue;
		operations.push({
			type,
			assistantPos: pos,
			resultPos: pos + 1,
			resultRef,
			hint: extractHint(type, call.args),
			originalTokens: tokenizer.countMessage(result),
		});
	}
	return operations;
}

function groupConsecutiveOperations(operations: readonly CollapsibleOperation[]): CollapsibleOperation[][] {
	const groups: CollapsibleOperation[][] = [];
	let current: CollapsibleOperation[] = [];
	for (const operation of operations) {
		const previous = current[current.length - 1];
		if (previous && operation.type === previous.type && operation.assistantPos === previous.resultPos + 1) {
			current.push(operation);
			continue;
		}
		if (current.length > 0) groups.push(current);
		current = [operation];
	}
	if (current.length > 0) groups.push(current);
	return groups;
}

/**
 * Propose replacing every run of same-kind tool results with a single one-line
 * label. Mutates nothing — see {@link PendingWrite}.
 *
 * Images survive: a collapsed result keeps its image parts, because dropping
 * them would destroy something the model still needs. The label goes in front.
 */
function planConsecutiveToolResults(
	refs: readonly MessageRef[],
	tokenizer: Tokenizer,
	config: ContextReductionConfig,
): { writes: PendingWrite[]; groups: CollapsedGroup[] } {
	const minGroupSize = Math.max(1, config.minGroupSize ?? DEFAULT_MIN_GROUP_SIZE);
	const protectRecentMessages = Math.max(0, config.protectRecentMessages ?? DEFAULT_PROTECT_RECENT_MESSAGES);
	const sets: ToolNameSets = {
		read: new Set(config.readToolNames ?? DEFAULT_READ_TOOL_NAMES),
		search: new Set(config.searchToolNames ?? DEFAULT_SEARCH_TOOL_NAMES),
		shell: new Set(config.shellToolNames ?? DEFAULT_SHELL_TOOL_NAMES),
	};

	const collapsible = refs.slice(0, Math.max(0, refs.length - protectRecentMessages));
	const operations = groupConsecutiveOperations(collectCollapsibleOperations(collapsible, sets, tokenizer));

	const writes: PendingWrite[] = [];
	const groups: CollapsedGroup[] = [];
	for (const group of operations) {
		if (group.length < minGroupSize) continue;
		const label = buildGroupLabel(group[0]!.type, group);
		let originalTokens = 0;
		let collapsedTokens = 0;
		for (const operation of group) {
			originalTokens += operation.originalTokens;
			const message = operation.resultRef.message as ToolResultMessage;
			const images = (message.content as (TextContent | ImageContent)[]).filter(
				(part): part is ImageContent => part.type === "image",
			);
			// The replacement is measured as the message it will actually be, rather
			// than a bare `{ role, content }` stand-in. Today's tokenizer counts
			// only a tool result's content — the two measure identically — so this is
			// not fixing a present miscount, it is keeping the figure honest if the
			// tokenizer ever starts billing tool metadata.
			const content: (TextContent | ImageContent)[] = [{ type: "text", text: label }, ...images];
			const writtenTokens = tokenizer.countMessage({ ...message, content } as ToolResultMessage);
			collapsedTokens += writtenTokens;
			writes.push({
				ref: operation.resultRef,
				content,
				originalTokens: operation.originalTokens,
				writtenTokens,
				saved: Math.max(0, operation.originalTokens - writtenTokens),
			});
		}
		groups.push({ type: group[0]!.type, count: group.length, label, originalTokens, collapsedTokens });
	}
	return { writes, groups };
}

/**
 * Index of the first message outside the protected token tail. Walking backwards
 * from the newest message, because the tail is what the model is actively
 * reasoning about and truncating it costs more than it saves.
 */
function resolveProtectedFromIndex(
	refs: readonly MessageRef[],
	tokenizer: Tokenizer,
	protectRecentTokens: number,
): number {
	if (refs.length === 0) return 0;
	let recentTokens = 0;
	for (let i = refs.length - 1; i >= 0; i--) {
		const tokens = tokenizer.countMessage(refs[i]!.message);
		if (recentTokens + tokens > protectRecentTokens) return i + 1;
		recentTokens += tokens;
		if (i === 0) return 0;
	}
	return refs.length;
}

function renderReplacementText(template: string, originalTokens: number, shrunkTokens: number): string {
	return template
		.split("{original_tokens}")
		.join(String(originalTokens))
		.split("{shrunk_tokens}")
		.join(String(shrunkTokens));
}

/**
 * Truncate an assistant answer to `SHRUNK_RESPONSE_RATIO` of its budget and mark
 * it, converging on the marker's own cost.
 *
 * The marker reports the token counts it is measured against, so it has to be
 * sized against its own final text: rendering it with a stale `shrunk_tokens`
 * would make the number in the marker disagree with the marker. The fixed point
 * is at most two rounds — the digit count stops changing — and the loop is
 * bounded so a pathological template cannot spin.
 */
function buildShrunkText(
	assistant: AssistantMessage,
	originalText: string,
	originalTokens: number,
	tokenizer: Tokenizer,
	maxAssistantTextTokens: number,
	template: string,
): { text: string; tokens: number } {
	const targetTokens = Math.max(1, Math.floor(maxAssistantTextTokens * SHRUNK_RESPONSE_RATIO));
	const ratio = originalTokens > 0 ? targetTokens / originalTokens : 0;
	const truncated = originalText.slice(0, Math.max(0, Math.floor(originalText.length * ratio)));
	const measure = (text: string): number =>
		tokenizer.countMessage({ ...assistant, content: [{ type: "text", text }] } satisfies AssistantMessage);

	let shrunkTokens = 0;
	let shrunkText = "";
	for (let iteration = 0; iteration < 5; iteration++) {
		const replacement = renderReplacementText(template, originalTokens, shrunkTokens);
		const candidate = truncated.length > 0 ? `${truncated}\n\n${replacement}` : replacement;
		const tokens = measure(candidate);
		if (tokens === shrunkTokens) return { text: candidate, tokens };
		shrunkText = candidate;
		shrunkTokens = tokens;
	}
	return { text: shrunkText, tokens: measure(shrunkText) };
}

/**
 * Propose truncating older, over-budget assistant answers, each marked so the
 * model can tell a shrunk answer from one the author simply wrote briefly.
 * Mutates nothing — see {@link PendingWrite}.
 *
 * Only all-text answers are eligible. An answer carrying tool calls, thinking or
 * image blocks is left alone: dropping those parts would orphan the tool results
 * that follow and break the call/result pairing every provider requires.
 */
function planAssistantTextShrink(
	refs: readonly MessageRef[],
	tokenizer: Tokenizer,
	config: ContextReductionConfig,
): PendingWrite[] {
	const protectRecentTokens = Math.max(0, config.protectRecentTokens ?? DEFAULT_PROTECT_RECENT_TOKENS);
	const maxAssistantTextTokens = Math.max(0, config.maxAssistantTextTokens ?? DEFAULT_MAX_ASSISTANT_TEXT_TOKENS);
	const template = config.replacementTemplate ?? DEFAULT_REPLACEMENT_TEMPLATE;

	const protectedFrom = resolveProtectedFromIndex(refs, tokenizer, protectRecentTokens);
	const writes: PendingWrite[] = [];
	for (let pos = 0; pos < protectedFrom; pos++) {
		const ref = refs[pos]!;
		const message = ref.message;
		if (message.role !== "assistant") continue;
		const assistant = message as AssistantMessage;
		if (assistant.content.length === 0 || !assistant.content.every(part => part.type === "text")) continue;
		const originalText = assistant.content.map(part => (part.type === "text" ? part.text : "")).join("\n");
		const originalTokens = tokenizer.countMessage(assistant);
		if (originalTokens <= maxAssistantTextTokens) continue;
		const shrunk = buildShrunkText(
			assistant,
			originalText,
			originalTokens,
			tokenizer,
			maxAssistantTextTokens,
			template,
		);
		const saved = originalTokens - shrunk.tokens;
		if (saved <= 0) continue;
		writes.push({
			ref,
			content: [{ type: "text", text: shrunk.text }],
			originalTokens,
			writtenTokens: shrunk.tokens,
			saved,
		});
	}
	return writes;
}

/**
 * Run the deterministic reductions over a branch.
 *
 * Both transforms plan first and the WHOLE pass is applied only once the
 * combined savings clear `minimumSavings`: a pass that rewrites context to
 * reclaim a dozen tokens costs more in prompt-cache churn than it returns, and
 * a mutation already made cannot be taken back once the caller has persisted
 * the branch.
 *
 * With no reduction configured — the state core ships in, since nothing
 * registers a transform by default — this returns a zero result and leaves
 * `entries` byte-identical.
 */
export function reduceContext(
	entries: SessionEntry[],
	tokenizer: Tokenizer,
	config: ContextReductionConfig = {},
): ContextReductionResult {
	const empty: ContextReductionResult = { collapsedResults: 0, groups: [], shrunkMessages: 0, tokensSaved: 0 };
	if (entries.length === 0) return empty;
	const minimumSavings = Math.max(0, config.minimumSavings ?? DEFAULT_MIN_SAVINGS_TOKENS);
	const refs = projectMessages(entries, config.keepBoundaryId);
	if (refs.length === 0) return empty;

	// An unlisted transform is skipped, not merely thresholded away: a caller that
	// names only `"collapse"` must not find assistant prose rewritten as a side
	// effect of forgetting to disable the other.
	const enabled = config.transforms === undefined ? CONTEXT_REDUCTION_TRANSFORMS : config.transforms;
	const collapse = enabled.includes("collapse")
		? planConsecutiveToolResults(refs, tokenizer, config)
		: { writes: [] as PendingWrite[], groups: [] as CollapsedGroup[] };
	const shrink = enabled.includes("shrink") ? planAssistantTextShrink(refs, tokenizer, config) : [];
	const tokensSaved =
		collapse.writes.reduce((total, write) => total + write.saved, 0) +
		shrink.reduce((total, write) => total + write.saved, 0);
	if (tokensSaved < minimumSavings) return empty;

	for (const write of [...collapse.writes, ...shrink]) {
		const message = write.ref.message as ToolResultMessage;
		message.content = write.content;
		invalidateMessageCache(write.ref.message as AgentMessage);
	}
	return {
		collapsedResults: collapse.writes.length,
		groups: collapse.groups,
		shrunkMessages: shrink.length,
		tokensSaved,
	};
}

/**
 * Collapse runs of same-kind tool results into a one-line label, in the shape
 * the compaction prune pass already consumes (`PruneResult`), so it can be
 * registered as a context transform without a wrapper:
 *
 * ```ts
 * pi.registerContextTransform({ name: "collapse-reads", transform: collapseToolResultRuns });
 * ```
 *
 * `prunedCount` is the number of results rewritten, matching what
 * `pruneToolOutputs` reports for the same unit of work — a caller totalling the
 * pass's savings should not have to know which transform produced them.
 */
export function collapseToolResultRuns(
	entries: SessionEntry[],
	tokenizer: Tokenizer,
	config: ContextReductionConfig = {},
): PruneResult {
	const result = reduceContext(entries, tokenizer, { ...config, transforms: ["collapse"] });
	return { prunedCount: result.collapsedResults, tokensSaved: result.tokensSaved };
}

/**
 * Truncate older over-budget assistant answers and mark each one, in the same
 * `PruneResult` shape as {@link collapseToolResultRuns}.
 */
export function shrinkVerboseAssistantText(
	entries: SessionEntry[],
	tokenizer: Tokenizer,
	config: ContextReductionConfig = {},
): PruneResult {
	const result = reduceContext(entries, tokenizer, { ...config, transforms: ["shrink"] });
	return { prunedCount: result.shrunkMessages, tokensSaved: result.tokensSaved };
}
