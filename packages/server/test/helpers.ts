/**
 * Poll `assertion` until it stops throwing, or fail after `timeoutMs`.
 *
 * The suite this package was migrated from used `vi.waitFor` and
 * `expect.poll`, neither of which `bun:test` provides, so both call sites go
 * through this one helper. The LAST failure is surfaced on timeout, so a timeout
 * reports what the assertion actually said instead of a bare "timed out".
 *
 * The explicit `await Bun.sleep(0)` between attempts is load-bearing on Bun
 * 1.3.14. Without yielding to the macrotask queue, an assertion whose subject
 * settles from a microtask (a promise that rejects while some other promise is
 * still pending) never observes the settlement, and the poll spins without
 * ever re-reading state. See the note on `settle` below.
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
