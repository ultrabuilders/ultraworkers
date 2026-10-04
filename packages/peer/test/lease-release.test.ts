import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import {
	acquireLease,
	listLeaseHistory,
	listLeases,
	openLeaseStore,
	PEER_LEASE_MAX_LIFETIME_MS,
	pragmaValue,
	releaseLease,
	renewLease,
} from "../src/lease/store";

/**
 * `epic-jwsy.4` — release idempotence, the lifetime cap, and the tombstone's
 * answer. Real SQLite in a tmpdir throughout: the cap is enforced by a predicate
 * inside one UPDATE, and a mock would let that UPDATE match whatever it liked.
 */

const dirs: string[] = [];

async function tempDbPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-release-"));
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

describe("release", () => {
	it("is idempotent: the second release changes nothing and does not throw", async () => {
		// A caller that releases twice is not making a mistake, so a throw here
		// would teach an agent that releasing needs care. The tombstone is
		// already the end state; there is nothing to report.
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));

		expect(releaseLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: 2_000 })).toBe(true);
		expect(releaseLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: 3_000 })).toBe(false);

		// And the row says so once, not twice.
		const history = listLeaseHistory(db, "a.txt");
		expect(history).toHaveLength(1);
		expect(history[0].releasedTs).toBe(2_000);
		db.close();
	});

	it("keeps the tombstone answering who held it", async () => {
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "src/a.ts", now: 1_000 }));
		releaseLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: 2_000 });

		// History survives a release — this is the whole reason release is an
		// UPDATE and never a DELETE.
		const history = listLeaseHistory(db, "src/a.ts");
		expect(history).toHaveLength(1);
		expect(history[0].owner).toBe("alpha");
		// …while the live view has already forgotten it.
		expect(listLeases(db, "src/a.ts", 3_000)).toHaveLength(0);
		db.close();
	});
});

describe("lifetime cap", () => {
	it("refuses a renew past the cap instead of silently shortening it", async () => {
		const db = openLeaseStore(await tempDbPath());
		// A long TTL, so the only thing that can stop this renew is the cap.
		const lease = openOrThrow(
			acquireLease(db, { owner: "alpha", pathPattern: "a.txt", ttlMs: PEER_LEASE_MAX_LIFETIME_MS, now: 1_000 }),
		);

		// Renew on schedule, stopping strictly inside the cap. The boundary is
		// `elapsed < MAX`, so the last renewal that still succeeds is the one at
		// exactly MAX − 1; stepping by half the cap and stopping on `<` would land
		// on the boundary itself and fail for the wrong reason.
		const step = PEER_LEASE_MAX_LIFETIME_MS / 4;
		let at = 1_000;
		while (at - 1_000 < PEER_LEASE_MAX_LIFETIME_MS - 1) {
			at += step;
			if (at - 1_000 >= PEER_LEASE_MAX_LIFETIME_MS - 1) break;
			const renewed = renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: at, ttlMs: 1_000 });
			expect(renewed.ok).toBe(true);
		}

		// Past the cap: refused, and refused LOUDLY.
		const past = renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: at + step, ttlMs: 1_000 });
		expect(past).toEqual({ ok: false, reason: "capped" });

		// The lease is NOT extended behind the caller's back. Read through the history
		// view: by `at + step` the TTL has lapsed, so the live view filters the row
		// out and there would be nothing left to compare against.
		const held = listLeaseHistory(db, "a.txt")[0];
		expect(held.releasedTs).toBeNull();
		expect(held.expiresTs).toBeLessThanOrEqual(at + step);
		db.close();
	});

	it("tells 'capped' apart from 'reaped', because they call for opposite action", async () => {
		const db = openLeaseStore(await tempDbPath());
		const capped = openOrThrow(
			acquireLease(db, { owner: "cap", pathPattern: "a.txt", ttlMs: PEER_LEASE_MAX_LIFETIME_MS, now: 1_000 }),
		);
		const reaped = openOrThrow(acquireLease(db, { owner: "reap", pathPattern: "b.txt", now: 1_000 }));

		const capResult = renewLease(db, {
			owner: "cap",
			fenceToken: capped.fenceToken,
			now: 1_000 + PEER_LEASE_MAX_LIFETIME_MS + 1,
			ttlMs: 1_000,
		});
		// `reaped` is produced by releasing the lease, not by waiting: a renew at a
		// late instant for a lease still on the row is a CAP, and only a row that
		// is gone or tombstoned reports `reaped`. Using a wrong owner would also
		// produce it, but for a reason unrelated to what this distinguishes.
		expect(releaseLease(db, { owner: "reap", fenceToken: reaped.fenceToken, now: 2_000 })).toBe(true);
		const reapResult = renewLease(db, { owner: "reap", fenceToken: reaped.fenceToken, now: 3_000, ttlMs: 1_000 });

		expect(capResult).toEqual({ ok: false, reason: "capped" });
		expect(reapResult).toEqual({ ok: false, reason: "reaped" });
		// Different values, not one false standing in for both.
		expect(capResult.ok === false && reapResult.ok === false && capResult.reason !== reapResult.reason).toBe(true);
		db.close();
	});

	it("measures the cap from the first acquire, not from the last renew", async () => {
		// A cap that resets on each renew is not a cap. This renews repeatedly on
		// a schedule and must still hit the wall measured from acquire time.
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 0, ttlMs: 1_000 }));
		expect(lease.acquiredTs).toBe(0);

		for (let at = 1_000; at <= PEER_LEASE_MAX_LIFETIME_MS - 1_000; at += 1_000) {
			expect(renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: at, ttlMs: 1_000 }).ok).toBe(true);
		}
		// Still inside: the boundary is measured from acquire, so ~30 min of
		// renewals have elapsed and the next one is refused.
		expect(
			renewLease(db, {
				owner: "alpha",
				fenceToken: lease.fenceToken,
				now: PEER_LEASE_MAX_LIFETIME_MS,
				ttlMs: 1_000,
			}),
		).toEqual({
			ok: false,
			reason: "capped",
		});
		db.close();
	});

	it("lets a holder past the cap re-take the path by releasing and acquiring again", async () => {
		// The documented recovery, and the reason the cap is a refusal rather than
		// a truncation: a fresh acquire mints a new token AND a new lifetime.
		const db = openLeaseStore(await tempDbPath());
		const first = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 0, ttlMs: 1_000 }));
		expect(
			renewLease(db, { owner: "alpha", fenceToken: first.fenceToken, now: PEER_LEASE_MAX_LIFETIME_MS, ttlMs: 1_000 })
				.ok,
		).toBe(false);

		expect(releaseLease(db, { owner: "alpha", fenceToken: first.fenceToken, now: 1_000 })).toBe(true);
		const second = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 2_000, ttlMs: 1_000 }));
		expect(second.fenceToken).toBeGreaterThan(first.fenceToken);
		expect(second.acquiredTs).toBe(2_000);
		expect(renewLease(db, { owner: "alpha", fenceToken: second.fenceToken, now: 3_000, ttlMs: 1_000 }).ok).toBe(true);
		db.close();
	});
});

describe("schema migration", () => {
	it("adds acquired_ts to a v1 database and leaves inherited leases with an unknown acquire time", async () => {
		// Build a v1 database by hand — the point is that an EXISTING file migrates,
		// which CREATE TABLE IF NOT EXISTS would silently skip.
		const file = await tempDbPath();
		const legacy = new Database(file, { create: true });
		legacy.run(`
			CREATE TABLE peer_leases (
			  id INTEGER PRIMARY KEY, owner TEXT NOT NULL, idempotency TEXT,
			  path_pattern TEXT NOT NULL, exclusive INTEGER NOT NULL,
			  fence_token INTEGER NOT NULL, expires_ts INTEGER NOT NULL, released_ts INTEGER
			)`);
		legacy.run("INSERT INTO peer_leases VALUES (1, 'old', NULL, 'a.txt', 1, 7, 900000, NULL)");
		legacy.run("PRAGMA user_version = 1");
		legacy.close();

		const db = openLeaseStore(file);
		// A literal, for the reason in `lease-store.test.ts`: an inherited file must
		// reach the version THIS build understands, and a migration that returned
		// early would leave it at 1 — which the older-build guard would then reject.
		expect(pragmaValue(db, "user_version")).toBe(4);

		const inherited = listLeaseHistory(db, "a.txt");
		expect(inherited).toHaveLength(1);
		// NULL, not a guess. Deriving `expires_ts - ttl` would silently shorten an
		// old holder's remaining life, because the TTL in force at acquire time is
		// not recorded anywhere.
		expect(inherited[0].acquiredTs).toBeNull();

		// And an uncapped renew still works on it, rather than treating NULL as 0
		// and expiring every inherited lease on its first renewal.
		expect(renewLease(db, { owner: "old", fenceToken: 7, now: 1_000, ttlMs: 1_000 }).ok).toBe(true);
		db.close();
	});

	it("refuses to open a database written by a newer build", async () => {
		const file = await tempDbPath();
		const ahead = new Database(file, { create: true });
		ahead.run("PRAGMA user_version = 99");
		ahead.close();
		expect(() => openLeaseStore(file)).toThrow(/newer than this build/);
	});
});
