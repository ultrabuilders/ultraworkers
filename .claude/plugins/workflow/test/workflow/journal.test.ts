/**
 * The journal only earns the word "durable" if it survives the two things that actually
 * happen to a run: a crash mid-write, and a reader coming back later.
 *
 * `journal-delta.test.ts` proves the algebra round-trips **in memory**. These rows prove it
 * survives a **filesystem** in between, which is a different claim — the in-memory round trip
 * never touches `appendFile`, never sees a half-written line, and would stay green if the
 * write path were the only thing broken.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { FORMAT, cellsOf, deltaOf } from "../../src/engine/journal-delta";
import { WorkflowErrorCode } from "../../src/errors";
import { appendJournalLine, journalPathFor, loadRunState } from "../../src/engine/journal";
import { journalAgentSettler } from "../../src/persistence/run-agent-settlement";

async function scratchRun(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wf-journal-"));
	return path.join(dir, "run");
}

/** Append the delta between two states, as the engine would. */
async function step(
	runPath: string,
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	sequence: number,
) {
	await appendJournalLine(runPath, {
		generation: "g1",
		sequence,
		previous: sequence === 1 ? "" : `seq-${sequence - 1}`,
		delta: deltaOf(cellsOf(before), cellsOf(after)),
	});
}

describe("run journal", () => {
	test("a run rebuilt from disk equals the state that was written", async () => {
		// WHY write then read rather than build the expectation: the point is the file, and an
		// in-memory expectation would pass even if `appendJournalLine` wrote nothing at all.
		const runPath = await scratchRun();
		const initial = { status: "running", agents: [{ id: "a1" }] };
		const resumed = { status: "done", agents: [{ id: "a1" }, { id: "a2" }] };

		await appendJournalLine(runPath, { format: FORMAT, generation: "g1", sequence: 0, state: initial });
		await step(runPath, initial, resumed, 1);
		await step(runPath, resumed, { ...resumed, status: "failed" }, 2);

		expect(await loadRunState(runPath)).toEqual({ ...resumed, status: "failed" });
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("a HEAD after deltas replaces the state instead of merging into it", async () => {
		// WHY: a HEAD is what compaction writes, and compaction exists because deltas accumulate.
		// If HEAD merged rather than replaced, every key the compacted state omits would survive
		// forever — and since deltas only ever remove keys a later line re-adds, the compacted
		// state would not be the state at that point in the run.
		const runPath = await scratchRun();
		await appendJournalLine(runPath, { format: FORMAT, generation: "g1", sequence: 0, state: { keep: 1, drop: 2 } });
		await step(runPath, { keep: 1, drop: 2 }, { keep: 1 }, 1);
		await appendJournalLine(runPath, { format: FORMAT, generation: "g2", sequence: 0, state: { compacted: true } });

		expect(await loadRunState(runPath)).toEqual({ compacted: true });
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("a torn final line is ignored; the run resumes from the last complete one", async () => {
		// WHY this is safe and the next row is not: only the LAST line can be a crash artefact.
		// Dropping it costs one redone event; honouring it would cost the run its state, and
		// the bytes needed to honour it are exactly the bytes the crash took.
		const runPath = await scratchRun();
		await appendJournalLine(runPath, { format: FORMAT, generation: "g1", sequence: 0, state: { done: 1 } });
		// A crash mid-append: the line was never terminated, so it is a prefix of valid JSON.
		await fs.appendFile(journalPathFor(runPath), '{"format":"ultraworkers-workflow-run-v1","gene');

		expect(await loadRunState(runPath)).toEqual({ done: 1 });
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("damage with intact lines after it is corruption, and throws", async () => {
		// WHY the mirror of the row above. A crash cannot produce a bad line in the middle, so
		// one there means the file is damaged — and silently resuming from the middle is how a
		// run loses every event after the damage with nothing reported.
		const runPath = await scratchRun();
		await appendJournalLine(runPath, { format: FORMAT, generation: "g1", sequence: 0, state: { a: 1 } });
		await fs.appendFile(journalPathFor(runPath), "not json at all\n");
		await appendJournalLine(runPath, { format: FORMAT, generation: "g1", sequence: 1, state: { b: 2 } });

		await expect(loadRunState(runPath)).rejects.toThrow("is corrupt at line 2");
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("a journal in a FOREIGN format is refused by name, not read as 'never started'", async () => {
		// WHY this is a distinct outcome and not a torn line: a torn line is a crash artefact, and
		// dropping it costs one redone event. A foreign-format line is a journal written by a
		// different engine version, and for a single-line journal the torn-line path returns
		// `undefined` — "this run never started". Measured before the fix: exactly that. The run
		// is not lost, it is INVISIBLE, and resume restarts it having re-spent every token it
		// already paid for. So the version must be named in the error, which is also what tells a
		// user which build wrote the file they are looking at.
		const runPath = await scratchRun();
		await fs.appendFile(
			journalPathFor(runPath),
			`${JSON.stringify({ format: "pi-workflow-run-v2", generation: "g1", sequence: 0, state: { status: "running" } })}\n`,
		);

		// The discriminant, not the wording: a later reword of the sentence must not turn this
		// check into a silent pass.
		await expect(loadRunState(runPath)).rejects.toMatchObject({
			name: "WorkflowError",
			code: WorkflowErrorCode.PERSISTENCE_ERROR,
			details: { found: "pi-workflow-run-v2", expected: FORMAT },
		});
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("a run with no journal yet reads as absent, not as empty state", async () => {
		// WHY these must differ: `undefined` is "never started", and `{}` is "started and has
		// state, and it is empty". Resume treats them differently — one creates, one continues —
		// so collapsing them would let a resumed run report a completed run with no work in it.
		expect(await loadRunState(await scratchRun())).toBeUndefined();
	});

	test("MEASURED: a settler-requiring delta REJECTS loadRunState — nothing catches it yet", async () => {
		// WHY this row exists: it is the answer to the review question "is the throw caught on
		// the resume path?", and the answer is currently NO.
		//
		// `applyDelta` throws when a delta carries `settleAgentsAt` and no settler was supplied,
		// and `loadRunState` calls it with no try/catch — so the rejection escapes the journal
		// reader entirely. Today that is harmless because nothing resumes yet; the moment
		// `run-persistence.ts` calls `loadRunState`, this becomes an UNCAUGHT rejection unless
		// that layer catches it.
		//
		// Recorded as a test rather than a comment because the failure mode is silent in the
		// other direction: if the throw were quietly caught somewhere upstream and the step
		// dropped, every row here would still pass and an interrupted agent would stay
		// interrupted forever. This row goes red the moment someone adds the catch — which is
		// exactly when they should read what it says.
		const runPath = await scratchRun();
		await appendJournalLine(runPath, {
			format: FORMAT,
			generation: "g1",
			sequence: 0,
			state: { agents: [{ id: "a1", status: "interrupted" }] },
		});
		await appendJournalLine(runPath, {
			generation: "g1",
			sequence: 1,
			previous: "",
			delta: { settleAgentsAt: "2026-10-04T00:00:00Z", set: {}, remove: [], arrays: {} },
		});

		await expect(loadRunState(runPath)).rejects.toThrow("no settler was supplied");
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("the same delta replays to a SETTLED state once the settler is supplied", async () => {
		// WHY this is the mirror of the row above, and why it is not redundant: that row proves
		// the refusal is loud without a settler; this proves the refusal is not a dead end. A
		// journal carrying `settleAgentsAt` is WRITABLE today and, until the settler existed, only
		// readable by a build that threw — so nothing could ever finish replaying one. This row
		// exercises the path that makes the marker worth writing at all.
		//
		// The assertion is on the replayed STATE, not on "it did not throw": the observable
		// consequence of a settler is that an interrupted agent reaches a terminal status, and a
		// settler that returned the input unchanged would pass a not-throwing check forever.
		const runPath = await scratchRun();
		await appendJournalLine(runPath, {
			format: FORMAT,
			generation: "g1",
			sequence: 0,
			state: { agents: [{ id: "a1", label: "a1", prompt: "p", status: "running" }] },
		});
		await appendJournalLine(runPath, {
			generation: "g1",
			sequence: 1,
			previous: "",
			delta: { settleAgentsAt: "2026-10-04T00:00:00Z", set: {}, remove: [], arrays: {} },
		});

		const state = (await loadRunState(runPath, journalAgentSettler)) as { agents: Record<string, unknown>[] };

		expect(state.agents).toEqual([
			{
				id: "a1",
				label: "a1",
				prompt: "p",
				status: "skipped",
				error: "interrupted",
				errorCode: WorkflowErrorCode.WORKFLOW_ABORTED,
				recoverable: false,
				endedAt: "2026-10-04T00:00:00Z",
			},
		]);
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});
});
