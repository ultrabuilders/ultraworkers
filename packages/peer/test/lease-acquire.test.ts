import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	acquireLease,
	DEFAULT_TTL_MS,
	listLeases,
	MAX_TTL_MS,
	openLeaseStore,
	patternsOverlap,
	releaseLease,
	renewLease,
} from "../src/lease/store";

/**
 * `epic-jwsy.3` — acquire. Every test runs against a real SQLite file in a
 * tmpdir; the ordering contract cannot be observed through a mock, because a
 * mock is exactly the thing that would happily run the steps in any sequence.
 */

const dirs: string[] = [];

async function tempDbPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-acquire-"));
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

describe("acquire ordering", () => {
	it("reaps, then probes, then inserts — asserted by trace, not by outcome", async () => {
		// Probing before reaping would pass every outcome-based assertion here: the
		// probe filters expired leases anyway, so the only thing that distinguishes
		// the two orders is the sequence itself.
		const db = openLeaseStore(await tempDbPath());
		const steps: string[] = [];
		acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000, trace: s => steps.push(s) });
		expect(steps).toEqual(["reap", "probe", "insert"]);
		db.close();
	});

	it("reaps before probing, so an expired holder stops being reported as a conflict", async () => {
		const db = openLeaseStore(await tempDbPath());
		openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "src/a.ts", ttlMs: 1_000, now: 1_000 }));

		// Past the TTL: the probe must see a free path, and the dead row must carry
		// a tombstone rather than still looking live.
		const later = acquireLease(db, { owner: "beta", pathPattern: "src/a.ts", now: 50_000 });
		expect(later.ok).toBe(true);

		const row = db
			.query<{ released_ts: number | null }, [string]>("SELECT released_ts FROM peer_leases WHERE owner = ?")
			.get("alpha");
		expect(row?.released_ts).not.toBeNull();
		db.close();
	});
});

describe("conflict probe", () => {
	it("catches all three forms against three different rows", async () => {
		// Three rows, not one row tried three ways: a single fixture reused across
		// the three forms only proves the harness matches its own input.
		//
		// The three claims have to sit on DISJOINT grounds. `src/a.ts` ⊂
		// `src/**/*.ts` ⊂ `src/`, so the first would refuse the second and this
		// test would measure its own fixture rather than the probe.
		const db = openLeaseStore(await tempDbPath());
		openOrThrow(acquireLease(db, { owner: "exact", pathPattern: "src/a.ts", now: 1_000 }));
		openOrThrow(acquireLease(db, { owner: "glob", pathPattern: "lib/**/*.ts", now: 1_000 }));
		openOrThrow(acquireLease(db, { owner: "ancestor", pathPattern: "pkg/", now: 1_000 }));

		const exact = acquireLease(db, { owner: "n1", pathPattern: "src/a.ts", now: 2_000 });
		expect(exact.ok).toBe(false);
		if (!exact.ok) expect(exact.conflicts.map(c => c.owner)).toContain("exact");

		// A glob claim has to refuse a path at ANY depth beneath it, not just the
		// shallow one — the zero-segment case is the one that was broken.
		const globShallow = acquireLease(db, { owner: "n2", pathPattern: "lib/x.ts", now: 2_000 });
		expect(globShallow.ok).toBe(false);
		if (!globShallow.ok) expect(globShallow.conflicts.map(c => c.owner)).toContain("glob");

		const globDeep = acquireLease(db, { owner: "n3", pathPattern: "lib/deep/b.ts", now: 2_000 });
		expect(globDeep.ok).toBe(false);
		if (!globDeep.ok) expect(globDeep.conflicts.map(c => c.owner)).toContain("glob");

		const ancestor = acquireLease(db, { owner: "n4", pathPattern: "pkg/other/c.ts", now: 2_000 });
		expect(ancestor.ok).toBe(false);
		if (!ancestor.ok) expect(ancestor.conflicts.map(c => c.owner)).toContain("ancestor");

		// A sibling prefix is outside every one of the three claims — the case a
		// `startsWith` check without a separator would wrongly refuse.
		expect(acquireLease(db, { owner: "free", pathPattern: "srcextra/d.ts", now: 2_000 }).ok).toBe(true);
		db.close();
	});

	it("recognises each overlap form and nothing else", () => {
		expect(patternsOverlap("src/a.ts", "src/a.ts")).toBe(true); // exact
		expect(patternsOverlap("src/**/*.ts", "src/a.ts")).toBe(true); // glob
		expect(patternsOverlap("src/", "src/a.ts")).toBe(true); // ancestor
		expect(patternsOverlap("src/a.ts", "src/")).toBe(true); // …in both directions

		// A sibling directory is not covered, which is the case a naive
		// `startsWith("src")` would get wrong.
		expect(patternsOverlap("src/", "srcfoo/a.ts")).toBe(false);
		expect(patternsOverlap("src/*.ts", "src/a/b.ts")).toBe(false); // * does not cross a separator
	});

	it("resolves all four shared/exclusive combinations distinctly", async () => {
		const db = openLeaseStore(await tempDbPath());
		openOrThrow(acquireLease(db, { owner: "s1", pathPattern: "a/", exclusive: false, now: 1_000 }));

		// shared on shared: both readers coexist.
		expect(acquireLease(db, { owner: "s2", pathPattern: "a/", exclusive: false, now: 1_000 }).ok).toBe(true);
		// exclusive against a shared holder: refused — it would exclude the readers.
		expect(acquireLease(db, { owner: "e1", pathPattern: "a/", exclusive: true, now: 1_000 }).ok).toBe(false);
		// another shared request still coexists; the refusal above is about the
		// exclusive one, not about the path becoming poisoned.
		expect(acquireLease(db, { owner: "s3", pathPattern: "a/", exclusive: false, now: 1_000 }).ok).toBe(true);

		openOrThrow(acquireLease(db, { owner: "e2", pathPattern: "b/", exclusive: true, now: 1_000 }));
		// exclusive against exclusive: refused.
		expect(acquireLease(db, { owner: "e3", pathPattern: "b/", exclusive: true, now: 1_000 }).ok).toBe(false);
		// …and a shared request on that same exclusive ground is refused as well.
		expect(acquireLease(db, { owner: "s4", pathPattern: "b/", exclusive: false, now: 1_000 }).ok).toBe(false);
		db.close();
	});
});

describe("ttl", () => {
	it("defaults to seconds, not minutes, and caps what a caller may ask for", async () => {
		// 30 minutes was my first value and it is wrong for a liveness assertion:
		// it would keep a crashed holder blocking the path for half an hour.
		expect(DEFAULT_TTL_MS).toBe(30_000);

		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "a", pathPattern: "a.txt", now: 0 }));
		expect(lease.expiresTs).toBe(DEFAULT_TTL_MS);

		const capped = openOrThrow(
			acquireLease(db, { owner: "b", pathPattern: "b.txt", ttlMs: MAX_TTL_MS * 10, now: 0 }),
		);
		expect(capped.expiresTs).toBe(MAX_TTL_MS);
		db.close();
	});

	it("rejects a holder that outlived its TTL, and zeroes its token-guarded write", async () => {
		// The other half of the contract: being reaped is not merely "you will fail
		// next time". The stale holder's own write must change nothing, or two
		// writers both believe they hold the path.
		const db = openLeaseStore(await tempDbPath());
		const stale = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", ttlMs: 1_000, now: 1_000 }));
		openOrThrow(acquireLease(db, { owner: "beta", pathPattern: "a.txt", now: 50_000 }));

		expect(renewLease(db, { owner: "alpha", fenceToken: stale.fenceToken, now: 60_000 })).toEqual({
			ok: false,
			reason: "reaped",
		});
		expect(releaseLease(db, { owner: "alpha", fenceToken: stale.fenceToken, now: 60_000 })).toBe(false);

		// …and the current holder is untouched by that attempt.
		// `now` is the same instant the assertions above reason about. Left to the
		// wall clock, the synthetic acquire times make "live" mean something else
		// in this test than in the code under test.
		const live = listLeases(db, "a.txt", 60_000);
		expect(live).toHaveLength(1);
		expect(live[0].owner).toBe("beta");
		db.close();
	});

	it("refuses to renew a lease after it has been released", async () => {
		const db = openLeaseStore(await tempDbPath());
		const lease = openOrThrow(acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 }));
		expect(releaseLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: 2_000 })).toBe(true);
		expect(renewLease(db, { owner: "alpha", fenceToken: lease.fenceToken, now: 3_000 })).toEqual({
			ok: false,
			reason: "reaped",
		});
		db.close();
	});
});
