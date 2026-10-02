#!/usr/bin/env bun

/**
 * Extract failing-test identities from CI job logs.
 *
 * Ported from `../gajae-ref/scripts/ci-failure-extract.ts` rather than written
 * here, for the reason that file gives for existing at all: a hand-rolled
 * extractor recovered an identity from only 54 of 1,068 failing test jobs, and the
 * resulting "no identity extracted" bucket was read as "no test failed" — two
 * rounds of analysis sent the wrong way. This repo compares the SET of failing
 * names against a baseline on every bead, so a silently truncated list is the
 * expensive failure mode, not a cosmetic one.
 *
 * Two properties keep that from recurring, both inherited:
 *
 *   1. Runner log lines are prefixed with an ISO timestamp, so patterns match
 *      against the stripped line, never the raw one.
 *   2. Bun prints a `<n> fail` summary, and when it disagrees with the number of
 *      identities extracted, the caller is told rather than handed a short list.
 *
 * ## What this port adds
 *
 * The reference flags one direction only: the runner tallied MORE than was
 * extracted. The reverse — more named `(fail)` lines than the runner tallied, or
 * no tally at all to check against — was silent, and silent is what costs a
 * measurement round. Both are now reported (`discrepant`), because the way this
 * goes wrong in practice is a log where the `(fail)` lines came from an
 * invocation whose summary was never printed: the list looks complete and the
 * count cannot corroborate it.
 */

/** A single failing test recovered from a log. */
export interface ExtractedFailure {
	/** Test name exactly as the runner printed it, timing suffix removed. */
	identity: string;
	/** 1-based line number in the source log. */
	line: number;
}

export interface ExtractionResult {
	failures: ExtractedFailure[];
	/** Distinct identities, sorted. */
	identities: string[];
	/** `<n> fail` from the runner's own summary, or undefined when absent. */
	reportedFailCount?: number;
	/**
	 * `<n> error` from the runner's own summary. Bun counts suite-level errors
	 * (an uncaught exception between tests, a failed import) here rather than as
	 * a named `(fail)` line, so they legitimately have no identity to extract.
	 */
	reportedErrorCount?: number;
	/**
	 * True when the runner reported more failures than were extracted AND those
	 * failures are not accounted for by suite-level errors, i.e. the patterns are
	 * genuinely missing named output. Callers should fail closed on this.
	 */
	underCounted: boolean;
	/**
	 * The reverse of {@link underCounted}: more named `(fail)` lines than the
	 * runner tallied. Either the patterns over-match, or the log concatenates
	 * invocations whose summaries were lost — and in both cases the caller cannot
	 * treat `identities` as the complete set of what failed.
	 */
	overCounted: boolean;
	/**
	 * The question a caller actually has — "can I trust this list?" — as one
	 * boolean. True when either direction disagrees, and also when there is no
	 * summary to reconcile against while named failures exist, because a list that
	 * cannot be checked is not a list that can be trusted.
	 */
	discrepant: boolean;
}

/** Strips the GitHub Actions ISO-8601 timestamp prefix from a log line. */
const TIMESTAMP = /^\S+Z\s+/;

/**
 * `(fail) <name>` optionally followed by a `[12.34ms]` duration.
 * Anchored so prose merely quoting "(fail)" cannot match.
 */
const BUN_FAIL = /^\(fail\)\s+(.+?)(?:\s+\[[\d.]+\s*m?s\])?\s*$/;

/** Bun's tail summary, e.g. ` 6 fail`. */
const BUN_SUMMARY = /^\s*(\d+)\s+fail\b/;

/**
 * Bun's suite-level error tally, e.g. ` 1 error` or ` 2 errors`.
 *
 * Bun pluralises this one — unlike `fail`, which it never pluralises — so the
 * `s?` is load-bearing rather than cosmetic. With a bare `error\b` the boundary
 * sits between `r` and the `s` of `errors`, which are both word characters, so
 * the pattern silently stops matching the moment the count reaches two. That is
 * precisely the range where an error tally is worth reading: a run with one
 * suite-level error reconciles fine without it, and a run with two looks like it
 * has none at all.
 */
const BUN_ERROR_SUMMARY = /^\s*(\d+)\s+errors?\b/;

export function stripTimestamp(line: string): string {
	return line.replace(TIMESTAMP, "");
}

/**
 * Extracts failing-test identities from a raw CI job log.
 *
 * Accepts the log exactly as the GitHub API returns it — timestamp prefixes and
 * all — so callers cannot forget to normalise first.
 */
export function extractFailures(rawLog: string): ExtractionResult {
	const failures: ExtractedFailure[] = [];
	let reportedFailCount: number | undefined;
	let reportedErrorCount: number | undefined;

	const lines = rawLog.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = stripTimestamp(lines[i] ?? "");

		const fail = BUN_FAIL.exec(line);
		if (fail?.[1]) {
			failures.push({ identity: fail[1].trim(), line: i + 1 });
			continue;
		}

		const summary = BUN_SUMMARY.exec(line);
		if (summary?.[1]) {
			reportedFailCount = (reportedFailCount ?? 0) + Number(summary[1]);
		}

		const errors = BUN_ERROR_SUMMARY.exec(line);
		if (errors?.[1]) {
			reportedErrorCount = (reportedErrorCount ?? 0) + Number(errors[1]);
		}
	}

	const identities = [...new Set(failures.map(f => f.identity))].sort();

	// Compare against extracted failure lines. Identities are deduplicated for
	// reporting, but repeated failures across invocations still account for each
	// invocation's summary count.
	//
	// Suite-level errors are counted by the runner as failures but never print a
	// `(fail) <name>` line — there is no test to name when an import throws or an
	// exception escapes between tests. Allowing for them keeps the guard pointed
	// at genuine pattern gaps instead of firing on a shape it can never match.
	const accounted = reportedFailCount ?? 0;
	const unexplained = accounted - (reportedErrorCount ?? 0) - failures.length;
	const underCounted = reportedFailCount !== undefined && unexplained > 0;
	const overCounted = reportedFailCount !== undefined && unexplained < 0;
	// No summary at all: nothing to reconcile against, so an identity list here is
	// unfalsifiable. That is the case the reference let through silently, and it
	// is the one that looks most like a complete list.
	const unverifiable = reportedFailCount === undefined && failures.length > 0;

	return {
		failures,
		identities,
		reportedFailCount,
		reportedErrorCount,
		underCounted,
		overCounted,
		discrepant: underCounted || overCounted || unverifiable,
	};
}

if (import.meta.main) {
	const file = Bun.argv[2];
	if (!file) {
		console.error("usage: bun scripts/ci-failure-extract.ts <job-log-file>");
		process.exit(2);
	}
	const result = extractFailures(await Bun.file(file).text());
	// `JSON.stringify` drops an `undefined` property, so a log with no summary
	// would print JSON with `reportedFailCount` simply ABSENT — and a consumer
	// reading the file cannot tell "the runner printed no tally" from "this tool
	// has no such field". `null` says which one it is. The exported function keeps
	// `undefined`, because that is the faithful shape for a TypeScript caller.
	console.log(
		JSON.stringify(
			{
				...result,
				reportedFailCount: result.reportedFailCount ?? null,
				reportedErrorCount: result.reportedErrorCount ?? null,
			},
			null,
			2,
		),
	);
	// Fail closed so a regression in the patterns surfaces as a non-zero exit
	// rather than a quietly truncated list — in either direction, and including
	// the "there was nothing to check against" case.
	if (result.discrepant) {
		const direction =
			result.reportedFailCount === undefined
				? "no summary to reconcile against"
				: `unexplained ${result.reportedFailCount - (result.reportedErrorCount ?? 0) - result.failures.length}`;
		console.error(
			`discrepant (${direction}): runner tallied ${result.reportedFailCount ?? "?"} fail / ${result.reportedErrorCount ?? 0} error, extracted ${result.failures.length} lines naming ${result.identities.length} identities`,
		);
		process.exit(1);
	}
}
