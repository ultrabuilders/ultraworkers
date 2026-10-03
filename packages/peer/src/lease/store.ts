import { Database } from "bun:sqlite";
import { getDbBusyTimeoutMs } from "@oh-my-pi/pi-utils";

/**
 * Cross-session file leases, stored in SQLite.
 *
 * WHY SQLITE AND NOT A LOCK FILE. A file-per-lock store makes fencing a protocol
 * that every writer must remember: read the token, compare it, write it back,
 * and lose the race in the window between the read and the write. SQLite makes
 * the same guarantee unrepresentable as a naive write — the conditional update
 * `… WHERE fence_token = ?` either changes a row or changes nothing, and
 * `changes === 0` IS the answer. That is the whole reason this store exists
 * rather than `O_EXCL`.
 *
 * The cost is deliberate: a glob becomes a column, shared-vs-exclusive becomes
 * a column, and renew becomes an UPDATE. None of those are expressible in a
 * file-per-lock store without re-deriving them on every call.
 */

/** Schema version. Bumping this is the migration entry point — see {@link migrate}. */
const SCHEMA_VERSION = 1;

/**
 * Default lease lifetime.
 *
 * 30s, NOT 30 minutes. A lease is a liveness assertion, not a claim on a file: it
 * says "this session is working here right now", so the useful lifetime is a
 * couple of missed heartbeats, not a workday. A long default only delays the
 * moment a crashed holder stops blocking everyone.
 */
export const DEFAULT_TTL_MS = 30_000;

/**
 * Ceiling on a caller-supplied TTL.
 *
 * A caller can ask for shorter — that is how a short task opts out of waiting —
 * but not for longer. Without a ceiling the TTL becomes a way to hold a path
 * indefinitely with no live session behind it, which is the exact failure the
 * lease exists to prevent.
 */
export const MAX_TTL_MS = 30 * 60 * 1000;

/** A held or released lease. */
export interface Lease {
	readonly id: number;
	/** Holder's instance id — NEVER a display name, because a rename must not move a lease. */
	readonly owner: string;
	readonly idempotency: string | null;
	readonly pathPattern: string;
	readonly exclusive: boolean;
	/**
	 * Monotonic per-acquire counter. A holder proves it still owns the lease by
	 * naming this value; a write carrying a stale one is refused.
	 */
	readonly fenceToken: number;
	readonly expiresTs: number;
	readonly releasedTs: number | null;
}

/** Options for {@link acquireLease}. */
export interface AcquireOptions {
	readonly owner: string;
	readonly pathPattern: string;
	readonly exclusive?: boolean;
	readonly idempotency?: string;
	readonly ttlMs?: number;
	readonly now?: number;
	/** Observes the reap → probe → insert sequence. Used to assert order, not outcome. */
	readonly trace?: (step: "reap" | "probe" | "insert") => void;
}

/** Outcome of an acquire attempt. */
export type AcquireResult =
	| { readonly ok: true; readonly lease: Lease }
	| { readonly ok: false; readonly conflicts: readonly Lease[] };

/** Options for the renew/release calls that must prove ownership. */
export interface FenceOptions {
	readonly owner: string;
	readonly fenceToken: number;
	readonly now?: number;
}

/**
 * Open the lease database and bring its schema up to date.
 *
 * The pragma order is load-bearing and is the house convention, not a preference:
 * `busy_timeout` must be set BEFORE any statement that takes a lock, because Bun
 * defaults it to 0 and two processes starting together then collide with
 * SQLITE_BUSY instead of waiting. `journal_mode = WAL` itself takes an exclusive
 * lock, so setting a timeout after it is too late. `synchronous = NORMAL` is the
 * house durability boundary — we trade power-loss durability for crash
 * durability, which is exactly the line the rest of this repo draws.
 */
export function openLeaseStore(path: string): Database {
	const db = new Database(path, { create: true });
	db.run(`PRAGMA busy_timeout = ${getDbBusyTimeoutMs()}`);
	db.run("PRAGMA journal_mode = WAL");
	db.run("PRAGMA synchronous = NORMAL");
	migrate(db);
	return db;
}

/**
 * Read a PRAGMA's value.
 *
 * A PRAGMA row is keyed by the pragma's own name — `PRAGMA busy_timeout` yields
 * `{ timeout }`, `PRAGMA user_version` yields `{ user_version }` — so reading a
 * fixed column silently yields `undefined`. Taking the first column is the only
 * shape that survives both spellings, and an `undefined` here is not a harmless
 * miss: the migration guard below treats it as version 0 and opens a schema it
 * should have refused.
 */
export function pragmaValue(db: Database, name: string): unknown {
	const row = db.query(`PRAGMA ${name}`).get() as Record<string, unknown> | null;
	return row === null ? undefined : Object.values(row)[0];
}

/**
 * Apply schema migrations by `user_version`.
 *
 * The version counter lives in the database rather than in the code so that a
 * second process running a newer build cannot be silently served an older
 * schema, and so an older build refuses to operate on a shape it cannot read.
 */
function migrate(db: Database): void {
	const value = Number(pragmaValue(db, "user_version") ?? 0);
	if (value > SCHEMA_VERSION) {
		throw new Error(`lease store schema v${value} is newer than this build understands (v${SCHEMA_VERSION})`);
	}
	if (value === SCHEMA_VERSION) return;

	db.transaction(() => {
		// Release is an UPDATE to a tombstone and never a DELETE: a lease that has
		// been deleted cannot answer "was this ever held, and by whom".
		db.run(`
			CREATE TABLE IF NOT EXISTS peer_leases (
			  id           INTEGER PRIMARY KEY,
			  owner        TEXT    NOT NULL,
			  idempotency  TEXT,
			  path_pattern TEXT    NOT NULL,
			  exclusive    INTEGER NOT NULL,
			  fence_token  INTEGER NOT NULL,
			  expires_ts   INTEGER NOT NULL,
			  released_ts  INTEGER
			)`);
		db.run("CREATE INDEX IF NOT EXISTS idx_peer_leases_expires ON peer_leases(expires_ts)");

		// The fence counter outlives every lease row. Deriving the next token as
		// MAX(fence_token)+1 goes BACKWARDS when the highest-token row is reaped,
		// which would re-issue a token an old holder still carries — and a raw write
		// would then be accepted. The counter is its own row precisely so reaping
		// cannot touch it.
		db.run(`
			CREATE TABLE IF NOT EXISTS peer_fence (
			  id         INTEGER PRIMARY KEY CHECK (id = 1),
			  next_token INTEGER NOT NULL
			)`);
		db.run("INSERT OR IGNORE INTO peer_fence (id, next_token) VALUES (1, 1)");

		db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
	})();
}

/**
 * Characters that mean something to a RegExp and must be escaped in a glob.
 *
 * Listed as a set rather than a `[...]` character class: a class mixing an
 * unescaped `[` with `\]` reads as balanced to a human and does not parse.
 */
const REGEX_META = new Set([".", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]);

/**
 * Translate a lease glob into a matcher over concrete paths.
 *
 * Two wildcards, and the difference between them is the whole reason this is not
 * a one-line `split`:
 *
 *   `**` any run of *characters*, including none and including separators
 *   `*`  any run of characters within ONE segment — never crosses `/`
 *
 * The `**` followed by a separator has to be handled as ONE token rather than as
 * two. Read that way it becomes the regex `^src/.*[^/]*\.ts$`, and `src/a.ts` does
 * not match it: the `.*` has to swallow at least the separator that follows, so the
 * pattern misses every file directly inside `src` — which is the overwhelmingly
 * common case. As a single token it becomes a non-capturing group whose second
 * half is optional, so the zero-segment alternative is exactly what "any run of
 * segments, including none" means.
 *
 * (The token is written out as "two stars then a slash" rather than inline, because
 * a literal `*` immediately followed by `/` would close this comment where it
 * stands.)
 *
 * Every other character is literal. A glob that reached outside the tree would let
 * one session claim another's files, so the leading `**` segment is allowed but
 * the match stays anchored at the root.
 */
function globToRegExp(pattern: string): RegExp {
	let source = "";
	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];
		if (char === "*" && pattern[i + 1] === "*") {
			if (pattern[i + 2] === "/") {
				source += "(?:.*/)?";
				i += 2;
			} else {
				source += ".*";
				i += 1;
			}
		} else if (char === "*") {
			source += "[^/]*";
		} else {
			source += REGEX_META.has(char) ? "\\" + char : char;
		}
	}
	return new RegExp(`^${source}$`);
}

/** True when `path` is covered by `pattern`. */
export function leasePatternMatches(pattern: string, path: string): boolean {
	return globToRegExp(pattern).test(path);
}

function toLease(row: Record<string, unknown>): Lease {
	return {
		id: row.id as number,
		owner: row.owner as string,
		idempotency: (row.idempotency as string | null) ?? null,
		pathPattern: row.path_pattern as string,
		exclusive: row.exclusive === 1,
		fenceToken: row.fence_token as number,
		expiresTs: row.expires_ts as number,
		releasedTs: (row.released_ts as number | null) ?? null,
	};
}

const SELECT_COLUMNS = "id, owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, released_ts";

/**
 * Take out a lease, or report what stands in the way.
 *
 * `BEGIN IMMEDIATE` takes the write lock up front rather than upgrading mid
 * transaction, so two sessions claiming the same path serialise instead of one
 * discovering the conflict at COMMIT — by which point it has already done work.
 */
export function acquireLease(db: Database, options: AcquireOptions): AcquireResult {
	const now = options.now ?? Date.now();
	const ttl = Math.min(options.ttlMs ?? DEFAULT_TTL_MS, MAX_TTL_MS);
	const exclusive = options.exclusive ?? true;
	// The order reap → probe → insert is the contract, and asserting the outcome
	// does not establish it: reaping after the probe would still let every
	// assertion below pass, because an expired lease is filtered out of the probe
	// either way. The trace makes the sequence itself observable.
	const trace = options.trace;

	db.run("BEGIN IMMEDIATE");
	try {
		// Reap first. An expired lease must not merely be ignored by the probe but
		// be marked dead, or its holder still reads as the last owner of the path.
		trace?.("reap");
		reapExpiredLeases(db, now);

		// A replayed acquire with the same key must return the original lease
		// rather than mint a second token, or a retried call would silently
		// invalidate the caller's first one.
		if (options.idempotency !== undefined) {
			const prior = db
				.query<Record<string, unknown>, [string, string]>(
					`SELECT ${SELECT_COLUMNS} FROM peer_leases
					 WHERE idempotency = ? AND owner = ? AND released_ts IS NULL`,
				)
				.get(options.idempotency, options.owner);
			if (prior) {
				db.run("COMMIT");
				return { ok: true, lease: toLease(prior) };
			}
		}

		trace?.("probe");
		const conflicts = findConflicts(db, options.pathPattern, exclusive, now);
		if (conflicts.length > 0) {
			db.run("ROLLBACK");
			return { ok: false, conflicts };
		}

		trace?.("insert");

		const fenceToken = db
			.query<{ next_token: number }, []>("SELECT next_token FROM peer_fence WHERE id = 1")
			.get()?.next_token;
		if (fenceToken === undefined) throw new Error("lease fence counter row is missing");
		db.run("UPDATE peer_fence SET next_token = ? WHERE id = 1", [fenceToken + 1]);

		db.run(
			`INSERT INTO peer_leases
			   (owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, released_ts)
			 VALUES (?, ?, ?, ?, ?, ?, NULL)`,
			[options.owner, options.idempotency ?? null, options.pathPattern, exclusive ? 1 : 0, fenceToken, now + ttl],
		);
		const row = db
			.query<Record<string, unknown>, [string, number]>(
				`SELECT ${SELECT_COLUMNS} FROM peer_leases WHERE owner = ? AND fence_token = ?`,
			)
			.get(options.owner, fenceToken);
		if (!row) throw new Error("lease row vanished inside its own transaction");
		db.run("COMMIT");
		return { ok: true, lease: toLease(row) };
	} catch (error) {
		db.run("ROLLBACK");
		throw error;
	}
}

/**
 * Live leases whose pattern overlaps `pathPattern`.
 *
 * A shared lease only conflicts with another shared request when they cover the
 * same ground; an exclusive one conflicts with anything at all. Expiry is
 * evaluated here rather than by a background reaper so a lease that has timed out
 * never blocks a caller even if no one has swept yet.
 */
export function findConflicts(
	db: Database,
	pathPattern: string,
	exclusive: boolean,
	now: number = Date.now(),
): Lease[] {
	const rows = db
		.query<Record<string, unknown>, [number]>(
			`SELECT ${SELECT_COLUMNS} FROM peer_leases
			 WHERE released_ts IS NULL AND expires_ts > ?`,
		)
		.all(now);
	const out: Lease[] = [];
	for (const row of rows) {
		const lease = toLease(row);
		if (!patternsOverlap(lease.pathPattern, pathPattern)) continue;
		if (exclusive || lease.exclusive) out.push(lease);
	}
	return out;
}

/**
 * True when one lease's ground could contain the other's.
 *
 * Three forms, and dropping any of them lets one path be held twice over:
 *
 *   exact     `src/a.ts`    vs `src/a.ts`      — identical
 *   glob      `src/**` + a  vs `src/a.ts`      — the pattern covers the path
 *             `.ts` suffix
 *   ancestor  `src/`        vs `src/a.ts`      — a directory claim covers what is under it
 *
 * The ancestor form is why a trailing slash is load-bearing rather than cosmetic. Glob
 * matching alone cannot express it: `src/` as a glob matches the literal three-character
 * string `src/` and nothing else, so without this a session holding `src/` and a session
 * holding `src/a.ts` would both win and neither would know.
 */
export function patternsOverlap(a: string, b: string): boolean {
	if (leasePatternMatches(a, b) || leasePatternMatches(b, a)) return true;
	return isAncestorClaim(a, b) || isAncestorClaim(b, a);
}

/** A pattern ending in `/` claims everything beneath it. */
function isAncestorClaim(claim: string, path: string): boolean {
	return claim.endsWith("/") && path.startsWith(claim);
}

/**
 * Push out a lease's expiry.
 *
 * The match is on owner AND fence token AND `released_ts IS NULL`. Dropping the
 * third predicate lets a renewed row match its own tombstone: after the lease is
 * released, this would change one row, report success, and leave the holder
 * renewing a lease nobody can see.
 */
export function renewLease(db: Database, options: FenceOptions & { ttlMs?: number }): boolean {
	const now = options.now ?? Date.now();
	const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
	const result = db.run(
		`UPDATE peer_leases SET expires_ts = ?
		 WHERE owner = ? AND fence_token = ? AND released_ts IS NULL`,
		[now + ttl, options.owner, options.fenceToken],
	);
	return result.changes === 1;
}

/**
 * Give up a lease. The row stays, as a tombstone answering "who held this".
 */
export function releaseLease(db: Database, options: FenceOptions): boolean {
	const now = options.now ?? Date.now();
	const result = db.run(
		`UPDATE peer_leases SET released_ts = ?
		 WHERE owner = ? AND fence_token = ? AND released_ts IS NULL`,
		[now, options.owner, options.fenceToken],
	);
	return result.changes === 1;
}

/**
 * Tombstone leases whose TTL has passed.
 *
 * Only the timestamp is written. Deleting the row would let the fence counter be
 * read as `MAX(fence_token)+1` again and re-issue a dead token.
 */
export function reapExpiredLeases(db: Database, now: number = Date.now()): number {
	return db.run("UPDATE peer_leases SET released_ts = expires_ts WHERE released_ts IS NULL AND expires_ts <= ?", [now])
		.changes;
}

/**
 * Every lease matching `pathPattern`, or every lease in the store when it is omitted.
 *
 * The two branches must answer the SAME question, and they did not: the
 * unfiltered branch returned released and expired rows while the filtered one
 * returned neither. A caller asking "who holds this path?" got the live holder
 * under one call and the whole history under another, so a stale holder could
 * read as a live one depending only on which argument it passed.
 *
 * `now` is injected rather than read from the clock so that "live" is decided
 * against the same instant the caller is reasoning about; a test that acquires at
 * a synthetic `now` and lists against the wall clock would filter out the lease
 * it just took.
 */
export function listLeases(db: Database, pathPattern?: string, now: number = Date.now()): Lease[] {
	const rows =
		pathPattern === undefined
			? db.query<Record<string, unknown>, []>(`SELECT ${SELECT_COLUMNS} FROM peer_leases ORDER BY id`).all()
			: db
					.query<Record<string, unknown>, [string, number]>(
						`SELECT ${SELECT_COLUMNS} FROM peer_leases
				 WHERE path_pattern = ? AND released_ts IS NULL AND expires_ts > ?
				 ORDER BY id`,
					)
					.all(pathPattern, now);
	return rows.map(toLease);
}

/**
 * Every lease matching `pathPattern`, released and expired ones included.
 *
 * The history view, for answering "was this ever held, and by whom". Separate from
 * {@link listLeases} rather than a flag on it, because the two questions have
 * opposite defaults and a flag makes the wrong one the easy call.
 */
export function listLeaseHistory(db: Database, pathPattern?: string): Lease[] {
	const rows =
		pathPattern === undefined
			? db.query<Record<string, unknown>, []>(`SELECT ${SELECT_COLUMNS} FROM peer_leases ORDER BY id`).all()
			: db
					.query<Record<string, unknown>, [string]>(
						`SELECT ${SELECT_COLUMNS} FROM peer_leases WHERE path_pattern = ? ORDER BY id`,
					)
					.all(pathPattern);
	return rows.map(toLease);
}
