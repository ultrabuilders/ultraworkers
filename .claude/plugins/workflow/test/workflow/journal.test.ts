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
import { appendJournalLine, journalPathFor, loadRunState } from "../../src/engine/journal";

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

	test("a run with no journal yet reads as absent, not as empty state", async () => {
		// WHY these must differ: `undefined` is "never started", and `{}` is "started and has
		// state, and it is empty". Resume treats them differently — one creates, one continues —
		// so collapsing them would let a resumed run report a completed run with no work in it.
		expect(await loadRunState(await scratchRun())).toBeUndefined();
	});
});
