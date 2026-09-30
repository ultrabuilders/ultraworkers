import { describe, expect, it } from "bun:test";
import {
	buildUsageBreakdown,
	NOISE_FLOOR_TOKENS,
	TOOLS_SUMMARIES_BUCKET,
	type UsageLike,
} from "@oh-my-pi/pi-coding-agent/session/usage-breakdown";

// Contract: the same totals as the flat session total, but attributed to the model
// that spent them — with subagent work on its own row rather than folded into the
// parent model, because a `task` tool result is a child process's usage, not the
// user's model.
//
// The sum is the load-bearing part. Attribution that does not add up to the
// existing total is worse than no attribution: the user now has two numbers that
// disagree and no way to tell which is right.

const usage = (over: Partial<UsageLike> = {}): UsageLike => ({
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { total: 0 },
	...over,
});

describe("buildUsageBreakdown", () => {
	it("sums back to the totals it was given", () => {
		const result = buildUsageBreakdown({
			buckets: [
				{
					key: "anthropic/sonnet",
					isTurn: true,
					usage: usage({ input: 100, output: 50, totalTokens: 150, cost: { total: 1.5 } }),
				},
				{
					key: "anthropic/sonnet",
					isTurn: true,
					usage: usage({ input: 10, output: 5, totalTokens: 15, cost: { total: 0.25 } }),
				},
				{
					key: TOOLS_SUMMARIES_BUCKET,
					isTurn: false,
					usage: usage({ input: 5, totalTokens: 5, cost: { total: 0.1 } }),
				},
			],
		});

		const totalInput = result.buckets.reduce((n, b) => n + b.input, 0);
		const totalCost = result.buckets.reduce((n, b) => n + b.cost, 0);
		expect(totalInput).toBe(115);
		// 1.5 + 0.25 + 0.1 — if this drifts from the flat total, one of the two is wrong.
		expect(totalCost).toBeCloseTo(1.85, 10);
	});

	it("counts turns only for model rows, not subagent work", () => {
		// A subagent's turns are the parent's problem to see, not a turn the user took.
		const result = buildUsageBreakdown({
			buckets: [
				{ key: "anthropic/sonnet", isTurn: true, usage: usage({ totalTokens: 10, cost: { total: 1 } }) },
				{ key: TOOLS_SUMMARIES_BUCKET, isTurn: false, usage: usage({ totalTokens: 10, cost: { total: 1 } }) },
			],
		});
		expect(result.buckets.find(b => b.key === "anthropic/sonnet")?.turns).toBe(1);
		expect(result.buckets.find(b => b.key === TOOLS_SUMMARIES_BUCKET)?.turns).toBe(0);
	});

	it("keeps subagent work as a peer row rather than a footer", () => {
		const result = buildUsageBreakdown({
			buckets: [
				{ key: "anthropic/sonnet", isTurn: true, usage: usage({ totalTokens: 10, cost: { total: 1 } }) },
				{ key: TOOLS_SUMMARIES_BUCKET, isTurn: false, usage: usage({ totalTokens: 10, cost: { total: 5 } }) },
			],
		});
		// Highest cost sorts first, and subagent work is in the SAME list — rendering
		// it separately would imply it is a note about the other rows.
		expect(result.buckets.map(b => b.key)).toEqual([TOOLS_SUMMARIES_BUCKET, "anthropic/sonnet"]);
	});

	it("drops rows that spent nothing and nothing", () => {
		const result = buildUsageBreakdown({
			buckets: [{ key: "openai/gpt", isTurn: true, usage: usage() }],
		});
		expect(result.buckets).toEqual([]);
	});

	it("sorts equal costs by key so the list does not reshuffle", () => {
		const result = buildUsageBreakdown({
			buckets: [
				{ key: "zeta/model", isTurn: true, usage: usage({ totalTokens: 1, cost: { total: 1 } }) },
				{ key: "alpha/model", isTurn: true, usage: usage({ totalTokens: 1, cost: { total: 1 } }) },
			],
		});
		expect(result.buckets.map(b => b.key)).toEqual(["alpha/model", "zeta/model"]);
	});

	it("divides the per-million cache rate rather than multiplying it", () => {
		// `Model.cost.cacheRead` is a per-MILLION rate while usage costs are already
		// dollars. Forgetting the division overstates by a factor of a million.
		const result = buildUsageBreakdown({
			buckets: [{ key: "anthropic/sonnet", isTurn: true, usage: usage({ totalTokens: 1, cost: { total: 1 } }) }],
			missedTokens: 1_000_000,
			cacheReadRatePerMillion: () => 3,
		});
		expect(result.cacheMiss.missedTokens).toBe(1_000_000);
		expect(result.cacheMiss.missedCost).toBeCloseTo(3, 10);
	});

	it("does not price a miss below the noise floor", () => {
		const result = buildUsageBreakdown({
			buckets: [{ key: "anthropic/sonnet", isTurn: true, usage: usage({ totalTokens: 1, cost: { total: 1 } }) }],
			missedTokens: NOISE_FLOOR_TOKENS - 1,
			cacheReadRatePerMillion: () => 3,
		});
		// Still reported as tokens — only the VALUATION is suppressed.
		expect(result.cacheMiss.missedTokens).toBe(NOISE_FLOOR_TOKENS - 1);
		expect(result.cacheMiss.missedCost).toBe(0);
	});

	it("counts tokens but not cost when no rate is known for a model", () => {
		const result = buildUsageBreakdown({
			buckets: [{ key: "unknown/model", isTurn: true, usage: usage({ totalTokens: 1, cost: { total: 1 } }) }],
			missedTokens: 1_000_000,
			cacheReadRatePerMillion: () => undefined,
		});
		expect(result.cacheMiss.missedTokens).toBe(1_000_000);
		expect(result.cacheMiss.missedCost).toBe(0);
	});
});
