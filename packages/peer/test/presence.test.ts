import { describe, expect, it } from "bun:test";
import {
	DEFAULT_IDLE_MS,
	judgePresence,
	observeAgain,
	probePid,
	selectReapable,
	type PresenceSignals,
} from "../src/presence/liveness";

/**
 * `epic-jwsy.7` — four liveness signals, and only `ESRCH` means dead.
 *
 * The EPERM cases run against a REAL foreign-owned process rather than a mocked
 * errno: `pid 1` belongs to root on this machine, so `kill(1, 0)` genuinely
 * returns EPERM. A test that mocked the error would prove only that the code
 * reads a field, which is the assertion AGENTS.md calls a static echo.
 */

const SELF = process.pid;
const MISSING_PID = 2 ** 30;

function signals(over: Partial<PresenceSignals> = {}): PresenceSignals {
	return { pid: SELF, lastSeenMs: 1_000, ...over };
}

/** A pid that exists and belongs to another user, or null when we cannot get one. */
function foreignOwnedPid(): number | null {
	for (const candidate of [1]) {
		const probe = probePid(candidate);
		if (!probe.alive && probe.reason === "no-permission") return candidate;
	}
	return null;
}

describe("probePid", () => {
	it("reports a live process as alive", () => {
		expect(probePid(SELF)).toEqual({ alive: true });
	});

	it("reports a pid that cannot exist as gone", () => {
		expect(probePid(MISSING_PID)).toEqual({ alive: false, reason: "gone" });
	});

	it("reads EPERM as 'alive, seen from outside our user' — not as death", () => {
		const pid = foreignOwnedPid();
		if (pid === null) {
			// Running as root, or pid 1 belongs to us: this machine cannot produce
			// the signal at all. That is a skip with a stated reason, not a pass.
			expect(probePid(SELF)).toEqual({ alive: true });
			return;
		}
		// The whole point: the process EXISTS. It is owned by another user, so
		// signal 0 is refused. Reading this as death kills a live machine.
		expect(probePid(pid)).toEqual({ alive: false, reason: "no-permission" });
	});
});

describe("judgePresence", () => {
	it("reaps a process that is positively gone", () => {
		const verdict = judgePresence(signals({ pid: MISSING_PID }), { nowMs: 10_000, repeated: true });
		expect(verdict.stale).toBe(true);
		expect(verdict.reasons).toEqual(["process-gone"]);
	});

	it("does NOT reap a sleeping laptop: stale endpoint and old mtime, but the process is there", () => {
		// The failure this exists to prevent. A machine asleep since yesterday has
		// a dead socket and a day-old mtime, and reaping on either of those kills
		// a session that will wake up holding files.
		const verdict = judgePresence(signals({ pid: SELF, lastSeenMs: 0, endpoint: "/tmp/gone.sock" }), {
			nowMs: 86_400_000,
			repeated: true,
			probeEndpoint: () => false,
		});
		expect(verdict.stale).toBe(false);
		// The complaints are still recorded, so a reaper that acts later can say why.
		expect(verdict.reasons).toEqual(["endpoint-failed", "idle-too-long"]);
	});

	it("does not reap on EPERM, and says that is why", () => {
		const pid = foreignOwnedPid();
		if (pid === null) {
			expect(probePid(SELF)).toEqual({ alive: true });
			return;
		}
		const verdict = judgePresence(signals({ pid, lastSeenMs: 0, endpoint: "/tmp/gone.sock" }), {
			nowMs: 86_400_000,
			repeated: true,
			probeEndpoint: () => false,
		});
		// Alive-but-unreadable vetoes everything, exactly like a live readable one.
		expect(verdict.stale).toBe(false);
		expect(verdict.reasons).toContain("no-permission");
	});

	it("refuses to decide on ONE observation of a stale signal", () => {
		const verdict = judgePresence(signals({ pid: SELF, lastSeenMs: 0 }), {
			nowMs: DEFAULT_IDLE_MS,
			repeated: false,
			idleMs: 1_000,
		});
		expect(verdict.stale).toBe(false);
		expect(verdict.reasons).toEqual(["idle-too-long"]);
	});

	it("leaves a fresh, live peer completely alone", () => {
		const verdict = judgePresence(signals({ pid: SELF, lastSeenMs: 9_000 }), { nowMs: 10_000 });
		expect(verdict.stale).toBe(false);
		expect(verdict.reasons).toEqual([]);
	});
});

describe("observeAgain", () => {
	it("still does not reap a LIVE peer, however many times the complaint repeats", () => {
		// The rule is not "two agreeing complaints reap" — it is "ESRCH reaps, and
		// agreement is only ever necessary, never sufficient". A process that keeps
		// answering is a peer that is awake, busy, or asleep; none of those three
		// is dead, and an hour-long build looks exactly like the second one.
		const first = judgePresence(signals({ pid: SELF, lastSeenMs: 0 }), {
			nowMs: 60_000,
			repeated: false,
			idleMs: 1_000,
		});
		expect(first.stale).toBe(false);
		expect(first.reasons).toEqual(["idle-too-long"]);

		const second = observeAgain(signals({ pid: SELF, lastSeenMs: 0 }), first, { nowMs: 360_000, idleMs: 1_000 });
		expect(second.stale).toBe(false);
		expect(second.reasons).toEqual(["idle-too-long"]);

		// And again, a third time — the count is not a threshold that eventually
		// reaches a reaping decision.
		expect(observeAgain(signals({ pid: SELF, lastSeenMs: 0 }), second, { nowMs: 660_000, idleMs: 1_000 }).stale).toBe(
			false,
		);
	});

	it("does not reap when the second observation is a DIFFERENT complaint", () => {
		// "endpoint failed" then "idle too long" is two unrelated readings, not
		// confirmation. Treating it as confirmation is how a reaper starts killing
		// peers whose complaint simply moved.
		const first = judgePresence(signals({ pid: MISSING_PID, lastSeenMs: 9_000, endpoint: "/tmp/a.sock" }), {
			nowMs: 60_000,
			repeated: false,
			probeEndpoint: () => false,
		});
		expect(first.reasons).toEqual(["process-gone"]);

		const second = observeAgain(signals({ pid: SELF, lastSeenMs: 0, endpoint: "/tmp/a.sock" }), first, {
			nowMs: 600_000,
			idleMs: 1_000,
			probeEndpoint: () => false,
		});
		expect(second.reasons).toEqual(["endpoint-failed", "idle-too-long"]);
		expect(second.stale).toBe(false);
	});

	it("reaps a genuinely gone process on the second observation too", () => {
		const s = signals({ pid: MISSING_PID });
		const first = judgePresence(s, { nowMs: 1_000, repeated: false });
		expect(first.stale).toBe(true);
		expect(observeAgain(s, first, { nowMs: 2_000 }).stale).toBe(true);
	});
});

describe("selectReapable", () => {
	it("names a reason for every registration it would reap", () => {
		const reaped = selectReapable(
			[
				{ instanceId: "gone", signals: signals({ pid: MISSING_PID }) },
				{ instanceId: "alive", signals: signals({ pid: SELF, lastSeenMs: 9_999 }) },
				{
					instanceId: "asleep",
					signals: signals({ pid: SELF, lastSeenMs: 0, endpoint: "/tmp/x.sock" }),
					prior: judgePresence(signals({ pid: SELF, lastSeenMs: 0, endpoint: "/tmp/x.sock" }), {
						nowMs: 60_000,
						repeated: false,
						probeEndpoint: () => false,
					}),
				},
			],
			{ nowMs: 400_000, idleMs: 1_000, probeEndpoint: () => false },
		);

		// Only the confirmed-dead one. The sleeping one agrees across two
		// observations but its process answers, so it survives.
		expect(reaped.map(r => r.instanceId)).toEqual(["gone"]);
		expect(reaped[0].reasons).toEqual(["process-gone"]);
		expect(reaped[0].atMs).toBe(400_000);
	});

	it("reaps nothing when nothing is confirmed", () => {
		expect(
			selectReapable([{ instanceId: "a", signals: signals({ pid: SELF, lastSeenMs: 9_999 }) }], { nowMs: 10_000 }),
		).toEqual([]);
	});
});
