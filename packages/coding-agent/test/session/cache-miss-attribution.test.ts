import { describe, expect, it } from "bun:test";
import type { AssistantMessage } from "@oh-my-pi/pi-ai";
import type { Usage } from "@oh-my-pi/pi-catalog/types";
import { buildSessionContext } from "@oh-my-pi/pi-coding-agent/session/session-context";
import type { SessionEntry } from "@oh-my-pi/pi-coding-agent/session/session-entries";
import { SessionStatsTracker, type SessionStatsTrackerHost } from "@oh-my-pi/pi-coding-agent/session/session-stats";

// Contract: the `Cache misses:` line under "By model" in `/session` is a bill,
// not a diagnostic. If it names a number, that number is money the user was
// charged for reading a prefix they had already paid to read. A user who sees it
// can act on it — stop compacting in a loop, stop switching models mid-session.
// A user who sees it for a turn that was merely the next request after a fast
// reply goes hunting for a provider cache bug that does not exist.
//
// So every test here names the bill the user is shown, and every fixture is a
// session where that bill is or is not genuinely owed. `buildUsageBreakdown` is
// a pure function over values handed to it and can witness none of this: what is
// under test is `getSessionStats()` computing `missedTokens` and supplying
// `cacheReadRatePerMillion`.

/** Per-million cacheRead rate the registry reports for the model rows used here. */
const CACHE_READ_RATE = 0.1;

const HOUR_MS = 60 * 60_000;

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

interface TurnSpec {
	provider?: string;
	model?: string;
	usage: Usage;
	/** When the request was sent, ms. */
	sentAt: number;
}

function assistantTurn(spec: TurnSpec): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text: "ok" }],
		api: "anthropic-messages",
		provider: spec.provider ?? "anthropic",
		model: spec.model ?? "claude-sonnet-4-5",
		usage: spec.usage,
		stopReason: "stop",
		timestamp: spec.sentAt,
		completedAt: spec.sentAt,
	} as AssistantMessage;
}

/**
 * A turn that never came back from the provider: no usage, error stop. In
 * transcript mode this still reaches `pushMessage` and still consumes the
 * pending reset, which is what the divergence test below is about.
 */
function deadTurn(sentAt: number): AssistantMessage {
	return {
		role: "assistant",
		content: [],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-sonnet-4-5",
		stopReason: "error",
		errorMessage: "overloaded_error",
		timestamp: sentAt,
		completedAt: sentAt,
	} as unknown as AssistantMessage;
}

/**
 * Entry builder that chains `parentId`, because `buildSessionContext` walks the
 * branch from the leaf back to the root — a flat list of unparented entries
 * yields a one-entry path and every reset trigger in the fixture would be
 * invisible to the transcript side of the comparison.
 */
function branchBuilder() {
	let seq = 0;
	let parentId: string | null = null;
	const base = (atMs: number) => {
		const entry = { id: `e${++seq}`, parentId, timestamp: new Date(atMs).toISOString() };
		parentId = entry.id;
		return entry;
	};
	return {
		turn: (message: AssistantMessage, atMs: number): SessionEntry =>
			({ ...base(atMs), type: "message", message }) as SessionEntry,
		compaction: (atMs: number): SessionEntry =>
			({
				...base(atMs),
				type: "compaction",
				summary: "prior work",
				firstKeptEntryId: "e1",
				tokensBefore: 120_000,
			}) as SessionEntry,
		modelChange: (atMs: number, model: string): SessionEntry =>
			({ ...base(atMs), type: "model_change", model }) as SessionEntry,
	};
}

/** Registry double answering `find(provider, id)` for the model rows it is told about. */
const registryPricing = (rates: Record<string, number>) =>
	({
		find: (provider: string, id: string) => {
			const rate = rates[`${provider}/${id}`];
			return rate === undefined ? undefined : { provider, id, cost: { cacheRead: rate } };
		},
	}) as unknown as SessionStatsTrackerHost["modelRegistry"];

function cacheMissFor(turns: AssistantMessage[], branch: SessionEntry[], rates: Record<string, number>) {
	const tracker = new SessionStatsTracker({
		agent: { state: { messages: turns }, tokenizer, sessionId: "sess-1" },
		session: {},
		sessionManager: { getBranch: () => branch, getSessionFile: () => "/tmp/session.jsonl" },
		modelRegistry: registryPricing(rates),
		model: () => undefined,
		sessionId: () => "sess-1",
	} as unknown as SessionStatsTrackerHost);
	const breakdown = tracker.getSessionStats().usageBreakdown;
	if (!breakdown) throw new Error("getSessionStats() returned no usageBreakdown");
	return breakdown.cacheMiss;
}

describe("cache-miss attribution bills re-reads that were actually lost", () => {
	it("charges a compaction for the cache it dropped, not for the prompt it re-sent", () => {
		// A 100k-token conversation, compacted. The next turn re-reads that prefix
		// from scratch and sends a 65k prompt. The user paid twice for the 100k they
		// had already paid for; the other 65k of the prompt is work that was never
		// cached and was never paid for twice. Billing the prompt (65k) would
		// understate the loss by a third, and the user could not reconcile the number
		// with what the compaction actually cost them.
		const b = branchBuilder();
		const warm = assistantTurn({ usage: usage({ cacheRead: 100_000, totalTokens: 100_000, cost: 0.5 }), sentAt: 0 });
		const cold = assistantTurn({
			usage: usage({ input: 60_000, cacheWrite: 5_000, totalTokens: 68_000, cost: 0.2 }),
			sentAt: HOUR_MS,
		});
		const miss = cacheMissFor([warm, cold], [b.turn(warm, 0), b.compaction(HOUR_MS), b.turn(cold, HOUR_MS)], {
			"anthropic/claude-sonnet-4-5": CACHE_READ_RATE,
		});

		expect(miss.missedTokens).toBe(100_000);
		// `Model.cost.cacheRead` is a per-million rate while `Usage.cost` is already
		// dollars: 100000/1e6 * 0.1 = 0.01. Dropping the /1e6 shows a cost ten
		// thousand times too large — a number no bill would ever contain.
		expect(miss.missedCost).toBeCloseTo(0.01, 10);
	});

	it("does not charge a re-read that followed a fast reply", () => {
		// The same collapse, but the user answered three seconds later and the
		// compaction fired inside the run. Nothing about the provider's cache lapsed
		// — this is the next request in a run, and billing it sends the user after a
		// cache bug they do not have.
		const b = branchBuilder();
		const warm = assistantTurn({ usage: usage({ cacheRead: 100_000, totalTokens: 100_000, cost: 0.5 }), sentAt: 0 });
		const cold = assistantTurn({
			usage: usage({ input: 60_000, cacheWrite: 5_000, totalTokens: 68_000, cost: 0.2 }),
			sentAt: 3_000,
		});
		const miss = cacheMissFor([warm, cold], [b.turn(warm, 0), b.compaction(1_000), b.turn(cold, 3_000)], {
			"anthropic/claude-sonnet-4-5": CACHE_READ_RATE,
		});

		expect(miss.missedTokens).toBe(0);
		expect(miss.missedCost).toBe(0);
	});

	it("charges a model change even when it lands inside the attribution window", () => {
		// Switching model makes the new model's prefix cold by construction, however
		// fast it follows. Holding this cost back because the user typed quickly would
		// be the same misattribution as charging the fast re-read above.
		const b = branchBuilder();
		const warm = assistantTurn({ usage: usage({ cacheRead: 100_000, totalTokens: 100_000, cost: 0.5 }), sentAt: 0 });
		const cold = assistantTurn({
			model: "claude-haiku-4-5",
			usage: usage({ input: 60_000, totalTokens: 62_000, cost: 0.1 }),
			sentAt: 2_000,
		});
		const miss = cacheMissFor(
			[warm, cold],
			[b.turn(warm, 0), b.modelChange(1_000, "anthropic/claude-haiku-4-5"), b.turn(cold, 2_000)],
			{ "anthropic/claude-sonnet-4-5": CACHE_READ_RATE, "anthropic/claude-haiku-4-5": 0.01 },
		);

		expect(miss.missedTokens).toBe(100_000);
	});

	it("does not charge a switch back to a provider that already proved it caches", () => {
		// The same switch, twice, on a provider that has shown a warm read earlier in
		// this session — an aggregator that reports `cacheRead` but never
		// `cacheWrite`. Its cold turn is the provider being cold, not the switch
		// costing the user anything, and billing it sends them to shrink a history
		// that is fine. The message-derived model change is the only signal here:
		// routing can change the serving model without a `model_change` entry.
		const b = branchBuilder();
		const first = assistantTurn({
			provider: "openai",
			model: "gpt-5",
			usage: usage({ cacheRead: 60_000, totalTokens: 60_000, cost: 0.3 }),
			sentAt: 0,
		});
		const detour = assistantTurn({
			usage: usage({ cacheRead: 60_000, totalTokens: 60_000, cost: 0.3 }),
			sentAt: HOUR_MS,
		});
		const coldAgain = assistantTurn({
			provider: "openai",
			model: "gpt-5",
			usage: usage({ input: 30_000, totalTokens: 31_000, cost: 0.2 }),
			sentAt: 2 * HOUR_MS,
		});
		const miss = cacheMissFor(
			[first, detour, coldAgain],
			[b.turn(first, 0), b.turn(detour, HOUR_MS), b.turn(coldAgain, 2 * HOUR_MS)],
			{ "anthropic/claude-sonnet-4-5": CACHE_READ_RATE, "openai/gpt-5": CACHE_READ_RATE },
		);

		expect(miss.missedTokens).toBe(0);
		expect(miss.missedCost).toBe(0);
	});

	it("drops a collapse too small to be a decision the user made", () => {
		// A hundred tokens of prefix drift is granularity. A `Cache misses:` line for
		// it is a number the user cannot act on and a cost they cannot find on a bill.
		const b = branchBuilder();
		const warm = assistantTurn({ usage: usage({ cacheRead: 40_000, totalTokens: 40_000, cost: 0.2 }), sentAt: 0 });
		const cold = assistantTurn({
			usage: usage({ cacheRead: 39_900, input: 4_000, totalTokens: 44_000, cost: 0.1 }),
			sentAt: HOUR_MS,
		});
		const miss = cacheMissFor([warm, cold], [b.turn(warm, 0), b.compaction(HOUR_MS), b.turn(cold, HOUR_MS)], {
			"anthropic/claude-sonnet-4-5": CACHE_READ_RATE,
		});

		expect(miss.missedTokens).toBe(0);
		expect(miss.missedCost).toBe(0);
	});

	it("reports no loss for a session whose first turn follows a reset", () => {
		// A fresh session whose opening turn lands after an initial compaction read
		// nothing at all, so nothing was paid for twice. If the reset alone were
		// enough to bill it, every new session would open on a cache-miss cost as
		// large as its entire first prompt, and the user would learn to ignore the
		// line that the rest of this file is about making trustworthy.
		const b = branchBuilder();
		const compaction = b.compaction(0);
		const opening = assistantTurn({
			usage: usage({ input: 50_000, totalTokens: 51_000, cost: 0.4 }),
			sentAt: HOUR_MS,
		});
		const miss = cacheMissFor([opening], [compaction, b.turn(opening, HOUR_MS)], {
			"anthropic/claude-sonnet-4-5": CACHE_READ_RATE,
		});

		expect(miss.missedTokens).toBe(0);
		expect(miss.missedCost).toBe(0);
	});

	it("reports lost tokens without a cost when the registry cannot price the model", () => {
		// A locally-discovered model the registry does not know. The loss is real and
		// hiding it would report a compaction as free; inventing a rate would report a
		// number no bill contains. Tokens with a zero cost is the honest answer.
		const b = branchBuilder();
		const warm = assistantTurn({ usage: usage({ cacheRead: 100_000, totalTokens: 100_000, cost: 0.5 }), sentAt: 0 });
		const cold = assistantTurn({
			provider: "custom",
			model: "mystery-1",
			usage: usage({ input: 60_000, cacheWrite: 5_000, totalTokens: 68_000, cost: 0.2 }),
			sentAt: HOUR_MS,
		});
		const miss = cacheMissFor([warm, cold], [b.turn(warm, 0), b.compaction(HOUR_MS), b.turn(cold, HOUR_MS)], {});

		expect(miss.missedTokens).toBe(100_000);
		expect(miss.missedCost).toBe(0);
	});
});

// The reset triggers match, but the two consumers do not agree on WHEN the reset
// is spent. `trackMessageCacheState` spends it on every assistant turn it sees;
// this walk holds it across a turn that produced no usage. The test asserts both
// halves against the real `buildSessionContext`, because a re-implementation of
// the side under comparison would agree with itself no matter which way it was
// written — the divergence is only evidence if the transcript half is observed,
// not restated.
describe("cache-miss attribution holds a reset that the transcript has already spent", () => {
	const divergentSequence = () => {
		const b = branchBuilder();
		// A warm turn, so the third turn's collapse is a measurable loss rather than
		// a cold start with nothing to lose.
		const warm = assistantTurn({ usage: usage({ cacheRead: 100_000, totalTokens: 100_000, cost: 0.5 }), sentAt: 0 });
		// A compaction, then a turn that never reached the provider.
		const dead = deadTurn(30_000);
		// And a turn that does reach the provider, on a cache the compaction wiped.
		const cold = assistantTurn({
			usage: usage({ input: 60_000, cacheWrite: 5_000, totalTokens: 68_000, cost: 0.2 }),
			sentAt: HOUR_MS,
		});
		return {
			turns: [warm, dead, cold],
			branch: [b.turn(warm, 0), b.compaction(20_000), b.turn(dead, 30_000), b.turn(cold, HOUR_MS)],
			dead,
			cold,
		};
	};

	it("bills the collapsing turn even though the transcript wrote the reset off", () => {
		// The dead turn got no provider response, so it neither read a cache nor
		// invalidated one. The loss is real and the compaction caused it, so it is
		// billed. If the dead turn spent the reset here instead, this session would
		// report a $0.10 compaction as free.
		const { turns, branch } = divergentSequence();
		const miss = cacheMissFor(turns, branch, { "anthropic/claude-sonnet-4-5": CACHE_READ_RATE });

		expect(miss.missedTokens).toBe(100_000);
		expect(miss.missedCost).toBeCloseTo(0.01, 10);
	});

	it("confirms the transcript really did spend the reset on the usage-less turn", () => {
		const { branch, dead, cold } = divergentSequence();
		const transcript = buildSessionContext(branch, undefined, undefined, { transcript: true });
		const explainedAt = transcript.cacheMissExplainedAt;
		if (!explainedAt) throw new Error("buildSessionContext returned no cacheMissExplainedAt in transcript mode");

		// `cacheMissExplainedAt` is parallel to `messages` (both pushed by
		// `pushMessage`), and the entries carry the original message objects, so the
		// index of a message is the index of its flag.
		const explained = (message: AssistantMessage) => explainedAt[transcript.messages.indexOf(message)];

		// The transcript spends the pending reset on the dead turn, so the turn that
		// actually lost the cache is NOT explained — `ui-helpers.ts` would draw an
		// invalidation marker there while `/session` bills a justified loss. Both are
		// correct about the question each is answering; they are not the same number.
		expect(explained(dead)).toBe(true);
		expect(explained(cold)).toBe(false);
	});
});
