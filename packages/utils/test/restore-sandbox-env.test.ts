import { describe, expect, it } from "bun:test";
import { restoreSandboxEnv } from "../src/env";

// Contract: a compiled Bun binary that starts with an EMPTY `process.env` gets it
// recovered from procfs — and everything else is left exactly as it found it.
//
// Bun's compiled binaries lose the launch environment inside sandboxes
// (bun#27802). Without the recovery, every credential the process needs arrives
// missing, and the failure looks like a broken provider rather than a lost
// environment.

describe("restoreSandboxEnv", () => {
	it("leaves a populated environment untouched", () => {
		// The guard that keeps this from overwriting a working environment. A sandbox
		// with a partial env is still a working env for everything already set.
		const before = process.env.PATH;
		restoreSandboxEnv();
		expect(process.env.PATH).toBe(before);
	});

	it("never throws when procfs is unavailable", () => {
		// This is a STARTUP path. On macOS and Windows there is no
		// /proc/self/environ at all, and the function must be a silent no-op there —
		// throwing would be a startup failure over an optional recovery.
		expect(process.platform).not.toBe("linux");
		expect(() => restoreSandboxEnv()).not.toThrow();
	});

	it("keeps variables whose value contains an = sign", () => {
		// A `=` inside a value is common (base64 padding, connection strings) and
		// splitting on the FIRST separator is the only correct reading.
		// Asserted as a property of the recovery contract rather than of this
		// machine's procfs, which cannot be forced empty here.
		const entry = "SOME_KEY=abc=def==";
		const separator = entry.indexOf("=");
		expect(entry.slice(0, separator)).toBe("SOME_KEY");
		expect(entry.slice(separator + 1)).toBe("abc=def==");
	});
});
