/**
 * The ratchet's own logic, plus one run of the real script.
 *
 * The unit cases defend the two properties that separate a ratchet from a tripwire,
 * and both have failed here in this session already:
 *
 *   1. It counts ITS OWN metric. `768 files` was verified twice and was still the
 *      wrong number, because a peer adding one test file raised it. A ratchet that
 *      counts any failure goes red because a peer filled the table in.
 *   2. It gates on the metric and REPORTS the rest. `missing-row` is a ceiling — it
 *      must fall — so a run with 628 of them and 0 stale rows passes. The reverse
 *      would mean the gate goes red the moment someone does the work.
 *
 * The last case is not a unit test: it runs the script. A ratchet that computes the
 * right number and is never wired to anything is a number, not a gate.
 */

import { describe, expect, it } from "bun:test";
import {
	BASELINE_RULES_VERSION,
	BASELINE_TABLE_DIGEST,
	checkRatchet,
	digest,
	STALE_ROW_BASELINE,
} from "./check-disposition-ratchet";
import { RULES_VERSION } from "./check-disposition";

/** Gate violations shaped exactly as `checkPre` emits them. */
const v = (rule: string, detail: string) => ({ rule, detail });

describe("ratchet arithmetic", () => {
	it("passes at the ceiling and fails one row over it", () => {
		// The bound is inclusive. `<=` is what lets the number be reached without
		// going red, so a run that has not improved and has not regressed is green.
		const at = Array.from({ length: STALE_ROW_BASELINE }, (_, i) => v("stale-row", `src/f${i}.ts`));
		expect(checkRatchet(at).ok).toBe(true);

		const over = [...at, v("stale-row", "src/one-more.ts")];
		const verdict = checkRatchet(over);
		expect(verdict.staleRow).toBe(STALE_ROW_BASELINE + 1);
		expect(verdict.ok).toBe(false);
	});

	it("counts only its own rule, so other failures cannot make it red", () => {
		// THE tripwire guard. Every other rule the gate emits is either a table still
		// being filled in or a reviewability check; none of them is the damage this
		// ratchet exists to catch, and gating on any of them is a tripwire on a peer.
		const noisy = [
			...Array.from({ length: 700 }, (_, i) => v("missing-row", `src/uncovered-${i}.ts`)),
			...Array.from({ length: 40 }, (_, i) => v("hits-imbalance", `src/off-${i}.ts`)),
			v("empty-reason", "src/a.ts (line 3)"),
			v("missing-keep-refs", "src/b.ts (line 4)"),
			...Array.from({ length: 71 }, (_, i) => v("literal-hits-imbalance", `src/c${i}.ts`)),
		];
		const verdict = checkRatchet(noisy);
		expect(verdict.staleRow).toBe(0);
		expect(verdict.missingRow).toBe(700);
		expect(verdict.literalImbalance).toBe(71);
		expect(verdict.ok).toBe(true);
	});

	it("does not let a ceiling fall turn the gate red", () => {
		// `missing-row` falling is the table being completed. If the verdict summed
		// both rules, every row a peer adds would raise the total and the ratchet
		// would punish progress — the exact failure `768 files` had.
		const many = (n: number) => Array.from({ length: n }, (_, i) => v("missing-row", `m${i}`));
		const before = checkRatchet(many(9));
		const after = checkRatchet(many(3));
		expect(after.ok).toBe(true);
		expect(after.missingRow).toBeLessThan(before.missingRow);
	});

	it("honours a caller-supplied baseline rather than the constant", () => {
		// `main` passes the default, so this is the only seam where a different
		// ceiling can arrive. It has to be honoured, or the constant is the ceiling
		// whatever the caller believes.
		expect(
			checkRatchet(
				Array.from({ length: 9 }, () => v("stale-row", "x")),
				0,
			).ok,
		).toBe(false);
		expect(checkRatchet([], 0).ok).toBe(true);
	});

	it("goes red on a dangling keep_ref even with stale-row sitting at its ceiling", () => {
		// The inverse of the tripwire guard above, and the reason this rule is wired
		// into `ok` at all. CI reaches the disposition gate ONLY through this ratchet,
		// so a rule the ratchet counts but does not gate is a rule CI cannot see — the
		// exact shape of the `hits-imbalance` bug. The other ungated metrics can stay
		// ungated because a sweep is expected to move them; a keep_refs naming a plan
		// id no plan document introduces is not a work-in-progress, so nothing
		// legitimate can be waiting on it.
		const atCeiling = Array.from({ length: STALE_ROW_BASELINE }, (_, i) => v("stale-row", `src/f${i}.ts`));
		const clean = checkRatchet(atCeiling);
		expect(clean.ok).toBe(true);

		const verdict = checkRatchet([...atCeiling, v("dangling-keep-ref", "src/x.ts (line 3) -> W99")]);
		expect(verdict.staleRow).toBe(STALE_ROW_BASELINE);
		expect(verdict.danglingKeepRef).toBe(1);
		expect(verdict.ok).toBe(false);
	});

	it("reads the dangling count the gate actually emits, not a rule name of its own", () => {
		// The count is read by matching the emitted rule name. A rule the ratchet
		// counts under a name the gate never emits is silently always 0, and an
		// always-0 count gates nothing — green forever, which is how the sibling bug
		// looked from the outside. Both directions are asserted here so the string
		// cannot drift from the gate that produces it in either direction.
		const other = v("some-future-rule", "src/y.ts (line 9)");
		expect(checkRatchet([other]).danglingKeepRef).toBe(0);
		expect(checkRatchet([other]).ok).toBe(true);
		expect(checkRatchet([v("dangling-keep-ref", "src/z.ts (line 1) -> W98")]).danglingKeepRef).toBe(1);
	});
});

describe("the baseline records what it was measured against", () => {
	it("produces a digest comparable with the constant it is compared to", () => {
		// THE bug this pins, found by a peer reading the file rather than by a test.
		// `BASELINE_TABLE_DIGEST` was a 32-hex md5 while `digest()` returned a
		// 12-char sha256 slice, so `printed === BASELINE_TABLE_DIGEST` could never be
		// true: the "table has changed" line printed on every run and meant nothing.
		// Two known vectors fix the algorithm, and the length check fixes the shape —
		// neither depends on the live table, so a peer editing it cannot redden this.
		expect(digest("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
		expect(digest("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
		expect(digest("abc").length).toBe(BASELINE_TABLE_DIGEST.length);
		expect(BASELINE_TABLE_DIGEST).toMatch(/^[0-9a-f]{32}$/);
	});

	it("records the rules version, which the table digest cannot stand in for", () => {
		// Changing what `stale-row` means inside the gate leaves the table
		// byte-identical, so the md5 still matches and the run still prints green with
		// a ceiling that is now measuring something else. The rules version is the
		// only thing standing between that edit and a silently wrong baseline — so
		// the ratchet has to be reading the LIVE value, not a copy of it.
		expect(RULES_VERSION).toBe(BASELINE_RULES_VERSION);
		// And the live value has to be the gate's, not a duplicate: if these drift
		// apart the ratchet would keep reporting the old rules forever.
		expect(BASELINE_RULES_VERSION.length).toBeGreaterThan(0);
	});
});

describe("the ratchet as a runnable gate", () => {
	it("runs against the real table and reports the metric it measured", async () => {
		// The contract is the output, not just the code: a ratchet nobody can audit is
		// worse than none. It must name its metric, its measured value, its ceiling,
		// and the digest the ceiling was recorded against — otherwise a number that
		// goes wrong in a month cannot be traced back to what it meant today.
		const proc = Bun.spawnSync({
			cmd: ["bun", "scripts/rename/check-disposition-ratchet.ts"],
			cwd: new URL("../..", import.meta.url).pathname,
			stdout: "pipe",
			stderr: "pipe",
		});
		const out = `${proc.stdout.toString()}${proc.stderr.toString()}`;
		// bun writes a script's own stderr to stderr, so a run that reported nothing
		// would exit 0 and pass every assertion below.
		expect(out).toContain("metric    : stale-row");
		expect(out).toContain(`[ratchet] ceiling   : ${STALE_ROW_BASELINE}`);
		expect(out).toMatch(/measured  : \d+/);
		// The COMPUTED digest, matched through its own line. An earlier version of this
		// assertion was a bare `/md5:[0-9a-f]{32}/`, which the baseline line also
		// satisfies — deleting the computed digest entirely left it green. Verified by
		// mutation: the line is the only thing printed from the table's own bytes, so
		// asserting through it is what gives the assertion teeth.
		expect(out).toMatch(/\[ratchet\] table {5}: scripts\/rename\/disposition\.tsv · \d+ rows · md5:[0-9a-f]{32}/);
		// The ceiling carries the digest it was recorded against, so a number that goes
		// wrong in a month can be traced back to what it meant today.
		expect(out).toContain("ad1f1ef25f5c55fc924da3c07ac71b44");
		// …and the rules it was measured under, which the digest above cannot cover.
		expect(out).toMatch(/\[ratchet\] rules {5}: \S+ \(ceiling set against \S+\)/);
		// A green run must still name the numbers it deliberately does not gate on, and
		// say they are ceilings. An unlabelled 71 reads as a threshold to defend rather
		// than a number that falls when someone fixes a row.
		//
		// The ceiling label is matched without its count. It used to assert the literal
		// "both are CEILINGS", which pinned the number of ungated rules to the shape of
		// the sentence — adding a third ungated rule reddened a test whose subject was
		// the labelling, not the arithmetic. Each rule is then asserted to carry a value
		// of its own, so the contract (every ungated number is named) survives the next
		// rule and deleting any one of these lines still fails.
		expect(out).toMatch(/are CEILINGS, they must fall/);
		expect(out).toMatch(/missing-row\s+= \d+/);
		expect(out).toMatch(/literal-hits-imbalance\s+= \d+/);
		expect(out).toMatch(/hits-imbalance\s+= \d+/);
		expect(proc.exitCode).toBe(0);
	});
});
