/**
 * The peer transport seam — how a message crosses to another session.
 *
 * Two shapes, copied from seams that already exist rather than invented:
 * **transport is provider-shaped** (like `registerProvider`/`unregisterProvider`,
 * `extensions/types.ts:2317`/`:2325` — an extension overrides, and unregistering
 * restores the built-in), and **the lock backend is fallback-shaped** (like
 * `registerFileWriteFallback`, `:1688` — core keeps ownership and the extension is
 * only consulted once core has refused).
 *
 * ## Why `capabilities` is the load-bearing part
 *
 * §15.1 found the worst bug in Claude Code's design: `success: true` for a
 * message that was never received (`#87501`). Three Windows bugs share the shape,
 * and the reporter's conclusion was *"because every send reports success, no
 * fallback can trigger."*
 *
 * A replaceable transport makes that bug **easier**, not harder, to write — so the
 * seam carries its own defence. A transport that cannot inject must not be able to
 * claim delivery, and one that cannot persist must make `list --unread` say **why**
 * there is nothing to read instead of returning an empty array. Silence in a
 * coordination layer reads as "nothing is waiting", which is the one answer that
 * is always wrong.
 *
 * ## Honest outcomes
 *
 * Out of process, a transport can only honestly report `persisted` or
 * `refused(cause)`. It cannot promise `injected`: the message is in a socket, and
 * whether it reaches the recipient's transcript is not something the sender can
 * know. Promising it anyway is precisely the `#87501` shape.
 */

/** Wire version this build speaks. A transport declaring another is refused. */
export const PEER_TRANSPORT_PROTOCOL_VERSION = 1;

/** What a transport can actually do. A declaration, never containment. */
export interface PeerTransportCapabilities {
	/** Reaches a session in another process, not just this one. */
	readonly crossProcess: boolean;
	/** Writes the message to a durable inbox on the far side. */
	readonly durable: boolean;
	/** Puts the message into the recipient's transcript/context. */
	readonly injects: boolean;
}

/** Why an out-of-process delivery could not complete. */
export type TransportRefusal = "no-route" | "peer-unregistered" | "rejected" | "capability-missing";

/**
 * The most a transport may claim.
 *
 * `injected` and `woken` are reachable only when {@link injects} is true;
 * `persisted` only when {@link durable} is. Everything else is a refusal.
 */
export type TransportOutcome =
	| { readonly outcome: "injected" | "woken" | "revived" }
	| { readonly outcome: "persisted" }
	| { readonly outcome: "refused"; readonly cause: TransportRefusal; readonly detail?: string };

/** A replaceable delivery channel. */
export interface PeerTransport {
	/** Stable identity; also the unregister key. */
	readonly id: string;
	readonly protocolVersion: number;
	readonly capabilities: PeerTransportCapabilities;
	deliver(target: string, message: string): Promise<TransportOutcome>;
}

/** Consulted only after core has refused a claim — never in place of core. */
export interface PeerLockBackend {
	readonly id: string;
	/**
	 * Core refused the claim. The backend may say the path is fine on this host.
	 * Returning `true` does not grant the lease; it tells core to stop refusing.
	 */
	shouldAdmit(pathPattern: string): boolean;
}

/** Raised when a transport's wire version does not match this build's. */
export class PeerTransportProtocolMismatch extends Error {
	readonly code = "peer_transport_protocol_mismatch";
	constructor(
		readonly transportId: string,
		readonly declared: number,
		readonly expected: number,
	) {
		super(`peer transport "${transportId}" declares protocol v${declared}, this build speaks v${expected}`);
	}
}

// Process-wide, matching `file-write-fallback.ts`: a handler may serve any session
// in the process, not only the one that registered it. Module scope, not `#private` —
// that is class-member syntax and does not parse at module level.
const overrides = new Map<string, PeerTransport>();
const lockBackends = new Map<string, PeerLockBackend>();
let builtinTransport: PeerTransport | undefined;

/** Install the built-in transport. Called once by the runtime, never by an extension. */
export function setBuiltinPeerTransport(transport: PeerTransport): void {
	builtinTransport = transport;
}

/**
 * Register an override.
 *
 * Refuses a protocol mismatch **here**, at registration, rather than letting the
 * skew surface later as an unknown message type and a dead socket — which is what
 * `pi-peer-messaging` does, having no handshake at all.
 *
 * Returns the unregister function, mirroring `addFileWriteFallback`.
 */
export function addPeerTransport(transport: PeerTransport): () => void {
	if (transport.protocolVersion !== PEER_TRANSPORT_PROTOCOL_VERSION) {
		throw new PeerTransportProtocolMismatch(transport.id, transport.protocolVersion, PEER_TRANSPORT_PROTOCOL_VERSION);
	}
	overrides.set(transport.id, transport);
	return () => {
		removePeerTransport(transport.id);
	};
}

/** Remove one override. The built-in returns, exactly as `unregisterProvider` does. */
export function removePeerTransport(id: string): void {
	overrides.delete(id);
}

/** The transport in force: an override if one is registered, else the built-in. */
export function resolvePeerTransport(): PeerTransport | undefined {
	if (overrides.size > 0) return overrides.values().next().value;
	return builtinTransport;
}

/** Register a lock backend consulted only after core refuses. */
export function addPeerLockBackend(backend: PeerLockBackend): () => void {
	lockBackends.set(backend.id, backend);
	return () => {
		lockBackends.delete(backend.id);
	};
}

/** Ask the registered backends whether core should stop refusing. First yes wins. */
export function shouldAdmitPeerLock(pathPattern: string): boolean {
	for (const backend of lockBackends.values()) {
		if (backend.shouldAdmit(pathPattern)) return true;
	}
	return false;
}

/**
 * Deliver through the transport, downgrading any claim it is not entitled to.
 *
 * This is the whole defence against `#87501`: the capability declaration is
 * checked against the outcome *after* the transport returns, so a transport that
 * returns `injected` without being able to inject still produces `failed`.
 */
export async function deliverPeerMessage(target: string, message: string): Promise<TransportOutcome> {
	const transport = resolvePeerTransport();
	if (!transport) return { outcome: "refused", cause: "no-route" };
	const result = await transport.deliver(target, message);
	if (result.outcome === "refused") return result;
	if ((result.outcome === "injected" || result.outcome === "woken") && !transport.capabilities.injects) {
		return {
			outcome: "refused",
			cause: "capability-missing",
			detail: `transport "${transport.id}" claims ${result.outcome} but declares injects: false`,
		};
	}
	if (result.outcome === "persisted" && !transport.capabilities.durable) {
		return {
			outcome: "refused",
			cause: "capability-missing",
			detail: `transport "${transport.id}" claims persisted but declares durable: false`,
		};
	}
	return result;
}

/**
 * Why `list --unread` has nothing to report, or `undefined` when it can.
 *
 * An empty array here would be a lie: it reads as "no peer has written to you",
 * when the truth is "nothing can reach you yet".
 */
export function unreadUnavailableReason(): string | undefined {
	const transport = resolvePeerTransport();
	if (transport?.capabilities.durable) return undefined;
	const id = transport ? `"${transport.id}"` : "no transport";
	return `nothing is readable: ${id} declares durable: false, so messages cannot be persisted for later`;
}
