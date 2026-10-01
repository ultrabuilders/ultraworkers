/**
 * `omp` from source must actually run.
 *
 * `import.meta.main` is PER-MODULE, not per-process: it is true only for the module
 * Bun was handed on the command line. `cli-process-entry.ts` read its own, so it was
 * `false` in every source run of `cli.ts`, and `isProcessEntry` was constant false.
 *
 * That is not a hardening nuance, it is a dead CLI. `cli.ts` gates its entire entry
 * block on the flag, so `runCli` was never called and `omp --version`, `omp --help`
 * and every subcommand exited 0 having printed nothing — on stdout AND stderr, with
 * no diagnostic, because the reporter that would have named a stalled entry is itself
 * registered inside that same skipped block.
 *
 * Measured before the fix: `bun src/cli.ts --version` wrote 0 bytes to both streams
 * and exited 0. After: 20 bytes on stdout. Neighbouring suites caught this only as a
 * side effect (`usage-cli.test.ts`, `acp-stdout-hygiene.test.ts`), which is why it
 * survived — nothing asserted the entry itself.
 */
import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { APP_NAME, TempDir } from "@oh-my-pi/pi-utils";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

interface CliRun {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

async function runCli(args: string[]): Promise<CliRun> {
	using tempDir = TempDir.createSync("@omp-entry-");
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

describe("the CLI entry runs from source", () => {
	it("--version prints a version and says nothing on stderr", async () => {
		// The cheapest possible proof the entry block executed at all: if it did not,
		// the process exits 0 silently, which is indistinguishable from success to
		// every caller that checks only the exit code.
		const run = await runCli(["--version"]);

		expect(run.stdout).toMatch(/^\S+\/\d+\.\d+\.\d+\n$/);
		expect(run.stderr).toBe("");
		expect(run.exitCode).toBe(0);
	});

	it("--help prints usage", async () => {
		// A second, independent path through `run()`: help and version are separate
		// branches, so both being silent is the signature of a skipped entry rather
		// than of one broken branch.
		const run = await runCli(["--help"]);

		expect(run.stdout.length).toBeGreaterThan(0);
		expect(run.exitCode).toBe(0);
	});

	/**
	 * The command an installer actually puts on PATH. Read from the manifest rather
	 * than from `WIRE_NAME`: a hand-kept copy stays green after the binary it copies
	 * is renamed, which is one defect three times over in this repo (55's
	 * `BUNDLED_PACKAGES`, 63's `cacheKey`, and this). The manifest is the floor.
	 */
	async function invocableCommand(): Promise<string> {
		const manifest = (await Bun.file(path.join(repoRoot, "packages/coding-agent/package.json")).json()) as {
			bin: Record<string, string>;
		};
		const name = Object.keys(manifest.bin)[0];
		expect(name).toBeTruthy();
		return name;
	}

	it("prints the invocable command, not the brand, in a usage line", async () => {
		// Split from the banner row on purpose. With both assertions in one row, a
		// wrong brand kills the row and the usage line's correctness is never seen to
		// survive; two rows let a single wrong value move exactly one of them, which
		// is the whole evidence that the two roles are independent.
		const help = await runCli(["update", "--help"]);
		expect(help.stdout).toContain(`$ ${await invocableCommand()} update`);
	});

	it("prints examples naming the invocable command, not the brand", async () => {
		// `static examples` had no coverage at all, which is why it was still a
		// hand-written literal when the rebrand moved every rendered name at once.
		// Separate row from the usage line because the two are rendered by different
		// code — a fix that reached only `renderRootHelp` would leave this red.
		const help = await runCli(["update", "--help"]);
		expect(help.stdout).toContain(`${await invocableCommand()} update --canary`);
	});

	it("prints the brand, not the invocable command, on the version banner", async () => {
		// The banner is what the updater parses. `parseReportedVersion` accepts either
		// identity while the rename is in flight, so pinning the brand here is a
		// statement about intent, not a gate on today's value.
		const version = await runCli(["--version"]);
		expect(version.stdout.startsWith(`${APP_NAME}/`)).toBe(true);
	});

	it("a subcommand runs and reports through the same entry", async () => {
		// The nearest real subcommand with no network and no session: it proves the
		// gate is open for commands, not only for the two flags handled before them.
		const run = await runCli(["usage", "invalidate"]);

		expect(run.stdout).toContain("Invalidated cached usage reports");
		expect(run.stderr).toBe("");
		expect(run.exitCode).toBe(0);
	});
});
