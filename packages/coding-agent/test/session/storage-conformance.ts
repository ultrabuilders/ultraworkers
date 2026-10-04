import { expect } from "bun:test";
import type { SessionStorage } from "@oh-my-pi/pi-coding-agent/session/session-storage";

/**
 * The storage conformance suite, shared by every `SessionStorage` backend.
 *
 * This module registers no tests. It returns a PLAN, and the test file wires that
 * plan into `describe`/`it`. That split is the whole point: a suite that calls
 * `it` itself cannot report a group it was not given, so an omitted capability
 * and a passing one look identical. Here they are different — a group left out
 * lands in `skipped`, and saying so is what makes the omission reviewable.
 *
 * Groups are selected by CAPABILITY, never by convenience. A backend that does
 * not implement `deferredPublish` skips that group because it has no
 * `confirmWrites`, not because the group was awkward to run.
 */

/**
 * Injection seam for the recovery groups.
 *
 * A harness that can be made to fail provides this; one that cannot (a plain
 * in-process store with no backend to break) omits it, and the groups that
 * REQUIRE a failure are skipped for it rather than quietly asserting nothing.
 */
export interface StorageHarnessControl {
	/** Make the next backend `writeFull` fail. */
	failNextWrite(): void;
	/** Park the backend's full-content read, and resolve once it is parked. */
	gateReadFull(): Promise<void>;
	releaseReadFull(): void;
}

export interface StorageHarness {
	storage: SessionStorage;
	dispose(): Promise<void>;
	/**
	 * Map a logical path onto the backend's own namespace.
	 *
	 * The groups are written against paths like `/s/a.jsonl`, which are identifiers
	 * and nothing else. `FileSessionStorage` puts them on the real filesystem, where
	 * a leading slash is an absolute path — without this the suite would try to
	 * `mkdir /dir`. In-memory backends return the path unchanged.
	 */
	resolve(path: string): string;
	/** Absent when the backend cannot be made to fail. */
	control?: StorageHarnessControl;
}

export type StorageHarnessFactory = () => Promise<StorageHarness>;

/** One contract group. Receives a fresh harness per test. */
export type ConformanceGroup = (createHarness: StorageHarnessFactory) => Promise<void>;

/**
 * The group NAMES a backend satisfies — a set, not a map of implementations.
 *
 * Taking names rather than functions is deliberate: the factories live in this
 * module, so a caller cannot supply its own "group" and have the suite report
 * green on a body it wrote itself.
 */
export type ConformanceGroups = Readonly<Record<string, true>>;

export interface StorageConformancePlan {
	readonly name: string;
	/**
	 * Group name → the group, ALREADY BOUND to this backend's harness.
	 *
	 * Bound here rather than at the call site so a test file cannot hand `it` a
	 * function whose parameter it has to guess at — `it` reads a one-argument
	 * function as a `done` callback.
	 */
	readonly groups: ReadonlyMap<string, () => Promise<void>>;
	/**
	 * Groups not requested, plus any requested name that is not a real group.
	 *
	 * A typo in a capability list is a silently green backend, so it is reported
	 * here rather than ignored.
	 */
	readonly skipped: readonly string[];
}

const byteLength = (text: string): number => Buffer.byteLength(text, "utf8");

// ── Groups ───────────────────────────────────────────────────────────────

const readWrite: ConformanceGroup = async createHarness => {
	const { storage, dispose, resolve } = await createHarness();
	try {
		const path = resolve("/s/a.jsonl");
		const body = 'line one\n{"type":"message"}\n';
		storage.writeTextSync(path, body);
		await storage.drain();

		// Verbatim, including the trailing newline: a body that round-trips
		// "close enough" is a truncated transcript that only shows up at parse time.
		expect(await storage.readText(path)).toBe(body);

		const moved = resolve("/s/b.jsonl");
		await storage.rename(path, moved);
		expect(await storage.readText(moved)).toBe(body);
		// The source is gone, not merely unread: a rename that copies leaves two
		// sessions on disk and whichever one gets listed is a coin toss.
		await expect(storage.readText(path)).rejects.toThrow();

		await storage.unlink(moved);
		expect(storage.existsSync(moved)).toBe(false);
	} finally {
		await dispose();
	}
};

const indexCoherence: ConformanceGroup = async createHarness => {
	const { storage, dispose, resolve } = await createHarness();
	try {
		const path = resolve("/dir/a.jsonl");
		// Multi-byte on purpose: a size computed from string length reports 6 here
		// while the file holds 8 bytes, and the CAS token built from it then
		// compares against the wrong number forever after.
		const body = "héllo\n";
		storage.writeTextSync(path, body);
		await storage.drain();

		expect(storage.existsSync(path)).toBe(true);
		expect(storage.statSync(path).size).toBe(byteLength(body));
		expect(storage.listFilesSync(resolve("/dir"), "*.jsonl")).toContain(path);

		storage.writeTextSync(resolve("/dir/note.bak"), "x");
		await storage.drain();
		expect(storage.listFilesSync(resolve("/dir"), "*.jsonl")).toEqual([path]);

		const first = storage.statSync(path).mtimeMs;
		const secondBody = "second body\n";
		storage.writeTextSync(path, secondBody);
		await storage.drain();
		const second = storage.statSync(path).mtimeMs;

		expect(storage.statSync(path).size).toBe(byteLength(secondBody));
		// Non-decreasing, not strictly increasing.
		//
		// `mtimeMs` is millisecond-resolution, so two writes in the same
		// millisecond cannot produce a greater value — an assertion of strict
		// increase would fail against a correct backend purely on timing. The
		// invariant worth defending is that it never goes BACKWARDS: a cache keyed
		// on `mtimeMs` treats a decrease as "older than what I have" and keeps
		// serving stale content forever.
		expect(second).toBeGreaterThanOrEqual(first);
	} finally {
		await dispose();
	}
};

const casToken: ConformanceGroup = async createHarness => {
	const { storage, dispose, resolve } = await createHarness();
	try {
		const path = resolve("/s/a.jsonl");
		const body = "base\n";
		storage.writeTextSync(path, body);
		await storage.drain();
		const size = byteLength(body);

		// The happy path is the token's whole purpose: a writer that computed the
		// right expected size must not be refused by its own backend.
		storage.writeTextSync(path, "grown\n", { expectedSize: size });
		await storage.drain();
		expect(await storage.readText(path)).toBe("grown\n");

		// Stale token: refused. Silently overwriting here is a lost update, and it
		// is the exact race the token exists to catch.
		expect(() => storage.writeTextSync(path, "clobber\n", { expectedSize: size })).toThrow();
		await storage.drain();
		expect(await storage.readText(path)).toBe("grown\n");

		// `null` means "assert absent", so it must fail on a path that exists.
		expect(() => storage.writeTextSync(path, "x\n", { expectedSize: null })).toThrow();
		// ...and succeed on one that does not.
		storage.writeTextSync(resolve("/s/fresh.jsonl"), "new\n", { expectedSize: null });
		await storage.drain();
		expect(await storage.readText(resolve("/s/fresh.jsonl"))).toBe("new\n");
	} finally {
		await dispose();
	}
};

const sliceReads: ConformanceGroup = async createHarness => {
	const { storage, dispose, resolve } = await createHarness();
	try {
		const path = resolve("/s/a.jsonl");
		const body = "0123456789";
		storage.writeTextSync(path, body);
		await storage.drain();

		expect(await storage.readTextSlices(path, 4, 4)).toEqual(["0123", "6789"]);
		// Asking for nothing is a real request — a headless renderer uses it to
		// learn the file is too big — so it must be [empty, empty], not [whole, whole].
		expect(await storage.readTextSlices(path, 0, 0)).toEqual(["", ""]);
		// Asking for more than exists returns everything rather than throwing or
		// padding: the caller asked for a budget, not an exact length.
		expect(await storage.readTextSlices(path, 999, 999)).toEqual([body, body]);
	} finally {
		await dispose();
	}
};

const deferredPublish: ConformanceGroup = async createHarness => {
	const { storage, dispose, resolve } = await createHarness();
	try {
		expect(storage.defersSyncPublish).toBe(true);

		const path = resolve("/s/a.jsonl");
		const body = "queued body\n";
		storage.writeTextSync(path, body);

		// `confirmWrites` is the only signal that a queued write reached durable
		// storage, so it must not resolve early — a caller that awaits it and then
		// reads another process's copy reads a file that does not exist yet.
		await storage.confirmWrites?.(path);
		expect(await storage.readText(path)).toBe(body);
	} finally {
		await dispose();
	}
};

const crossProcessLock: ConformanceGroup = async createHarness => {
	const { storage, dispose, resolve } = await createHarness();
	try {
		const path = resolve("/s/a.jsonl");
		const body = "content under lock\n";
		storage.writeTextSync(path, body);
		await storage.drain();

		// Serialize: each acquisition runs to completion before the next starts, and
		// the lock is RELEASED between them.
		//
		// Deliberately sequential, not nested. Re-acquiring the same path from
		// inside a held lock deadlocks unless the lock is reentrant, and nothing
		// promises that — the earlier version of this test hung on it.
		const seen: string[] = [];
		storage.withSessionFileLockSync?.(path, () => {
			seen.push("first");
		});
		storage.withSessionFileLockSync?.(path, () => {
			seen.push("second");
		});
		expect(seen).toEqual(["first", "second"]);

		// The predicate sees CURRENT content. Deciding on a stale copy deletes a
		// session whose transcript has since been written.
		const refused = await storage.deleteSessionWithArtifactsIf?.(path, content => content.includes("never"));
		expect(refused).toBe(false);
		expect(storage.existsSync(path)).toBe(true);

		const accepted = await storage.deleteSessionWithArtifactsIf?.(path, content => content === body);
		expect(accepted).toBe(true);
		expect(storage.existsSync(path)).toBe(false);
	} finally {
		await dispose();
	}
};

const failureRecovery: ConformanceGroup = async createHarness => {
	const { storage, dispose, control, resolve } = await createHarness();
	try {
		// A group that cannot fail the backend cannot test recovery. Saying so is
		// the whole contract — the alternative is a test named `failureRecovery`
		// that never causes a failure and passes on a broken store.
		if (!control) throw new Error("harness provides no control seam; this group requires one");

		const path = resolve("/s/a.jsonl");
		const durable = "durable\n";
		storage.writeTextSync(path, durable);
		await storage.drain();
		expect(await storage.readText(path)).toBe(durable);

		// `writeTextSync` QUEUES on the indexed backends — it does not throw here,
		// so the failure surfaces when the queue drains. Asserting a synchronous
		// throw tested the wrong moment and would fail against a correct backend.
		control.failNextWrite();
		storage.writeTextSync(path, "doomed\n");
		// The failure is REPORTED, not swallowed: a queued write that fails and
		// leaves `drain()` resolving is a caller that goes on believing the body
		// landed. Measured — `drain()` rejects with the backend's own error.
		await expect(storage.drain()).rejects.toThrow();

		// The index must still describe the last DURABLE body. A stale entry here is
		// what makes a session open as an empty or truncated transcript.
		//
		// This doubles as the proof that the doomed write really failed: had it
		// landed, both assertions below would read "doomed\n" and go red.
		expect(storage.statSync(path).size).toBe(byteLength(durable));
		expect(await storage.readText(path)).toBe(durable);

		// The next write converges and republishes the whole transcript.
		storage.writeTextSync(path, "recovered\n");
		await storage.drain();
		expect(await storage.readText(path)).toBe("recovered\n");
		expect(storage.statSync(path).size).toBe(byteLength("recovered\n"));
	} finally {
		await dispose();
	}
};

const lateAtomicRollback: ConformanceGroup = async createHarness => {
	const { storage, dispose, control, resolve } = await createHarness();
	try {
		// Same requirement as `failureRecovery`: the schedule is a rollback under a
		// FAILED atomic write, so a backend that cannot fail has nothing to roll
		// back and the assertion below would be vacuous.
		if (!control) throw new Error("harness provides no control seam; this group requires one");

		const path = resolve("session.jsonl");
		const base = "base-line\n";
		storage.writeTextSync(path, base);
		await storage.drain();
		const baseSize = byteLength(base);

		const bBody = "B-replacement-with-a-different-size\n";
		const atomic = storage
			.writeTextAtomic(path, "atomic-A-body\n", { expectedSize: baseSize })
			.catch((error: unknown) => error);

		// A concurrent durable write lands while the atomic one is still settling.
		// When the atomic finally fails, rolling the index back to ITS view would
		// discard B — so B has to survive.
		storage.writeTextSync(path, bBody);
		await storage.confirmWrites?.(path);

		await expect(atomic).resolves.toBeInstanceOf(Error);
		expect(await storage.readText(path)).toBe(bBody);
		expect(storage.statSync(path).size).toBe(byteLength(bBody));
	} finally {
		await dispose();
	}
};

const ALL_GROUPS = {
	readWrite,
	indexCoherence,
	casToken,
	sliceReads,
	deferredPublish,
	crossProcessLock,
	failureRecovery,
	lateAtomicRollback,
} satisfies Record<string, ConformanceGroup>;

export const STORAGE_CONFORMANCE_GROUPS = Object.keys(ALL_GROUPS);

/** Build the plan for one backend. Registers nothing. */
export function createStorageConformance(
	name: string,
	createHarness: StorageHarnessFactory,
	groups: ConformanceGroups,
): StorageConformancePlan {
	const selected = new Map<string, () => Promise<void>>();
	const skipped: string[] = [];

	for (const key of Object.keys(ALL_GROUPS)) {
		const group = ALL_GROUPS[key as keyof typeof ALL_GROUPS];
		if (groups[key]) selected.set(key, () => group(createHarness));
		else skipped.push(key);
	}
	// A capability list naming a group that does not exist is a typo, and a typo
	// here reads exactly like a backend that declined the group on purpose.
	for (const key of Object.keys(groups)) {
		if (!(key in ALL_GROUPS)) skipped.push(`${key} (no such group)`);
	}

	return { name, groups: selected, skipped };
}
