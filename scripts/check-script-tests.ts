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

function onDiskTestFiles(scriptsDir: string): string[] {
	return fs
		.readdirSync(scriptsDir)
		.filter(name => name.endsWith(".test.ts"))
		.sort();
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
