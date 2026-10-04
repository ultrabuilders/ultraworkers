/**
 * Token accounting: one place that decides what a run "spent".
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/display.ts:91-118`
 * (`tokenFigures`, `aggregateAgentUsage`).
 *
 * ## Why `Usage` is declared here instead of imported
 *
 * The reference types its first argument `Partial<AgentUsage>` from its own agent module. That
 * type does not exist in this repo under that name, and importing a differently-named core type
 * to stand in for it would couple an out-of-core extension to a core declaration it does not
 * otherwise need. So the six fields `tokenFigures` actually reads are declared structurally,
 * which is the whole contract: `input`, `output`, `cacheWrite`, `cacheRead`, `total`, `estimated`.
 * A core type with those fields satisfies this shape without this file knowing it exists.
 */
import type { WorkflowAgentSnapshot } from "./types";

/**
 * The subset of an agent's usage counters that display maths reads.
 *
 * Every field optional because the three sources disagree about what they record: some
 * providers report a `total` and nothing else, some report parts and no total, and a
 * character-heuristic estimate arrives with none of the parts.
 */
export interface Usage {
	input?: number;
	output?: number;
	cacheWrite?: number;
	cacheRead?: number;
	total?: number;
	estimated?: boolean;
}

/**
 * Fresh-vs-cacheRead split for one usage record.
 *
 * A named type rather than the reference's inline return annotation, which spelled it
 * `{ fresh: number; cacheRead: number; estimated: boolean }` in three places.
 */
export interface TokenFigures {
	fresh: number;
	cacheRead: number;
	estimated: boolean;
}

/**
 * Copied from `src/display.ts:91-100`.
 *
 * The estimate is `max(scalarTokens, usage.total)` and `fresh` is `max(reported, estimate -
 * cacheRead)`. Both maxes are load-bearing and were kept verbatim:
 *
 * - `max(scalarTokens, total)` because a provider that reports `total` may report LESS than a
 *   character-heuristic estimate already computed elsewhere; taking the smaller would make a run
 *   appear to spend fewer tokens than it did.
 * - `max(reported, estimate - cacheRead)` because for estimate-only providers, cost-only
 *   providers (billed but zero token counts) and mixed runs, subtracting cache reads from a
 *   reported total can go negative. Clamping at the reported figure keeps the count the display
 *   showed before the fresh/cache split existed, instead of a false "0 tok".
 */
export function tokenFigures(usage: Usage | undefined, scalarTokens?: number): TokenFigures {
	const cacheRead = usage?.cacheRead ?? 0;
	const reported = (usage?.input ?? 0) + (usage?.output ?? 0) + (usage?.cacheWrite ?? 0);
	const estimate = Math.max(scalarTokens ?? 0, usage?.total ?? 0);
	return { fresh: Math.max(reported, estimate - cacheRead), cacheRead, estimated: usage?.estimated === true };
}

/**
 * Sum a set of agents into fresh vs cacheRead totals.
 *
 * Copied from `src/display.ts:102-118`, including the `estimated` fold: it is an OR across
 * agents, so one estimated agent marks the whole total estimated and the UI's `~` prefix
 * appears. Folding it as a sum or as "last agent wins" would let an estimated agent hide
 * behind an exact one.
 */
export function aggregateAgentUsage(
	agents: ReadonlyArray<Pick<WorkflowAgentSnapshot, "tokens" | "tokenUsage">>,
): TokenFigures {
	let fresh = 0;
	let cacheRead = 0;
	let estimated = false;
	for (const agent of agents) {
		const figures = tokenFigures(agent.tokenUsage, agent.tokens);
		fresh += figures.fresh;
		cacheRead += figures.cacheRead;
		if (figures.estimated) estimated = true;
	}
	return { fresh, cacheRead, estimated };
}
