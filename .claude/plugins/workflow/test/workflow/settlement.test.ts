/**
 * A crash must not leave agents running forever.
 *
 * The failure this whole module exists to prevent: a run is killed mid-flight, its `queued` and
 * `running` agent rows stay on disk, and nothing ever moves them — the process that owned them
 * is gone. The run then reports agents running indefinitely, and resume re-drives calls that
 * already happened.
 *
 * The rows below are ordered by how quietly each one fails. The first is the load-bearing
 * branch (terminal settles, paused does NOT). The second protects the boundary the reference's
 * own comment names — settlement is display-only, so it must never rewrite a finished agent.
 * The last is the guard that turns a corrupt counter into "no attempt recorded" instead of a
 * NaN that defeats the scheduler's give-up cap.
 */
import { describe, expect, test } from "bun:test";
import { WorkflowErrorCode } from "../../src/errors";
import {
	type PersistedAgentState,
	sanitizeAutoResumeAttempts,
	settleNonTerminalPersistedAgents,
} from "../../src/persistence/run-persistence";
import {
	agentHasNonTerminalStatus,
	settleInterruptedPersistedAgents,
} from "../../src/persistence/run-agent-settlement";

function agent(over: Partial<PersistedAgentState> = {}): PersistedAgentState {
	return { id: 1, label: "a1", prompt: "p", status: "running", ...over };
}

describe("settling agents a crash left in flight", () => {
	test("a terminal run settles its in-flight agents; a paused one keeps them", () => {
		// WHY both directions in one row: the guard is `TERMINAL_RUN_STATUSES.has(status)`, and a
		// test that only ever passes a terminal status cannot tell a correct guard from no guard
		// at all. `paused` is the case that would break if settlement were unconditional — pausing
		// exists precisely so in-flight agents stay resumable, so settling them would destroy the
		// run's reason for existing.
		const inFlight = [agent({ id: 1 }), agent({ id: 2, status: "queued" })];

		const failed = settleNonTerminalPersistedAgents(inFlight, "failed", undefined, "T");
		expect(failed.map(a => a.status)).toEqual(["skipped", "skipped"]);
		// `failed` with no error object must still classify the cause, not leave errorCode unset —
		// an unset code is what the navigator renders as a blank failure.
		expect(failed[0].error).toBe("run failed");
		expect(failed[0].errorCode).toBe(WorkflowErrorCode.UNKNOWN);

		// `aborted` is a DIFFERENT cause from `failed`, and the run's own error wins when given.
		const aborted = settleNonTerminalPersistedAgents(inFlight, "aborted", undefined, "T");
		expect(aborted[0].errorCode).toBe(WorkflowErrorCode.WORKFLOW_ABORTED);

		expect(settleNonTerminalPersistedAgents(inFlight, "paused", undefined, "T")).toBe(inFlight);
		expect(settleNonTerminalPersistedAgents(inFlight, "running", undefined, "T")).toBe(inFlight);
	});

	test("settlement never rewrites an agent that already finished", () => {
		// WHY this is a separate contract, not part of the row above: the reference calls this
		// "display-only settlement; replay remains keyed by the committed journal". If settlement
		// overwrote a `done` agent, the UI would show a completed call as skipped — while resume
		// still replayed its real result. The run would then display one thing and do another,
		// which is worse than either being wrong alone.
		const done = agent({ id: 1, status: "done", result: { ok: true }, endedAt: "EARLY" });
		const errored = agent({ id: 2, status: "error", error: "real failure" });
		const skipped = agent({ id: 3, status: "skipped" });

		const settled = settleNonTerminalPersistedAgents([done, errored, skipped], "failed", undefined, "LATE");

		expect(settled[0]).toBe(done);
		expect(settled[0].result).toEqual({ ok: true });
		expect(settled[1].error).toBe("real failure");
		expect(settled[2].status).toBe("skipped");
	});

	test("an agent that already ended keeps its own end time", () => {
		// WHY `endedAt ?? endedAt` and not a plain overwrite: the settle time answers "when did we
		// notice", and an agent's own endedAt answers "when did it actually stop". Overwriting
		// would restamp a finished agent with the moment the reader happened to run, so two
		// readers of the same journal would report different durations for one call.
		const [settled] = settleInterruptedPersistedAgents(
			[agent({ status: "running", endedAt: "REAL_END" })],
			{ error: "interrupted" },
			"LATE",
		);
		expect(settled.endedAt).toBe("REAL_END");

		const [fresh] = settleInterruptedPersistedAgents(
			[agent({ status: "running" })],
			{ error: "interrupted" },
			"LATE",
		);
		expect(fresh.endedAt).toBe("LATE");
	});

	test("a corrupt auto-resume counter is dropped rather than trusted", () => {
		// WHY NaN specifically, not "bad input": the counter feeds the scheduler's give-up cap,
		// and `NaN >= cap` is false forever, so a NaN counter disables the cap entirely and a
		// run retries against a dead provider indefinitely (#207). 0 must SURVIVE, because 0
		// means "no attempt recorded yet" and is indistinguishable from absent to the scheduler.
		expect(sanitizeAutoResumeAttempts(Number.NaN)).toBeUndefined();
		expect(sanitizeAutoResumeAttempts(-1)).toBeUndefined();
		expect(sanitizeAutoResumeAttempts(1.5)).toBeUndefined();
		expect(sanitizeAutoResumeAttempts(Infinity)).toBeUndefined();
		expect(sanitizeAutoResumeAttempts("3")).toBeUndefined();
		expect(sanitizeAutoResumeAttempts(null)).toBeUndefined();

		expect(sanitizeAutoResumeAttempts(0)).toBe(0);
		expect(sanitizeAutoResumeAttempts(3)).toBe(3);
	});

	test("only queued and running count as in flight", () => {
		// WHY this row rather than trusting the map: `agentHasNonTerminalStatus` is the predicate
		// the whole rewrite gates on, and it is the only place a status can be forgotten. A status
		// added to the union but not here would be neither settled nor protected — it would keep
		// stranding forever while every other row stayed green.
		for (const status of ["queued", "running"] as const) {
			expect(agentHasNonTerminalStatus(status)).toBe(true);
		}
		for (const status of ["done", "error", "skipped"] as const) {
			expect(agentHasNonTerminalStatus(status)).toBe(false);
		}
	});
});
