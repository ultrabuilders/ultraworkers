/**
 * Settling agents that a crash left in flight.
 *
 * Copied verbatim from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/run-agent-settlement.ts` (all 28 lines — no deviation).
 *
 * ## Why settlement is fail-closed
 *
 * A run killed mid-flight leaves `queued`/`running` agent rows behind. Nothing else will ever
 * move them: the process that owned them is gone. So the next reader MUST rewrite them to a
 * terminal status, or the run shows agents running forever and resume re-drives calls that
 * already happened. The rewrite is `skipped` rather than `failed` because the agent did not
 * fail — the run around it stopped — and `recoverable: false` because the transcript for it is
 * whatever the journal committed, not a result anyone can retry into.
 *
 * ## Why this is "display-only"
 *
 * The reference's own comment says settlement is display-only and replay stays keyed by the
 * committed journal. That is the load-bearing boundary: this function changes what the UI shows,
 * NOT what resume replays. A journal that says a call completed keeps replaying it as completed;
 * this never overwrites a `done` agent, which is why `agentHasNonTerminalStatus` gates the whole
 * map instead of the fields being overwritten selectively.
 */
import { WorkflowErrorCode } from "../errors";
import type { PersistedAgentState } from "./run-persistence";

export const INTERRUPTED_AGENT_CAUSE = { error: "interrupted", errorCode: WorkflowErrorCode.WORKFLOW_ABORTED };

export function agentHasNonTerminalStatus(status: PersistedAgentState["status"]): boolean {
	return status === "queued" || status === "running";
}

/** Display-only settlement; replay remains keyed by the committed journal. */
export function settleInterruptedPersistedAgents(
	agents: PersistedAgentState[],
	cause: { error: string; errorCode?: WorkflowErrorCode },
	endedAt: string,
): PersistedAgentState[] {
	return agents.map(agent =>
		!agentHasNonTerminalStatus(agent.status)
			? agent
			: {
					...agent,
					status: "skipped",
					error: cause.error,
					errorCode: cause.errorCode,
					recoverable: false,
					endedAt: agent.endedAt ?? endedAt,
				},
	);
}
