import { describe, expect, it } from "bun:test";
import { judgeBlindness, parseControlVisibility } from "./check-census-self-blindness";

/**
 * The contract: a confirmed control the census cannot see makes its counts
 * inadmissible, and must fail the gate rather than print a warning nobody reads.
 *
 * What a consumer observes is the verdict — fail or pass. So these assert on
 * `judgeBlindness`, not on the parser's internals: the parser only decides which
 * rows exist, and a test that pinned its regex would break on a harmless
 * reformat of the census's table while a census that went blind stayed green.
 */
describe("census self-blindness", () => {
	const report = [
		"CONTROL VISIBILITY — a pattern that cannot see its own control measures nothing",
		"  case-sensitive     confirmed       index.ts:888             visible   ok",
		"  case-sensitive     confirmed       interactive-mode.ts:5483 INVISIBLE DEFECT: census blind to its own control",
		"  case-sensitive     false-positive  fetch.ts:674             INVISIBLE ok",
		"  case-insensitive   confirmed       interactive-mode.ts:5483 visible   ok",
		"  case-insensitive   false-positive  acp-bridge.ts:110        visible   ok",
		"",
	].join("\n");

	it("fails when a confirmed control is invisible", () => {
		const verdict = judgeBlindness(parseControlVisibility(report));

		// The whole point: this is the row the live census reports today, and it
		// must be disqualifying rather than informational.
		expect(verdict.defects).toEqual(["case-sensitive interactive-mode.ts:5483"]);
	});

	it("passes when every confirmed control is visible, however the false-positives fell", () => {
		const allVisible = [
			"  case-sensitive     confirmed       index.ts:888            visible   ok",
			"  case-sensitive     false-positive  fetch.ts:674            visible   ok",
			"  case-insensitive   confirmed       interactive-mode.ts:1   visible   ok",
			"  case-insensitive   false-positive  fetch.ts:674            INVISIBLE ok",
		].join("\n");

		expect(judgeBlindness(parseControlVisibility(allVisible)).defects).toEqual([]);
	});

	it("treats an invisible false-positive as the pattern working, not a defect", () => {
		const verdict = judgeBlindness(parseControlVisibility(report));

		// The negative contract, and the one a naive `!visible` check gets wrong:
		// catching prose that is not a repo claim is the vocabulary WORKING.
		// Failing on it would push the census to match everything, blind included.
		const invisibleFalsePositives = verdict.rows.filter(row => !row.visible && row.kind === "false-positive");
		expect(invisibleFalsePositives.length).toBeGreaterThan(0);
		for (const row of invisibleFalsePositives) expect(row.defect).toBe(false);
	});

	it("reports no defect for a report it cannot parse at all, so an empty read is not a pass", () => {
		// Parsing nothing must be visibly empty rather than silently admissible —
		// otherwise a census whose output shape changes turns this gate into a
		// green light with nothing behind it.
		expect(judgeBlindness(parseControlVisibility("")).rows).toEqual([]);
	});
});