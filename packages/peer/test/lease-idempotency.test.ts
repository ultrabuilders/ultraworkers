import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { acquireLease, listLeaseHistory, openLeaseStore } from "../src/lease/store";

/**
 * `epic-jwsy.5` — the idempotency key on acquire.
 *
 * The contract being defended is a RETRY, not a repeat: a caller whose acquire
 * timed out re-sends the same key and must get the SAME lease back, holding the
 * same fence token. A second token would tell a caller that still owns the
 * first one that it had lost a lease it never knew it had.
 */

const dirs: string[] = [];

async function tempDbPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-idem-"));
	dirs.push(dir);
	return path.join(dir, "leases.sqlite");
}

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function openOrThrow(result: ReturnType<typeof acquireLease>) {
	if (!result.ok) throw new Error(`expected the acquire to win, got ${result.conflicts.length} conflict(s)`);
	return result.lease;
}

describe("idempotency key", () => {
	it("returns the SAME lease — same id, same token — for a retried key", async () => {
		const db = openLeaseStore(await tempDbPath());
		const first = openOrThrow(
			acquireLease(db, { owner: "alpha", pathPattern: "a.txt", idempotency: "k1", now: 1_000 }),
		);
		const retry = openOrThrow(
			acquireLease(db, { owner: "alpha", pathPattern: "a.txt", idempotency: "k1", now: 2_000 }),
		);

		// Not merely "succeeded": the same row and the same handle. A fresh token
		// would leave the caller holding a lease it had silently lost.
		expect(retry.id).toBe(first.id);
		expect(retry.fenceToken).toBe(first.fenceToken);
		// And the expiry is NOT pushed out by a replay — a retry must not become
		// a renewal, or a caller in a retry loop could hold a path forever.
		expect(retry.expiresTs).toBe(first.expiresTs);
		expect(listLeaseHistory(db, "a.txt")).toHaveLength(1);
		db.close();
	});

	it("lets two keyless acquires coexist — the case a plain UNIQUE index would silently break", async () => {
		// Every acquire that did not ask for a key has idempotency = NULL, and SQL
		// treats each NULL as distinct from every other. A non-partial UNIQUE
		// index on the column would therefore accept all of them while looking
		// like it enforced uniqueness. Nothing about acquiring twice WITH a key
		// would reveal that: both rows are non-NULL, so the plain index behaves.
		const db = openLeaseStore(await tempDbPath());
		openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));
		openOrThrow(acquireLease(db, { owner: "beta", pathPattern: "b.txt", now: 1_000 }));
		const third = openOrThrow(acquireLease(db, { owner: "gamma", pathPattern: "c.txt", now: 1_000 }));

		expect(listLeaseHistory(db).filter(l => l.idempotency === null)).toHaveLength(3);
		expect(third.idempotency).toBeNull();
		// Distinct rows, not one row served twice.
		expect(new Set(listLeaseHistory(db).map(l => l.id)).size).toBe(3);
		db.close();
	});

	it("refuses the same key on a DIFFERENT path instead of returning the old lease", async () => {
		// A key identifies an intent, not a caller. Reusing it for other ground
		// would hand back a lease for `a.txt` to someone who asked for `b.txt`,
		// reporting success and carrying a valid-looking token.
		const db = openLeaseStore(await tempDbPath());
		openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", idempotency: "k1", now: 1_000 }));

		const reused = acquireLease(db, { owner: "alpha", pathPattern: "b.txt", idempotency: "k1", now: 2_000 });
		expect(reused.ok).toBe(false);
		if (!reused.ok) expect(reused.conflicts.map(c => c.pathPattern)).toEqual(["a.txt"]);

		// …and it did not quietly create the second lease either.
		expect(listLeaseHistory(db, "b.txt")).toHaveLength(0);
		db.close();
	});

	it("scopes the key to its owner: same key, different holder, is a different intent", async () => {
		const db = openLeaseStore(await tempDbPath());
		openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", idempotency: "shared-key", now: 1_000 }));
		// beta asking with the same key on the same path loses on the PATH, not
		// on the key — alpha genuinely holds it.
		const beta = acquireLease(db, { owner: "beta", pathPattern: "a.txt", idempotency: "shared-key", now: 2_000 });
		expect(beta.ok).toBe(false);
		// On a different path, the same key under a different owner is fine: the
		// key's scope is (owner, key), and neither row is a replay of the other.
		openOrThrow(acquireLease(db, { owner: "beta", pathPattern: "b.txt", idempotency: "shared-key", now: 2_000 }));
		db.close();
	});

	it("does not resurrect a key whose lease has already ended", async () => {
		// After the TTL lapses and a reap tombstones the row, the same key
		// describes a NEW claim. Returning the tombstone would hand the caller a
		// handle on a row every other writer already treats as gone.
		const db = openLeaseStore(await tempDbPath());
		const first = openOrThrow(
			acquireLease(db, { owner: "alpha", pathPattern: "a.txt", idempotency: "k1", ttlMs: 1_000, now: 1_000 }),
		);
		// Past the TTL, a later acquire reaps it — so the replay below meets a
		// tombstoned row rather than a live one.
		const again = openOrThrow(
			acquireLease(db, { owner: "alpha", pathPattern: "a.txt", idempotency: "k1", ttlMs: 1_000, now: 50_000 }),
		);
		expect(again.fenceToken).toBeGreaterThan(first.fenceToken);
		expect(listLeaseHistory(db, "a.txt")).toHaveLength(2);
		expect(listLeaseHistory(db, "a.txt")[0].releasedTs).not.toBeNull();
		db.close();
	});

	it("keeps the partial index partial: the database itself refuses a duplicate key", async () => {
		// Proves the constraint is in the SCHEMA and not only in the read path —
		// a second writer that bypassed acquireLease would otherwise mint a
		// duplicate silently.
		const db = openLeaseStore(await tempDbPath());
		openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", idempotency: "k1", now: 1_000 }));

		expect(() =>
			db.run(
				`INSERT INTO peer_leases (owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, acquired_ts)
				 VALUES ('alpha', 'k1', 'zzz.txt', 1, 999, 999999, 1)`,
			),
		).toThrow(/UNIQUE/);

		// …and a NULL key is still admissible at the schema level, which is the
		// half a plain UNIQUE index gets wrong.
		expect(() =>
			db.run(
				`INSERT INTO peer_leases (owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, acquired_ts)
				 VALUES ('alpha', NULL, 'yyy.txt', 1, 998, 999999, 1)`,
			),
		).not.toThrow();
		db.close();
	});
});
