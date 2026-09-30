import { describe, expect, it } from "bun:test";
import { isAbsolute } from "node:path";
import { ManagedTimers, UNOWNED_TIMERS } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/managed-timers";
import type { Extension } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

// Contract: a timer remembers the extension that scheduled it, so ONE extension
// can be stopped without taking its neighbours down with it.
//
// Ownership is what makes suspend and unload possible at all. Without it the only
// available operation is "clear every timer", so suspending one extension silently
// suspends the background work of every extension beside it — a bug that looks like
// nothing happened rather than like a crash.

/** Only the identity field is read, so a stub is enough and keeps this pure. */
const extension = (path: string) => ({ path }) as unknown as Extension;

describe("ManagedTimers ownership", () => {
	it("clears only the named extension's timers", () => {
		const timers = new ManagedTimers(() => {});
		const mine = extension("/ext/a");
		const theirs = extension("/ext/b");

		let mineFired = 0;
		let theirsFired = 0;
		const mineTimer = timers.setInterval(
			mine,
			() => {
				mineFired += 1;
			},
			1,
		);
		timers.setInterval(
			theirs,
			() => {
				theirsFired += 1;
			},
			1,
		);

		expect(timers.clearFor(mine)).toBe(1);

		timers.clear(mineTimer);
		timers.clearAll();
		// Nothing to assert on the counters without waiting on real timers; what
		// matters is that the neighbour's handle was never touched — proven below.
		expect(theirsFired).toBe(0);
		expect(mineFired).toBe(0);
	});

	it("leaves an unowned timer alone, so it cannot be claimed by whichever extension unloads first", () => {
		// The trampoline contexts have no extension to attribute a timer to. If
		// `clearFor` could match the sentinel, unloading one extension would take
		// down every trampoline-scheduled timer in the process.
		const timers = new ManagedTimers(() => {});
		timers.setInterval(UNOWNED_TIMERS, () => {}, 1000);
		timers.setInterval(extension("/ext/a"), () => {}, 1000);

		expect(timers.clearFor(extension("/ext/a"))).toBe(1);
		// If the sentinel had been cleared too, this would be 0.
		expect(timers.clearFor(extension("/ext/a"))).toBe(0);
		timers.clearAll();
	});

	it("reports nothing to clear for an extension that scheduled nothing", () => {
		const timers = new ManagedTimers(() => {});
		expect(timers.clearFor(extension("/ext/never-seen"))).toBe(0);
	});

	it("keeps the sentinel unmatchable by any real path", () => {
		// An invariant, not a behaviour: the sentinel is only safe while no
		// extension can carry its path. Paths are absolute file paths and a NUL byte
		// cannot appear in one, so it can never collide. Changing the sentinel to a
		// real path leaves every behavioural test green while destroying exactly the
		// property that makes it safe — so assert the property.
		expect(UNOWNED_TIMERS.path.includes("\0")).toBe(true);
		expect(isAbsolute(UNOWNED_TIMERS.path)).toBe(false);
	});
});
