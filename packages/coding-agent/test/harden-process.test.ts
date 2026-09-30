import { afterEach, describe, expect, it, spyOn, vi } from "bun:test";
import { logger } from "@oh-my-pi/pi-utils";
import { hardenProcess, setCoreLimit } from "../src/harden-process";

/** Absolute specifiers: the probe child runs with its own cwd, not ours. */
const HARDEN_MODULE = new URL("../src/harden-process.ts", import.meta.url).href;
const CLI_MODULE = new URL("../src/cli.ts", import.meta.url).href;
const PROC_MANAGER_MODULE = new URL("../../utils/src/procmgr.ts", import.meta.url).href;

// Contract: hardening is best-effort, never blocks startup, and NEVER swallows a
// refusal.
//
// The third clause is the one that was wrong. FFI reports a refused syscall
// through its RETURN VALUE, not by throwing — so a try/catch around it passes
// silently, and a Linux kernel that refuses EPERM looks exactly like one that
// succeeded. That is the difference between a guard that works and one that only
// exists.

// `hardenProcess` deletes loader variables from `process.env` on every call, so this
// is a whole-file concern rather than a per-test one: running this file against a
// shell that exported `LD_PRELOAD` would otherwise leave the whole `bun test` process
// scrubbed for every file that follows it.
const PRISTINE_ENV = { ...process.env };

afterEach(() => {
	vi.restoreAllMocks();
	for (const key of Object.keys(process.env)) {
		if (!(key in PRISTINE_ENV)) delete process.env[key];
	}
	Object.assign(process.env, PRISTINE_ENV);
});

/** Debug records mentioning the core limit — the only place a refusal can surface. */
function coreLimitLogs(spy: { mock: { calls: unknown[][] } }): unknown[] {
	return spy.mock.calls.filter(call => String(call[0]).includes("RLIMIT_CORE")).map(call => call[1]);
}

describe("hardenProcess", () => {
	it("leaves the process able to make another syscall afterwards", () => {
		// A guard that leaves omp unable to launch is worse than the hole it closes:
		// the user sees a broken tool rather than a compromised one. A bare
		// `not.toThrow()` would not catch a wedged runtime, so the observable is a
		// real dlopen + FFI round-trip completing AFTER hardening ran.
		hardenProcess();
		expect(setCoreLimit(0, 0)).toBe(0);
	});
});

describe("loader variables in this process's own environment", () => {
	it("removes loader-hijack variables that would otherwise reach every child", () => {
		// The gap this covers: `sanitizeChildEnv` scrubs the per-command env, but the
		// BASE layer comes from `filterChildShellEnv`, which was measured to let both
		// of these straight through. So a loader variable set before omp launched
		// reached children through the layer the scrub does not touch.
		process.env.LD_PRELOAD = "/tmp/evil.so";
		process.env.DYLD_INSERT_LIBRARIES = "/tmp/evil.dylib";
		process.env.PATH = "/usr/bin";

		hardenProcess();

		expect(process.env.LD_PRELOAD).toBeUndefined();
		expect(process.env.DYLD_INSERT_LIBRARIES).toBeUndefined();
		// Non-negotiable: filtering wider than the loader family breaks LSP servers
		// and browsers, which is a far more common failure than a hijack.
		expect(process.env.PATH).toBe("/usr/bin");
	});
});

/**
 * The `isProcessEntry` guard, observed rather than asserted.
 *
 * This is the failure the bead calls the worst kind: `bun test` and SDK embedding
 * enter the SAME `cli.ts`, so without the guard the test runner hardens ITSELF and a
 * test that crashes on purpose goes silent -- no stack, no core dump, no trace
 * anywhere. It is invisible to review because nothing looks wrong.
 *
 * Asserting `isProcessEntry === false` cannot catch it: delete the guard and that
 * constant still reads false, so the test stays green over exactly the bug it
 * exists to prevent. So the probe asks the question the failure actually turns on --
 * did importing `cli.ts` harden this process? -- and reads the answer off real process
 * state. A loader variable survives iff `hardenProcess()` did NOT run, because the
 * env strip lives inside it. Removing the guard flips this; measured both directions:
 * guard present -> survives, guard removed -> stripped.
 *
 * A fresh process, because the probe has to import `cli.ts` and inheriting this
 * runner's state would answer a question nobody asked.
 *
 * `RLIMIT_CORE` is deliberately NOT the signal: it reads `[0, 0, MAX]` on macOS
 * before anything runs, so a test built on it would pass with or without the guard.
 */
describe("the isProcessEntry guard", () => {
	const PROBE = [
		// The env strip runs INSIDE hardenProcess, so its absence is the discriminator.
		"try {",
		`\tawait import(${JSON.stringify(CLI_MODULE)});`,
		"} catch { /* cli.ts may exit or prompt; the env answer stands either way */ }",
		"console.log('SURVIVED=' + ('LD_PRELOAD' in process.env));",
	].join("\n");

	it("leaves the test runner un-hardened after cli.ts is imported", async () => {
		const child = Bun.spawn([process.execPath, "-e", PROBE], {
			env: { ...process.env, LD_PRELOAD: "/tmp/evil.so" },
			stdout: "pipe",
		});
		const stdout = await new Response(child.stdout).text();
		expect(await child.exited).toBe(0);

		// Print before asserting: the failure this defends has no trace of its own, so
		// the value has to be visible even on the passing run.
		console.error("[harden:guard] cli.ts imported, LD_PRELOAD still present = %s", stdout.trim());
		expect(stdout.trim()).toBe("SURVIVED=true");
	});
});

/**
 * The end-to-end contract, and the only one that proves the fix.
 *
 * Everything above observes a function or a constant. This spawns a child whose
 * environment comes from the SAME chain a real command does —
 * `getShellConfig()` → `buildSpawnEnv()` → `filterChildShellEnv(Bun.env)` — and
 * reads the keys that child actually saw. That chain is why `LD_*` survived for
 * so long: `sanitizeChildEnv`'s own tests stayed green the whole time, because
 * they never crossed it. A test that only asserts a function's return value
 * cannot see this class of bug at all.
 *
 * In a fresh process on purpose, for two reasons. `getShellConfig()` caches its
 * built env per process, so asserting in-process would compare against a snapshot
 * taken before the strip. And the threat model is a loader variable that was
 * already set when omp started, not one assigned to a map the test owns.
 */
describe("loader variables reaching a real child", () => {
	const PROBE = [
		`const { hardenProcess } = await import(${JSON.stringify(HARDEN_MODULE)});`,
		// Assigned rather than inherited: macOS `dyld` aborts a child at EXEC time when
		// an inherited `DYLD_INSERT_LIBRARIES` names a dylib it cannot load — the
		// hijack lands one layer before this code, so a nonexistent path would kill
		// the probe instead of exercising the guard. Presence when the guard runs is
		// what the code under test actually observes.
		"process.env.DYLD_INSERT_LIBRARIES = '/tmp/evil.dylib';",
		"hardenProcess();",
		`const { getShellConfig } = await import(${JSON.stringify(PROC_MANAGER_MODULE)});`,
		// The real spawn env, not a hand-built approximation of it.
		"const { env } = getShellConfig();",
		"const child = Bun.spawn([process.execPath, '-e',",
		JSON.stringify("console.log(JSON.stringify({ keys: Object.keys(process.env).sort(), path: process.env.PATH }))"),
		"], { env, stdout: 'pipe' });",
		"process.stdout.write(await new Response(child.stdout).text());",
	].join("\n");

	it("does not appear in a child's environment, while PATH still does", async () => {
		// `LD_PRELOAD` is inherited for real. macOS ignores `LD_*` outright and Linux's
		// `ld.so` only warns on a missing object, so unlike `DYLD_*` this one is safe to
		// arrive through the environment — and does, which is the path being fixed.
		const spawnEnv: Record<string, string> = { ...process.env, LD_PRELOAD: "/tmp/evil.so" };
		const child = Bun.spawn([process.execPath, "-e", PROBE], { env: spawnEnv, stdout: "pipe", stderr: "pipe" });
		const [stdout, stderr, exitCode] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);

		const { keys, path: childPath } = JSON.parse(stdout.trim()) as { keys: string[]; path: string };
		expect(keys).not.toContain("LD_PRELOAD");
		expect(keys).not.toContain("DYLD_INSERT_LIBRARIES");
		// The other direction, and the one that makes the filter safe to ship: a scrub
		// that also ate `PATH` would break every LSP server and browser, a far more
		// common failure than a hijack.
		expect(keys).toContain("PATH");
		expect(childPath).toBe(spawnEnv.PATH);
	});
});

describe("setCoreLimit", () => {
	it("reports a REFUSED limit instead of letting it read as success", () => {
		// The heart of it. A valid struct SUCCEEDS on this machine, so a test using
		// one would pass with the `rc !== 0` check deleted -- it would be a green
		// test protecting nothing. `rlim_cur > rlim_max` is EINVAL under POSIX, and
		// that refusal is reachable anywhere: no Linux runner, no injected syscall,
		// just a struct no caller could legitimately pass.
		const debug = spyOn(logger, "debug").mockImplementation(() => {});
		const rc = setCoreLimit(5, 1);

		expect(rc).not.toBe(0);
		expect(coreLimitLogs(debug)).toEqual([{ rc }]);
	});

	it("stays silent for a limit it actually applied", () => {
		// The negative half. Without this, a `logger.debug` that fires on EVERY call
		// would satisfy the test above while telling an operator their core dumps were
		// refused each time they were in fact disabled.
		const debug = spyOn(logger, "debug").mockImplementation(() => {});
		const rc = setCoreLimit(0, 0);

		expect(rc).toBe(0);
		expect(coreLimitLogs(debug)).toEqual([]);
	});
});
