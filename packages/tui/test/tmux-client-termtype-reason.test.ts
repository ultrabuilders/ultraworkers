import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * A tmux client-terminal query has to be able to name the branch that produced its answer.
 *
 * `resolveTmuxClientTerminalName` returns a name or `null`, and `null` arrives from two
 * opposite places: a query killed by the 500ms budget, and tmux reporting that there is no
 * client type. One is worth retrying, the other is final, and a caller reading only the
 * value cannot tell them apart. `tmux-client-termtype-retry.test.ts` separates them by
 * timing two calls against each other, which works — but when it fails it reports a
 * difference in values, not which branch ran, and the values are identical by construction.
 *
 * These drive the reason through a real child process against a real stand-in `tmux`,
 * because the distinction lives in `Bun.spawnSync`'s exit code, which a mock cannot produce.
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

interface QueryResult {
	value: string | null;
	reason: string;
	elapsedMs: number;
}

/**
 * Resolve `times` times in one child process and report each result.
 *
 * Several calls share one process on purpose: the cache is module-level, so a second call is
 * the only way to see what a cached outcome reports. Timing is taken inside the child, on
 * the same clock the code runs on.
 */
async function resolveInChild(binDir: string, env: Record<string, string>, times: number): Promise<QueryResult[]> {
	const proc = Bun.spawn({
		cmd: [
			process.execPath,
			"--eval",
			`import { resolveTmuxClientTerminalNameWithReason } from "@oh-my-pi/pi-tui/tmux";
const results = [];
for (let i = 0; i < ${times}; i++) {
  const startedAt = performance.now();
  const { value, reason } = resolveTmuxClientTerminalNameWithReason();
  results.push({ value, reason, elapsedMs: Math.round(performance.now() - startedAt) });
}
console.log(JSON.stringify(results));`,
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
	return JSON.parse(stdout.trim()) as QueryResult[];
}

/** Write an executable stand-in for `tmux` and return its directory. */
async function fakeTmux(script: string): Promise<string> {
	const binDir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-tmux-reason-"));
	await Bun.write(path.join(binDir, "tmux"), script);
	await fs.chmod(path.join(binDir, "tmux"), 0o755);
	return binDir;
}

describe.skipIf(process.platform === "win32")("tmux client terminal query reason", () => {
	it("names every branch, including the two that both end in a bare null", async () => {
		// One test, three branches, for the reason `terminal-capabilities.test.ts` gives:
		// split across cases, a failure says only that some value differed, and on a run this
		// rare whatever is not printed is lost. Run sequentially too — the timeout case is
		// decided by a wall-clock budget, so adding parallel load here would measure the
		// harness instead of the code.
		const answering = await fakeTmux(`#!/bin/sh
printf "%s\\n" "WezTerm 20260905-175422-0f4b5596"
`);
		const refusing = await fakeTmux(`#!/bin/sh
exit 1
`);
		const stalling = await fakeTmux(`#!/bin/sh
sleep 2
printf "%s\\n" "WezTerm 20260905-175422-0f4b5596"
`);
		try {
			const ok = await resolveInChild(answering, childEnv(answering), 1);
			// Asked twice: a cached outcome must not relabel itself. If the cache stored a
			// refusal under any other reason, a busy machine and a terminal that is not there
			// would become indistinguishable again — the exact defect this reason exists to
			// remove, reintroduced one layer up.
			const notFound = await resolveInChild(refusing, childEnv(refusing), 2);
			const timeout = await resolveInChild(stalling, childEnv(stalling), 1);

			// `elapsedMs` is carried but matched loosely and deliberately: a duration cannot
			// separate these branches, since the refusal and the timeout both cost time and
			// both end in a null. The reason code is the discriminator, so the reason is
			// what gets asserted.
			expect(ok).toEqual([{ value: "WezTerm", reason: "ok", elapsedMs: expect.any(Number) }]);
			expect(timeout).toEqual([{ value: null, reason: "timeout", elapsedMs: expect.any(Number) }]);
			expect(notFound).toEqual([
				{ value: null, reason: "not-found", elapsedMs: expect.any(Number) },
				{ value: null, reason: "not-found", elapsedMs: expect.any(Number) },
			]);
		} finally {
			for (const dir of [answering, refusing, stalling]) {
				await fs.rm(dir, { recursive: true, force: true });
			}
		}
	});
});
