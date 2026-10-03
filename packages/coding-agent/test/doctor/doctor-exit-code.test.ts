/**
 * Criterion 2: a failing check means `exit 1`, a clean run means `exit 0` —
 * both halves, in one suite.
 *
 * Asserting only the clean half is the common way this gate gets written and it
 * is close to worthless: a command that always exits 0 passes it. The exit code
 * is also the only part of a diagnostic a script can read without parsing prose,
 * so "reports an error" and "exits 1" are two claims, and only the second one
 * reaches CI.
 *
 * The error half needs a host that is genuinely unhealthy. A fresh scratch
 * project with a `patches/` directory whose contents disagree with
 * `package.json.patchedDependencies` is that: `checkPatchLedger` reports
 * `status: "error"` on drift, so this is the real answer and not a stubbed one.
 * An empty scratch directory cannot produce it — with no `patches/` the check
 * is `unavailable`, not `error`, which is a third state and exits 0.
 *
 * The exit code is read from the child process itself with no pipe in between.
 * `$?` after a pipeline is the LAST command's status, so measuring a doctor's
 * exit through `| grep` reports grep's verdict — which is how a suite ends up
 * asserting that a red diagnostic exits 0.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const repoRoot = path.resolve(import.meta.dir, "../../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

interface CliRun {
	readonly exitCode: number;
	readonly stdout: string;
}

/**
 * Where XDG expects the app's data root.
 *
 * The variable alone is not enough: `resolveIf` in `dirs.ts` only accepts an XDG
 * root when the app-prefixed path under it already exists, and XDG flattens that
 * prefix — `$XDG_DATA_HOME/ultraworkers/plugins`, not `$XDG_DATA_HOME/plugins`.
 * With the directory absent the resolver falls back to the config root and the
 * doctor's `plugins_directory` line keeps naming the developer's real one.
 */
const XDG_APP_DIR = "ultraworkers";

async function runPluginDoctor(cwd: string): Promise<CliRun> {
	using dataDir = TempDir.createSync("@ultraworkers-doctor-data-");
	// `node_modules` is what decides whether this run can be clean at all: the check
	// is `error` (not `warning`) whenever a plugins `package.json` exists without
	// one, and it reads the developer's real plugins dir unless XDG moves it. So
	// the fixture builds the directory the healthy case needs, rather than asserting
	// an outcome that depends on what happens to be installed on the host.
	//
	// PI_CODING_AGENT_DIR is deliberately NOT set. It was here to isolate the run,
	// but it does not move the plugins dir — and it is worse than inert, because
	// `DirResolver` only takes the XDG branch when `agentDir` is still the default,
	// so setting it disables the one variable that does work. Measured, all three:
	//
	//   PI_CODING_AGENT_DIR only           → Found at /Users/<me>/.omp/plugins
	//   PI_CODING_AGENT_DIR + XDG_DATA_HOME→ Found at /Users/<me>/.omp/plugins
	//   XDG_DATA_HOME alone, no app dir     → Found at /Users/<me>/.omp/plugins
	//   XDG_DATA_HOME + app dir + node_modules → Found at <temp>/ultraworkers/plugins
	await fs.mkdir(path.join(dataDir.path(), XDG_APP_DIR, "plugins", "node_modules"), { recursive: true });
	const proc = Bun.spawn([process.execPath, cliEntry, "plugin", "doctor"], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		stdin: "ignore",
		env: { ...process.env, NO_COLOR: "1", XDG_DATA_HOME: dataDir.path() },
	});
	const [stdout, , exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stdout };
}

/**
 * `patchedDependencies` maps a package SPEC to the patch that modifies it, so
 * the values are paths. Writing it the other way round — path as key, version as
 * value — makes the ledger check compare a version string against the filesystem
 * and report drift for a perfectly healthy project.
 */
async function driftedProject(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-doctor-drift-"));
	await fs.mkdir(path.join(dir, "patches"), { recursive: true });
	// Declares a patch that does not exist, and ships one nothing declares.
	await Bun.write(
		path.join(dir, "package.json"),
		JSON.stringify({ name: "drift", patchedDependencies: { "dep@1.0.0": "patches/absent.patch" } }),
	);
	await Bun.write(path.join(dir, "patches", "rogue.patch"), "undeclared\n");
	return dir;
}

/** A project whose ledger is consistent — declared and present. */
async function healthyProject(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-doctor-ok-"));
	await fs.mkdir(path.join(dir, "patches"), { recursive: true });
	await Bun.write(
		path.join(dir, "package.json"),
		JSON.stringify({ name: "ok", patchedDependencies: { "dep@1.0.0": "patches/declared.patch" } }),
	);
	await Bun.write(path.join(dir, "patches", "declared.patch"), "applied\n");
	return dir;
}

describe("doctor exit code", () => {
	it("exits 1 when a check reports an error", async () => {
		const dir = await driftedProject();
		try {
			const run = await runPluginDoctor(dir);

			console.error(
				"[doctor:exit] code=%d checks=%s",
				run.exitCode,
				run.stdout.match(/Summary:.*/)?.[0] ?? "(none)",
			);
			if (run.exitCode !== 1) console.error("[doctor:exit] full output:\n%s", run.stdout);

			// The error is named, not just counted: a count alone could come from a
			// different check than the one this fixture broke.
			expect(run.stdout).toContain("patch_ledger");
			expect(run.exitCode).toBe(1);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	}, 120_000);

	it("exits 0 when every check it could run passed", async () => {
		const dir = await healthyProject();
		try {
			const run = await runPluginDoctor(dir);

			console.error(
				"[doctor:exit] code=%d checks=%s",
				run.exitCode,
				run.stdout.match(/Summary:.*/)?.[0] ?? "(none)",
			);

			// Named too, so the pair proves the SAME check flipped and not that two
			// unrelated runs happened to differ.
			expect(run.stdout).toContain("patch_ledger");
			expect(run.stdout).not.toContain("undeclared");
			expect(run.exitCode).toBe(0);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	}, 120_000);
});
