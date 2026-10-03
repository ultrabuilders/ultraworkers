/**
 * Durable name registry, with tombstones.
 *
 * WHY TOMBSTONES AND NOT DELETES. Before `/rename`, allocation-only names made
 * the distinction free: every minted name came from the closed 9,900 space, so
 * any holder of one was a peer that had existed. Arbitrary rename breaks that —
 * `/rename BlueLake` → `/rename DatabaseMigrator` leaves a delivered message
 * addressed to `BlueLake` with nobody holding it. Under delete-on-release that is
 * indistinguishable from a typo, and the caller cannot tell a mistyped name from
 * a peer that renamed away, which is the gap the second refusal exists to close.
 *
 * So a vacated name is **held, not deleted**: the row keeps the name and its
 * timestamps with the holder cleared.
 *
 * The hold applies on session death too, for the same reason. A peer that crashed
 * an hour ago and a name mistyped a second ago must not produce the same refusal,
 * because the caller's only repair — ask the sender — works for one and not the
 * other.
 *
 * The transition back to `unknown` is time-based and honest: once the hold expires
 * the name genuinely was never allocated to anyone reachable, so the refusal stops
 * being a loss of information and starts being the truth. There is no state where
 * the system knows a name existed and refuses to say so.
 */

import type { Database } from "bun:sqlite";
import { openSqliteDatabaseSync } from "@oh-my-pi/pi-utils";
import type { ExtraReserved, RenameOutcome } from "./rename";
import { RESERVED_NAMES, nameKey } from "./allocate";
import { sanitiseName } from "./sanitise";

/** Schema version. Bumping this is the migration entry point. */
const SCHEMA_VERSION = 1;

/**
 * How long a vacated name stays distinguishable as `expired`.
 *
 * Bounded on purpose: re-minting during the hold would resurrect the exact
 * ambiguity the tombstone exists to prevent, so `/rename` back to a previous name
 * is refused while it stands — a deliberate inconvenience. Held rows are reaped
 * on `held_until`, so accumulation is bounded by rename rate, not session count.
 */
export const NAME_HOLD_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Open (creating if absent) the name registry.
 *
 * The opener is `@oh-my-pi/pi-utils`' rather than a local `new Database(...)`,
 * because that one already sets the busy timeout from the shared helper and
 * carries the corruption-quarantine path. A name registry is written by every
 * session on the machine at once, so it needs exactly the busy behaviour the
 * shared opener has and a hand-rolled copy would silently drop.
 */
export function openNameStore(path: string): Database {
	return openSqliteDatabaseSync(path, db => {
		db.run("PRAGMA journal_mode = WAL");
		db.run("PRAGMA synchronous = NORMAL");
		migrate(db);
		return db;
	});
}

function migrate(db: Database): void {
	db.run(`CREATE TABLE IF NOT EXISTS peer_names (
		name        TEXT PRIMARY KEY,
		instance_id TEXT,
		state       TEXT NOT NULL,
		held_since  INTEGER,
		held_until  INTEGER
	)`);
	db.run(`CREATE INDEX IF NOT EXISTS peer_names_held_until ON peer_names(held_until)`);
	db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/** How a name resolved. The three-way split is the whole point of this store. */
export type NameResolution =
	| { readonly kind: "live"; readonly instanceId: string }
	| { readonly kind: "expired" }
	| { readonly kind: "unknown" };

/**
 * Resolve a name for delivery.
 *
 * Reads three states, not two, and the difference is the entire reason the
 * tombstones exist:
 *
 * | row                         | result     | refusal a caller should give |
 * | --------------------------- | ---------- | ---------------------------- |
 * | `live`                      | `live`     | — deliverable                |
 * | `held`, hold in the future  | `expired`  | "that name expired"          |
 * | `held`, hold in the past    | `unknown`  | "unknown name"               |
 * | no row                      | `unknown`  | "unknown name"               |
 *
 * A held row past its deadline reads `unknown` rather than staying `expired`:
 * by then the two are genuinely the same fact, and keeping them apart would mean
 * holding tombstones forever.
 */
export function resolveName(db: Database, name: string, now: number = Date.now()): NameResolution {
	const row = db
		.query<Record<string, unknown>, [string]>("SELECT instance_id, state, held_until FROM peer_names WHERE name = ?")
		.get(nameKey(name));
	if (row === null || row === undefined) return { kind: "unknown" };
	if (row.state === "live" && typeof row.instance_id === "string") {
		return { kind: "live", instanceId: row.instance_id };
	}
	const heldUntil = typeof row.held_until === "number" ? row.held_until : 0;
	return heldUntil > now ? { kind: "expired" } : { kind: "unknown" };
}

/** Why a claim was refused. */
export type ClaimRefusal = "invalid" | "held" | "taken";

/** Outcome of claiming a name. */
export type ClaimResult =
	| { readonly ok: true; readonly name: string }
	| { readonly ok: false; readonly reason: ClaimRefusal; readonly name?: string };

/**
 * Take a name for an instance, or report why not.
 *
 * A name already `live` for **another** instance is `taken`: two sessions
 * answering to one address would make `send` ambiguous, and §15 refuses an
 * ambiguous name rather than guessing a recipient. Re-claiming a name you already
 * hold succeeds, so a session can re-assert the name it has.
 */
export function claimName(
	db: Database,
	options: { readonly name: string; readonly instanceId: string; readonly now?: number },
): ClaimResult {
	const sanitised = sanitiseName(options.name);
	if (sanitised === null) return { ok: false, reason: "invalid" };
	const key = nameKey(sanitised);
	const now = options.now ?? Date.now();
	const existing = db
		.query<Record<string, unknown>, [string]>("SELECT instance_id, state, held_until FROM peer_names WHERE name = ?")
		.get(key);
	if (existing !== null && existing !== undefined) {
		const heldUntil = typeof existing.held_until === "number" ? existing.held_until : 0;
		if (existing.state !== "live" && heldUntil > now) return { ok: false, reason: "held", name: sanitised };
		if (existing.state === "live" && existing.instance_id !== options.instanceId) {
			return { ok: false, reason: "taken", name: sanitised };
		}
	}
	db.run(
		"INSERT INTO peer_names (name, instance_id, state, held_since, held_until) VALUES (?, ?, 'live', NULL, NULL)\n" +
			"ON CONFLICT(name) DO UPDATE SET instance_id = excluded.instance_id, state = 'live', held_since = NULL, held_until = NULL",
		[key, options.instanceId],
	);
	return { ok: true, name: sanitised };
}

/**
 * Vacate a name into a tombstone rather than deleting the row.
 *
 * This is the release path for both `/rename` and session death. It is
 * deliberately **not** idempotent-by-delete: removing the row is what makes an
 * expired name indistinguishable from a typo.
 */
export function releaseName(
	db: Database,
	options: { readonly name: string; readonly instanceId: string; readonly now?: number },
): boolean {
	const now = options.now ?? Date.now();
	const result = db
		.query<Record<string, unknown>, [number, number, string, string]>(
			"UPDATE peer_names SET instance_id = NULL, state = 'held', held_since = ?, held_until = ?\n" +
				"WHERE name = ? AND instance_id = ? AND state = 'live'",
		)
		.run(now, now + NAME_HOLD_TTL_MS, nameKey(options.name), options.instanceId);
	// `changes === 0` IS the answer, same as the lease store: it means this caller
	// did not hold the name, so there is nothing to vacate.
	return result.changes > 0;
}

/** Drop held rows whose deadline has passed. Returns how many went. */
export function reapHeldNames(db: Database, now: number = Date.now()): number {
	return db.query("DELETE FROM peer_names WHERE state = 'held' AND held_until <= ?").run(now).changes;
}

/**
 * The store and the caller's idea of its own name disagree.
 *
 * Not a user-facing refusal: it means `/rename` was invoked for a name this
 * instance does not hold, so either the caller passed a stale `current` or two
 * sessions share an `instanceId`. Both are programming errors, and answering them
 * with a polite "taken" would leave the session addressable under a name it never
 * vacated — so it throws, and the surrounding transaction rolls back.
 */
export class NameStoreInconsistentError extends Error {
	readonly code = "name_store_inconsistent";
}

/**
 * Rename, atomically, against the durable registry.
 *
 * The whole point is that the refusal and the effect cannot come apart. Two
 * separate calls would each be individually reasonable and jointly broken:
 * releasing first loses the caller's own name when the claim is then refused, and
 * claiming first leaves it answering to two names if the release finds nothing to
 * vacate. So both writes run in one transaction, and the rollback is what makes a
 * refused rename a no-op.
 *
 * The old name is left **held**, not deleted, so a message already addressed to it
 * refuses as `expired` rather than `unknown` — see {@link resolveName}.
 */
export function renameInStore(
	db: Database,
	options: {
		readonly instanceId: string;
		readonly current: string;
		readonly next: string;
		readonly extraReserved?: ExtraReserved;
		readonly now?: number;
	},
): RenameOutcome {
	const now = options.now ?? Date.now();
	const currentKey = nameKey(options.current);

	// Same refusal order as the pure `renameName`, so a caller sees one rule set
	// whether or not a store is attached: empty, then reserved, then the registry.
	const sanitised = sanitiseName(options.next);
	if (sanitised === null) return { kind: "refused", reason: "empty", requested: options.next };
	const key = nameKey(sanitised);
	const reserved = options.extraReserved ?? new Set<string>();
	if (RESERVED_NAMES.has(key) || reserved.has(key)) {
		return { kind: "refused", reason: "reserved", requested: sanitised };
	}
	// Re-asserting the current name touches nothing: no claim, no tombstone, so a
	// session cannot manufacture a hold on the address it is already using.
	if (key === currentKey) return { kind: "renamed", from: options.current, to: sanitised };

	const run = db.transaction((): RenameOutcome => {
		const claim = claimName(db, { name: sanitised, instanceId: options.instanceId, now });
		if (!claim.ok) {
			return { kind: "refused", reason: claim.reason === "invalid" ? "empty" : claim.reason, requested: sanitised };
		}
		if (!releaseName(db, { name: options.current, instanceId: options.instanceId, now })) {
			throw new NameStoreInconsistentError(
				`instance ${options.instanceId} does not hold ${options.current}, so it cannot be vacated`,
			);
		}
		return { kind: "renamed", from: options.current, to: sanitised };
	});
	return run();
}
