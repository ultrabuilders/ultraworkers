import { afterEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	acquireLease,
	openLeaseStore,
	pragmaValue,
	PEER_LEASE_MAX_LIFETIME_MS,
	releaseLease,
	renewLease,
} from "../src/lease/store";

/**
 * `epic-jwsy.4` — the lifetime cap, and the migration it forced.
 *
 * The rows here are mostly falsifiers for ways this has ALREADY been wrong, and two
 * of those ways failed while every other test in the package was green.
 */

const dirs: string[] = [];

async function tempDbPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-cap-"));
	dirs.push(dir);
	return path.join(dir, "leases.sqlite");
}

/** The v1 shape `epic-jwsy.2` shipped: seven columns, no `acquired_ts`. */
const V1_SCHEMA = `
	CREATE TABLE peer_leases (
	  id INTEGER PRIMARY KEY, owner TEXT NOT NULL, idempotency TEXT,
	  path_pattern TEXT NOT NULL, exclusive INTEGER NOT NULL,
	  fence_token INTEGER NOT NULL, expires_ts INTEGER NOT NULL, released_ts INTEGER
	)`;

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function openOrThrow(result: ReturnType<typeof acquireLease>) {
	if (!result.ok) throw new Error(`expected the acquire to win, got ${result.conflicts.length} conflict(s)`);
	return result.lease;
}

describe("acquire records when the claim was taken", () => {
	it("writes acquired_ts, because a column nobody populates silently disables the cap", async () => {
		// This row exists because the INSERT omitted `acquired_ts` and the whole
		// package stayed green. The cap in `renewLease` reads that column, and the
		// renew path treats NULL as "unknown" and refuses — so the omission did not
		// fail at the insert that made it. It disabled the one check that stops a
		// live, healthy, perfectly-renewing holder from sitting on a path forever,
		// and nothing reported it.
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));

		const row = db
			.query<{ acquired_ts: number | null }, [string]>("SELECT acquired_ts FROM peer_leases WHERE owner = ?")
			.get("alpha");
		expect(row?.acquired_ts).toBe(1_000);

		// And the consequence, stated as the behaviour a caller observes: a renew
		// well past the ceiling is refused. Without `acquired_ts` this renew would
		// succeed forever.
		const past = 1_000 + PEER_LEASE_MAX_LIFETIME_MS + 60_000;
		const refused = renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: past });
		expect(refused.ok).toBe(false);
		if (!refused.ok) expect(refused.reason).toBe("capped");
		db.close();
	});
});

describe("renewal past the lifetime cap", () => {
	it("refuses rather than quietly shortening, and leaves the expiry untouched", async () => {
		// §6.1 of the plan calls silent success the most dangerous failure there is:
		// a holder that believes it holds the path for the TTL it asked for. So the
		// refusal is a distinct outcome, and the row it refused to move is asserted
		// rather than assumed — a "refusal" that still wrote an expiry would satisfy
		// an outcome-only check.
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));
		const expiryOf = () =>
			db.query<{ expires_ts: number }, [string]>("SELECT expires_ts FROM peer_leases WHERE owner = ?").get("alpha")
				?.expires_ts;

		const before = expiryOf();
		const past = 1_000 + PEER_LEASE_MAX_LIFETIME_MS + 1_000;
		const refused = renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: past });

		expect(refused.ok).toBe(false);
		if (!refused.ok) expect(refused.reason).toBe("capped");
		expect(expiryOf()).toBe(before);
		db.close();
	});

	it("still renews freely inside the cap — the refusal is a deadline, not a switch", async () => {
		// A cap that refused everything would satisfy every row above. This one is
		// what keeps the ceiling from being a bug in the other direction.
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));

		// Repeatedly, on a healthy holder — the exact case the cap exists for, and
		// the one that must keep working right up to the deadline.
		let now = 1_000;
		for (let i = 0; i < 5; i++) {
			now += 60_000;
			const renewed = renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now });
			expect(renewed.ok).toBe(true);
		}
		expect(now).toBeLessThan(1_000 + PEER_LEASE_MAX_LIFETIME_MS);
		db.close();
	});

	it("separates 'you no longer hold this' from 'you may not extend it'", async () => {
		// The two refusals mean opposite things to a holder: one says stop, the other
		// says release and re-acquire. Collapsing them into a boolean teaches the
		// wrong response, and the common one — a blind retry — becomes a hot loop
		// against a lease the holder still owns.
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));

		expect(releaseLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: 2_000 })).toBe(true);
		const afterRelease = renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: 2_500 });
		expect(afterRelease.ok).toBe(false);
		if (!afterRelease.ok) expect(afterRelease.reason).toBe("reaped");
		db.close();
	});

	it("lets a holder past the cap recover by re-acquiring, with a fresh lifetime", async () => {
		// The bead's prescribed remedy. Without it the cap would be a dead end: the
		// only exit would be giving up the path, which is the opposite of the point.
		const db = openLeaseStore(await tempDbPath());
		const first = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));
		releaseLease(db, { owner: "alpha", fenceToken: first.fenceToken, now: 2_000 });

		const beyond = 1_000 + PEER_LEASE_MAX_LIFETIME_MS + 2_000;
		const second = openOrThrow(acquireLease(db, { owner: "beta", pathPattern: "a.txt", now: beyond }));
		expect(second.fenceToken).toBeGreaterThan(first.fenceToken);

		const renewed = renewLease(db, { owner: "beta", fenceToken: second.fenceToken, now: beyond + 60_000 });
		expect(renewed.ok).toBe(true);
		db.close();
	});
});

describe("v1 → v2 migration", () => {
	it("creates a brand-new store, which the unguarded ALTER made impossible", async () => {
		// On an empty file `user_version` is 0, the CREATE has already made
		// `acquired_ts`, and an ALTER keyed on the version alone adds it a second
		// time — "duplicate column name", so the store could not be created at all.
		// This is the commonest path there is, and every other test in the package
		// was green while it was broken.
		const db = openLeaseStore(await tempDbPath());
		expect(pragmaValue(db, "user_version")).toBe(2);
		db.close();
	});

	it("upgrades a v1 database without inventing an acquire time it never recorded", async () => {
		// Backfilling `expires_ts − ttl` would be a guess: the TTL in force at
		// acquire time is not stored anywhere, and a renewed lease no longer knows
		// it. A guessed time silently shortens an old holder's remaining life, so the
		// column stays NULL and the renew path refuses rather than applies a cap it
		// cannot check.
		const dbPath = await tempDbPath();
		const legacy = new Database(dbPath, { create: true });
		legacy.run(V1_SCHEMA);
		legacy.run("CREATE TABLE peer_fence (id INTEGER PRIMARY KEY CHECK (id = 1), next_token INTEGER NOT NULL)");
		legacy.run("INSERT INTO peer_fence (id, next_token) VALUES (1, 7)");
		legacy.run(
			`INSERT INTO peer_leases (owner, idempotency, path_pattern, exclusive, fence_token, expires_ts, released_ts)
			 VALUES ('alpha', NULL, 'src/a.ts', 1, 3, 999999, NULL)`,
		);
		legacy.run("PRAGMA user_version = 1");
		legacy.close();

		const db = openLeaseStore(dbPath);
		expect(pragmaValue(db, "user_version")).toBe(2);
		const inherited = db
			.query<{ acquired_ts: number | null }, []>("SELECT acquired_ts FROM peer_leases WHERE owner = 'alpha'")
			.get();
		expect(inherited?.acquired_ts).toBeNull();
		// The live lease and the fence counter are the state a migration must not cost.
		expect(
			db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM peer_leases WHERE released_ts IS NULL").get()?.n,
		).toBe(1);
		expect(
			db.query<{ next_token: number }, []>("SELECT next_token FROM peer_fence WHERE id = 1").get()?.next_token,
		).toBe(7);
		db.close();
	});

	it("re-runs after a migration interrupted before its version bump", async () => {
		// The columns are present but `user_version` still reads 1 — a crash between
		// the DDL and the bump. Keying the ALTER on the version re-adds the column
		// and throws; asking the table is idempotent.
		const dbPath = await tempDbPath();
		const half = new Database(dbPath, { create: true });
		half.run(V1_SCHEMA);
		half.run("ALTER TABLE peer_leases ADD COLUMN acquired_ts INTEGER");
		half.run("PRAGMA user_version = 1");
		half.close();

		const db = openLeaseStore(dbPath);
		expect(pragmaValue(db, "user_version")).toBe(2);
		db.close();
	});
});
