/**
 * The four peer verbs, as pure decision logic.
 *
 * Everything here is a function over data the caller already holds — a lease
 * database, an inbox, a roster. Nothing opens a socket, resolves a path, or
 * touches the ExtensionAPI, so every rule below is testable without a host and
 * the registration layer in `./register.ts` stays a thin adapter.
 *
 * The surface is deliberately four verbs (`list`, `send`, `lock`, `release`) and
 * nothing else. Two things that look like candidates are not, and the reasons
 * are load-bearing rather than stylistic:
 *
 *   - **`force_release` is absent on purpose.** It is the one operation here
 *     that can destroy work another agent is actively doing. `mcp_agent_mail_rust`
 *     gates it behind four independent staleness signals and it is still the
 *     most dangerous verb in that API. Handing it to an agent would put the
 *     sharpest tool in the weakest hands; the equivalent stays a human calling
 *     `force_release` on the server directly.
 *   - **Unread previews never carry a body.** See {@link peerList}.
 */

import type { AcquireResult, FenceOptions, Lease } from "../lease/index";
import { acquireLease, findConflicts, listLeases, releaseLease } from "../lease/index";
import type { InboxEnvelope, InboxStore } from "../inbox/index";

/** A registered peer as the roster reports it. */
export interface PeerRosterEntry {
	readonly id: string;
	readonly task: string;
	readonly lastSeenTs: number;
}

/** What `peer.list` returns under `--unread`. */
export interface UnreadSummary {
	readonly peer: string;
	readonly count: number;
	/**
	 * Subject lines only. A preview that carried `bodyMd` would put untrusted
	 * peer prose in front of the model one hop earlier than the fence is
	 * designed for, so the body is dropped here rather than at the render edge.
	 */
	readonly subjects: readonly string[];
}

/** Why a `peer.lock` probe answered. */
export type ProbeAnswer =
	| { readonly held: false; readonly available: true }
	| { readonly held: true; readonly holder: string; readonly fenceToken: number; readonly expiresTs: number };

/** Outcome of `peer.lock`. */
export type LockOutcome =
	| { readonly kind: "acquired"; readonly lease: Lease }
	| { readonly kind: "held"; readonly conflicts: readonly Lease[] }
	| { readonly kind: "probe"; readonly answer: ProbeAnswer };

/** Options for {@link peerLock}. */
export interface PeerLockOptions {
	readonly owner: string;
	readonly pathPattern: string;
	readonly ttlMs?: number;
	readonly idempotency?: string;
	/** Defaults to exclusive, matching {@link acquireLease}'s own default. */
	readonly exclusive?: boolean;
	/**
	 * Answer whether the path is free **without claiming it**. A probe must be
	 * side-effect free, so it never reaps: reaping is a mutation and a caller
	 * asking "is this available?" has not asked to evict anyone.
	 */
	readonly probe?: boolean;
	readonly now?: number;
}

/**
 * Decide what `peer.lock(path)` does.
 *
 * A held resource is **reported, not refused**: the current holder comes back so
 * the caller can address them. Failing would make the one read the tool has to do
 * anyway — looking up who holds the path — unreachable, and a separate `inspect`
 * verb would be a tool whose only job is reading what `lock` must already read
 * to decide.
 */
export function peerLock(db: Parameters<typeof acquireLease>[0], options: PeerLockOptions): LockOutcome {
	// `findConflicts`, not `listLeases(db, pathPattern)`: the latter only matches a
	// stored pattern against the query in ONE direction, so a broad `src/**` claim
	// is invisible when asked about `src/a.ts`. `patternsOverlap` checks both ways
	// (plus the ancestor form) and is the same detection `acquireLease` runs, which
	// is what keeps a probe and the acquire that follows it from disagreeing — a
	// probe that says "free" and an acquire that then conflicts is incoherent.
	const held = findConflicts(db, options.pathPattern, options.exclusive ?? true, options.now ?? Date.now());
	if (held.length > 0) {
		return options.probe
			? {
					kind: "probe",
					answer: {
						held: true,
						holder: held[0].owner,
						fenceToken: held[0].fenceToken,
						expiresTs: held[0].expiresTs,
					},
				}
			: { kind: "held", conflicts: held };
	}
	if (options.probe) return { kind: "probe", answer: { held: false, available: true } };
	const result: AcquireResult = acquireLease(db, {
		owner: options.owner,
		pathPattern: options.pathPattern,
		ttlMs: options.ttlMs,
		idempotency: options.idempotency,
		now: options.now,
	});
	return result.ok ? { kind: "acquired", lease: result.lease } : { kind: "held", conflicts: result.conflicts };
}

/** Outcome of `peer.release`. */
export type ReleaseOutcome =
	| { readonly kind: "released"; readonly pathPattern: string }
	| { readonly kind: "not-held"; readonly reason: "not-owner" | "stale-fence" | "already-released" };

/**
 * Give a claim back.
 *
 * A release must prove ownership by naming its fence token, so a caller that lost
 * the lease to the reaper cannot release whatever now holds the path. The three
 * refusals stay distinct because they mean different things to a caller: one is
 * "you never had it", one is "someone else does now", and one is "that already
 * happened" — which is the **normal** exit for the reaper path and must not read
 * as an error.
 */
export function peerRelease(db: Parameters<typeof releaseLease>[0], options: FenceOptions): ReleaseOutcome {
	const pattern = listLeases(db, undefined, options.now ?? Date.now()).find(
		lease => lease.owner === options.owner && lease.fenceToken === options.fenceToken,
	);
	if (!pattern) return { kind: "not-held", reason: "not-owner" };
	if (pattern.releasedTs !== null) return { kind: "not-held", reason: "already-released" };
	const released = releaseLease(db, options);
	return released
		? { kind: "released", pathPattern: pattern.pathPattern }
		: { kind: "not-held", reason: "stale-fence" };
}

/** Result of {@link peerList}. */
export interface PeerListResult {
	readonly peers: readonly PeerRosterEntry[];
	/** Present only under `--unread`; bodies never appear in it. */
	readonly unread?: readonly UnreadSummary[];
}

/**
 * Report the roster, optionally with per-peer unread counts.
 *
 * `--unread` returns a **count and subjects, never bodies**. That restriction is
 * the reason this function exists in its own right rather than being a filter
 * over the roster: an agent deciding whether to poll another session needs to
 * know that mail is waiting, and does not need to have already read it. Handing
 * back the body would collapse the poll into a read and put peer-authored prose
 * in the model's context one fence earlier than the design intends.
 */
export async function peerList(
	store: InboxStore,
	roster: readonly PeerRosterEntry[],
	options: { readonly unread?: boolean } = {},
): Promise<PeerListResult> {
	if (!options.unread) return { peers: roster };
	const byPeer = new Map<string, InboxEnvelope[]>();
	for (const envelope of await store.list()) {
		const bucket = byPeer.get(envelope.from);
		if (bucket) bucket.push(envelope);
		else byPeer.set(envelope.from, [envelope]);
	}
	return {
		peers: roster,
		unread: roster.map(peer => {
			const envelopes = byPeer.get(peer.id) ?? [];
			return {
				peer: peer.id,
				count: envelopes.length,
				subjects: envelopes.map(envelope => envelope.subject),
			};
		}),
	};
}
