import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { InboxStore, MailboxFullError, inboxFileName, parseInboxFileName } from "../src/inbox/store";

/**
 * The durable inbox has one failure mode worth more than the rest: mail that
 * disappears. `irc/bus.ts` drops its oldest message when a mailbox is full, and
 * that is acceptable for a RAM queue whose receiver is simply busy. This store
 * survives a restart, so "full" means BACKLOG — and dropping unread mail
 * because nobody was running is the one thing a durable store must not do.
 *
 * Each row below names what a consumer observes if that regresses.
 */

const dirs: string[] = [];

async function tempDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-inbox-"));
	dirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function envelope(seq: number, envelopeId = `e${seq}`, from = "peer-a") {
	return {
		seq,
		envelopeId,
		from,
		subject: `subject ${seq}`,
		bodyMd: `body ${seq}`,
		importance: "normal" as const,
		createdTs: "2026-10-03T00:00:00Z",
	};
}

describe("inbox file names", () => {
	it("sorts into delivery order numerically, so a reader cannot replay a later message first", () => {
		// The failure this defends against is invisible in a happy path: a 2-digit
		// sequence written after a 3-digit one sorts BEFORE it, so `list()` hands
		// back the wrong history and every consumer inherits the mistake.
		const names = [inboxFileName(9, "a"), inboxFileName(10, "b"), inboxFileName(100, "c")];
		expect([...names].sort()).toEqual([names[0], names[1], names[2]]);
	});

	it("keeps two envelopes that share a sequence in separate files", () => {
		// A central allocator makes duplicate sequences impossible, but a caller
		// can still construct one. If the id were not in the name they would
		// overwrite each other and one message would vanish with no error.
		expect(inboxFileName(7, "x")).not.toBe(inboxFileName(7, "y"));
	});

	it("round-trips a name back to its parts, and refuses one that is not ours", () => {
		const name = inboxFileName(42, "abc");
		expect(parseInboxFileName(name)).toEqual({ seq: 42, envelopeId: "abc" });
		// A foreign file in the directory must not be counted as mail, or the
		// horizon is spent on someone else's debris.
		expect(parseInboxFileName("notes.txt")).toBeNull();
		expect(parseInboxFileName("README.md")).toBeNull();
	});

	it("rejects a sequence that cannot be ordered, rather than naming a file that cannot sort", () => {
		expect(() => inboxFileName(-1, "a")).toThrow(RangeError);
		expect(() => inboxFileName(1.5, "a")).toThrow(RangeError);
	});
});

describe("inbox store", () => {
	it("delivers in sequence order even when the caller appends out of order", async () => {
		const store = new InboxStore(await tempDir());
		// Appended deliberately shuffled. Order must come from the FILENAME, not
		// from insertion order or from a `seq` field a caller controls.
		await store.append(envelope(3, "c"));
		await store.append(envelope(1, "a"));
		await store.append(envelope(2, "b"));

		expect((await store.list()).map(e => e.envelopeId)).toEqual(["a", "b", "c"]);
	});

	it("refuses to deliver past the horizon instead of dropping the oldest, and keeps the old one readable", async () => {
		const dir = await tempDir();
		const store = new InboxStore(dir, { horizon: 3 });
		for (const seq of [1, 2, 3]) await store.append(envelope(seq));

		// The refusal IS the contract. `irc/bus.ts` shifts here and reports
		// success; doing that in a durable store discards mail that no reader has
		// seen yet, which is unrecoverable and silent.
		await expect(store.append(envelope(4))).rejects.toBeInstanceOf(MailboxFullError);

		// Drop-then-succeed would pass the assertion above and lose message 1, so
		// the surviving history is what actually distinguishes the two.
		expect((await store.list()).map(e => e.seq)).toEqual([1, 2, 3]);
	});

	it("carries the refusal code a caller can branch on", async () => {
		const store = new InboxStore(await tempDir(), { horizon: 1 });
		await store.append(envelope(1));
		const err = await store.append(envelope(2)).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(MailboxFullError);
		expect((err as MailboxFullError).code).toBe("mailbox_full");
		// The message names the limit, so an operator reading a log knows what to
		// change rather than just that something failed.
		expect((err as Error).message).toContain("1");
	});

	it("lists a durable inbox that no process holds open", async () => {
		const dir = await tempDir();
		await new InboxStore(dir).append(envelope(1, "a"));
		// A brand-new store over the same directory: the record outlived the
		// writer, which is the entire reason this store exists.
		const reopened = await new InboxStore(dir).list();
		expect(reopened.map(e => e.envelopeId)).toEqual(["a"]);
	});

	it("survives a reader arriving while a writer is mid-rename, with no torn file", async () => {
		const dir = await tempDir();
		const store = new InboxStore(dir);
		await store.append(envelope(1, "seed"));

		// The property `atomicWriteJson` actually buys, asserted by racing it:
		// every file a reader can see parses. A non-atomic write would leave a
		// truncated envelope here, and `list()` would silently skip it — which
		// looks identical to "the message was never sent".
		const reader = (async () => {
			for (let i = 0; i < 40; i++) {
				for (const e of await store.list()) expect(typeof e.bodyMd).toBe("string");
				await Bun.sleep(1);
			}
		})();

		for (let seq = 2; seq <= 30; seq++) await store.append(envelope(seq));
		await reader;

		// Every write landed: a lost message would show up as a short list, which
		// a torn-file skip could otherwise hide.
		expect(await store.count()).toBe(30);
	});

	it("keeps readable messages readable when one file is damaged", async () => {
		const dir = await tempDir();
		const store = new InboxStore(dir);
		await store.append(envelope(1, "a"));
		await store.append(envelope(2, "b"));
		await Bun.write(path.join(dir, inboxFileName(3, "c")), "{ truncated");

		// One bad file must not make the whole inbox unreadable. Throwing here
		// would turn a single damaged write into total loss of the mailbox.
		expect((await store.list()).map(e => e.envelopeId)).toEqual(["a", "b"]);
	});

	it("prunes the oldest entries and leaves the newest, so retention cannot drop unread mail", async () => {
		const dir = await tempDir();
		const store = new InboxStore(dir);
		for (const seq of [1, 2, 3, 4, 5]) await store.append(envelope(seq));

		expect(await store.pruneTo(3)).toBe(2);
		// The tail survives: prune removes from the front, so what a reader has
		// not reached yet is the part that stays.
		expect((await store.list()).map(e => e.seq)).toEqual([3, 4, 5]);
		// Pruning below the current size is a no-op, not an error: a caller may
		// ask to prune on every read.
		expect(await store.pruneTo(99)).toBe(0);
	});

	it("reads an inbox directory that does not exist yet as empty, so a first send is not a special case", async () => {
		const store = new InboxStore(path.join(await tempDir(), "not-created"));
		expect(await store.list()).toEqual([]);
		expect(await store.count()).toBe(0);
		await store.append(envelope(1));
		expect(await store.count()).toBe(1);
	});

	it("does not count foreign files against the horizon", async () => {
		const dir = await tempDir();
		const store = new InboxStore(dir, { horizon: 2 });
		await store.append(envelope(1));
		await Bun.write(path.join(dir, ".DS_Store"), "junk");
		await Bun.write(path.join(dir, "half-written.json"), "{");

		// If debris counted, a full inbox would refuse forever with no way for the
		// caller to tell whether the space is theirs.
		await store.append(envelope(2));
		expect(await store.count()).toBe(2);
	});
});
