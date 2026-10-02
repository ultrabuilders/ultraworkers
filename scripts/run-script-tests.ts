/**
 * Run the classified `scripts/*.test.ts`, refusing to run at all when the
 * classification is not true of this tree.
 *
 * The refusal is the point. A runner that quietly ran a stale list would report
 * "15 files, all green" while three of the tests on disk went unexecuted — and a
 * green run is exactly the signal someone trusts. So the gate runs first, by
 * importing the same `checkScriptTests` the standalone gate uses, and a
 * misclassification stops the run instead of shrinking it.
 */
import * as path from "node:path";
import { checkScriptTests } from "./check-script-tests";

const PREFIX = "[script-tests]";

async function main(): Promise<void> {
	const scriptsDir = import.meta.dir;
	const { ok, messages, run } = checkScriptTests(scriptsDir);
	for (const message of messages) console.error(message);
	if (!ok) {
		console.error(`${PREFIX} refusing to run: the manifest does not describe this tree.`);
		process.exit(1);
	}
	if (run.length === 0) {
		// A manifest that selects nothing is indistinguishable from one that ran
		// everything and found nothing to do. Both print a green result.
		console.error(`${PREFIX} nothing to run — the manifest selected no files.`);
		process.exit(1);
	}

	console.error(`${PREFIX} running ${run.length} script test file(s)`);
	// One runner, for both extensions. Bun executes `node:test` files natively, so
	// a second runner would add a PATH dependency and buy nothing; the `.mjs` tests
	// that were timing out under bun were carrying node:test's 5s *default* against
	// a repo walk that legitimately takes 12s, and that is fixed by declaring a
	// timeout on the test rather than by moving the file to another runner.
	const proc = Bun.spawn(["bun", "test", ...run.map(file => path.join(scriptsDir, file))], {
		cwd: path.join(scriptsDir, ".."),
		stdout: "inherit",
		stderr: "inherit",
		stdin: "ignore",
	});
	process.exitCode = await proc.exited;
}

if (import.meta.main) await main();
