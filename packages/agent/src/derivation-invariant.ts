/**
 * The machine-checkable answer to "did the bytes we sent to the model actually
 * come from the history we hold?"
 *
 * @module
 *
 * dsh answers this structurally: its session log is the only source of truth,
 * every request is a pure derivation from that log, and
 * `packages/core/agent-loop/src/invariant.ts` installs a listener on
 * `llm/stream` that compares the outgoing messages against
 * `session.deriveMessages()` on every request. Divergence is red, every time.
 *
 * omp has no such log — `deriveMessages` and `surfaceOp` have zero hits here —
 * so this is option A from the plan: keep the current session model and check
 * the one thing that can be checked mechanically, which is that a request built
 * from a context is reproducible from that same context through the same
 * pipeline. It turns a feeling into a failure, without claiming to be the
 * architectural inversion (option B), which the plan's own measurement says is
 * not yet justified: 5 of 7 hold state separately, but fork and compaction
 * diverge deliberately and telemetry/replay are observation records, not a
 * second source to derive from.
 *
 * Deliberately pure — no state, no logging, no I/O. It either returns or
 * throws, and the caller decides what a failure means.
 */

import type { AgentMessage } from "./types";
import type { Message } from "@oh-my-pi/pi-ai";

/**
 * Compare the messages about to be sent against a fresh derivation of the
 * source context, and throw when they differ.
 *
 * The comparison happens on **post-convert** `Message[]`, never on the
 * pre-convert `AgentMessage[]`. `convertToLlm` deliberately drops custom
 * message types (their incomplete thinking is not replayable), so comparing
 * before it would report a difference that is the converter working as
 * designed.
 *
 * @param sent - The messages handed to the provider, post-convert.
 * @param source - The pre-convert context they were derived from. Must be a
 *   snapshot taken BEFORE the pipeline ran: re-deriving from the value the
 *   pipeline already produced compares a derivation with itself, which agrees by
 *   construction and catches nothing.
 * @param derive - The derivation to re-run, normally the loop's own
 *   `transformContext` followed by `convertToLlm`. Synchronous by design: an
 *   async one that is not awaited would stringify a Promise to `{}` and report a
 *   desync that is not there, which is worse than no check at all. Callers
 *   `await` their own pipeline and pass the resolved array.
 * @throws Error when the two disagree.
 */
export function assertDerivable(
	sent: readonly Message[],
	source: readonly AgentMessage[],
	derive: (messages: readonly AgentMessage[]) => readonly Message[],
): void {
	const expected = derive(source);
	const difference = firstDifference(sent, expected);
	if (difference.kind === "equal") return;
	throw new Error(describeDesync(sent, expected, difference));
}

/** Where two message lists first stop agreeing. */
type Difference =
	| { readonly kind: "equal" }
	| {
			readonly kind: "index";
			readonly index: number;
			readonly sent: Message | undefined;
			readonly expected: Message | undefined;
	  }
	| { readonly kind: "keys"; readonly index: number; readonly key: string };

/**
 * Structural comparison, deliberately NOT `JSON.stringify`.
 *
 * Serialization compares key ORDER as well as values, so `{role, content}` and
 * `{content, role}` read as different messages — and `normalizeMessagesForProvider`
 * rebuilds messages, so that reordering happens on the ordinary path. That is a
 * false positive: the provider receives the same bytes either way, and an
 * invariant that fires on a key ordering will be switched off by the first
 * person it cries wolf on, taking the real divergence with it.
 */
function firstDifference(sent: readonly Message[], expected: readonly Message[]): Difference {
	const limit = Math.max(sent.length, expected.length);
	for (let index = 0; index < limit; index++) {
		const a = sent[index];
		const b = expected[index];
		if (a === undefined || b === undefined) return { kind: "index", index, sent: a, expected: b };
		if (a === b) continue;
		const key = firstDifferingKey(a, b);
		if (key !== undefined) return { kind: "keys", index, key };
	}
	return { kind: "equal" };
}

/** The first top-level key whose values differ, so a reader knows where to look. */
function firstDifferingKey(a: Message, b: Message): string | undefined {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
	for (const key of [...keys].sort()) {
		if (canonical(a, key) !== canonical(b, key)) return key;
	}
	return undefined;
}

/**
 * One field of a message, serialized with object keys in sorted order.
 *
 * Sorting at EVERY level, not just the top: the field being compared is usually
 * an array of content blocks, and a provider normalizer that rebuilds those
 * blocks would otherwise reintroduce the same false positive one level down.
 */
function canonical(message: Message, key: string): string {
	return JSON.stringify(sorted((message as unknown as Record<string, unknown>)[key]));
}

function sorted(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sorted);
	if (value !== null && typeof value === "object") {
		const source = value as Record<string, unknown>;
		return Object.fromEntries(
			Object.keys(source)
				.sort()
				.map(key => [key, sorted(source[key])]),
		);
	}
	return value;
}

/**
 * Name the divergence rather than dumping both arrays.
 *
 * The first differing index is the useful fact: it is where a reader starts
 * looking. A raw diff of two multi-megabyte transcripts is unreadable, and an
 * invariant nobody can read is an invariant nobody trusts.
 */
function describeDesync(sent: readonly Message[], expected: readonly Message[], difference: Difference): string {
	const prefix = "llm request diverges from the dispatch-time durable derivation (log-reconstruction desync)";
	const counts = `sent ${sent.length} messages, derived ${expected.length}`;
	if (difference.kind === "index") {
		return `${prefix} at message ${difference.index}: sent ${describe(difference.sent)}, derived ${describe(difference.expected)} (${counts})`;
	}
	// A key-level difference. Printing only the role would report
	// "sent user, derived user" and leave the reader with two identical-looking
	// values and no explanation, so name the field that actually differs.
	return `${prefix} at message ${difference.index}, field "${difference.key}": sent ${field(difference.sent, difference.key)}, derived ${field(difference.expected, difference.key)} (${counts})`;
}

function describe(message: Message | undefined): string {
	if (message === undefined) return "<absent>";
	return `${message.role}`;
}

function field(message: Message | undefined, key: string): string {
	if (message === undefined) return "<absent>";
	return JSON.stringify((message as unknown as Record<string, unknown>)[key]);
}
