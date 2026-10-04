/**
 * The store's retention policy deletes data, so it is tested on what it refuses to delete.
 *
 * A retention bug and a retention bug that deletes nothing look identical from the outside —
 * the directory just keeps growing. So the rows below are mostly NEGATIVE: runs that must
 * survive a save that pushed the store over its cap. The positive row exists to prove the cap
 * is enforced at all, because without it every negative row would also pass against a store
 * that never deleted anything.
 */
import { describe, expect, test } from "bun:test";
import type { PersistedRunState, RunStatus } from "../../src/persistence/run-persistence";
import { createRunStore } from "../../src/persistence/run-persistence";

/** An in-memory fs, so retention can be driven without a real clock or a real directory. */
function memoryFs(initial: Record<string, PersistedRunState> = {}) {
	const runs = new Map<string, PersistedRunState>(Object.entries(initial));
	const heldLive = new Set<string>();
	return {
		runs,
		heldLive,
		layer: {
			ensureDir: () => {},
			readRun: (runId: string) => runs.get(runId) ?? null,
			writeRun: async (runId: string, state: PersistedRunState) => {
				runs.set(runId, state);
			},
			deleteRun: (runId: string) => runs.delete(runId),
			listRunIds: () => [...runs.keys()],
			isLeaseHeldLive: (runId: string) => heldLive.has(runId),
		},
	};
}

function run(id: string, over: Partial<PersistedRunState> = {}): PersistedRunState {
	return {
		runId: id,
		workflowName: "w",
		script: "return 1",
		status: "completed" as RunStatus,
		phases: [],
		agents: [],
		logs: [],
		startedAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...over,
	};
}

describe("run store retention", () => {
	test("the cap evicts the OLDEST terminal runs first", async () => {
		// WHY ordering is the contract: evicting by insertion order or by runId would keep an
		// arbitrary set. Age is what a user means by "old", and the reference sorts by updatedAt
		// ascending specifically so the ones nobody is likely to open go first.
		const { runs, layer } = memoryFs({
			oldest: run("oldest", { updatedAt: "2026-01-01T00:00:00Z" }),
			middle: run("middle", { updatedAt: "2026-02-01T00:00:00Z" }),
			newest: run("newest", { updatedAt: "2026-03-01T00:00:00Z" }),
		});
		const store = createRunStore("/runs", { fs: layer, maxTerminalRunsOnDisk: 2 });

		await store.save(run("trigger", { updatedAt: "2026-04-01T00:00:00Z" }));

		// Four terminal runs against a cap of 2, so `excess` is 2: `oldest` and `middle` go.
		// The point is WHICH two, so the assertion names the survivors by age.
		expect([...runs.keys()].sort()).toEqual(["newest", "trigger"]);
	});

	test("a run a LIVE process owns is never evicted, however old", async () => {
		// WHY this is the row that matters most: retention reads the directory, then deletes
		// later. A run can acquire a lease in between. Deleting a leased run does not just lose
		// history — it deletes the file the other process is writing to. The reference re-checks
		// liveness immediately before the delete for exactly this window.
		const { runs, layer, heldLive } = memoryFs({
			leased: run("leased", { updatedAt: "2026-01-01T00:00:00Z" }),
			free: run("free", { updatedAt: "2026-01-02T00:00:00Z" }),
		});
		heldLive.add("leased");
		const store = createRunStore("/runs", { fs: layer, maxTerminalRunsOnDisk: 0 });

		await store.save(run("trigger", { updatedAt: "2026-06-01T00:00:00Z" }));

		// Cap 0 means everything terminal is excess; the leased one still survives.
		expect(runs.has("leased")).toBe(true);
		expect(runs.has("free")).toBe(false);
	});

	test("a run with an undelivered result is never evicted", async () => {
		// WHY: `pendingDelivery` means a result is still owed to a conversation. The reference
		// filters it out BEFORE the cap is computed, not after picking victims — so an undelivered
		// run does not consume budget, it is simply not a candidate. Evicting one loses a result
		// the user was promised.
		const { runs, layer } = memoryFs({
			undelivered: run("undelivered", {
				updatedAt: "2026-01-01T00:00:00Z",
				pendingDelivery: { kind: "complete" },
			}),
			delivered: run("delivered", { updatedAt: "2026-01-02T00:00:00Z" }),
		});
		const store = createRunStore("/runs", { fs: layer, maxTerminalRunsOnDisk: 0 });

		await store.save(run("trigger", { updatedAt: "2026-06-01T00:00:00Z" }));

		expect(runs.has("undelivered")).toBe(true);
		expect(runs.has("delivered")).toBe(false);
	});

	test("a run that GAINS a pendingDelivery after the scan is still spared", async () => {
		// WHY the counter is per-read and not a single "first pass" flag: an earlier version of
		// this row flipped one flag inside `listRunIds`, which runs BEFORE any read — so the scan
		// already saw the marker, filtered the run out as a candidate, and the row passed against
		// a build with no re-check at all. The row was green and proved nothing. Read #1 (the
		// scan) must be unmarked and read #2 (the delete-time re-check) marked, or there is no race.
		const { runs, layer } = memoryFs({ raced: run("raced", { updatedAt: "2026-01-01T00:00:00Z" }) });
		const reads = new Map<string, number>();
		const store = createRunStore("/runs", {
			maxTerminalRunsOnDisk: 0,
			fs: {
				...layer,
				readRun: (runId: string) => {
					const n = (reads.get(runId) ?? 0) + 1;
					reads.set(runId, n);
					const state = layer.readRun(runId);
					return runId === "raced" && n >= 2 && state
						? { ...state, pendingDelivery: { kind: "text" as const, text: "x" } }
						: state;
				},
			},
		});

		await store.save(run("trigger", { updatedAt: "2026-06-01T00:00:00Z" }));

		// The run really was a candidate: it was seen unmarked on the scan.
		expect(reads.get("raced")).toBeGreaterThanOrEqual(2);
		expect(runs.has("raced")).toBe(true);
	});

	test("a run that is still RUNNING or PAUSED is never a candidate at all", async () => {
		// WHY: an in-flight run is the one thing retention must never touch — evicting it strands
		// the run with no record to resume from. This is also why retention only runs on a
		// terminal save: a running run cannot grow the terminal count, so there is nothing to do.
		const { runs, layer } = memoryFs({
			running: run("running", { status: "running", updatedAt: "2026-01-01T00:00:00Z" }),
			paused: run("paused", { status: "paused", updatedAt: "2026-01-01T00:00:00Z" }),
		});
		const store = createRunStore("/runs", { fs: layer, maxTerminalRunsOnDisk: 0 });

		await store.save(run("trigger", { updatedAt: "2026-06-01T00:00:00Z" }));

		expect(runs.has("running")).toBe(true);
		expect(runs.has("paused")).toBe(true);
	});

	test("a save that is NOT terminal never triggers a retention scan", async () => {
		// WHY assert it rather than trust it: retention is a directory scan on every save, and
		// running it on the hot path would make every progress tick pay for a full read. The
		// reference gates it on `TERMINAL_RUN_STATUSES.has(state.status)` precisely because a
		// non-terminal state cannot have grown the terminal count.
		const { runs, layer } = memoryFs({ old: run("old", { updatedAt: "2026-01-01T00:00:00Z" }) });
		let scans = 0;
		const store = createRunStore("/runs", {
			maxTerminalRunsOnDisk: 0,
			fs: {
				...layer,
				listRunIds: () => {
					scans++;
					return layer.listRunIds();
				},
			},
		});

		await store.save(run("live", { status: "running", updatedAt: "2026-06-01T00:00:00Z" }));
		expect(scans).toBe(0);
		expect(runs.has("old")).toBe(true);

		await store.save(run("done", { status: "completed", updatedAt: "2026-06-02T00:00:00Z" }));
		expect(scans).toBeGreaterThan(0);
	});

	test("a record that cannot be re-read is left for the next pass, not deleted", async () => {
		// WHY the catch is there and why swallowing it is correct: a contended or unreadable
		// record is not evidence that it is disposable. Treating an error as permission to delete
		// would turn a transient read failure into data loss; leaving it costs one extra file
		// until the next terminal save.
		const { runs, layer } = memoryFs({ flaky: run("flaky", { updatedAt: "2026-01-01T00:00:00Z" }) });
		const store = createRunStore("/runs", {
			maxTerminalRunsOnDisk: 0,
			fs: {
				...layer,
				readRun: (runId: string) => {
					if (runId === "flaky") throw new Error("EIO");
					return layer.readRun(runId);
				},
			},
		});

		await store.save(run("trigger", { updatedAt: "2026-06-01T00:00:00Z" }));

		expect(runs.has("flaky")).toBe(true);
	});

	test("list returns newest-first and skips records that will not parse", async () => {
		// WHY newest-first: the navigator lists runs by recency, and the store is what feeds it.
		// Skipping unparseable records matters because one corrupt file must not make the whole
		// listing throw — the reference's `listJsonFilesSafe` is built for the same reason.
		const { runs, layer } = memoryFs({
			a: run("a", { updatedAt: "2026-01-01T00:00:00Z" }),
			b: run("b", { updatedAt: "2026-03-01T00:00:00Z" }),
		});
		runs.set("corrupt", { runId: "corrupt" } as PersistedRunState);
		const store = createRunStore("/runs", {
			fs: { ...layer, readRun: id => (id === "corrupt" ? null : layer.readRun(id)) },
		});

		expect(store.list().map(r => r.runId)).toEqual(["b", "a"]);
	});
});
