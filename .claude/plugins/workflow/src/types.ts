/**
 * The shapes a live run is observed through.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/display.ts:8-60`
 * (`WorkflowAgentStatus`, `WorkflowAgentSnapshot`, `WorkflowSnapshot`), narrowed to the fields
 * the control tool and the manager actually read.
 *
 * ## Why these are narrowed rather than complete
 *
 * The reference's `WorkflowAgentSnapshot` carries the full agent record — prompt, history,
 * sessionId, errorCode, recoverable, model — because `display.ts` renders all of it. This file
 * exists for the surfaces that COUNT, not render: `countAgents`, `summarizeRun` and
 * `aggregateAgentUsage` read `status`, `label`, `tokens` and `tokenUsage`, and nothing else.
 *
 * Narrowing is what lets the counting code stay independent of the UI bead that will own the
 * rest. When `ui/format.ts` lands with the full record, these fields widen; the counting code
 * does not change, because it never named the fields it does not read.
 */
import type { Usage } from "./usage";

/** Copied from `src/display.ts:8`. */
export type WorkflowAgentStatus = "queued" | "running" | "done" | "error" | "skipped";

/**
 * One agent as the manager currently sees it.
 *
 * `tokens` is the scalar estimate a provider with no usage breakdown reports; `tokenUsage` is
 * the fresh-vs-cached split when one is known. Both are optional because neither is guaranteed
 * — an agent that has not run has neither.
 */
export interface WorkflowAgentSnapshot {
	id: number;
	label: string;
	status: WorkflowAgentStatus;
	/** Tokens used by this agent (a scalar estimate when the provider reports no usage). */
	tokens?: number;
	/** Per-agent token usage breakdown (fresh input+output vs cached), when known. */
	tokenUsage?: Usage;
}

/**
 * A run as the manager currently sees it.
 *
 * `WorkflowSnapshot` is the LIVE view and `PersistedRunState` is what is on disk. They are kept
 * distinct on purpose: `summarizeRun` reads both and takes the larger token figure across them,
 * because a resumed run's live snapshot starts from nothing while its persisted record still
 * knows what was already spent.
 */
export interface WorkflowSnapshot {
	name: string;
	currentPhase?: string;
	agents: WorkflowAgentSnapshot[];
	tokenUsage?: Usage & { cost?: number };
}

/**
 * A run's checkpoint, as both the journal and the control tool report it.
 *
 * `kind` and `status` are strings rather than unions because they are written by the persistence
 * layer, which persists them as `unknown`. Narrowing them here would be a claim the reader
 * cannot make.
 */
export interface RunCheckpoint {
	checkpointId: string;
	kind?: string;
	status?: string;
}
