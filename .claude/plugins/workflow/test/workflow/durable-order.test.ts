/**
 * PERSIST BEFORE OBSERVE — the ordering `startInBackground` exists to keep.
 *
 * A run that starts executing before it is on disk is an orphan: a crash in the first millisecond
 * leaves a run directory no process owns, no lease protects, and `recoverStaleRuns` has to find
 * by scanning. A run that is on disk before it executes is merely interrupted, which is a state
 * the system already knows how to handle. The ordering is not tidiness — it decides which of
 * those two states a crash produces.
 *
 * Every row reads the ORDERED call log, not the final state. A fake that remembered only the
 * end state would pass with the ordering inverted, because after a successful start both
 * orderings look identical: the record exists and the run is executing.
 */
import { describe, expect, test } from "bun:test";
import { WorkflowManager } from "../../src/manager";
import { SCRIPT, fakePersistence } from "./support/fake-persistence";

describe("the initial state is on disk before anything observes or runs the run", () => {
	test("the record is already loadable when the run executes", async () => {
		// The ordering, stated as an observable fact: work has not begun until the run is durable.
		// If execution came first, a crash inside the first agent would leave a run on disk that
		// no lease covers and no process owns — an orphan nothing will ever clean up.
		const persistence = fakePersistence();
		const atExecute: boolean[] = [];
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			execute: async managed => {
				atExecute.push(persistence.load(managed.runId) !== undefined);
				return { runId: managed.runId, status: "completed" };
			},
		});

		const { promise } = manager.startInBackground(SCRIPT);
		await promise;
		expect(atExecute).toEqual([true]);
	});

	test("the record is already loadable when `started` fires", () => {
		// The same ordering against the OBSERVER rather than the executor. A listener that
		// crashes the process would otherwise leave an announced run that nothing can resume.
		const persistence = fakePersistence();
		const atStarted: boolean[] = [];
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			execute: async managed => ({ runId: managed.runId, status: "completed" }),
		});
		manager.on("started", ({ runId }) => {
			atStarted.push(persistence.load(runId) !== undefined);
		});

		manager.startInBackground(SCRIPT);
		expect(atStarted).toEqual([true]);
	});

	test("the persisted record names the run, its script and its starting status", () => {
		// What a resuming process reads back. Without the script, a resume cannot re-run
		// anything; without `running`, `recoverStaleRuns` cannot tell an interrupted run from a
		// finished one.
		const persistence = fakePersistence();
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			execute: async managed => ({ runId: managed.runId, status: "completed" }),
		});
		const { runId } = manager.startInBackground(SCRIPT);
		const record = persistence.load(runId);
		expect(record?.runId).toBe(runId);
		expect(record?.script).toBe(SCRIPT);
		expect(record?.status).toBe("running");
	});
});

describe("a persist failure leaves nothing behind", () => {
	test("no record on disk, no lease held, no run in memory", () => {
		// The failure path is the half that is easy to get wrong. A run that persisted but then
		// threw is recoverable; a run that holds a LEASE without a record is the worst outcome,
		// because the lease makes it un-resumable by anyone else until it expires.
		const persistence = fakePersistence({ saveThrows: new Error("EIO: disk full") });
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			execute: async managed => ({ runId: managed.runId, status: "completed" }),
		});

		expect(() => manager.startInBackground(SCRIPT)).toThrow("EIO: disk full");
		expect(persistence.records.size).toBe(0);
		expect(persistence.held.size).toBe(0);
		expect(manager.listRuns()).toEqual([]);
	});

	test("the lease is released BEFORE the in-memory entry is dropped", () => {
		// Order matters inside the failure path too: releasing last would leave a window where
		// the run is gone from memory but still locked, and a second process would see a live
		// pid-less lock rather than an absent run.
		const persistence = fakePersistence({ saveThrows: new Error("EIO") });
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			execute: async managed => ({ runId: managed.runId, status: "completed" }),
		});
		try {
			manager.startInBackground(SCRIPT);
		} catch {
			// expected
		}
		const kinds = persistence.events.map(event => event.kind);
		expect(kinds).toContain("release");
		expect(kinds.indexOf("release")).toBeGreaterThan(kinds.indexOf("acquire"));
	});

	test("the run never executed", () => {
		// A failed persist must not have started the executor. Starting it would burn real work
		// on a run that by definition does not exist.
		const persistence = fakePersistence({ saveThrows: new Error("EIO") });
		let executed = 0;
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			execute: async managed => {
				executed++;
				return { runId: managed.runId, status: "completed" };
			},
		});
		try {
			manager.startInBackground(SCRIPT);
		} catch {
			// expected
		}
		expect(executed).toBe(0);
	});
});

describe("a lease that cannot be acquired stops the run before it exists", () => {
	test("nothing is persisted and nothing runs", () => {
		// A lost race is expected, not exceptional — so it is a thrown Error at the boundary
		// rather than a silent no-op that reports success.
		const persistence = fakePersistence({ acquireFails: true });
		const manager = new WorkflowManager({
			persistence,
			generateRunId: () => "abc123",
			execute: async managed => ({ runId: managed.runId, status: "completed" }),
		});
		expect(() => manager.startInBackground(SCRIPT)).toThrow(/Could not acquire workflow run lease/);
		expect(persistence.records.size).toBe(0);
	});
});

describe("an unwired manager fails loudly", () => {
	test("without deps.execute the run rejects rather than reporting success", async () => {
		// The alternative — returning a completed result for a run that never ran — is the
		// quietest possible failure, and the one bead `.10` exists to catch.
		const persistence = fakePersistence();
		const manager = new WorkflowManager({ persistence, generateRunId: () => "abc123" });
		const { promise } = manager.startInBackground(SCRIPT);
		await expect(promise).rejects.toThrow(/not wired/);
	});
});
