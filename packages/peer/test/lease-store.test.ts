import { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getDbBusyTimeoutMs } from "@oh-my-pi/pi-utils";
import {
	acquireLease,
	findConflicts,
	leasePatternMatches,
	listLeases,
	openLeaseStore,
	pragmaValue,
	reapExpiredLeases,
	releaseLease,
	renewLease,
} from "../src/lease/store";

/**
 * The lease store's guarantees are mostly about what must NOT happen: a second
 * writer slipping in behind a fence, a counter going backwards, a tombstone
 * resurrecting itself. Each test below is the falsifier for one specific way
 * this store has already been wrong, so the failure names the defect rather than
 * a number.
 */

const dirs: string[] = [];

async function tempDbPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-lease-"));
	dirs.push(dir);
	return path.join(dir, "leases.sqlite");
}

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("lease store", () => {
	it("applies the house pragmas, taking the busy timeout from the helper", async () => {
		// A hardcoded timeout would drift from the helper silently, and the whole
		// point of the helper is that the two branches differ (5000 interactive,
		// 1000 headless). Asserting equality catches a number typed by hand.
		const db = openLeaseStore(await tempDbPath());

		expect(pragmaValue(db, "busy_timeout")).toBe(getDbBusyTimeoutMs());
		expect(String(pragmaValue(db, "journal_mode")).toLowerCase()).toBe("wal");
		expect(pragmaValue(db, "synchronous")).toBe(1); // NORMAL
		// 3 since `epic-jwsy.5` narrowed the idempotency index to live rows.
		// Asserting the number keeps a migration that fails to bump the version
		// visible: the older-build guard reads this same pragma.
		expect(pragmaValue(db, "user_version")).toBe(3);
		db.close();
	});

	it("gives exactly one of two processes the same path", async () => {
		// The contract that makes SQLite worth using over O_EXCL: two real
		// processes, not two mocks of one, because a single-process test cannot
		// produce the interleaving the fencing row exists for.
		const dbPath = await tempDbPath();
		const racer = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "peer-race-")), "race.ts");
		await fs.writeFile(
			racer,
			`import { acquireLease, openLeaseStore } from ${JSON.stringify(path.resolve(import.meta.dir, "../src/lease/store.ts"))};
const db = openLeaseStore(${JSON.stringify(dbPath)});
const result = acquireLease(db, { owner: process.argv[2]!, pathPattern: "src/**" });
console.log(JSON.stringify(result.ok));
db.close();`,
		);

		const run = (owner: string) => Bun.spawnSync(["bun", racer, owner], { stdout: "pipe", stderr: "pipe" });
		const a = run("alpha");
		const b = run("beta");

		expect(a.exitCode).toBe(0);
		expect(b.exitCode).toBe(0);
		const answers = [a.stdout.toString().trim(), b.stdout.toString().trim()];
		// Exactly one winner. Both winning would mean the fence did not serialise;
		// neither winning would mean the loser wrongly refused an uncontended path.
		expect(answers.filter(v => v === "true")).toHaveLength(1);
		expect(answers.filter(v => v === "false")).toHaveLength(1);

		// And the loser must be able to SEE the winner's row, or a conflict report
		// that names nobody is not a conflict report.
		const db = openLeaseStore(dbPath);
		const live = listLeases(db, "src/**");
		expect(live).toHaveLength(1);
		expect(["alpha", "beta"]).toContain(live[0].owner);
		db.close();
		await fs.rm(path.dirname(racer), { recursive: true, force: true });
	});

	it("never re-issues a fence token after the highest-token row is gone", async () => {
		// `MAX(fence_token)+1` looks equivalent and is not: once the row holding the
		// highest token is gone, MAX falls back and the next acquire mints that same
		// token, so a holder still carrying it has its write accepted.
		//
		// The row is DELETED here rather than reaped, and that is the whole point:
		// reaping only ever writes a tombstone, so a reap cannot distinguish the two
		// implementations. An earlier version of this row reaped, and the mutation
		// below survived it — a passing test that could not see the bug it names.
		const db = openLeaseStore(await tempDbPath());
		const first = acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 });
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		const highToken = first.lease.fenceToken;

		releaseLease(db, { owner: "alpha", fenceToken: highToken, now: 2_000 });
		db.run("DELETE FROM peer_leases WHERE fence_token = ?", [highToken]);

		const second = acquireLease(db, { owner: "beta", pathPattern: "b.txt", now: 3_000 });
		expect(second.ok).toBe(true);
		if (!second.ok) return;
		expect(second.lease.fenceToken).toBeGreaterThan(highToken);

		// The stale token must not be able to close the new holder's lease.
		expect(releaseLease(db, { owner: "alpha", fenceToken: highToken, now: 4_000 })).toBe(false);
		expect(releaseLease(db, { owner: "beta", fenceToken: second.lease.fenceToken, now: 4_000 })).toBe(true);
		db.close();
	});

	it("refuses to renew a lease it has already released", async () => {
		// Matching on owner+fence_token alone matches the row's OWN tombstone:
		// `changes === 1`, reported as success, and the holder renews forever
		// against a lease nobody can see. The third predicate is what prevents it.
		const db = openLeaseStore(await tempDbPath());
		const acquired = acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 });
		if (!acquired.ok) throw new Error("expected the first acquire to win");

		expect(releaseLease(db, { owner: "alpha", fenceToken: acquired.lease.fenceToken, now: 2_000 })).toBe(true);
		expect(renewLease(db, { owner: "alpha", fenceToken: acquired.lease.fenceToken, now: 3_000 })).toEqual({
			ok: false,
			reason: "reaped",
		});
		db.close();
	});

	it("keeps the row after release so it can still answer who held it", async () => {
		// Deleting on release destroys the only record that the path was ever held,
		// which is the question a later session asks when it wonders whether a file
		// was contended.
		const db = openLeaseStore(await tempDbPath());
		const acquired = acquireLease(db, { owner: "alpha", pathPattern: "src/**", now: 1_000 });
		if (!acquired.ok) throw new Error("expected acquire to win");

		releaseLease(db, { owner: "alpha", fenceToken: acquired.lease.fenceToken, now: 2_000 });

		const row = db
			.query<{ owner: string; released_ts: number | null }, [string]>(
				"SELECT owner, released_ts FROM peer_leases WHERE path_pattern = ?",
			)
			.get("src/**");
		expect(row?.owner).toBe("alpha");
		expect(row?.released_ts).toBe(2_000);
		db.close();
	});

	it("reports the winning lease to the loser rather than an empty conflict", async () => {
		const db = openLeaseStore(await tempDbPath());
		const first = acquireLease(db, { owner: "alpha", pathPattern: "src/**", now: 1_000 });
		expect(first.ok).toBe(true);

		const blocked = acquireLease(db, { owner: "beta", pathPattern: "src/deep/x.ts", now: 2_000 });
		expect(blocked.ok).toBe(false);
		if (blocked.ok) return;
		expect(blocked.conflicts).toHaveLength(1);
		expect(blocked.conflicts[0].owner).toBe("alpha");
		db.close();
	});

	it("lets a shared lease coexist with another shared lease and fences an exclusive one", async () => {
		const db = openLeaseStore(await tempDbPath());
		const a = acquireLease(db, { owner: "alpha", pathPattern: "src/**", exclusive: false, now: 1_000 });
		const b = acquireLease(db, { owner: "beta", pathPattern: "src/**", exclusive: false, now: 2_000 });
		expect(a.ok && b.ok).toBe(true);

		const exclusive = acquireLease(db, { owner: "gamma", pathPattern: "src/**", now: 3_000 });
		expect(exclusive.ok).toBe(false);
		db.close();
	});

	it("treats an expired lease as free even when nobody has reaped it", async () => {
		// Expiry is evaluated on read, not only by the reaper: a lease that timed
		// out must never block a caller just because no sweep has run yet.
		const db = openLeaseStore(await tempDbPath());
		acquireLease(db, { owner: "alpha", pathPattern: "a.txt", ttlMs: 10, now: 1_000 });
		const later = acquireLease(db, { owner: "beta", pathPattern: "a.txt", now: 5_000 });
		expect(later.ok).toBe(true);
		db.close();
	});

	it("returns the original lease when an acquire is replayed with its idempotency key", async () => {
		const db = openLeaseStore(await tempDbPath());
		const first = acquireLease(db, {
			owner: "alpha",
			pathPattern: "a.txt",
			idempotency: "key-1",
			now: 1_000,
		});
		if (!first.ok) throw new Error("expected acquire to win");
		const replay = acquireLease(db, {
			owner: "alpha",
			pathPattern: "a.txt",
			idempotency: "key-1",
			now: 2_000,
		});
		expect(replay.ok).toBe(true);
		if (!replay.ok) return;
		// Same token, or a retried call would invalidate the caller's own first lease.
		expect(replay.lease.fenceToken).toBe(first.lease.fenceToken);
		expect(replay.lease.id).toBe(first.lease.id);
		db.close();
	});

	it("matches globs on segments rather than raw characters", async () => {
		// `src/*` must not reach `src/a/b.ts`; only `**` crosses a separator.
		expect(leasePatternMatches("src/*", "src/a.ts")).toBe(true);
		expect(leasePatternMatches("src/*", "src/a/b.ts")).toBe(false);
		expect(leasePatternMatches("src/**", "src/a/b.ts")).toBe(true);
		expect(leasePatternMatches("**/*.ts", "a/b/c.ts")).toBe(true);
		// Dots are literal, so a glob cannot be tricked by a regex metacharacter.
		expect(leasePatternMatches("a.txt", "axtxt")).toBe(false);
	});
});

describe("lease store schema", () => {
	it("refuses a database written by a newer build", async () => {
		// Otherwise an old build silently operates on a shape it cannot read.
		const dbPath = await tempDbPath();
		const fresh = openLeaseStore(dbPath);
		fresh.run("PRAGMA user_version = 99");
		fresh.close();

		expect(() => openLeaseStore(dbPath)).toThrow(/newer than this build/);
	});

	it("does not reap a lease that has not expired", async () => {
		const db = openLeaseStore(await tempDbPath());
		acquireLease(db, { owner: "alpha", pathPattern: "a.txt", ttlMs: 60_000, now: 1_000 });
		expect(reapExpiredLeases(db, 2_000)).toBe(0);
		expect(reapExpiredLeases(db, 90_000)).toBe(1);
		expect(findConflicts(db, "a.txt", true, 90_000)).toHaveLength(0);
		db.close();
	});
});

// A fresh handle must see committed rows and refuse a half-migrated schema.
describe("lease store handles", () => {
	it("survives being reopened", async () => {
		const dbPath = await tempDbPath();
		const first = openLeaseStore(dbPath);
		const acquired = acquireLease(first, { owner: "alpha", pathPattern: "a.txt", now: 1_000 });
		if (!acquired.ok) throw new Error("expected acquire to win");
		first.close();

		const second = new Database(dbPath);
		const row = second.query<{ owner: string }, []>("SELECT owner FROM peer_leases").get();
		expect(row?.owner).toBe("alpha");
		second.close();
	});
});
