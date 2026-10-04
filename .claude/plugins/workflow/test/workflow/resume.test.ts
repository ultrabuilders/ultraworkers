/**
 * Resume, end to end across a real journal on disk.
 *
 * `resume-identity.test.ts` proves the gate's decisions in isolation and `journal.test.ts`
 * proves the algebra round-trips through a filesystem. Neither crosses the two, and the
 * contract that matters lives exactly in the crossing: a run that was killed must come back
 * serving the results it already paid for, and must NOT serve a result whose effects are gone.
 *
 * The rows below drive the gate against a journal written by `appendJournalLine`, so a change
 * to either side that breaks the seam shows up here rather than in whichever unit test happens
 * to run first.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { FORMAT, cellsOf, deltaOf } from "../../src/engine/journal-delta";
import { appendJournalLine, loadRunState } from "../../src/engine/journal";
import { journalAgentSettler } from "../../src/persistence/run-agent-settlement";
import {
	decideResume,
	deltaKeyFor,
	hashAgentCall,
	markFirstMiss,
	newResumeState,
	nextCallIndex,
	type ResumeJournalEntry,
} from "../../src/persistence/resume-journal";

async function scratchRun(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wf-resume-"));
	return path.join(dir, "run");
}

/** Append one agent's result as a journal entry, the way a live run records a completed call. */
async function recordCall(
	runPath: string,
	soFar: { index: number; runId: string; hash: string; result: unknown }[],
	entry: { index: number; runId: string; hash: string; result: unknown },
) {
	// The delta carries the CUMULATIVE array. Arrays diff by INDEX, so writing just the new
	// entry each time would REPLACE slot 0 and leave a journal holding only the last call —
	// which reads as "nothing was cached" and silently turns every resume into a full re-run.
	const next = [...soFar, entry];
	await appendJournalLine(runPath, {
		generation: "g1",
		sequence: next.length - 1,
		previous: next.length === 1 ? "" : `seq-${next.length - 2}`,
		delta: deltaOf(cellsOf({}), cellsOf({ journal: next })),
	});
	return next;
}

/**
 * Replay a 5-call run, and count what actually ran live.
 *
 * `currentHashes` is the CURRENT hash of each call in the script — deliberately NOT read from
 * the journal entry. An earlier version derived it from `entry.hash`, which made `hashMatches`
 * true by construction and meant the "edited call" row could never see a miss: it passed for the
 * wrong reason, and the row's whole subject is a mismatch.
 */
async function resumeAfterCrash(journal: ResumeJournalEntry[], currentHashes: string[], barrierAt = 2) {
	const state = newResumeState();
	const live: number[] = [];
	const replayed: number[] = [];

	for (let i = 0; i < 5; i++) {
		const callIndex = nextCallIndex(state);
		const entry = journal.find(e => e.runId === "r1" && e.index === callIndex);
		const decision = decideResume({
			barrierReached: state.resumeBarrierReached,
			cached: entry,
			callHash: currentHashes[i],
			cachedEmptyOutput: false,
			callIndex,
			firstMiss: state.firstMiss,
		});
		if (decision.kind === "replay") replayed.push(callIndex);
		else {
			if (decision.missed) markFirstMiss(state, callIndex);
			live.push(callIndex);
		}
		if (callIndex === barrierAt) state.resumeBarrierReached = true;
	}
	return { replayed, live, firstMiss: state.firstMiss };
}

describe("resume", () => {
	test("a run killed after two calls replays those two and runs the rest live", async () => {
		// WHY this is the bead's headline contract: the two completed calls COST tokens and
		// cannot be re-obtained. Re-running them is not slow, it is wrong — the run would make a
		// second, possibly different, call and the first answer would be gone. The counter of
		// live calls is the observable: a resume that re-invokes a cached call shows up here.
		const runPath = await scratchRun();
		const h0 = hashAgentCall({ prompt: "a", agentDefKey: null });
		const h1 = hashAgentCall({ prompt: "b", agentDefKey: null });
		await appendJournalLine(runPath, { format: FORMAT, generation: "g1", sequence: 0, state: { status: "running" } });
		const e0 = { index: 0, runId: "r1", hash: h0, result: { answer: "A" } };
		const e1 = { index: 1, runId: "r1", hash: h1, result: { answer: "B" } };
		const written = await recordCall(runPath, [], e0);
		await recordCall(runPath, written, e1);

		const onDisk = await loadRunState(runPath, journalAgentSettler);
		const journal = (onDisk?.journal ?? []) as unknown as ResumeJournalEntry[];

		const { replayed, live } = await resumeAfterCrash(journal, [h0, h1, "live-2", "live-3", "live-4"]);

		expect(replayed).toEqual([0, 1]);
		expect(live).toEqual([2, 3, 4]);
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("an EDITED call is not served its stale result", async () => {
		// WHY: the hash exists so that changing a prompt invalidates that call's cached answer.
		// Without it, an edited script resumes into the OLD answers and reports success — the
		// failure mode where a stale answer is indistinguishable from a fresh one. The replay set
		// must shrink to the unchanged prefix.
		const h0 = hashAgentCall({ prompt: "a", agentDefKey: null });
		const h1 = hashAgentCall({ prompt: "b", agentDefKey: null });
		const journal: ResumeJournalEntry[] = [
			{ runId: "r1", index: 0, hash: h0, result: "A" },
			// Call 1's prompt changed, so the journal's hash no longer matches.
			{ runId: "r1", index: 1, hash: h1, result: "B" },
		];

		// Call 1 was EDITED, so its CURRENT hash differs from what the journal recorded.
		const edited = hashAgentCall({ prompt: "b-EDITED", agentDefKey: null });
		const { replayed, live } = await resumeAfterCrash(journal, [h0, edited, "live-2", "live-3", "live-4"]);

		expect(replayed).toEqual([0]);
		// Once call 1 misses, the prefix ends — call 2 and 3 must NOT replay even though their
		// own entries are intact, or the run splices old execution onto missing effects.
		expect(live).toEqual([1, 2, 3, 4]);
	});

	test("a crashed run's in-flight agents are settled by the journal itself", async () => {
		// WHY this crosses both modules: the settle marker is written by the pause path and
		// honoured on the NEXT read. If the journal dropped it, the run would reopen showing an
		// agent that has been running since a process that no longer exists.
		const runPath = await scratchRun();
		await appendJournalLine(runPath, {
			format: FORMAT,
			generation: "g1",
			sequence: 0,
			state: {
				runId: "r1",
				agents: [
					{ id: 1, label: "a1", prompt: "p", status: "done" },
					{ id: 2, label: "a2", prompt: "p", status: "running" },
				],
			},
		});
		await appendJournalLine(runPath, {
			generation: "g1",
			sequence: 1,
			previous: "",
			delta: { settleAgentsAt: "2026-10-04T00:00:00Z", set: {}, remove: [], arrays: {} },
		});

		const state = (await loadRunState(runPath, journalAgentSettler)) as {
			agents: { status: string; endedAt?: string }[];
		};

		expect(state.agents.map(a => a.status)).toEqual(["done", "skipped"]);
		// The finished agent keeps its own end time; only the interrupted one is stamped.
		expect(state.agents[0].endedAt).toBeUndefined();
		expect(state.agents[1].endedAt).toBe("2026-10-04T00:00:00Z");
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});

	test("a nested run's entries cannot be replayed as the parent's", async () => {
		// WHY the lookup is namespaced, not just the key: if resume searched the journal by
		// INDEX alone, a nested run's call 0 would be served the parent's call 0 result. The key
		// is what makes the two runs' entries distinguishable at all, so the search itself has to
		// use it.
		const runPath = await scratchRun();
		await appendJournalLine(runPath, { format: FORMAT, generation: "g1", sequence: 0, state: { status: "running" } });
		await recordCall(runPath, [], { index: 0, runId: "r1", hash: "h-parent", result: { answer: "PARENT" } });

		const onDisk = (await loadRunState(runPath, journalAgentSettler)) as {
			journal: { runId?: string; index: number; result: unknown }[];
		};

		const lookup = (runId: string, index: number) => onDisk.journal.find(e => e.runId === runId && e.index === index);

		expect(lookup("r1", 0)?.result).toEqual({ answer: "PARENT" });
		// A nested run's call 0 is a DIFFERENT entry; there is none, and there must not be one
		// that resolves to the parent's result.
		expect(lookup("r1-nested1", 0)).toBeUndefined();
		expect(deltaKeyFor("r1", 0)).not.toBe(deltaKeyFor("r1-nested1", 0));
		await fs.rm(path.dirname(runPath), { recursive: true, force: true });
	});
});
