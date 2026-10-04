import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * A tmux query that runs out of its time budget must not be remembered as an answer.
 *
 * `resolveTmuxClientTerminalName` caches per process, which is the right call for a
 * terminal that is not going to change. But a query killed by the 500ms budget says
 * nothing about the terminal — it says the machine was busy — and caching it as `null`
 * meant one slow spawn cost the process its terminal type permanently. In a long-running
 * TUI the name never came back, and nothing logged that anything had been lost.
 *
 * These drive the real function through a real child process with a real `tmux` on PATH,
 * because the distinction being tested is `exitCode === null` (the budget fired) versus a
 * number (tmux answered or refused). A mocked spawn cannot observe that difference, so a
 * mock-based version of this test would pass against the bug it is meant to catch.
 */

/** Env for the child: tmux markers set, and the test-runtime guards scrubbed. */
function childEnv(binDir: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const [key, value] of Object.entries(Bun.env)) {
		if (value !== undefined) env[key] = value;
	}
	for (const key of ["PI_TEST_RUNTIME", "BUN_ENV", "NODE_ENV"]) delete env[key];
	env.TERM = "tmux-256color";
	env.TMUX = "/tmp/tmux-1000/default,4242,0";
	env.PATH = `${binDir}${path.delimiter}${Bun.env.PATH ?? ""}`;
	return env;
}

/**
 * Run `resolveTmuxClientTerminalName` twice in one child process and report both answers.
 *
 * Two calls in the same process is the whole point: the bug is only observable when the
 * first call's failure survives into the second.
 */
async function resolveTwice(binDir: string, env: Record<string, string>): Promise<[unknown, unknown]> {
	const proc = Bun.spawn({
		cmd: [
			process.execPath,
			"--eval",
			`import { resolveTmuxClientTerminalName } from "@oh-my-pi/pi-tui/tmux";
const first = resolveTmuxClientTerminalName();
const second = resolveTmuxClientTerminalName();
console.log(JSON.stringify([first, second]));`,
		],
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode !== 0) throw new Error(`child failed (${exitCode}): ${stderr}`);
	return JSON.parse(stdout.trim()) as [unknown, unknown];
}

/** Write an executable stand-in for `tmux` and return its directory. */
async function fakeTmux(script: string): Promise<string> {
	const binDir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-tmux-retry-"));
	await Bun.write(path.join(binDir, "tmux"), script);
	await fs.chmod(path.join(binDir, "tmux"), 0o755);
	return binDir;
}

describe.skipIf(process.platform === "win32")("tmux client terminal retry after a slow query", () => {
	it("retries after the time budget fires instead of caching the failure", async () => {
		// Answers correctly, but only after sleeping past the 500ms budget the first time.
		// The retry is what makes the difference observable: a cache that stored the
		// timeout would report null twice.
		const binDir = await fakeTmux(`#!/bin/sh
if [ ! -f "$MARKER" ]; then
  : > "$MARKER"
  sleep 2
fi
printf "%s\\n" "WezTerm 20260905-175422-0f4b5596"
`);
		try {
			const env = childEnv(binDir);
			env.MARKER = path.join(binDir, "answered");
			const [first, second] = await resolveTwice(binDir, env);

			// The slow call yields nothing yet — and crucially, not a cached "no terminal".
			expect(first).toBeNull();
			// The retry is where the fix shows: the same process, minutes of TUI uptime
			// later, recovers the real name instead of being stuck with the timeout.
			expect(second).toBe("WezTerm");
		} finally {
			await fs.rm(binDir, { recursive: true, force: true });
		}
	});

	it("still caches a real answer, so the query does not run twice when tmux is healthy", async () => {
		// The counter is the contract: caching exists to keep this at one spawn. If a fix
		// over-corrected into "never cache", this turns red.
		const binDir = await fakeTmux(`#!/bin/sh
echo x >> "$COUNTER"
printf "%s\\n" "screen-256color"
`);
		try {
			const env = childEnv(binDir);
			env.COUNTER = path.join(binDir, "calls");
			const [first, second] = await resolveTwice(binDir, env);

			expect(first).toBe("screen-256color");
			expect(second).toBe("screen-256color");
			const calls = await Bun.file(env.COUNTER).text();
			expect(calls.trim().split("\n")).toHaveLength(1);
		} finally {
			await fs.rm(binDir, { recursive: true, force: true });
		}
	});

	it("treats tmux exiting non-zero as an answer rather than an unknown", async () => {
		// The discriminator the fix relies on: a refusal from tmux is a refusal, not a
		// timeout, so it is cached and the query is not retried.
		const binDir = await fakeTmux(`#!/bin/sh
echo x >> "$COUNTER"
exit 1
`);
		try {
			const env = childEnv(binDir);
			env.COUNTER = path.join(binDir, "calls");
			const [first, second] = await resolveTwice(binDir, env);

			expect(first).toBeNull();
			expect(second).toBeNull();
			const calls = await Bun.file(env.COUNTER).text();
			expect(calls.trim().split("\n")).toHaveLength(1);
		} finally {
			await fs.rm(binDir, { recursive: true, force: true });
		}
	});
});
