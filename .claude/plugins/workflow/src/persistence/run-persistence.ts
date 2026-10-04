/**
 * The persisted run record: what a run looks like on disk.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/run-persistence.ts`:
 * `RunStatus` (`:29`), `PersistedAgentState` (`:31-58`), `PersistedJournalEntry` (`:60-69`),
 * `sanitizeAutoResumeAttempts` (`:77`), `PersistedRunState` (`:81-208`),
 * `DEFAULT_MAX_TERMINAL_RUNS_ON_DISK` (`:280`), `TERMINAL_RUN_STATUSES` (`:282`),
 * `PERSISTED_AGENT_STATUSES` + the exhaustiveness assertion (`:284-307`),
 * `terminalRunInterruptCause` (`:310-324`) and `settleNonTerminalPersistedAgents` (`:326-338`).
 *
 * ## Why this is NOT the same type as `JournalState`
 *
 * `journal-delta.ts` exports `JournalState = Record<string, unknown>` — the loose shape a
 * journal line replays onto, which is necessarily untyped because a line is whatever the run
 * happened to write. This file exports `PersistedRunState`, the rich contract of the record.
 * The reference keeps exactly this split and, tellingly, leaves its loose layer **unnamed**
 * (`run-record-store.ts` writes `applyDelta(state: Record<string, unknown>, …)` inline) so the
 * name `PersistedRunState` can belong to the rich one. See the note on `JournalState`.
 *
 * ## The deviations, and each one is a name we already have
 *
 * - `history?: AgentHistoryEntry[]` is **dropped**. We have no agent-history type; `RunCheckpoint`
 *   in `../types` is a different shape and borrowing it would invent a meaning.
 * - `tokenUsage` on an agent is `Usage` from `../usage` — our `AgentUsage` analogue. It has no
 *   `cost`, so the run-level rollup below keeps `cost?` inline, as the reference does.
 * - `status` reuses `WorkflowAgentStatus` from `../types`, which is the same five-member union.
 *   Re-declaring it here would be a second source of truth for a closed set.
 */
import { WorkflowErrorCode } from "../errors";
import type { RunCheckpoint, WorkflowAgentStatus } from "../types";
import type { Usage } from "../usage";
import { settleInterruptedPersistedAgents } from "./run-agent-settlement";

export type RunStatus = "pending" | "running" | "paused" | "completed" | "failed" | "aborted";

export interface PersistedAgentState {
	id: number;
	/** Runtime call identity (`${runId}:${callIndex}`), used to rehydrate journaled results. */
	callId?: string;
	label: string;
	phase?: string;
	prompt: string;
	status: WorkflowAgentStatus;
	result?: unknown;
	/** Compact result written by releases before full agent results were retained. */
	resultPreview?: string;
	error?: string;
	errorCode?: WorkflowErrorCode;
	recoverable?: boolean;
	startedAt?: string;
	endedAt?: string;
	/** Tokens used by this agent (a scalar estimate when the provider reports no usage). */
	tokens?: number;
	/** Per-agent token usage breakdown, when the provider reported one. */
	tokenUsage?: Usage;
	/** The model this agent ran on (provider/id), when known. */
	model?: string;
	/** Child session identity, captured before the first prompt. */
	sessionId?: string;
	/** Child session file, absent for in-memory child sessions. */
	sessionFile?: string;
}

/** Serialized journal entry; runId is absent on legacy numeric-only journals. */
export interface PersistedJournalEntry {
	index: number;
	runId?: string;
	hash: string;
	result: unknown;
	storeDelta?: Record<string, unknown>;
	/** The model the call ran on; absent on journals written before this field existed. */
	model?: string;
}

/**
 * Sanitize a persisted/incoming auto-resume attempt counter.
 *
 * Copied verbatim from `:77`. A NaN or negative counter would defeat the scheduler's give-up cap
 * and produce NaN timer delays (#207), so anything that is not a non-negative integer becomes
 * `undefined` — which the scheduler reads as "no attempt recorded yet".
 */
export function sanitizeAutoResumeAttempts(value: unknown): number | undefined {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/**
 * Disk/memory marker for a background result that still needs conversation delivery.
 * Kept small on purpose — never store full agent transcripts here.
 */
export type PendingDeliveryMarker =
	| { kind: "complete"; deliveryId?: string }
	| { kind: "text"; text: string; deliveryId?: string };

export interface PersistedRunState {
	runId: string;
	workflowName: string;
	script: string;
	args?: unknown;
	/**
	 * The session currently used for run ownership/delivery. Runs persist on disk across sessions
	 * but the navigator shows only the current session's runs (undefined = legacy/global).
	 *
	 * OURS-TO-DECIDE, per bead §4.5: these three session-identity fields exist in the reference to
	 * drive its navigator's "current session only" filter. Until our navigator exists we cannot
	 * measure whether we want that filter, so they are carried but UNREAD — dropping them now would
	 * lose the ability to adopt the filter later without a format change.
	 */
	sessionId?: string;
	/** Immutable parent session identity for this workflow run. */
	parentSessionId?: string;
	/** Immutable parent session file for this workflow run, when persisted. */
	parentSessionFile?: string;
	status: RunStatus;
	/** Terminal failure/abort message; absent on running/paused/completed and on legacy records. */
	error?: string;
	/** Classified terminal cause; written with `error`, absent on legacy records. */
	errorCode?: WorkflowErrorCode;
	/** Why a paused run is paused (e.g. "usage_limit" when a provider quota was hit). */
	pauseReason?: string;
	/** Provider reset hint for a usage-limit pause, e.g. "Resets in ~3h" (verbatim). */
	resetHint?: string;
	/** Durable workflow-controlled suspension and its at-most-once response. */
	checkpoint?: RunCheckpoint;
	phases: string[];
	currentPhase?: string;
	agents: PersistedAgentState[];
	logs: string[];
	result?: unknown;
	startedAt: string;
	updatedAt: string;
	completedAt?: string;
	durationMs?: number;
	tokenUsage?: {
		input: number;
		output: number;
		total: number;
		cost?: number;
		cacheRead?: number;
		cacheWrite?: number;
		/** True when the totals include character-heuristic estimates (#209). */
		estimated?: boolean;
	};
	/**
	 * Cached agent/checkpoint results for resume, keyed by deterministic call index. `runId`
	 * namespaces `index` — a nested `workflow()` call restarts its own `callSeq` at 0, so a
	 * parent's index 0 and a child's index 0 would otherwise collide on the same key.
	 */
	journal?: PersistedJournalEntry[];
	/**
	 * Opt-out of auto-resume for this run (default true, i.e. eligible unless explicitly set to
	 * false). Set once at run start and carried through resumes.
	 */
	autoResume?: boolean;
	/**
	 * The run's resolved hard token budget, fixed at start. Resume re-applies THIS value — never
	 * the current default — so an explicit no-budget (`null`) or custom cap survives a pause/resume.
	 */
	tokenBudget?: number | null;
	/**
	 * Named toolset tag. ToolDefinitions are functions and can't be serialized, so this tag is how
	 * a resumed run re-resolves the tool set it started with.
	 */
	toolset?: string;
	/** The run's resolved cap on total agents, fixed at start. */
	maxAgents?: number;
	/** The run's resolved per-agent timeout, fixed at start. */
	agentTimeoutMs?: number | null;
	/** The run's resolved concurrency, fixed at start. */
	concurrency?: number;
	/** The run's resolved agent-retry count, fixed at start. */
	agentRetries?: number;
	/** Auto-resume attempt counter for the current usage_limit pause-cycle. */
	autoResumeAttempts?: number;
	/** Undelivered background-result payload waiting for its originating session's delivery. */
	pendingDelivery?: PendingDeliveryMarker;
}

/**
 * Retention policy for terminal (completed/failed/aborted) runs kept on disk.
 *
 * Copied verbatim from `:280`. A run in "running" or "paused" status is NEVER counted against
 * this cap or evicted by it — only genuinely finished runs age out, oldest (by updatedAt) first.
 */
export const DEFAULT_MAX_TERMINAL_RUNS_ON_DISK = 300;

export const TERMINAL_RUN_STATUSES: ReadonlySet<RunStatus> = new Set(["completed", "failed", "aborted"]);

const PERSISTED_AGENT_STATUSES = [
	"queued",
	"running",
	"done",
	"error",
	"skipped",
] as const satisfies readonly WorkflowAgentStatus[];

// Exhaustiveness: adding a member to WorkflowAgentStatus without listing it above fails to
// compile HERE (Exclude yields a non-never). This is what makes adding a status a compile error
// rather than a silent hole — a new status that nothing settles would strand agents forever.
type AssertNever<T extends never> = T;
export type _PersistedAgentStatusExhaustiveCheck = AssertNever<
	Exclude<WorkflowAgentStatus, (typeof PERSISTED_AGENT_STATUSES)[number]>
>;

/**
 * Every status a persisted agent row may validly carry.
 *
 * Forward-compat note: resume seeding DROPS rows with out-of-union statuses (e.g. written by a
 * newer release) — deliberate garbage-vs-unknown tradeoff: an unknown status cannot be
 * ghost-settled or displayed safely, so the row is treated as corrupt rather than re-persisted
 * as a lie.
 */
export const VALID_PERSISTED_AGENT_STATUSES: ReadonlySet<WorkflowAgentStatus> = new Set(PERSISTED_AGENT_STATUSES);

/** Cause stamped onto leftover in-flight agents when a run reaches a terminal status. */
export function terminalRunInterruptCause(
	status: RunStatus,
	error?: { message?: string; code?: WorkflowErrorCode },
): { error: string; errorCode?: WorkflowErrorCode } {
	if (status === "aborted") {
		return { error: "aborted", errorCode: error?.code ?? WorkflowErrorCode.WORKFLOW_ABORTED };
	}
	if (status === "failed") {
		return { error: error?.message ?? "run failed", errorCode: error?.code ?? WorkflowErrorCode.UNKNOWN };
	}
	return { error: "run completed" };
}

/**
 * Fail-closed rewrite of leftover queued/running agents on a terminal run.
 *
 * Copied from `:326-338`. Completed/failed/aborted must never persist a still-`running` agent:
 * the UI would show `running` forever, and resume would re-drive a call that already finished.
 * Non-terminal statuses return the input UNCHANGED — a paused run's in-flight agents are the
 * point of pausing, not a defect to settle.
 */
export function settleNonTerminalPersistedAgents(
	agents: PersistedAgentState[],
	status: RunStatus,
	error: { message?: string; code?: WorkflowErrorCode } | undefined,
	endedAt: string,
): PersistedAgentState[] {
	if (!TERMINAL_RUN_STATUSES.has(status)) return agents;
	return settleInterruptedPersistedAgents(agents, terminalRunInterruptCause(status, error), endedAt);
}
