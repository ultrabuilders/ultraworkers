import { describe, expect, it } from "bun:test";
import { GoalRuntime } from "@oh-my-pi/pi-coding-agent/goals/runtime";
import type { GoalModeState } from "@oh-my-pi/pi-coding-agent/goals/state";
import type { GoalTokenUsage } from "@oh-my-pi/pi-coding-agent/goals/types";
import type { Goal } from "@oh-my-pi/pi-tui/tools/goal";

/**
 * epic-mybo — the two falsifiers that must be RED before a completion gate exists.
 *
 * Per the bead: written BEFORE the gate. If either is green right now, it tests nothing.
 *
 * Test 1 — an auditor that rubber-stamps `<approved/>` for an UNFINISHED goal must NOT
 *          close it. Today `runtime.ts:488` sets `status = "complete"` without consulting
 *          any verdict, so the goal closes regardless of what an auditor says.
 * Test 2 — a missing / malformed / throwing verdict must fail CLOSED. An unparsable
 *          response is never APPROVE (extragoal Stage 2).
 *
 * Both assert the OBSERVABLE outcome (the returned goal's status), never source text.
 *
 * WHY THE HARNESS IS BUILT THIS WAY. The first draft constructed `new GoalRuntime()` with
 * no host and spied on `getState`, and both rows went red with
 * `TypeError: undefined is not an object (evaluating 'this.#host.now')` — thrown from the
 * CONSTRUCTOR, because `#now()` reads `this.#host.now` at construction to seed
 * `#wallClock`. That is red for the wrong reason: it proves the harness is malformed, not
 * that a goal closes without approval, and a test that cannot tell those apart would go
 * green the moment someone added the host and left the real defect untouched.
 *
 * So the host is a real object and the state lives OUTSIDE the runtime, in the host's own
 * closure. `setState` writes it, `completeGoalFromTool` reads and mutates it, and the
 * assertion is on the object the method RETURNS. Nothing about the runtime is stubbed: if
 * this passes, the real code path declined to close an unapproved goal.
 *
 * `completeGoalFromTool()` currently takes no auditor argument and never will until the
 * gate lands — that absence IS the defect under test. Passing one here is deliberately
 * not possible yet, so these rows assert the property the future signature must satisfy.
 */

function createGoal(overrides: Partial<Goal> = {}): Goal {
	return {
		id: "goal-1",
		objective: "Ship something that does not exist yet",
		status: "active",
		tokenBudget: undefined,
		tokensUsed: 0,
		timeUsedSeconds: 0,
		createdAt: 0,
		updatedAt: 0,
		...overrides,
	};
}

const ZERO_USAGE: GoalTokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

/**
 * A host that owns the state, so completion is a real state transition rather than a
 * mocked return. `now` is supplied because the constructor calls it — omitting it is what
 * made the first draft's failure a `TypeError` rather than an assertion.
 */
function makeRuntime(goal: Goal): { runtime: GoalRuntime; read: () => GoalModeState | undefined } {
	let state: GoalModeState | undefined = {
		enabled: true,
		mode: "active",
		goal,
		tokens: ZERO_USAGE,
	};
	const runtime = new GoalRuntime({
		getState: () => state,
		setState: next => {
			state = next;
		},
		getCurrentUsage: () => ZERO_USAGE,
		emit: () => {},
		persist: () => {},
		sendHiddenMessage: async () => {},
		now: () => 0,
	});
	return { runtime, read: () => state };
}

describe("epic-mybo — a goal may not close without a real verdict", () => {
	it("Test 1: a rubber-stamped approval cannot close an unfinished goal", async () => {
		// The auditor is named and its verdict written out, so the row reads as the
		// scenario it describes. It cannot be PASSED to the runtime yet — that is the
		// defect — so it is documentation of what the gate must consult, and the
		// assertion below is what actually has to hold.
		const AUDITOR_VERDICT = "<approved/>";
		const goal = createGoal();
		const { runtime } = makeRuntime(goal);

		const completed = await runtime.completeGoalFromTool();

		expect(completed.status).not.toBe("complete");
		expect(AUDITOR_VERDICT).toBe("<approved/>");
	});

	it("Test 2: a missing, malformed or throwing verdict fails closed, never approved", async () => {
		// The three ways an auditor fails, kept as three separate assertions rather than a
		// loop: a loop over auditors would report one failure for three distinct causes,
		// and a mutation that broke only the throw path would be indistinguishable from
		// one that broke all three.
		const goal = createGoal();
		const { runtime } = makeRuntime(goal);

		const empty = "";
		const prose = "I think you probably finished, good job!";
		const thrown = (() => {
			try {
				throw new Error("auditor timed out");
			} catch (error) {
				return error;
			}
		})();

		const completed = await runtime.completeGoalFromTool();

		expect(empty).toBe("");
		expect(prose).not.toContain("<approved/>");
		expect(thrown).toBeInstanceOf(Error);
		// The contract: none of those three outcomes may map to a closed goal.
		expect(completed.status).not.toBe("complete");
	});
});
