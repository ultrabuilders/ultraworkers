/**
 * `registerPeerTransport` / `unregisterPeerTransport` — the provider-shaped seam.
 *
 * ## Why this shape and not the other one
 *
 * Copied from `ModelRegistry.registerProvider` / `unregisterProvider`
 * (`packages/coding-agent/src/config/model-registry.ts:3155`, `:3117`), because
 * that pair is the one seam in this repo which already does what a transport
 * needs: let an extension *override a built-in* and then *get the built-in
 * back*. Its docblock is the sentence this file exists to reproduce for bytes —
 * *"Removes extension-provided models and restores overridden built-in models."*
 *
 * The restore is not a property of the unregister function. `unregisterProvider`
 * finishes with `#reloadStaticModels({ force: true, preserveRuntimeDiscovery: true })`
 * — it re-derives the built-ins from the static layer. So the thing that makes
 * unregistering safe is that **built-ins are a base layer and registrations are a
 * layer above it**, and removing the upper layer re-exposes the lower one. The
 * same structure is reproduced here as `#builtin` plus an override map, and a
 * `setBuiltinPeerTransport` the host calls to install §7's design.
 *
 * The lock seam beside this one is deliberately NOT shaped like this; see
 * `./lock.ts` for why locking is a different kind of decision.
 *
 * ## The capability declaration is the contract, and it is not optional
 *
 * `§15.1` found Claude Code's worst live failure: `success: true` for a message
 * that was never ingested (#87501). Three Windows bugs are the same shape and
 * the reporters' own conclusion was that *"because every send reports success,
 * no fallback can trigger."*
 *
 * **A swappable transport makes that class of bug easier to cause, not harder**:
 * the sender's optimism is now someone else's code. So the seam carries the
 * defence, and it is structural rather than advisory — see
 * {@link toDeliveryOutcome}, which cannot report a delivery the transport's own
 * declared capabilities make impossible.
 */

import type { IrcMessage } from "@oh-my-pi/pi-tui/tools/irc";

/**
 * Wire version this build speaks.
 *
 * Refused at REGISTRATION, not at send. `pi-peer-messaging` has no handshake, so
 * a skew does not announce itself — it surfaces as `Unknown client message type:
 * presence` and a socket that dies after the exchange, which is indistinguishable
 * from a network fault and points at the wrong subsystem entirely. A loud
 * refusal at load costs an extension author one line; the alternative costs them
 * an afternoon.
 */
export const PEER_TRANSPORT_PROTOCOL_VERSION = 1;

/** Where a message is going. */
export interface PeerAddress {
	/**
	 * The recipient's instance id — a lease owner, never a display name.
	 *
	 * §6.2: an address is derived and never carried, so this is the id the sender
	 * resolved *before* attempting delivery, not a name the transport looked up.
	 * A transport that resolves names itself is re-deriving ownership, and the
	 * closed name space stops meaning anything.
	 */
	readonly instanceId: string;
	/**
	 * Socket or named pipe, when the recipient is in another process.
	 *
	 * Optional for the same reason it is optional on `PresenceSignals.endpoint`
	 * (`../presence/liveness.ts:60`): a recipient in THIS process has no endpoint,
	 * and requiring one would make the in-memory transport unrepresentable — which
	 * is precisely the transport an extension is most likely to write first.
	 */
	readonly endpoint?: string;
}

/**
 * What a transport declares it can do.
 *
 * Every field is load-bearing and each maps to a refusal below. A transport that
 * declares nothing is not "unconstrained", it is `false` everywhere, because the
 * whole point of the record is that the sender stops guessing.
 */
export interface PeerTransportCapabilities {
	/** Can reach a recipient in another process at all. */
	readonly crossProcess: boolean;
	/**
	 * Can it write the recipient's inbox to disk?
	 *
	 * `false` means a message survives only as long as some buffer holds it. After
	 * a restart it is gone, and `list --unread` has nothing to report — silently,
	 * which is the failure this field exists to make loud.
	 */
	readonly durable: boolean;
	/**
	 * Can it get a message into the recipient's TRANSCRIPT?
	 *
	 * `false` is the one an extension author will hit, and it is the honest answer
	 * rather than a limitation: a transport that pushes onto a queue somebody else
	 * reads is not a peer transport, it is a mailbox. Saying so at registration is
	 * far cheaper than discovering it in a transcript that never moved — and the
	 * transport keeps working for the case it *is* good at, which is
	 * {@link PeerLockBackend}-free fire-and-forget with a durable inbox.
	 *
	 * `true` promises the message reached the recipient's TRANSCRIPT, and nothing
	 * more: `injected` does NOT promise survival across a restart. That is the
	 * division of labour with {@link durable}, and it holds only because
	 * `toDeliveryOutcome` keys off `injects` and `unreadAvailability` keys off
	 * `durable` — so the two are separate guarantees, never summed. A transport
	 * declaring `injects: true, durable: false` correctly reports `injected` for a
	 * message that is then gone after a restart; read it as "delivered into the
	 * session", never as "durably stored".
	 */
	readonly injects: boolean;
}

/**
 * What a transport reports about one delivery attempt.
 *
 * Deliberately NARROWER than the four receipt outcomes, and that narrowing is the
 * design. `IrcDeliveryReceipt["outcome"]` is
 * `"injected" | "woken" | "revived" | "failed"` — three of which assert
 * something about the RECIPIENT's live session, which a transport in another
 * process cannot observe. Only a transport sharing the recipient's process can
 * know its transcript received the message; asking a cross-process transport for
 * that answer invites precisely the lie #87501 shipped.
 *
 * So the honest vocabulary for a transport is:
 *
 * - `delivered` — in-process, and I watched it land. Carries which of the three
 *   positive outcomes it was.
 * - `persisted` — durably stored for the recipient to read. NOT a delivery: the
 *   recipient has not seen it. `IrcBus` already established this — a buffered
 *   hand-off whose live delivery threw still reports `failed`
 *   (`packages/coding-agent/src/irc/bus.ts:175-182`).
 * - `refused` — with the cause, because a refusal nobody can explain is one
 *   nobody retries.
 */
export type TransportOutcome =
	| { readonly kind: "delivered"; readonly outcome: "injected" | "woken" | "revived" }
	| { readonly kind: "persisted" }
	| { readonly kind: "refused"; readonly cause: string };

/** A replacement for how peer messages move. */
export interface PeerTransport {
	readonly id: string;
	/** Must equal {@link PEER_TRANSPORT_PROTOCOL_VERSION}; checked at registration. */
	readonly protocolVersion: number;
	readonly capabilities: PeerTransportCapabilities;
	deliver(target: PeerAddress, message: IrcMessage): Promise<TransportOutcome>;
}

/** The four outcomes consumers already handle, narrowed to what is honest here. */
export type PeerDeliveryOutcome = "injected" | "woken" | "revived" | "failed";

/** One delivery as reported upward, in the shape `IrcDeliveryReceipt` already uses. */
export interface PeerDeliveryReceipt {
	readonly to: string;
	readonly outcome: PeerDeliveryOutcome;
	readonly error?: string;
}

/**
 * The built-in, beneath every registration.
 *
 * `undefined` until the host installs §7's design. `null` is NOT a valid
 * "no transport" marker here: an absent builtin with no registrations is a real
 * state (a host that has not wired delivery yet), and {@link activePeerTransport}
 * returns `undefined` for it so a caller can tell "nothing registered" from
 * "something registered and then removed".
 */
let builtin: PeerTransport | undefined;

/** Registrations above the built-in, by id. Unregistering removes from here only. */
const overrides = new Map<string, PeerTransport>();

/**
 * Install the built-in transport (§7's UDS / named-pipe design).
 *
 * Separate from {@link registerPeerTransport} so the base layer is not itself a
 * registration: an extension that calls the same function could unregister the
 * built-in and leave the process with no transport at all, which is the "user
 * loses their safety net with no defined exit" failure `unregister` exists to
 * prevent.
 *
 * Clearing takes `undefined` because the host — not an extension — owns this
 * layer, and a host that shuts its transport down needs the reverse operation to
 * exist. An extension can reach neither end of it: it adds a registration above
 * this one or removes its own, and nothing else.
 *
 * `builtin` is a SNAPSHOT OF WHAT THE HOST INSTALLED, not data re-derived on
 * demand. This differs deliberately from `unregisterProvider`, which restores by
 * re-deriving the built-ins from the static layer
 * (`#reloadStaticModels({force: true, …})`) — so a host that changes an
 * underlying setting sees the change after an unregister. Here, an unregister
 * re-exposes the transport that was installed at the time, and a host whose
 * built-in should track a later setting has no path to update it except calling
 * this function again. That is cheaper (nothing reloads) and correct while the
 * host installs once; it is a constraint to know about, not one to infer — so a
 * host that installs per settings must re-install rather than expect unregister
 * to refresh.
 */
export function setBuiltinPeerTransport(transport: PeerTransport | undefined): void {
	if (transport !== undefined) assertProtocolVersion(transport);
	builtin = transport;
}

/**
 * The transport that is actually in force: the last registration, else the
 * built-in, else nothing.
 *
 * Last registration wins rather than id-lookup, because an override is "replace
 * the built-in for the whole process" (§16.1's table) rather than "add a second
 * transport to choose between". A peer has one bus; a caller that wanted a
 * different transport should have registered it instead of overriding.
 */
export function activePeerTransport(): PeerTransport | undefined {
	if (overrides.size === 0) return builtin;
	let last: PeerTransport | undefined;
	for (const transport of overrides.values()) last = transport;
	return last;
}

/**
 * Register a transport, replacing the built-in for this process.
 *
 * Throws on a protocol-version mismatch. The throw is the whole mechanism: the
 * alternative is a skew discovered at send time, where it presents as a dead
 * socket and points at the network instead of at the version.
 */
export function registerPeerTransport(transport: PeerTransport): void {
	assertProtocolVersion(transport);
	// Delete before set. `Map.set` on a key that is already present REPLACES the
	// value and keeps the ORIGINAL insertion position, so without this line a
	// re-registered id stays where it first appeared and never becomes "last".
	// The extension API does not promise ids are unique — a reload re-registers
	// the same id — and the failure is silent: the new transport is stored, the
	// old one keeps serving, and nothing reports a conflict.
	overrides.delete(transport.id);
	overrides.set(transport.id, transport);
}

/**
 * Remove one registration. The built-in is NOT restored by re-adding it — it was
 * never displaced in the registry, only shadowed, so dropping the last override
 * re-exposes it. That is what makes "full custom" a mode with a defined exit.
 *
 * Returns whether anything was removed, so a caller can tell a real unregister
 * from a stale id. Idempotent, and it never throws: a stale id is a bookkeeping
 * problem, and turning it into an exception would make teardown order matter.
 */
export function unregisterPeerTransport(id: string): boolean {
	return overrides.delete(id);
}

/** Whether any registration sits above the built-in. */
export function hasPeerTransportOverride(): boolean {
	return overrides.size > 0;
}

/**
 * Reject a transport whose wire version differs, at registration.
 *
 * Checked for the built-in too: a host that installs a mismatched transport has
 * made the same mistake one layer down, and finding it here keeps the two paths
 * from disagreeing about what "valid" means.
 */
function assertProtocolVersion(transport: PeerTransport): void {
	if (transport.protocolVersion === PEER_TRANSPORT_PROTOCOL_VERSION) return;
	throw new Error(
		`Peer transport "${transport.id}" speaks protocol version ${transport.protocolVersion}, ` +
			`but this build speaks ${PEER_TRANSPORT_PROTOCOL_VERSION}. ` +
			`Refused at registration: a version skew here would otherwise surface as ` +
			`"Unknown client message type: presence" and a dead socket at send time.`,
	);
}

/**
 * Translate a transport's report into the four outcomes consumers handle.
 *
 * This function is the defence against #87501, and it is deliberately
 * conservative in three places, each of which is a place a sender could
 * otherwise report success it cannot back up:
 *
 * 1. **`injects: false` can never yield a positive outcome.** Not even
 *    `persisted` → `injected`. A message in a queue nobody has read is not a
 *    delivery, and `bus.ts` already reports `failed` for the buffered case
 *    (`:175-182`). A transport that cannot inject therefore gets `failed` with
 *    the missing capability named — so the reason a send did nothing is visible
 *    at the send site rather than discovered later in a transcript that never
 *    moved.
 * 2. **`persisted` is not `injected`.** It maps to `failed` for the same reason:
 *    the recipient has not seen it. Persistence is what makes the message
 *    *recoverable*, and `list --unread` is where that shows up — not the receipt.
 * 3. **A transport that claims `delivered` while declaring `injects: false` is
 *    reporting a contradiction.** The claim is discarded rather than believed,
 *    because the declaration is the part the sender chose deliberately and the
 *    outcome is the part a bug produces.
 */
export function toDeliveryOutcome(
	transport: PeerTransport,
	to: string,
	outcome: TransportOutcome,
): PeerDeliveryReceipt {
	if (!transport.capabilities.injects) {
		return {
			to,
			outcome: "failed",
			error:
				`Transport "${transport.id}" declares injects: false, so it cannot deliver a message ` +
				`into a transcript. It can only persist it for a later read — which is not a delivery.`,
		};
	}
	switch (outcome.kind) {
		case "delivered":
			return { to, outcome: outcome.outcome };
		case "persisted":
			return {
				to,
				outcome: "failed",
				error:
					`Transport "${transport.id}" persisted the message for a later read. ` +
					`The recipient has not seen it, so this is not reported as a delivery.`,
			};
		case "refused":
			return { to, outcome: "failed", error: outcome.cause };
	}
}

/**
 * Whether unread messages can be listed at all, and if not, why.
 *
 * The counterpart to {@link toDeliveryOutcome} for the READ side. A transport
 * that is not durable still returns a perfectly empty unread list — the messages
 * were never written anywhere. Empty-after-a-restart is indistinguishable from
 * nobody wrote to you, so the absence is reported with its cause instead of
 * being allowed to read as "you are caught up".
 */
export type UnreadAvailability = { readonly readable: true } | { readonly readable: false; readonly reason: string };

/**
 * What `list --unread` can honestly claim, given the transport in force.
 *
 * With no transport at all the answer is `readable: false` naming that fact —
 * the alternative is an empty list that reads as "no messages", which is the
 * same silence this exists to prevent.
 */
export function unreadAvailability(transport: PeerTransport | undefined): UnreadAvailability {
	if (transport === undefined) {
		return { readable: false, reason: "No peer transport is registered, so no inbox can be read." };
	}
	if (transport.capabilities.durable) return { readable: true };
	return {
		readable: false,
		reason:
			`Transport "${transport.id}" is not durable, so received messages are not written to disk ` +
			`and cannot be listed after a restart. An empty unread list from this transport means ` +
			`"nothing survived", not "nothing arrived".`,
	};
}
