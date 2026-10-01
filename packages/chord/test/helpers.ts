import { createLoopbackServiceTransport } from "../src/services/loopback";

export { createLoopbackServiceTransport };

/**
 * Poll `assertion` until it stops throwing, or fail after `timeoutMs`.
 *
 * The vitest suite this package was migrated from used `vi.waitFor`, which
 * `bun:test` does not provide. This is the same contract: retry the assertion on
 * a short interval and surface the LAST failure, so a timeout reports what the
 * assertion actually said rather than a bare "timed out".
 */
export async function waitFor(assertion: () => void, timeoutMs = 1_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	let lastError: unknown;
	for (;;) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			if (Date.now() >= deadline) throw lastError;
			await Bun.sleep(5);
		}
	}
}
