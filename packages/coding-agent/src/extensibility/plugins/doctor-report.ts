/**
 * The ONE environment report, shared by every surface that prints one.
 *
 * ## Why this module exists
 *
 * Three surfaces answer "is this environment healthy": `ultraworkers doctor` (CLI),
 * `ultraworkers plugin doctor` (whose environment block), and the TUI's `/debug` menu.
 * The bead that asked for them was explicit about the failure they guard
 * against — split them and "each copy is green with itself": the plugin
 * report would keep its own denominator, the TUI would keep its own, and a
 * check that exists in one would silently not exist in the other. No test
 * written against a single copy can see that, because each copy is correct.
 *
 * So the split is prevented structurally. There is no per-surface formatter
 * left to drift: a surface calls {@link buildEnvironmentDoctorReport} and
 * prints what it returns. Adding a check changes all three at once, because
 * they all read the same collector.
 *
 * ## What is deliberately NOT here
 *
 * The colouring. `styles`/`icons` are a presentation decision, and the TUI
 * renders them through transcript components while the CLI writes plain lines
 * — so they stay parameters of {@link formatDoctorResults} rather than being
 * baked in here. What IS here is the default set, because building the same
 * five chalk wrappers in three files is the first step to a fourth copy of the
 * report that nobody notices diverging.
 *
 * The check *collection* (`runDoctorChecks`) stays in `doctor.ts`, which must
 * remain free of any rendering concern — that separation is what lets the TUI
 * and the CLI call one implementation.
 */
import chalk from "@oh-my-pi/pi-utils/chalk";
import { theme } from "@oh-my-pi/pi-tui/theme";
import {
	formatDoctorResults,
	type DoctorReport,
	type DoctorReportIcons,
	type DoctorReportStyles,
	runDoctorChecks,
} from "./doctor";

/** Heading the environment report prints on every surface. */
export const ENVIRONMENT_REPORT_HEADING = "Environment Health Check";

/**
 * Default styling: chalk for a terminal, theme status glyphs for the icons.
 *
 * Reads `theme` at CALL time, not at module load. `theme` is an uninitialised
 * singleton that only gains its tokens once something calls `setThemeInstance`,
 * so capturing `theme.status` at import time would freeze `undefined` into
 * every report — which renders as a missing glyph rather than an error.
 */
export function doctorPresentation(): { styles: DoctorReportStyles; icons: DoctorReportIcons } {
	return {
		styles: {
			heading: text => chalk.bold(text),
			ok: icon => chalk.green(icon),
			warning: icon => chalk.yellow(icon),
			error: icon => chalk.red(icon),
			dim: text => chalk.dim(text),
		},
		icons: {
			ok: theme.status.success,
			warning: theme.status.warning,
			error: theme.status.error,
			unavailable: "?",
			fixed: theme.nav.cursor,
		},
	};
}

/**
 * Run the environment checks and format them, for any surface.
 *
 * The returned `report.checks` is the SAME array `runDoctorChecks` produced, in
 * the same order — the formatter partitions it for display but does not
 * synthesise, drop, or reorder a check. That is what makes "both exits print
 * the same set of names" checkable against this function alone, rather than
 * against two independently-implemented surfaces that merely look alike.
 */
export async function buildEnvironmentDoctorReport(
	overrides: Partial<{ styles: DoctorReportStyles; icons: DoctorReportIcons }> = {},
): Promise<DoctorReport> {
	const defaults = doctorPresentation();
	const checks = await runDoctorChecks();
	return formatDoctorResults(checks, overrides.styles ?? defaults.styles, overrides.icons ?? defaults.icons, {
		heading: ENVIRONMENT_REPORT_HEADING,
	});
}
