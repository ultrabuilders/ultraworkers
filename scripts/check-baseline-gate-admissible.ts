#!/usr/bin/env bun

/**
 * Fails when the grp-c baseline gate reports a verdict it did not earn.
 *
 * ## What this is for
 *
 * `epic-jwsy.14` asks for a gate falsifier: proof that a gate goes RED when a real
 * regression is present. A gate that has never been seen red is not a gate that is
 * passing — it is a gate nobody has watched fail, which is the same shape as the
 * `epic-jwsy.11` defect (a correct, tested, never-reached fence) one layer up.
 *
 * ## Why this gate, specifically
 *
 * `check-grp-c-test-baseline.ts` is the only gate in `check:ts` that abstains. It
 * prints `VOID` when HEAD moves while it measures, because it is a differential
 * against a fixed captured list and a corpus that changed mid-flight describes a
 * tree at no commit. Measured on this tree: HEAD went `11fdfe3e` → `1b48fe9` →
 * `2721d1be` across two runs, so both runs abstained.
 *
 * VOID is the right verdict and it must stay. So this gate does NOT weaken it into
 * a pass. It asserts the two things that make VOID safe:
 *
 * 1. **VOID is reported as an abstention, not as success.** A gate that abstained and
 *    exited 0 would be read by `check:ts`'s `&&` chain as having passed. That is the
 *    failure this fails on.
 * 2. **A confirmed regression IS red.** The gate's whole purpose, and the one claim
 *    nobody can read off a green run.
 *
 * ## What it does NOT do
 *
 * It does not re-implement the baseline gate and it does not run the test suite.
 * Running `check:ts` from here would recursively invoke this gate, and a
 * hand-copied comparator would drift from the real one — the census falsifier's
 * header names that exact hazard, which is why it parses the census's own report.
 *
 * Usage:
 *   bun scripts/check-baseline-gate-admissible.ts
 */

import { spawnSync } from "node:child_process";
import * as path from "node:path";

const REPO_ROOT = path.join(import.meta.dir, "..");
const BASELINE_GATE = path.join(import.meta.dir, "check-grp-c-test-baseline.ts");

/** The three verdicts the gate can reach, as its own output words them. */
export type GateVerdict = "green" | "void" | "new-failures" | "unknown";

export interface GateReport {
	readonly verdict: GateVerdict;
	readonly exitCode: number;
	/** Test names the gate called unconfirmed (load, not regression). */
	readonly unconfirmed: readonly string[];
	/** Test names the gate confirmed as new failures. */
	readonly confirmed: readonly string[];
	/** Test names the gate reported as newly passing. */
	readonly healed: readonly string[];
}

/**
 * Classify a baseline-gate run from its own stdout/stderr and exit code.
 *
 * Parsed rather than re-derived, for the reason in the header: this must report what
 * the gate actually said. A copy of its comparison would drift, and a drifted copy
 * would vouch for a gate that no longer behaves that way.
 *
 * The `+`/`~`/`-` prefixes are the gate's own row markers (`check-grp-c-test-baseline.ts`
 * prints confirmed as `  + `, unconfirmed as `  ~ `, healed as `  - `), so they are read
 * rather than reformatted here — one vocabulary, one place.
 */
export function parseGateReport(stdout: string, exitCode: number): GateReport {
	const output = `${stdout ?? ""}`;
	const rowNames = (prefix: string): string[] =>
		output
			.split("\n")
			.map(line => /^\s{2}([+~-])\s+(.*)$/.exec(line))
			.filter((match): match is RegExpExecArray => match !== null && match[1] === prefix)
			.map(match => (match[2] ?? "").trim())
			.filter(name => name.length > 0 && !name.startsWith("("));

	const voided = output.includes("baseline gate: VOID");
	// VOID prints a count and its names under `~`, prefixed by a sentence that is not a
	// name. New failures print `N NEW failure(s) not in the baseline`, which is the only
	// outcome that must be red.
	const newFailures = /baseline gate: \d+ NEW failure\(s\)/.test(output);

	let verdict: GateVerdict;
	if (newFailures) verdict = "new-failures";
	else if (voided) verdict = "void";
	else if (exitCode === 0) verdict = "green";
	else verdict = "unknown";

	return {
		verdict,
		exitCode,
		unconfirmed: rowNames("~"),
		confirmed: rowNames("+"),
		healed: rowNames("-"),
	};
}

export interface AdmissibilityDefect {
	readonly kind: "abstention-read-as-success" | "regression-not-red" | "unparseable";
	readonly detail: string;
}

/**
 * Whether a baseline-gate run is admissible evidence for "the gate works".
 *
 * An abstention is admissible when it is loud and non-zero: the reader and the `&&`
 * chain both have to be able to tell it apart from a pass. A green run is admissible —
 * but it is evidence the gate ran, NOT evidence it catches regressions, and this
 * function returns that distinction rather than letting a green imply both.
 */
export function judgeAdmissibility(report: GateReport): readonly AdmissibilityDefect[] {
	const defects: AdmissibilityDefect[] = [];
	switch (report.verdict) {
		case "void":
			// The defect this exists to catch: an abstention that exits 0 is silently a
			// pass to every `&&` chain above it, which is how "the gate never went red"
			// becomes "the gate is green".
			if (report.exitCode === 0) {
				defects.push({
					kind: "abstention-read-as-success",
					detail: "gate reported VOID but exited 0 — a reader cannot tell it from a pass",
				});
			}
			break;
		case "new-failures":
			// Confirmed new failures MUST be red. A gate that reports them and exits 0 is
			// the #87501 shape in a build script.
			if (report.exitCode === 0) {
				defects.push({
					kind: "regression-not-red",
					detail: `gate confirmed ${report.confirmed.length} new failure(s) but exited 0`,
				});
			}
			break;
		case "green":
			break;
		default:
			// Output shape changed. Failing is the safe direction: an unparseable gate
			// report is not evidence the gate works, and passing silently is how a
			// measurement stops being quotable while still being quoted.
			defects.push({
				kind: "unparseable",
				detail: `gate exited ${report.exitCode} and printed no recognisable verdict`,
			});
	}
	return defects;
}

/**
 * Run the baseline gate.
 *
 * `bun run check:test-baseline` rather than invoking the script directly, so the
 * falsifier exercises the SAME entry point `check:ts` uses. A gate proved under one
 * invocation and run under another is two gates.
 */
function runBaselineGate(): GateReport {
	const result = spawnSync("bun", ["run", "check:test-baseline"], {
		cwd: REPO_ROOT,
		encoding: "utf8",
	});
	if (result.error !== undefined) throw new Error(`could not run the baseline gate: ${result.error.message}`);
	// stderr carries the verdict lines as well as stdout on this gate, so both are read.
	const report = parseGateReport(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, result.status ?? 0);
	return report;
}

/**
 * The one-line verdict a caller sees, and what it is allowed to claim.
 *
 * Exported and separately tested because this string is the difference between "the gate ran"
 * and "the gate works", and the second claim is the one a green run cannot support. A caller
 * that renders it gets the distinction for free instead of having to remember it.
 */
export function verdictNote(report: GateReport): string {
	return report.verdict === "green"
		? "admissible as evidence it ran; NOT evidence it catches a regression (no injected defect in this run)"
		: `admissible abstention (exit=${report.exitCode}) — reported loudly, distinguishable from a pass`;
}

if (import.meta.main) {
	let report: GateReport;
	try {
		report = runBaselineGate();
	} catch (error) {
		process.stderr.write(`baseline-gate-admissible: ${error instanceof Error ? error.message : String(error)}\n`);
		process.exit(1);
	}

	const defects = judgeAdmissibility(report);
	if (defects.length > 0) {
		process.stderr.write(
			`baseline-gate-admissible: ${defects.length} inadmissible verdict(s) from the baseline gate ` +
				`(verdict=${report.verdict}, exit=${report.exitCode}):\n` +
				`${defects.map(d => `  - [${d.kind}] ${d.detail}`).join("\n")}\n\n` +
				"An abstention that exits 0 is read as a pass by every `&&` chain above it, and a\n" +
				"confirmed regression that exits 0 is a gate that cannot fail. Neither is admissible.\n",
		);
		process.exit(1);
	}

	// The distinction this gate exists to keep, stated in its output rather than left to
	// the reader: a green run is not evidence the gate catches regressions.
	process.stdout.write(
		`baseline-gate-admissible: verdict=${report.verdict} — ${verdictNote(report)}\n` +
			`  unconfirmed(load)=${report.unconfirmed.length} confirmed=${report.confirmed.length} healed=${report.healed.length}\n` +
			`  baseline gate: ${path.relative(REPO_ROOT, BASELINE_GATE)}\n`,
	);
}
