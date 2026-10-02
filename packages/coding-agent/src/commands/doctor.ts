/**
 * `omp doctor` — is this environment able to run the agent?
 *
 * The checks themselves live in `extensibility/plugins/doctor.ts` and are reached
 * through the same `runDoctorChecks` / `formatDoctorResults` pair that
 * `omp plugin doctor` uses. That sharing is the whole point: a second collection
 * would make "the doctor is healthy" mean two different things depending on which
 * command the user happened to type, and the exit code would be whichever copy
 * they did not run.
 *
 * Scope: this reports the ENVIRONMENT half — PATH, the log directory's mode, and
 * whether the registered themes and tools actually resolve. Plugin health is
 * `omp plugin doctor`, which additionally reports the plugin registry. The two
 * halves share no check name, so merging them here would restate a partition the
 * plugin report already draws.
 *
 * Exit code: 0 when nothing errored, 1 when at least one check did. The count
 * comes from the formatter rather than from a second pass over the checks here,
 * so the number in the summary and the number that decides the exit are the same
 * number by construction.
 */

import { Command } from "@oh-my-pi/pi-utils/cli";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { doctorHelp as commandHelp } from "../cli/command-help";
import { buildEnvironmentDoctorReport } from "../extensibility/plugins/doctor-report";

export default class Doctor extends Command {
	static description = commandHelp.description;

	async run(): Promise<void> {
		// `theme` is an uninitialised singleton (`export var theme: Theme`) that only
		// gains its tokens once something calls `setThemeInstance`. The report's
		// default icons read `theme.status`, so this must run first — and it must
		// run before the builder, which snapshots the glyphs at call time.
		await initTheme();

		// The shared builder, not a local `runDoctorChecks` + `formatDoctorResults`
		// pair. `omp plugin doctor` and the TUI's `/debug` entry print the report
		// this returns; a surface that collected its own checks would drift from
		// the other two while each stayed green against its own copy.
		const report = await buildEnvironmentDoctorReport();
		for (const line of report.lines) console.log(line);

		// A warning is not a failure. `omp doctor` answering 1 for a noisy-but-working
		// host is how a diagnostic command gets ignored in CI, and the exit code is
		// the only part of this output a script can read without parsing prose.
		if (report.errors > 0) process.exitCode = 1;
	}
}
