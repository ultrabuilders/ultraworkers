/**
 * The name registry's tombstones.
 *
 * The defect these defend is a **loss of information at the point where the
 * caller needs it**: a message addressed to a peer that renamed away, refused as
 * "unknown name". The caller then cannot tell a typo from a rename, and their
 * only repair — ask the sender what to call them now — silently does nothing.
 *
 * Every row below is the falsifier for one way that ambiguity can come back, so
 * the failure names the defect rather than a count.
 */

import type { Database } from "bun:sqlite";
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { getDbBusyTimeoutMs } from "@oh-my-pi/pi-utils";
import { pragmaValue } from "../src/lease/store";
import {
	NAME_HOLD_TTL_MS,
	NameStoreInconsistentError,
	claimName,
	openNameStore,
	reapHeldNames,
	releaseName,
	renameInStore,
	resolveName,
} from "../src/identity/store";

const dirs: string[] = [];
const opened: Database[] = [];

async function tempDbPath(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-names-"));
	dirs.push(dir);
	return path.join(dir, "names.sqlite");
}

async function openStore(): Promise<Database> {
	const db = openNameStore(await tempDbPath());
	opened.push(db);
	return db;
}

afterEach(async () => {
	for (const db of opened.splice(0)) db.close();
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("name registry", () => {
	it("applies the house pragmas, taking the busy timeout from the helper", async () => {
		// A hardcoded timeout drifts from the shared helper silently, and the whole
		// point of that helper is that the two branches differ (5000 interactive,
		// 1000 headless). Asserting equality catches a number typed by hand.
		const db = await openStore();

		expect(pragmaValue(db, "busy_timeout")).toBe(getDbBusyTimeoutMs());
		expect(String(pragmaValue(db, "journal_mode")).toLowerCase()).toBe("wal");
		expect(pragmaValue(db, "synchronous")).toBe(1); // NORMAL
		expect(pragmaValue(db, "user_version")).toBe(1);
	});

	it("tells a vacated name from a name that never existed", async () => {
		// THE contract. Three states, not two: a send to `BlueLake` after that
		// session renamed away must refuse as "expired", not "unknown" — otherwise
		// the sender has no way to know a peer existed and cannot ask for its new
		// name. Under delete-on-release both read `unknown` and the distinction is
		// gone.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });
		expect(releaseName(db, { name: "BlueLake", instanceId: "a", now: 1000 })).toBe(true);

		expect(resolveName(db, "BlueLake", 1001)).toEqual({ kind: "expired" });
		expect(resolveName(db, "GreenCastle", 1001)).toEqual({ kind: "unknown" });
	});

	it("stops calling a name expired once the hold has passed", async () => {
		// The other half, and the one that keeps tombstones bounded: after the hold
		// the name genuinely was never allocated to anyone reachable, so refusing it
		// as "expired" would be claiming knowledge the system no longer has. Holding
		// them apart forever would mean tombstones are never collectable.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });
		releaseName(db, { name: "BlueLake", instanceId: "a", now: 1000 });

		const deadline = 1000 + NAME_HOLD_TTL_MS;
		expect(resolveName(db, "BlueLake", deadline - 1)).toEqual({ kind: "expired" });
		expect(resolveName(db, "BlueLake", deadline)).toEqual({ kind: "unknown" });
	});

	it("refuses to re-mint a held name, and allows it once the hold passes", async () => {
		// The documented cost of the tombstone, asserted so it stays deliberate:
		// `/rename` back to a previous name is refused while the hold stands. Let it
		// through early and a second holder recreates the exact ambiguity the
		// tombstone exists to prevent.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });
		releaseName(db, { name: "BlueLake", instanceId: "a", now: 1000 });

		const during = claimName(db, { name: "BlueLake", instanceId: "b", now: 1000 + 1 });
		expect(during).toMatchObject({ ok: false, reason: "held" });

		const after = claimName(db, { name: "BlueLake", instanceId: "b", now: 1000 + NAME_HOLD_TTL_MS });
		expect(after).toEqual({ ok: true, name: "BlueLake" });
		expect(resolveName(db, "BlueLake", 1000 + NAME_HOLD_TTL_MS)).toEqual({
			kind: "live",
			instanceId: "b",
		});
	});

	it("gives two live sessions two different names", async () => {
		// Two sessions answering to one address makes `send` ambiguous, and the
		// design refuses an ambiguous name rather than guessing a recipient. Also
		// covers the case-folded collision: `bluelake` and `BlueLake` are one owner
		// on NTFS, so a case-sensitive PRIMARY KEY would split them.
		const db = await openStore();
		expect(claimName(db, { name: "BlueLake", instanceId: "a" })).toMatchObject({ ok: true });

		expect(claimName(db, { name: "bluelake", instanceId: "b" })).toMatchObject({
			ok: false,
			reason: "taken",
		});
		expect(resolveName(db, "BlueLake")).toEqual({ kind: "live", instanceId: "a" });
	});

	it("lets a session re-assert the name it already holds", async () => {
		// Startup re-claims its own name on every reconnect. Refusing that would
		// make a peer lose its own address on a routine restart.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a" });

		expect(claimName(db, { name: "BlueLake", instanceId: "a" })).toMatchObject({ ok: true });
	});

	it("refuses a release from a session that does not hold the name", async () => {
		// A release naming the wrong instance must not vacate someone else's live
		// name: that would hand a live peer a tombstone and turn its address into a
		// send refusal.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });

		expect(releaseName(db, { name: "BlueLake", instanceId: "impostor", now: 1000 })).toBe(false);
		expect(resolveName(db, "BlueLake", 2000)).toEqual({ kind: "live", instanceId: "a" });
	});

	it("reaps expired tombstones without touching live names or fresh holds", async () => {
		// The bound on accumulation. A reaper that also ate live rows would answer
		// the reaping call by silently un-addressing every running peer.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });
		releaseName(db, { name: "BlueLake", instanceId: "a", now: 1000 });
		claimName(db, { name: "GreenCastle", instanceId: "b", now: 1000 });
		releaseName(db, { name: "GreenCastle", instanceId: "b", now: 1000 });
		claimName(db, { name: "RedStone", instanceId: "c", now: 1000 });

		const afterBlue = 1000 + NAME_HOLD_TTL_MS + 5000;
		expect(reapHeldNames(db, afterBlue)).toBe(2);

		expect(resolveName(db, "BlueLake", afterBlue)).toEqual({ kind: "unknown" });
		expect(resolveName(db, "RedStone", afterBlue)).toEqual({ kind: "live", instanceId: "c" });
	});
});

describe("/rename against the registry", () => {
	it("vacates the old name as a hold rather than erasing it", async () => {
		// The end-to-end point of the tombstone: after a rename, mail already
		// addressed to the old name must still say "expired", so the sender can ask
		// for the new one instead of assuming the peer never existed.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });

		expect(renameInStore(db, { instanceId: "a", current: "BlueLake", next: "GreenCastle", now: 2000 })).toEqual({
			kind: "renamed",
			from: "BlueLake",
			to: "GreenCastle",
		});
		expect(resolveName(db, "GreenCastle", 2001)).toEqual({ kind: "live", instanceId: "a" });
		expect(resolveName(db, "BlueLake", 2001)).toEqual({ kind: "expired" });
	});

	it("leaves the caller's own name live when the rename is refused", async () => {
		// The failure this defends: releasing before claiming loses the name. Two
		// writes in the wrong order each look reasonable, and the session that
		// survives is unreachable — its old name is a tombstone and its new one was
		// refused. So the refusal must be a true no-op.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });
		claimName(db, { name: "RedStone", instanceId: "b", now: 1000 });

		const outcome = renameInStore(db, { instanceId: "a", current: "BlueLake", next: "RedStone", now: 2000 });

		expect(outcome).toMatchObject({ kind: "refused", reason: "taken" });
		expect(resolveName(db, "BlueLake", 2001)).toEqual({ kind: "live", instanceId: "a" });
		expect(resolveName(db, "RedStone", 2001)).toEqual({ kind: "live", instanceId: "b" });
	});

	it("refuses a held name as `held`, not as `taken`", async () => {
		// The two refusals need different repairs — a held name frees itself, a taken
		// one does not — so collapsing them into `taken` sends the caller off to
		// negotiate with a peer who is not the problem.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });
		renameInStore(db, { instanceId: "a", current: "BlueLake", next: "GreenCastle", now: 1000 });
		claimName(db, { name: "RedStone", instanceId: "c", now: 1000 });

		expect(renameInStore(db, { instanceId: "c", current: "RedStone", next: "BlueLake", now: 2000 })).toMatchObject({
			kind: "refused",
			reason: "held",
		});
		// And the caller keeps the name it had.
		expect(resolveName(db, "RedStone", 2001)).toEqual({ kind: "live", instanceId: "c" });
	});

	it("re-asserting the current name puts no hold on it", async () => {
		// A rename to the name you already hold must be a genuine no-op. Tombstoning
		// it would make the session's own live address read as `expired` to every
		// sender, and would refuse the next rename away from it.
		const db = await openStore();
		claimName(db, { name: "BlueLake", instanceId: "a", now: 1000 });

		expect(renameInStore(db, { instanceId: "a", current: "BlueLake", next: "bluelake", now: 2000 })).toEqual({
			kind: "renamed",
			from: "BlueLake",
			to: "bluelake",
		});
		expect(resolveName(db, "BlueLake", 2001)).toEqual({ kind: "live", instanceId: "a" });
	});

	it("rolls back rather than leaving a session on two names", async () => {
		// The failure this defends: claiming first and releasing second survives the
		// refusal path but not this one — if the instance does not actually hold
		// `current`, the claim lands and the release finds nothing, leaving the peer
		// answerable under an address nobody vacated. The throw is what makes the
		// transaction roll back.
		const db = await openStore();
		claimName(db, { name: "RedStone", instanceId: "b", now: 1000 });

		expect(() => renameInStore(db, { instanceId: "b", current: "BlueLake", next: "GreenCastle", now: 2000 })).toThrow(
			NameStoreInconsistentError,
		);
		expect(resolveName(db, "GreenCastle", 2001)).toEqual({ kind: "unknown" });
		expect(resolveName(db, "RedStone", 2001)).toEqual({ kind: "live", instanceId: "b" });
	});
});
