/**
 * The agent bridge's decision layer: what a workflow script's `agent()` call resolves to, and
 * which tools a spawned subagent is denied.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw):
 *   - `src/workflow.ts:2346-2348` `isEmptyTextAgentResult` — verbatim
 *   - `src/workflow.ts:770-786`   the synchronous `timeoutMs` guard — verbatim
 *   - `src/workflow.ts:1277-1282` recoverable→`null` / non-recoverable→throw — verbatim
 *   - `src/agent.ts:771`          `DEFAULT_EXCLUDED_SUBAGENT_TOOLS` — verbatim
 *   - `src/agent.ts:788-790`      `subagentExcludedTools` — verbatim
 *
 * ## Why this file stops where it does
 *
 * The reference's `agent()` spans roughly five hundred lines because it also owns retry,
 * journaling, named threads, worktree isolation and usage accounting. Those are Phases 4 and 5
 * (`epic-dynamic-workflows-259n.6`, `.7`). What is here is the part that decides an OUTCOME,
 * because that is the part a workflow script can observe and therefore the part with a
 * contract worth pinning now. The retry loop calls `resolveAgentOutcome` and does the waiting.
 *
 * ## The contract, stated precisely — because the shorthand is wrong
 *
 * "agent() returns null, never throws" is how the plan summarises this, and read literally it
 * is false. The reference throws in three distinct places, and every one of them is deliberate:
 *
 * 1. **Argument validation throws SYNCHRONOUSLY** (`:770-786`). A `void agent(...)` that
 *    rejected would surface as an unhandled rejection, so the invalid-`timeoutMs` case throws
 *    before the promise exists rather than inside it.
 * 2. **A recoverable failure returns `null`** after its attempts are exhausted (`:1277-1282`).
 *    `AGENT_EMPTY_OUTPUT` is recoverable, so a subagent that returns nothing yields `null` — not
 *    an exception, because a fan-out must be able to carry on with a hole in it.
 * 3. **A non-recoverable failure throws.** Not every failure is worth absorbing into a `null`.
 *
 * So: `null` means "this attempt sequence failed recoverably", and a throw means "this is not
 * the script's problem to handle". Collapsing the two — the reading the shorthand invites —
 * would delete the `timeoutMs` guard and turn an unrecoverable failure into a silent hole in a
 * fan-out.
 */
import { WorkflowError, WorkflowErrorCode } from "./errors";

/**
 * Tool names always denied in a workflow subagent session.
 *
 * Copied verbatim from `src/agent.ts:771`. Without this a subagent that can see `workflow`
 * spawns workflows without bound, and each of those spawns more — the denial is what makes a
 * workflow a leaf in the orchestration graph.
 */
export const DEFAULT_EXCLUDED_SUBAGENT_TOOLS = ["workflow", "workflow_control"];

/**
 * Denied tool names for one subagent session: the always-on defaults, plus whatever the session
 * and the call site exclude.
 *
 * Copied verbatim from `src/agent.ts:788-790`, including the note that the SDK dedupes, so
 * overlap with a session's own exclusion list is harmless.
 */
export function subagentExcludedTools(extra?: string[], sessionExclude?: string[]): string[] {
	return [...DEFAULT_EXCLUDED_SUBAGENT_TOOLS, ...(sessionExclude ?? []), ...(extra ?? [])];
}

/**
 * True when a schema-less agent produced no text at all.
 *
 * Copied verbatim from `src/workflow.ts:2346-2348`. The `schema === undefined` clause is the
 * load-bearing part: an agent WITH a schema bypasses this check entirely, because valid
 * structured data may legitimately be empty (`{}`, `[]`, `""`) and rejecting those would fail
 * correct subagents. An agent without a schema has only text to return, so whitespace-only text
 * means it said nothing.
 */
export function isEmptyTextAgentResult(result: unknown, schema: unknown): boolean {
	return schema === undefined && typeof result === "string" && result.trim().length === 0;
}

/** The upper bound `setTimeout` accepts, and so the largest usable `timeoutMs`. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Reject a `timeoutMs` that cannot produce a working timeout.
 *
 * Copied from `src/workflow.ts:770-786`. `timeoutMs <= 0`, `NaN` and `Infinity` would
 * spawn-then-instantly-abort a real session on every retry attempt, burning a session per try;
 * this fails fast instead.
 *
 * Throws SYNCHRONOUSLY, and that is the point — see the file docblock. A fire-and-forget
 * `void agent(...)` must not turn a programming error into an unhandled rejection.
 */
export function validateAgentTimeoutMs(timeoutMs: unknown): void {
	if (
		timeoutMs !== undefined &&
		timeoutMs !== null &&
		(typeof timeoutMs !== "number" ||
			!Number.isFinite(timeoutMs) ||
			(timeoutMs as number) < 1 ||
			(timeoutMs as number) > MAX_TIMEOUT_MS)
	) {
		throw new WorkflowError(
			"agent() timeoutMs must be a finite number of milliseconds in [1, 2^31-1]",
			WorkflowErrorCode.SCRIPT_VALIDATION_ERROR,
			{ recoverable: false },
		);
	}
}

/** What the retry loop should do after one attempt failed. */
export type AgentOutcome =
	/** Spend the backoff and try again — a recoverable failure with attempts left. */
	| { kind: "retry"; attempt: number; maxAttempts: number }
	/** Attempts are exhausted and the failure was recoverable: `agent()` resolves to `null`. */
	| { kind: "null"; attempt: number; maxAttempts: number }
	/** Not the script's problem to absorb — rethrow. */
	| { kind: "throw" };

/**
 * Decide what one failed attempt means.
 *
 * Modelled on `src/workflow.ts:1233` and `:1275-1282`, which together read:
 *
 * ```ts
 * if (workflowError.recoverable && attempt < maxAttempts) { …backoff…; continue; }
 * …
 * if (workflowError.recoverable) { log(`exhausted …`); return null; }
 * throw workflowError;
 * ```
 *
 * Split out as a pure function so the decision is testable without a session, a provider, or a
 * clock. The three-way split is the whole point: "retry", "absorb as null", and "throw" are
 * different promises to the script, and the retry loop that used to carry all three inline is
 * where they drifted apart.
 */
export function resolveAgentOutcome(error: unknown, attempt: number, maxAttempts: number): AgentOutcome {
	const workflowError =
		error instanceof WorkflowError ? error : new WorkflowError(String(error), WorkflowErrorCode.UNKNOWN);
	if (workflowError.recoverable && attempt < maxAttempts) {
		return { kind: "retry", attempt, maxAttempts };
	}
	if (workflowError.recoverable) {
		return { kind: "null", attempt, maxAttempts };
	}
	return { kind: "throw" };
}
