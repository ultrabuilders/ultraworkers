import { describe, expect, test } from "bun:test";
import { DEFAULT_MAX_AGENT_RETRY_DELAY_MS, retryDelayMs } from "../src/retry";

/**
 * The delay a caller hands to a timer before replaying an attempt.
 *
 * Two things about the result are load-bearing, and both are invisible if the
 * function is only ever called with small attempts: it must stay finite, and it
 * must stay under the cap. A caller that receives `Infinity` parks the turn
 * with nothing to wake it; one that receives an uncapped value waits far longer
 * than the policy asked for. So the rows below push `attempt` past the point
 * where `2 ** attempt` stops being a safe integer, which is the case a casual
 * `retryDelayMs(..., 1..5)` check never reaches.
 */
describe("retryDelayMs", () => {
	test("grows exponentially from the base delay", () => {
		const policy = { baseDelayMs: 100 };
		expect(retryDelayMs(policy, 1)).toBe(100);
		expect(retryDelayMs(policy, 2)).toBe(200);
		expect(retryDelayMs(policy, 3)).toBe(400);
	});

	test("attempt zero and negative cannot produce a shorter or fractional wait", () => {
		// The loop counts retries, so attempt 0 would mean "before the first
		// retry". Clamping to attempt 1 keeps the first wait equal to the base
		// delay instead of halving it.
		const policy = { baseDelayMs: 100 };
		expect(retryDelayMs(policy, 0)).toBe(100);
		expect(retryDelayMs(policy, -5)).toBe(100);
	});

	test("an unset cap falls back to the documented default", () => {
		// A policy that never sets `maxAgentDelayMs` must still be bounded —
		// otherwise `undefined` would compare false against every candidate and
		// the delay would grow without limit.
		expect(retryDelayMs({ baseDelayMs: 1_000 }, 40)).toBe(DEFAULT_MAX_AGENT_RETRY_DELAY_MS);
	});

	test("an explicit cap wins over the default", () => {
		expect(retryDelayMs({ baseDelayMs: 1_000, maxAgentDelayMs: 5_000 }, 40)).toBe(5_000);
	});

	test("stays finite once the exponent overflows", () => {
		// `2 ** 1024` is Infinity. The cap is what saves this, so the row pins
		// the *observable* requirement — a timer receives a number — rather than
		// any particular guard, which a mutation can delete without moving it.
		const delay = retryDelayMs({ baseDelayMs: 1_000, maxAgentDelayMs: 30_000 }, 1_000);
		expect(Number.isFinite(delay)).toBe(true);
		expect(delay).toBe(30_000);
	});

	test("an uncapped policy falls back to the default cap rather than overflowing", () => {
		// The branch that matters when no cap is supplied: `undefined` would
		// compare false against Infinity and the delay would escape the bound.
		const delay = retryDelayMs({ baseDelayMs: 1_000 }, 1_000);
		expect(Number.isFinite(delay)).toBe(true);
		expect(delay).toBe(DEFAULT_MAX_AGENT_RETRY_DELAY_MS);
	});
});