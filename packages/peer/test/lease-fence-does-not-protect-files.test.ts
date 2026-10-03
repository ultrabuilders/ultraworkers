import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { acquireLease, MAX_TTL_MS, openLeaseStore, renewLease } from "../src/lease/store";

/**
 * `epic-jwsy.14` — the gate's most valuable finding, kept as an executable claim.
 *
 * The fence protects a ROW. It does not protect a FILE, and no test that only exercises
 * the store can notice that, because the store behaves correctly the whole time.
 */

const dirs: string[] = [];

async function tempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-zombie-"));
	dirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function openOrThrow(result: ReturnType<typeof acquireLease>) {
	if (!result.ok) throw new Error(`expected the acquire to win, got ${result.conflicts.length} conflict(s)`);
	return result.lease;
}

describe("what the fence does and does not protect", () => {
	it("refuses a stale holder in the database while its write lands in the file anyway", async () => {
		// The gate's headline finding, reproduced rather than asserted. A stale holder is
		// one that was descheduled past its TTL, believes it still holds the path, and
		// writes on waking.
		//
		// Both halves are checked in one row on purpose. Asserting only the database's
		// refusal would pass on a store that is correct AND useless; asserting only the
		// write would pass on any filesystem. The claim is that they disagree, and that
		// is the thing a future change to the write path would have to overturn.
		//
		// Nothing here consults the lease before writing, because nothing in the write
		// path does: `edit`, `write`, `ast_edit` and `git` all write straight through.
		const dir = await tempDir();
		const db = openLeaseStore(path.join(dir, "leases.sqlite"));
		const target = path.join(dir, "x.ts");
		await Bun.write(target, "original\n");

		const held = openOrThrow(acquireLease(db, { owner: "A", pathPattern: target, ttlMs: 1_000, now: 1_000 }));

		// A stalls; the TTL passes; B reaps A's row and legitimately takes the same path.
		const later = 1_000 + MAX_TTL_MS + 60_000;
		const successor = acquireLease(db, { owner: "B", pathPattern: target, now: later });
		expect(successor.ok).toBe(true);

		// A wakes, still convinced it holds the path, and writes. No lease is consulted.
		await Bun.write(target, "A's stale write\n");

		// The database has the right answer the whole time...
		const renew = renewLease(db, { owner: "A", fenceToken: held.fenceToken, now: later + 1 });
		expect(renew.ok).toBe(false);
		if (!renew.ok) expect(renew.reason).toBe("reaped");

		// …and the file was overwritten anyway. This is the zombie writer: the fence is
		// sound and the thing it was meant to fence is still reachable.
		expect(await Bun.file(target).text()).toBe("A's stale write\n");
		db.close();
	});
});
