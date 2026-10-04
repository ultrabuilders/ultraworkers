import { Database } from "bun:sqlite";
import { getDbBusyTimeoutMs } from "@oh-my-pi/pi-utils";

/**
 * Central sequence allocation for the durable inbox.
 *
 * WHY THE WRITER CANNOT BE TRUSTED WITH THE NUMBER. `Date.now()` at the sender
 * has one-millisecond granularity, and a fleet of agents delivering into the same
 * inbox routinely lands several inside that window. Two envelopes then claim the
 * same sequence, and — because the filename is the order — one of them overwrites
 * the other. That loss is SILENT: no error is raised, the sender was told the
 * message was delivered, and the reader sees a contiguous inbox. A gap, by
 * contrast, is visible and recoverable, which is the asymmetry that makes central
 * allocation worth a database round trip.
 *
 * SHAPE COPIED FROM `lease/store.ts`, deliberately. That file already solves the
 * same problem for fence tokens, and solves it with a counter that is its own row
 * rather than `MAX(column)+1` over the rows it numbers — the reason given there is
 * the reason here: reaping the highest-numbered row would send the counter
 * backwards and re-issue a number an existing holder still carries. Here the
 * numbered rows ARE the inbox files, and retention deletes them by the thousands,
 * so `MAX(seq)+1` would re-issue sequence numbers existing filenames already use.
 * Two mechanisms, one shape, because the hazard is identical.
 *
 * WHY `BEGIN IMMEDIATE`. The lock is taken up front rather than upgraded
 * mid-transaction, so two senders serialise instead of both reading the counter,
 * computing the same value, and both writing it — the read-modify-write race this
 * module exists to make impossible.
 *
 * MEASURED, NOT ASSUMED. Swapping this for a deferred `BEGIN` changes nothing
 * observable, and the reason is worth recording: `ensureRow` issues an
 * `INSERT OR IGNORE` as the transaction's first statement, and a write is what
 * takes the lock, so the transaction acquires the write lock before the read
 * either way. Hoisting that INSERT out of the transaction — so the first
 * statement inside is the SELECT — and re-running 8 concurrent sender processes
 * then made deferred `BEGIN` fail LOUDLY with `SQLITE_BUSY` on the UPDATE, where
 * `BEGIN IMMEDIATE` still returned 320 distinct sequences. So the guarantee comes
 * from "a write precedes the read-modify-write", and `IMMEDIATE` makes that true
 * regardless of the order statements end up in. Cheap, and one fewer thing a
 * future edit can silently unbalance.
 *
 * For contrast, a build with NO transaction at all does collide, and badly: the
 * same 8-process probe returned `unique=1`, every allocation the same number.
 * That is the failure this table exists to prevent, and it is invisible from a
 * single process — which is why the cross-process probe exists at all.
 */

const SCHEMA_VERSION = 1;

function tableHasColumn(db: Database, table: string, column: string): boolean {
	return (
		db
			.query<{ n: number }, [string, string]>("SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?")
			.get(table, column)?.n !== 0
	);
}

function migrate(db: Database): void {
	const value = Number(db.query<{ user_version: number }, []>("PRAGMA user_version").get()?.user_version ?? 0);
	if (value > SCHEMA_VERSION) {
		throw new Error(`inbox sequence schema v${value} is newer than this build understands (v${SCHEMA_VERSION})`);
	}
	if (value === SCHEMA_VERSION) return;

	db.transaction(() => {
		// `mailbox` is the identity whose inbox this row numbers. Keying the counter
		// on it rather than assuming a single inbox is what lets two mailboxes share
		// one database file without sharing a counter — a shared-file layout then
		// costs nothing instead of becoming a data-corruption bug later.
		//
		// `next_seq` starts at 1 so sequence 0 keeps its meaning as "before the
		// first message", which is what a fresh cursor passes as `afterSeq`. Handing
		// 0 out as a real sequence would make that sentinel ambiguous.
		db.run(`
			CREATE TABLE IF NOT EXISTS peer_inbox_seq (
			  mailbox  TEXT    NOT NULL,
			  next_seq INTEGER NOT NULL,
			  PRIMARY KEY (mailbox)
			)`);
		// An inherited database from before `mailbox` existed has a table whose
		// shape differs; SQLite has no ADD COLUMN IF NOT EXISTS, so the table is
		// asked directly. Also covers a migration interrupted between the DDL and
		// the version bump, where the column is present but `user_version` is stale.
		if (!tableHasColumn(db, "peer_inbox_seq", "mailbox")) {
			db.run("ALTER TABLE peer_inbox_seq ADD COLUMN mailbox TEXT NOT NULL DEFAULT ''");
		}

		db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
	})();
}

/**
 * Open (creating if needed) a database that hands out inbox sequence numbers.
 *
 * The path is the store's own, not the inbox directory's: sequences must survive
 * the inbox being deleted, because a new inbox whose numbering restarted at 1
 * would re-deliver sequence numbers a reader cursor has already passed.
 *
 * The pragma order is load-bearing and is copied verbatim from `lease/store.ts`,
 * whose docblock states the rule: `busy_timeout` must precede any lock-taking
 * statement because Bun defaults it to 0, so two senders starting together raise
 * SQLITE_BUSY at each other instead of waiting. `journal_mode = WAL` takes an
 * exclusive lock by itself, so a timeout set after it is already too late. This
 * was measured, not assumed — with the timeout omitted, 8 concurrent sender
 * processes did not collide on a sequence number, they failed to allocate at all.
 */
export function openSeqStore(path: string): Database {
	const db = new Database(path, { create: true });
	db.run(`PRAGMA busy_timeout = ${getDbBusyTimeoutMs()}`);
	db.run("PRAGMA journal_mode = WAL");
	db.run("PRAGMA synchronous = NORMAL");
	migrate(db);
	return db;
}

/** Seed a mailbox's counter if absent. Idempotent, so a restart is not an error. */
function ensureRow(db: Database, mailbox: string): void {
	db.run("INSERT OR IGNORE INTO peer_inbox_seq (mailbox, next_seq) VALUES (?, 1)", [mailbox]);
}

/**
 * Reserve exactly one sequence number.
 *
 * The transaction commits before returning, so a caller that then fails to write
 * the file has burned a sequence. That is the correct direction to err: the burn
 * surfaces as a reported gap, whereas a reused number would corrupt the inbox
 * invisibly.
 */
export function nextSeq(db: Database, mailbox = ""): number {
	db.run("BEGIN IMMEDIATE");
	try {
		ensureRow(db, mailbox);
		const row = db
			.query<{ next_seq: number }, [string]>("SELECT next_seq FROM peer_inbox_seq WHERE mailbox = ?")
			.get(mailbox);
		if (!row) throw new Error(`inbox sequence counter row for mailbox "${mailbox}" is missing`);

		db.run("UPDATE peer_inbox_seq SET next_seq = ? WHERE mailbox = ?", [row.next_seq + 1, mailbox]);
		db.run("COMMIT");
		return row.next_seq;
	} catch (error) {
		db.run("ROLLBACK");
		throw error;
	}
}

/** Reserve `count` consecutive numbers in one transaction, oldest first. */
export function nextSeqs(db: Database, count: number, mailbox = ""): number[] {
	if (!Number.isSafeInteger(count) || count < 1) {
		throw new RangeError(`count must be a positive safe integer, got ${count}`);
	}
	db.run("BEGIN IMMEDIATE");
	try {
		ensureRow(db, mailbox);
		const row = db
			.query<{ next_seq: number }, [string]>("SELECT next_seq FROM peer_inbox_seq WHERE mailbox = ?")
			.get(mailbox);
		if (!row) throw new Error(`inbox sequence counter row for mailbox "${mailbox}" is missing`);

		db.run("UPDATE peer_inbox_seq SET next_seq = ? WHERE mailbox = ?", [row.next_seq + count, mailbox]);
		db.run("COMMIT");
		// Oldest-first so the caller can append in order; a reversed array would
		// write files whose lexicographic order contradicts their arrival.
		return Array.from({ length: count }, (_, i) => row.next_seq + i);
	} catch (error) {
		db.run("ROLLBACK");
		throw error;
	}
}

/**
 * The next number that would be handed out, without taking it.
 *
 * For diagnostics only: this is a snapshot the instant it is read, so two callers
 * observing the same value is expected and correct. Anything that must OWN a
 * number calls {@link nextSeq}.
 */
export function peekSeq(db: Database, mailbox = ""): number {
	ensureRow(db, mailbox);
	const row = db
		.query<{ next_seq: number }, [string]>("SELECT next_seq FROM peer_inbox_seq WHERE mailbox = ?")
		.get(mailbox);
	if (!row) throw new Error(`inbox sequence counter row for mailbox "${mailbox}" is missing`);
	return row.next_seq;
}
