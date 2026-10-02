import { describe, expect, it } from "bun:test";

/**
 * The host guard has to be able to say that it is still armed.
 *
 * `withHostGuard` fences `process.exit`, `process.reallyExit` and stdin while third-party
 * module code runs, and restores them in a `finally`. If a window is opened and never
 * closed — an abandoned continuation, which is something only a harness can produce — the
 * fence stays in place for the rest of the process and every later `withHostGuard` is a
 * no-op, because it sees a window already open. The process then keeps rejecting `exit`
 * for reasons unrelated to whatever it is actually doing, and nothing says so.
 *
 * These drive the real guard in a real child process rather than in this one. A test that
 * abandoned a window here would leave every file after it fenced — which is the hazard
 * this file exists to make visible, so it must not manufacture one in the suite that runs
 * it.
 */

interface GuardSnapshot {
	depth: number;
	exitGuarded: boolean;
	reallyExitGuarded: boolean;
}

interface GuardReport {
	atRest: GuardSnapshot;
	inside: GuardSnapshot;
	afterNormal: GuardSnapshot;
	afterAbandoned: GuardSnapshot;
}

/** Run one guard lifecycle in a child process and report what the guard said about itself. */
async function reportInChild(): Promise<GuardReport> {
	const proc = Bun.spawn({
		cmd: [
			process.execPath,
			"--eval",
			`import { hostGuardState, withHostGuard } from "@oh-my-pi/pi-coding-agent/extensibility/utils";
const snap = () => ({ ...hostGuardState() });
const atRest = snap();
let inside = null;
await withHostGuard(async () => { inside = snap(); });
const afterNormal = snap();
void withHostGuard(() => new Promise(() => {}));
await Bun.sleep(50);
const afterAbandoned = snap();
console.log(JSON.stringify({ atRest, inside, afterNormal, afterAbandoned }));`,
		],
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode !== 0) throw new Error(`child failed (${exitCode}): ${stderr}`);
	return JSON.parse(stdout.trim()) as GuardReport;
}

describe("host guard reports its own state", () => {
	it("fences while a window is open, restores when it closes, and admits when it never does", async () => {
		const report = await reportInChild();

		// Restoring is the contract that matters. If the `finally` stopped running, or the
		// depth stopped unwinding, this is the assertion that turns red — and it is the one
		// a caller depends on, because it is what makes the guard safe to nest.
		expect(report.atRest).toEqual({ depth: 0, exitGuarded: false, reallyExitGuarded: false });
		expect(report.inside).toEqual({ depth: 1, exitGuarded: true, reallyExitGuarded: true });
		expect(report.afterNormal).toEqual({ depth: 0, exitGuarded: false, reallyExitGuarded: false });

		// The abandoned window is a defect, and this does not pretend otherwise: the fence
		// is still up, and the guard says so. Reporting it is not the same as accepting it —
		// nothing here decides whether a leaked window should recover, only that it is no
		// longer indistinguishable from a healthy one.
		expect(report.afterAbandoned).toEqual({ depth: 1, exitGuarded: true, reallyExitGuarded: true });
	});
});
