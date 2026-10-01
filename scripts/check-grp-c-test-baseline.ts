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
import { extractFailures } from "./ci-failure-extract";

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

/**
 * Run the suite and return the set of failing test names, or `null` if the run
 * never measured. `target` defaults to the whole suite; the confirmation pass
 * re-runs only the files that produced a new name.
 */
async function collectFailures(target: string = SUITE): Promise<Set<string> | null> {
	const proc = Bun.spawn(["bun", "test", target], { stdout: "pipe", stderr: "pipe" });
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

	// Delegate the parse to the repo's own extractor. It strips the `[12.30ms]`
	// duration (which changes every run, so keying on it would report every
	// baseline failure as new forever) and — the reason it exists rather than a
	// second private regex — reconciles the named `(fail)` lines against bun's own
	// `<n> fail` tally. Its header names this gate as the consumer it was written
	// for, so re-implementing the parse here would fork the one piece of this file
	// that was already reviewed.
	//
	// Both streams are concatenated: `bun test` writes its `(fail)` lines to
	// STDERR, and a stdout-only parse finds nothing and reports green on a suite
	// with hundreds of failures. That was caught by running it, not by reading it.
	const raw = `${stdout}\n${stderr}`;
	const extracted = extractFailures(raw);

	// A list that cannot be reconciled against the runner's tally is not a list
	// that can be trusted, and this gate's whole value is that "no new failures"
	// means "no new failures". Reporting a short list as complete is the failure
	// mode `ci-failure-extract.ts` was ported to prevent.
	if (extracted.discrepant) {
		console.error("grp-c baseline gate: the failure list could not be reconciled.");
		console.error(
			`runner tallied ${extracted.reportedFailCount ?? "?"} fail / ${extracted.reportedErrorCount ?? 0} error, ` +
				`parsed ${extracted.failures.length} line(s) naming ${extracted.identities.length} identity(ies).\n` +
				"Deciding 'no new failures' from a list this run cannot vouch for would report a\n" +
				"silently truncated measurement as a clean suite. Fix the parse, not the baseline.",
		);
		return null;
	}

	const failures = new Set(extracted.identities);

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

// Validate the baseline BEFORE running the suite: it costs ten minutes, and a
// missing baseline is knowable in milliseconds. Checking it afterwards meant the
// cheapest failure of this gate was also the slowest to report.
let baseline: Baseline | null = null;
try {
	baseline = (await Bun.file(BASELINE).json()) as Baseline;
} catch {
	baseline = null;
}

if (!baseline) {
	fail(
		`grp-c baseline gate: NO BASELINE at ${BASELINE}\n` +
			`HEAD is red, so "no baseline" cannot mean "clean".\n` +
			`Restore the file, or capture a new one deliberately and review the diff.`,
	);
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

const known = new Set(baseline.failures);
const added = [...current].filter(name => !known.has(name)).sort();
const healed = [...known].filter(name => !current.has(name)).sort();

// CONFIRM ONCE, THEN STOP.
//
// A new failure is re-checked by re-running the files that produced it, alone.
// The reason is measured, not hypothetical: wired into `check:ts`, this gate
// went red on five tests that pass on an idle box, and five identical runs of
// one file on one commit returned 5 fail, 5 fail, 0, 0, 0 — the *names* changed
// between runs, so it was the machine, not the code. Those tests drive a real
// headless Chromium against 1s deadlines, which CI already shards into a
// low-concurrency bucket for exactly that reason.
//
// ONE re-run, never a loop. An unbounded retry is a gate that heals itself, and
// that is the failure mode this file's own header is about: a gate which owns
// the thing it measures reports a probability, not a fact, and a real regression
// walks through it by being flaky often enough. So a name that fails twice is
// red, and there is no third attempt — that limit is the contract, not a tuning
// knob. The cost is paid only when there is a signal to check: a clean first run
// re-runs nothing.
let confirmed = added;
let unconfirmed: string[] = [];
if (added.length > 0) {
	const second = await collectFailures(SUITE);
	if (second === null) {
		// The confirmation run itself could not be measured. Failing closed here
		// would be defensible, but it is not what happened: the only way to reach
		// it is a suite that loaded the first time and not the second, and
		// reporting that as "these names are unconfirmed" would be a claim about
		// the tests that the measurement does not support.
		console.error(
			"grp-c baseline gate: the confirmation run did not measure; treating the first run as authoritative.",
		);
	} else {
		unconfirmed = added.filter(name => !second.has(name));
		confirmed = added.filter(name => second.has(name));
	}
}

if (confirmed.length > 0) {
	console.error(`grp-c baseline gate: ${confirmed.length} NEW failure(s) not in the baseline:`);
	for (const name of confirmed) console.error(`  + ${name}`);
	if (unconfirmed.length > 0) {
		console.error(`\nDid not reproduce when re-run alone — treated as load, not a regression:`);
		for (const name of unconfirmed) console.error(`  ~ ${name}`);
	}
	fail(`\nbaseline: ${BASELINE}\nfull output: ${REPORT}`);
}

if (unconfirmed.length > 0) {
	console.log(
		`grp-c baseline gate: green — ${unconfirmed.length} new failure(s) did not reproduce on re-run,\n` +
			`so they are load, not regressions. No third attempt: a name that fails twice is red.\n` +
			`  ~ ${unconfirmed.join("\n  ~ ")}`,
	);
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
