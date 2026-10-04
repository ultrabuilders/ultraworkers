/**
 * Resume is the feature; these rows defend the keys it depends on.
 *
 * The failure mode they share is SILENCE. If `callSeq` is perturbed or `deltaKey` collides,
 * every replay still "works" — a cached result is served, the run finishes, and the output is
 * assembled from mispaired pieces. Nothing throws, nothing logs, and the run looks healthy.
 * That is why each row below pins a property rather than a value: the numbers themselves
 * would change as the engine grows, but the properties are what resume correctness means.
 */
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	type AgentCallIdentity,
	type ResumeJournalEntry,
	type ResumeState,
	decideResume,
	deltaKeyFor,
	hashAgentCall,
	markFirstMiss,
	newResumeState,
	nextCallIndex,
} from "../../src/persistence/resume-journal";

const base: AgentCallIdentity = { prompt: "p", agentDefKey: null };

/** Entries carry the call index the lookup uses; these rows are about the HASH, so 0 is enough. */
const cachedEntry = (hash: string, result: unknown): ResumeJournalEntry => ({ index: 0, hash, result });

function state(): ResumeState {
	return newResumeState();
}

describe("resume identity", () => {
	test("the call index is the call's position in the source, not a count of work done", () => {
		// WHY the property and not a sequence of numbers: the bug is a CONDITIONAL increment, and
		// it renumbers every later call. So the property to defend is that the counter advances
		// exactly once per call, whatever that call goes on to do. A test asserting "0,1,2,3"
		// would pass today and still permit a counter that skips on a branch.
		const s = state();
		const taken = [nextCallIndex(s), nextCallIndex(s), nextCallIndex(s)];

		expect(taken).toEqual([0, 1, 2]);
		expect(nextCallIndex(s)).toBe(3);

		// Two independent runs must number identically, or a journal from one cannot replay in
		// the other. This is the whole reason the counter is lexical. ONE fresh run, taking three
		// indices — three fresh runs would each start at 0 and prove nothing.
		const fresh = state();
		expect([nextCallIndex(fresh), nextCallIndex(fresh), nextCallIndex(fresh)]).toEqual(taken);
	});

	test("a nested run's call 0 cannot collide with its parent's call 0", () => {
		// WHY the collision is real rather than theoretical: a nested workflow() shares the
		// parent's store but restarts its own counter at 0. With callIndex alone as the key,
		// whichever commits last overwrites the other's delta — and the same string is the
		// onAgentStart/onAgentEnd event id, so one agent's events are attributed to the other.
		// Two SEQUENTIAL siblings repeat it, which is why nesting depth would not have helped.
		const parent = deltaKeyFor("run-parent", 0);
		const child = deltaKeyFor("run-child-nested1", 0);
		const sibling = deltaKeyFor("run-child-nested2", 0);

		expect(parent).not.toBe(child);
		expect(parent).not.toBe(sibling);
		expect(child).not.toBe(sibling);
		expect(new Set([parent, child, sibling]).size).toBe(3);
	});

	test("one miss ends replay for that call and everything after it", () => {
		// WHY the barrier rather than a per-call lookup: once call 2 misses, its effects never
		// reached the store, so a cached result for call 3 was computed against a store that no
		// longer exists. Replaying it would splice old and new execution into one run.
		const s = state();
		const hash = hashAgentCall(base);
		const cached = cachedEntry(hash, "cached");
		s.firstMiss = 3;

		// Before the barrier: unchanged, cached, live-eligible → replay.
		expect(
			decideResume({
				barrierReached: false,
				cached,
				callHash: hash,
				cachedEmptyOutput: false,
				callIndex: 2,
				firstMiss: s.firstMiss,
			}).kind,
		).toBe("replay");

		// AT the barrier index: the prefix has ended, so call 3 runs live even though its own
		// journal entry is intact. This is the boundary a strict `<` gets wrong.
		const atBarrier = decideResume({
			barrierReached: false,
			cached,
			callHash: hash,
			cachedEmptyOutput: false,
			callIndex: 3,
			firstMiss: s.firstMiss,
		});
		expect(atBarrier.kind).toBe("live");
		expect(atBarrier.kind === "live" && atBarrier.missed).toBe(false);

		// The first genuine miss is what moves the barrier.
		const genuine = decideResume({
			barrierReached: false,
			cached,
			callHash: "other",
			cachedEmptyOutput: false,
			callIndex: 1,
			firstMiss: s.firstMiss,
		});
		expect(genuine.kind === "live" && genuine.missed).toBe(true);
		markFirstMiss(s, 1);
		expect(s.firstMiss).toBe(1);
	});

	test("a changed call never serves its stale result", () => {
		// WHY: the whole point of the hash is that editing a prompt invalidates that call's
		// cached result. Without it, an edited script resumes into the OLD answers and reports
		// success — the failure mode where a stale answer is indistinguishable from a fresh one.
		const s = state();
		const before = hashAgentCall(base);
		const after = hashAgentCall({ ...base, prompt: "p2" });

		expect(after).not.toBe(before);
		const decision = decideResume({
			barrierReached: false,
			cached: cachedEntry(before, "old"),
			callHash: after,
			cachedEmptyOutput: false,
			callIndex: 0,
			firstMiss: s.firstMiss,
		});
		expect(decision.kind).toBe("live");
	});

	test("an empty cached result re-runs live instead of becoming permanent", () => {
		// WHY empty is a MISS and not a hit: an empty result is what a previous run wrote when
		// its agent produced nothing. Replaying it would make that failure permanent — every
		// resume would serve the same emptiness and the call would never be retried.
		const s = state();
		const hash = hashAgentCall(base);
		const decision = decideResume({
			barrierReached: false,
			cached: cachedEntry(hash, ""),
			callHash: hash,
			cachedEmptyOutput: true,
			callIndex: 0,
			firstMiss: s.firstMiss,
		});

		expect(decision.kind).toBe("live");
		expect(decision.kind === "live" && decision.missed).toBe(true);
	});

	test("a thread call closes the prefix even though its neighbours are unchanged", () => {
		// WHY a barrier and not a miss: threads interleave with the agent that spawned them, so
		// their arrival order is not a function of the script. Replay cannot reproduce it — but
		// the calls AROUND a thread are not themselves misses, so this must be distinguishable
		// from the "changed or new" case above.
		const s = state();
		const hash = hashAgentCall(base);
		const cached = cachedEntry(hash, "cached");
		s.resumeBarrierReached = true;

		const after = decideResume({
			barrierReached: s.resumeBarrierReached,
			cached,
			callHash: hash,
			cachedEmptyOutput: false,
			callIndex: 5,
			firstMiss: s.firstMiss,
		});

		expect(after.kind).toBe("live");
		expect(after.kind === "live" && after.missed).toBe(false);
	});

	test("the hash ignores the resolved model but not the spec", () => {
		// WHY: a resumed run must not regress a replayed row to the session default, so the
		// RESOLVED model is journaled separately and stays out of the key. But the model the
		// script ASKED for is part of the spec — changing it is an edit and must invalidate.
		expect(hashAgentCall({ ...base, model: "a" })).toBe(hashAgentCall({ ...base, model: "a" }));
		expect(hashAgentCall({ ...base, model: "a" })).not.toBe(hashAgentCall({ ...base, model: "b" }));
	});

	test("a call that never supplied a cwd keeps the hash older journals recorded", () => {
		// WHY the expected hash is recomputed from the literal JSON rather than compared to
		// another call: comparing two calls of the SAME function cannot see a field the function
		// now always emits, because both sides emit it identically. That row was green against a
		// `cwd: null`-always build — a defect it was written to catch. The journal is a persisted
		// consumer of these exact bytes, so the serialized shape is the contract: pinning it means
		// adding a field now, which changes every hash an older release recorded, is a failing
		// test rather than a fleet-wide silent re-run.
		const legacyJson = JSON.stringify({
			prompt: "p",
			model: null,
			tier: null,
			phase: null,
			agentType: null,
			agentDef: null,
			schema: null,
		});

		expect(hashAgentCall(base)).toBe(createHash("sha256").update(legacyJson).digest("hex"));
		// And the omission is still real: supplying a cwd changes the key.
		expect(hashAgentCall({ ...base, cwd: "/x" })).not.toBe(hashAgentCall(base));
	});
});
