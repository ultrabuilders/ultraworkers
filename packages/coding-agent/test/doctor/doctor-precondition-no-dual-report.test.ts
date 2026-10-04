/**
 * Case (2), the half that is easy to leave untested: a check whose premise is
 * missing must be reported ONCE, as unchecked — never also as green.
 *
 * `plugin-doctor-unavailable.test.ts` already pins that the ledger's outcome
 * counts as `unavailable` rather than `ok`, and that the summary accounts for
 * every printed line. Neither of those fails if the renderer emits BOTH an
 * `ok` line and a `not checked` line for the same check: the counts still
 * partition, because the outcome's status is unchanged by how many lines are
 * drawn from it.
 *
 * That double report is the failure this bead exists to prevent, and it is the
 * one a user cannot see past. A green tick beside "not checked" reads as
 * "covered" — the user believes the ledger was verified, then debugs the wrong
 * subsystem for an afternoon. The bead calls this out directly: assert BOTH
 * directions, because asserting only the warning lets silence pass, and
 * asserting only the absence lets a green line ride alongside it.
 *
 * Icons are given as distinct ASCII markers rather than theme glyphs so the
 * assertion reads the bucket a line was actually drawn into, not the colour it
 * was painted.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/manager";
import {
	formatDoctorResults,
	type DoctorReportIcons,
	type DoctorReportStyles,
} from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";
import { isUnavailable } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/types";

const styles: DoctorReportStyles = {
	heading: text => text,
	ok: icon => icon,
	warning: icon => icon,
	error: icon => icon,
	dim: text => text,
};

const icons: DoctorReportIcons = {
	ok: "<<OK>>",
	warning: "<<WARN>>",
	error: "<<ERR>>",
	unavailable: "<<SKIPPED>>",
	fixed: "*",
};

afterEach(async () => {
	const scratchDirs = (globalThis as { __doctorScratchDirs?: string[] }).__doctorScratchDirs ?? [];
	for (const dir of scratchDirs) await fs.rm(dir, { recursive: true, force: true });
	(globalThis as { __doctorScratchDirs?: string[] }).__doctorScratchDirs = [];
});

describe("a check with a missing premise is never also reported green", () => {
	test("an unmeasurable ledger produces one unchecked line, carrying no ok marker", async () => {
		const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-doctor-precondition-"));
		((globalThis as { __doctorScratchDirs?: string[] }).__doctorScratchDirs ??= []).push(scratch);

		// `scratch` has no `patches/` directory, so the premise is genuinely
		// missing — the repo checkout always has one, and a test run against it
		// could only ever watch this check pass.
		const outcomes = await new PluginManager(scratch).doctor();
		const ledger = outcomes.find(o => o.name === "patch_ledger");
		expect(ledger).toBeDefined();
		if (!isUnavailable(ledger!)) throw new Error(`expected an unmeasurable ledger, got status=${ledger!.status}`);

		const report = formatDoctorResults(outcomes, styles, icons, { heading: "Plugin Health Check" });
		const ledgerLines = report.lines.filter(line => line.includes("patch_ledger"));

		// Diagnostic on red: which lines exist, and with which markers.
		console.error("[doctor:precondition] checks=%o ledgerLines=%o", outcomes, ledgerLines);

		// Exactly one line. Two would mean the check was both drawn and skipped.
		expect(ledgerLines).toHaveLength(1);
		// And it is the unchecked rendering — the negative half. Without this,
		// a renderer that appended an `ok` line would still pass the length
		// assertion above, and the user would see a green tick beside the warning.
		expect(ledgerLines[0]).toContain("<<SKIPPED>>");
		expect(ledgerLines[0]).not.toContain("<<OK>>");

		// The summary must attribute the check to the unchecked bucket only, so
		// the count a reader trusts and the line they read cannot disagree.
		const summary = report.lines.find(line => line.startsWith("Summary:"));
		console.error("[doctor:precondition] summary=%o counts=%o", summary, report.counts);
		expect(summary).toBeDefined();
		expect(report.counts.unavailable).toBeGreaterThan(0);
		expect(
			report.counts.ok +
				report.counts.warning +
				report.counts.error +
				report.counts.fixed +
				report.counts.unavailable,
		).toBe(outcomes.length);
	});
});
