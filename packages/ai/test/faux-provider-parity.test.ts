import { describe, expect, it } from "bun:test";
// `TranscriptContext` is this fork's alias for `Context`, not an export of the root
// barrel — `src/testing/faux.ts` imports it as `Context as TranscriptContext`.
import type { AssistantMessage, Context as TranscriptContext } from "../src";
import { fauxAssistantMessage, fauxProvider, fauxText, fauxThinking, fauxToolCall } from "../src/testing";

/**
 * The faux provider's contract, asserted the way a caller observes it.
 *
 * Ported from `pi-ref/packages/ai/test/faux-provider.test.ts` (20 cases) onto this repo's
 * entry shape. Upstream drives the provider through `complete(model, context)` and
 * `stream(...)` exported from its `compat.ts`; here the handle itself is the entry point,
 * `faux.streamSimple(model, context, options)`, and the finished message is the stream's
 * terminal value. Nothing below reads a field off a type to prove it is declared — each
 * case drives a request and asserts the answer, the emitted deltas, or the recorded state.
 */

function context(systemPrompt?: string): TranscriptContext {
	return {
		systemPrompt: systemPrompt === undefined ? undefined : [systemPrompt],
		messages: [{ role: "user", content: "hi there", timestamp: 1 }],
		tools: [],
	};
}

/** The finished message a stream ends on: the terminal `done` event carries it as `message`. */
async function run(
	faux: ReturnType<typeof fauxProvider>,
	options: { systemPrompt?: string } = {},
): Promise<AssistantMessage> {
	const stream = faux.streamSimple(faux.models[0], context(options.systemPrompt));
	let final: AssistantMessage | undefined;
	for await (const event of stream) if (event.type === "done") final = event.message;
	if (!final) throw new Error("faux stream ended without a done event");
	return final;
}

/** Every event plus the finished message, for cases that assert both. */
async function drain(faux: ReturnType<typeof fauxProvider>): Promise<{
	types: string[];
	final: AssistantMessage | undefined;
	/** The message carried by a terminal `error` event, if the stream failed. */
	failure: AssistantMessage | undefined;
}> {
	const types: string[] = [];
	let final: AssistantMessage | undefined;
	let failure: AssistantMessage | undefined;
	for await (const event of faux.streamSimple(faux.models[0], context())) {
		types.push(event.type);
		if (event.type === "done") final = event.message;
		if (event.type === "error") failure = event.error;
	}
	return { types, final, failure };
}

async function runEvents(faux: ReturnType<typeof fauxProvider>): Promise<string[]> {
	const stream = faux.streamSimple(faux.models[0], context());
	const types: string[] = [];
	for await (const event of stream) types.push(event.type);
	return types;
}

describe("faux provider", () => {
	it("answers a queued response and estimates usage from the serialized context", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("hello world")]);

		const response = await run(faux, { systemPrompt: "Be concise." });

		expect(response.content).toEqual([{ type: "text", text: "hello world" }]);
		// Usage is what a caller budgets against, and it is derived from the context it was
		// given: a longer system prompt must not report the same input tokens as none.
		expect(response.usage.input).toBeGreaterThan(0);
		expect(response.usage.output).toBeGreaterThan(0);
		expect(response.usage.totalTokens).toBe(response.usage.input + response.usage.output);
		expect(faux.state.callCount).toBe(1);
	});

	it("emits text, thinking, and tool-call blocks in the order they were queued", async () => {
		const faux = fauxProvider();
		faux.setResponses([
			fauxAssistantMessage([fauxThinking("think"), fauxToolCall("echo", { text: "hi" }), fauxText("done")], {
				stopReason: "toolUse",
			}),
		]);

		const response = await run(faux);

		expect(response.content).toEqual([
			{ type: "thinking", thinking: "think" },
			{ type: "toolCall", id: expect.any(String), name: "echo", arguments: { text: "hi" } },
			{ type: "text", text: "done" },
		]);
		expect(response.stopReason).toBe("toolUse");
	});

	it("serves a model-aware response factory per requested model", async () => {
		const faux = fauxProvider({
			models: [
				{ id: "faux-fast", name: "Faux Fast", reasoning: false },
				{ id: "faux-thinker", name: "Faux Thinker", reasoning: true },
			],
		});
		faux.setResponses([
			(_context, _options, _state, model) => fauxAssistantMessage(`${model.id}:${String(model.reasoning)}`),
			(_context, _options, _state, model) => fauxAssistantMessage(`${model.id}:${String(model.reasoning)}`),
		]);

		expect(faux.models.map(model => model.id)).toEqual(["faux-fast", "faux-thinker"]);
		expect(faux.getModel().id).toBe("faux-fast");
		expect(faux.getModel("faux-thinker")?.reasoning).toBe(true);

		// Two different models, one queue: the factory receives the model actually requested,
		// which is the only way a caller can tell the provider routes rather than replays.
		let fastFinal: AssistantMessage | undefined;
		let thinkerFinal: AssistantMessage | undefined;
		for await (const e of faux.streamSimple(faux.getModel("faux-fast")!, context()))
			if (e.type === "done") fastFinal = e.message;
		for await (const e of faux.streamSimple(faux.getModel("faux-thinker")!, context()))
			if (e.type === "done") thinkerFinal = e.message;

		expect(fastFinal?.content).toEqual([{ type: "text", text: "faux-fast:false" }]);
		expect(thinkerFinal?.content).toEqual([{ type: "text", text: "faux-thinker:true" }]);
	});

	it("stamps the configured api, provider, and requested model onto the answer", async () => {
		const faux = fauxProvider({
			api: "faux:test",
			provider: "faux-provider",
			models: [{ id: "faux-model" }],
		});
		faux.setResponses([fauxAssistantMessage("hello")]);

		const response = await run(faux);

		expect(response.api).toBe("faux:test");
		expect(response.provider).toBe("faux-provider");
		expect(response.model).toBe("faux-model");
	});

	it("consumes queued responses in order and reports exhaustion as a terminal error", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("first"), fauxAssistantMessage("second")]);

		expect((await run(faux)).content).toEqual([{ type: "text", text: "first" }]);
		expect((await run(faux)).content).toEqual([{ type: "text", text: "second" }]);

		const { types, failure } = await drain(faux);

		// An exhausted queue must reach the caller as an error message, not an empty success.
		expect(types).toContain("error");
		expect(failure?.stopReason).toBe("error");
		expect(failure?.errorMessage).toBe("No more faux responses queued");
		expect(faux.getPendingResponseCount()).toBe(0);
		expect(faux.state.callCount).toBe(3);
	});

	it("replaces the queue with setResponses and extends it with appendResponses", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("discarded"), fauxAssistantMessage("first")]);
		faux.setResponses([fauxAssistantMessage("replaced")]);
		faux.appendResponses([fauxAssistantMessage("appended")]);

		expect((await run(faux)).content).toEqual([{ type: "text", text: "replaced" }]);
		expect((await run(faux)).content).toEqual([{ type: "text", text: "appended" }]);
		expect(faux.getPendingResponseCount()).toBe(0);
	});

	it("awaits an async response factory before answering", async () => {
		const faux = fauxProvider();
		faux.setResponses([
			async () => {
				await Promise.resolve();
				return fauxAssistantMessage("async answer");
			},
		]);

		expect((await run(faux)).content).toEqual([{ type: "text", text: "async answer" }]);
	});

	it("surfaces a throwing response factory as a terminal error naming the cause", async () => {
		const faux = fauxProvider();
		faux.setResponses([
			() => {
				throw new Error("factory exploded");
			},
		]);

		const { types, failure } = await drain(faux);

		expect(types).toContain("error");
		expect(failure?.stopReason).toBe("error");
		expect(failure?.errorMessage).toContain("factory exploded");
	});

	it("rejects a queued response that carries no terminal stop reason", async () => {
		const faux = fauxProvider();
		// A message with neither content nor a stop reason cannot terminate a stream; the
		// provider must refuse it at the boundary rather than emit an unfinishable turn.
		faux.setResponses([{ ...fauxAssistantMessage("hi"), stopReason: undefined } as unknown as AssistantMessage]);

		const { types, failure } = await drain(faux);

		expect(types).toContain("error");
		expect(failure?.errorMessage).toContain("without a stop reason");
	});

	it("emits ordered start/end events around streamed deltas", async () => {
		const faux = fauxProvider({ tokenSize: { min: 1, max: 1 }, tokensPerSecond: 100_000 });
		faux.setResponses([fauxAssistantMessage(fauxText("streamed text here"))]);

		const types = await runEvents(faux);

		expect(types[0]).toBe("start");
		expect(types).toContain("text_start");
		expect(types).toContain("text_delta");
		expect(types.at(-1)).toBe("done");
		// A start with no matching end leaves the consumer's buffer open forever.
		expect(types.filter(t => t === "text_start")).toHaveLength(types.filter(t => t === "text_end").length);
	});

	it("emits thinking and tool-call deltas for a mixed message", async () => {
		const faux = fauxProvider({ tokenSize: { min: 1, max: 1 }, tokensPerSecond: 100_000 });
		faux.setResponses([
			fauxAssistantMessage([fauxThinking("pondering"), fauxToolCall("echo", { text: "x" })], {
				stopReason: "toolUse",
			}),
		]);

		const types = await runEvents(faux);

		expect(types).toContain("thinking_start");
		expect(types).toContain("thinking_delta");
		expect(types).toContain("toolcall_start");
		expect(types).toContain("toolcall_end");
	});

	it("reports cancelled requests instead of answering them", async () => {
		const faux = fauxProvider();
		faux.setResponses([fauxAssistantMessage("never delivered")]);
		const controller = new AbortController();
		controller.abort();

		let final: AssistantMessage | undefined;
		for await (const event of faux.streamSimple(faux.models[0], context(), { signal: controller.signal }))
			if (event.type === "done") final = event.message;

		// An aborted signal must not yield the queued answer as though the call succeeded.
		expect(final?.stopReason).not.toBe("stop");
		expect(faux.state.callCount).toBe(1);
	});
});
