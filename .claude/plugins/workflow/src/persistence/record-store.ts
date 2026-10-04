/**
 * Summarising a run from what is on disk.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/run-record-store.ts:14-40` (`RunSummary`, `runSummary`).
 *
 * ## Why this reads the RECORD and not the live snapshot
 *
 * `runSummary` is the fallback half of `summarizeRun`. The live snapshot answers "what is this
 * run doing now"; this answers "what has this run ever done", and it is the only half that
 * survives the process that ran it. A resumed run's live snapshot begins empty — that is what
 * resuming means — so without this, every figure about a just-resumed run reads as zero.
 *
 * ## The WeakMap cache is load-bearing, not an optimisation
 *
 * `summaries` keys on the state OBJECT, not on a run id. The journal replays produce a NEW object
 * per read, so the cache misses on every fresh load and hits only when the same in-memory state
 * is summarised twice — which is exactly the repeated-render path it was added for. It cannot
 * go stale, because a state that changed is a different object. Keying it by runId instead would
 * be the bug this shape avoids.
 */
import type { PersistedRunState } from "../engine/journal-delta";
import type { RunCheckpoint } from "../types";
import { type TokenFigures, type Usage, aggregateAgentUsage } from "../usage";

/**
 * The persisted agent fields this summary counts over.
 *
 * A structural read of `PersistedRunState["agents"]`, which is `unknown[]` — the journal stores
 * whatever the run wrote. Every field is optional because a half-written agent (the crash case
 * this file exists for) can be missing any of them.
 */
interface PersistedAgentRecord {
	status?: string;
	label?: string;
	tokens?: number;
	tokenUsage?: Usage;
}

/**
 * Copied from `src/run-record-store.ts:8-19`.
 *
 * `active` counts running PLUS queued, and is deliberately distinct from `running`: it answers
 * "how much work is left", where a queued agent is left. `total` counts everything including
 * skipped and errored, so the panel can show "3 of 5" on a run that ended with two failures
 * rather than claiming the failures never happened.
 */
export interface RunSummary {
	total: number;
	done: number;
	active: number;
	running: number;
	queued: number;
	error: number;
	skipped: number;
	activeLabels: string[];
	checkpoint: RunCheckpoint | null;
	usage: TokenFigures;
}

const summaries = new WeakMap<PersistedRunState, RunSummary>();

/** Narrow the persisted agent list to the records this summary can count. */
function agentRecords(state: PersistedRunState): PersistedAgentRecord[] {
	if (!Array.isArray(state.agents)) return [];
	return state.agents.filter((agent): agent is PersistedAgentRecord => !!agent && typeof agent === "object");
}

/**
 * Copied from `src/run-record-store.ts:22-40`.
 *
 * Note the `filter` on object-ness: the journal is append-only and crash-tolerant, so its last
 * line may be a torn fragment. A `null` or a bare number among the agents is survivable data,
 * and dropping it here means one malformed entry costs one agent's count rather than the whole
 * summary.
 */
export function runSummary(state: PersistedRunState): RunSummary {
	const cached = summaries.get(state);
	if (cached) return cached;
	const agents = agentRecords(state);
	const summary: RunSummary = {
		total: agents.length,
		done: agents.filter(a => a.status === "done").length,
		active: agents.filter(a => a.status === "running" || a.status === "queued").length,
		running: agents.filter(a => a.status === "running").length,
		queued: agents.filter(a => a.status === "queued").length,
		error: agents.filter(a => a.status === "error").length,
		skipped: agents.filter(a => a.status === "skipped").length,
		activeLabels: agents.filter(a => a.status === "running").map(a => a.label ?? ""),
		checkpoint: readCheckpoint(state.checkpoint),
		usage: aggregateAgentUsage(agents),
	};
	summaries.set(state, summary);
	return summary;
}

/**
 * Read the checkpoint off a persisted state, or `null` when there is not one.
 *
 * The reference inlines this as a ternary over `state.checkpoint`. It is lifted here because the
 * control tool needs the same three fields and the narrowing is the part worth naming: the
 * persisted value is `unknown`, and a checkpoint that is present but malformed must read as "no
 * checkpoint" rather than propagate a partial one into `formatRun`'s JSON.
 */
function readCheckpoint(value: unknown): RunCheckpoint | null {
	if (!value || typeof value !== "object") return null;
	const candidate = value as { checkpointId?: unknown; kind?: unknown; status?: unknown };
	if (typeof candidate.checkpointId !== "string") return null;
	return {
		checkpointId: candidate.checkpointId,
		kind: typeof candidate.kind === "string" ? candidate.kind : undefined,
		status: typeof candidate.status === "string" ? candidate.status : undefined,
	};
}
