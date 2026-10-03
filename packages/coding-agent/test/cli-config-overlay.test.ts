/**
 * `--config <path>` must apply to the commands that read settings.
 *
 * The flag is advertised globally — `--help` prints
 * `--config=<value>  Load an extra config.yml-style overlay for this run
 * (repeatable)` — and `docs/config-usage.md:172` documents it as
 * `ultraworkers --config <path>`, ahead of the command token. It reached exactly
 * one command. `Settings.init` reads `options.configFiles` (`settings.ts`), and
 * of the 19 call sites under `src/cli/` only `models` passed it; the rest fell
 * back to the environment variable, which meant the same overlay applied or did
 * not apply depending on which verb ran it.
 *
 * The failure mode is silence rather than an error: a missing overlay path, a
 * malformed one, an unreadable one — `--config` reported none of them, while
 * `PI_CONFIG_FILES` reported all three. A user who passed the flag had no way to
 * learn it was dropped.
 *
 * The assertion is a DIFFERENTIAL, not a literal. Asking for a hardcoded theme
 * name would pin whatever the default happens to be on this host and would go
 * red the day the default changes; asking whether the flag route agrees with the
 * environment route states the actual contract — one flag, one meaning — and
 * stays true if both learn a new setting.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

/** An overlay that changes a real, registered setting away from any default. */
const OVERLAY = "theme:\n  dark: overlay-applied\n";

type Run = { exitCode: number; stdout: string; stderr: string };

/**
 * Runs the CLI against a throwaway config root so the developer's own settings
 * are neither read nor written.
 */
async function runArgv(args: string[], env: Record<string, string> = {}): Promise<Run> {
	using tempDir = TempDir.createSync("@ultraworkers-config-overlay-");
	const proc = Bun.spawn([process.execPath, cliEntry, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		stdin: "ignore",
		env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempDir.path(), PI_CONFIG_FILES: "", ...env },
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stdout, stderr };
}

/** Write the overlay and hand back its path, for the rows that need one. */
function writeOverlay(): { path: string; dispose: () => void } {
	const dir = TempDir.createSync("@ultraworkers-config-overlay-file-");
	const overlayPath = path.join(dir.path(), "overlay.yml");
	fs.writeFileSync(overlayPath, OVERLAY);
	return { path: overlayPath, dispose: () => dir[Symbol.dispose]?.() };
}

/**
 * The three flag spellings reach the command by three different routes: the value
 * is the next token, it is inline after `=`, or it is parsed after the command
 * token. A stripper that handled only one would pass a single-flag test and drop
 * the other two in the field, so each is its own row.
 */
const FLAG_ROUTES = [
	{ name: "--config <path> before the command", args: (p: string) => ["--config", p, "config", "get", "theme.dark"] },
	{
		name: "--config=<path> before the command",
		args: (p: string) => [`--config=${p}`, "config", "get", "theme.dark"],
	},
	{
		name: "--config <path> after the command",
		args: (p: string) => ["config", "get", "theme.dark", "--config", p],
	},
] as const;

describe("a --config overlay reaches the commands that read settings", () => {
	for (const { name, args } of FLAG_ROUTES) {
		it(`applies the overlay given as ${name}, exactly as PI_CONFIG_FILES does`, async () => {
			const overlay = writeOverlay();
			try {
				// The control. If the environment route does not apply the overlay then
				// this host cannot run the comparison at all, and a matching pair below
				// would mean nothing — two equally broken routes agree with each other.
				const viaEnv = await runArgv(["config", "get", "theme.dark"], { PI_CONFIG_FILES: overlay.path });
				expect(viaEnv.stdout).toContain("overlay-applied");

				const viaFlag = await runArgv(args(overlay.path));

				// The regression, stated as the contract rather than as a literal: the flag
				// must reach the same value the environment variable already reached.
				expect(viaFlag.stdout).toContain("overlay-applied");
				expect(viaFlag.stdout.trim()).toBe(viaEnv.stdout.trim());
			} finally {
				overlay.dispose();
			}
		}, 120_000);
	}

	// The negative contract that decides the fix's shape. `--config` is a
	// launch-global flag, so `resolveCliArgv` REMOVES it from the argv a strict
	// subcommand parser sees (#8891) rather than forwarding it there — which means
	// a verb that declares no `--config` of its own must still run when one is
	// passed globally. Forwarding instead of stripping would turn every verb except
	// the two that declare the flag into an "unknown flag" crash, so this row fails
	// on the plausible wrong fix rather than only on the original bug.
	it("does not hand a global --config to a verb that never declared it", async () => {
		const overlay = writeOverlay();
		try {
			// `plugin` is chosen because it declares no `--config` flag of its own, so
			// the only thing that could put the token in front of its parser is the
			// runner. It runs offline and prints its own answer, which is what makes
			// "exited 0 because the verb ran" distinguishable from "exited 0 because
			// nothing happened" — the failure a forwarding fix produces.
			const result = await runArgv(["--config", overlay.path, "plugin", "list"]);
			expect(result.stderr).not.toContain("unknown flag");
			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim()).not.toBe("");
		} finally {
			overlay.dispose();
		}
	}, 120_000);
});
