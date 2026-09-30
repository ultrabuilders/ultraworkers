import { describe, expect, it } from "bun:test";
import { hardenProcess } from "../src/harden-process";

// Contract: hardening is best-effort, never blocks startup, and NEVER swallows a
// refusal.
//
// The third clause is the one that was wrong. FFI reports a refused syscall
// through its RETURN VALUE, not by throwing — so a try/catch around it passes
// silently, and a Linux kernel that refuses EPERM looks exactly like one that
// succeeded. That is the difference between a guard that works and one that only
// exists, and it is checkable from macOS.

describe("hardenProcess", () => {
	it("never throws, even when the platform has no equivalent call", () => {
		expect(() => hardenProcess()).not.toThrow();
		expect(() => hardenProcess()).not.toThrow();
	});

	it("records that the return-code checks are UNVERIFIED here, not merely untested", () => {
		// The `rc !== 0` branches cannot be provoked on macOS: setrlimit(RLIMIT_CORE)
		// SUCCEEDS here, so nothing ever logs and the assertion would pass whether or
		// not the check exists. An earlier version of this test tried to force it and
		// was removed after proving it stayed green with the check deleted.
		//
		// So the refusal branches are UNVERIFIED, not merely untested — which needs a
		// Linux runner or an injected syscall, not a better-written assertion.
		expect(typeof process.platform).toBe("string");
	});
});
