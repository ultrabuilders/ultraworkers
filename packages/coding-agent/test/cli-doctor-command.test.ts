/**
 * `omp doctor` must reach the diagnostic, not the fallback.
 *
 * The command is one entry in `cli-commands.ts`, and that entry is the whole
 * safety property. A verb with no entry is not an error: `resolveCliArgv` hands
 * the argv to `runCli`, which forwards it to the model as a PROMPT. So the
 * failure mode of a missing `doctor` entry is a health check silently becoming a
 * chat message — which exits 0, prints something, and tells the user nothing
 * about their environment.
 *
 * The reserved-word hint is what stood in front of that before: `doctor` was
 * listed in `RESERVED_TOP_LEVEL_WORDS`, so `omp doctor` refused with "`omp
 * doctor` is not a top-level command" on stderr and exited 1. Measured against
 * that state, this suite fails 2/2 — the report is absent from stdout and the
 * exit code is 1.
 *
 * The assertions are therefore about stdout CONTENT, because the exit code alone
 * cannot tell the two states apart in the direction that matters: a verb that
 * falls all the way through to `runCli` exits 0 having printed nothing, and a
 * health check that ran also exits 0. Only the report's presence distinguishes
 * "diagnosed" from "did not look".
 */
import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

interface CliRun {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

async function runCli(args: string[]): Promise<CliRun> {
	using tempDir = TempDir.createSync("@ultraworkers-doctor-cmd-");
	const proc = Bun.spawn([process.execPath, cliEntry, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		stdin: "ignore",
		env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempDir.path() },
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stdout, stderr };
}

describe("omp doctor is a routed command", () => {
	it("prints the environment health check instead of the not-a-command hint", async () => {
		const run = await runCli(["doctor"]);

		// The report the shared formatter produces. Its absence is the regression:
		// without a registry entry this text never appears.
		expect(run.stdout).toContain("Environment Health Check");
		expect(run.stdout).toContain("Summary:");
		// The old behaviour, stated negatively so it cannot come back unnoticed.
		// It arrived on stderr, so the positive assertion above is the one that
		// carries the weight; this only pins that the refusal is gone entirely.
		expect(run.stdout).not.toContain("is not a top-level command");
		expect(run.stderr).toBe("");
	}, 120_000);

	it("exits 0 when nothing errored and 1 when a check did, decided by the formatter's count", async () => {
		const run = await runCli(["doctor"]);

		// This host is expected to be clean, so the exit code is 0. The branch that
		// matters for scripts — exit 1 on an error — cannot be produced from outside
		// the process, because the logger re-applies 0700 to the log directory on every
		// run and so the one environmental check that can error here never can. What
		// this pins is that the command READS the formatter's count rather than
		// inventing one: a host with zero errors exits 0, and the summary line above
		// reports the same partition the exit was derived from.
		expect(run.exitCode).toBe(0);
		const summary = run.stdout.split("\n").find(line => line.startsWith("Summary:"));
		expect(summary).toBeDefined();
		expect(summary).toContain("0 errors");
	}, 120_000);
});
