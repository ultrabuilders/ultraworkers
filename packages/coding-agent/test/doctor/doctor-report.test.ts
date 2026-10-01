import { describe, expect, it } from "bun:test";
import {
	formatDoctorResults,
	type DoctorReportIcons,
	type DoctorReportStyles,
} from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";
import type { CheckOutcome } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/types";

/**
 * `formatDoctorResults`'s contract: the report it prints and the exit code it
 * implies.
 *
 * Styles are injected so a case can be read as plain text. The renderer this
 * replaces wrote through `chalk` and `console` directly, which meant the branch
 * that mattered — a `--fix` run, where `fixed` and `ok` overlap — was only
 * reachable from a live TTY. Both of the earlier renderers got that partition
 * wrong, in opposite directions, while every test stayed green.
 */

/** Identity styling: no colour, so assertions read against the raw text. */
const styles: DoctorReportStyles = {
	heading: text => text,
	ok: icon => icon,
	warning: icon => icon,
	error: icon => icon,
	dim: text => text,
};

const icons: DoctorReportIcons = { ok: "OK", warning: "WARN", error: "ERR", unavailable: "?", fixed: "*" };

const settled = (status: "ok" | "warning" | "error", fixed = false): CheckOutcome => ({
	name: `check:${status}${fixed ? ":fixed" : ""}`,
	status,
	message: "detail",
	fixed,
});

/** A check whose premise was missing — a distinct union member, not a status. */
const unavailable = (name: string, message: string): CheckOutcome => ({ status: "unavailable", name, message });

describe("formatDoctorResults", () => {
	it("exits clean and reports no errors when every check passed", () => {
		const report = formatDoctorResults([settled("ok"), settled("ok")], styles, icons);

		// The exit code is the point: a clean run must not fail a build.
		expect(report.errors).toBe(0);
		expect(report.counts).toEqual({ ok: 2, warning: 0, error: 0, fixed: 0, unavailable: 0 });
	});

	it("exits non-zero when a check reported an error, and says so in the summary", () => {
		const report = formatDoctorResults([settled("ok"), settled("error"), settled("warning")], styles, icons);

		expect(report.errors).toBe(1);
		expect(report.counts).toEqual({ ok: 1, warning: 1, error: 1, fixed: 0, unavailable: 0 });
		// A failing run has to tell the operator what to do about it.
		expect(report.lines.at(-1)).toBe("Run with --fix to attempt automatic repair");
	});

	it("omits the repair advice when nothing failed, so a clean run has no false alarm", () => {
		const report = formatDoctorResults([settled("warning")], styles, icons);

		expect(report.errors).toBe(0);
		expect(report.lines.some(line => line.includes("--fix"))).toBe(false);
	});

	// The partition. A `--fix` run really does emit `status: "ok", fixed: true`
	// when it restores an orphaned plugin, and the previous renderer counted that
	// check in both `ok` and `fixed`, so the summary named more checks than it
	// printed — but only on a run where something was fixed, which is exactly when
	// nobody reads the summary.
	it("counts a fixed check in exactly one bucket, so the buckets sum to the checks printed", () => {
		const checks = [settled("ok", true), settled("error", true), settled("warning"), settled("ok")];
		const report = formatDoctorResults(checks, styles, icons);

		const { ok, warning, error, fixed, unavailable } = report.counts;
		expect(ok + warning + error + fixed + unavailable).toBe(checks.length);
		// And the partition is not a relabelling: the fixed entries are not also ok.
		expect(ok).toBe(1);
		expect(fixed).toBe(2);
		// A repaired error no longer fails the run.
		expect(report.errors).toBe(0);
	});

	// A check whose premise was missing is not a pass. Folding it into `ok` made a
	// partial run indistinguishable from complete coverage.
	it("names checks that never ran instead of counting them as ok", () => {
		const report = formatDoctorResults([settled("ok"), unavailable("daemon", "never asked")], styles, icons);

		expect(report.counts).toEqual({ ok: 1, warning: 0, error: 0, fixed: 0, unavailable: 1 });
		// "never asked" must not read as "broken".
		expect(report.errors).toBe(0);
		expect(report.lines.some(line => line.includes("? daemon: never asked"))).toBe(true);
		expect(report.lines.some(line => line.includes("1 not checked"))).toBe(true);
	});

	it("renders one line per check plus the summary, so the counts are checkable by eye", () => {
		const checks = [settled("ok"), settled("warning"), unavailable("x", "m")];
		const report = formatDoctorResults(checks, styles, icons);

		// heading + blank + one line per check + blank + summary.
		expect(report.lines.length).toBe(checks.length + 4);
	});

	it("survives an empty run without inventing a pass", () => {
		const report = formatDoctorResults([], styles, icons);

		expect(report.errors).toBe(0);
		expect(report.counts).toEqual({ ok: 0, warning: 0, error: 0, fixed: 0, unavailable: 0 });
		// Nothing ran, so the summary must not read as a clean bill of health.
		expect(report.lines.some(line => line.includes("0 ok"))).toBe(true);
	});
});
