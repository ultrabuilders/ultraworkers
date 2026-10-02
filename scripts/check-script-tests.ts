/**
 * The gate: every `scripts/*.test.ts` is classified, and the classification is
 * true of the tree it runs in.
 *
 * Run by `bun run test:scripts`, so it cannot be routed around: the runner
 * consults the same manifest this does, and both fail together. A gate in a
 * separate job is a gate that can disagree with the thing it guards.
 *
 * The failure mode is one-directional in practice and it is the flattering one.
 * Writing a test for a script is progress-shaped, so it is easy to commit a green
 * test that no CI job ever loads — which is exactly what had happened here for
 * nine files. So this fails on an UNCLASSIFIED test before it fails on anything
 * else, and it prints the offending filenames rather than a count, because the
 * person who has to act is the one who just added the file.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { classifyScriptTests } from "./script-test-manifest";

const PREFIX = "[script-tests]";

/**
 * The extensions a script test may use, and so the ones this gate collects.
 *
 * This set IS the gate's domain, so it is deliberately wider than what exists
 * today. A collector narrowed to the extensions currently on disk makes every
 * other extension structurally invisible — the same blind spot as no gate at
 * all. `.mjs` was the live instance: nine gate tests ran nowhere because this
 * filter never selected them, and nothing reported it.
 *
 * The DIRECTORY axis had the same shape and was still open. A collector that
 * reads only the top level makes every subdirectory structurally invisible, and
 * `scripts/rename/` held six of them — the tests guarding the rename sweep
 * itself, including `check-runtime-rename.test.ts`. So the walk below is
 * recursive for the same reason `TEST_EXTENSIONS` is wider than what exists
 * today: a gate's domain is what it collects, not what happens to be on disk.
 *
 * `1814e9fbad` closed the extension axis and `df7e28c00c` put a test on it;
 * this is the same debt along the other axis, which is why the history above
 * reads as a pattern rather than a one-off.
 *
 * Paths stay relative to `scriptsDir` and keep their subdirectory
 * (`rename/x.test.ts`), because `RUN` is keyed by exactly that string.
 */
const TEST_EXTENSIONS: readonly string[] = [".ts", ".mjs", ".cjs"];

/**
 * Every script test present on disk under `scriptsDir`, as `scriptsDir`-relative paths.
 *
 * The walk stops at dot-entries. `readdirSync` returns them unconditionally — unlike
 * `Bun.Glob` it has no `dot` option at all, so there is nothing to configure off — and a
 * dot-directory under `scripts/` holds content this repository does not own: a worktree,
 * a cache, a scratch checkout. Measured before this guard, with a positive control beside
 * the probe so both directions could fire, the gate reported BOTH `.dotprobe/leak.test.ts`
 * and `probecontrol/leak.test.ts` from an identical fixture — the dot-directory was reached,
 * and the unclassified-test failure it produced named a file no maintainer can act on.
 *
 * Blanket dot-skipping is the wrong rule *elsewhere* in this repository and is right here,
 * so the difference is measured rather than assumed. Five other gates deliberately do NOT
 * skip dot-directories, because the repository tracks 532 files under them and
 * `.omp/tools/tui.ts` is a gated TypeScript source: skipping there would silently delete
 * live coverage. Under `scripts/` the count is zero — `git ls-files scripts/` returns 165
 * files, none of them a dot-file or under a dot-directory, at any depth. So the skip costs
 * nothing measurable here.
 *
 * Zero today is a measurement, and a measurement rots. `check-script-tests.test.ts` asserts
 * that invariant against the index, so the first tracked file under `scripts/./` turns a
 * test red instead of quietly becoming invisible to this gate.
 */
function onDiskTestFiles(scriptsDir: string): string[] {
	const found: string[] = [];
	const walk = (dir: string, prefix: string): void => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith(".")) continue;
			const relPath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
			if (entry.isDirectory()) walk(path.join(dir, entry.name), relPath);
			else if (TEST_EXTENSIONS.some(ext => entry.name.endsWith(`.test${ext}`))) found.push(relPath);
		}
	};
	walk(scriptsDir, "");
	return found.sort();
}

export function checkScriptTests(scriptsDir: string): {
	ok: boolean;
	messages: string[];
	run: readonly string[];
} {
	const result = classifyScriptTests(onDiskTestFiles(scriptsDir));
	const messages: string[] = [];

	if (result.unclassified.length > 0) {
		messages.push(
			`${PREFIX} these test files are in neither RUN nor EXCLUDED, so nothing runs them:`,
			...result.unclassified.map(file => `  ${file}`),
			`${PREFIX} add each to RUN, or to EXCLUDED with a reason you have measured.`,
		);
	}
	if (result.stale.length > 0) {
		messages.push(
			`${PREFIX} these are classified but no longer exist on disk:`,
			...result.stale.map(file => `  ${file}`),
			`${PREFIX} remove them, or the gate reports on a file it can no longer run.`,
		);
	}
	if (result.duplicated.length > 0) {
		messages.push(`${PREFIX} these are listed more than once:`, ...result.duplicated.map(file => `  ${file}`));
	}
	if (result.misplaced.length > 0) {
		messages.push(
			`${PREFIX} these are excluded with no stated reason:`,
			...result.misplaced.map(file => `  ${file}`),
			`${PREFIX} an exclusion nobody argued for is a preference, not a decision.`,
		);
	}

	return { ok: messages.length === 0, messages, run: result.run };
}

async function main(): Promise<void> {
	const scriptsDir = path.join(import.meta.dir);
	const { ok, messages } = checkScriptTests(scriptsDir);
	for (const message of messages) console.error(message);
	if (!ok) process.exitCode = 1;
}

if (import.meta.main) await main();
