#!/usr/bin/env bun

/**
 * The contract under test: a failing gate must not hide the gates after it.
 *
 * The obvious assertion — "the summary names the failed member" — passes under
 * BOTH behaviours, because a short-circuiting chain names the member it died
 * on too. So it cannot tell the fix from the bug it replaced. These tests
 * therefore assert on what the short-circuit could NOT produce: a real exit
 * code for a member that comes after a failure.
 *
 * Failure mode defended: `check:ts` reports `exit 1` because of a whitespace
 * nit at member 1, and the reader concludes a gate failed when in fact fifteen
 * gates never ran. The user debugs a defect that does not exist, and a real
 * defect at member 9 stays invisible.
 */

import { describe, expect, it } from "bun:test";
import { MEMBERS, TYPECHECK, runChain, summarize, type MemberResult } from "./check-chain.ts";

/** A result set shaped like a chain where an early member failed. */
function chain(firstFailureAt: number, members: readonly string[] = MEMBERS): MemberResult[] {
	return members.map((member, i) => ({
		member,
		code: i === firstFailureAt ? 1 : 0,
		skipped: false,
	}));
}

describe("check chain", () => {
	it("reports a real exit code for every member after a failure", () => {
		// A short-circuiting runner would have no result at all for these.
		const results = chain(0);
		const ranAfterFailure = results.slice(1).filter(r => !r.skipped);

		expect(ranAfterFailure).toHaveLength(MEMBERS.length - 1);
		// The last member is the one a `&&` chain can never reach.
		const last = results.at(-1);
		expect(last?.skipped).toBe(false);
		expect(typeof last?.code).toBe("number");
	});

	it("counts every member as ran, none skipped, when an early member fails", () => {
		const verdict = summarize(chain(0));

		expect(verdict.ran).toBe(MEMBERS.length);
		expect(verdict.skipped).toBe(0);
	});

	it("names every failing member, not just the first", () => {
		// Two independent failures at different depths. A short-circuit reports
		// one; this must report both, or the second is invisible.
		const results: MemberResult[] = MEMBERS.map((member, i) => ({
			member,
			code: i === 0 || i === 4 ? 1 : 0,
			skipped: false,
		}));

		const verdict = summarize(results);

		expect(verdict.failed).toEqual([MEMBERS[0], MEMBERS[4]]);
		expect(verdict.ran).toBe(MEMBERS.length);
	});

	it("exits non-zero whenever anything failed", () => {
		expect(summarize(chain(0)).exitCode).toBe(1);
		expect(summarize(chain(MEMBERS.length - 1)).exitCode).toBe(1);
	});

	it("exits zero only when every member passed", () => {
		const allPass: MemberResult[] = MEMBERS.map(member => ({ member, code: 0, skipped: false }));

		expect(summarize(allPass).exitCode).toBe(0);
		expect(summarize(allPass).failed).toEqual([]);
	});

	it("treats a skipped member as neither a pass nor a failure", () => {
		// `measure:fan-in:check` and friends can be absent on some checkouts. A
		// skip must not be counted as a pass, or the summary overstates coverage
		// — which is the same defect this whole script exists to remove.
		const results: MemberResult[] = MEMBERS.map(member => ({
			member,
			code: 0,
			skipped: member === "measure:fan-in:check",
		}));

		const verdict = summarize(results);

		expect(verdict.ran).toBe(MEMBERS.length - 1);
		expect(verdict.skipped).toBe(1);
		expect(verdict.exitCode).toBe(0);
	});

	it("keeps the chain long enough to be the thing it replaced", () => {
		// Guards against a future edit quietly dropping members. The && chain had
		// exactly sixteen; dropping one silently narrows what CI measures, and a
		// >= floor would let the chain shrink one gate at a time until it passed.
		expect(MEMBERS.length).toBe(16);
		expect(MEMBERS).toContain("check:tools");
		expect(MEMBERS).toContain("check:test-baseline");
	});

	it("runs the typecheck before the slow baseline gate, as the && chain did", () => {
		// Ordering is part of the contract this script promises to preserve. The
		// typecheck is what surfaces syntax errors, so moving it after
		// `check:test-baseline` would defer every syntax error behind the slowest
		// gate. The fix is meant to be "de-short-circuit", not "re-sort".
		expect(MEMBERS.indexOf(TYPECHECK)).toBe(MEMBERS.indexOf("check:test-baseline") - 1);
	});
});

describe("runChain", () => {
	it("runs every member even after one fails", async () => {
		// THE contract. A `&&` chain executes members up to the first failure and
		// stops, so a caller observing this executor would see fewer calls than
		// members. Adding `if (code !== 0) break` to runChain turns this row red,
		// which is what makes the assertion worth having: it distinguishes the fix
		// from the `&&` behaviour it replaced, which the summarize() rows above
		// cannot do.
		const visited: string[] = [];
		const results = await runChain(MEMBERS, async member => {
			visited.push(member);
			return member === MEMBERS[0] ? 1 : 0;
		});

		expect(visited).toEqual([...MEMBERS]);
		expect(results).toHaveLength(MEMBERS.length);
	});

	it("visits the final member even when every earlier member failed", async () => {
		// The extreme case, and the one the real tree hits: `check:tools` failing on
		// a peer's unformatted file must not prevent `check:test-baseline` — the
		// slowest and most informative gate — from ever running.
		const visited: string[] = [];
		await runChain(MEMBERS, async member => {
			visited.push(member);
			return 1;
		});

		expect(visited.at(-1)).toBe(MEMBERS.at(-1));
		expect(visited).toHaveLength(MEMBERS.length);
	});

	it("reports each member's own code, so independent failures are all visible", async () => {
		const results = await runChain(MEMBERS, async member => (member === MEMBERS[3] ? 1 : 0));

		const verdict = summarize(results);
		expect(verdict.failed).toEqual([MEMBERS[3]]);
		// Nothing was skipped, so "one failed" means one gate disagreed — not that
		// the run stopped there.
		expect(verdict.ran).toBe(MEMBERS.length);
	});

	it("streams results in order as they complete", async () => {
		// The chain is slow enough that silence reads as a hang; the progress
		// callback is what keeps a long run legible.
		const streamed: string[] = [];
		await runChain(
			MEMBERS,
			async () => 0,
			r => streamed.push(r.member),
		);

		expect(streamed).toEqual([...MEMBERS]);
	});

	it("marks an absent member skipped rather than passed", async () => {
		// `bun run <absent>` exits 1 with "Script not found". Treating that as a
		// FAIL would report a check that does not exist here as a broken tree —
		// the same class of false alarm this script exists to remove, one level
		// down. A skip must also never satisfy the verdict.
		const results = await runChain(MEMBERS, async member => (member === MEMBERS[2] ? null : 0));

		const absent = results[2];
		expect(absent.skipped).toBe(true);
		expect(absent.code).toBeNull();

		const verdict = summarize(results);
		expect(verdict.failed).toEqual([]);
		expect(verdict.ran).toBe(MEMBERS.length - 1);
		expect(verdict.skipped).toBe(1);
	});

	it("still reports real failures alongside skips", async () => {
		// Skipping must not swallow a genuine red from another member.
		const results = await runChain(MEMBERS, async member => {
			if (member === MEMBERS[2]) return null;
			return member === MEMBERS[5] ? 1 : 0;
		});

		const verdict = summarize(results);
		expect(verdict.failed).toEqual([MEMBERS[5]]);
		expect(verdict.skipped).toBe(1);
		expect(verdict.exitCode).toBe(1);
	});
});
