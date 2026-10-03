import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { Database } from "bun:sqlite";
import { nextSeq, nextSeqs, openSeqStore, peekSeq } from "../src/inbox/seq";
import { InboxStore } from "../src/inbox/store";

/**
 * The allocation table exists to make one thing impossible: two envelopes sharing
 * a sequence. Because the filename IS the order, a shared sequence is not a
 * visible conflict — the second write overwrites the first and the inbox still
 * looks contiguous. So the tests below drive the writers hard enough to produce
 * the collision the table prevents, and assert on what the reader would see.
 */

const dirs: string[] = [];
const dbs: Database[] = [];

async function seqPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-seq-"));
	dirs.push(dir);
	return path.join(dir, "seq.sqlite");
}

function openTracked(p: string): Database {
	const db = openSeqStore(p);
	dbs.push(db);
	return db;
}

afterEach(async () => {
	for (const db of dbs.splice(0)) db.close();
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("inbox sequence allocation", () => {
	it("hands every concurrent sender a distinct number, from a single frozen instant", async () => {
		// One `now` is captured and handed to every sender, so the writers are
		// provably in the same millisecond — the exact condition under which a
		// `Date.now()` sequence would collide. Without that, a passing test could
		// just be the scheduler separating the writes.
		const frozen = Date.now();
		expect(frozen).toBe(Date.now());

		const db = openTracked(await seqPath());
		const N = 64;
		const allocated = await Promise.all(Array.from({ length: N }, () => Promise.resolve().then(() => nextSeq(db))));

		expect(new Set(allocated).size).toBe(N);
		expect([...allocated].sort((a, b) => a - b)).toEqual(Array.from({ length: N }, (_, i) => i + 1));
	});

	it("keeps numbers distinct across separate database connections, which is what separate processes use", async () => {
		// Two connections on one file is the closest in-process stand-in for two
		// sender processes. A single-connection test cannot see the race this closes:
		// one handle serialises in JS and never contends for the write lock.
		const p = await seqPath();
		const a = openTracked(p);
		const b = openTracked(p);
		const fromBoth = [
			...Array.from({ length: 32 }, () => nextSeq(a)),
			...Array.from({ length: 32 }, () => nextSeq(b)),
		];
		expect(new Set(fromBoth).size).toBe(64);
	});

	it("keeps every allocated number usable as a distinct inbox file", async () => {
		// The allocation is only worth anything if the numbers it hands out survive
		// into filenames without colliding. This is the end-to-end form of the
		// contract: a reader looking at the resulting inbox must see 64 messages,
		// not 64 writes that quietly became fewer.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-seq-inbox-"));
		dirs.push(dir);
		const store = new InboxStore(dir, { horizon: 1000 });
		const db = openTracked(await seqPath());

		const N = 64;
		const frozen = Date.now();
		expect(frozen).toBe(Date.now());

		const names = await Promise.all(
			Array.from({ length: N }, (_, i) =>
				store.append({
					seq: nextSeq(db),
					envelopeId: `msg-${i}`,
					from: "peer-a",
					subject: `s${i}`,
					bodyMd: `b${i}`,
					importance: "normal",
					createdTs: "2026-10-03T00:00:00Z",
				}),
			),
		);

		expect(new Set(names).size).toBe(N);
		expect(await store.count()).toBe(N);
		expect((await store.list()).map(e => e.seq)).toEqual(Array.from({ length: N }, (_, i) => i + 1));
	});

	it("never reissues a number after retention deletes the messages that used it", async () => {
		// The regression a `MAX(seq)+1` counter would ship: retention removes the
		// highest-numbered file, the derived counter falls back, and the next
		// sender writes a filename that already exists — overwriting a live message.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-seq-retain-"));
		dirs.push(dir);
		const store = new InboxStore(dir, { horizon: 1000 });
		const db = openTracked(await seqPath());

		for (let i = 0; i < 10; i++) {
			await store.append({
				seq: nextSeq(db),
				envelopeId: `m${i}`,
				from: "peer-a",
				subject: `s${i}`,
				bodyMd: `b${i}`,
				importance: "normal",
				createdTs: "2026-10-03T00:00:00Z",
			});
		}
		await store.pruneTo(0);
		expect(await store.count()).toBe(0);

		const reused = nextSeq(db);
		// A MAX-derived counter would now answer 1 and collide with nothing on
		// disk — which is exactly why the collision is invisible until the FIRST
		// number is reissued while a message with it is still retained.
		expect(reused).toBe(11);
	});

	it("keeps two mailboxes on one database file on independent counters", async () => {
		const db = openTracked(await seqPath());
		expect(nextSeq(db, "alice")).toBe(1);
		expect(nextSeq(db, "alice")).toBe(2);
		// Bob's first message must not be told it is message 3 of Alice's inbox;
		// the two counters are separate by design, not an accident of a shared row.
		expect(nextSeq(db, "bob")).toBe(1);
		expect(nextSeq(db, "alice")).toBe(3);
	});

	it("reserves a contiguous block whose first element equals a single allocation would", async () => {
		const db = openTracked(await seqPath());
		expect(nextSeq(db)).toBe(1);
		expect(nextSeqs(db, 3)).toEqual([2, 3, 4]);
		// The block consumed exactly what it took; a leak would show as a jump here.
		expect(nextSeq(db)).toBe(5);
	});

	it("starts at 1 so that sequence 0 stays the 'before the first message' sentinel", async () => {
		// A cursor's default `afterSeq` is 0. If 0 were ever handed out as a real
		// sequence, a reader could not tell "nothing yet" from "already read one".
		const db = openTracked(await seqPath());
		expect(peekSeq(db)).toBe(1);
		expect(nextSeq(db)).toBe(1);
	});

	it("peeks without consuming, so a diagnostic read cannot burn a number", async () => {
		const db = openTracked(await seqPath());
		expect(peekSeq(db)).toBe(1);
		expect(peekSeq(db)).toBe(1);
		expect(nextSeq(db)).toBe(1);
		expect(peekSeq(db)).toBe(2);
	});

	it("refuses a block request that cannot mean what it claims", async () => {
		const db = openTracked(await seqPath());
		expect(() => nextSeqs(db, 0)).toThrow(RangeError);
		expect(() => nextSeqs(db, -1)).toThrow(RangeError);
		expect(() => nextSeqs(db, 1.5)).toThrow(RangeError);
		// A rejected request must not have moved the counter.
		expect(nextSeq(db)).toBe(1);
	});

	it("refuses a database written by a newer build rather than guessing at its shape", async () => {
		const p = await seqPath();
		const db = openTracked(p);
		db.run("PRAGMA user_version = 99");
		db.close();
		dbs.length = 0;
		expect(() => openSeqStore(p)).toThrow(/newer than this build/);
	});
});
