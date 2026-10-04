import type { AssistantMessageEventStream, Message, Model } from "../types";

/**
 * What a test needs in order to open a harness: resolve a model by id, and stream one turn.
 *
 * This is the same four methods `packages/durable` calls through its `ModelLookup`, restated here
 * because this package cannot import that one — test support depending on the product it supports
 * is the correct direction, never the reverse.
 *
 * It is deliberately *not* `pi`'s `Models`. That registry (`packages/ai/src/models.ts`, 1256 lines
 * of provider lookup, auth resolution and model refresh) does not exist in this fork: providers
 * register through `registerCustomApi` (`src/registry/api-registry.ts`) and callers reach a stream
 * by naming `streamSimple` directly. Adding a `Provider` abstraction here to make a test double
 * run would be a production concept invented to serve a test.
 */
export interface TestingModelLookup {
	/** Resolve a model by the `(provider, modelId)` pair a harness looks up. */
	getModel(provider: string, modelId: string): Model | undefined;
	/** Stream one assistant turn for `model`. */
	streamSimple(model: Model, context: { messages: Message[] }, options?: unknown): AssistantMessageEventStream;
	/** Resume a deferred generation from `handle`. */
	fetchDeferred(model: Model, handle: unknown, options?: { signal?: AbortSignal }): Promise<unknown>;
	/** Abandon a deferred generation. Safe to call for a handle that already settled. */
	cancelDeferred(model: Model, handle: unknown, options?: { signal?: AbortSignal }): Promise<void>;
}

/**
 * An empty model registry — the "nothing is configured" state, which is what a test means when it
 * asks for one.
 *
 * `getModel` misses, and a harness reads a miss as its documented `failNoModel` path
 * (`packages/durable/src/harness/generation.ts`) rather than generating. Streaming throws instead
 * of returning an empty stream: a test that reaches it meant to generate, and an empty stream
 * would let it pass while asserting nothing.
 *
 * @see `packages/durable/test/harness-support.ts`, which documents the same substitution from the
 * consuming side.
 */
export function createModels(): TestingModelLookup {
	return {
		getModel: () => undefined,
		streamSimple: () => {
			throw new Error("no model configured: nothing to stream");
		},
		fetchDeferred: () => Promise.reject(new Error("no model configured: nothing to resume")),
		cancelDeferred: () => Promise.resolve(),
	};
}
