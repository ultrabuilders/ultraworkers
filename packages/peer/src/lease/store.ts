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
const SCHEMA_VERSION = 3;

/**
 * Ceiling on how long ONE lease may live, however often it is renewed.
 *
 * This is not the same ceiling as {@link MAX_TTL_MS}. That one bounds a single
 * TTL; this one bounds the whole lifetime of a claim, and it is the only thing
 * that stops a holder which is alive and well — so renews perfectly on schedule —
 * from sitting on a path forever. Liveness and renewal are one signal, so no
 * amount of watching the holder catches that case; only a deadline does.
 *
 * Past this a renew is REFUSED rather than quietly shortened, because silently
 * returning a shorter lease is the one failure the holder cannot detect: it would
 * believe it holds the path for the TTL it asked for. The caller must release and
 * acquire again, which mints a fresh token and a fresh lifetime.
 */
export const PEER_LEASE_MAX_LIFETIME_MS = 30 * 60 * 1000;

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
	/**
	 * When the holder first took this claim, i.e. before any renewal.
	 *
	 * The lifetime cap is measured from here, not from the last renew — a cap
	 * reset by each renew is not a cap. Absent on a lease written by schema v1,
	 * which is why {@link renewLease} treats a missing value as "cap unknown"
	 * rather than as zero: zero would expire every inherited lease on its first
	 * renewal.
	 */
	readonly acquiredTs: number | null;
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
 * Why a renew did not extend the lease.
 *
 * These are separate values rather than one `false`, because the two mean
 * opposite things to a holder and collapsing them teaches it the wrong response:
 *
 *   `reaped` — you do NOT hold this lease. Someone else may hold it now. Stop.
 *   `capped` — you DO still hold it; you just may not extend it. Release and
 *              acquire again to get a fresh lifetime.
 *
 * A single boolean makes `capped` look like `reaped`, and a holder that reacts
 * to `reaped` by stopping is the safe reaction — but one that retries blindly is
 * the common reaction, and it becomes a hot loop against a lease it still owns.
 */
export type RenewRefusal = "reaped" | "capped";

/** Outcome of a renew: the new expiry, or why the lease was not extended. */
export type RenewResult =
	| { readonly ok: true; readonly expiresTs: number }
	| { readonly ok: false; readonly reason: RenewRefusal };

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
 * True when `table` already has `column`.
 *
 * Asked of the table rather than inferred from `user_version`, because the two
 * disagree in both directions: a fresh file is at version 0 with the column
 * already created, and a migration interrupted before its version bump is at
 * version 1 with the column present. Only the table itself is authoritative.
 */
function tableHasColumn(db: Database, table: string, column: string): boolean {
	// The table name is interpolated because PRAGMA takes no bind parameter. Every
	// caller passes a literal from this file, never caller-supplied text.
	//
	// `PRAGMA table_info` yields one row per column with the name in a `name`
	// field. The row type is stated rather than left to inference, because an
	// untyped `.all()` makes every field `unknown` and `row.name === column`
	// stops compiling — which is how an unread `.all()` and a wrong one look
	// identical until the typechecker forces the question.
	const rows = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all();
	return rows.some(row => row.name === column);
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
			  released_ts  INTEGER,
			  acquired_ts  INTEGER
			)`);
		db.run("CREATE INDEX IF NOT EXISTS idx_peer_leases_expires ON peer_leases(expires_ts)");

		// The idempotency index is created in the migration tail below, not here,
		// because v2 stores already have one WITH a different definition and
		// `CREATE INDEX IF NOT EXISTS` would silently keep the wrong one.

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

		// v1 → v2: the lifetime cap needs the moment a claim was FIRST taken, and
		// `CREATE TABLE IF NOT EXISTS` above will not add a column to a table that
		// already exists — so on an inherited database this ALTER is the only thing
		// that adds it.
		//
		// `acquired_ts` is backfilled as NULL rather than derived. Deriving it
		// would mean `expires_ts − ttl`, and the TTL in force at acquire time is
		// not recorded anywhere: a caller may have passed its own, and a lease that
		// has since been renewed no longer knows it. A guessed first-acquire time
		// would silently shorten an old holder's remaining lifetime, so the NULL
		// says "unknown" and `renewLease` refuses to apply a cap it cannot check —
		// visible, rather than a quiet wrong number. Inherited leases are re-taken
		// by releasing and acquiring again.
		//
		// The ALTER is guarded on the column being ABSENT, not on `value < 2`. Those
		// are not the same condition, and reading them as one breaks the commonest
		// case there is: on a brand-new file `value` is 0, the CREATE above has
		// already made the column, and the ALTER then adds it a second time —
		// "duplicate column name", so the store cannot be created at all. SQLite has
		// no `ADD COLUMN IF NOT EXISTS`, so the table is asked directly. It also
		// covers a migration interrupted between the DDL and the version bump, where
		// the columns are present but `user_version` still reads 1.
		if (!tableHasColumn(db, "peer_leases", "acquired_ts")) {
			db.run("ALTER TABLE peer_leases ADD COLUMN acquired_ts INTEGER");
		}

		// v2 → v3: the idempotency index gains `released_ts IS NULL`. SQLite has no
		// ALTER INDEX, so the old one is dropped and rebuilt. `IF EXISTS` on the
		// drop because a v1 file arrives here having never had it. This runs
		// unconditionally rather than under `value < 3` for the same reason the
		// ALTER above does: a file interrupted between the DDL and the version
		// bump must still converge, and rebuilding an index is idempotent.
		db.run("DROP INDEX IF EXISTS idx_peer_leases_idempotency");
		db.run(
			`CREATE UNIQUE INDEX IF NOT EXISTS idx_peer_leases_idempotency
			   ON peer_leases(owner, idempotency)
			 WHERE idempotency IS NOT NULL AND released_ts IS NULL`,
		);

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
		acquiredTs: (row.acquired_ts as number | null) ?? null,
	};
}

const SELECT_COLUMNS =
	"id, owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, released_ts, acquired_ts";

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
		//
		// The match is on key AND owner AND `path_pattern`. Dropping the third
		// predicate makes the same key with a DIFFERENT pattern return the old
		// lease: the caller asked to hold `b.txt`, was handed the lease for
		// `a.txt`, and had no way to tell — the reply says success and carries a
		// valid-looking token. A key identifies an INTENT, and reusing it for a
		// different intent is a conflict, not a replay. The reference
		// implementation reaches the same rule by fingerprinting the whole
		// payload; comparing the one field we let a caller vary keeps the same
		// guarantee without a second table.
		//
		// `released_ts IS NULL` is included so a key whose lease has ended is not
		// resurrected: a replay after release is a new claim, and the caller gets
		// a fresh token rather than a handle on a tombstone.
		if (options.idempotency !== undefined) {
			const prior = db
				.query<Record<string, unknown>, [string, string, string]>(
					`SELECT ${SELECT_COLUMNS} FROM peer_leases
					 WHERE idempotency = ? AND owner = ? AND path_pattern = ? AND released_ts IS NULL`,
				)
				.get(options.idempotency, options.owner, options.pathPattern);
			if (prior) {
				db.run("COMMIT");
				return { ok: true, lease: toLease(prior) };
			}
			// Same key, same owner, different ground: refuse rather than mints a
			// second row. The partial UNIQUE index below would reject the INSERT
			// anyway, but as an opaque constraint failure — and a caller who reads
			// that as "the path was busy" is wrong about why.
			const mismatched = db
				.query<Record<string, unknown>, [string, string, string]>(
					`SELECT ${SELECT_COLUMNS} FROM peer_leases
					 WHERE idempotency = ? AND owner = ? AND released_ts IS NULL AND path_pattern <> ?`,
				)
				.get(options.idempotency, options.owner, options.pathPattern);
			if (mismatched) {
				db.run("ROLLBACK");
				return { ok: false, conflicts: [toLease(mismatched)] };
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
			   (owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, released_ts, acquired_ts)
			 VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
			[
				options.owner,
				options.idempotency ?? null,
				options.pathPattern,
				exclusive ? 1 : 0,
				fenceToken,
				now + ttl,
				now,
			],
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
 * Push out a lease's expiry, or report why it could not be pushed.
 *
 * The match is on owner AND fence token AND `released_ts IS NULL`. Dropping the
 * third predicate lets a renewed row match its own tombstone: after the lease is
 * released, this would change one row, report success, and leave the holder
 * renewing a lease nobody can see.
 *
 * Two refusals, deliberately distinguishable — see {@link RenewRefusal}. The cap
 * check runs INSIDE the transaction that does the update, and it is an UPDATE
 * with an extra `acquired_ts` predicate rather than a read-then-write, so a
 * decision to extend cannot be taken against a row another writer has since
 * released.
 */
export function renewLease(db: Database, options: FenceOptions & { ttlMs?: number }): RenewResult {
	const now = options.now ?? Date.now();
	const ttl = Math.min(options.ttlMs ?? DEFAULT_TTL_MS, MAX_TTL_MS);

	db.run("BEGIN IMMEDIATE");
	try {
		// `acquired_ts IS NOT NULL AND ? - acquired_ts >= ?` folds the cap into the
		// same UPDATE. Writing it as "read the row, compare, then update" would let
		// the row change underneath between the two statements — which is the same
		// window the fence token exists to close, reopened inside the fence.
		const result = db.run(
			`UPDATE peer_leases SET expires_ts = ?
			 WHERE owner = ? AND fence_token = ? AND released_ts IS NULL
			   AND (acquired_ts IS NULL OR ? - acquired_ts < ?)`,
			[now + ttl, options.owner, options.fenceToken, now, PEER_LEASE_MAX_LIFETIME_MS],
		);
		if (result.changes === 1) {
			db.run("COMMIT");
			return { ok: true, expiresTs: now + ttl };
		}

		// Zero rows is ambiguous on its own: it is either "you no longer hold this"
		// or "you hold it but are past the cap". One more read separates them, and
		// it is read-only so it cannot itself lose the lease.
		const row = db
			.query<Record<string, unknown>, [string, number]>(
				"SELECT acquired_ts FROM peer_leases WHERE owner = ? AND fence_token = ? AND released_ts IS NULL",
			)
			.get(options.owner, options.fenceToken);
		db.run("COMMIT");
		if (row === null) return { ok: false, reason: "reaped" };
		return { ok: false, reason: "capped" };
	} catch (error) {
		db.run("ROLLBACK");
		throw error;
	}
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
