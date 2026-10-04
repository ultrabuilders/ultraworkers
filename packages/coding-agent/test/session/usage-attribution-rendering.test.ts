/**
 * The `By model` block is a partition: its rows sum to the `Cost` printed above.
 * The cache-miss row is NOT one of those rows.
 *
 * ## Why this needs a test at all
 *
 * `buildUsageBreakdown` only guarantees the partition on the data side. The
 * presentation is what broke it: the cache-miss value was emitted in the same
 * `key: 0.0000` format as the bucket rows, inside the same block, immediately
 * after them. Every row above it summed to `Cost`; that one did not. A user
 * adding the visible column got a total that disagreed with the total printed
 * directly above it, with nothing on screen to say which row was the odd one.
 *
 * Two things make this easy to regress into, which is why both are pinned:
 *
 * 1. **Deleting the row** passes any test that only checks the bucket rows sum
 *    to `Cost` — the number is gone, so it cannot disagree. The user still paid
 *    for a collapsed cache and can no longer see it.
 * 2. **Keeping the row with no separator** passes any test that only checks the
 *    value is present. It is present, correct, and still indistinguishable from
 *    a summand.
 *
 * So the assertions below are about the RENDERED LINES: which rows are contiguous
 * under the header, what those sum to, and that the miss row is outside that set
 * yet still on screen.
 *
 * This asserts a rendered contract because the defect was rendered, not computed.
 * The arithmetic is already covered by `usage-attribution-reconciles.test.ts`;
 * duplicating that here would test nothing new.
 */
import { describe, expect, it } from "bun:test";
import { renderUsageAttribution } from "@oh-my-pi/pi-coding-agent/modes/controllers/command-controller";
import { SessionStatsTracker, type SessionStatsTrackerHost } from "@oh-my-pi/pi-coding-agent/session/session-stats";
import type { UsageBreakdown } from "@oh-my-pi/pi-coding-agent/session/usage-breakdown";

const cost = (total: number) => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total });
const usage = (over: Record<string, unknown> = {}) => ({
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	...over,
	cost: cost((over.cost as number | undefined) ?? 0),
});

const tokenizer = {
	countMessages: () => 0,
	countTokens: (text: string) => text.length,
} as unknown as NonNullable<SessionStatsTrackerHost["agent"]["tokenizer"]>;

const assistant = (provider: string, model: string, record: ReturnType<typeof usage>, timestamp: number) => ({
	role: "assistant",
	content: [{ type: "text", text: "ok" }],
	api: "anthropic-messages",
	provider,
	model,
	usage: record,
	stopReason: "stop",
	timestamp,
});

/** Per-million cacheRead price, the only thing `missedCost` needs to become currency. */
const RATES: Record<string, number> = { "anthropic/sonnet-4-5": 3.0, "openai/gpt-5": 2.5 };

/**
 * A session that compacts: the branch keeps every entry, the live transcript
 * drops the pre-compaction turn. That gap is what makes the cache miss
 * measurable — the miss walk reads the branch, the totals read the transcript.
 */
function compactedSession(): SessionStatsTrackerHost {
	const preCompaction = assistant(
		"anthropic",
		"sonnet-4-5",
		usage({ input: 100, totalTokens: 50100, cacheRead: 50000, cost: 0.1 }),
		1,
	);
	const afterGpt = assistant("openai", "gpt-5", usage({ input: 200, totalTokens: 200, cost: 0.3 }), 3);
	const afterSonnet = assistant("anthropic", "sonnet-4-5", usage({ input: 200, totalTokens: 200, cost: 0.2 }), 4);

	const branch = [
		{ id: "e1", timestamp: 1, type: "message", message: preCompaction },
		{ id: "e2", timestamp: 2, type: "compaction" },
		{ id: "e3", timestamp: 3, type: "message", message: afterGpt },
		{ id: "e4", timestamp: 4, type: "message", message: afterSonnet },
	];

	return {
		agent: {
			state: { messages: [afterGpt, afterSonnet] },
			tokenizer,
			sessionId: "s1",
		},
		session: {},
		sessionManager: {
			getBranch: () => branch,
			getSessionFile: () => "/tmp/s.jsonl",
		},
		modelRegistry: {
			find: (provider: string, model: string) =>
				RATES[`${provider}/${model}`] === undefined
					? undefined
					: { cost: { cacheRead: RATES[`${provider}/${model}`] } },
		} as unknown as SessionStatsTrackerHost["modelRegistry"],
		model: () => undefined,
		sessionId: () => "s1",
	} as unknown as SessionStatsTrackerHost;
}

/** A theme that only preserves structure — `fg` and `bold` add no escape codes. */
const plainTheme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };

describe("the By model block renders a partition plus one row outside it", () => {
	it("keeps the bucket rows summing to Cost, with the cache miss rendered outside that sum", () => {
		const tracker = new SessionStatsTracker(compactedSession());
		const stats = tracker.getSessionStats();
		const breakdown = stats.usageBreakdown;
		if (!breakdown) throw new Error("getSessionStats() returned no usageBreakdown");

		// Precondition: this is the case that makes the defect possible. A miss of
		// zero renders no row at all, so there would be nothing to keep out of the sum.
		expect(breakdown.cacheMiss.missedCost).toBeGreaterThan(0);

		const lines = renderUsageAttribution(breakdown, plainTheme).split("\n");
		const headerIndex = lines.indexOf("By model");
		expect(headerIndex).toBeGreaterThan(-1);

		// The partition is the CONTIGUOUS run of rows after the header, up to the
		// blank line. Using contiguity rather than a label match is what makes this
		// fail if the separator is removed — the miss row would join the run.
		const run: string[] = [];
		for (const line of lines.slice(headerIndex + 1)) {
			if (line.trim() === "") break;
			run.push(line);
		}

		const readRow = (line: string) => {
			const match = /^(.*):\s+([\d.]+)$/.exec(line);
			if (!match) throw new Error(`unparseable row: ${JSON.stringify(line)}`);
			return { label: match[1], value: Number(match[2]) };
		};

		const partition = run.map(readRow);
		const summed = partition.reduce((total, row) => total + row.value, 0);

		// The partition still holds after the separation — this is the assertion
		// that fails if the fix is made by moving or renumbering a summand.
		expect(summed).toBeCloseTo(stats.cost, 10);
		expect(partition.map(row => row.label)).toEqual(["openai/gpt-5", "anthropic/sonnet-4-5"]);

		// The miss row is still on screen — deleting it would satisfy every
		// assertion above, which is why the value is pinned separately.
		const missLine = lines.find(line => line.startsWith("Cache misses"));
		expect(missLine).toBeDefined();
		expect(readRow(missLine as string).value).toBeCloseTo(breakdown.cacheMiss.missedCost, 10);

		// It is outside the partition, and outside it by a real amount: a reader
		// who adds the whole visible column lands this far above `Cost`.
		expect(partition.some(row => row.label.startsWith("Cache misses"))).toBe(false);
		expect(summed + breakdown.cacheMiss.missedCost).toBeGreaterThan(stats.cost);
	});

	it("renders no cache-miss row when no cache was missed", () => {
		const breakdown: UsageBreakdown = {
			buckets: [
				{
					key: "anthropic/sonnet-4-5",
					input: 0,
					output: 0,
					reasoningTokens: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					premiumRequests: 0,
					turns: 1,
					cost: 1,
				},
			],
			cacheMiss: { missedTokens: 0, missedCost: 0 },
		};

		const rendered = renderUsageAttribution(breakdown, plainTheme);

		expect(rendered).not.toContain("Cache misses");
		expect(rendered).toContain("anthropic/sonnet-4-5: 1.0000");
	});
});
