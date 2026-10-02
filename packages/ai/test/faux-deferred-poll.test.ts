import { describe, expect, it } from "bun:test";
import { fauxAssistantMessage, fauxProvider } from "../src/testing/faux";
import type { AssistantMessage } from "../src/types";

/**
 * The deferred half of the faux double.
 *
 * `pi` ships no test for this — `grep -c deferred pi-ref/.../faux-provider.test.ts` is 0 — so
 * there is nothing to copy and the contract is written here from what a consumer observes.
 *
 * The assertions are deliberately about the poll *running*, not about an option being passed.
 * A `deferred` field deleted from the entry options leaves no runtime trace: measured by
 * ultraworkers-0c, that mutant still passes `bun test` and only fails `check:types`. So each
 * case here watches something the branch alone can produce — a `stopReason: "deferred"` result
 * carrying a handle, `state.deferredFetchCount` moving, a handle in `state.cancelledDeferred`,
 * or an error naming the handle that was asked for.
 */

async function drain(stream: AsyncIterable<unknown>): Promise<AssistantMessage> {
	for await (const _event of stream) {
		// Draining matters: the double only advances on a consumer reading the stream.
	}
	return await (stream as { result(): Promise<AssistantMessage> }).result();
}

describe("faux deferred generation", () => {
	it("returns a deferred result carrying a handle, then finishes it on fetch", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("answer")]);

		const opened = await drain(faux.streamSimple(faux.getModel(), { messages: [] }, { deferred: true }));

		expect(opened.stopReason).toBe("deferred");
		expect(opened.deferred?.id).toBeString();
		expect(opened.content).toEqual([]);

		const finished = await faux.fetchDeferred(faux.getModel(), opened.deferred!);

		expect(finished.stopReason).toBe("stop");
		expect(faux.state.deferredFetchCount).toBe(1);
		expect(faux.getPendingResponseCount()).toBe(0);
	});

	it("holds the response back for pendingFetches before finishing it", async () => {
		const faux = fauxProvider({ deferred: { pendingFetches: 2 } });
		faux.setResponses([fauxAssistantMessage("answer")]);

		const opened = await drain(faux.streamSimple(faux.getModel(), { messages: [] }, { deferred: true }));
		const handle = opened.deferred!;

		// Each of the first two fetches re-reports "still deferred" rather than answering.
		for (const attempt of [1, 2]) {
			const pending = await faux.fetchDeferred(faux.getModel(), handle);
			expect(pending.stopReason).toBe("deferred");
			expect(faux.state.deferredFetchCount).toBe(attempt);
		}

		const finished = await faux.fetchDeferred(faux.getModel(), handle);

		expect(finished.stopReason).toBe("stop");
		expect(faux.state.deferredFetchCount).toBe(3);
	});

	it("reports an error naming the handle when a fetch matches no recorded response", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("answer")]);

		const opened = await drain(faux.streamSimple(faux.getModel(), { messages: [] }, { deferred: true }));
		const handle = opened.deferred!;

		// Not a rejection: the double routes failures into the stream, so the promise resolves with
		// an error message. Asserting `.rejects` here would be a test of a contract it does not have.
		const reported = await faux.fetchDeferred(faux.getModel(), { ...handle, id: "not-a-handle" });

		expect(reported.stopReason).toBe("error");
		expect(reported.errorMessage).toContain("not-a-handle");
		expect(faux.state.deferredFetchCount).toBe(1);
	});

	it("records a cancellation and refuses to finish a cancelled handle", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("answer")]);

		const opened = await drain(faux.streamSimple(faux.getModel(), { messages: [] }, { deferred: true }));
		const handle = opened.deferred!;

		await faux.cancelDeferred(faux.getModel(), handle);

		expect(faux.state.cancelledDeferred.map(cancelled => cancelled.id)).toEqual([handle.id]);

		const reported = await faux.fetchDeferred(faux.getModel(), handle);

		expect(reported.stopReason).toBe("error");
		expect(reported.errorMessage).toContain("cancelled");
	});

	it("streams straight through when deferred is not requested", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("answer")]);

		const answered = await drain(faux.streamSimple(faux.getModel(), { messages: [] }));

		expect(answered.stopReason).toBe("stop");
		expect(answered.deferred).toBeUndefined();
		expect(faux.state.deferredFetchCount).toBe(0);
		expect(faux.state.cancelledDeferred).toEqual([]);
	});
});
