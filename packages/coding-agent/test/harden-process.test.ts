import { describe, expect, it } from "bun:test";
import { hardenProcess } from "../src/harden-process";

// Contract: hardening is best-effort and NEVER blocks startup.
//
// These run on whatever platform the suite runs on. The Linux-only syscalls cannot
// be exercised here — that needs a Linux runner, and pretending otherwise would be
// the exact "reads as present and is not" failure this module exists to avoid. What
// IS verifiable everywhere, and is the property that actually matters, is that a
// platform without the calls is a clean no-op rather than an exception.

describe("hardenProcess", () => {
	it("does not throw on a platform without the Linux calls", () => {
		// The single most important line here. A guard that throws during startup
		// turns a security measure into an outage.
		expect(() => hardenProcess()).not.toThrow();
		// Idempotent: the module caches its resolved handles, so a second call must
		// also be safe.
		expect(() => hardenProcess()).not.toThrow();
	});
});
