import { describe, expect, test } from "bun:test";

import { countClass, countPinnedCaseBlind } from "./check-disposition";

/**
 * `PINNED` was case-sensitive until `epic-cpws` (2026-10-03). These rows were written
 * while it still was, to prove the report could see what the gate could not. They are
 * kept — inverted — because the report's remaining value is REGRESSION, not census: if
 * the `i` flag is ever dropped, every row here goes loud again, and that is the shape
 * of evidence this file exists to produce.
 */

/** The pre-fix expression: identical to `PINNED` minus the `i` flag. */
const CASE_SENSITIVE = /(^|[^a-zA-Z0-9_-])omp(?![\.\-]sh(?![a-zA-Z0-9]))([^a-zA-Z0-9]|$)/;

describe("countPinnedCaseBlind", () => {
	// The row the whole file is for. Against the real, case-blind `PINNED` the report
	// must be SILENT on an uppercase occurrence — a non-zero answer here means either
	// the flag was lost or the subtraction is no longer exact, and both make the report
	// cry wolf on a corpus it already accounts for.
	test("is silent on an occurrence the case-blind PINNED can count", () => {
		const text = `const H = "OMP-Auth-Broker-Capabilities";`;
		expect(countClass(text, "rename")).toBe(1); // the fix, seen through the census
		expect(countPinnedCaseBlind(text).blind).toBe(0);
	});

	// The same text against the pre-fix expression, and the control for the row above.
	// Without this arm, "silent" is satisfied by a report that counts nothing at all —
	// which is what a broken scanner and a fixed gate look like from the outside.
	test("still counts that occurrence against a narrowed base", () => {
		const text = `const H = "OMP-Auth-Broker-Capabilities";`;
		expect(countPinnedCaseBlind(text, CASE_SENSITIVE).blind).toBe(1);
		expect(countPinnedCaseBlind(text, CASE_SENSITIVE).samples).toEqual(["OMP"]);
	});

	// The failure this defends, unchanged in substance: a case-sensitive `PINNED` left a
	// file whose only occurrences are uppercase scoring zero under EVERY class, and
	// `--stage=post` accepts a row once its count reaches zero — so it read as finished
	// with the token still in it. The row below asserts the count is no longer zero; the
	// row after it asserts the count is still exact rather than inflated.
	test("the pre-fix blind spot is closed at the census, not just in the report", () => {
		const text = `const H = "OMP-Auth-Broker-Capabilities";`;
		expect(countClass(text, CASE_SENSITIVE ? "rename" : "rename")).toBe(1);
	});

	// The subtraction is `case-blind MINUS pinned`, not a second census. If it were
	// dropped, every file would report itself blind and the report would be noise nobody
	// reads — the same outcome as reporting nothing, reached at higher cost.
	test("subtracts what the base already sees, in both directions", () => {
		const mixed = `// omp is ours\nconst A = "OMP-WIRE-VALUE";\n// omp again\nconst B = "x omp y";`;
		// Four, not three: the uppercase occurrence is now counted by the census too,
		// which is the fix. A test still expecting 3 would be asserting the blind spot.
		expect(countClass(mixed, "keep-prose")).toBe(4);
		// Silent against the fixed base…
		expect(countPinnedCaseBlind(mixed).blind).toBe(0);
		// …and non-zero against the pre-fix one, and ONLY for the uppercase occurrence.
		expect(countPinnedCaseBlind(mixed, CASE_SENSITIVE).blind).toBe(1);
		expect(countPinnedCaseBlind(mixed, CASE_SENSITIVE).samples).toEqual(["OMP"]);
	});

	// A report that reported a blind spot where there is none would cry wolf on the
	// majority of files, and a gate that cries wolf is a gate that gets disabled.
	test("reports nothing for text the base already accounts for", () => {
		const lowercase = `// omp owns this\nconst d = "omp";\nomp();\n`;
		expect(countClass(lowercase, "keep-prose")).toBeGreaterThan(0);
		expect(countPinnedCaseBlind(lowercase).blind).toBe(0);
		expect(countPinnedCaseBlind(lowercase, CASE_SENSITIVE).blind).toBe(0);
	});

	// `lastIndex` lives on the regex object, so a shared instance would make this
	// function's answer depend on what the previous call did. The failure is a number
	// that changes under an unrelated call — reproducible only by ordering, which is why
	// it survives every test that runs each case once.
	//
	// The base is the pre-fix expression throughout, because against the fixed one every
	// answer is 0 and a scan-state bug has nothing to perturb.
	test("does not carry scan state between calls", () => {
		const text = `const A = "OMP-ONE"; const B = "OMP-TWO"; const C = "OMP-THREE";`;
		const first = countPinnedCaseBlind(text, CASE_SENSITIVE);
		const second = countPinnedCaseBlind(text, CASE_SENSITIVE);
		expect(first.blind).toBe(3);
		expect(second).toEqual(first);
		expect(countPinnedCaseBlind(`const A = "omp";`, CASE_SENSITIVE).blind).toBe(0);
		expect(countPinnedCaseBlind(text, CASE_SENSITIVE).blind).toBe(3); // still 3
	});

	// A non-global `exec` ignores `lastIndex` and restarts at 0 on every call, so a text
	// that matches at all never terminates the scan. It hangs SILENTLY — no output, no
	// failure — which is why this row exists: the symptom it guards produced an empty
	// output file rather than a red test, and an empty file reads as "still running".
	test("terminates on text that matches at the very first position", () => {
		const startsWithHit = `omp();`;
		expect(startsWithHit.startsWith("omp")).toBe(true);
		expect(countPinnedCaseBlind(startsWithHit, CASE_SENSITIVE).blind).toBe(0);
		expect(countPinnedCaseBlind(`omp();\nconst B = "OMP-X";`, CASE_SENSITIVE).blind).toBe(1);
	});
});
