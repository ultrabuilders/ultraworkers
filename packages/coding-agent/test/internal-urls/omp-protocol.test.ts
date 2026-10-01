import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { InternalUrlRouter } from "@oh-my-pi/pi-coding-agent/internal-urls";

// `InternalUrlRouter.instance()` is memoized per process, and Bun batches test files
// across parallel workers — so a handler registered here would otherwise survive into
// whichever unrelated file shares the worker, and the failure would surface there.
beforeEach(() => {
	InternalUrlRouter.resetForTests();
});

afterEach(() => {
	InternalUrlRouter.resetForTests();
});

describe("OmpProtocolHandler", () => {
	it("treats omp://docs as the documentation root", async () => {
		const resource = await InternalUrlRouter.instance().resolve("omp://docs");

		expect(resource.content).toContain("# Documentation");
		expect(resource.content).toContain("tools/read.md");
	});

	it("resolves docs-prefixed documentation paths", async () => {
		const router = InternalUrlRouter.instance();
		const direct = await router.resolve("omp://tools/read.md");
		const prefixed = await router.resolve("omp://docs/tools/read.md");

		expect(prefixed.content).toBe(direct.content);
		expect(prefixed.content).toContain("# read");
	});
});
