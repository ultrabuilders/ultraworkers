/**
 * Deterministic context reduction: collapsing runs of same-kind tool results and
 * shrinking over-budget assistant answers.
 *
 * These transforms rewrite what the model sees, so every test here is written
 * from the consumer's side: what the prompt now contains, and what the tokenizer
 * says its size is. A transform that mutates without invalidating the estimate
 * cache, or that reports savings it did not make, passes a "did it throw" check
 * and still costs the session a prompt-cache miss it never asked for — so the
 * assertions are on content and on measured tokens, never on call counts.
 */
import { describe, expect, test } from "bun:test";
import { type AgentMessage, Tokenizer } from "@oh-my-pi/pi-agent-core";
import type { SessionMessageEntry } from "@oh-my-pi/pi-agent-core/compaction";
import {
	collapseToolResultRuns,
	reduceContext,
	shrinkVerboseAssistantText,
} from "@oh-my-pi/pi-agent-core/compaction/context-reduction";
import type { AssistantMessage, ImageContent, TextContent, ToolResultMessage, Usage } from "@oh-my-pi/pi-ai";

const tokenizer = new Tokenizer();

let idCounter = 0;
const nextId = (): string => `cr-${idCounter++}`;

function messageEntry(message: AgentMessage, id?: string): SessionMessageEntry {
	return { type: "message", id: id ?? nextId(), parentId: null, timestamp: new Date().toISOString(), message };
}

function usage(totalTokens: number): Usage {
	return {
		input: totalTokens,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

/** An assistant turn that issued exactly one tool call, as a real turn does. */
function assistantCalling(toolName: string, args: Record<string, unknown>, callId: string): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "toolCall", id: callId, name: toolName, arguments: args }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "bench",
		usage: usage(10),
		stopReason: "toolUse",
		timestamp: 1,
	};
}

/** An assistant turn with prose only — the shape the shrink transform targets. */
function assistantSaying(text: string): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "bench",
		usage: usage(10),
		stopReason: "stop",
		timestamp: 1,
	};
}

function toolResult(callId: string, toolName: string, text: string, images: ImageContent[] = []): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: callId,
		toolName,
		content: [{ type: "text", text }, ...images],
		isError: false,
		timestamp: Date.now(),
	};
}

/** A back-to-back assistant/call/result triple for `toolName`. */
function readRun(paths: string[], toolName = "read"): SessionMessageEntry[] {
	return paths.flatMap(path => {
		const callId = nextId();
		return [
			messageEntry(assistantCalling(toolName, { path }, callId)),
			messageEntry(toolResult(callId, toolName, `contents of ${path}: ${"x".repeat(400)}`)),
		];
	});
}

const textOf = (entry: SessionMessageEntry): string => {
	const content = (entry.message as ToolResultMessage).content as (TextContent | ImageContent)[];
	return content
		.filter(part => part.type === "text")
		.map(part => (part as TextContent).text)
		.join("");
};

const branchTokens = (entries: SessionMessageEntry[]): number =>
	entries.reduce((total, entry) => total + tokenizer.countMessage(entry.message), 0);

describe("collapsing runs of same-kind tool results", () => {
	test("replaces a run with one line naming what it covered, and the prompt really does shrink", () => {
		const entries = readRun(["a.ts", "b.ts", "c.ts"]);

		const before = branchTokens(entries);
		const result = collapseToolResultRuns(entries, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 });
		const after = branchTokens(entries);

		expect(result.prunedCount).toBe(3);
		// The label is what the summarizer now reads in place of three file dumps.
		expect(textOf(entries[1]!)).toBe("[3 read results: a.ts, b.ts, c.ts]");
		expect(textOf(entries[3]!)).toBe("[3 read results: a.ts, b.ts, c.ts]");
		expect(textOf(entries[5]!)).toBe("[3 read results: a.ts, b.ts, c.ts]");
		// Reported savings must equal the measured difference, not an estimate of it.
		expect(result.tokensSaved).toBe(before - after);
		expect(after).toBeLessThan(before / 2);
	});

	test("leaves a lone result and a broken run alone, because neither is a run", () => {
		const single = readRun(["only.ts"]);
		expect(collapseToolResultRuns(single, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 })).toEqual({
			prunedCount: 0,
			tokensSaved: 0,
		});
		expect(textOf(single[1]!)).toContain("contents of only.ts");

		// Same tool, but a different tool's result sits between the two reads, so
		// the reads are not a contiguous block. Collapsing them would claim a
		// summarizer can skip a region it must actually read.
		const interleaved: SessionMessageEntry[] = [
			...readRun(["first.ts"]),
			...readRun(["middle.ts"], "grep"),
			...readRun(["second.ts"]),
		];
		expect(
			collapseToolResultRuns(interleaved, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 }).prunedCount,
		).toBe(0);
	});

	test("does not collapse a tool outside the default families, so an extension's own output survives core policy", () => {
		const entries = readRun(["a.ts", "b.ts", "c.ts"], "mcp__notes__search");

		expect(
			collapseToolResultRuns(entries, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 }).prunedCount,
		).toBe(0);
		expect(textOf(entries[1]!)).toContain("contents of a.ts");
	});

	test("refuses to treat a result that belongs to a different call as part of a run", () => {
		// A provider transcript can carry a result whose call is not the one
		// immediately before it (a retried call, a re-ordered history). Pairing on
		// position alone would blank a result whose payload the model still needs,
		// and the label would then describe operations that result never served.
		const firstCall = nextId();
		const strayCall = nextId();
		const entries: SessionMessageEntry[] = [
			messageEntry(assistantCalling("read", { path: "a.ts" }, firstCall)),
			messageEntry(toolResult(firstCall, "read", `a ${"x".repeat(400)}`)),
			messageEntry(assistantCalling("read", { path: "b.ts" }, strayCall)),
			// Belongs to `firstCall`, not to the `b.ts` call that precedes it.
			messageEntry(toolResult(firstCall, "read", `stray ${"y".repeat(400)}`)),
			messageEntry(assistantCalling("read", { path: "c.ts" }, nextId())),
			messageEntry(toolResult(strayCall, "read", `c ${"z".repeat(400)}`)),
		];

		const result = collapseToolResultRuns(entries, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 });

		// Only the first pair is a genuine adjacent match; the third result answers
		// a call from two turns back, so no run of two forms.
		expect(result.prunedCount).toBe(0);
		expect(textOf(entries[1]!)).toContain("a xxxx");
		expect(textOf(entries[3]!)).toContain("stray yyyy");
	});

	test("leaves the most recent messages alone, which is the region the model is actively working in", () => {
		const entries = readRun(["a.ts", "b.ts", "c.ts"]);

		// A run deep in history collapses...
		expect(collapseToolResultRuns(entries, tokenizer, { minimumSavings: 0 }).prunedCount).toBe(0);

		// ...but a longer branch does collapse its history. Twelve message refs
		// less the protected five leaves seven eligible, which holds three
		// consecutive read pairs; the `d.ts` result falls outside the window with
		// its call still inside it, so the run stops there.
		const longer = [...readRun(["a.ts", "b.ts"]), ...readRun(["c.ts", "d.ts"]), ...readRun(["e.ts", "f.ts"])];
		const result = collapseToolResultRuns(longer, tokenizer, { minimumSavings: 0 });
		expect(result.prunedCount).toBe(3);
		expect(textOf(longer[1]!)).toBe("[3 read results: a.ts, b.ts, c.ts]");
		// Everything from the protected window on is byte-for-byte what it was.
		expect(textOf(longer[7]!)).toContain("contents of d.ts");
		expect(textOf(longer[11]!)).toContain("contents of f.ts");
	});

	test("keeps images in a collapsed result, because the label must not destroy what the model still needs", () => {
		const shotCall = nextId();
		const tailCall = nextId();
		const image: ImageContent = { type: "image", data: "AAAA", mimeType: "image/png" };
		const entries: SessionMessageEntry[] = [
			...readRun(["a.ts", "b.ts"]),
			messageEntry(assistantCalling("read", { path: "shot.png" }, shotCall)),
			messageEntry(toolResult(shotCall, "read", "binary", [image])),
			messageEntry(assistantCalling("read", { path: "c.ts" }, tailCall)),
			messageEntry(toolResult(tailCall, "read", "more", [image])),
		];

		collapseToolResultRuns(entries, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 });

		const label = "[4 read results: a.ts, b.ts, shot.png, c.ts]";
		const withImage = (entries[5]!.message as ToolResultMessage).content as (TextContent | ImageContent)[];
		expect(withImage[0]).toEqual({ type: "text", text: label });
		expect(withImage.filter(part => part.type === "image")).toHaveLength(1);
		// The label is the group's, and each result keeps only what it carried
		// itself: a plain text result must not inherit a neighbour's image.
		const plain = (entries[3]!.message as ToolResultMessage).content as (TextContent | ImageContent)[];
		expect(plain).toEqual([{ type: "text", text: label }]);
	});

	test("pairs calls across non-message entries, which a flat message array would misalign", () => {
		const entries: SessionMessageEntry[] = [
			...readRun(["a.ts"]),
			{
				type: "label",
				id: nextId(),
				parentId: null,
				timestamp: new Date().toISOString(),
				label: "checkpoint",
			} as never,
			...readRun(["b.ts"]),
		];

		// The label entry sits where a naive `entries[i + 1]` would read "the result
		// for this call" and find a label instead, ending the run after one pair.
		expect(
			collapseToolResultRuns(entries, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 }).prunedCount,
		).toBe(2);
	});
});

describe("shrinking over-budget assistant answers", () => {
	const longAnswer = (words: number): string => Array.from({ length: words }, (_, i) => `word${i}`).join(" ");

	test("marks a shrunk answer with token counts that agree with what was actually written", () => {
		const entries = [
			messageEntry(assistantSaying(longAnswer(4000))),
			messageEntry(assistantSaying("a short follow-up")),
		];

		const before = branchTokens(entries);
		const result = shrinkVerboseAssistantText(entries, tokenizer, { protectRecentTokens: 0, minimumSavings: 0 });
		const after = branchTokens(entries);

		expect(result.prunedCount).toBe(1);
		expect(result.tokensSaved).toBe(before - after);
		const shrunk = (entries[0]!.message as AssistantMessage).content as TextContent[];
		// The marker states a `shrunk_tokens` figure; if the fixed point that
		// renders it were dropped, the number in the marker would describe a
		// string that no longer exists.
		expect(shrunk[0]!.text).toMatch(/^\[response shrunk — \d+ → (\d+) tokens\]$/m);
		const claimed = Number(/→ (\d+) tokens/.exec(shrunk[0]!.text)?.[1]);
		expect(claimed).toBe(tokenizer.countMessage(entries[0]!.message));
		expect(after).toBeLessThan(before);
	});

	test("leaves an answer under budget untouched, and one carrying tool calls alone", () => {
		const short = [messageEntry(assistantSaying("a brief answer"))];
		expect(shrinkVerboseAssistantText(short, tokenizer, { minimumSavings: 0 }).prunedCount).toBe(0);

		// A verbose turn that ALSO issued tool calls. Truncating it to text alone
		// would drop the calls while their results stayed in the transcript, and
		// every provider rejects an unbalanced tool history with a 400 — so the
		// transform declines the whole message rather than its text parts.
		const callId = nextId();
		const verbose: SessionMessageEntry[] = [
			messageEntry({
				...assistantSaying(longAnswer(4000)),
				content: [
					{ type: "text", text: longAnswer(4000) },
					{ type: "toolCall", id: callId, name: "read", arguments: { path: "a.ts" } },
				],
			}),
			messageEntry(toolResult(callId, "read", "result stays")),
		];
		const snapshot = JSON.stringify(verbose);

		expect(
			shrinkVerboseAssistantText(verbose, tokenizer, { protectRecentTokens: 0, minimumSavings: 0 }).prunedCount,
		).toBe(0);
		expect(JSON.stringify(verbose)).toBe(snapshot);
	});

	test("respects the protected recent tail, which is what the model is actively reasoning about", () => {
		const entries = [messageEntry(assistantSaying(longAnswer(4000)))];

		expect(
			shrinkVerboseAssistantText(entries, tokenizer, { protectRecentTokens: 0, minimumSavings: 0 }).prunedCount,
		).toBe(1);

		const protectedEntries = [messageEntry(assistantSaying(longAnswer(4000)))];
		expect(
			shrinkVerboseAssistantText(protectedEntries, tokenizer, {
				protectRecentTokens: 1_000_000,
				minimumSavings: 0,
			}).prunedCount,
		).toBe(0);
		expect((protectedEntries[0]!.message as AssistantMessage).content[0]).toHaveProperty(
			"text",
			expect.stringContaining("word3999"),
		);
	});
});

describe("the pass as a whole", () => {
	test("leaves the branch byte-identical when the reduction would not clear its savings gate", () => {
		// A genuine collapse candidate — two adjacent reads whose results are big
		// enough that collapsing them really would save tokens — but not enough to
		// clear a high threshold. Rewriting the branch anyway would bust the warm
		// prompt cache to reclaim a rounding error, with no undo once the caller
		// has persisted the entries.
		const callA = nextId();
		const callB = nextId();
		const entries: SessionMessageEntry[] = [
			messageEntry(assistantCalling("read", { path: "a.ts" }, callA)),
			messageEntry(toolResult(callA, "read", `a ${"x".repeat(200)}`)),
			messageEntry(assistantCalling("read", { path: "b.ts" }, callB)),
			messageEntry(toolResult(callB, "read", `b ${"y".repeat(200)}`)),
		];
		const snapshot = JSON.stringify(entries);

		// The same branch DOES collapse once the threshold admits its savings —
		// without this the test would also pass if nothing were ever a candidate.
		const reachable = structuredClone(entries);
		expect(
			reduceContext(reachable, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 }).collapsedResults,
		).toBe(2);

		const result = reduceContext(entries, tokenizer, { minimumSavings: 10_000, protectRecentMessages: 0 });

		expect(result).toEqual({ collapsedResults: 0, groups: [], shrunkMessages: 0, tokensSaved: 0 });
		expect(JSON.stringify(entries)).toBe(snapshot);
	});

	test("skips entries the latest compaction already summarized away", () => {
		const callA = nextId();
		const callB = nextId();
		const stale = [
			messageEntry(assistantCalling("read", { path: "old.ts" }, callA), "stale-a"),
			messageEntry(toolResult(callA, "read", `old ${"x".repeat(400)}`), "stale-b"),
			messageEntry(assistantCalling("read", { path: "old2.ts" }, callB), "stale-c"),
			messageEntry(toolResult(callB, "read", `old2 ${"x".repeat(400)}`), "stale-d"),
		];
		const boundaryId = "stale-c";
		const snapshot = JSON.stringify(stale.slice(0, 2));

		const result = reduceContext(stale, tokenizer, {
			minimumSavings: 0,
			protectRecentMessages: 0,
			keepBoundaryId: boundaryId,
		});

		// Only the pair at/after the boundary is eligible, so a single result
		// remains and nothing collapses.
		expect(result.collapsedResults).toBe(0);
		expect(JSON.stringify(stale.slice(0, 2))).toBe(snapshot);
	});

	test("reports savings the tokenizer confirms, so the maintenance loop can budget on the figure", () => {
		const entries = [...readRun(["a.ts", "b.ts", "c.ts"]), messageEntry(assistantSaying("done"))];
		const before = branchTokens(entries);

		const result = reduceContext(entries, tokenizer, { minimumSavings: 0, protectRecentMessages: 0 });

		expect(result.tokensSaved).toBe(before - branchTokens(entries));
		expect(result.collapsedResults).toBe(3);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]!.label).toBe("[3 read results: a.ts, b.ts, c.ts]");
	});

	test("runs only the transform it is asked for, so enabling one does not silently enable the other", () => {
		const entries = [...readRun(["a.ts", "b.ts"]), messageEntry(assistantSaying("word ".repeat(4000)))];

		// `collapse` alone must not truncate the prose, even though the prose is
		// over budget: a caller that named one transform did not ask for both.
		const collapseOnly = reduceContext(entries, tokenizer, {
			transforms: ["collapse"],
			minimumSavings: 0,
			protectRecentMessages: 0,
		});
		expect(collapseOnly.collapsedResults).toBe(2);
		expect(collapseOnly.shrunkMessages).toBe(0);
		expect((entries.at(-1)!.message as AssistantMessage).content[0]).toHaveProperty(
			"text",
			expect.stringContaining("word word"),
		);

		const fresh = [...readRun(["a.ts", "b.ts"]), messageEntry(assistantSaying("word ".repeat(4000)))];
		const shrinkOnly = reduceContext(fresh, tokenizer, {
			transforms: ["shrink"],
			protectRecentTokens: 0,
			minimumSavings: 0,
		});
		expect(shrinkOnly.shrunkMessages).toBe(1);
		expect(shrinkOnly.collapsedResults).toBe(0);
	});
});
