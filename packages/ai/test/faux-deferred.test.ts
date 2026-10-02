import { describe, expect, it } from "bun:test";
import { type Context as TranscriptContext, type SimpleStreamOptions } from "../src";
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

		// `fetchDeferred` rejects for a handle it never issued, but it must still have reported the
		// request first: the hook is what tells a caller the resume reached the provider at all.
		await expect(faux.fetchDeferred(faux.models[0], handle, { onResponse })).rejects.toThrow();
		await faux.cancelDeferred(faux.models[0], handle, { onResponse });

		expect(seen).toEqual(["response", "response"]);
		expect(faux.state.cancelledDeferred).toEqual([handle]);
	});

	it("hands the deferred request to the provider it is given to", async () => {
		const faux = fauxProvider();
		// The shape pi-durable's generation path builds: a wider per-conversation options bag spread
		// into `SimpleStreamOptions`.
		const conversationOptions = { cacheRetention: "short" as const, deferred: { window: "1h" as const } };
		const options: SimpleStreamOptions = { ...conversationOptions };

		let observed: SimpleStreamOptions | undefined;
		faux.setResponses([
			(_transcriptContext, streamOptions) => {
				observed = streamOptions;
				return fauxAssistantMessage("hi");
			},
		]);
		const stream = faux.streamSimple(faux.models[0], context(), options);
		for await (const _event of stream) {
			// Drain: the response factory runs while the stream is consumed.
		}

		// Read through a field the declaration is what makes legal. `bun test` does not typecheck, so
		// this line alone defends nothing at runtime; the guarantee is checked by `bun check:types`,
		// which rejects it with TS2339 when `deferred` is removed from `SimpleStreamOptions`. The
		// runtime half asserts the other options survive the spread, which is what would silently
		// regress if the bag were rebuilt field-by-field instead of spread.
		expect(typeof observed?.deferred === "object" ? observed.deferred.window : undefined).toBe("1h");
		expect(observed?.cacheRetention).toBe("short");
	});
});