/**
 * The run state machine: which verb is legal in which state.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/workflow-control-tool.ts:216-229` (`allowedActions`), with `RunStatus` from
 * `src/run-persistence.ts:29`.
 *
 * ## Why this table is the state machine
 *
 * Every transition guard in the manager asks the same question — "is this verb legal right now?"
 * — and the answer is this function. It is not a convenience lookup: it is the same table the
 * control tool returns to the model as `allowedActions`, so a refusal and a suggestion can never
 * disagree. A guard written independently ("running means you may not resume") would drift from
 * what the model is told, and the drift shows up as a model retrying a transition that was never
 * going to work.
 *
 * The table is total over `RunStatus` with no `default`, so a status added later is a COMPILE
 * ERROR rather than a run that silently accepts every verb.
 */

/**
 * Copied from `src/run-persistence.ts:29`.
 *
 * Declared here rather than imported from the persistence layer because this module is the one
 * that reasons about transitions: a type imported from the layer that WRITES the status would
 * make the guard depend on the writer, and the writer is the half that changes when the journal
 * is compacted.
 */
export type RunStatus = "pending" | "running" | "paused" | "completed" | "failed" | "aborted";

/** Every verb the control tool accepts, in the order the tool's schema lists them. */
export const CONTROL_ACTIONS = ["list", "status", "pause", "resume", "stop"] as const;

export type ControlAction = (typeof CONTROL_ACTIONS)[number];

/**
 * Copied from `src/workflow-control-tool.ts:216-229`.
 *
 *     running             -> [status, pause, stop]
 *     paused              -> [status, resume, stop]
 *     failed | pending    -> [status, resume]
 *     completed | aborted -> [status]
 *
 * Two asymmetries are intentional rather than oversights:
 *
 * - `completed` and `aborted` get ONLY `status`. A finished run is not resumable, and admitting
 *   `resume` here would let a model replay a run that already produced its answer.
 * - `failed` gets `resume` but not `stop`. A failed run is already stopped; there is nothing for
 *   `stop` to tear down, and offering it would return a `false` that reads as a failure of the
 *   stop rather than of the request.
 */
export function allowedActions(status: RunStatus): ControlAction[] {
	switch (status) {
		case "running":
			return ["status", "pause", "stop"];
		case "paused":
			return ["status", "resume", "stop"];
		case "failed":
		case "pending":
			return ["status", "resume"];
		case "completed":
		case "aborted":
			return ["status"];
	}
}

/** Whether `action` is legal against `status`, using {@link allowedActions} as the only source. */
export function isAllowed(status: RunStatus, action: ControlAction): boolean {
	return allowedActions(status).includes(action);
}
