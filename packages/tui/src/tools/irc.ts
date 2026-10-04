/** Peer-message types and roster constants shared by messaging, `wait`, and child prompts. */

/** Maximum live peer rows embedded in child prompts. */
export const DEFAULT_PEER_ROSTER_LIMIT = 32;

/**
 * Who a message came from, recorded on the message itself.
 *
 * DECLARED HERE AND NOT IMPORTED, and the duplication is deliberate.
 * `@ultraworkers/peer` exports an identical `PeerOrigin`, but it already depends
 * on this package's consumer, so importing it from `pi-tui` — or reaching back
 * for it from `pi-agent` — would close a cycle. The same reasoning is written out
 * at `packages/coding-agent/src/peer/settings.ts`, where `INBOUND_POLICIES` is
 * likewise declared rather than imported. Two structurally identical cases, one
 * convention.
 *
 * `kind` is the field that carries the meaning, and `"user"` is load-bearing:
 * without it "peer" would assert nothing. Absence is the *user* case, so a
 * message written before this field existed still reads correctly rather than
 * becoming unclassifiable.
 */
export interface IrcOrigin {
	/** `"peer"` for a message from another session; `"user"` for the operator. */
	readonly kind: "peer" | "user";
	/** The sending peer, when known. */
	readonly from?: string;
	/** The sender's session label, when it supplied one. */
	readonly session?: string;
}

/** Serializable peer message retained in coordination result snapshots. */
export interface IrcMessage {
	id: string;
	/** Sender agent id. */
	from: string;
	/** Recipient agent id (resolved; "all" is expanded by the tool, not stored). */
	to: string;
	body: string;
	ts: number;
	/** Message id being answered. */
	replyTo?: string;
	/**
	 * Automated wake-turn relay of a woken subagent's stop output (task executor
	 * `relayWakeTurnOutput`). Relays are answers, never wake sources: the
	 * recipient's own wake-turn relay must skip them or two idle peers
	 * ping-pong forever.
	 */
	wakeRelay?: boolean;
	/**
	 * Provenance, carried on the message rather than beside it.
	 *
	 * On the message because the drain path rebuilds a fresh `IrcMessage` from a
	 * persisted record: a field stored alongside the message is a field the rebuild
	 * has to remember to copy, and one it will not until something fails. Missing
	 * means "user", which is why `kind` defaults rather than being required.
	 */
	origin?: IrcOrigin;
}

/** Delivery outcome for one peer recipient. */
export interface IrcDeliveryReceipt {
	to: string;
	/**
	 * `persisted` is delivery to a durable inbox on the far side of a peer
	 * transport, with no claim that the recipient's transcript has seen it yet.
	 *
	 * It is deliberately NOT folded into `injected`. A cross-process transport
	 * puts the message on a socket; whether it reaches the recipient is not
	 * something the sender can know, so reporting `injected` here is the exact
	 * `success: true` for an undelivered message that `peer-transport.ts` names
	 * as the bug this seam exists to prevent.
	 */
	outcome: "injected" | "woken" | "revived" | "persisted" | "failed";
	error?: string;
}
/** Status ordering for peer rosters in child prompts. */
export const LIST_STATUS_ORDER: Record<string, number> = { running: 0, idle: 1, parked: 2 };
