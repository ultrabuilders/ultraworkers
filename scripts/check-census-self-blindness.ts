#!/usr/bin/env bun

/**
 * Fails when the docblock-claims census cannot see one of its own controls.
 *
 * `census-docblock-claims.ts` carries a control table: claims that are known to
 * exist, paired with whether the pattern can see them. A `confirmed` control the
 * pattern CANNOT see is not a neutral result — it means the census is blind to
 * the very evidence that would calibrate it, so its counts are not quotable. The
 * census prints that row and exits 0, which means nothing in CI notices: a
 * measurement that has quietly stopped covering its own evidence keeps being
 * quoted.
 *
 * So the blindness itself is what this gate asserts. The census script stays
 * the thing that measures; this only asks whether its answer is admissible.
 *
 * A `false-positive` control being invisible is the pattern WORKING (the
 * vocabulary caught prose that is not a repo claim), so it is not a failure.
 * Only `DEFECT` rows fail, and only for the case-sensitive variant — which is
 * the one a reader would otherwise quote unprompted.
 *
 * Usage:
 *   bun scripts/check-census-self-blindness.ts
 */

import { spawnSync } from "node:child_process";
import * as path from "node:path";

const REPO_ROOT = path.join(import.meta.dir, "..");
const CENSUS = path.join(import.meta.dir, "census-docblock-claims.ts");

/** One row of the census control table, parsed back out of its report. */
export interface ControlVisibilityRow {
	readonly variant: string;
	readonly kind: "confirmed" | "false-positive";
	readonly ref: string;
	readonly visible: boolean;
	/** False when the census scoped this control to other variants, so absence is the finding. */
	readonly required: boolean;
	/** True when a `confirmed` control is invisible to a variant that must see it. */
	readonly defect: boolean;
}

const CONTROL_ROW = /^\s*(case-\w+)\s+(confirmed|false-positive)\s+(\S+)\s+(visible|INVISIBLE)\s*(.*)$/;

/**
 * Pull the control rows out of a census report.
 *
 * Parsed rather than re-derived: re-measuring here would be a second
 * implementation of the census, and this gate must report what the census
 * actually said rather than what a copy of it says.
 */
export function parseControlVisibility(report: string): ControlVisibilityRow[] {
	const rows: ControlVisibilityRow[] = [];
	for (const line of report.split("\n")) {
		const match = CONTROL_ROW.exec(line);
		if (!match) continue;
		const [, variant, kind, ref, visibility, note] = match;
		const visible = visibility === "visible";
		// The census prints "not required of this variant" when a control is scoped to the
		// other variants. That row is the census working: it is the evidence the variants
		// disagree, and scoring it as blindness made the demonstration of the case-sensitive
		// scan's lossiness indistinguishable from the census itself being lossy.
		const required = !(note ?? "").includes("not required");
		rows.push({
			variant: variant ?? "",
			kind: kind as ControlVisibilityRow["kind"],
			ref: ref ?? "",
			visible,
			required,
			// Only a confirmed control going missing is a defect, and only from a variant
			// that must see it; an invisible false-positive is the pattern doing its job.
			defect: required && !visible && kind === "confirmed",
		});
	}
	return rows;
}

export interface BlindnessVerdict {
	readonly rows: readonly ControlVisibilityRow[];
	/** Confirmed controls the pattern cannot see, per variant. */
	readonly defects: readonly string[];
}

/** Which controls a census report fails on. */
export function judgeBlindness(rows: readonly ControlVisibilityRow[]): BlindnessVerdict {
	return { rows, defects: rows.filter(row => row.defect).map(row => `${row.variant} ${row.ref}`) };
}

function runCensus(): string {
	const result = spawnSync(process.execPath, [CENSUS], { cwd: REPO_ROOT, encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`census script exited ${result.status}: ${result.stderr || result.stdout}`);
	}
	// The census writes its report to stdout; stderr can carry unrelated notices.
	return `${result.stdout}${result.stderr}`;
}

if (import.meta.main) {
	const report = runCensus();
	const rows = parseControlVisibility(report);
	if (rows.length === 0) {
		process.stderr.write(
			"census-self-blindness: no control rows parsed. The census's output shape changed, so this gate cannot vouch for it — fail rather than pass silently.\n",
		);
		process.exit(1);
	}
	const { defects } = judgeBlindness(rows);
	if (defects.length > 0) {
		process.stderr.write(
			`census-self-blindness: ${defects.length} confirmed control(s) the census cannot see:\n` +
				`${defects.map(ref => `  - ${ref}`).join("\n")}\n\n` +
				"The census is blind to evidence that would calibrate it, so its counts are not quotable.\n" +
				"Widen the pattern's vocabulary so the cited line matches, then re-run.\n",
		);
		process.exit(1);
	}
	process.stdout.write(
		`census-self-blindness: ${rows.length} control row(s), all admissible — no confirmed control invisible.\n`,
	);
}
