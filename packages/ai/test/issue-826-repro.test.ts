import { describe, expect, it } from "bun:test";
import { streamAnthropic } from "@oh-my-pi/pi-ai/providers/anthropic";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai/utils/event-stream";
import type { Context, Model, ModelSpec, Tool } from "@oh-my-pi/pi-ai/types";
import { buildModel } from "@oh-my-pi/pi-catalog/build";
import { Effort } from "@oh-my-pi/pi-catalog/effort";

const baseModel: Model<"anthropic-messages"> = buildModel({
	id: "claude-sonnet-4-5",
	name: "Claude Sonnet 4.5",
	api: "anthropic-messages",
	provider: "anthropic",
	baseUrl:
		"https://us-east5-aiplatform.googleapis.com/v1/projects/example/locations/us-east5/publishers/anthropic/models/claude-sonnet-4-5:streamRawPredict",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 200_000,
	maxTokens: 8_192,
});

const bashTool: Tool = {
	name: "bash",
	description: "run a bash command",
	parameters: {
		type: "object",
		properties: { command: { type: "string" } },
		required: ["command"],
	} as unknown as Tool["parameters"],
};

const baseContext: Context = {
	systemPrompt: ["Stay concise."],
	messages: [{ role: "user", content: "Hi", timestamp: Date.now() }],
	tools: [bashTool],
};

function abortedSignal(): AbortSignal {
	const controller = new AbortController();
	controller.abort();
	return controller.signal;
}

/**
 * Resolve on the first payload, and FAIL if the stream settles without one.
 *
 * `onPayload` only runs while the provider is pumping, so a bare
 * `Promise.withResolvers()` has no path to rejection: if some earlier file in the
 * same process has left state that stops that pumping, the promise never settles
 * and the test hangs until bun's 5s default. That surfaces as a slow test, which
 * reads as "this area is slow" rather than "this test is broken" — and it cannot
 * be reproduced by running the file alone, so it gets filed as flake.
 *
 * `EventStream.end()` already settled this same class of hang for its own callers,
 * with the comment "end() without a terminal value must still settle result() —
 * otherwise complete()/result() awaits hang forever". This is that discipline one
 * level up: the stream's own completion is a SECOND clock, and whichever fires
 * first decides the outcome.
 *
 * `payloadSeen` is what distinguishes the two cases that must not be conflated —
 * a stream that called `onPayload` and then settled (success; the payload is the
 * answer) versus one that settled having never called it (failure; there is no
 * answer to return, and returning `undefined` would assert against nothing).
 *
 * **This does not make the failure reproducible in isolation.** It converts an
 * unexplained 5s timeout into a named error. The underlying contamination still
 * only manifests in a process where an earlier file has already run — proving
 * THAT needs a fixture that deliberately contaminates, which is separate work.
 */
async function firstPayload<T>(
	open: (onPayload: (payload: unknown) => undefined) => AssistantMessageEventStream,
): Promise<T> {
	let payloadSeen = false;
	const { promise, resolve } = Promise.withResolvers<T>();
	const stream = open(payload => {
		payloadSeen = true;
		resolve(payload as T);
		return undefined;
	});
	const settledFirst = stream.result().then(
		() => {
			if (payloadSeen) return promise;
			throw new Error("onPayload never arrived: stream settled without one");
		},
		(error: unknown) => {
			if (payloadSeen) return promise;
			throw new Error(`onPayload never arrived: stream settled first (${String(error)})`);
		},
	);
	return await Promise.race([promise, settledFirst]);
}

function captureParams(
	model: Model<"anthropic-messages">,
): Promise<{ tools?: Array<{ name: string; strict?: unknown }> }> {
	return firstPayload<{ tools?: Array<{ name: string; strict?: unknown }> }>(onPayload =>
		streamAnthropic(model, baseContext, {
			apiKey: "sk-ant-api-test",
			isOAuth: false,
			signal: abortedSignal(),
			onPayload,
		}),
	);
}

describe("issue #826: Anthropic strict-tools opt-out for Vertex-style proxies", () => {
	it("preserves strict:true on allowlisted tools by default (api.anthropic.com baseline)", async () => {
		const params = await captureParams(baseModel);
		const bash = params.tools?.find(t => t.name === "bash");
		expect(bash).toBeDefined();
		expect(bash?.strict).toBe(true);
	});

	it("omits strict on tool defs when compat.disableStrictTools is set", async () => {
		const params = await captureParams(
			buildModel({
				...baseModel,
				compat: { ...baseModel.compatConfig, disableStrictTools: true },
			} as ModelSpec<"anthropic-messages">),
		);
		const bash = params.tools?.find(t => t.name === "bash");
		expect(bash).toBeDefined();
		expect(bash?.strict).toBeUndefined();
	});

	it("preserves adaptive thinking by default", async () => {
		const adaptiveModel: Model<"anthropic-messages"> = buildModel({
			...baseModel,
			id: "claude-opus-4-7",
			reasoning: true,
			thinking: {
				mode: "anthropic-adaptive",
				efforts: [Effort.Minimal, Effort.Low, Effort.Medium, Effort.High, Effort.XHigh],
			},
			compat: baseModel.compatConfig,
		} as ModelSpec<"anthropic-messages">);
		const params = await firstPayload<{ thinking?: { type?: string } }>(onPayload =>
			streamAnthropic(adaptiveModel, baseContext, {
				apiKey: "sk-ant-api-test",
				isOAuth: false,
				signal: abortedSignal(),
				thinkingEnabled: true,
				onPayload,
			}),
		);
		expect(params.thinking?.type).toBe("adaptive");
	});

	it("maps adaptive thinking to enabled when compat.disableAdaptiveThinking is set", async () => {
		const adaptiveModel: Model<"anthropic-messages"> = buildModel({
			...baseModel,
			id: "claude-opus-4-7",
			reasoning: true,
			thinking: {
				mode: "anthropic-adaptive",
				efforts: [Effort.Minimal, Effort.Low, Effort.Medium, Effort.High, Effort.XHigh],
			},
			compat: { ...baseModel.compatConfig, disableAdaptiveThinking: true },
		} as ModelSpec<"anthropic-messages">);
		const params = await firstPayload<{ thinking?: { type?: string; budget_tokens?: number } }>(onPayload =>
			streamAnthropic(adaptiveModel, baseContext, {
				apiKey: "sk-ant-api-test",
				isOAuth: false,
				signal: abortedSignal(),
				thinkingEnabled: true,
				onPayload,
			}),
		);
		expect(params.thinking?.type).toBe("enabled");
		expect(typeof params.thinking?.budget_tokens).toBe("number");
	});
});

/**
 * The two cases `firstPayload` must keep apart, driven by a stream this file owns.
 *
 * Both directions are asserted against the helper rather than against a real
 * provider, because the real provider is exactly what cannot be relied on here:
 * the failure it causes only appears once an earlier file in the same process has
 * already contaminated something. A test that waits for that is a test that only
 * fails on someone else's bad day.
 */
describe("firstPayload does not conflate 'settled after a payload' with 'settled without one'", () => {
	it("rejects with the named cause when the stream settles and onPayload never ran", async () => {
		const settled = new AssistantMessageEventStream();
		const captured = firstPayload<{ marker: string }>(() => settled);
		settled.end(); // terminal event, with no payload ever produced
		await expect(captured).rejects.toThrow("onPayload never arrived");
	});

	it("still returns the payload when the stream settles AFTER onPayload ran", async () => {
		// The converse, and the one a naive "always throw when the stream ends"
		// implementation gets wrong: a stream that produced its payload and then
		// finished normally is a SUCCESS, not a failure.
		const settled = new AssistantMessageEventStream();
		const captured = firstPayload<{ marker: string }>(onPayload => {
			onPayload({ marker: "seen" });
			settled.end();
			return settled;
		});
		await expect(captured).resolves.toEqual({ marker: "seen" });
	});
});
