import { describe, expect, it } from "bun:test";
import { LOADER_HIJACK_VARS, sanitizeChildEnv } from "@oh-my-pi/pi-coding-agent/exec/sanitize-child-env";

// Contract: loader-hijack variables do not reach a child, and everything a child
// legitimately needs still does.
//
// The negative half is the one that matters. A scrub that also stripped PATH or
// Homebrew prefixes would not fail any security test — it would just stop LSP
// servers, kernels and browsers from starting, which is why "narrow" is the part
// worth pinning rather than the stripping.

describe("sanitizeChildEnv", () => {
	it("removes every loader variable it claims to", () => {
		const hostile = Object.fromEntries(LOADER_HIJACK_VARS.map(name => [name, "/tmp/evil.so"]));
		const cleaned = sanitizeChildEnv({ ...hostile, PATH: "/usr/bin" });
		for (const name of LOADER_HIJACK_VARS) {
			expect({ name, present: name in cleaned }).toEqual({ name, present: false });
		}
	});

	it("keeps what children actually need", () => {
		// A child with no PATH cannot run a command; one without Homebrew's prefix
		// cannot find the binaries the user installed.
		const env = {
			PATH: "/opt/homebrew/bin:/usr/bin",
			NODE_PATH: "/opt/homebrew/lib/node_modules",
			LANG: "en_US.UTF-8",
			HOME: "/Users/dev",
			LD_LIBRARY_PATH: "/tmp/evil.so",
		};
		expect(sanitizeChildEnv(env)).toEqual({
			PATH: "/opt/homebrew/bin:/usr/bin",
			NODE_PATH: "/opt/homebrew/lib/node_modules",
			LANG: "en_US.UTF-8",
			HOME: "/Users/dev",
		});
	});

	it("leaves an already-clean environment untouched", () => {
		const env = { PATH: "/usr/bin", TERM: "xterm-256color" };
		expect(sanitizeChildEnv(env)).toEqual(env);
	});

	it("returns a copy rather than mutating the caller's object", () => {
		// The caller reuses its env for several children; mutating it would strip
		// variables from spawns this helper never saw.
		const env = { PATH: "/usr/bin", LD_PRELOAD: "/tmp/evil.so" };
		sanitizeChildEnv(env);
		expect(env.LD_PRELOAD).toBe("/tmp/evil.so");
	});

	it("strips macOS loader hijack variables, not just the Linux ones", () => {
		// ultraworkers ships on macOS more than any other platform, and DYLD_* is the same
		// hijack under a different prefix. Enumerating only LD_* left the most common
		// target unprotected while the guard looked present.
		const env = {
			PATH: "/usr/bin",
			DYLD_INSERT_LIBRARIES: "/tmp/evil.dylib",
			DYLD_LIBRARY_PATH: "/tmp",
		};
		const result = sanitizeChildEnv(env);
		expect(result.DYLD_INSERT_LIBRARIES).toBeUndefined();
		expect(result.DYLD_LIBRARY_PATH).toBeUndefined();
		expect(result.PATH).toBe("/usr/bin");
	});

	it("strips an unenumerated variable in a loader family", () => {
		// The prefix rule is what covers names nobody wrote down. A new loader
		// variable should be blocked by default, not wait for someone to add it.
		const env = { PATH: "/usr/bin", LD_SOMETHING_NEW: "x", DYLD_SOMETHING_NEW: "y" };
		const result = sanitizeChildEnv(env);
		expect(result.LD_SOMETHING_NEW).toBeUndefined();
		expect(result.DYLD_SOMETHING_NEW).toBeUndefined();
	});

	it("keeps variables that merely resemble a loader family", () => {
		// The prefix is anchored at the start, so a user variable that happens to
		// contain "LD_" survives. A substring match would strip it.
		const env = { PATH: "/usr/bin", MY_LD_PATH: "/opt/thing", OLD_LD_PRELOAD: "/opt/x" };
		const result = sanitizeChildEnv(env);
		expect(result.MY_LD_PATH).toBe("/opt/thing");
		expect(result.OLD_LD_PRELOAD).toBe("/opt/x");
	});

	it("returns the SAME object when nothing needs stripping", () => {
		// Identity, not just equality: callers compare `env === callerEnv`, so copying
		// unconditionally would be a behaviour change dressed as a refactor. This is
		// the contract that broke when the scrub was wired in and the direnv suite
		// went red.
		const env = { PATH: "/usr/bin", FOO: "bar" };
		expect(sanitizeChildEnv(env)).toBe(env);
	});
});
