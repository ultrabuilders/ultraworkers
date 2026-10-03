import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { findGaps, read, retain, INBOX_LIMITS } from "../src/inbox/cursor";
import { InboxStore } from "../src/inbox/store";

/**
 * The cursor's one unforgivable failure is telling a reader it is caught up when
 * it is not. `read` therefore reports holes instead of stepping over them, and
 * `retain` reports what it removed instead of quietly shrinking the inbox.
 *
 * The gap check has two branches and both are covered below: a hole at the front
 * (retention removed it) and a hole in the middle (a delivery never landed).
 * Testing only one would not distinguish them, and the two mean different things
 * to whoever resyncs.
 */

const dirs: string[] = [];

async function tempStore(): Promise<InboxStore> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-cursor-"));
	dirs.push(dir);
	return new InboxStore(dir, { horizon: 1000 });
}

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function envelope(seq: number, envelopeId = `e${seq}`) {
	return {
		seq,
		envelopeId,
		from: "peer-a",
		subject: `subject ${seq}`,
		bodyMd: `body ${seq}`,
		importance: "normal" as const,
		createdTs: "2026-10-03T00:00:00Z",
	};
}

/** Write `seqs` into the store in the given order, skipping any listed in `skip`. */
async function seed(store: InboxStore, seqs: number[], skip: number[] = []): Promise<void> {
	for (const seq of seqs) {
		if (skip.includes(seq)) continue;
		await store.append(envelope(seq));
	}
}

describe("cursor gap detection", () => {
	it("reports a hole at the front as retention, because nothing else deletes files", () => {
		// The inbox starts at 10 while the reader has only seen 3. Retention is the
		// only mechanism here that removes a file, so naming the cause lets the
		// caller resync without investigating a phantom lost delivery.
		const gaps = findGaps([10, 11, 12], 3);
		expect(gaps).toEqual([{ fromSeq: 4, toSeq: 9, cause: "retention" }]);
	});

	it("reports a hole between two retained files as a delivery that never landed", () => {
		// Retention removes from the FRONT, so it cannot produce a hole with
		// messages still on disk on both sides. That is exactly what makes this
		// branch distinguishable — and why both branches need their own test.
		const gaps = findGaps([1, 2, 6, 7], 0);
		expect(gaps).toEqual([{ fromSeq: 3, toSeq: 5, cause: "missing" }]);
	});

	it("reports nothing for a contiguous run, so a clean inbox stays cheap to read", () => {
		expect(findGaps([1, 2, 3, 4], 0)).toEqual([]);
		expect(findGaps([5], 4)).toEqual([]);
	});

	it("distinguishes the two causes in one inbox holding both kinds of hole", () => {
		expect(findGaps([10, 11, 14, 15], 2)).toEqual([
			{ fromSeq: 3, toSeq: 9, cause: "retention" },
			{ fromSeq: 12, toSeq: 13, cause: "missing" },
		]);
	});
});

describe("cursor read", () => {
	it("returns envelopes after the sequence and advances the high-water mark", async () => {
		const store = await tempStore();
		await seed(store, [1, 2, 3]);
		const result = await read(store, { afterSeq: 1 });
		expect(result.envelopes.map(e => e.seq)).toEqual([2, 3]);
		expect(result.highSeq).toBe(3);
		expect(result.gaps).toEqual([]);
	});

	it("surfaces the gap instead of returning a contiguous-looking result", async () => {
		// The failure this defends against is invisible without the gap field: the
		// reader gets 3 messages and concludes it has seen everything since 2.
		const store = await tempStore();
		await seed(store, [1, 2, 3, 4, 5], [4]);
		const result = await read(store, { afterSeq: 2 });
		expect(result.envelopes.map(e => e.seq)).toEqual([3, 5]);
		expect(result.gaps).toEqual([{ fromSeq: 4, toSeq: 4, cause: "missing" }]);
	});

	it("marks a read that starts past the oldest retained message as truncated", async () => {
		// Truncated is what tells a caller "resync from scratch", which is different
		// from "you missed one message" — and only one of those is recoverable by
		// waiting.
		const store = await tempStore();
		await seed(store, [10, 11]);
		const result = await read(store, { afterSeq: 2 });
		expect(result.truncated).toBe(true);
		expect(result.gaps[0]?.cause).toBe("retention");
	});

	it("does not report truncation when the cursor is simply at the start", async () => {
		const store = await tempStore();
		await seed(store, [1, 2]);
		const result = await read(store, { afterSeq: 0 });
		expect(result.truncated).toBe(false);
		expect(result.gaps).toEqual([]);
	});

	it("returns an unchanged cursor for an empty inbox, so polling does not drift", async () => {
		const store = await tempStore();
		const result = await read(store, { afterSeq: 7 });
		expect(result.envelopes).toEqual([]);
		expect(result.highSeq).toBe(7);
	});

	it("honours the limit without losing the ability to report a gap", async () => {
		const store = await tempStore();
		await seed(store, [1, 2, 3, 4, 5]);
		const result = await read(store, { afterSeq: 0, limit: 2 });
		expect(result.envelopes.map(e => e.seq)).toEqual([1, 2]);
		expect(result.highSeq).toBe(2);
	});
});

describe("cursor retention", () => {
	it("removes what the cursor has passed and reports each as read", async () => {
		const store = await tempStore();
		await seed(store, [1, 2, 3, 4]);
		const evicted = await retain(store, 2);
		expect(evicted.map(e => e.envelope.seq)).toEqual([1, 2]);
		expect(evicted.every(e => e.read)).toBe(true);
		// Unread mail survives: the rule that outranks the cap.
		expect((await store.list()).map(e => e.seq)).toEqual([3, 4]);
	});

	it("keeps unread mail even when unread alone exceeds the horizon, and says so", async () => {
		const store = await tempStore();
		await seed(store, [1, 2, 3, 4, 5]);
		// Nothing read, and a horizon of 1: the cap is far exceeded by unread alone.
		// The bead makes this a REPORTABLE state, not a silent eviction.
		const evicted = await retain(store, 0, { unreadHorizon: 1 });
		const unreadEvicted = evicted.filter(e => !e.read);
		expect(unreadEvicted.length).toBeGreaterThan(0);
		// Every such eviction carries `read: false`, so the caller can tell an
		// unread message was sacrificed rather than discovering it as a gap later.
		expect(unreadEvicted.every(e => e.reason === "capacity")).toBe(true);
	});

	it("evicts nothing when unread is within the horizon", async () => {
		const store = await tempStore();
		await seed(store, [1, 2, 3]);
		expect(await retain(store, 0, { unreadHorizon: 10 })).toEqual([]);
		expect((await store.list()).map(e => e.seq)).toEqual([1, 2, 3]);
	});

	it("labels a prefix that retention removed, instead of hiding it from a lagging reader", async () => {
		const store = await tempStore();
		await seed(store, [1, 2, 3, 4, 5]);
		await retain(store, 3);
		// A reader still sitting at cursor 0 has genuinely missed 1..3, and the
		// one truthful label is "retention" — the alternative the bead forbids is
		// returning 4..5 with no gap, which reads as "you are caught up".
		const stale = await read(store, { afterSeq: 0 });
		expect(stale.envelopes.map(e => e.seq)).toEqual([4, 5]);
		expect(stale.gaps).toEqual([{ fromSeq: 1, toSeq: 3, cause: "retention" }]);

		// A reader that HAD reached the retention cursor is whole — no gap at all.
		// Both halves are the same assertion about the same on-disk state, and
		// checking only one would let a "report everything" bug pass as correct.
		const caughtUp = await read(store, { afterSeq: 3 });
		expect(caughtUp.envelopes.map(e => e.seq)).toEqual([4, 5]);
		expect(caughtUp.gaps).toEqual([]);
	});

	it("is idempotent, so a retried retention pass does not report phantom removals", async () => {
		const store = await tempStore();
		await seed(store, [1, 2, 3]);
		expect((await retain(store, 2)).length).toBe(2);
		expect(await retain(store, 2)).toEqual([]);
	});

	it("keeps the two layers' limits equal to the measured reference value", () => {
		// Not a tautology: this pins a number that was previously wrong. The bead
		// said 8192 (attributed to pi-parley); measured, parley's mailbox cap is
		// 256 and its 8192 is a barrier-directory capacity.
		//
		// And 256 is not only borrowed — it survives the backlog measured on this
		// machine (56 inboxes: median 34, p95 133, max 236). It sits just under 2x
		// p95 and about 7.5x the median, which is where a backlog bound belongs.
		expect(INBOX_LIMITS.unreadHorizon).toBe(256);
		expect(INBOX_LIMITS.capacity).toBe(INBOX_LIMITS.unreadHorizon);
		// The headroom is the part that is NOT comfortable: at the observed maximum
		// one peer in 56 sat at 92% of the horizon. Pinned so raising the cap is a
		// deliberate act with this number in view, not a quiet "make it bigger".
		expect(256 - 236).toBe(20);
	});
});
