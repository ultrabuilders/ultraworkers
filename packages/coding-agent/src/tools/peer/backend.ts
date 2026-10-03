/**
 * The seam the `peer.*` tools talk to.
 *
 * WHY A SEAM AND NOT A DIRECT CALL. The four tools need a lease store and an
 * inbox, both of which live in `@ultraworkers/peer` — a package the CLI does not
 * depend on. Reaching in directly would make the agent surface depend on a
 * storage package, and would decide `epic-jwsy.12`'s question (how an extension
 * outside this repo supplies its own backend) by accident, before it was asked.
 *
 * Injected instead, the same seam serves both: the built-in backend is filled in
 * here, and an external extension registers its own through the same entry point
 * `epic-jwsy.12` defines. A tool that called the store directly could not be
 * redirected without editing it.
 *
 * The types here are deliberately narrow — what a tool needs, not the lease
 * table's shape. A wider interface would invite a backend to be written against
 * this file rather than against its own storage.
 */

/** A claim on a path, as a tool reports it back. Mirrors what the caller needs, not the row. */
export interface PeerLeaseHandle {
	readonly pathPattern: string;
	/** Opaque token the holder passes back to release. Never the owner's name. */
	readonly fenceToken: number;
	readonly expiresTs: number;
}

/** A lease already held on a path, returned when a claim cannot be granted. */
export interface PeerLeaseConflict {
	readonly pathPattern: string;
	readonly owner: string;
	readonly expiresTs: number;
}

/** Outcome of a claim: granted, or refused with what currently holds the path. */
export type PeerLockResult =
	| { readonly ok: true; readonly lease: PeerLeaseHandle }
	| { readonly ok: false; readonly conflicts: PeerLeaseConflict[] };

export interface PeerLockBackend {
	/** Claim `pathPattern` for `owner`, or report who holds it. */
	lock(options: {
		readonly owner: string;
		readonly pathPattern: string;
		readonly exclusive: boolean;
		readonly ttlMs?: number;
	}): PeerLockResult;
	/**
	 * Release a claim. Returns false when the token is stale — the holder was
	 * reaped and someone else took the path — which is reported rather than
	 * thrown, because it is a normal outcome of a long pause, not an error.
	 */
	release(options: { readonly owner: string; readonly fenceToken: number }): boolean;
}

/** One message as a tool reports it: a preview, never the body. */
export interface PeerMessagePreview {
	readonly seq: number;
	readonly from: string;
	readonly subject: string;
	readonly createdTs: string;
	readonly read: boolean;
}

export interface PeerListResult {
	readonly highSeq: number;
	readonly messages: PeerMessagePreview[];
	/** Holes the caller must know about, never silently stepped over. */
	readonly gaps: readonly { readonly fromSeq: number; readonly toSeq: number }[];
	readonly truncated: boolean;
}

export interface PeerTransport {
	/**
	 * Messages after `afterSeq`, capped by `limit`.
	 *
	 * Bodies are NOT part of the result. An agent reading its inbox needs to know
	 * WHAT arrived to decide what to do; handing it every body would put an
	 * unbounded amount of another agent's text into one tool result, and a peer
	 * list is a navigation aid rather than a reader.
	 */
	list(options: { readonly afterSeq?: number; readonly limit?: number }): PeerListResult;
}

let lockBackend: PeerLockBackend | null = null;
let transport: PeerTransport | null = null;

/**
 * Install the lock backend.
 *
 * Returns false when one is already installed, so a second registration cannot
 * silently displace a working backend — the failure would surface much later as
 * leases landing in the wrong store.
 */
export function registerPeerLockBackend(impl: PeerLockBackend): boolean {
	if (lockBackend) return false;
	lockBackend = impl;
	return true;
}

/** Install the transport. Same no-displacement rule as the lock backend. */
export function registerPeerTransport(impl: PeerTransport): boolean {
	if (transport) return false;
	transport = impl;
	return true;
}

/** The installed lock backend, or null. Null is a real state the tools must handle. */
export function getPeerLockBackend(): PeerLockBackend | null {
	return lockBackend;
}

/** The installed transport, or null. */
export function getPeerTransport(): PeerTransport | null {
	return transport;
}

/**
 * Remove both backends.
 *
 * For tests, which need a clean seam per case, and for an extension teardown.
 * It restores the un-configured state rather than leaving the previous
 * registration in place, so a later test cannot inherit a stale backend.
 */
export function resetPeerBackends(): void {
	lockBackend = null;
	transport = null;
}
