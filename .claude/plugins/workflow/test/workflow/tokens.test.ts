/**
 * What a run reports it spent.
 *
 * Three sources can disagree: the live snapshot (what this process has done since resuming), the
 * persisted record (what the run ever did), and the per-agent aggregate. The row that matters is
 * the disagreement — a resumed run's live figure starts at zero, and reporting THAT would tell
 * the user their long run just got cheaper for free.
 *
 * Every row reads the summary back out of the tool's own `details`, so what is asserted is what a
 * model is handed, not an internal return value.
 */
import { describe, expect, test } from "bun:test";
import { createWorkflowControlTool } from "../../src/tools/workflow-control";
import type { WorkflowSnapshot } from "../../src/types";
import { tokenFigures } from "../../src/usage";
import { agents, fakeManager, run } from "./support/fake-manager";

interface ReportedSummary {
	tokenTotal: number;
	tokenTotalEstimated: boolean;
}

/** Drive `status` against one run and read back the summary the tool reported. */
async function reportFor(runExtra: Record<string, unknown>, live?: WorkflowSnapshot): Promise<ReportedSummary> {
	const manager = fakeManager({
		runs: [run("r1", "running", runExtra)],
		snapshots: live === undefined ? {} : { r1: live },
	});
	const control = createWorkflowControlTool({ getManager: () => manager });
	const result = await control.execute("t1", { action: "status", runId: "r1" });
	const reported = result.details.run;
	// Narrowed rather than cast: an absent or non-numeric tokenTotal must fail loudly here,
	// because `undefined` compared with `toBeGreaterThan` would quietly pass as "not less than".
	if (!reported || typeof reported !== "object") throw new Error("expected a run summary in details.run");
	const fields = reported as { tokenTotal?: unknown; tokenTotalEstimated?: unknown };
	if (typeof fields.tokenTotal !== "number") throw new Error("expected a numeric tokenTotal in details.run");
	return { tokenTotal: fields.tokenTotal, tokenTotalEstimated: fields.tokenTotalEstimated === true };
}

describe("a resumed run never reports fewer tokens than it spent", () => {
	test("a live snapshot of zero does NOT win over a persisted record", async () => {
		// THE row. The live snapshot exists but reports nothing spent — the shape a resume
		// produces, because the new process has not run any agent yet. Reporting the live figure
		// alone would show 0 for a run that already cost 500 tokens.
		const summary = await reportFor(
			{ tokenUsage: { input: 500, output: 0 }, agents: [] },
			{ name: "wf", agents: [], tokenUsage: { input: 0, output: 0 } },
		);
		expect(summary.tokenTotal).toBeGreaterThanOrEqual(500);
	});

	test("the LIVE figure wins when it is the larger one", async () => {
		// The mirror. Without it, a mutation that simply always returned the persisted figure
		// would satisfy the row above — the max is a max, not a fallback.
		const summary = await reportFor(
			{ tokenUsage: { input: 100, output: 0 }, agents: [] },
			{ name: "wf", agents: [], tokenUsage: { input: 800, output: 0 } },
		);
		expect(summary.tokenTotal).toBe(800);
	});

	test("per-agent tokens win over a run-level total that undercounts", async () => {
		// No live snapshot, so the persisted per-agent figures are the ones counted. Agents carry
		// a scalar `tokens` estimate when the provider reports no breakdown, and that estimate is
		// larger than the run-level `total` — the max keeps the larger.
		const summary = await reportFor({ tokenUsage: { total: 10 }, agents: agents([{ status: "done", tokens: 900 }]) });
		expect(summary.tokenTotal).toBe(900);
	});

	test("with a LIVE snapshot, per-agent figures come from the live agents, not the record", async () => {
		// The rule that makes the row above necessary to read first: when a live snapshot exists,
		// `agentUsage` is aggregated from the LIVE agents and the persisted per-agent list is not
		// consulted at all. That is the reference's design — the durable aggregate is the
		// run-level `tokenUsage`, which stays in the max — but it means a record carrying only
		// per-agent tokens and no run-level total reads as zero while a live snapshot is present.
		// Pinned as an observation, not endorsed: if the writer starts persisting a run-level
		// total this row still holds, and if it does not, this is the row that will say so.
		const summary = await reportFor(
			{ tokenUsage: { total: 10 }, agents: agents([{ status: "done", tokens: 900 }]) },
			{ name: "wf", agents: [], tokenUsage: { input: 10 } },
		);
		expect(summary.tokenTotal).toBe(10);
	});

	test("a run that spent nothing reports zero, not the largest field it can find", async () => {
		// The negative control for all three rows above. Without it, "always report a big number"
		// satisfies them.
		const summary = await reportFor({ agents: agents([{ status: "queued" }]) }, { name: "wf", agents: [] });
		expect(summary.tokenTotal).toBe(0);
	});

	test("a scalar token estimate is used when the provider reports no usage", async () => {
		const summary = await reportFor({ agents: agents([{ status: "done", tokens: 250 }]) });
		expect(summary.tokenTotal).toBe(250);
	});
});

describe("estimated figures are marked", () => {
	test("a total carrying a character heuristic renders with the ~ prefix", async () => {
		// `~` is a PREFIX so a parser reading the field after `tokens=` can tell an estimate from
		// an exact count without a second field. A bare number here would let a user budget
		// against a figure the provider never actually reported.
		const manager = fakeManager({ runs: [run("r1", "running", { tokenUsage: { input: 400, estimated: true } })] });
		const control = createWorkflowControlTool({ getManager: () => manager });
		const result = await control.execute("t1", { action: "status", runId: "r1" });
		expect(result.content[0].text).toContain("tokens=~400");
		const reported = result.details.run as { tokenTotalEstimated?: unknown };
		expect(reported.tokenTotalEstimated).toBe(true);
	});

	test("an exact total renders with no prefix", async () => {
		// The negative control: the `~` must not become unconditional.
		const manager = fakeManager({ runs: [run("r1", "running", { tokenUsage: { input: 400 } })] });
		const control = createWorkflowControlTool({ getManager: () => manager });
		const result = await control.execute("t1", { action: "status", runId: "r1" });
		expect(result.content[0].text).toContain("tokens=400");
		expect(result.content[0].text).not.toContain("tokens=~");
	});
});

describe("the fresh/cacheRead split does not invent negative numbers", () => {
	test("a total below its cache reads still reports the reported figure", async () => {
		// Copied from the reference's docblock: cost-only providers report a total with zero
		// token counts, so `estimate - cacheRead` goes negative. Clamping at `reported` keeps the
		// pre-split number instead of a confident "0 tok" for a run that cost money.
		expect(tokenFigures({ total: 10, cacheRead: 400 })).toEqual({ fresh: 0, cacheRead: 400, estimated: false });
		expect(tokenFigures({ input: 50, output: 50, cacheRead: 10 }).fresh).toBe(100);
	});
});
