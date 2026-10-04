/**
 * The cut ledger, executable.
 *
 * Bead `epic-dynamic-workflows-259n.2`. The reference is 24,740 LOC and we take ~6,700. Every
 * cut line is a decision someone will eventually question, and "it was in the reference, so I
 * put it back" is the default move. This file makes each cut a recorded, checkable decision.
 *
 * ## How absence is asserted WITHOUT source-grep
 *
 * AGENTS.md bans reading a hand-written `.ts` and matching its text — it tests how code LOOKS
 * rather than what it DOES, and it passes on a comment. So neither kind of row below greps:
 *
 * - **A cut FILE** is asserted with `fs.existsSync`. That is a statement about the tree, the
 *   same class of claim as `git diff --name-only`.
 * - **A cut SYMBOL** is asserted against a module's runtime exports. Importing
 *   `* as contract` and asking whether `contract.WORKFLOW_CAPABILITY_DEFINITION` exists is a
 *   statement about what the module offers a caller, which is the thing a future agent would
 *   actually break by restoring the symbol.
 *
 * ## What is deliberately NOT asserted here, and why
 *
 * The ledger's "do NOT build" rows (no `f` key, no elapsed time, no panel input, no `rm` at
 * tool level, no `replayed` badge, no `unverified` bucket) describe the shipped **UI**, which is
 * bead `.8` and does not exist. Asserting their absence today would be asserting something
 * about a module that cannot be imported — a green row that reaches nothing, which is the exact
 * defect this epic's guard bead exists to prevent. They are listed in {@link PENDING_UI_ROWS}
 * as data, so the omission is visible rather than forgotten, and they become assertable the day
 * `.8` lands.
 */
import { describe, expect, test } from "bun:test";

/** Cut files. Presence of any one of these means a deliberate cut was undone. */
const CUT_FILES = [
	"workflow-comprehension.ts",
	"workflow-authoring-coverage.ts",
	"deep-research.ts",
	"usage-limit-scheduler.ts",
	"agent-registry.ts",
	"workflow-release-gate.ts",
	"code-review.ts",
	"workflow-context-measurement.ts",
] as const;

/**
 * Cuts that live INSIDE a file we did port. Checked against exports, not text.
 *
 * Each entry is the module to import and the export that must not exist on it.
 */
const CUT_EXPORTS = [
	{
		module: () => import("../../src/engine/contract"),
		absent: "WORKFLOW_CAPABILITY_DEFINITION",
		why: "the capability descriptor array, cut with the markdown generators it fed",
	},
	{
		module: () => import("../../src/engine/contract"),
		absent: "projectStaticReferenceFacts",
		why: "renders markdown for a skill system we do not have",
	},
	{
		module: () => import("../../src/engine/contract"),
		absent: "AGENT_OPTIONS",
		why: "a documentation shape, not runtime surface",
	},
] as const;

/**
 * Measured absences that need the shipped UI to be assertable.
 *
 * Present as data on purpose: a ledger row that silently disappears is how a decision gets
 * re-litigated in six months. Each names the bead that makes it checkable.
 */
const PENDING_UI_ROWS = [
	{ absent: "an `f` filter key", evidence: "`/` is the filter; ctrl+f is page-down", bead: ".8" },
	{ absent: "elapsed time in the navigator", evidence: "exists only in `/workflows status`", bead: ".8" },
	{ absent: "panel input handling", evidence: "`task-panel.ts` — purely informational", bead: ".8" },
	{ absent: "a `replayed` agent badge", evidence: "no `replayed` field on the snapshot", bead: ".8" },
	{ absent: "`unverified` vs `refuted` buckets", evidence: "exists nowhere in the reference", bead: ".8" },
	{ absent: "`rm` at tool level", evidence: "slash command only; deletion stays human", bead: ".8" },
] as const;

describe("cut ledger", () => {
	test("no cut file has been restored into the workflow tree", async () => {
		// WHY a directory walk rather than 8 existence checks: eight rows that each pass
		// independently read as eight facts, and adding a ninth cut to the ledger would be a
		// code change nobody notices. One row over the table fails LOUDLY when the table and
		// the tree disagree, which is the moment it matters.
		const glob = new Bun.Glob("**/*.ts");
		const present: string[] = [];
		for await (const entry of glob.scan({ cwd: import.meta.dir + "/../.." })) {
			const base = entry.split("/").pop() ?? entry;
			if ((CUT_FILES as readonly string[]).includes(base)) present.push(entry);
		}

		expect(present).toEqual([]);
	});

	test("no cut capability export is offered to a caller", async () => {
		// WHY exports and not a grep: a restored symbol that nothing imports changes no
		// behaviour today and would be found by a grep of the wrong file, whereas this asks
		// the module what a caller can actually reach.
		const found: string[] = [];
		for (const row of CUT_EXPORTS) {
			const mod: Record<string, unknown> = await row.module();
			if (row.absent in mod) found.push(`${row.absent} — ${row.why}`);
		}

		expect(found).toEqual([]);
	});

	test("the ledger still names the UI absences that are not yet assertable", () => {
		// WHY assert on the ledger rather than leave a comment: a comment is invisible to every
		// gate and survives deletion. This row dies if the table is emptied, which is the moment
		// someone decides the ledger is finished and stops reading it.
		//
		// It also keeps the honest gap visible: these six rows are NOT passing, they are
		// unreachable until bead `.8` ships the UI they describe.
		expect(PENDING_UI_ROWS.length).toBeGreaterThan(0);
		for (const row of PENDING_UI_ROWS) {
			expect(row.bead).toBe(".8");
			expect(row.evidence.length).toBeGreaterThan(0);
		}
	});
});
