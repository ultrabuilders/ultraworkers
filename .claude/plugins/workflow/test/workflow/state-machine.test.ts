/**
 * The state machine's table, and the tool's use of it.
 *
 * ## Where the guard actually lives — read this before adding a row
 *
 * The tool does NOT check `allowedActions` before acting. It calls `manager.pause(runId)` and
 * interprets the boolean: `false` becomes an invalid-transition error, `true` becomes success.
 * The guard is the MANAGER's (`if (managed?.status !== "running") return false`), and it arrives
 * with `manager.ts` in this same bead.
 *
 * That split is deliberate in the reference and kept here: one owner of the transition rule, so
 * a transition cannot be legal through the tool and illegal through a slash command. The cost is
 * that until the manager lands, nothing here can prove a transition is REFUSED — only that a
 * refusal is reported well. Rows that would need the guard say so and are marked for manager.ts
 * rather than written against a fake that accepts everything.
 */
import { describe, expect, test } from "bun:test";
import { WorkflowManager } from "../../src/manager";
import { type ControlAction, type RunStatus, allowedActions } from "../../src/status";
import { createWorkflowControlTool } from "../../src/tools/workflow-control";
import { fakeManager, run } from "./support/fake-manager";
import { SCRIPT, fakePersistence } from "./support/fake-persistence";

describe("the allowed-action table", () => {
	// One row per status, each a distinct branch of the switch. A mutation that moves any single
	// verb between two rows fails exactly one of them.
	const TABLE: Array<[RunStatus, ControlAction[]]> = [
		["running", ["status", "pause", "stop"]],
		["paused", ["status", "resume", "stop"]],
		["pending", ["status", "resume"]],
		["failed", ["status", "resume"]],
		["completed", ["status"]],
		["aborted", ["status"]],
	];

	for (const [status, expected] of TABLE) {
		test(status, () => {
			expect(allowedActions(status)).toEqual(expected);
		});
	}

	test("the table is total — every status answers, none falls through", () => {
		// `allowedActions` has no `default` branch, so an unhandled status is a compile error
		// rather than an empty list. This row pins the RUNTIME consequence: an empty list would
		// reach a model as `allowed=none`, telling it no action exists at all.
		const everyStatus: RunStatus[] = ["pending", "running", "paused", "completed", "failed", "aborted"];
		for (const status of everyStatus) {
			expect(allowedActions(status).length).toBeGreaterThan(0);
		}
	});
});

describe("the table's asymmetries", () => {
	test("a completed run offers resume nowhere", () => {
		// Resuming a finished run replays work that already produced its answer. This is the
		// asymmetry most likely to be "fixed" by someone adding resume for symmetry.
		expect(allowedActions("completed")).not.toContain("resume");
		expect(allowedActions("aborted")).not.toContain("resume");
	});

	test("a failed run offers resume but NOT stop", () => {
		// A failed run is already stopped; there is nothing for stop to tear down. Offering it
		// would return a `false` the model reads as a failure of stop rather than of the request.
		expect(allowedActions("failed")).toContain("resume");
		expect(allowedActions("failed")).not.toContain("stop");
	});

	test("a live run cannot be resumed, and a paused one cannot be paused again", () => {
		// The two self-transitions. Both would be no-ops that report success, which is how a run
		// ends up reporting a resume that never re-ran anything.
		expect(allowedActions("running")).not.toContain("resume");
		expect(allowedActions("paused")).not.toContain("pause");
	});
});

describe("an illegal transition is a value, not an exception", () => {
	test("a manager that refuses pause yields an error carrying that run's table", async () => {
		// The plan's "pause returns false, does not throw" row, observed where it is observable
		// today: the manager's `false` must arrive as a structured error, not a thrown tool error.
		// A model that cannot distinguish "not allowed" from "the tool broke" retries forever.
		const control = createWorkflowControlTool({
			getManager: () => fakeManager({ runs: [run("r1", "completed")], accepts: { pause: [] } }),
		});
		const result = await control.execute("t1", { action: "pause", runId: "r1" });
		expect(result.details.result).toBe("error");
		expect(result.details.error).toBe("cannot pause run with status completed");
		expect(result.details.allowedActions).toEqual(allowedActions("completed"));
	});

	test("the refusal names the run, so the model can act on a different one", async () => {
		const control = createWorkflowControlTool({
			getManager: () =>
				fakeManager({ runs: [run("r1", "running"), run("r2", "completed")], accepts: { pause: ["r1"] } }),
		});
		const result = await control.execute("t1", { action: "pause", runId: "r2" });
		expect(result.details.runId).toBe("r2");
	});

	test("a run the live list dropped is still findable by id", async () => {
		// `listRuns` and `listAllRuns` answer different questions. If a stopped run were missing
		// from both, `status` would report "run not found" for a run that exists — so this row
		// arranges a run that is NOT live and asks for it by id.
		const manager = fakeManager({ runs: [run("old", "completed")], live: [] });
		const control = createWorkflowControlTool({ getManager: () => manager });
		const listed = await control.execute("t1", { action: "list" });
		expect(listed.details.runs).toEqual([]);
		const status = await control.execute("t1", { action: "status", runId: "old" });
		expect(status.details.result).toBe("ok");
	});

	test("a successful transition reports the status AFTER it, not before", async () => {
		// The pre-transition record still says `running`. `currentSummary` re-reads the run after
		// the transition precisely so `formatRun` does not tell the model the pause did nothing
		// while the tool reports success.
		let status: RunStatus = "running";
		const manager = fakeManager({ runs: [run("r1", status)], accepts: { pause: ["r1"] } });
		const acceptPause = manager.pause.bind(manager);
		manager.pause = (runId: string) => {
			const accepted = acceptPause(runId);
			if (accepted) status = "paused";
			return accepted;
		};
		manager.listAllRuns = () => [run("r1", status)];
		const control = createWorkflowControlTool({ getManager: () => manager });

		const result = await control.execute("t1", { action: "pause", runId: "r1" });
		expect(result.details.result).toBe("paused");
		expect(result.content[0].text).toContain("status=paused");
	});
});

/**
 * The guard itself, now that `manager.ts` has landed.
 *
 * The rows above pin the TABLE; these pin the code that consults it. The seam is the observable:
 * a run is started against a persistence whose executor never settles, so the run is genuinely
 * `running` while the rows run — which is what makes "pause returned true" mean something.
 */
describe("the manager's guard", () => {
	/** A manager whose run stays running, so lifecycle transitions have something to act on. */
	function runningManager() {
		const persistence = fakePersistence();
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			// Never settles: the run stays `running` for the duration of the row.
			execute: () => new Promise<never>(() => {}),
		});
		const { runId } = manager.startInBackground(SCRIPT);
		return { manager, persistence, runId };
	}

	test("pause on a running run returns true and moves it to paused", () => {
		const { manager, runId } = runningManager();
		expect(manager.pause(runId)).toBe(true);
		expect(manager.getRun(runId)?.status).toBe("paused");
	});

	test("pause on a paused run returns FALSE and does not throw", () => {
		// The second pause is the row. A guard that throws here would surface to a model as an
		// opaque failure instead of the "already paused" answer, which is what a double-pause
		// from an impatient retry actually is.
		const { manager, runId } = runningManager();
		expect(manager.pause(runId)).toBe(true);
		expect(() => manager.pause(runId)).not.toThrow();
		expect(manager.pause(runId)).toBe(false);
	});

	test("pause on an unknown run returns false rather than throwing", () => {
		const { manager } = runningManager();
		expect(manager.pause("no-such-run")).toBe(false);
	});

	test("pause RETAINS the lease while the executor is still draining", () => {
		// The subtlety the reference calls out at `:1732`. Releasing here would let a second
		// process reclaim the run and replay its journal while this process's in-flight agents
		// are still writing to it — two writers, one run, and no error anywhere to say so.
		const { manager, persistence, runId } = runningManager();
		const releasesBefore = persistence.events.filter(event => event.kind === "release").length;

		expect(manager.pause(runId)).toBe(true);
		expect(persistence.held.has(runId)).toBe(true);
		expect(persistence.events.filter(event => event.kind === "release").length).toBe(releasesBefore);
	});

	test("disposeAll is what releases it", () => {
		// The other half of the row: the lease IS released, but by teardown rather than by the
		// transition. Without this, "never released" would satisfy the row above.
		const { manager, persistence, runId } = runningManager();
		manager.disposeAll();
		expect(persistence.held.has(runId)).toBe(false);
	});

	test("stop is refused once the run is paused, and accepted while running", () => {
		// The table and the guard agree: `paused` offers stop, `aborted` does not, and a run
		// that has already terminated cannot be stopped again.
		const { manager, runId } = runningManager();
		expect(manager.stop(runId)).toBe(true);
		expect(manager.stop(runId)).toBe(false);
	});
});
