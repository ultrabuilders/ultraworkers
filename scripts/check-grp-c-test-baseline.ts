#!/usr/bin/env bun
/**
 * R0 GRP-C — GATE. Fail only on test failures the captured baseline does not
 * already contain.
 *
 * WHY A BASELINE INSTEAD OF `bun test` PASSING
 * --------------------------------------------
 * `packages/coding-agent/test/` is not green at HEAD. There are pre-existing
 * failures around the MCP area, speculative compaction, and provider subagents.
 * That makes the obvious gate useless in both directions: running the suite and
 * requiring exit 0 is always red, and a permanently red gate gets switched off
 * within a day — at which point nothing is guarded at all.
 *
 * So the contract is narrower and is the one this gate can actually keep: a
 * merge step may not *add* a failure. Failures already in the baseline stay
 * tolerated until someone deletes them from the baseline file on purpose, which
 * forces the deletion to show up in a diff.
 *
 * IT MUST BE RED BOTH WAYS
 * ------------------------
 * 1. A failure absent from the baseline → red. That is the whole point.
 * 2. The baseline file missing or unreadable → red, NOT green. Treating "no
 *    baseline" as "nothing to tolerate" is what keeps (1) honest: otherwise
 *    deleting the baseline is a one-command way to silence every known failure,
 *    and the gate cannot tell that from a clean run.
 *
 * A gate that goes green when its own input is missing is not a gate — see the
 * related failure mode where a check regenerates the thing it diffs against.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";

const BASELINE = path.join(import.meta.dir, "r0-grp-c-test-baseline.json");

/** Per-session report directory — see the note at the write site. */
const REPORT_DIR = `${tmpdir()}/grp-c-test-baseline`;
const REPORT = `${REPORT_DIR}/${process.pid}-current.log`;
const SUITE = "packages/coding-agent/test/";

/** Print and exit. Returns `never` so call sites narrow correctly. */
function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

/** Run the suite and return the set of failing test names, or `null` if the run never measured. */
async function collectFailures(): Promise<Set<string> | null> {
	const proc = Bun.spawn(["bun", "test", SUITE], { stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout as ReadableStream<Uint8Array>).text(),
		new Response(proc.stderr as ReadableStream<Uint8Array>).text(),
	]);
	await proc.exited;
	// Keep the raw output: when this gate goes red, the next question is always
	// "what did it print", and re-running the suite to find out is expensive.
	//
	// Under a per-session directory, not a fixed `/tmp` name. This machine is
	// shared and other agents pick the same obvious filenames: a sibling run
	// truncated this exact file to 304 bytes mid-inspection, and a different
	// report came back as "981 bytes" while claiming 718 lines — impossible, so
	// the artifact was being rewritten underneath the measurement. A gate whose
	// own report can be clobbered cannot be diagnosed when it goes red.
	await fs.mkdir(REPORT_DIR, { recursive: true });
	await Bun.write(REPORT, `${stdout}${stderr}`);

	const failures = new Set<string>();
	// Parse BOTH streams, not just stdout. `bun test` writes its per-test
	// `(fail) <name>` lines to STDERR, so a stdout-only parse finds nothing and
	// the gate reports green on a suite with hundreds of failures. That is the
	// worst possible failure for this file: a gate that cannot fail.
	//
	// This was caught by running it, not by reading it. An empty baseline must
	// make every current failure appear as NEW; it reported zero and exit 0.
	//
	// The trailing `[12.30ms]` is bun's duration, not part of the name, and it
	// changes every run. Keying on it would report every baseline failure as
	// new forever, so it is stripped: the name is the stable contract, and file
	// paths move during a package reorganization where test names do not.
	const DURATION = /\s*\[\d+(?:\.\d+)?m?s\]$/;
	for (const line of `${stdout}\n${stderr}`.split("\n")) {
		const match = /^\(fail\)\s+(.*\S)\s*$/.exec(line);
		if (match) failures.add(match[1]!.replace(DURATION, ""));
	}

	// A run that found no failure but exited non-zero never measured anything.
	// The common cause is a suite that cannot load: `bun test` reports that as
	// `error:` plus a non-zero exit, never as a `(fail)` line, so the parse above
	// returns empty and the gate would call a broken suite clean — and then, in
	// the healed branch, tell the reader to delete their baseline entries. That
	// is fail-open *and* destructive, and it is the exact shape this file's own
	// header warns about for a missing baseline, one layer over.
	//
	// Measured, not reasoned: a suite with a bad import makes `bun test` exit 1
	// reporting `1 fail / 1 error`, and this gate reported green, exit 0, with
	// both baseline entries announced as healed. Fail closed instead.
	if (failures.size === 0 && proc.exitCode !== 0) return null;
	return failures;
}

interface Baseline {
	capturedAt: string;
	head: string;
	note: string;
	failures: string[];
}

const current = await collectFailures();

if (current === null) {
	console.error("grp-c baseline gate: the suite did not run to completion.");
	console.error(
		"No `(fail)` lines and a non-zero exit means the run produced no measurement —\n" +
			"most often a suite that cannot load, which `bun test` reports as an error rather\n" +
			"than a failure. Reporting that as green would call a broken suite clean and then\n" +
			"advise deleting baseline entries that are still real.",
	);
	fail(`\nbaseline: ${BASELINE}\nfull output: ${REPORT}`);
}

let baseline: Baseline | null = null;
try {
	baseline = (await Bun.file(BASELINE).json()) as Baseline;
} catch {
	baseline = null;
}

if (!baseline) {
	fail(
		`grp-c baseline gate: NO BASELINE at ${BASELINE}\n` +
			`The suite has ${current.size} failing test(s) at HEAD, so "no baseline" cannot mean "clean".\n` +
			`Restore the file, or capture a new one deliberately and review the diff.`,
	);
}

const known = new Set(baseline.failures);
const added = [...current].filter(name => !known.has(name)).sort();
const healed = [...known].filter(name => !current.has(name)).sort();

if (added.length > 0) {
	console.error(`grp-c baseline gate: ${added.length} NEW failure(s) not in the baseline:`);
	for (const name of added) console.error(`  + ${name}`);
	fail(`\nbaseline: ${BASELINE}\nfull output: ${REPORT}`);
}

if (healed.length > 0) {
	// Not red: healing is good news, and failing here would punish the fix. It is
	// reported because the baseline now claims failures that no longer happen,
	// which is how a baseline rots into tolerating a renamed test forever.
	console.log(`grp-c baseline gate: green. ${healed.length} baseline failure(s) now pass:`);
	for (const name of healed) console.log(`  - ${name}`);
	console.log("Drop them from the baseline in a follow-up commit.");
}

console.log(
	`grp-c baseline gate: green — ${current.size} failure(s), all present in the baseline ` +
		`(captured ${baseline.capturedAt}, HEAD ${baseline.head}).`,
);
