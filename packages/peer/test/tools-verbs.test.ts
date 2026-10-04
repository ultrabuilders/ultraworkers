/**
 * Contracts for the four peer verbs.
 *
 * Each test names the failure a consumer would observe if it regressed, because
 * three of these rules exist precisely to *not* do the obvious thing — a passing
 * implementation that stopped stripping bodies, started reaping during a probe,
 * or reported a lost lease as a free one would all look healthy otherwise.
 */

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { openLeaseStore, acquireLease } from "../src/lease/store";
import { InboxStore } from "../src/inbox/store";
import { peerList, peerLock, peerRelease } from "../src/tools/verbs";

const temps: string[] = [];
afterEach(async () => {
	await Promise.all(temps.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

async function tempDb(): Promise<ReturnType<typeof openLeaseStore>> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-tools-"));
	temps.push(dir);
	return openLeaseStore(path.join(dir, "leases.sqlite3"));
}

function envelope(seq: number, from: string, subject: string, bodyMd: string) {
	return {
		seq,
		envelopeId: `env-${seq}`,
		from,
		subject,
		bodyMd,
		importance: "normal" as const,
		createdTs: new Date(1_700_000_000_000 + seq).toISOString(),
	};
}

describe("peer.lock", () => {
	test("a held path reports its holder instead of failing", async () => {
		// The failure this defends: `lock` on a busy path throws or returns bare
		// `false`, so the caller cannot learn WHO holds it — which is the only
		// reason it wanted to know.
		const db = await tempDb();
		acquireLease(db, { owner: "alpha", pathPattern: "src/**", now: 1_000 });

		const outcome = peerLock(db, { owner: "beta", pathPattern: "src/a.ts", now: 1_000 });

		expect(outcome.kind).toBe("held");
		if (outcome.kind !== "held") throw new Error("unreachable");
		expect(outcome.conflicts.map(c => c.owner)).toEqual(["alpha"]);
	});

	test("a probe reports availability without claiming the path", async () => {
		// The failure this defends: probe mutates, so a caller that only asked
		// "is this free?" silently took the lock and every later acquirer is refused.
		const db = await tempDb();

		const answer = peerLock(db, { owner: "beta", pathPattern: "src/a.ts", probe: true, now: 1_000 });

		expect(answer).toEqual({ kind: "probe", answer: { held: false, available: true } });
		expect(peerLock(db, { owner: "gamma", pathPattern: "src/a.ts", now: 1_000 }).kind).toBe("acquired");
	});

	test("a probe on a held path names the holder and takes nothing", async () => {
		const db = await tempDb();
		acquireLease(db, { owner: "alpha", pathPattern: "src/**", now: 1_000 });

		const probed = peerLock(db, { owner: "beta", pathPattern: "src/a.ts", probe: true, now: 1_000 });
		expect(probed.kind).toBe("probe");
		if (probed.kind !== "probe" || !probed.answer.held) throw new Error("unreachable");
		expect(probed.answer.holder).toBe("alpha");

		// Still alpha's, so the probe released nothing and evicted nobody.
		expect(peerLock(db, { owner: "gamma", pathPattern: "src/a.ts", now: 1_000 }).kind).toBe("held");
	});
});

describe("peer.release", () => {
	test("a stale fence token cannot release the holder's lease", async () => {
		// The failure this defends: release matches on owner alone, so an agent
		// whose lease was reaped and re-taken by someone else frees THEIR claim.
		const db = await tempDb();
		const first = acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 });
		if (!first.ok) throw new Error("setup");

		const outcome = peerRelease(db, { owner: "alpha", fenceToken: first.lease.fenceToken + 99, now: 2_000 });
		expect(outcome).toEqual({ kind: "not-held", reason: "not-owner" });
	});

	test("an already-released lease is distinguished from never having held it", async () => {
		// The failure this defends: both collapse to `false`, so the reaper path —
		// the NORMAL exit — reads as an error and callers retry against a lock
		// they no longer own.
		const db = await tempDb();
		const acquired = acquireLease(db, { owner: "alpha", pathPattern: "a.txt", now: 1_000 });
		if (!acquired.ok) throw new Error("setup");

		expect(peerRelease(db, { owner: "alpha", fenceToken: acquired.lease.fenceToken, now: 2_000 })).toEqual({
			kind: "released",
			pathPattern: "a.txt",
		});
		expect(peerRelease(db, { owner: "alpha", fenceToken: acquired.lease.fenceToken, now: 3_000 })).toEqual({
			kind: "not-held",
			reason: "already-released",
		});
	});
});

describe("peer.list --unread", () => {
	test("previews carry subjects and counts but never a message body", async () => {
		// The failure this defends: a preview that includes bodyMd hands peer-authored
		// prose to the model one fence earlier than the design intends, and the model
		// has already read it by the time the fence would have applied.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-inbox-"));
		temps.push(dir);
		const store = new InboxStore(dir);
		await store.append(envelope(1, "alpha", "status?", "SECRET-BODY-ALPHA"));
		await store.append(envelope(2, "alpha", "more", "SECRET-BODY-ALPHA-2"));
		await store.append(envelope(3, "beta", "hi", "SECRET-BODY-BETA"));

		const result = await peerList(
			store,
			[
				{ id: "alpha", task: "sweep", lastSeenTs: 1 },
				{ id: "beta", task: "review", lastSeenTs: 1 },
			],
			{ unread: true },
		);

		const alpha = result.unread?.find(u => u.peer === "alpha");
		expect(alpha?.count).toBe(2);
		expect(alpha?.subjects).toEqual(["status?", "more"]);
		expect(JSON.stringify(result)).not.toContain("SECRET-BODY");
	});

	test("without --unread there is no unread block at all", async () => {
		// The failure this defends: an always-populated `unread` field makes the
		// opt-in look decorative and drags bodies into every roster read.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-inbox-"));
		temps.push(dir);
		const store = new InboxStore(dir);

		const result = await peerList(store, [{ id: "alpha", task: "sweep", lastSeenTs: 1 }]);

		expect(result.unread).toBeUndefined();
		expect(result.peers).toHaveLength(1);
	});
});
