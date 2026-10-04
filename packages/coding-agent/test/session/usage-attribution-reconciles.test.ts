import { describe, expect, it } from "bun:test";
import type { Usage } from "@oh-my-pi/pi-catalog/types";
import { SessionStatsTracker, type SessionStatsTrackerHost } from "@oh-my-pi/pi-coding-agent/session/session-stats";
import { TOOLS_SUMMARIES_BUCKET, type UsageBreakdown } from "@oh-my-pi/pi-coding-agent/session/usage-breakdown";

// Contract: the per-model attribution a user reads under "By model" must add up
// to the flat `Cost: Total` printed above it — for EVERY source that feeds the
// total, not just the obvious one.
//
// `buildUsageBreakdown` is a pure function over buckets it is handed, so its own
// unit test proves arithmetic but proves nothing about WIRING. The wiring is
// where this actually breaks: `getSessionStats()` accumulates the flat total
// through `addUsage()` at three separate call sites and pushes to `bucketInputs`
// at three others. Add a fourth source to one list and not the other and the
// user sees two numbers that disagree, with no way to tell which is right.

/** Only `total` is ever summed; the per-bucket components are provider splits. */
const cost = (total: number): Usage["cost"] => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total });

const usage = (over: Partial<Omit<Usage, "cost">> & { cost?: number }): Usage => ({
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	...over,
	cost: cost(over.cost ?? 0),
});

/** A tokenizer that costs nothing — context usage is not what this file is about. */
const tokenizer = {
	countMessages: () => 0,
	countTokens: (text: string) => text.length,
} as unknown as NonNullable<SessionStatsTrackerHost["agent"]["tokenizer"]>;

/**
 * Host double carrying all three usage sources at once: assistant turns on
 * different models, a `task` tool result (a child's usage), and a persisted
 * `model_usage` entry (a subagent model called outside the transcript).
 */
function hostWith(messages: unknown[], branch: unknown[]): SessionStatsTrackerHost {
	return {
		agent: {
			state: { messages },
			tokenizer,
			sessionId: "sess-1",
		},
		session: {},
		sessionManager: {
			getBranch: () => branch,
			getSessionFile: () => "/tmp/session.jsonl",
		},
		modelRegistry: {} as unknown as SessionStatsTrackerHost["modelRegistry"],
		model: () => undefined,
		sessionId: () => "sess-1",
	} as unknown as SessionStatsTrackerHost;
}

const assistantTurn = (provider: string, model: string, record: Usage) => ({
	role: "assistant",
	content: [{ type: "text", text: "ok" }],
	api: "anthropic-messages",
	provider,
	model,
	usage: record,
	stopReason: "stop",
	timestamp: 1,
});

const taskResult = (record: Usage) => ({
	role: "toolResult",
	toolCallId: "call-1",
	toolName: "task",
	content: [{ type: "text", text: "done" }],
	details: { usage: record },
	isError: false,
	timestamp: 2,
});

const modelUsageEntry = (record: Usage) => ({
	id: "entry-1",
	timestamp: 3,
	type: "model_usage",
	purpose: "summarize",
	role: "smol",
	api: "anthropic-messages",
	provider: "anthropic",
	model: "haiku-3",
	usage: record,
	stopReason: "stop",
});

/** The tracker always builds a breakdown; the optional field is a serialization concern. */
function breakdownOf(tracker: SessionStatsTracker): UsageBreakdown {
	const breakdown = tracker.getSessionStats().usageBreakdown;
	if (!breakdown) throw new Error("getSessionStats() returned no usageBreakdown");
	return breakdown;
}

const sumOf = (
	breakdown: UsageBreakdown,
	pick: (b: { input: number; output: number; cacheRead: number; cacheWrite: number; cost: number }) => number,
) => breakdown.buckets.reduce((n, bucket) => n + pick(bucket), 0);

describe("per-model attribution reconciles with the flat session total", () => {
	it("sums to the flat total across all three usage sources", () => {
		const tracker = new SessionStatsTracker(
			hostWith(
				[
					assistantTurn(
						"anthropic",
						"sonnet-4-5",
						usage({ input: 1200, output: 340, cacheRead: 9000, cacheWrite: 500, totalTokens: 11040, cost: 0.42 }),
					),
					assistantTurn("openai", "gpt-5", usage({ input: 800, output: 120, totalTokens: 920, cost: 0.13 })),
					taskResult(usage({ input: 300, output: 90, totalTokens: 390, cost: 0.07 })),
				],
				[modelUsageEntry(usage({ input: 50, output: 10, totalTokens: 60, cost: 0.01 }))],
			),
		);

		const stats = tracker.getSessionStats();
		expect(stats.tokens.input).toBe(2350);
		expect(stats.tokens.output).toBe(560);
		expect(stats.tokens.cacheRead).toBe(9000);
		expect(stats.tokens.cacheWrite).toBe(500);
		expect(stats.cost).toBeCloseTo(0.63, 10);

		const breakdown = breakdownOf(tracker);
		expect(sumOf(breakdown, b => b.input)).toBe(stats.tokens.input);
		expect(sumOf(breakdown, b => b.output)).toBe(stats.tokens.output);
		expect(sumOf(breakdown, b => b.cacheRead)).toBe(stats.tokens.cacheRead);
		expect(sumOf(breakdown, b => b.cacheWrite)).toBe(stats.tokens.cacheWrite);
		expect(sumOf(breakdown, b => b.cost)).toBeCloseTo(stats.cost, 10);
	});

	it("attributes a `task` child's usage to Tools/summaries, not to the caller's model", () => {
		const tracker = new SessionStatsTracker(
			hostWith(
				[
					assistantTurn(
						"anthropic",
						"sonnet-4-5",
						usage({ input: 1000, output: 200, totalTokens: 1200, cost: 1 }),
					),
					taskResult(usage({ input: 4000, output: 500, totalTokens: 4500, cost: 2 })),
				],
				[],
			),
		);

		const rows = breakdownOf(tracker).buckets;
		expect(rows.find(row => row.key === TOOLS_SUMMARIES_BUCKET)?.cost).toBeCloseTo(2, 10);
		// Folding the child into the caller's row would make one model look like it
		// cost 3.00 — a number the user cannot reconcile with any bill they receive.
		expect(rows.find(row => row.key === "anthropic/sonnet-4-5")?.cost).toBeCloseTo(1, 10);
	});

	it("keeps subagent model_usage entries on Tools/summaries rather than inventing a model row", () => {
		const tracker = new SessionStatsTracker(
			hostWith(
				[assistantTurn("anthropic", "sonnet-4-5", usage({ input: 10, output: 5, totalTokens: 15, cost: 0.5 }))],
				[modelUsageEntry(usage({ input: 700, output: 200, totalTokens: 900, cost: 0.25 }))],
			),
		);

		const rows = breakdownOf(tracker).buckets;
		expect([...rows].map(row => row.key).sort()).toEqual([TOOLS_SUMMARIES_BUCKET, "anthropic/sonnet-4-5"].sort());
		// The user never selected haiku-3; listing it as a model they spent on would
		// be a row they cannot act on.
		expect(rows.some(row => row.key.includes("haiku-3"))).toBe(false);
	});

	// `Totals` prints `premiumRequests` beside `Cost` and `Tokens`, and every one of
	// those rows is windowed to the same transcript. A field that can go missing
	// would tempt a reader into the LIFETIME `getUsageStatistics()` as a fallback —
	// and a lifetime count inside a windowed block is a number the user cannot
	// reconcile with any other row, or with their bill. So the field is pinned as
	// always-present: `undefined` here is a regression, not a tolerated state.
	it("reports premiumRequests as a number even when no record carried one", () => {
		const absent = new SessionStatsTracker(
			hostWith(
				[assistantTurn("anthropic", "sonnet-4-5", usage({ input: 10, output: 5, totalTokens: 15, cost: 0.5 }))],
				[],
			),
		).getSessionStats();

		console.error("[premium] no record carried one ->", absent.premiumRequests);

		expect(typeof absent.premiumRequests).toBe("number");
		expect(absent.premiumRequests).toBe(0);
	});

	it("sums premiumRequests from every usage source, not just the transcript", () => {
		const tracker = new SessionStatsTracker(
			hostWith(
				[
					assistantTurn(
						"anthropic",
						"sonnet-4-5",
						usage({ input: 10, totalTokens: 10, cost: 0.5, premiumRequests: 4 }),
					),
					taskResult(usage({ input: 5, totalTokens: 5, cost: 0.1, premiumRequests: 2 })),
				],
				[modelUsageEntry(usage({ input: 1, totalTokens: 1, cost: 0.01, premiumRequests: 1 }))],
			),
		);

		const stats = tracker.getSessionStats();
		console.error("[premium] all three sources ->", stats.premiumRequests, "cost ->", stats.cost);

		// If any source is dropped the sum is 6, 5, or 2 — each a plausible-looking
		// number that under-reports premium spend without announcing itself.
		expect(stats.premiumRequests).toBe(7);
	});
});
