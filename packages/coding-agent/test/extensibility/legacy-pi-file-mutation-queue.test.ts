import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import * as tmpdir from "node:os";
import { withFileMutationQueue } from "@oh-my-pi/pi-coding-agent/extensibility/legacy-pi-coding-agent-shim";

// `pi` re-exports `withFileMutationQueue` from its package root
// (`core/tools/index.ts`), which `pi-coding-agent/src/index.ts` re-exports, so
// extensions import it by name from `@earendil-works/pi-coding-agent`. omp had
// the implementation all along at `src/utils/file-mutation-queue.ts`, and three
// internal tools already call it — but nothing put it on the public surface.
// A named import therefore failed with Bun's static `Export named
// 'withFileMutationQueue' not found`, and every extension that reached for it
// (`pi-mcp-adapter`) died at load with no other error.
//
// The binding import above is itself half the contract: if the symbol left the
// shim, this file would fail to load rather than fail an assertion. The rest
// pins the behaviour `pi` exposes it for.
describe("legacy shim withFileMutationQueue", () => {
	it("serialises mutations of one path so a second writer cannot interleave", async () => {
		const target = path.join(tmpdir.tmpdir(), "legacy-pi-file-mutation-queue-probe");
		const order: string[] = [];

		await Promise.all([
			withFileMutationQueue(target, async () => {
				order.push("first-start");
				await Bun.sleep(20);
				order.push("first-end");
			}),
			withFileMutationQueue(target, async () => {
				order.push("second-start");
				await Bun.sleep(1);
				order.push("second-end");
			}),
		]);

		// Without the queue both callbacks start together and the shorter one
		// finishes first, giving "first-start,second-start,second-end,first-end".
		// The queue is what makes each callback a critical section over one path,
		// which is the property an extension relies on to avoid torn writes.
		expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
	});

	it("does not serialise unrelated paths against each other", async () => {
		const order: string[] = [];
		await Promise.all([
			withFileMutationQueue(path.join(tmpdir.tmpdir(), "queue-a"), async () => {
				order.push("a-start");
				await Bun.sleep(20);
				order.push("a-end");
			}),
			withFileMutationQueue(path.join(tmpdir.tmpdir(), "queue-b"), async () => {
				order.push("b-start");
				await Bun.sleep(1);
				order.push("b-end");
			}),
		]);

		// The same interleaving as above, but now the desired outcome: a queue
		// keyed per path must not become a single global lock.
		expect(order).toEqual(["a-start", "b-start", "b-end", "a-end"]);
	});
});
