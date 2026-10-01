/**
 * The session identity a `ServerHost` resolves and opens.
 *
 * Upstream this interface is exported from `pi-agent-core` and carries six
 * fields. The routing layer itself reads only `id`, but callers extend this
 * type — the conformance suite declares `SessionMetadata & { path, modifiedAt }`
 * — so the fields a caller is expected to supply are kept rather than reduced
 * to the one the router touches. `parentSessionId` and
 * `legacyParentSessionPath` are omitted: nothing in this package reads or
 * writes them, and a narrower interface is one less field to keep honest.
 *
 * An application with a richer metadata type passes it as the `TMetadata`
 * parameter; nothing here narrows it.
 */
export interface SessionMetadata {
	/** Stable session identity, unique within the server. */
	id: string;
	/** Creation time in epoch milliseconds, as the session's own storage records it. */
	createdAt: number;
	/** Storage schema version the session was written with. */
	storageVersion: number;
	/** Working directory the session was created in. */
	cwd?: string;
	/** Session this one was forked or resumed from. */
	parentSessionId?: string;
}
