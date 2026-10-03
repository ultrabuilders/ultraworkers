import type { Context } from "@ultraworkers/chord";
import type { Message } from "@oh-my-pi/pi-ai";
import type { FauxProviderHandle, FauxResponseStep, RegisterFauxProviderOptions } from "@oh-my-pi/pi-ai/testing";
import { fauxProvider } from "@oh-my-pi/pi-ai/testing";
import {
	type Conversation,
	ConversationConfig,
	createRegistry,
	type EntryRecord,
	Harness,
	type Registry,
	type Storage,
} from "@ultraworkers/pi-durable";
import type { ModelLookup } from "../src/harness/types";
import { context } from "./session-support";
// `waitFor` already lives in `task-support.ts`; pi ships a second copy here. Re-export the
// existing one instead of forking it a third time.
export { waitFor } from "./task-support";

/**
 * The provider name a faux harness looks its model up under.
 *
 * `pi` reads this off `faux.provider`. The `FauxProviderHandle` here does not carry a provider
 * field — this fork has no provider registry to register into — so the same default is spelled
 * out. It tracks `RegisterFauxProviderOptions.provider`, which is what overrides it.
 */
const FAUX_PROVIDER = "faux";
const FAUX_MODEL_ID = "faux-1";

/**
 * A `ModelLookup` backed by the faux double.
 *
 * This is the seam `pi` reaches through `models.setProvider(faux.provider)`: there,
 * `createModels()` returns a `Models` registry and registering the faux provider makes
 * `getModel` resolve and `streamSimple` dispatch to it. This fork replaced that registry with the
 * four-method `ModelLookup`, so there is nothing to register into and dispatch happens by naming
 * `streamSimple` at the call site. The composition below is the same wiring expressed directly.
 *
 * `getModel` stays strict on the provider name so a test that configures a different provider
 * takes the documented `failNoModel` path instead of silently streaming from the faux.
 */
function fauxLookup(faux: FauxProviderHandle, provider: string): ModelLookup {
	return {
		getModel: (requested, modelId) => (requested === provider ? faux.getModel(modelId) : undefined),
		streamSimple: (model, requestContext, options) => faux.streamSimple(model, requestContext, options),
		fetchDeferred: (model, handle, options) => faux.fetchDeferred(model, handle, options),
		cancelDeferred: (model, handle, options) => faux.cancelDeferred(model, handle, options),
	};
}

/** Faux models and a registry that survive a close/reopen, like a host process's own objects. */
export type ChatSetup = {
	readonly faux: FauxProviderHandle;
	readonly models: ModelLookup;
	readonly registry: Registry;
	readonly reports: unknown[];
	now: () => number;
};

export function chatSetup(options: RegisterFauxProviderOptions = {}): ChatSetup {
	const faux = fauxProvider(options);
	return {
		faux,
		models: fauxLookup(faux, options.provider ?? FAUX_PROVIDER),
		registry: createRegistry(),
		reports: [],
		now: () => Date.now(),
	};
}

/** Open a Harness over `storage` and return its root, configured with the faux model on first creation. */
export async function openChat(
	storage: Storage,
	setup: ChatSetup,
): Promise<{ readonly harness: Harness; readonly root: Conversation }> {
	const harness = await Harness.open(
		storage,
		{
			models: setup.models,
			registry: setup.registry,
			now: () => setup.now(),
			onReport: error => setup.reports.push(error),
		},
		context,
	);
	const root = await harness.root(context, {
		init: async (tx, id) => {
			(await tx.doc(ConversationConfig, id)).model = { provider: FAUX_PROVIDER, modelId: FAUX_MODEL_ID };
		},
	});
	return { harness, root };
}

/** Raw entries of a conversation, oldest first. */
export async function allEntries(conversation: Conversation, callContext: Context = context): Promise<EntryRecord[]> {
	const page = await conversation.entries({}, 1000, undefined, callContext);
	return [...page.items].reverse();
}

/**
 * Text of the first text content of a message.
 *
 * `pi` also returns `undefined` for the `system` role. That arm is gone with the role: this
 * fork's `Message` union is `UserMessage | DeveloperMessage | AssistantMessage | ToolResultMessage`,
 * so the comparison would not typecheck. See the same note on `describeMessage` in
 * `harness-support.ts`, and `epic-zczk`.
 */
export function textOf(message: Message | undefined): string | undefined {
	if (message === undefined) return undefined;
	if (typeof message.content === "string") return message.content;
	const text = message.content.find(content => content.type === "text");
	return text?.type === "text" ? text.text : undefined;
}

/**
 * Faux response that never answers; the run stays busy until its generation is cancelled. `reached` resolves once the
 * request was sent, after the generation's preparation and request commits.
 */
export function unanswered(): { readonly step: FauxResponseStep; readonly reached: Promise<void> } {
	const { promise, resolve } = Promise.withResolvers<void>();
	const step: FauxResponseStep = (_context, options) =>
		new Promise((_, reject) => {
			resolve();
			const signal = options!.signal!;
			signal.addEventListener("abort", () => reject(signal.reason), { once: true });
		});
	return { step, reached: promise };
}
