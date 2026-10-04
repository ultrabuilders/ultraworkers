/**
 * The lease is the only thing stopping two processes from resuming one run and each appending
 * their own deltas. Every row here is a way that could go wrong: a second acquire that should be
 * refused, a crashed holder that should not block forever, a release that could delete somebody
 * else's lock, and a live process misread as dead.
 *
 * The stale-holder rows drive the injected `LeaseFs` rather than hunting for a genuinely dead
 * pid, because "find a pid that is not running" is not something a test can assert honestly —
 * pids get reused, and a row that depends on one stops being about the lease.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";
import { createRunLease, pidIsAlive } from "../../src/persistence/lease";

describe("pid liveness", () => {
	test("this process is alive", () => {
		expect(pidIsAlive(process.pid)).toBe(true);
	});

	test("a non-integer or non-positive pid is not alive", () => {
		// `process.kill(0, 0)` signals the whole process GROUP, so a zero slipping past this
		// guard would report every pid as dead and let a second process claim a live run.
		for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(pidIsAlive(bad)).toBe(false);
		}
	});
});

describe("run lease", () => {
	let tempDir: TempDir;
	let runsDir: string;

	beforeEach(() => {
		tempDir = TempDir.createSync("@ultraworkers-run-lease-");
		runsDir = join(tempDir.path(), "runs");
	});

	afterEach(() => {
		tempDir.removeSync();
	});

	test("grants a lease, and the lock names its holder", () => {
		const lease = createRunLease(runsDir);
		const held = lease.acquireRunLease("run-1", "/runs/run-1.json");
		expect(held).not.toBeNull();
		expect(held?.runId).toBe("run-1");

		const lock = JSON.parse(readFileSync(join(runsDir, "run-1.lock"), "utf-8")) as {
			pid: number;
			token: string;
			runPath: string;
		};
		expect(lock.pid).toBe(process.pid);
		expect(lock.runPath).toBe("/runs/run-1.json");
		// The token must be unique per acquisition: release matches on it, so a constant would
		// let one holder's release delete another's lock.
		if (!held) throw new Error("expected a lease to be granted");
		expect(lock.token).toBe(held.token);
	});

	test("refuses a second lease while the first is held", () => {
		// The core contract. A second process that got `null` knows to leave the run alone; one
		// that got a lease would replay the journal and append deltas of its own.
		const first = createRunLease(runsDir);
		expect(first.acquireRunLease("run-1", "/runs/run-1.json")).not.toBeNull();
		const second = createRunLease(runsDir);
		expect(second.acquireRunLease("run-1", "/runs/run-1.json")).toBeNull();
	});

	test("reclaims when pid liveness is injected as dead", () => {
		// WHY both halves are injected: `readLockAt` is only consulted AFTER `wx` reports
		// EEXIST, so injecting the reader alone leaves the first create succeeding and the
		// reclaim branch unreachable. Injecting the writer too is what actually drives the loop
		// into its second attempt.
		let released = 0;
		const staleHolder = {
			runId: "run-1",
			runPath: "/runs/run-1.json",
			pid: 999999,
			startedAt: new Date(0).toISOString(),
			token: "stale",
		};
		const lease = createRunLease(runsDir, {
			readLockAt: () => staleHolder,
			unlink: () => {
				released++;
			},
			writeFileExclusive: (path, data) => {
				if (released === 0) throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
				writeFileSync(path, data);
			},
		});
		const held = lease.acquireRunLease("run-1", "/runs/run-1.json");
		expect(released).toBe(1);
		expect(held?.token).not.toBe("stale");
	});

	test("refuses while the holder is injected as alive", () => {
		// The negative of the row above. If `EPERM` were read as "dead", this holder would be
		// reclaimed and a second process would run alongside it.
		const liveHolder = {
			runId: "run-1",
			runPath: "/runs/run-1.json",
			pid: process.pid,
			startedAt: new Date(0).toISOString(),
			token: "live",
		};
		let unlinked = 0;
		const lease = createRunLease(runsDir, {
			readLockAt: () => liveHolder,
			unlink: () => {
				unlinked++;
			},
			writeFileExclusive: () => {
				throw Object.assign(new Error("EEXIST"), { code: "EEXIST" });
			},
		});
		expect(lease.acquireRunLease("run-1", "/runs/run-1.json")).toBeNull();
		expect(unlinked).toBe(0);
	});

	test("a holder for a different runPath does not block this one", () => {
		// The reference compares runPath as well as pid. A lock describing a different file is
		// not evidence about this run, and treating it as one would refuse a legitimate acquire.
		const otherPath = {
			runId: "run-1",
			runPath: "/elsewhere/run-1.json",
			pid: process.pid,
			startedAt: new Date(0).toISOString(),
			token: "other",
		};
		const lease = createRunLease(runsDir, { readLockAt: () => otherPath });
		expect(lease.acquireRunLease("run-1", "/runs/run-1.json") === null).toBe(false);
	});

	test("release removes the lock and frees the run", () => {
		const lease = createRunLease(runsDir);
		const held = lease.acquireRunLease("run-1", "/runs/run-1.json");
		expect(held).not.toBeNull();
		lease.releaseRunLease(held!);

		const second = createRunLease(runsDir);
		expect(second.acquireRunLease("run-1", "/runs/run-1.json")).not.toBeNull();
	});

	test("release with a stale token leaves the current holder's lock alone", () => {
		// The reclaim-then-release race: our lock was taken as stale and re-granted, and a late
		// release must not delete the new holder's lock. This is the row that makes `token` a
		// safety property rather than bookkeeping.
		const lease = createRunLease(runsDir);
		const held = lease.acquireRunLease("run-1", "/runs/run-1.json");

		const current = {
			runId: "run-1",
			runPath: "/runs/run-1.json",
			pid: process.pid,
			startedAt: new Date(0).toISOString(),
			token: "someone-else",
		};
		let unlinked = 0;
		const other = createRunLease(runsDir, {
			readLockAt: () => current,
			unlink: () => {
				unlinked++;
			},
		});
		other.releaseRunLease(held!);
		expect(unlinked).toBe(0);
	});

	test("release of a lock that is already gone is not an error", () => {
		const lease = createRunLease(runsDir);
		expect(() => lease.releaseRunLease({ runId: "never-held", token: "nope" })).not.toThrow();
	});
});
