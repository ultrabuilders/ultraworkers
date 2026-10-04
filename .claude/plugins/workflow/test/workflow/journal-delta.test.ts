/**
 * The delta algebra has to be exactly invertible.
 *
 * Resume replays a journal onto a state and continues it. Every guarantee the epic makes
 * about resuming — same result, same budget, same agent identities — rests on this one
 * property: applying the difference between two states to the first must yield the second.
 *
 * So the first row is a round trip over a state that exercises every shape the algebra
 * distinguishes, and it is deliberately one row rather than one row per shape. Per-shape rows
 * would restate the same property five times; a round trip that silently stopped covering a
 * shape would be the regression that matters, and it shows up here first.
 *
 * The rows after it target what a round trip cannot see: deltas that are *too small* (a
 * no-op that must stay empty, a truncation that must still carry a length) and failures that
 * must be loud rather than dropped.
 */
import { describe, expect, test } from "bun:test";
import { type PersistedRunState, applyDelta, cellsOf, deltaOf } from "../../src/engine/journal-delta";
import { WorkflowErrorCode } from "../../src/errors";

/** The algebra, applied the way the journal does: cells -> delta -> replay. */
function rebase(before: PersistedRunState, after: PersistedRunState): PersistedRunState {
	const state = structuredClone(before);
	applyDelta(state, deltaOf(cellsOf(before), cellsOf(after)));
	return state;
}

describe("journal delta", () => {
	test("replaying the difference between two states yields the second", () => {
		// WHY these four keys and not fewer: each exercises a different branch of deltaOf.
		// `status` is a scalar (the `set` path), `agents` an array (the `arrays` path, which
		// diffs by index and carries a length), `budget` a plain object (the `objects` path,
		// which patches keys rather than replacing), and `retries` is DROPPED so the `remove`
		// path runs. A round trip that passes while one of them is broken means resume would
		// silently lose exactly that part of a run.
		const before: PersistedRunState = {
			status: "running",
			agents: [{ id: "a1" }],
			budget: { total: 10, spent: 4 },
			retries: 1,
		};
		const after: PersistedRunState = {
			status: "done",
			agents: [{ id: "a1" }, { id: "a2" }],
			budget: { total: 10, spent: 7 },
		};

		expect(rebase(before, after)).toEqual(after);
	});

	test("a change that moves nothing produces an empty delta", () => {
		// WHY: a journal line is written per delta. If an event that changed nothing still
		// produced a set/remove/array patch, the log would grow on no-op events and — worse —
		// every reader would see a write where there was none, which is exactly the signal a
		// journal is supposed to carry. A key explicitly set to `undefined` counts as absent:
		// it is the same state, not a transition to null.
		const state: PersistedRunState = { status: "running", dropped: "x" };
		const delta = deltaOf(cellsOf(state), cellsOf({ status: "running", dropped: undefined }));

		expect(delta.remove).toEqual(["dropped"]);
		expect(Object.keys(delta.set)).toEqual([]);
		expect(Object.keys(delta.arrays)).toEqual([]);
	});

	test("shortening an array is recorded as a length with nothing to set", () => {
		// WHY this row exists: truncating removes trailing elements, so there is no differing
		// INDEX to record — `set` is empty and only `length` carries the change. A diff that
		// keyed off `set.length` would see no change and drop the truncation, leaving a
		// finished run with agents still listed as running.
		const delta = deltaOf(cellsOf({ agents: [1, 2, 3] }), cellsOf({ agents: [1] }));

		expect(delta.arrays.agents).toEqual({ length: 1, set: [] });
		expect(rebase({ agents: [1, 2, 3] }, { agents: [1] })).toEqual({ agents: [1] });
	});

	test("a delta that must settle agents throws when no settler is supplied", () => {
		// WHY this is a throw and not a skip: `settleAgentsAt` is a marker in the journal that
		// an interrupted agent should be settled at a known instant. Dropping it because the
		// settler has not landed yet would leave that agent interrupted forever, with nothing
		// in any log saying so. A loud failure is recoverable; a silently dropped step is not.
		const state: PersistedRunState = { agents: [{ id: "a1", status: "interrupted" }] };

		expect(() =>
			applyDelta(state, { settleAgentsAt: "2026-10-04T00:00:00Z", set: {}, remove: [], arrays: {} }),
		).toThrow("no settler was supplied");

		const settled = structuredClone(state);
		applyDelta(settled, { settleAgentsAt: "2026-10-04T00:00:00Z", set: {}, remove: [], arrays: {} }, agents =>
			agents.map(agent => ({ ...(agent as object), status: "failed" })),
		);
		expect(settled.agents).toEqual([{ id: "a1", status: "failed" }]);
	});

	test("the refusal carries a code a catcher can match, not just a sentence", () => {
		// WHY a row separate from the one above: that row buys the THROW, this one buys the
		// DISCRIMINANT, and they fail independently. Reverting the error to a bare `Error` leaves
		// every assertion above still green — while the persistence layer, when it arrives, has
		// nothing stable to match on.
		//
		// The failure defended against is silent by construction: a catcher written against the
		// message keeps working right up until someone rewords the sentence for readability, and
		// then it stops working with no type error and no failing test anywhere. So this asserts
		// the code, and not the wording, because the code is the part meant to be relied on.
		const state: PersistedRunState = { agents: [{ id: "a1", status: "interrupted" }] };
		const settleAgentsAt = "2026-10-04T00:00:00Z";

		let thrown: unknown;
		try {
			applyDelta(state, { settleAgentsAt, set: {}, remove: [], arrays: {} });
		} catch (err) {
			thrown = err;
		}

		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as { code?: unknown }).code).toBe(WorkflowErrorCode.PERSISTENCE_ERROR);
		// The timestamp is what lets a caller rebuild the message where no settler exists — the
		// entire value of refusing instead of skipping the step.
		expect((thrown as { details?: { settleAgentsAt?: unknown } }).details?.settleAgentsAt).toBe(settleAgentsAt);
	});

	test("an out-of-range array index is refused rather than clamped", () => {
		// WHY refuse: a journal is read back on a machine we do not control, and a bad index
		// means the file is not the file we wrote. Clamping would extend the array to a length
		// the writer never recorded, and resume would carry a state no run ever had.
		const state: PersistedRunState = { agents: [1] };

		expect(() =>
			applyDelta(state, { set: {}, remove: [], arrays: { agents: { length: 1, set: [[5, "ghost"]] } } }),
		).toThrow("Invalid run array index");
	});
});
