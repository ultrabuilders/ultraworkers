/**
 * Per-model cost attribution for a session.
 *
 * A flat total tells a user what they spent; it does not tell them which model
 * spent it. This splits the same totals by the model that actually served each
 * turn, plus one bucket for work a subagent did — a `task` tool result is a
 * child process's usage, not the user's model, and folding it into the parent
 * model would misattribute it.
 *
 * Pure and read-only by construction: no session-manager, no registry, no
 * `Date.now()`. The caller passes `nowMs` and the pricing function in. A module
 * that reaches for ambient state cannot be tested against the failure it exists
 * to describe.
 */

/**
 * Subagent usage, kept as its own line rather than folded into the caller.
 *
 * It sits in the same list as the per-model rows, not in a footer: it is a peer
 * of "what spent this", and rendering it separately would imply it is a note
 * about the others rather than one of them.
 */
export const TOOLS_SUMMARIES_BUCKET = "Tools/summaries";

/**
 * Re-attributing a cache miss below this many tokens is noise.
 *
 * A miss this small can be an ordinary prompt boundary, and pricing it as a
 * decision the user made would overstate it.
 */
export const NOISE_FLOOR_TOKENS = 8192;

/**
 * Idle time before a re-read is charged to the previous turn rather than the one
 * that triggered it.
 *
 * Short of this, a cache miss is just the next request after a fast reply, and
 * attributing it to the wrong turn is worse than not attributing it.
 */
export const CACHE_ATTRIBUTION_WINDOW_MS = 60_000;

/** The subset of a usage record this module sums. Mirrors `addUsage`. */
export interface UsageLike {
	readonly input: number;
	readonly output: number;
	readonly reasoningTokens?: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly totalTokens: number;
	readonly premiumRequests?: number;
	readonly cost: { readonly total: number };
}

export interface UsageBucket {
	/** `provider/model`, or {@link TOOLS_SUMMARIES_BUCKET}. */
	readonly key: string;
	readonly turns: number;
	readonly input: number;
	readonly output: number;
	readonly reasoningTokens: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly totalTokens: number;
	readonly premiumRequests: number;
	readonly cost: number;
}

export interface CacheMissCost {
	readonly missedTokens: number;
	readonly missedCost: number;
}

export interface UsageBreakdown {
	readonly buckets: readonly UsageBucket[];
	readonly cacheMiss: CacheMissCost;
}

/** One source of usage, already attributed to a bucket key by the caller. */
export interface UsageBucketInput {
	readonly key: string;
	/** Counts toward `turns` only for model rows; subagent work does not. */
	readonly isTurn: boolean;
	readonly usage: UsageLike;
}

export interface BuildUsageBreakdownInput {
	readonly buckets: readonly UsageBucketInput[];
	/** Per-million cacheRead price, injected so no `ModelRegistry` is needed. */
	readonly cacheReadRatePerMillion?: (key: string) => number | undefined;
	readonly missedTokens?: number;
}

/**
 * Sum usage into per-model buckets, then filter and sort.
 *
 * Zero rows are dropped and the rest sorted by cost descending, with the key as
 * a tie-break so the rendering is stable between runs — an attribution list that
 * reshuffles equal-cost rows on every call is one nobody can read.
 */
export function buildUsageBreakdown(input: BuildUsageBreakdownInput): UsageBreakdown {
	// Mutable during accumulation, frozen on the way out. Mutating a `UsageBucket`
	// directly would need the public shape to drop `readonly`, which would then stop
	// the RETURN value from being protected too.
	interface MutableBucket {
		key: string;
		turns: number;
		input: number;
		output: number;
		reasoningTokens: number;
		cacheRead: number;
		cacheWrite: number;
		totalTokens: number;
		premiumRequests: number;
		cost: number;
	}
	const byKey = new Map<string, MutableBucket>();

	for (const { key, isTurn, usage } of input.buckets) {
		const existing = byKey.get(key);
		if (existing) {
			existing.turns += isTurn ? 1 : 0;
			existing.input += usage.input;
			existing.output += usage.output;
			existing.reasoningTokens += usage.reasoningTokens ?? 0;
			existing.cacheRead += usage.cacheRead;
			existing.cacheWrite += usage.cacheWrite;
			existing.totalTokens += usage.totalTokens;
			existing.premiumRequests += usage.premiumRequests ?? 0;
			existing.cost += usage.cost.total;
			continue;
		}
		byKey.set(key, {
			key,
			turns: isTurn ? 1 : 0,
			input: usage.input,
			output: usage.output,
			reasoningTokens: usage.reasoningTokens ?? 0,
			cacheRead: usage.cacheRead,
			cacheWrite: usage.cacheWrite,
			totalTokens: usage.totalTokens,
			premiumRequests: usage.premiumRequests ?? 0,
			cost: usage.cost.total,
		});
	}

	const buckets: UsageBucket[] = [...byKey.values()]
		.filter(row => row.cost > 0 || row.totalTokens > 0)
		.sort((a, b) => b.cost - a.cost || a.key.localeCompare(b.key));

	const missedTokens = input.missedTokens ?? 0;
	// Valued per bucket and summed: a single rate would have to belong to one model,
	// which is exactly the assumption that made the flat total useless.
	let missedCost = 0;
	if (missedTokens >= NOISE_FLOOR_TOKENS && input.cacheReadRatePerMillion) {
		for (const row of buckets) {
			const rate = input.cacheReadRatePerMillion(row.key);
			if (rate === undefined) continue;
			// `Model.cost.cacheRead` is a PER-MILLION rate while `Usage.cost` is
			// already dollars, so the division is required, not optional.
			missedCost += (missedTokens / 1_000_000) * rate;
		}
	}

	return { buckets, cacheMiss: { missedTokens, missedCost } };
}
