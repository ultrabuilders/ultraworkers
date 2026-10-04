import { describe, expect, test } from "bun:test";
import * as path from "node:path";

/**
 * `ultraworkers images status|doctor|purge` must terminate.
 *
 * Every other test in this area injects `ImagesCliDependencies`, which is
 * precisely why this one is a child process: injection replaces every daemon
 * query, so an in-process test can never open the socket whose lifetime this
 * defends. The bug was invisible to the whole injected suite for that reason.
 *
 * The contract asserted is the one a user or a CI step observes — the process
 * goes away — rather than that a particular cleanup function was called.
 */

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");
// The CLI entrypoint, not `cli/images-cli.ts`: the latter is a module with no
// entry block, so running it directly produces no output and exits at once —
// a green test for a command that was never invoked.
const CLI_ENTRY = path.join(REPO_ROOT, "packages", "coding-agent", "src", "cli.ts");

/** Long enough that a healthy run is never mistaken for a hang, short enough to keep the suite quick. */
const EXIT_BUDGET_MS = 20_000;

interface RunOutcome {
	readonly terminated: boolean;
	readonly output: string;
}

/**
 * Run one images action in a child process and report whether it terminated
 * within the budget.
 *
 * Uses the real dependency defaults on purpose: injecting them is what let the
 * hang survive. A child that outlives the budget is killed and reported as
 * `terminated: false`, so the assertion fails on the hang itself rather than on
 * a test timeout that says nothing about which expectation broke.
 *
 * ## Why the pipes are read after the exit
 *
 * A test that goes red because the *harness* ran out of time is not evidence.
 * It looks identical in the log to a red that came from the assertion, and it
 * is red the same way whether the code is correct or not — so it teaches the
 * reader something false about the system. Two versions of this test were
 * useless in exactly that way: one spawned `cli/images-cli.ts` directly, which
 * is a module with no entry block and so printed nothing and exited at once
 * (a green gate over a command that was never invoked), and one awaited the
 * child's pipes alongside its exit, so a wedged process held the read open and
 * the whole case died on a suite timeout. Both failed for reasons that had
 * nothing to do with the hang. Awaiting the exit first, and only then draining
 * what the child left behind, is what makes a red here mean the process hung.
 */
async function runImagesAction(action: string): Promise<RunOutcome> {
	const child = Bun.spawn(["bun", CLI_ENTRY, "images", action, "--dir", REPO_ROOT], {
		cwd: REPO_ROOT,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, NO_COLOR: "1" },
	});

	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		child.kill("SIGKILL");
	}, EXIT_BUDGET_MS);

	await child.exited;
	clearTimeout(timer);

	// Read only after the child is gone: a wedged process can hold its pipes open
	// indefinitely, and awaiting them first is what turns a hang into a suite-level
	// timeout instead of a named failure.
	const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);

	return { terminated: !timedOut, output: `${stdout}${stderr}` };
}

describe("ultraworkers images terminates", () => {
	// Each action below opens a daemon socket through `liveBlobBrokerSocket`.
	// `probe` is absent deliberately: it short-circuits when no URL backend is
	// configured and so never reaches the daemon — a case that proves nothing
	// about the socket's lifetime.
	for (const action of ["status", "doctor", "purge"]) {
		test(
			`\`ultraworkers images ${action}\` exits instead of hanging after printing its report`,
			async () => {
				const result = await runImagesAction(action);

				// The hang happens *after* the report is complete, so both halves are
				// checked here rather than in a second run: a wedged terminal and a CI
				// job that never finishes are the same failure, and the full output
				// distinguishes "hung at the end" from "died before saying anything".
				expect(result.output.length).toBeGreaterThan(0);
				expect(result.terminated).toBe(true);
			},
			EXIT_BUDGET_MS + 15_000,
		);
	}
});
