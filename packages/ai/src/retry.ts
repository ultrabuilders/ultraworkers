/**
 * Agent-level retry backoff.
 *
 * The classifier that decides *whether* a failure is worth replaying lives in
 * `error/retryable`; this module is only the arithmetic that says how long to
 * wait first. The two are deliberately separate: a caller may reuse this delay
 * for a failure it classified by other means (a recorded `retryAfter` from the
 * provider, say), and vice versa.
 */
export interface RetryPolicy {
	enabled: boolean;
	/** Max retry attempts (0 = no retries). The initial call never counts as a retry. */
	maxRetries: number;
	/** Base delay in ms. Per-attempt delay is `baseDelayMs * 2^(attempt-1)` before jitter. */
	baseDelayMs: number;
	/** Optional cap for agent-level retry delays in ms. Defaults to 60 seconds. */
	maxAgentDelayMs?: number;
}

export const DEFAULT_MAX_AGENT_RETRY_DELAY_MS = 60_000;

/**
 * Exponential backoff for one attempt, clamped to the policy's cap.
 *
 * The cap is what keeps the result finite, so it is applied unconditionally:
 * `Math.min` against a finite cap returns that cap even when the exponent has
 * already overflowed to `Infinity`, and no caller can observe the difference.
 * (An earlier version guarded the delay with `Number.isSafeInteger` first. A
 * mutation deleting that guard left every test green — it only changes the
 * answer for a cap above `MAX_SAFE_INTEGER`, i.e. a delay measured in
 * hundreds of millions of years.)
 */
export function retryDelayMs(policy: Pick<RetryPolicy, "baseDelayMs" | "maxAgentDelayMs">, attempt: number): number {
	const delay = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1);
	return Math.min(delay, policy.maxAgentDelayMs ?? DEFAULT_MAX_AGENT_RETRY_DELAY_MS);
}
