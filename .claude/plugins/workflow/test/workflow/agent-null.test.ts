/**
 * What `agent()` resolves to is the contract a workflow script is written against: a fan-out
 * that gets `null` for one member must be able to carry on, so "empty" cannot become an
 * exception without changing every script's control flow.
 *
 * The rows below pin the three-way decision — retry, absorb as `null`, rethrow — plus the
 * synchronous argument guard that has to stay synchronous. A test that only checked
 * `resolveAgentOutcome(recoverable, exhausted) === "null"` would pass against an implementation
 * that threw on the other two paths, which is the failure this file exists to prevent.
 */
import { describe, expect, test } from "bun:test";
import { isEmptyTextAgentResult, resolveAgentOutcome, validateAgentTimeoutMs } from "../../src/agent-bridge";
import { WorkflowError, WorkflowErrorCode } from "../../src/errors";

const RECOVERABLE = new WorkflowError("no output", WorkflowErrorCode.AGENT_EMPTY_OUTPUT, { recoverable: true });
const FATAL = new WorkflowError("provider refused", WorkflowErrorCode.MODEL_SPAWN_REJECTED, { recoverable: false });

describe("empty agent results", () => {
	test("whitespace-only text from a schema-less agent counts as empty", () => {
		expect(isEmptyTextAgentResult("   \n\t ", undefined)).toBe(true);
	});

	test("a schema-less agent that said something is not empty", () => {
		// The negative row. A prelude that treated every string as empty would satisfy the row
		// above and return `null` for every successful subagent in every workflow.
		expect(isEmptyTextAgentResult("done", undefined)).toBe(false);
	});

	test("a non-empty string that only looks empty is not empty", () => {
		expect(isEmptyTextAgentResult("0", undefined)).toBe(false);
		expect(isEmptyTextAgentResult("false", undefined)).toBe(false);
	});

	test("structured data bypasses the emptiness check even when it is empty", () => {
		// WHY this is the load-bearing row: valid structured output may legitimately be `{}`,
		// `[]` or `""`. An agent that was asked for `{ fields: [] }` and returned exactly that
		// has succeeded. Failing it as "empty" would reject correct subagents, and the script
		// would see `null` for work that actually succeeded.
		for (const schema of [{}, { type: "object" }]) {
			expect(isEmptyTextAgentResult({}, schema)).toBe(false);
			expect(isEmptyTextAgentResult([], schema)).toBe(false);
			expect(isEmptyTextAgentResult("", schema)).toBe(false);
		}
	});

	test("a non-string, non-empty result is not empty either", () => {
		expect(isEmptyTextAgentResult(null, undefined)).toBe(false);
		expect(isEmptyTextAgentResult(0, undefined)).toBe(false);
	});
});

describe("timeoutMs validation", () => {
	test("accepts a usable timeout and an absent one", () => {
		expect(() => validateAgentTimeoutMs(undefined)).not.toThrow();
		expect(() => validateAgentTimeoutMs(null)).not.toThrow();
		expect(() => validateAgentTimeoutMs(1)).not.toThrow();
		expect(() => validateAgentTimeoutMs(2_147_483_647)).not.toThrow();
	});

	test("rejects values that would spawn then instantly abort", () => {
		// Each of these would pass to `setTimeout` and fire immediately, so every retry attempt
		// would burn a real session before being torn down.
		for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2_147_483_648]) {
			expect(() => validateAgentTimeoutMs(bad)).toThrow(/finite number of milliseconds/);
		}
	});

	test("accepts a fractional timeout", () => {
		// WHY this row exists: an earlier version of this file listed `1.5` among the values that
		// must be rejected, and it was wrong. The reference guards `typeof`, `isFinite`, `< 1`
		// and `> 2^31-1` — there is no integer check, because there is nothing to guard. A
		// fractional timeout truncates to a whole millisecond at the timer and produces the same
		// behaviour, so rejecting it would be a stricter contract than the one being copied.
		expect(() => validateAgentTimeoutMs(1.5)).not.toThrow();
		expect(() => validateAgentTimeoutMs(250.75)).not.toThrow();
	});

	test("rejects a non-number outright", () => {
		expect(() => validateAgentTimeoutMs("1000")).toThrow(WorkflowError);
		expect(() => validateAgentTimeoutMs({})).toThrow(WorkflowError);
	});

	test("throws synchronously, not as a rejection", () => {
		// WHY this row and not an `await expect(...).rejects`: the reference throws before the
		// promise is constructed, specifically so a fire-and-forget `void agent(...)` cannot
		// surface a programming error as an unhandled rejection. Moving the throw inside the
		// promise would keep every other row green and reintroduce that exact bug, so the test
		// has to observe a synchronous throw — an `await` here would pass either way.
		let thrown: unknown;
		try {
			validateAgentTimeoutMs(0);
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(WorkflowError);
		expect((thrown as WorkflowError).code).toBe(WorkflowErrorCode.SCRIPT_VALIDATION_ERROR);
		expect((thrown as WorkflowError).recoverable).toBe(false);
	});
});

describe("agent outcome", () => {
	test("a recoverable failure with attempts left retries", () => {
		expect(resolveAgentOutcome(RECOVERABLE, 1, 3)).toEqual({ kind: "retry", attempt: 1, maxAttempts: 3 });
	});

	test("a recoverable failure with attempts left does NOT resolve to null yet", () => {
		// The half of the retry row that the row above cannot see. Returning `null` on the first
		// recoverable failure would make `maxAttempts` decorative — a fan-out would lose members
		// to a single transient blip even though retries remained.
		expect(resolveAgentOutcome(RECOVERABLE, 1, 3).kind).not.toBe("null");
	});

	test("an exhausted recoverable failure resolves to null", () => {
		expect(resolveAgentOutcome(RECOVERABLE, 3, 3)).toEqual({ kind: "null", attempt: 3, maxAttempts: 3 });
	});

	test("a single-attempt recoverable failure resolves to null immediately", () => {
		// `attempt < maxAttempts` is false at 1/1, so the exhausted branch is reached without
		// any retry. Off-by-one here would either retry a run configured not to, or silently
		// discard a result the caller paid for.
		expect(resolveAgentOutcome(RECOVERABLE, 1, 1)).toEqual({ kind: "null", attempt: 1, maxAttempts: 1 });
	});

	test("a non-recoverable failure rethrows even with attempts left", () => {
		// The row that keeps "returns null, never throws" from being read literally. Retrying a
		// refused spawn just refuses it again, and absorbing it into `null` would report a hole
		// in a fan-out where the truth is that nothing was ever attempted.
		expect(resolveAgentOutcome(FATAL, 1, 3)).toEqual({ kind: "throw" });
	});

	test("an error that is not a WorkflowError is treated as fatal", () => {
		// An unrecognised throwable carries no recoverability, so nothing authorises absorbing
		// it. Defaulting these to `null` is how a real bug becomes a silently missing result.
		expect(resolveAgentOutcome(new Error("boom"), 1, 3)).toEqual({ kind: "throw" });
	});

	test("the three outcomes are distinguishable for the same error at different attempts", () => {
		// The shape the retry loop actually drives: one error, three answers, in sequence.
		const seen = [1, 2, 3].map(attempt => resolveAgentOutcome(RECOVERABLE, attempt, 3).kind);
		expect(seen).toEqual(["retry", "retry", "null"]);
	});
});
