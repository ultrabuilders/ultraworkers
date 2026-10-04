/**
 * Display formatting: what a number says when the number is not known.
 *
 * The contract under test is the difference between "this run spent nothing" and "this run's
 * spend is not known yet". Those look identical on a panel — both are a zero — and only one of
 * them is true. A journal-replayed resume knows nothing; a run whose agents were all skipped
 * knows the answer is zero. Rendering "0 tok" for the first tells a user their long run is free.
 */
import { describe, expect, test } from "bun:test";
import type { WorkflowAgentSnapshot } from "../../src/types";
import {
	agentTokenCell,
	backgroundStartNotice,
	createWorkflowSnapshot,
	emptyFleetSummary,
	fmtCompact,
	fmtCost,
	fmtFull,
	fmtTokenCount,
	fmtTokenSegment,
	recomputeWorkflowSnapshot,
} from "../../src/ui/format";

describe("an unknown token total renders as nothing, not as zero", () => {
	test("both figures zero yields an empty segment", () => {
		// THE row. `""` is what makes a surface omit the segment; `"0 tok"` would render as a
		// measurement the run never made.
		expect(fmtTokenSegment({ fresh: 0, cacheRead: 0, estimated: false }, fmtFull)).toBe("");
	});

	test('an ESTIMATED zero still renders empty, not "~0 tok"', () => {
		// The negative control for the row above. Without it, prefixing with `~` unconditionally
		// satisfies the empty case while marking a non-existent measurement.
		expect(fmtTokenSegment({ fresh: 0, cacheRead: 0, estimated: true }, fmtFull)).toBe("");
	});

	test("any real figure renders", () => {
		expect(fmtTokenSegment({ fresh: 400, cacheRead: 0, estimated: false }, fmtFull)).toBe("400 tok");
	});

	test("a cache read alone is enough to render", () => {
		// A provider that only reports cache reads has spent something. Suppressing the segment
		// because `fresh` is zero would hide real spend.
		expect(fmtTokenSegment({ fresh: 0, cacheRead: 1200, estimated: false }, fmtFull)).toBe("0 tok · 1,200 cached");
	});
});

describe("estimated figures are marked", () => {
	test("an estimated total carries the ~ prefix", () => {
		// So a budget is never set against a character-heuristic figure believing it metered.
		expect(fmtTokenSegment({ fresh: 400, cacheRead: 0, estimated: true }, fmtFull)).toBe("~400 tok");
	});

	test("the prefix covers the WHOLE segment when only the cached part is heuristic", () => {
		// Conservative by design, and this is the row that pins it: a fresh-only `~` next to an
		// unmarked cached figure would let a reader treat the larger number as exact.
		expect(fmtTokenSegment({ fresh: 400, cacheRead: 3000, estimated: true }, fmtFull)).toBe(
			"~400 tok · 3,000 cached",
		);
	});

	test("an exact total carries no prefix", () => {
		expect(fmtTokenSegment({ fresh: 400, cacheRead: 3000, estimated: false }, fmtFull)).toBe(
			"400 tok · 3,000 cached",
		);
	});
});

describe("the cache segment appears only when there were cache reads", () => {
	test("no cache reads renders a plain token count", () => {
		// A non-caching provider, or a single-turn agent that never re-reads its cache, would
		// otherwise read as a bare contextless "fresh".
		expect(fmtTokenCount(1200, 0, fmtFull)).toBe("1,200 tok");
	});

	test("cache reads add the segment", () => {
		expect(fmtTokenCount(1200, 3400, fmtFull)).toBe("1,200 tok · 3,400 cached");
	});
});

describe("a real cost never renders as zero", () => {
	test("a sub-cent cost reads as less-than, not $0.00", () => {
		// The row that motivates the whole function: a run that spent money showing "$0.00"
		// teaches a user that runs are free.
		expect(fmtCost(0.00001)).toBe("<$0.0001");
	});

	test("exactly zero takes the four-decimal branch, and is not the <$0.0001 marker", () => {
		// The negative control. `fmtCost` picks 2 decimals at `>= 0.01` and 4 below, so a true
		// zero renders "$0.0000" — not "<$0.0001", which is reserved for a REAL cost too small to
		// show. Claiming an unknown small cost where there is none would be its own lie.
		expect(fmtCost(0)).toBe("$0.0000");
	});

	test("sub-cent costs keep four decimals, cents and above keep two", () => {
		expect(fmtCost(0.005)).toBe("$0.0050");
		expect(fmtCost(1.5)).toBe("$1.50");
	});
});

describe("compact and full number styles are both available", () => {
	test("compact abbreviates, full groups", () => {
		// Panels read compact; the print view reads full. A panel showing "12345678" wraps and
		// destroys the layout, which is why the style is a parameter rather than a constant.
		expect(fmtCompact(999)).toBe("999");
		expect(fmtCompact(12_400)).toBe("12.4K");
		expect(fmtCompact(3_000_000)).toBe("3M");
		expect(fmtFull(12_400)).toBe("12,400");
	});

	test("compact drops a trailing zero decimal", () => {
		// "1K" not "1.0K": a panel column that varies between "1K" and "1.5K" widths reads as
		// two different magnitudes at a glance.
		expect(fmtCompact(1000)).toBe("1K");
		expect(fmtCompact(1_000_000)).toBe("1M");
	});
});

describe("an agent with no usage renders no cell at all", () => {
	const agent = (extra: Partial<WorkflowAgentSnapshot>): WorkflowAgentSnapshot => ({
		id: 1,
		label: "a",
		status: "done",
		...extra,
	});

	test("an agent that never reported usage has an empty cell", () => {
		expect(agentTokenCell(agent({}))).toBe("");
	});

	test("an agent with a scalar estimate renders it", () => {
		expect(agentTokenCell(agent({ tokens: 250 }))).toBe("250 tok");
	});

	test("an agent with a usage breakdown renders both halves", () => {
		expect(agentTokenCell(agent({ tokenUsage: { input: 100, output: 50, cacheRead: 900 } }))).toBe(
			"150 tok · 900 cached",
		);
	});
});

describe("the empty fleet is distinguished from a fleet that has not finished", () => {
	test("every agent returning nothing is an empty fleet", () => {
		// `agent()` resolves an exhausted recoverable failure to null rather than throwing, so an
		// all-null fleet still reports COMPLETED. Without this the host reads "nothing was
		// produced" as "everything succeeded".
		const agents = [
			{ id: 1, label: "one", status: "error" as const },
			{ id: 2, label: "two", status: "error" as const },
		];
		expect(emptyFleetSummary(agents)).toEqual({
			allEmpty: true,
			emptyCount: 2,
			doneCount: 0,
			emptyLabels: ["one", "two"],
		});
	});

	test("queued and running agents are EXCLUDED from the count entirely", () => {
		// Pinned as OBSERVED behaviour, not endorsed. Only terminal agents decide, so a run with
		// one errored agent and two still pending reports allEmpty: true — every agent that has
		// finished so far produced nothing. That is the reference's rule verbatim.
		//
		// Whether it is the right rule is arguable (a run in progress arguably is not yet an
		// empty fleet), but a caller can distinguish the two cases from `emptyCount`/`doneCount`,
		// and changing the rule here would diverge from the reference for no measured reason. If
		// it ever changes, THIS is the row that should change with it.
		const agents = [
			{ id: 1, label: "one", status: "error" as const },
			{ id: 2, label: "two", status: "queued" as const },
			{ id: 3, label: "three", status: "running" as const },
		];
		expect(emptyFleetSummary(agents)).toEqual({
			allEmpty: true,
			emptyCount: 1,
			doneCount: 0,
			emptyLabels: ["one"],
		});
	});

	test("a run with nothing terminal at all is NOT an empty fleet", () => {
		// The negative control that matters: `terminal.length > 0` is what stops a run that has
		// merely not started yet from being reported as having produced nothing.
		const agents = [
			{ id: 1, label: "one", status: "queued" as const },
			{ id: 2, label: "two", status: "running" as const },
		];
		expect(emptyFleetSummary(agents).allEmpty).toBe(false);
	});

	test("a mixed fleet counts both sides", () => {
		const agents = [
			{ id: 1, label: "one", status: "error" as const },
			{ id: 2, label: "two", status: "done" as const },
		];
		const summary = emptyFleetSummary(agents);
		expect(summary.allEmpty).toBe(false);
		expect(summary.emptyCount).toBe(1);
		expect(summary.doneCount).toBe(1);
	});

	test("labels are capped so the warning stays one readable line", () => {
		const agents = Array.from({ length: 9 }, (_, i) => ({ id: i, label: `a${i}`, status: "error" as const }));
		expect(emptyFleetSummary(agents).emptyLabels).toHaveLength(5);
	});

	test("an unlabelled agent falls back to its id", () => {
		// `agent #3` identifies the agent; an empty label identifies nothing.
		expect(emptyFleetSummary([{ id: 3, label: "", status: "error" }]).emptyLabels).toEqual(["agent #3"]);
	});
});

describe("derived counts are a cache of the agents list", () => {
	test("recompute derives the four counts from agents", () => {
		const snapshot = createWorkflowSnapshot({ name: "wf", description: "d", phases: [{ title: "one" }] });
		const withAgents: WorkflowAgentSnapshot[] = [
			{ id: 1, label: "a", status: "running" },
			{ id: 2, label: "b", status: "done" },
			{ id: 3, label: "c", status: "error" },
		];
		const computed = recomputeWorkflowSnapshot({ ...snapshot, agents: withAgents });
		expect(computed.agentCount).toBe(3);
		expect(computed.runningCount).toBe(1);
		expect(computed.doneCount).toBe(1);
		expect(computed.errorCount).toBe(1);
		expect(computed.phases).toEqual(["one"]);
	});

	test("a fresh snapshot starts with no counts rather than zero counts", () => {
		// Zero counts on a hand-built snapshot read as "this run has no agents", which is a claim
		// nobody made. They stay undefined until recompute runs.
		const snapshot = createWorkflowSnapshot({ name: "wf" });
		expect(snapshot.agentCount).toBeUndefined();
		expect(snapshot.phases).toEqual([]);
	});
});

describe("the start notice points at a surface that exists in this host", () => {
	test("in the TUI it points at the panel", () => {
		expect(backgroundStartNotice("deploy", "r1", "tui", "report")).toContain("watch the task panel");
	});

	for (const mode of ["rpc", "json", "print"] as const) {
		test(`in ${mode} it points at text, because a component will not mount`, () => {
			// The load-bearing row. `hasUI` is TRUE in RPC, so a notice pointing at the panel
			// sends a user to watch a surface that never appears.
			const notice = backgroundStartNotice("deploy", "r1", mode, "report");
			expect(notice).toContain("/workflows status r1");
			expect(notice).not.toContain("watch the task panel");
		});
	}

	test("an unknown mode is treated as non-TUI", () => {
		// Defaulting the other way would point an unrecognised host at a component.
		expect(backgroundStartNotice("deploy", "r1", undefined, "result")).toContain("/workflows status r1");
	});
});
