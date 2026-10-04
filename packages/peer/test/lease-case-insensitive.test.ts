import { afterEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	acquireLease,
	leasePathKey,
	listLeaseHistory,
	listLeases,
	openLeaseStore,
	pragmaValue,
} from "../src/lease/store";

/**
 * §18.7 row 6 — "lease acquire/release/renew round-trip on NTFS, including
 * case-insensitivity: `BlueLake` and `bluelake` are one owner, because
 * uniqueness is in the store".
 *
 * ## What was wrong, measured rather than read
 *
 * Two EXCLUSIVE leases on one NTFS path. Not a theoretical reading of the code:
 *
 * ```
 * acquireLease(C:\Repo\src, exclusive)  → GRANTED
 * acquireLease(c:\repo\SRC, exclusive)  → GRANTED      ← one file, two owners
 * ```
 *
 * `path_pattern` was compared with SQLite's default BINARY collation, so
 * case never entered the comparison. The plan believed this was already handled
 * (`docs/peer-messaging.md:3991`: "NTFS is case-insensitive | Already handled —
 * §3.2 puts uniqueness in the store"). That is a **wrong join**, of the shape
 * this package has produced before: §3.2's uniqueness is about the NAME store,
 * and the lease store's `path_pattern` is a different string in a different
 * table. Two true statements; the sentence between them was false.
 *
 * ## Why the fix is a WRITE-side normalisation and not a collation
 *
 * `COLLATE NOCASE` on the four comparison sites would have been shorter and would
 * have been wrong on POSIX: `/repo/A` and `/repo/a` are two files there, so
 * folding refuses a lease the caller legitimately asked for. Normalising once
 * where the row is written makes every reader agree by construction — a call
 * site that forgot the rule would have had to forget the SAME rule four times.
 *
 * ## WHAT THESE ROWS DO NOT COVER — stated, not hidden
 *
 * The database-level consequence of `fold` — a second acquire on a case variant
 * being REFUSED — can only be observed where the default IS `fold`, i.e. on
 * Windows. It is not asserted here, and deliberately so: a `skipIf(win32)`
 * assertion is the shape that reads as coverage and executes nowhere, which this
 * file's sibling rows were just converted away from.
 *
 * What IS covered on every platform is the RULE (`leasePathKey`), because the
 * mode is a parameter rather than a hidden read of `process.platform`, and the
 * POSIX contract end to end, because that is the direction a wrong fix breaks.
 *
 * ## Why there is NO row for the locale hazard
 *
 * `leasePathKey` uses `toLowerCase`, not `toLocaleLowerCase`, because a Turkish
 * locale turns `I` into a dotless `ı` and two sessions with different locales
 * would then disagree about one file. That is a real property and it is stated
 * in the implementation's docblock — but it is **not testable on this runtime**,
 * and an unfalsifiable row is worse than none: it reads as coverage and cannot
 * fail. Measured, with the locale set two ways:
 *
 * ```
 * LANG=tr_TR.UTF-8 LC_ALL=tr_TR.UTF-8 bun -e '"I".toLocaleLowerCase()'
 *   → "i"        Intl default locale → en-US
 * ```
 *
 * A child process does not help either — the locale is resolved at startup, not
 * per call. So the mutation `toLowerCase → toLocaleLowerCase` **survives every
 * row in this file**, and would keep surviving on any runtime whose default
 * locale is not Turkish. Do not add a row for it without first finding a way to
 * make the runtime Turkish; a row that passes under both spellings certifies
 * nothing.
 */
const dirs: string[] = [];

async function tempDbPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-case-"));
	dirs.push(dir);
	return path.join(dir, "leases.sqlite");
}

/** The v3 shape: no path normalisation, so rows carry their writer's spelling. */
const V3_SCHEMA = `
	CREATE TABLE peer_leases (
	  id INTEGER PRIMARY KEY, owner TEXT NOT NULL, idempotency TEXT,
	  path_pattern TEXT NOT NULL, exclusive INTEGER NOT NULL,
	  fence_token INTEGER NOT NULL, expires_ts INTEGER NOT NULL, released_ts INTEGER,
	  acquired_ts INTEGER
	);
	CREATE TABLE peer_fence (id INTEGER PRIMARY KEY CHECK (id = 1), next_token INTEGER NOT NULL);
	INSERT INTO peer_fence (id, next_token) VALUES (1, 1);
	PRAGMA user_version = 3;
`;

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("the lease path key", () => {
	it("collapses two spellings of one NTFS path, and keeps two POSIX paths apart", () => {
		// The rule, runnable on every platform because the mode is a parameter.
		// Asserted as a PAIR because either half alone is satisfiable by a
		// `toLowerCase` and nothing else: a key that folds everything passes the
		// first line and is exactly the bug the second line exists to prevent.
		expect(leasePathKey("C:\\Repo\\src", "fold")).toBe(leasePathKey("c:\\repo\\SRC", "fold"));
		expect(leasePathKey("/repo/A", "exact")).toBe("/repo/A");
		expect(leasePathKey("/repo/a", "exact")).not.toBe(leasePathKey("/repo/A", "exact"));
		// And `exact` is genuinely the identity, so a caller reading back a stored
		// pattern on POSIX sees the spelling it passed in.
		expect(leasePathKey("/Repo/Src", "exact")).toBe("/Repo/Src");
	});
});

describe.skipIf(process.platform === "win32")("a case-SENSITIVE filesystem", () => {
	// Skipped on Windows because the premise is false there, not because the code
	// is unreachable: NTFS folds, so the two acquisitions below legitimately
	// collide. Its counterpart — that they DO collide on Windows — is the coverage
	// this file states it does not have.

	it("grants two distinct spellings, because these are two files", async () => {
		// The regression a correct fix must not introduce. Folding unconditionally
		// would refuse this lease: the caller asked for `/repo/a`, nobody holds it,
		// and a refusal reads as "someone else is editing that file" — a false
		// report about a file that does not exist.
		const db = openLeaseStore(await tempDbPath());
		const now = Date.now();

		const first = acquireLease(db, { owner: "Alpha", pathPattern: "/repo/A", exclusive: true, now });
		const second = acquireLease(db, { owner: "Beta", pathPattern: "/repo/a", exclusive: true, now: now + 1 });

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(listLeases(db, "/repo/a", now + 2).map(lease => lease.owner)).toEqual(["Beta"]);
	});

	it("still refuses the SAME path twice, so normalisation did not disable the fence", async () => {
		// The other direction. A "fix" that normalised by dropping the pattern, or
		// that compared only the owner, would pass the row above and hand out two
		// exclusive leases on one path — the failure the whole store exists to stop.
		const db = openLeaseStore(await tempDbPath());
		const now = Date.now();

		expect(acquireLease(db, { owner: "Alpha", pathPattern: "/repo/src", exclusive: true, now }).ok).toBe(true);
		const second = acquireLease(db, { owner: "Beta", pathPattern: "/repo/src", exclusive: true, now: now + 1 });
		expect(second.ok).toBe(false);
	});

	it("round-trips a lease through list and history under the spelling it was given", async () => {
		// The regression a write-side normalisation could plausibly introduce: rows
		// stored under a key the readers do not recompute. Both readers filter on
		// `path_pattern`, so a store that normalised the write and not the filter
		// would return an empty list for a lease that exists.
		const db = openLeaseStore(await tempDbPath());
		const now = Date.now();
		acquireLease(db, { owner: "Alpha", pathPattern: "/Repo/Src", exclusive: true, now });

		expect(listLeases(db, "/Repo/Src", now + 1).map(lease => lease.pathPattern)).toEqual(["/Repo/Src"]);
		expect(listLeaseHistory(db, "/Repo/Src").map(lease => lease.owner)).toEqual(["Alpha"]);
		// Omitting the pattern still lists everything.
		expect(listLeases(db, undefined, now + 1)).toHaveLength(1);
	});
});

describe("upgrading a store written before the key existed", () => {
	it("opens a v3 database and keeps its rows readable", async () => {
		// The migration's whole reason for existing. An inherited row carries
		// whatever spelling its writer used; if the migration failed to converge,
		// the store either refuses to open or opens onto rows nothing can find.
		const file = await tempDbPath();
		const inherited = new Database(file, { create: true });
		inherited.run(V3_SCHEMA);
		inherited.run(
			`INSERT INTO peer_leases
			   (owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, released_ts, acquired_ts)
			 VALUES ('Alpha', NULL, '/repo/legacy', 1, 7, ?, NULL, ?)`,
			[Date.now() + 60_000, Date.now()],
		);
		inherited.close();

		const db = openLeaseStore(file);
		expect(Number(pragmaValue(db, "user_version"))).toBe(4);
		const leases = listLeaseHistory(db, "/repo/legacy");
		expect(leases).toHaveLength(1);
		expect(leases[0]?.owner).toBe("Alpha");
		expect(leases[0]?.fenceToken).toBe(7);
	});

	it("creates a brand-new store at the current version", async () => {
		// The other migration path. `user_version` starts at 0 on a fresh file, so a
		// migration guarded on the version rather than on the shape runs its DDL
		// against a table it has already created — the "duplicate column name" case
		// the `acquired_ts` guard exists for, and this version must not repeat it.
		const db = openLeaseStore(await tempDbPath());
		expect(Number(pragmaValue(db, "user_version"))).toBe(4);
		expect(acquireLease(db, { owner: "Alpha", pathPattern: "/repo/fresh", exclusive: true }).ok).toBe(true);
	});
});
