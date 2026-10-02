/**
 * Case (1): both exits report the SAME check set, in the SAME order.
 *
 * This is the case the bead calls mandatory-first, and it guards a failure no
 * single-surface test can see. `/debug` and `ultraworkers doctor` each used to be free to
 * collect their own checks; each copy would have been correct against itself, so
 * every test written against one of them stayed green while the two drifted. A
 * check added to one would be invisible to a user of the other, and the doctor
 * would report a healthy environment from a half-empty check list.
 *
 * The assertion is deliberately made across TWO surfaces rather than twice
 * against one. Naming both — the real CLI process and the shared builder the TUI
 * entry prints — is what makes drift detectable: if `ultraworkers doctor` grew its own
 * collection path, its stdout would stop matching the builder's lines and this
 * goes red.
 *
 * Scope, stated honestly: the TUI's `/debug` menu is not driven end-to-end here,
 * because that needs a live terminal. What is pinned is that the report it
 * renders is the builder's report, and that the builder and the real CLI agree.
 * The remaining hop — `DebugSelectorComponent` calling the builder — is a wiring
 * fact, not a behaviour one.
 */
import { describe, expect, it, beforeAll } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { runDoctorChecks } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";
import { buildEnvironmentDoctorReport } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor-report";

// Four levels, not three: this file sits in `test/doctor/`, so `../../..` lands
// on `packages/` and yields a `packages/packages/...` entry that spawns nothing.
// The sibling CLI test in `test/` needs three — the depth is a property of THIS
// file's location, so it gets its own constant rather than a shared one.
const repoRoot = path.resolve(import.meta.dir, "../../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

// `theme` is an uninitialised singleton that only gains its tokens once something
// calls `setThemeInstance`; the builder reads `theme.status` for its icons. The
// CLI inits it and the TUI has it live, so without this line the builder throws
// `undefined is not an object` in exactly the process that is supposed to prove
// the two exits agree.
beforeAll(async () => {
	await initTheme();
});

/** Check names, in report order, as they appear in the printed lines. */
function namesFromLines(lines: readonly string[]): string[] {
	const found: string[] = [];
	for (const line of lines) {
		for (const name of NAMES_IN_COLLECTOR) {
			// Each line carries exactly one check name; `includes` is enough because
			// the collector's names are unique and no name is a substring of another.
			if (line.includes(name) && !found.includes(name)) found.push(name);
		}
	}
	return found;
}

let NAMES_IN_COLLECTOR: string[] = [];

describe("doctor exit parity", () => {
	it("the builder reports every collected check, in the collector's order", async () => {
		const checks = await runDoctorChecks();
		NAMES_IN_COLLECTOR = checks.map(check => check.name);

		const report = await buildEnvironmentDoctorReport();
		const reported = namesFromLines(report.lines);

		// Logged in full on failure: the bead is explicit that this gate is
		// useless if a red run does not say which side gained or lost a check.
		console.error("[doctor:parity] collected=%o reported=%o", NAMES_IN_COLLECTOR, reported);

		expect(NAMES_IN_COLLECTOR.length).toBeGreaterThan(0);
		expect(reported).toEqual(NAMES_IN_COLLECTOR);
	});

	it("the real `omp doctor` process prints the same checks in the same order", async () => {
		// A separate call from the row above so the collector is re-read: if the
		// builder only matched because both sides shared one cached array, this
		// would still hold, but the CLI comparison below is what actually proves
		// the shipped surface prints them.
		await runDoctorChecks();
		const expected = NAMES_IN_COLLECTOR;
		expect(expected.length).toBeGreaterThan(0);

		using tempDir = TempDir.createSync("@omp-doctor-parity-");
		const proc = Bun.spawn([process.execPath, cliEntry, "doctor"], {
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
			env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempDir.path() },
		});
		const [stdout] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
		const fromCli = namesFromLines(stdout.split("\n"));

		console.error("[doctor:parity] builder=%o cli=%o", expected, fromCli);

		expect(fromCli).toEqual(expected);
	}, 120_000);
});
