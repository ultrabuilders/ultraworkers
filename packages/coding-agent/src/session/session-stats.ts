import type { Agent, AgentMessage } from "@oh-my-pi/pi-agent-core";
import {
	calculatePromptTokens,
	findTranscriptUsageAnchor,
	isTranscriptUsageAnchor,
	type SessionMessageEntry,
} from "@oh-my-pi/pi-agent-core/compaction";
import type { AssistantMessage, Model, ProviderResponseMetadata, Usage } from "@oh-my-pi/pi-ai";
import type { ModelRegistry } from "../config/model-registry";
import type { Settings } from "../config/settings";

import { addUsageInto, emptyUsage } from "@oh-my-pi/pi-catalog/usage-merge";
import { reportedToolUsage } from "../tools/usage-reporter";
import type { ContextUsage } from "../extensibility/extensions/types";
import {
	computeNonMessageBreakdown,
	computeNonMessageTokens,
	type NonMessageTokenSource,
} from "@oh-my-pi/pi-tui/status-line/context-usage";
import type { ContextUsageBreakdown, SessionStats } from "./agent-session-types";
import { getLatestCompactionEntry } from "./session-context";
import type { ModelUsageEntry, SessionEntry } from "./session-entries";
import type { SessionManager } from "./session-manager";
import {
	buildUsageBreakdown,
	CACHE_ATTRIBUTION_WINDOW_MS,
	NOISE_FLOOR_TOKENS,
	TOOLS_SUMMARIES_BUCKET,
	type UsageBucketInput,
} from "./usage-breakdown";
import { cfgSkillful } from "./settings";

interface PendingContextSnapshot {
	promptTokens: number;
	nonMessageTokens: number;
	cutoffCount: number;
	/**
	 * Compaction epoch at rebase time. Distinguishes a genuinely fresh in-turn
	 * anchor (same epoch) from a post-cutoff anchor that predates a mid-run
	 * compaction (older epoch) so the latter never out-ranks this snapshot.
	 */
	epoch: number;
}

/** Capabilities the stats tracker borrows from its owning session. */
export interface SessionStatsTrackerHost {
	session: NonMessageTokenSource & { readonly settings?: Settings };
	agent: Agent;
	sessionManager: SessionManager;
	modelRegistry: ModelRegistry;
	model(): Model | undefined;
	sessionId(): string;
}

function correctedPromptTokens(assistant: AssistantMessage): number {
	const providerPromptTokens = assistant.contextSnapshot?.promptTokens ?? calculatePromptTokens(assistant.usage);
	return Math.max(0, providerPromptTokens - (assistant.contextSnapshot?.historyRewriteTokensRemoved ?? 0));
}

function isUsageWindowBoundary(entry: SessionEntry): boolean {
	return (
		entry.type === "message" ||
		entry.type === "custom_message" ||
		entry.type === "branch_summary" ||
		entry.type === "compaction" ||
		entry.type === "reset_boundary"
	);
}

/** Model calls belonging to the same active transcript window as `agent.state.messages`. */
function activeModelUsageEntries(branch: SessionEntry[]): ModelUsageEntry[] {
	const latestCompaction = getLatestCompactionEntry(branch);
	const compactionIndex = latestCompaction ? branch.lastIndexOf(latestCompaction) : -1;
	const resetIndex = branch.reduce((latest, entry, index) => (entry.type === "reset_boundary" ? index : latest), -1);
	let startIndex = 0;
	if (resetIndex > compactionIndex) {
		startIndex = resetIndex + 1;
	} else if (latestCompaction) {
		const firstKeptIndex = branch.findIndex(entry => entry.id === latestCompaction.firstKeptEntryId);
		startIndex = firstKeptIndex >= 0 ? firstKeptIndex : compactionIndex + 1;
		while (startIndex > 0 && !isUsageWindowBoundary(branch[startIndex - 1])) startIndex--;
	}
	return branch.slice(startIndex).filter((entry): entry is ModelUsageEntry => entry.type === "model_usage");
}

/**
 * Prompt-cache read the session was billed for twice, in tokens.
 *
 * A turn is charged only when the read genuinely collapsed — the turn after one
 * that read more — AND something explains the collapse. The triggers are the same
 * three `buildSessionContext` treats as `pendingReset` (`session-context.ts`
 * `handleEntryResetTracking`): a compaction, a `model_change`, a plan-mode
 * transition. Plus a serving-model change, which `trackMessageCacheState`
 * derives from the messages rather than the entries.
 *
 * Where this DELIBERATELY diverges from `trackMessageCacheState`: that function
 * consumes `pendingReset` on every assistant turn it sees, while this one holds
 * the reset across a turn that produced no usage. A turn with no usage got no
 * provider response, so it neither read a cache nor invalidated one — it cannot
 * be what the reset was explaining. `cacheMissExplainedAt` is a transcript
 * display decision ("did the turn before this one cause this turn's drop — draw
 * the marker or not?", `ui-helpers.ts`), and an error turn consuming the
 * explanation is the right call for a question about the immediately preceding
 * turn. This is a question about whether the cache was lost and whether anything
 * was responsible, and there the reset belongs to the next turn that actually
 * made a request. So for a compaction → dead turn → collapsing turn sequence the
 * transcript draws no marker while this reports a justified loss. Both are right
 * about their own question; the two numbers are not the same number and must not
 * be read as one. `test/session/cache-miss-attribution.test.ts` pins both halves
 * of that against the real `buildSessionContext`.
 *
 * The amount is the drop, not this turn's prompt. Re-reading a prefix you already
 * paid to read is the loss; the genuinely-new tail of the prompt is not, and
 * billing it as a miss would overstate every compaction by the size of the
 * conversation that survived it.
 *
 * Time between turns gates the ambiguous case: inside
 * {@link CACHE_ATTRIBUTION_WINDOW_MS} a re-read is just the next request after a
 * fast reply, and charging it to the previous turn would be worse than not
 * answering. A model change is exempt — the new model's prefix is cold by
 * construction, however quickly it follows.
 */
function cacheMissTokens(branch: readonly SessionEntry[]): number {
	let pendingReset = false;
	let currentMode = "none";
	let lastModel: string | undefined;
	let lastCacheRead = 0;
	let lastFinishedAt: number | undefined;
	let missedTokens = 0;
	// Providers that have shown any cache activity at all this session. Read
	// BEFORE the current turn joins it, so a provider that only ever warms up
	// later cannot excuse an earlier cold turn.
	const providersReportingCaching = new Set<string>();

	for (const entry of branch) {
		if (entry.type === "compaction" || entry.type === "model_change") {
			pendingReset = true;
			continue;
		}
		if (entry.type === "mode_change") {
			if ((entry.mode === "plan") !== (currentMode === "plan")) pendingReset = true;
			currentMode = entry.mode;
			continue;
		}
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;

		const turn = entry.message;
		// A turn that produced no usage never invalidated anything either, so it
		// must not consume a pending reset on behalf of the turn that follows it.
		const usage = turn.usage;
		if (!usage) continue;

		const model = `${turn.provider}/${turn.model}`;
		const modelChanged = lastModel !== undefined && lastModel !== model;
		const providerReportsCaching = providersReportingCaching.has(turn.provider);
		if (usage.cacheRead > 0 || usage.cacheWrite > 0) providersReportingCaching.add(turn.provider);

		const lost = Math.max(0, lastCacheRead - usage.cacheRead);
		if (lost >= NOISE_FLOOR_TOKENS) {
			const idleMs = lastFinishedAt === undefined ? 0 : Math.max(0, turn.timestamp - lastFinishedAt);
			// A provider that reports a warm read elsewhere already explains its own
			// cold turns; one that reports neither is not reporting cache data at all,
			// so the model change is the only explanation left standing.
			const explained = pendingReset || (modelChanged && !providerReportsCaching);
			if (explained && (modelChanged || idleMs >= CACHE_ATTRIBUTION_WINDOW_MS)) missedTokens += lost;
		}

		pendingReset = false;
		lastModel = model;
		lastCacheRead = usage.cacheRead;
		lastFinishedAt = turn.completedAt ?? turn.timestamp;
	}
	return missedTokens;
}

/**
 * Per-million cacheRead rate for a breakdown row key.
 *
 * `Tools/summaries` is not a model, so it has no single rate — returning
 * undefined leaves its share of the miss unpriced rather than guessing from one
 * of the subagent models folded into it.
 */
function cacheReadRatePerMillion(registry: ModelRegistry, key: string): number | undefined {
	if (key === TOOLS_SUMMARIES_BUCKET) return undefined;
	const separator = key.indexOf("/");
	if (separator <= 0) return undefined;
	return registry.find(key.slice(0, separator), key.slice(separator + 1))?.cost.cacheRead;
}

/** Computes session totals and tracks the in-flight context estimate. */
export class SessionStatsTracker {
	readonly #host: SessionStatsTrackerHost;
	#pendingContextSnapshot: PendingContextSnapshot | undefined;
	#contextUsageRevision = 0;
	#compactionEpoch = 0;

	constructor(host: SessionStatsTrackerHost) {
		this.#host = host;
	}

	get #tokenizer() {
		return this.#host.agent.tokenizer;
	}

	/**
	 * Anchored used-token arithmetic shared by every anchored branch: provider
	 * base + non-message growth since the anchor + local tail + pending.
	 */
	#anchoredUsedTokens(
		base: number,
		anchorNonMessageTokens: number,
		currentNonMessageTokens: number,
		tailFromIndex: number,
		activeMessages: readonly AgentMessage[],
		pendingTokens: number,
	): number {
		return (
			base +
			Math.max(0, currentNonMessageTokens - anchorNonMessageTokens) +
			this.#tokenizer.countMessages(activeMessages.slice(tailFromIndex)) +
			pendingTokens
		);
	}

	/** Returns aggregate message, token, and cost statistics for the session. */
	getSessionStats(): SessionStats {
		const state = this.#host.agent.state;
		let userMessages = 0;
		let assistantMessages = 0;
		let toolResults = 0;
		let toolCalls = 0;
		const routedModels: Record<string, number> = {};
		const bucketInputs: UsageBucketInput[] = [];
		// One canonical total, folded through the shared helper, read once at the
		// end. This closure used to name eight fields by hand, so any field it did
		// not name was dropped here while another path kept it — the divergence the
		// shared helper exists to end. Reading `reasoning`, `premiumRequests` and
		// the credit meters off the SAME total also means the reported scalars
		// cannot disagree with the token totals about which records carried them.
		const usageTotal = emptyUsage();
		const addUsage = (usage: Usage): void => {
			addUsageInto(usageTotal, usage);
		};
		for (const message of state.messages) {
			if (message.role === "user") {
				userMessages++;
			} else if (message.role === "toolResult") {
				toolResults++;
				const usage = reportedToolUsage(message.toolName, message.details);
				// A sub-run's usage is a CHILD process's usage, not the user's model,
				// so it gets its own bucket instead of being folded into the caller.
				// The tool name is no longer tested here: every tool with a
				// registered reporter contributes, and one without contributes
				// nothing — the pre-seam behaviour for every name but `task`.
				if (usage) {
					addUsage(usage);
					bucketInputs.push({ key: TOOLS_SUMMARIES_BUCKET, isTurn: false, usage });
				}
			} else if (message.role === "assistant") {
				assistantMessages++;
				for (const content of message.content) {
					if (content.type === "toolCall") toolCalls++;
				}
				// Persisted and imported transcripts can predate usage metadata despite the current message type.
				const usage = message.usage;
				if (!usage) continue;
				addUsage(usage);
				bucketInputs.push({
					key: `${message.provider}/${message.upstreamModel ?? message.model}`,
					isTurn: true,
					usage,
				});
				if (message.upstreamModel !== undefined) {
					routedModels[message.upstreamModel] = (routedModels[message.upstreamModel] ?? 0) + 1;
				}
			}
		}
		const branch = this.#host.sessionManager.getBranch();
		for (const entry of activeModelUsageEntries(branch)) {
			addUsage(entry.usage);
			// Model-usage entries describe subagent models, so they belong with the
			// other subagent work rather than under a model the user never selected.
			bucketInputs.push({ key: TOOLS_SUMMARIES_BUCKET, isTurn: false, usage: entry.usage });
		}
		return {
			sessionFile: this.#host.sessionManager.getSessionFile(),
			sessionId: this.#host.sessionId(),
			userMessages,
			assistantMessages,
			toolCalls,
			toolResults,
			totalMessages: state.messages.length,
			tokens: {
				input: usageTotal.input,
				output: usageTotal.output,
				reasoning: usageTotal.reasoningTokens ?? 0,
				cacheRead: usageTotal.cacheRead,
				cacheWrite: usageTotal.cacheWrite,
				total: usageTotal.totalTokens,
			},
			cost: usageTotal.cost.total,
			premiumRequests: usageTotal.premiumRequests ?? 0,
			...(usageTotal.credits !== undefined
				? {
						credits: {
							cost: usageTotal.credits.cost ?? 0,
							committedCost: usageTotal.credits.committedCost ?? 0,
							acuCost: usageTotal.credits.acuCost ?? 0,
						},
					}
				: undefined),
			...(Object.keys(routedModels).length > 0 ? { routedModels } : undefined),
			// Fed from the SAME three sources as the flat totals above, so the
			// attribution and the total cannot disagree. The miss walk reads the same
			// branch: only the branch still carries the compaction and model_change
			// entries that say WHY a read collapsed.
			usageBreakdown: buildUsageBreakdown({
				buckets: bucketInputs,
				missedTokens: cacheMissTokens(branch),
				cacheReadRatePerMillion: key => cacheReadRatePerMillion(this.#host.modelRegistry, key),
			}),
			contextUsage: this.getContextUsage(),
		};
	}

	/** Returns the current provider-context token breakdown. */
	getContextBreakdown(options?: {
		contextWindow?: number;
		pendingMessages?: AgentMessage[];
	}): ContextUsageBreakdown | undefined {
		const rawContextWindow = options?.contextWindow ?? this.#host.model()?.contextWindow ?? 0;
		const contextWindow = Number.isFinite(rawContextWindow) && rawContextWindow > 0 ? rawContextWindow : 0;
		const settings = this.#host.session.settings;
		const { skillsTokens, toolsTokens, systemContextTokens, systemPromptTokens } = computeNonMessageBreakdown(
			this.#host.session,
			this.#tokenizer,
			settings?.revision,
			settings ? cfgSkillful.get(settings) : undefined,
		);
		const categoryNonMessageTokens = skillsTokens + toolsTokens + systemContextTokens + systemPromptTokens;
		const currentNonMessageTokens = computeNonMessageTokens(
			this.#host.session,
			this.#tokenizer,
			this.#host.session.settings?.revision,
		);
		const branchEntries = this.#host.sessionManager.getBranch();
		const latestCompaction = getLatestCompactionEntry(branchEntries);
		const compactionIndex = latestCompaction ? branchEntries.lastIndexOf(latestCompaction) : -1;
		let usedTokens = 0;
		let anchored = false;
		const pendingMessages = options?.pendingMessages ?? [];
		const pendingTokens = this.#tokenizer.countMessages(pendingMessages);
		const pending = this.#pendingContextSnapshot;

		let anchorEntry: SessionMessageEntry | undefined;
		for (let index = branchEntries.length - 1; index > compactionIndex; index--) {
			const entry = branchEntries[index];
			if (entry.type !== "message" || !isTranscriptUsageAnchor(entry.message)) continue;
			anchorEntry = entry;
			break;
		}

		const activeMessages = this.#host.agent.state.messages;
		let anchorIndex = -1;
		let anchorAssistant: AssistantMessage | undefined;
		if (anchorEntry?.message.role === "assistant") {
			const assistant = anchorEntry.message;
			anchorAssistant = assistant;
			anchorIndex = activeMessages.indexOf(assistant);
			if (anchorIndex === -1) {
				anchorIndex = activeMessages.findIndex(
					message => message.role === "assistant" && message.timestamp === assistant.timestamp,
				);
			}
		}

		const anchorEpoch = anchorAssistant?.contextSnapshot?.compactionEpoch ?? 0;
		const useAnchor =
			anchorAssistant !== undefined &&
			anchorIndex !== -1 &&
			(!pending || (anchorIndex >= pending.cutoffCount && anchorEpoch >= pending.epoch));
		if (useAnchor && anchorAssistant) {
			const nonMessageTokens =
				anchorAssistant.contextSnapshot?.nonMessageTokens ??
				computeNonMessageTokens(this.#host.session, this.#tokenizer, this.#host.session.settings?.revision);
			anchored = true;
			usedTokens = this.#anchoredUsedTokens(
				correctedPromptTokens(anchorAssistant),
				nonMessageTokens,
				currentNonMessageTokens,
				anchorIndex + 1,
				activeMessages,
				pendingTokens,
			);
		} else if (pending) {
			anchored = true;
			usedTokens = this.#anchoredUsedTokens(
				pending.promptTokens,
				pending.nonMessageTokens,
				currentNonMessageTokens,
				pending.cutoffCount,
				activeMessages,
				pendingTokens,
			);
		}

		if (!anchored && !pending && branchEntries.length === 0) {
			const liveAnchor = findTranscriptUsageAnchor(activeMessages);
			if (liveAnchor) {
				const nonMessageTokens =
					liveAnchor.message.contextSnapshot?.nonMessageTokens ??
					computeNonMessageTokens(this.#host.session, this.#tokenizer, this.#host.session.settings?.revision);
				usedTokens = this.#anchoredUsedTokens(
					correctedPromptTokens(liveAnchor.message),
					nonMessageTokens,
					currentNonMessageTokens,
					liveAnchor.index + 1,
					activeMessages,
					pendingTokens,
				);
				anchored = true;
			}
		}
		if (!anchored) {
			usedTokens = currentNonMessageTokens + this.#tokenizer.countMessages(activeMessages) + pendingTokens;
		}
		return {
			contextWindow,
			anchored,
			usedTokens,
			systemPromptTokens,
			systemToolsTokens: toolsTokens,
			systemContextTokens,
			skillsTokens,
			messagesTokens: Math.max(0, usedTokens - categoryNonMessageTokens),
		};
	}

	/** Returns current context tokens, capacity, and percentage. */
	getContextUsage(options?: { contextWindow?: number }): ContextUsage | undefined {
		const breakdown = this.getContextBreakdown(options);
		if (!breakdown) return undefined;
		return {
			tokens: breakdown.usedTokens,
			contextWindow: breakdown.contextWindow,
			percent: breakdown.contextWindow > 0 ? (breakdown.usedTokens / breakdown.contextWindow) * 100 : 0,
		};
	}

	/** Monotonic revision for in-flight context snapshot changes. */
	get revision(): number {
		return this.#contextUsageRevision;
	}

	/**
	 * Monotonic compaction epoch, bumped whenever history is compacted. Stamped
	 * onto each assistant snapshot at record time so {@link getContextBreakdown}
	 * can reject a post-cutoff anchor whose usage predates the last compaction.
	 */
	get compactionEpoch(): number {
		return this.#compactionEpoch;
	}

	/** Non-message token count captured for the active provider request. */
	get pendingNonMessageTokens(): number | undefined {
		return this.#pendingContextSnapshot?.nonMessageTokens;
	}

	/**
	 * Apply an estimated prompt-prefix reduction to the current provider anchor.
	 *
	 * History after the anchor is estimated live by {@link getContextBreakdown};
	 * callers must pass only savings from entries already included in the
	 * anchor's provider-reported prompt. Persisting the correction on the
	 * assistant snapshot keeps reloads accurate, and the next successful
	 * assistant response naturally replaces it with a fresh provider anchor.
	 */
	recordAnchoredHistoryRewrite(tokensRemoved: number): void {
		if (!Number.isFinite(tokensRemoved) || tokensRemoved <= 0) return;

		const branchEntries = this.#host.sessionManager.getBranch();
		const latestCompaction = getLatestCompactionEntry(branchEntries);
		const compactionIndex = latestCompaction ? branchEntries.lastIndexOf(latestCompaction) : -1;
		for (let index = branchEntries.length - 1; index > compactionIndex; index--) {
			const entry = branchEntries[index];
			if (entry.type !== "message" || !isTranscriptUsageAnchor(entry.message)) continue;
			const assistant = entry.message;

			if (!assistant.contextSnapshot) {
				assistant.contextSnapshot = {
					promptTokens: calculatePromptTokens(assistant.usage),
					nonMessageTokens: computeNonMessageTokens(
						this.#host.session,
						this.#tokenizer,
						this.#host.session.settings?.revision,
					),
					compactionEpoch: this.#compactionEpoch,
				};
			}
			const snapshot = assistant.contextSnapshot;
			snapshot.historyRewriteTokensRemoved = (snapshot.historyRewriteTokensRemoved ?? 0) + Math.floor(tokensRemoved);
			this.#contextUsageRevision++;
			return;
		}
	}

	/** Sets or clears the in-flight context snapshot. */
	setPendingSnapshot(snapshot: Omit<PendingContextSnapshot, "epoch"> | undefined): void {
		this.#pendingContextSnapshot = snapshot ? { ...snapshot, epoch: this.#compactionEpoch } : undefined;
		this.#contextUsageRevision++;
	}

	/** Recomputes an in-flight snapshot after history is compacted or rewritten. */
	rebaseAfterCompaction(): void {
		this.#compactionEpoch++;
		if (!this.#pendingContextSnapshot) return;
		const nonMessageTokens = computeNonMessageTokens(
			this.#host.session,
			this.#tokenizer,
			this.#host.session.settings?.revision,
		);
		const messages = this.#host.agent.state.messages;
		this.setPendingSnapshot({
			promptTokens: nonMessageTokens + this.#tokenizer.countMessages(messages),
			nonMessageTokens,
			cutoffCount: messages.length,
		});
	}

	/** Records provider usage headers against the active session account. */
	ingestProviderUsageHeaders(response: ProviderResponseMetadata, model?: Model): void {
		const provider = model?.provider;
		if (!provider) return;
		this.#host.modelRegistry.authStorage.usage.ingestHeaders(provider, response.headers, {
			sessionId: this.#host.agent.sessionId,
			baseUrl: this.#host.modelRegistry.getProviderBaseUrl?.(provider),
			responseStatus: response.status,
		});
	}
}
