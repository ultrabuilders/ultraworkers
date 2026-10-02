import type { AssistantMessage, Message, StopReason, ToolCall, ToolResultMessage, UserMessage } from "@oh-my-pi/pi-ai";
import { type } from "@oh-my-pi/pi-ai";
import { createRegistry, Harness, type Registry, type Storage, type ToolRegistration } from "@oh-my-pi/pi-durable";
import type { ModelLookup } from "../src/harness/types";
import { context } from "./session-support";

/**
 * A lookup that knows of no model.
 *
 * `pi` opens its test harness with `createModels()` — an empty registry. That is not a provider
 * standing in for a real one; it is the "nothing is configured" state, and the harness reads it
 * as such: generation calls `getModel`, and on a miss takes the documented `failNoModel` path
 * (`src/harness/generation.ts`). The tests here assert session bookkeeping, not model output.
 *
 * Copying `createModels` would mean porting pi-ai's `Models`, which this repo deliberately
 * replaced with `ModelLookup` — see the docblock on that interface for the three differences
 * that made it necessary. So the miss is expressed here instead of being imported.
 *
 * `streamSimple` throws rather than returning an empty stream: a test that reaches it was meant
 * to generate, and an empty stream would let it pass while asserting nothing.
 */
export function noModels(): ModelLookup {
	return {
		getModel: () => undefined,
		streamSimple: () => {
			throw new Error("no model configured: this harness never generates");
		},
		fetchDeferred: () => Promise.reject(new Error("no model configured: nothing to resume")),
		cancelDeferred: () => Promise.resolve(),
	};
}

export function tool(name: string, description = `${name} tool`): ToolRegistration {
	return { name, description, parameters: type({}), execute: async () => ({ content: [] }) };
}

/** Open a Harness with a fresh registry holding the named tools. */
export async function openHarness(
	storage: Storage,
	toolNames: readonly string[] = [],
	options: { readonly registry?: Registry; readonly onReport?: (error: unknown) => void } = {},
): Promise<{ readonly harness: Harness; readonly registry: Registry }> {
	const registry = options.registry ?? createRegistry();
	for (const name of toolNames) registry.tools.add(tool(name));
	const harness = await Harness.open(
		storage,
		{ models: noModels(), registry, ...(options.onReport === undefined ? {} : { onReport: options.onReport }) },
		context,
	);
	return { harness, registry };
}

export function user(text: string): UserMessage {
	return { role: "user", content: text, timestamp: 1 };
}

export function assistant(
	text: string,
	options: { readonly calls?: readonly string[]; readonly stopReason?: StopReason } = {},
): AssistantMessage {
	const calls: ToolCall[] = (options.calls ?? []).map(id => ({
		type: "toolCall",
		id,
		name: `tool-${id}`,
		arguments: {},
	}));
	return {
		role: "assistant",
		content: [{ type: "text", text }, ...calls],
		api: "faux",
		provider: "faux",
		model: "faux",
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: options.stopReason ?? (calls.length > 0 ? "toolUse" : "stop"),
		timestamp: 2,
	};
}

export function toolResult(id: string, text = `result ${id}`): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: id,
		toolName: `tool-${id}`,
		content: [{ type: "text", text }],
		isError: false,
		timestamp: 3,
	};
}

/**
 * Compact message rendering for assertions.
 *
 * `pi` also renders a `system` case, keyed on the named `sections` a `SystemMessage` carries.
 * That role has no counterpart here: this fork's `Message` union is
 * `UserMessage | DeveloperMessage | AssistantMessage | ToolResultMessage`, and `DeveloperMessage`
 * carries no `sections` and no `toolsAdded`. `src/harness/prompt.ts` already fails to typecheck
 * against that gap, so this switch cannot grow a `system` arm until pi-ai grows the type — see
 * `epic-zczk`.
 */
export function describeMessage(message: Message): string {
	switch (message.role) {
		case "user":
			return `user:${message.content as string}`;
		case "developer":
			return `developer:${typeof message.content === "string" ? message.content : ""}`;
		case "assistant": {
			const text = message.content.find(content => content.type === "text");
			return `assistant:${text?.type === "text" ? text.text : ""}`;
		}
		case "toolResult": {
			const text = message.content.find(content => content.type === "text");
			return `result:${message.toolCallId}:${message.isError ? "error" : text?.type === "text" ? text.text : ""}`;
		}
	}
}
