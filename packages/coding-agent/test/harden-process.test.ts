import { afterEach, describe, expect, it, spyOn, vi } from "bun:test";
import { logger } from "@oh-my-pi/pi-utils";
import { hardenProcess, setCoreLimit } from "../src/harden-process";

// Contract: hardening is best-effort, never blocks startup, and NEVER swallows a
// refusal.
//
// The third clause is the one that was wrong. FFI reports a refused syscall
// through its RETURN VALUE, not by throwing — so a try/catch around it passes
// silently, and a Linux kernel that refuses EPERM looks exactly like one that
// succeeded. That is the difference between a guard that works and one that only
// exists.

/** Debug records mentioning the core limit — the only place a refusal can surface. */
function coreLimitLogs(spy: { mock: { calls: unknown[][] } }): unknown[] {
	return spy.mock.calls.filter(call => String(call[0]).includes("RLIMIT_CORE")).map(call => call[1]);
}

describe("hardenProcess", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("leaves the process able to make another syscall afterwards", () => {
		// A guard that leaves omp unable to launch is worse than the hole it closes:
		// the user sees a broken tool rather than a compromised one. A bare
		// `not.toThrow()` would not catch a wedged runtime, so the observable is a
		// real dlopen + FFI round-trip completing AFTER hardening ran.
		hardenProcess();
		expect(setCoreLimit(0, 0)).toBe(0);
	});
});

describe("setCoreLimit", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reports a REFUSED limit instead of letting it read as success", () => {
		// The heart of it. A valid struct SUCCEEDS on this machine, so a test using
		// one would pass with the `rc !== 0` check deleted — it would be a green
		// test protecting nothing. `rlim_cur > rlim_max` is EINVAL under POSIX, and
		// that refusal is reachable anywhere: no Linux runner, no injected syscall,
		// just a struct no caller could legitimately pass.
		const debug = spyOn(logger, "debug").mockImplementation(() => {});
		const rc = setCoreLimit(5, 1);

		expect(rc).not.toBe(0);
		expect(coreLimitLogs(debug)).toEqual([{ rc }]);
	});

	it("stays silent for a limit it actually applied", () => {
		// The negative half. Without this, a `logger.debug` that fires on EVERY
		// call would satisfy the test above while telling an operator their core
		// dumps were refused each time they were in fact disabled.
		const debug = spyOn(logger, "debug").mockImplementation(() => {});
		const rc = setCoreLimit(0, 0);

		expect(rc).toBe(0);
		expect(coreLimitLogs(debug)).toEqual([]);
	});
});
