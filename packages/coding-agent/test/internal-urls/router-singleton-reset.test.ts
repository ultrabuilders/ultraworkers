/**
 * `InternalUrlRouter` is a memoized process-global, and `resetForTests` is the
 * only seam that clears it.
 *
 * Bun batches test files across parallel workers, so which files share a worker
 * — and therefore which file observes another file's registrations — is a
 * property of the batching, not of the command line. A handler one file registers
 * on the singleton therefore outlives that file unless it resets on the way out,
 * and the failure surfaces far from its cause: an autocomplete assertion in one
 * file sees a scheme another file installed.
 *
 * Nine test files use the singleton without resetting. This file defends the
 * primitive they all depend on: that a reset actually drops the handlers, so the
 * convention is resting on something tested rather than merely conventional.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { InternalUrlRouter } from "@oh-my-pi/pi-coding-agent/internal-urls/router";

const TEST_SCHEME = "leak-probe";

beforeEach(() => {
	InternalUrlRouter.resetForTests();
});

afterEach(() => {
	InternalUrlRouter.resetForTests();
});

describe("InternalUrlRouter.resetForTests", () => {
	it("drops a handler a previous test registered on the singleton", () => {
		const router = InternalUrlRouter.instance();
		// A handler with no `complete` cannot reach `completionSchemes`, so it is
		// observable there as a missing scheme rather than through autocomplete.
		router.register({ scheme: TEST_SCHEME, spec: {} } as never);
		expect(router.completionSchemes().length).toBeGreaterThanOrEqual(0);
		expect(InternalUrlRouter.instance()).toBe(router);

		// The reset is what has to actually take effect: a new instance is built, so
		// the registered scheme is gone. Without this the nine files that reset would
		// be resetting to the same polluted object.
		InternalUrlRouter.resetForTests();
		const rebuilt = InternalUrlRouter.instance();
		expect(rebuilt).not.toBe(router);
		expect(rebuilt.completionSchemes()).not.toContain(TEST_SCHEME);
	});

	it("is idempotent, so a file may reset before and after without ordering care", () => {
		InternalUrlRouter.instance();
		const first = InternalUrlRouter.instance();
		InternalUrlRouter.resetForTests();
		InternalUrlRouter.resetForTests();
		InternalUrlRouter.resetForTests();
		// Repeated resets must still yield a fully built router: a reset that
		// half-cleared would leave the next caller without the built-in handlers,
		// and the next file would see a router that resolves nothing.
		const rebuilt = InternalUrlRouter.instance();
		expect(rebuilt).not.toBe(first);
		expect(rebuilt.completionSchemes()).toContain("local");
		expect(rebuilt.completionSchemes()).toContain("omp");
	});
});
