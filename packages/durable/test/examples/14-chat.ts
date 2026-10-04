// A chat turn.
// Run from packages/durable:
//   node --conditions=source --experimental-strip-types test/examples/14-chat.ts
import { exampleModels } from "./models";
import { BACKGROUND_CONTEXT } from "@ultraworkers/chord/context";
import { fauxAssistantMessage, fauxProvider } from "@oh-my-pi/pi-ai/testing";
import { AssistantEntry, ConversationConfig, createRegistry, Harness, MemoryStorage } from "../../src/index";

const context = BACKGROUND_CONTEXT;

// The faux provider stands in for a real model (see 16-real-model.ts).
const faux = fauxProvider();
faux.setResponses([fauxAssistantMessage("Paris.")]);

const registry = createRegistry();
registry.systemPrompt.section("preamble", () => "You answer in one word.", { tag: false });
const harness = await Harness.open(new MemoryStorage(), { models: exampleModels(faux), registry }, context);
const root = await harness.root(context, {
	init: async (tx, id) => {
		(await tx.doc(ConversationConfig, id)).model = { provider: "faux", modelId: "faux-1" };
	},
});

// submit() durably admits user input and returns a Submission. The built-in
// pi.generation task prepares the system prompt from the registry's sections,
// calls the model, and appends the answer; wait() resolves once the input is
// answered or has failed.
const capital = await root.submit({ type: "input", content: "Capital of France?" }, context);
const answered = await capital.wait(context);
if (answered.status === "done" && answered.type === "input") {
	const entry = await root.commit(tx => tx.entry(AssistantEntry, answered.answer), context);
	const reply = entry?.model?.[0];
	console.log("answer:", reply?.role === "assistant" ? reply.content : reply);
}

// The transcript holds the user input, the positional system prompt, and the answer.
const transcript = await root.entries({}, 10, undefined, context);
console.log(
	"transcript:",
	[...transcript.items].reverse().map(entry => entry.kind),
);
await harness.close(context);
