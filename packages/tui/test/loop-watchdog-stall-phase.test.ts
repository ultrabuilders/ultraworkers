/**
 * Contract: a stall names the phase it happened in, and stops naming it once the
 * block is over.
 *
 * The watchdog already learned the phase on every late tick — it logged it — but
 * only into a log line, so the spinner the user is actually looking at could not
 * say where it was stuck. `stallPhase` exposes that same value.
 *
 * The clearing half is not the easy half. An indicator that never turns off is
 * the regression a test asserting only "the phase appears" would let through: it
 * keeps naming a phase the loop left long ago. Both directions are asserted, and
 * the suite also pins the case the name must NOT survive — a suspension, which
 * `isStalled()` reports as no stall at all.
 *
 * Time and the timer are injected so elapsed time is driven deterministically
 * rather than slept through.
 */
import { afterEach, describe, expect, test, vi } from "bun:test";
import { LoopWatchdog } from "@oh-my-pi/pi-tui/loop-watchdog";
import { currentLoopPhase, popLoopPhase, pushLoopPhase } from "@oh-my-pi/pi-utils";

/** Time-driven watchdog: `set` moves the clock, `fire` runs the armed tick. */
function harness(options: { intervalMs?: number; thresholdMs?: number; sleepMs?: number } = {}) {
	let nowValue = 0;
	let cpuValue = 0;
	let scheduled: (() => void) | undefined;
	const wd = new LoopWatchdog({
		intervalMs: options.intervalMs ?? 100,
		thresholdMs: options.thresholdMs ?? 100,
		sleepMs: options.sleepMs ?? 60_000,
		now: () => nowValue,
		// CPU advances with the clock so a block is never mistaken for a
		// suspension — that distinction is the subject of its own row below.
		cpuNow: () => cpuValue,
		schedule: (cb: () => void) => {
			scheduled = cb;
			return {};
		},
	});

	return {
		wd,
		/** Advance the clock and CPU together, the way a busy process does. */
		set(value: number): void {
			nowValue = value;
			cpuValue = value;
		},
		fire(): void {
			const cb = scheduled;
			if (!cb) throw new Error("no tick was armed");
			cb();
		},
	};
}

afterEach(() => {
	vi.restoreAllMocks();
	// The phase stack is process-global; drain anything these rows pushed.
	while (currentLoopPhase() !== undefined) popLoopPhase();
});

describe("LoopWatchdog stall phase", () => {
	test("names the phase the block happened in", () => {
		const h = harness();
		h.wd.start();
		pushLoopPhase("tool-execution");

		// Overdue by more than the threshold, with CPU spent — a real block.
		h.set(500);
		h.fire();

		expect(h.wd.isStalled()).toBe(true);
		expect(h.wd.stallPhase).toBe("tool-execution");
	});

	test("reports no phase while the loop is healthy", () => {
		const h = harness();
		h.wd.start();
		pushLoopPhase("tool-execution");

		// A tick that lands on time must not invent a stall to name.
		h.set(50);
		h.fire();

		expect(h.wd.isStalled()).toBe(false);
		expect(h.wd.stallPhase).toBeUndefined();
	});

	test("drops the name on the first healthy frame after the block", () => {
		const h = harness();
		h.wd.start();
		pushLoopPhase("tool-execution");
		h.set(500);
		h.fire();
		expect(h.wd.stallPhase).toBe("tool-execution");

		// The block ends. This is the regression an indicator that never turns
		// off would fail: the row would keep naming a phase the loop has left.
		// Measured: the re-armed deadline is 600 and the stall grace ends at
		// 500 + thresholdMs, so 650 is on time AND past the grace — the one
		// value where the block is genuinely over rather than merely brief.
		pushLoopPhase("rendering");
		h.set(650);
		h.fire();

		expect(h.wd.isStalled()).toBe(false);
		expect(h.wd.stallPhase).toBeUndefined();
	});

	test("reports a new phase when a continuing block settles into another", () => {
		const h = harness();
		h.wd.start();
		pushLoopPhase("tool-execution");
		h.set(500);
		h.fire();
		expect(h.wd.stallPhase).toBe("tool-execution");

		// Still blocked, but no longer in the phase that started it. The log
		// line is suppressed here (one line per block), so a phase recorded
		// only when logging would keep reporting the stale name.
		// Measured: the re-armed deadline after the 500 tick is 600, so a
		// continuing block needs a jump past 600 + thresholdMs.
		popLoopPhase();
		pushLoopPhase("mcp-request");
		h.set(750);
		h.fire();

		expect(h.wd.isStalled()).toBe(true);
		expect(h.wd.stallPhase).toBe("mcp-request");
	});

	test("names nothing for a suspension, which is not a stall", () => {
		// A long gap the process spent no CPU on: the machine was asleep, not
		// the loop blocked. `isStalled()` says no, so the phase must not appear
		// either — otherwise the row blames a phase for the process being idle.
		//
		// Built directly rather than through `harness`, because that helper ties
		// CPU to the clock, and a suspension is defined by CPU *not* keeping up.
		let now = 0;
		let cpu = 0;
		let armed: (() => void) | undefined;
		const wd = new LoopWatchdog({
			intervalMs: 100,
			thresholdMs: 100,
			sleepMs: 50,
			now: () => now,
			cpuNow: () => cpu,
			schedule: (cb: () => void) => {
				armed = cb;
				return {};
			},
		});

		wd.start();
		// Stall for real first, so a name is actually set. Without this the row
		// passes whether or not the suspension branch clears: there is nothing
		// to clear, so the clear is unobservable and a stale name would slip
		// through untouched.
		pushLoopPhase("tool-execution");
		now = 500;
		cpu = 500;
		armed?.();
		expect(wd.stallPhase).toBe("tool-execution");

		// Now the process is suspended: a long gap it spent no CPU on. That is
		// not a stall, so the previous block's name must not survive into it.
		popLoopPhase();
		pushLoopPhase("idle");
		now = 5000;
		cpu = 500;
		armed?.();

		expect(wd.isStalled()).toBe(false);
		expect(wd.stallPhase).toBeUndefined();
		wd.stop();
	});

	test("reports a stall that has no phase, without pretending the loop is idle", () => {
		const h = harness();
		h.wd.start();
		// No phase pushed. `takeRecentLoopPhase()` returns undefined for an
		// interval that had no phase, so a block can be real and unnamed — the
		// log line already writes `phase ?? "unknown"` for exactly this.
		h.set(500);
		h.fire();

		// The two facts are distinct and must stay distinct: the loop IS blocked,
		// yet no name is available. A reader that inferred "not blocked" from an
		// undefined phase would hide the stall, which is the one moment the
		// indicator matters.
		expect(h.wd.isStalled()).toBe(true);
		expect(h.wd.stallPhase).toBeUndefined();
	});

	test("forgets the phase across a stop/start cycle", () => {
		const h = harness();
		h.wd.start();
		pushLoopPhase("tool-execution");
		h.set(500);
		h.fire();
		expect(h.wd.stallPhase).toBe("tool-execution");

		h.wd.stop();
		expect(h.wd.stallPhase).toBeUndefined();

		// A fresh cycle that stalls with no phase pushed must not resurrect the
		// previous run's name.
		h.set(600);
		h.fire();

		expect(h.wd.stallPhase).toBeUndefined();
	});
});
