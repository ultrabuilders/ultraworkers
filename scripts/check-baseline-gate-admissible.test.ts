import { describe, expect, it } from "bun:test";
import { judgeAdmissibility, parseGateReport, verdictNote, type GateReport } from "./check-baseline-gate-admissible";

/**
 * The falsifier's own falsifier.
 *
 * `scripts/check-baseline-gate-admissible.ts` asserts that the baseline gate reports its
 * verdicts admissibly. A checker that has never been seen to fail cannot vouch for a gate
 * that has never been seen to fail — that is the exact recursion `epic-jwsy.11` walked into
 * with the fence. So each row here proves a verdict a checker MUST reject, and the
 * last group proves the three it must accept.
 *
 * The reports are the baseline gate's REAL output shapes, read off
 * `check-grp-c-test-baseline.ts` (its `+`/`~`/`-` row markers and its three verdict
 * sentences). They are fixtures of what that script PRINTS, not copies of what it
 * computes — no comparator is re-implemented here, only the verdict it must reject.
 */

function report(overrides: Partial<GateReport> = {}): GateReport {
	return { verdict: "green", exitCode: 0, unconfirmed: [], confirmed: [], healed: [], ...overrides };
}

/** The gate's VOID shape: the banner plus its unconfirmed rows under `~`. */
const VOID_OUTPUT = [
	"grp-c baseline gate: VOID — the tree changed while this gate measured it.",
	"  HEAD at start: 11fdfe3e5ddb0e363d525dff652ac652adf5d1ac",
	"  HEAD at end:   1b48fe990f866b392c8440981b74d117bbe71ec8",
	"",
	"Unconfirmed new failure(s) in this run: 3",
	"  ~ (not reproduced — a confirm run was skipped, so treat as load, not regression)",
	"  ~ AgentSession bash session ownership > keeps a queued bash result",
	"  ~ custom tool loader > resumes host stdin when a tool pauses it at import time",
	"  ~ doctor exit code > exits 0 when every check it could run passed",
].join("\n");

/** The gate's confirmed-regression shape: `N NEW failure(s)` plus `+` rows. */
const NEW_FAILURE_OUTPUT = [
	"grp-c baseline gate: 2 NEW failure(s) not in the baseline:",
	"  + doctor exit code > exits 0 when every check it could run passed",
	"  + RPC Pi-compatible primitives > ordinary failures preserve ids",
].join("\n");

describe("the baseline gate's verdict is read off its own output", () => {
	it("classifies the VOID banner and does not read its prose as a test name", () => {
		// The fixture's first `~` row is the gate's own parenthetical, not a failure. If it
		// were counted as a name, the row count a reader sees would disagree with the gate's
		// "Unconfirmed new failure(s) in this run: 3".
		const parsed = parseGateReport(VOID_OUTPUT, 1);
		expect(parsed.verdict).toBe("void");
		// The fixture's first `~` row is the gate's own parenthetical, not a failure, so it
		// must not appear as a name — if it did, the count would be 4 and would disagree with
		// the gate's declared 3.
		expect(parsed.unconfirmed.some(name => name.startsWith("("))).toBe(false);
		expect(parsed.unconfirmed[0]).toBe("AgentSession bash session ownership > keeps a queued bash result");
	});

	it("prefers new-failures over void when a run somehow printed both", () => {
		// Both sentences cannot coexist in one real run, so this asserts the priority order
		// rather than a reachable state: a reader must never get the quieter verdict when the
		// louder one was printed, because the quieter one is what a green verdict looks like.
		expect(parseGateReport(`${NEW_FAILURE_OUTPUT}\n${VOID_OUTPUT}`, 1).verdict).toBe("new-failures");
	});

	it("treats a non-zero exit with no recognisable sentence as unparseable, not green", () => {
		// A gate whose output changed shape is not a gate that passes. This is the direction
		// that matters: defaulting to green would let a renamed verdict string silently
		// disable the whole check.
		expect(parseGateReport("something else entirely\n", 2).verdict).toBe("unknown");
	});

	it("reads the gate's own count so its row count can be checked against it", () => {
		// The gate announces N and prints N rows. Capturing N separately is what makes a
		// broken row parser visible instead of silently reporting zero.
		const parsed = parseGateReport(VOID_OUTPUT, 1);
		expect(parsed.declaredUnconfirmed).toBe(3);
		expect(parsed.unconfirmed).toHaveLength(3);
	});
});

describe("an inadmissible verdict is refused", () => {
	it("refuses a VOID that exited 0 — the && chain above reads it as a pass", () => {
		// THE contract. `check:test-baseline` is the last link in `check:ts`'s `&&` chain,
		// so exit 0 is what carries "no defect" upward. An abstention that exits 0 is
		// therefore indistinguishable from a pass to every reader above it, and the gate
		// would be reporting a number it does not have.
		const defects = judgeAdmissibility(report({ verdict: "void", exitCode: 0 }));
		expect(defects.map(d => d.kind)).toEqual(["abstention-read-as-success"]);
	});

	it("refuses confirmed new failures that exited 0 — a gate that cannot go red", () => {
		// The regression direction. Measured on this tree, `check:test-baseline` DID report
		// names as `~` (unconfirmed) and exit 1; the shape where it confirms a regression
		// and still exits 0 is the one that would make the bead's ask unanswerable.
		const defects = judgeAdmissibility(report({ verdict: "new-failures", exitCode: 0, confirmed: ["a", "b"] }));
		expect(defects.map(d => d.kind)).toEqual(["regression-not-red"]);
		expect(defects[0]?.detail).toContain("2");
	});

	it("refuses an unparseable report rather than passing silently", () => {
		// A checker that skips what it cannot read is a checker whose coverage is unknown,
		// which is the property this whole file exists to establish.
		expect(judgeAdmissibility(report({ verdict: "unknown", exitCode: 1 })).map(d => d.kind)).toEqual(["unparseable"]);
	});

	it("refuses a report whose declared count and parsed rows disagree", () => {
		// THE regression this guards, and it is the same shape as the bug this file exists
		// for: a gate stops being read, the parser returns an empty list, and the falsifier
		// prints `unconfirmed=0` with a straight face. The verdict here is a perfectly good
		// VOID — so without this row the disagreement would never be looked at, and the
		// counts this file prints would be confidently wrong for as long as the marker
		// stayed renamed.
		const drifted = report({ verdict: "void", exitCode: 1, declaredUnconfirmed: 3, unconfirmed: [] });
		const defects = judgeAdmissibility(drifted);
		expect(defects.map(d => d.kind)).toEqual(["row-count-disagrees"]);
		expect(defects[0]?.detail).toContain("stopped reading");
	});

	it("accepts a report whose declared count matches its rows", () => {
		// The control for the row above: same verdict, same exit, agreeing counts — which
		// must stay admissible, or the check would fire on every healthy VOID run.
		const agreeing = report({ verdict: "void", exitCode: 1, declaredUnconfirmed: 2, unconfirmed: ["a", "b"] });
		expect(judgeAdmissibility(agreeing)).toEqual([]);
	});

	it("calls a confirmed regression a red, not an abstention", () => {
		// The wording fix, asserted as behaviour because a reader who is told "abstention"
		// stops looking. A confirmed regression is the gate REACHING a verdict, and the
		// loud one; calling it an abstention understates the only run that proves the gate
		// works. Distinct from green's "not evidence it catches", which is the opposite
		// direction of caution.
		const note = verdictNote(report({ verdict: "new-failures", exitCode: 1, confirmed: ["a"] }));
		expect(note).toContain("admissible red");
		expect(note).not.toContain("abstention");
		expect(note).toContain("1 confirmed new failure");
	});
});

describe("an admissible verdict is accepted, for what it is", () => {
	it("accepts a VOID that exited non-zero — abstaining loudly is the point", () => {
		// The measured behaviour on this tree: two runs both abstained, both exited 1. That
		// is correct and must NOT be pushed toward green — the tree was moving, so there was
		// no tree for a verdict to belong to.
		expect(judgeAdmissibility(report({ verdict: "void", exitCode: 1 }))).toEqual([]);
	});

	it("accepts confirmed new failures that exited 1 — the red that proves the gate works", () => {
		expect(judgeAdmissibility(report({ verdict: "new-failures", exitCode: 1, confirmed: ["x"] }))).toEqual([]);
	});

	it("accepts a green run", () => {
		expect(judgeAdmissibility(report())).toEqual([]);
	});

	it("states that a green run is not evidence of detection, and says so in its output", () => {
		// The honesty half. Asserted on the STRING THE SCRIPT RETURNS rather than on the
		// source text: reading a .ts file and matching a string in it is a source-grep test
		// (banned by AGENTS.md) — it passes on a comment and fails on a reflow. Here the
		// line is produced by a function, so the assertion is on behaviour a caller sees.
		//
		// It matters because a green run is the easiest result to quote as "the gate works",
		// and it is exactly the result that proves nothing about detection.
		expect(verdictNote(report())).toContain("NOT evidence it catches");
		expect(verdictNote(report())).not.toContain("evidence the gate catches");
	});
});
