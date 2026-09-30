/**
 * `assertDerivable` — the mechanical half of "did the bytes we sent come from
 * the history we hold?"
 *
 * Each case below is a way the answer can be `no`. The regression this defends
 * against is not a crash: it is a provider request that quietly carries
 * something the session history does not account for, which surfaces much later
 * as a mysteriously cold prompt cache and no obvious cause.
 */
import { describe, expect, test } from "bun:test";
import type { AgentMessage } from "@oh-my-pi/pi-agent-core";
import { assertDerivable } from "@oh-my-pi/pi-agent-core/derivation-invariant";
import { prepareProviderCall } from "@oh-my-pi/pi-agent-core/agent-loop";
import type { Message } from "@oh-my-pi/pi-ai";

function user(text: string): AgentMessage {
	return { role: "user", content: [{ type: "text", text }], timestamp: 0 };
}

function assistant(text: string): AgentMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "m",
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: 0,
	};
}

/** The pipeline under test: a pure derivation, standing in for transform+convert. */
function derive(messages: readonly AgentMessage[]): Message[] {
	return messages.map(message =>
		message.role === "user"
			? ({ role: "user", content: message.content, timestamp: 0 } satisfies Message)
			: ({ role: "assistant", content: message.content, timestamp: 0 } satisfies Message),
	);
}

describe("assertDerivable", () => {
	test("a pipeline that is a pure function of its input passes, and stops passing when it stops being one", () => {
		// The contract is DETERMINISM, not "does not throw". Comparing
		// `derive(source)` against itself would only prove JSON.stringify is
		// stable, so this derives TWICE and checks the two agree — a claim that
		// goes red the moment someone makes `derive` close over mutable state,
		// which is the failure the invariant exists for.
		const source: AgentMessage[] = [user("hello"), assistant("hi")];
		const first = derive(source);
		const second = derive(source);
		expect(second).toEqual(first);

		let calls = 0;
		const drifting = (messages: readonly AgentMessage[]): Message[] => {
			calls++;
			return derive(messages).slice(0, calls === 1 ? messages.length : messages.length - 1);
		};
		const sent = drifting(source);
		expect(() => assertDerivable(sent, source, drifting)).toThrow(/log-reconstruction desync/);
	});

	test("key order alone is not a divergence", () => {
		// `JSON.stringify` compares key ORDER, so a message rebuilt with the same
		// fields in a different order serializes differently. The provider
		// receives identical bytes, so firing here would be a false positive —
		// and an invariant that cries wolf gets switched off, taking the real
		// divergence with it.
		const source: AgentMessage[] = [user("hello")];
		const sent: Message[] = [{ content: [{ type: "text", text: "hello" }], role: "user", timestamp: 0 } as Message];
		expect(() => assertDerivable(sent, source, derive)).not.toThrow();
	});

	test("a field difference is reported by name, not as two identical roles", () => {
		// The readability half of the same problem. Reporting only the role
		// produces "sent user, derived user" and leaves the reader with no idea
		// what to look at.
		const source: AgentMessage[] = [user("hello")];
		const sent: Message[] = [{ role: "user", content: [{ type: "text", text: "goodbye" }], timestamp: 0 }];
		expect(() => assertDerivable(sent, source, derive)).toThrow(/field "content"/);
	});

	test("throws when the sent messages carry an edit the source does not", () => {
		// The regression: something mutated or appended after the derivation ran.
		// `sent` here is a *different* history wearing the same request.
		const source: AgentMessage[] = [user("hello")];
		const sent: Message[] = [
			...derive(source),
			{ role: "user", content: [{ type: "text", text: "injected" }], timestamp: 0 },
		];
		expect(() => assertDerivable(sent, source, derive)).toThrow(/log-reconstruction desync/);
	});

	test("throws when a message is silently rewritten in place", () => {
		// The subtler version: same length, same roles, different content. A
		// length-only check would pass this.
		const source: AgentMessage[] = [user("original")];
		const sent: Message[] = [{ role: "user", content: [{ type: "text", text: "rewritten" }], timestamp: 0 }];
		expect(() => assertDerivable(sent, source, derive)).toThrow(/log-reconstruction desync/);
	});

	test("throws when the same length diverges at a later index", () => {
		// The reason the failure names an index: a reader starts there, not at
		// the top of a two-sided dump of a multi-megabyte transcript.
		const source: AgentMessage[] = [user("first"), assistant("second"), user("third")];
		const sent: Message[] = derive([user("first"), assistant("CHANGED"), user("third")]);
		expect(() => assertDerivable(sent, source, derive)).toThrow(/at message 1/);
	});

	test("a non-deterministic derivation is caught, not tolerated", () => {
		// The case the invariant exists for: `transformContext` closing over
		// mutable state, so two runs over the same input differ. This is not a
		// bug the caller can see by reading the request.
		let call = 0;
		const unstable = (messages: readonly AgentMessage[]): Message[] => {
			call++;
			return derive(messages).slice(0, call === 1 ? messages.length : messages.length - 1);
		};
		const source: AgentMessage[] = [user("a"), assistant("b")];
		const sent = unstable(source);
		expect(() => assertDerivable(sent, source, unstable)).toThrow(/log-reconstruction desync/);
	});
});

describe("the wired path", () => {
	test("prepareProviderCall's own pipeline is reproducible from the context it was handed", async () => {
		// Uses the loop's REAL pipeline rather than a stand-in, so the test cannot
		// pass while the wired path does something else. A rebuilt pipeline in the
		// test would be a second thing to keep in sync — the exact failure mode the
		// invariant is meant to detect.
		const config = {
			model: { id: "m", provider: "anthropic", api: "anthropic-messages" },
			convertToLlm: (messages: AgentMessage[]) => derive(messages),
		} as never;
		const context = { messages: [user("hello"), assistant("hi")], systemPrompt: ["sys"] };

		const prepared = await prepareProviderCall(context as never, config, undefined);
		const expected = derive((context as { messages: AgentMessage[] }).messages);
		expect(prepared.context.messages).toEqual(expected);
	});

	test("with the flag unset the invariant is live, so a drifting pipeline throws at the call site", async () => {
		// The reason the flag is on under test rather than off. An invariant nothing
		// turns on is a gate that can never fire, and the "0 desyncs" measurement
		// behind option A only means something if it is re-checked on every run
		// instead of remembered.
		//
		// Asserting the resolved boolean would be asserting a default literal. What
		// is worth defending is the CONSEQUENCE: leaving the flag unset means the
		// check actually executes, so a converter that stops being a pure function
		// of its input fails here rather than sending a history the session does
		// not hold.
		let call = 0;
		const drifting = (messages: AgentMessage[]) => {
			call++;
			const converted = derive(messages);
			return call === 1 ? converted : converted.slice(0, converted.length - 1);
		};
		const config = {
			model: { id: "m", provider: "anthropic", api: "anthropic-messages" },
			convertToLlm: drifting,
		} as never;
		const context = { messages: [user("hello"), assistant("hi")], systemPrompt: ["sys"] } as never;

		await expect(prepareProviderCall(context, config, undefined)).rejects.toThrow(/log-reconstruction desync/);
	});

	test("an explicit false is honoured, so the production path stays reachable", async () => {
		// The negative half, and it is load-bearing rather than decorative: the
		// plan forbids making this permanently on, because a legal `context` hook
		// is allowed to rewrite messages by design
		// (`shared-events.ts:176-179`). Without an escape hatch that session shape
		// dies on the check. This is what a host turns off.
		const call = () => {
			let calls = 0;
			return (messages: AgentMessage[]) => {
				calls++;
				const converted = derive(messages);
				return calls === 1 ? converted : converted.slice(0, converted.length - 1);
			};
		};
		const config = {
			model: { id: "m", provider: "anthropic", api: "anthropic-messages" },
			convertToLlm: call(),
			derivationInvariant: false,
		} as never;
		const context = { messages: [user("hello"), assistant("hi")], systemPrompt: ["sys"] } as never;

		const prepared = await prepareProviderCall(context, config, undefined);
		expect(prepared.context.messages).toHaveLength(2);
	});

	test("a pipeline with a transformContext is not auto-checked, so extension handlers run once", async () => {
		// The cost that made the automatic half narrow. `transformContext` is where
		// extension `context` handlers run — `sdk.ts` wires it to
		// `extensionRunner.emitContext` — so re-deriving would execute arbitrary
		// extension code a second time per request, and the check would perturb the
		// very pipeline it is measuring. `coding-agent` always sets one, which is
		// why an unqualified test-runtime default would have leaked this into
		// another package's suite.
		let transformCalls = 0;
		const context = { messages: [user("hello"), assistant("hi")], systemPrompt: ["sys"] } as never;
		const config = {
			model: { id: "m", provider: "anthropic", api: "anthropic-messages" },
			transformContext: (messages: AgentMessage[]) => {
				transformCalls++;
				return messages;
			},
			convertToLlm: (messages: AgentMessage[]) => derive(messages),
		} as never;

		await prepareProviderCall(context, config, undefined);
		expect(transformCalls).toBe(1);
	});

	test("a pure transformContext is still checkable when the flag asks for it", async () => {
		// The half a host opts into on purpose. Narrowing the automatic default
		// must not make the transform case unreachable, or the one seam this
		// invariant exists to police could never be tested.
		let calls = 0;
		const context = { messages: [user("hello"), assistant("hi")], systemPrompt: ["sys"] } as never;
		const config = {
			model: { id: "m", provider: "anthropic", api: "anthropic-messages" },
			transformContext: (messages: AgentMessage[]) => messages,
			convertToLlm: (messages: AgentMessage[]) => {
				calls++;
				const converted = derive(messages);
				return calls === 1 ? converted : converted.slice(0, converted.length - 1);
			},
			derivationInvariant: true,
		} as never;

		await expect(prepareProviderCall(context, config, undefined)).rejects.toThrow(/log-reconstruction desync/);
	});
});
