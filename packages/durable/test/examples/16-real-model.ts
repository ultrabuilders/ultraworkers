// A real model: stream an answer from OpenAI.
// Run from packages/durable (needs OPENAI_API_KEY):
//   node --conditions=source --experimental-strip-types test/examples/16-real-model.ts
import { BACKGROUND_CONTEXT } from "@ultraworkers/chord/context";
import type { Message } from "@oh-my-pi/pi-ai";
import type { Model } from "@oh-my-pi/pi-catalog/types";
import { streamOpenAIResponses } from "@oh-my-pi/pi-ai/providers/openai-responses";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { Effort } from "@oh-my-pi/pi-catalog/effort";
import { AssistantEntry, createRegistry, Harness, LiveDoc, type LiveState, MemoryStorage } from "../../src/index";
import type { ModelLookup } from "../../src/harness/types";

const context = BACKGROUND_CONTEXT;

/**
 * The four members a real host supplies.
 *
 * `pi` writes this as `createModels()` plus `models.setProvider(openaiProvider())`: this fork
 * has no provider registry to register into. `HarnessOptions.models` is the four-method
 * {@link ModelLookup}, so the wiring is written out instead of registered — `getModel` resolves
 * against the bundled catalog, `streamSimple` is the provider's own `StreamFunction`.
 *
 * `fetchDeferred`/`cancelDeferred` are the two members a provider may not have. This fork's
 * `openai-responses` provider does not implement them, so they are declared here rather than
 * left off the interface: an undeclared member would make both call sites untypeable. The
 * deferred path is only reached when a caller asks for `deferred: true`, which this example
 * does not, so refusing is the honest answer rather than a silent no-op.
 */
const models: ModelLookup = {
	getModel: (provider, modelId) => getBundledModel(provider as never, modelId),
	// A `StreamFunction` is typed to ONE api and takes its options as a REQUIRED
	// `OptionsForApi<...>`, while `ModelLookup.streamSimple` receives any `Model<Api>` and makes
	// options optional. So this member is a dispatch: narrow on `model.api`, resolve the key,
	// then hand over. That dispatch IS the replacement for the registry `pi` resolves the same
	// decision through, and writing it out is why the other three members are explicit too.
	//
	// Resolving the key is constrained, and the constraint is the interesting part.
	// `SimpleStreamOptions.apiKey` is a string OR an `ApiKeyResolver`, and a transport wants the
	// string — but `streamSimple` RETURNS the stream, so it cannot await anything. A host that
	// rotates credentials therefore resolves the key before it opens the run and passes the
	// string; this example reads `OPENAI_API_KEY` and does the same.
	streamSimple: (model, requestContext, options) => {
		if (model.api !== "openai-responses") {
			throw new Error(`this lookup has no transport for api "${model.api}"`);
		}
		const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
		if (typeof apiKey !== "string") {
			throw new Error("streamSimple returns the stream synchronously, so it needs a resolved apiKey string");
		}
		return streamOpenAIResponses(model as Model<"openai-responses">, requestContext, { ...options, apiKey });
	},
	fetchDeferred: async () => {
		throw new Error("the openai-responses provider does not implement deferred responses");
	},
	cancelDeferred: async () => {},
};

// Production code passes a lookup with real providers; the Harness never talks to a provider
// any other way. The provider reads OPENAI_API_KEY from the environment. While the answer
// streams, generation commits throttled partials to the conversation's pi.live document.
// Watching that document streams the answer; the watch sees only committed values.
if (process.env.OPENAI_API_KEY === undefined) {
	console.log("skipped: OPENAI_API_KEY is not set");
} else {
	const registry = createRegistry();
	registry.systemPrompt.section("preamble", () => "You are a concise assistant.", { tag: false });
	const harness = await Harness.open(new MemoryStorage(), { models, registry }, context);
	const root = await harness.root(context);
	await root.setModel({ provider: "openai", modelId: "gpt-5" }, context);
	await root.setThinkingLevel(Effort.High, context);
	const liveWatch = (await harness.watchDoc(LiveDoc, root.id, context))!;
	// Print only what each committed partial adds to the text printed so far.
	let printed = "";
	const printText = (text: string): void => {
		if (text.length <= printed.length || !text.startsWith(printed)) return;
		process.stdout.write(text.slice(printed.length));
		printed = text;
	};
	liveWatch.start(async value => {
		// The watch hands over the stored document as JSON, so both the document and the
		// partial inside it need narrowing before the message shape is usable — the same two
		// casts `harness-generation.test.ts` makes when it reads a committed partial.
		const state = value as LiveState | undefined;
		const partial = state?.generation?.message as Message | undefined;
		// `content` is a string OR a block array, so a partial read as a plain string is a real
		// case and not a type error to cast away — the same branch `textOf` takes in
		// `chat-support.ts`.
		const text =
			typeof partial?.content === "string"
				? partial.content
				: (partial?.content.find(content => content.type === "text") as { text: string } | undefined)?.text;
		if (typeof text === "string") printText(text);
	});
	harness.resume();
	process.stdout.write("answer: ");
	const poem = await root.submit({ type: "input", content: "Write a long poem" }, context);
	const settledPoem = await poem.wait(context);
	await liveWatch.stop();
	if (settledPoem.status === "done" && settledPoem.type === "input") {
		// The last throttle window may not have been committed as a partial; the answer entry has the rest.
		const entry = await root.commit(tx => tx.entry(AssistantEntry, settledPoem.answer), context);
		const message = entry?.model?.[0];
		const block =
			message?.role === "assistant" ? message.content.find(content => content.type === "text") : undefined;
		if (block?.type === "text") printText(block.text);
		process.stdout.write("\n");
	} else {
		console.log("unanswered:", settledPoem.reason, settledPoem.detail);
	}
	await harness.close(context);
}
