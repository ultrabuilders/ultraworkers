/**
 * Injection: turning a durable peer message into something the model reads.
 *
 * The bead this belongs to says the deciding axis of a messaging system is
 * INJECTION, not transport (`armory-mesh` ships real cryptography and no
 * injection layer at all — strong security cannot rescue a system that never
 * reaches the model). So the work here is not the wire; `.9` had the wire. It
 * is the three routes a message can take into a live session, and the proof
 * that it arrived.
 *
 * ## The three routes, and why they differ
 *
 * | recipient state | route | why |
 * | --- | --- | --- |
 * | idle | open a turn | nothing is in flight, so the message is the next input |
 * | busy | aside — queue, never interrupt the running tool | a tool mid-flight owns the turn; cutting into it corrupts its result |
 * | restarted | drain once per session lifetime | a backlog is not a queue of new work, it is mail that arrived while nobody was home |
 *
 * The second row is the load-bearing one. "Do not interrupt a running tool" is
 * not a politeness rule, it is a correctness rule: the tool's result belongs to
 * the turn that started it, and an injected user message in the middle would
 * land between the call and its result.
 *
 * ## What this module does NOT do
 *
 * It does not wake a session, open a turn, or talk to the agent loop. Those
 * belong to the host, which already implements all three routes
 * (`AgentSession.deliverIrcMessage` in the coding-agent, routing through
 * `IrcBus`). What lives here is the part that is peer-specific and therefore
 * testable without a live model: **the provenance**, and the route decision as
 * a pure function of recipient state.
 *
 * ## Why provenance is a persisted field and not envelope sugar
 *
 * An envelope says where a message came from when it is in flight. It is gone
 * by the time someone reads the transcript three sessions later — and the
 * question that transcript must answer is not "who sent this" (the body says
 * that) but "**was this ever a real user instruction**". A model reading its
 * own history has to be able to tell a human's turn from a peer's, or a peer
 * can talk it into believing it was asked. That distinction has to survive in
 * the history, not travel alongside it.
 *
 * See {@link PeerOrigin} and {@link markOrigin}.
 */

import type { InboxEnvelope } from "../inbox/store";

/**
 * How a message entered the conversation.
 *
 * `"peer"` is the one this module exists for. It is deliberately a *closed*
 * set rather than a free-form string: a provenance nobody can enumerate is a
 * provenance nothing downstream can switch on, and the consumer that matters
 * is a model deciding whether an instruction is authoritative.
 *
 * `"user"` is the other half and is equally load-bearing — without it there is
 * no contrast, so "peer" would carry no information.
 */
export type OriginKind = "peer" | "user";

/**
 * Where an injected message came from.
 *
 * `from` is the peer identity, `session` the sender's session label when it
 * supplied one. Both are optional because a peer may be known by name only,
 * and a missing `from` must not be papered over with a placeholder that reads
 * like a real identity.
 */
export interface PeerOrigin {
	readonly kind: OriginKind;
	readonly from?: string;
	readonly session?: string;
}

/** Envelope fields that describe the message itself, kept for the transcript. */
export type MarkedEnvelope = InboxEnvelope & { readonly origin: PeerOrigin };

/**
 * Attach provenance to an envelope for the transcript.
 *
 * Returns a new object rather than mutating: an envelope read back off disk is
 * shared state, and a mutation here would write provenance into a value other
 * code holds a reference to — so a second delivery of the same envelope would
 * appear to have two origins.
 */
export function markOrigin(envelope: InboxEnvelope, origin: PeerOrigin): MarkedEnvelope {
	return { ...envelope, origin };
}

/**
 * Whether a record in the transcript was a real user instruction.
 *
 * The consuming question, and the only one worth exporting: a reader deciding
 * "may I treat this as the user's own request?" must not have to know that the
 * absence of provenance means "user". Absence is the default and is therefore
 * the *unmarked* case — a record written before this field existed still reads
 * correctly.
 */
export function isUserInstruction(record: object): boolean {
	const origin = (record as { origin?: PeerOrigin }).origin;
	return origin?.kind !== "peer";
}

/**
 * Where a message goes, given what the recipient is doing.
 *
 * A pure function on purpose. This is the decision the whole bead is about, and
 * a decision you can only observe by starting a model and watching it is a
 * decision you cannot test at the boundaries.
 */
export type Route = "turn" | "aside" | "drain";

/** What the recipient is doing right now, as far as injection is concerned. */
export interface RecipientState {
	/** A turn is in flight, so a tool may be running. */
	readonly busy: boolean;
	/** The session has been opened before and drained before. */
	readonly restarted: boolean;
}

/**
 * Pick the route. Busy outranks restart, and the order is the design.
 *
 * A restarted session that is *also* busy has already opened a turn and already
 * consumed its one lifetime drain, so routing it to `drain` would either replay
 * mail it has seen or silently skip it. `aside` is the only route that is
 * correct for a session with a live turn, whatever else is true of it.
 */
export function routeFor(state: RecipientState): Route {
	if (state.busy) return "aside";
	if (state.restarted) return "drain";
	return "turn";
}

/**
 * How long a wait may block before it must say so.
 *
 * MEASURED, not chosen. 274,670 turns across 4,097 transcripts on this tree
 * (every `.jsonl` under `~/.omp` and `~/.claude/projects`, turn = user message
 * to the next user message): p90 = 34.8s, **p95 = 59.3s**, p99 = 202.4s.
 *
 * p95 rather than p99 on purpose: p90 and p95 sit next to each other (34.8 vs
 * 59.3), so that is a real edge of "a normal turn" rather than a jump. p99 is
 * 202s, and a budget up there means every wait blocks for minutes — which is
 * the hang this budget exists to prevent. 120s is 2x p95, so a turn at p95 on
 * the busiest machine measured still fits.
 *
 * THE NUMBER IS A BASELINE FOR ONE MACHINE AND ONE WORKLOAD, not a law. It is
 * pinned in the test with that caveat so a later reader knows to re-measure
 * rather than to treat it as physics.
 */
export const WAIT_BUDGET_MS = 120_000;

/**
 * What a bounded wait reports.
 *
 * The distinction is the point. A wait that times out and a wait that is
 * exhausted are different events: the first found no message, the second
 * stopped looking. A caller that cannot tell them apart treats a budget
 * exhaustion as "nobody wrote to me" and reports silence, which is the one
 * failure the user experiences as a hang.
 */
export type WaitOutcome =
	| { readonly kind: "message"; readonly envelope: InboxEnvelope; readonly waitedMs: number }
	| { readonly kind: "empty"; readonly waitedMs: number }
	| { readonly kind: "budget_exhausted"; readonly waitedMs: number; readonly budgetMs: number };

/**
 * Wait for one message, but never silently.
 *
 * `poll` is asked for a message and returns nothing when there is none; the
 * loop keeps the wait bounded and reports which of the three outcomes happened.
 *
 * The clock is a parameter so a test can drive time without sleeping — and so
 * the caller can supply a monotonic source rather than a wall clock that can
 * step backwards mid-wait.
 */
export async function boundedWait(options: {
	readonly poll: () => Promise<InboxEnvelope | undefined>;
	readonly budgetMs?: number;
	readonly now?: () => number;
	readonly intervalMs?: number;
}): Promise<WaitOutcome> {
	const budget = options.budgetMs ?? WAIT_BUDGET_MS;
	const now = options.now ?? (() => Date.now());
	const interval = options.intervalMs ?? 250;
	const started = now();

	for (;;) {
		const envelope = await options.poll();
		const elapsed = now() - started;
		if (envelope) return { kind: "message", envelope, waitedMs: elapsed };
		if (elapsed >= budget) {
			return { kind: "budget_exhausted", waitedMs: elapsed, budgetMs: budget };
		}
		if (budget - elapsed < interval) await Bun.sleep(budget - elapsed);
		else await Bun.sleep(interval);
	}
}
