/**
 * Formatting: what a number, a cost, a token segment and a progress line look like on screen.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/display.ts`: `:130-198`
 * (`fmtTokenCount`, `fmtTokenSegment`, `fmtCost`, `fmtFull`, `createWorkflowSnapshot`,
 * `recomputeWorkflowSnapshot`), `:198-224` (`emptyFleetSummary`), `:222-236`
 * (`backgroundStartNotice`).
 *
 * The widget factories at `:240-317` are NOT here — they need the host's UI context and belong
 * with the navigator and panel, which mount them.
 *
 * ## Why the zero guard is a function and not a call site's job
 *
 * `fmtTokenSegment` returns `""` for a zero total rather than `"0 tok"`. Three separate surfaces
 * want a token segment, and all three must omit it rather than render a false zero — a
 * journal-replayed resume and a run whose agents were all skipped genuinely know nothing, and
 * "0 tok" reads as a measurement. Every surface should call this rather than re-implement the
 * guard, because the guard is the part that is easy to forget and impossible to notice.
 */
import type { WorkflowAgentSnapshot, WorkflowSnapshot } from "../types";
import { type TokenFigures, tokenFigures } from "../usage";

/** Number-style adapter, so panels can be compact and the print view full. */
export type NumberStyle = (n: number) => string;

/**
 * Full (non-compact) number style for print/text surfaces: locale-grouped digits.
 *
 * Copied from `src/display.ts:161-164`, including the single reused `Intl.NumberFormat` — no
 * locale argument means the runtime default, matching `toLocaleString()` semantics.
 */
const FULL_NUMBER_FORMAT = new Intl.NumberFormat();
export const fmtFull: NumberStyle = (n: number) => FULL_NUMBER_FORMAT.format(n);

/** Compact style for panels: 12.4K / 3.0M. */
export function fmtCompact(n: number): string {
	if (n < 1000) return String(n);
	if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
	return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * Copied from `src/display.ts:130`.
 *
 * The cache segment appears only when `cacheRead > 0`, so a non-caching provider — or a
 * single-turn agent that never re-reads its cache — reads as a plain "tok" rather than a bare,
 * contextless "fresh".
 */
export function fmtTokenCount(fresh: number, cacheRead: number, fmt: NumberStyle): string {
	const rendered = fmt(fresh) || "0";
	return cacheRead > 0 ? `${rendered} tok · ${fmt(cacheRead)} cached` : `${rendered} tok`;
}

/**
 * Copied from `src/display.ts:150-158`.
 *
 * The `~` marks character-heuristic figures so an estimate never reads as a metered total. It
 * covers the WHOLE segment (fresh + cached) even when only one component is heuristic —
 * conservative by design: a wrong "exact" number costs a user their budget, a wrong "~" costs a
 * few characters.
 */
export function fmtTokenSegment(figures: TokenFigures, fmt: NumberStyle): string {
	if (figures.fresh + figures.cacheRead <= 0) return "";
	const rendered = fmtTokenCount(figures.fresh, figures.cacheRead, fmt);
	return figures.estimated ? `~${rendered}` : rendered;
}

/**
 * Copied from `src/display.ts:163`.
 *
 * `"<$0.0001"` for anything below one ten-thousandth of a cent. A real cost must never render as
 * a zero-looking `"$0.00"`, which is what a naive `toFixed(2)` produces for a run that spent
 * money.
 */
export function fmtCost(cost: number): string {
	if (cost > 0 && cost < 0.0001) return "<$0.0001";
	return `$${cost.toFixed(cost >= 0.01 ? 2 : 4)}`;
}

/** Copied from `src/display.ts:167-179`, over this repo's `WorkflowMeta`. */
export function createWorkflowSnapshot(meta: {
	name: string;
	description?: string;
	phases?: Array<{ title: string }>;
}): WorkflowSnapshot {
	return {
		name: meta.name,
		description: meta.description,
		phases: meta.phases?.map(phase => phase.title) ?? [],
		logs: [],
		agents: [],
	};
}

/**
 * Copied from `src/display.ts:181-188`.
 *
 * The four counts are a CACHE of what `agents` already says. Nothing may trust them without
 * having called this — a snapshot built by hand has none, and reading them would report zero for
 * a run full of agents.
 */
export function recomputeWorkflowSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshot {
	return {
		...snapshot,
		agentCount: snapshot.agents.length,
		runningCount: snapshot.agents.filter(agent => agent.status === "running").length,
		doneCount: snapshot.agents.filter(agent => agent.status === "done").length,
		errorCount: snapshot.agents.filter(agent => agent.status === "error").length,
	};
}

/** Copied from `src/display.ts:191-198`. */
export interface EmptyFleetSummary {
	/** True when the run launched at least one agent but every one returned no usable result. */
	allEmpty: boolean;
	/** Agents that reached a terminal state and returned null (recoverable failure exhausted). */
	emptyCount: number;
	/** Agents that produced a real result. */
	doneCount: number;
	/** Labels of the empty agents, capped for a readable warning line. */
	emptyLabels: string[];
}

/**
 * Copied from `src/display.ts:200-224`.
 *
 * The case this exists for: `agent()` resolves a recoverable failure (an empty result after
 * retries are exhausted) to `null` rather than throwing, so an all-null fleet still reports the
 * run as COMPLETED. Without this check the host reads "nothing was produced" as "everything
 * succeeded".
 *
 * Only terminal states decide. Agents still queued or running are excluded, because a run with
 * two finished and three pending is not an empty fleet — it is a run in progress, and calling it
 * empty would report a failure for work that has not been attempted.
 */
export function emptyFleetSummary(agents: WorkflowAgentSnapshot[], maxLabels = 5): EmptyFleetSummary {
	const terminal = agents.filter(agent => agent.status === "error" || agent.status === "done");
	const empty = terminal.filter(agent => agent.status === "error");
	const doneCount = terminal.length - empty.length;
	return {
		allEmpty: terminal.length > 0 && doneCount === 0,
		emptyCount: empty.length,
		doneCount,
		emptyLabels: empty.slice(0, maxLabels).map(agent => agent.label || `agent #${agent.id}`),
	};
}

/** The host modes that differ in whether terminal UI exists. Mirrors `ExtensionMode`. */
export type HostMode = "tui" | "rpc" | "json" | "print";

/**
 * Copied from `src/display.ts:222-236`.
 *
 * The non-TUI branch is the load-bearing half, and it exists because `hasUI` cannot answer this
 * question: the task panel and the `/workflows` navigator are components (`ui.custom()`), which
 * no-op or throw in RPC even though `hasUI` is `true` there. A notice pointing at a progress
 * surface that will never appear is worse than one pointing at text every host can print.
 */
export function backgroundStartNotice(
	name: string,
	runId: string,
	mode: HostMode | undefined,
	deliverable: "report" | "result",
): string {
	const where =
		mode === "tui" ? "watch the task panel or /workflows" : `check progress with /workflows status ${runId}`;
	return `/${name} running in the background (${runId}) — ${where}; the ${deliverable} is posted here when it finishes.`;
}

/**
 * The bracketed per-agent token cell, or `""` when nothing is known yet.
 *
 * Copied from `src/display.ts:326-329` (the private `agentTokenCell`), lifted out of the renderer
 * so the panel and any future surface share one definition of "the token cell".
 */
export function agentTokenCell(agent: WorkflowAgentSnapshot, fmt: NumberStyle = fmtFull): string {
	return fmtTokenSegment(tokenFigures(agent.tokenUsage, agent.tokens), fmt);
}
