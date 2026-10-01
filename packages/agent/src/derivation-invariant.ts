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
 * Take the source snapshot a derivation is checked against.
 *
 * Deep, not shallow — and the reason is narrower than it first looks. A mutation
 * made *inside* the pipeline does not need this: the re-derivation runs the same
 * transform over the same input and reproduces it, so a `slice()` catches that
 * already. What a shallow copy cannot survive is a mutation from *outside* the
 * pipeline, landing after the snapshot and before the send. A `slice()` shares
 * every message object with the live context, so that edit would reach the
 * snapshot too, both sides would agree, and the check would certify a history
 * that never existed.
 *
 * The published signature does not rule that out: `convertToLlm` is typed
 * `(messages: AgentMessage[]) => Message[]`, which permits mutation and merely
 * declines to require it.
 *
 * Affordable because the snapshot only exists while the check runs, which by
 * default means under test — production never pays for it.
 *
 * Falls back to a shallow copy when a message carries something
 * `structuredClone` rejects (`ToolResultMessage.details` and `ProviderPayload`
 * both can): a weaker snapshot still catches structural mutations, and failing
 * closed would drop a session over a diagnostic value.
 */
export function snapshotForDerivation(messages: readonly AgentMessage[]): AgentMessage[] {
	try {
		return structuredClone([...messages]);
	} catch {
		return [...messages];
	}
}

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
 * @param derive - Re-runs the pipeline over a source taken BEFORE the real one
 *   ran (see {@link snapshotForDerivation}). Synchronous by design: an async
 *   one that is not awaited would stringify a Promise to `{}` and report a
 *   desync that is not there, which is worse than no check at all. Callers
 *   `await` their own pipeline and pass the resolved array.
 * @throws Error when the two disagree.
 */
export function assertDerivable(sent: readonly Message[], derive: () => readonly Message[]): void {
	const expected = derive();
	const difference = firstDifference(sent, expected);
	if (difference.kind === "equal") return;
	throw new Error(describeDesync(sent, expected, difference));
}

/** Where two message lists first stop agreeing. */
type Difference =
	| { readonly kind: "equal" }
	| { readonly kind: "index"; readonly index: number }
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
		if (a === undefined || b === undefined) return { kind: "index", index };
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

/**
 * Recursively rebuild a value with object keys in sorted order.
 *
 * Cycle-safe because tool results carry a `details` object that extensions are
 * free to make cyclic, and the provider path tolerates that. Without the guard
 * this recurses until the stack gives out, so a message referencing itself would
 * make the *diagnostic* fail instead of the thing it is meant to diagnose —
 * turning a survivable payload into a crash. Re-entering a value already on the
 * path becomes `[circular]`, so two different cyclic payloads still differ.
 */
function sorted(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
	if (Array.isArray(value)) {
		if (seen.has(value)) return "[circular]";
		seen.add(value);
		return value.map(item => sorted(item, seen));
	}
	if (value !== null && typeof value === "object") {
		if (seen.has(value)) return "[circular]";
		seen.add(value);
		const source = value as Record<string, unknown>;
		return Object.fromEntries(
			Object.keys(source)
				.sort()
				.map(key => [key, sorted(source[key], seen)]),
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
 *
 * The parameter excludes `"equal"` so the compiler — not a comment — refuses to
 * let a no-difference case reach a formatter with no index to report. The two
 * arrays are re-read at `difference.index` rather than carried on the union: a
 * key-level difference has no `sent`/`expected` of its own to print, and adding
 * them to every variant would widen the surface for no gain.
 */
function describeDesync(
	sent: readonly Message[],
	expected: readonly Message[],
	difference: Exclude<Difference, { kind: "equal" }>,
): string {
	const prefix = "llm request diverges from the dispatch-time durable derivation (log-reconstruction desync)";
	const counts = `sent ${sent.length} messages, derived ${expected.length}`;
	if (difference.kind === "index") {
		return `${prefix} at message ${difference.index}: sent ${describe(sent[difference.index])}, derived ${describe(expected[difference.index])} (${counts})`;
	}
	// A key-level difference. Printing only the role would report
	// "sent user, derived user" and leave the reader with two identical-looking
	// values and no explanation, so name the field that actually differs.
	return `${prefix} at message ${difference.index}, field "${difference.key}": sent ${field(sent[difference.index], difference.key)}, derived ${field(expected[difference.index], difference.key)} (${counts})`;
}

function describe(message: Message | undefined): string {
	if (message === undefined) return "<absent>";
	return `${message.role}`;
}

function field(message: Message | undefined, key: string): string {
	if (message === undefined) return "<absent>";
	return JSON.stringify((message as unknown as Record<string, unknown>)[key]);
}
