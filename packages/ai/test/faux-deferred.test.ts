import { describe, expect, it } from "bun:test";
import {
	type AssistantMessage,
	type AssistantMessageEventStream,
	type Context as TranscriptContext,
	type SimpleStreamOptions,
} from "../src";
import { fauxAssistantMessage, fauxProvider } from "../src/testing";

function context(): TranscriptContext {
	return {
		systemPrompt: ["test"],
		messages: [{ role: "user", content: "hello", timestamp: 1 }],
		tools: [],
	};
}

/**
 * The deferred request path, asserted through what a consumer observes.
 *
 * `deferred` is declared on `SimpleStreamOptions`, so a provider is handed it inside an ordinary
 * stream call and answers with `stopReason: "deferred"` plus a {@link AssistantMessage.deferred}
 * handle; a later `fetchDeferred` resumes that handle. Nothing here reads the option off the type —
 * a test that read `options.deferred` would prove the declaration exists, not that a request
 * carrying it changes behaviour. Each case below therefore asserts an outcome a caller depends on:
 * a handle to resume, a resumed answer, a cancellation recorded, or an observable response hook.
 */
describe("faux deferred generation", () => {
	it("reports the request on both the deferred fetch and its cancellation", async () => {
		const faux = fauxProvider();
		const seen: string[] = [];
		const onResponse = async (): Promise<void> => {
			seen.push("response");
		};
		const handle = {
			provider: faux.api,
			modelId: faux.models[0].id,
			api: faux.api,
			id: "deferred:absent",
		};

		// `fetchDeferred` reports a handle it never issued as a settled error message rather than a
		// rejected promise — the provider contract, copied from pi. What matters here is that it
		// reports at all: the hook is what tells a caller the resume reached the provider.
		const reported = await faux.fetchDeferred(faux.models[0], handle, { onResponse });
		await faux.cancelDeferred(faux.models[0], handle, { onResponse });

		expect(reported.stopReason).toBe("error");
		expect(reported.errorMessage).toContain(handle.id);
		expect(seen).toEqual(["response", "response"]);
		expect(faux.state.cancelledDeferred).toEqual([handle]);
	});

	it("defers the generation when the request asks for it, and not otherwise", async () => {
		const deferredFaux = fauxProvider({ deferred: { pendingFetches: 0 } });
		deferredFaux.setResponses([fauxAssistantMessage("deferred answer")]);
		const deferredMessage = await last(
			deferredFaux.streamSimple(deferredFaux.getModel(), context(), {
				cacheRetention: "short",
				deferred: { window: "1h" },
			}),
		);

		// Asserted through the double's own output rather than by reading the options object back:
		// an earlier version of this test read `options.deferred` off a locally declared type, which
		// witnesses the type the test wrote rather than the path a caller takes. Only a handle and a
		// `deferred` stop reason can come from the entry branch actually running.
		expect(deferredMessage.stopReason).toBe("deferred");
		expect(deferredMessage.deferred?.id).toStartWith("deferred");

		// The negative case, so the assertion above cannot pass by a provider that always defers.
		const plainFaux = fauxProvider();
		plainFaux.setResponses([fauxAssistantMessage("plain answer")]);
		const plainMessage = await last(plainFaux.streamSimple(plainFaux.getModel(), context()));
		expect(plainMessage.stopReason).toBe("stop");
		expect(plainMessage.deferred).toBeUndefined();
	});

	it("carries the other request options through the same path", async () => {
		const faux = fauxProvider();
		let observed: SimpleStreamOptions | undefined;
		faux.setResponses([
			(_transcriptContext, streamOptions) => {
				observed = streamOptions;
				return fauxAssistantMessage("hi");
			},
		]);
		for await (const _event of faux.streamSimple(faux.getModel(), context(), { cacheRetention: "short" })) {
			// Drain: the response factory runs while the stream is consumed.
		}

		expect(observed?.cacheRetention).toBe("short");
	});
});

/** The final message of a completed stream. */
async function last(stream: AssistantMessageEventStream): Promise<AssistantMessage> {
	for await (const _event of stream) {
		// Draining matters: the double only advances while a consumer reads the stream.
	}
	return await stream.result();
}
