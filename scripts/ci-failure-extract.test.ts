/**
 * Ported from `../gajae-ref/scripts/ci-failure-extract.test.ts`.
 *
 * Every case the reference pins is kept: they document the two defects that
 * cost real analysis time there (timestamp-prefixed lines defeating anchored
 * patterns, and a summary that disagrees with the extracted list), and dropping
 * them would make this port a rewrite wearing a port's clothes.
 *
 * Added here: the reverse direction. The reference flagged only "the runner
 * tallied more than we extracted", and stayed silent on "we extracted more than
 * the runner tallied" and on "there was no tally at all" — the two cases where
 * the list looks complete but cannot be corroborated. Those are asserted against
 * `discrepant`.
 */
import { describe, expect, test } from "bun:test";
import { extractFailures, stripTimestamp } from "./ci-failure-extract";

const TS = "2026-07-22T03:18:36.0557475Z ";

describe("stripTimestamp", () => {
	test("removes the runner's ISO prefix", () => {
		expect(stripTimestamp(`${TS}(fail) something`)).toBe("(fail) something");
	});

	test("leaves an unprefixed line untouched", () => {
		expect(stripTimestamp("(fail) something")).toBe("(fail) something");
	});
});

describe("extractFailures", () => {
	// The exact defect that caused ~5% recall: patterns were matched against the
	// raw line, so the timestamp prefix prevented every anchored match.
	test("extracts identities from timestamp-prefixed lines", () => {
		const log = [
			`${TS}(fail) AgentSession auto-compaction > starts a synthetic continuation [25.45ms]`,
			`${TS}(fail) AgentSession auto-compaction > discards the triggering agent_end`,
		].join("\n");

		const { identities } = extractFailures(log);

		expect(identities).toEqual([
			"AgentSession auto-compaction > discards the triggering agent_end",
			"AgentSession auto-compaction > starts a synthetic continuation",
		]);
	});

	test("strips the trailing duration but keeps names containing brackets", () => {
		const log = [
			`${TS}(fail) handles input [with brackets] in the name [1.20ms]`,
			`${TS}(fail) plain name [12s]`,
		].join("\n");

		expect(extractFailures(log).identities).toEqual(["handles input [with brackets] in the name", "plain name"]);
	});

	test("deduplicates an identity that fails more than once", () => {
		const log = [`${TS}(fail) flaky one [1ms]`, `${TS}(fail) flaky one [2ms]`].join("\n");

		const result = extractFailures(log);

		expect(result.failures).toHaveLength(2);
		expect(result.identities).toEqual(["flaky one"]);
	});

	test("records the runner's own fail count", () => {
		const log = [`${TS}(fail) a`, `${TS} 1 fail`, `${TS} 1761 pass`].join("\n");

		expect(extractFailures(log).reportedFailCount).toBe(1);
	});

	// The guard that makes silent under-counting impossible.
	test("flags under-counting when the summary exceeds what was extracted", () => {
		const log = [`${TS}(fail) only one recognised`, `${TS} 6 fail`].join("\n");

		const result = extractFailures(log);

		expect(result.underCounted).toBe(true);
		expect(result.reportedFailCount).toBe(6);
		expect(result.identities).toHaveLength(1);
		expect(result.discrepant).toBe(true);
	});

	test("aggregates multiple summary lines across timestamped invocations", () => {
		const log = [`${TS} 0 fail`, `${TS}(fail) one recognised`, `${TS} 2 fail`].join("\n");

		const result = extractFailures(log);

		expect(result.reportedFailCount).toBe(2);
		expect(result.underCounted).toBe(true);
		expect(result.identities).toEqual(["one recognised"]);
	});

	test("aggregates suite-level error summaries across invocations", () => {
		const log = [`${TS} 2 fail`, `${TS} 1 error`, `${TS} 1 error`].join("\n");

		const result = extractFailures(log);

		expect(result.reportedErrorCount).toBe(2);
		expect(result.underCounted).toBe(false);
	});

	test("reads a pluralised suite-level error tally", () => {
		// Bun writes `1 error` but `2 errors`, and never pluralises `fail`. A bare
		// `error\b` puts its word boundary between `r` and the `s`, so the pattern
		// stops matching the moment the count reaches two — the one range where the
		// tally matters, since a single suite-level error already reconciles without it.
		const log = [`${TS} 2 fail`, `${TS} 2 errors`].join("\n");

		const result = extractFailures(log);

		expect(result.reportedErrorCount).toBe(2);
		// 2 reported - 0 extracted - 2 errors = 0 unexplained. Reading the tally as
		// zero instead would leave a phantom shortfall of 2 and demand a fix that
		// the log does not support.
		expect(result.underCounted).toBe(false);
	});

	test("an absent error tally is read as zero rather than as unread", () => {
		// Deliberate, and pinned so it stays deliberate: bun prints `0 errors` on a
		// clean run, so a missing line means zero. The reconciliation subtracts this
		// value with `?? 0`, and treating "absent" as "unknown" there would turn the
		// gate permanently red on every clean run — a gate that is always red is not
		// a gate. If bun ever stops printing the line, this is the test that should
		// fail first, rather than a subtraction quietly changing its verdict.
		const log = [`${TS} 1 fail`].join("\n");

		const result = extractFailures(log);

		expect(result.reportedErrorCount).toBeUndefined();
		expect(result.underCounted).toBe(true);
	});

	test("does not treat a repeated failure identity as missing output", () => {
		const log = [`${TS}(fail) same test`, `${TS} 1 fail`, `${TS}(fail) same test`, `${TS} 1 fail`].join("\n");

		const result = extractFailures(log);

		expect(result.reportedFailCount).toBe(2);
		expect(result.failures).toHaveLength(2);
		expect(result.identities).toEqual(["same test"]);
		expect(result.underCounted).toBe(false);
	});

	test("does not flag under-counting when extraction agrees with the summary", () => {
		const log = [`${TS}(fail) a`, `${TS}(fail) b`, `${TS} 2 fail`].join("\n");

		expect(extractFailures(log).underCounted).toBe(false);
	});

	// A suite-level error (uncaught exception, failed import) is counted by the
	// runner as a failure but never prints a `(fail) <name>` line, because there
	// is no test to name.
	test("does not flag under-counting when the shortfall is suite-level errors", () => {
		const log = [`${TS} 10 pass`, `${TS} 1 fail`, `${TS} 1 error`].join("\n");

		const result = extractFailures(log);

		expect(result.reportedFailCount).toBe(1);
		expect(result.reportedErrorCount).toBe(1);
		expect(result.identities).toEqual([]);
		expect(result.underCounted).toBe(false);
	});

	test("still flags under-counting when errors do not explain the whole shortfall", () => {
		const log = [`${TS}(fail) one named`, `${TS} 5 fail`, `${TS} 1 error`].join("\n");

		// 5 reported - 1 extracted - 1 error = 3 unexplained.
		expect(extractFailures(log).underCounted).toBe(true);
	});

	// A test *named* after the marker must not be mistaken for a failure; this is
	// the false-positive direction of the same problem.
	test("ignores prose and passing lines that merely mention the marker", () => {
		const log = [
			`${TS}(pass) retries transient errors [40ms]`,
			`${TS}note: the runner prints (fail) for failures`,
			`${TS}(fail) genuinely failing test`,
		].join("\n");

		expect(extractFailures(log).identities).toEqual(["genuinely failing test"]);
	});

	test("returns an empty result for a log with no failures", () => {
		const result = extractFailures(`${TS} 1761 pass\n${TS} 0 fail`);

		expect(result.identities).toEqual([]);
		expect(result.underCounted).toBe(false);
	});

	test("reports the source line number for each failure", () => {
		const log = [`${TS}setup`, `${TS}(fail) second line`].join("\n");

		expect(extractFailures(log).failures[0]).toEqual({ identity: "second line", line: 2 });
	});
});

/**
 * The reverse direction, and the case with no cross-check at all.
 *
 * What a consumer observes if these regress: a comparison against a baseline
 * that reports "these tests stopped failing" from a log whose own numbers never
 * agreed with its `(fail)` lines. The list looks authoritative, the discrepancy
 * was invisible, and a real regression reads as a fix.
 */
describe("discrepancy in the direction the port adds", () => {
	test("flags MORE named failures than the runner tallied", () => {
		// Three named lines, runner says one: the tally cannot be describing these
		// lines, so `identities` is not the complete set the runner failed.
		const log = [`${TS}(fail) a`, `${TS}(fail) b`, `${TS}(fail) c`, `${TS} 1 fail`].join("\n");

		const result = extractFailures(log);

		expect(result.overCounted).toBe(true);
		expect(result.underCounted).toBe(false);
		expect(result.discrepant).toBe(true);
		expect(result.identities).toHaveLength(3);
	});

	test("flags a named failure when the log carries no summary to check it against", () => {
		// The shape this actually shows up in: a truncated or redirected log where
		// the `(fail)` lines survived and the tail summary did not. The reference
		// reported `underCounted: false` here, which reads as "fine".
		const result = extractFailures(`${TS}(fail) something failed`);

		expect(result.reportedFailCount).toBeUndefined();
		expect(result.underCounted).toBe(false);
		expect(result.discrepant).toBe(true);
	});

	test("a clean log with no summary at all stays clean", () => {
		// Nothing named, nothing to corroborate: not a discrepancy, or every
		// truncated log would be flagged and the flag would stop being read.
		const result = extractFailures(`${TS} 1761 pass\n${TS}Ran 1761 tests`);

		expect(result.identities).toEqual([]);
		expect(result.discrepant).toBe(false);
	});

	test("stays clean when both directions reconcile exactly", () => {
		const log = [`${TS}(fail) a`, `${TS}(fail) b`, `${TS} 2 fail`, `${TS} 0 error`].join("\n");

		const result = extractFailures(log);

		expect(result.underCounted).toBe(false);
		expect(result.overCounted).toBe(false);
		expect(result.discrepant).toBe(false);
	});

	test("counts suite-level errors as accounted-for in the over direction too", () => {
		// 1 named line + 1 error = the runner's 2 fail. Over-counting here would
		// fire on every log that has both, which is common and benign.
		const log = [`${TS}(fail) a`, `${TS} 2 fail`, `${TS} 1 error`].join("\n");

		const result = extractFailures(log);

		expect(result.overCounted).toBe(false);
		expect(result.discrepant).toBe(false);
	});
});
