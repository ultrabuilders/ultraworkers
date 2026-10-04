import { describe, expect, it } from "bun:test";
import { SQL } from "bun";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	createStorageConformance,
	type StorageConformancePlan,
	type StorageHarness,
	type StorageHarnessControl,
	type StorageHarnessFactory,
} from "./storage-conformance";
import { FileSessionStorage, MemorySessionStorage } from "@oh-my-pi/pi-coding-agent/session/session-storage";
import {
	IndexedSessionStorage,
	type SessionStorageBackend,
	type SessionStorageIndexEntry,
} from "@oh-my-pi/pi-coding-agent/session/indexed-session-storage";
import { SqlSessionStorage, type SqlSessionStorageClient } from "@oh-my-pi/pi-coding-agent/session/sql-session-storage";

/**
 * The shared storage conformance suite, run against each backend.
 *
 * Group membership is decided by CAPABILITY, and a group that needs a failure
 * the backend cannot produce is skipped rather than run in a form that asserts
 * nothing. `MemorySessionStorage` and `FileSessionStorage` have no backend to
 * break, so `failureRecovery` is skipped for them; neither declares
 * `defersSyncPublish` or implements `confirmWrites`, so `deferredPublish` is
 * skipped for both; only `FileSessionStorage` implements the cross-process lock
 * pair.
 *
 * Every skip is asserted, in `register`, so it appears in the output instead of
 * quietly shrinking coverage.
 *
 * `RedisSessionStorage` is NOT registered yet: its double (`createFakeRedis`,
 * `redis-session-storage.test.ts:37`) is module-private and 169 lines, so
 * reusing it means copying it rather than importing it. Tracked on `m1-w16-016`.
 * A stub that returned empty results would make the suite green without
 * exercising anything, which is worse than not registering it.
 */

type GroupName =
	| "readWrite"
	| "indexCoherence"
	| "casToken"
	| "sliceReads"
	| "deferredPublish"
	| "crossProcessLock"
	| "failureRecovery"
	| "lateAtomicRollback";

function groupsFor(...enabled: GroupName[]): Record<string, true> {
	return Object.fromEntries(enabled.map(name => [name, true]));
}

function register(plan: StorageConformancePlan, expectedSkipped: readonly string[]): void {
	describe(plan.name, () => {
		for (const [group, test] of plan.groups) {
			// Wrapped rather than passed: the group's parameter is the harness
			// factory, and `it` would otherwise read it as a `done` callback.
			it(group, () => test());
		}
		it("skips exactly the groups this backend cannot satisfy", () => {
			expect([...plan.skipped].sort()).toEqual([...expectedSkipped].sort());
		});
	});
}

function deferred<T = void>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(r => {
		resolve = r;
	});
	return { promise, resolve };
}

// ── Map control backend ──────────────────────────────────────────────────

/**
 * Copied from `indexed-late-atomic-rollback.test.ts:30-115`, where the F1
 * schedule this suite replays was first reproduced. Copied rather than
 * rewritten because the gate/failure choreography is the finding, not the
 * surrounding code.
 */
class MapBackend implements SessionStorageBackend {
	readonly files = new Map<string, string>();
	failWrites = 0;
	gateReadFull = false;
	readonly writeFullAttempted = deferred();
	readonly readFullGated = deferred();
	#readGate = deferred();
	#readGateOpen = false;

	async init(): Promise<void> {}

	async loadIndex(): Promise<SessionStorageIndexEntry[]> {
		return [...this.files].map(([p, content]) => ({
			path: p,
			size: Buffer.byteLength(content, "utf8"),
			mtimeMs: 0,
		}));
	}

	async readFull(p: string): Promise<string | null> {
		if (this.gateReadFull) {
			this.readFullGated.resolve();
			await this.#readGate.promise;
		}
		return this.files.get(p) ?? null;
	}

	releaseReadFull(): void {
		if (!this.#readGateOpen) {
			this.#readGateOpen = true;
			this.#readGate.resolve();
		}
	}

	async readSlices(p: string, prefixBytes: number, suffixBytes: number): Promise<[string, string]> {
		const bytes = Buffer.from(this.files.get(p) ?? "", "utf8");
		return [
			bytes.subarray(0, prefixBytes).toString("utf8"),
			suffixBytes > 0 ? bytes.subarray(Math.max(0, bytes.length - suffixBytes)).toString("utf8") : "",
		];
	}

	async append(p: string, line: string): Promise<void> {
		this.files.set(p, (this.files.get(p) ?? "") + line);
	}

	async writeFull(
		p: string,
		content: string,
		_mtimeMs: number,
		_title?: unknown,
		expectedSize?: number | null,
	): Promise<void> {
		this.writeFullAttempted.resolve();
		if (this.failWrites > 0) {
			this.failWrites -= 1;
			throw new Error("transient backend write failure");
		}
		const current = this.files.get(p) ?? null;
		const actualSize = current === null ? null : Buffer.byteLength(current, "utf8");
		if (expectedSize !== undefined && actualSize !== expectedSize) {
			throw new Error(`backend conflict for ${p}: expected ${expectedSize}, found ${actualSize}`);
		}
		this.files.set(p, content);
	}

	async updateSessionTitle(): Promise<void> {}

	async truncate(p: string): Promise<void> {
		this.files.set(p, "");
	}

	async remove(paths: string[]): Promise<void> {
		for (const p of paths) this.files.delete(p);
	}

	async move(src: string, dst: string): Promise<void> {
		const content = this.files.get(src);
		if (content === undefined) throw new Error(`ENOENT: ${src}`);
		this.files.delete(src);
		this.files.set(dst, content);
	}
}

const mapHarness: StorageHarnessFactory = async () => {
	const backend = new MapBackend();
	const storage = new IndexedSessionStorage(backend);
	await storage.initialize();
	const control: StorageHarnessControl = {
		failNextWrite: () => {
			backend.failWrites += 1;
		},
		gateReadFull: async () => {
			backend.gateReadFull = true;
			await backend.readFullGated.promise;
		},
		releaseReadFull: () => backend.releaseReadFull(),
	};
	return { storage, dispose: async () => {}, control, resolve: (p: string) => p };
};

// ── SQL harness ──────────────────────────────────────────────────────────

/**
 * Copied from `sql-session-storage.test.ts:51-60`, where the seam is already
 * proven. `Bun.SQL` cannot be told to fail or to wait, and both are the point of
 * the recovery group — so the injection is in the wrapper, and the SQL stays real.
 */
async function sqlHarness(): Promise<StorageHarness> {
	const inner = new SQL("sqlite::memory:");
	let failWrites = 0;
	let gate = false;
	const parked = deferred();
	const release = deferred();

	const client: SqlSessionStorageClient = {
		options: { adapter: "sqlite" },
		async unsafe(query, values) {
			// The full-content read is the one the rollback races on, so it is the
			// one worth parking. Matching on the shape rather than the exact string
			// keeps this working if the query is reworded.
			if (gate && /AS\s+content/i.test(query)) {
				parked.resolve();
				await release.promise;
			}
			// Content writes only: failing the index upsert too would leave the
			// failure looking like a metadata problem.
			if (failWrites > 0 && /^\s*(UPDATE|INSERT)\b/i.test(query)) {
				failWrites -= 1;
				throw new Error("transient backend write failure");
			}
			return inner.unsafe(query, values);
		},
		transaction: callback => inner.transaction(async transaction => callback(transaction)),
	};

	const storage = await SqlSessionStorage.create({ client });
	const control: StorageHarnessControl = {
		failNextWrite: () => {
			failWrites += 1;
		},
		gateReadFull: async () => {
			gate = true;
			await parked.promise;
		},
		releaseReadFull: () => {
			gate = false;
			release.resolve();
		},
	};
	return {
		storage,
		control,
		resolve: (p: string) => p,
		dispose: async () => {
			await inner.end();
		},
	};
}

// ── In-process harnesses ─────────────────────────────────────────────────

const memoryHarness: StorageHarnessFactory = async () => ({
	storage: new MemorySessionStorage(),
	resolve: (p: string) => p,
	dispose: async () => {},
});

const fileHarness: StorageHarnessFactory = async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-conf-"));
	// No constructor argument: the store resolves whatever path it is handed,
	// which is why `resolve` below has to map the logical path into `root`.
	const storage = new FileSessionStorage();
	return {
		storage,
		// A leading slash in a logical path is an ABSOLUTE path to a file-backed
		// store, so without this the suite tries to `mkdir /dir` on the real disk.
		resolve: (p: string) => path.join(root, p),
		dispose: async () => {
			await fs.rm(root, { recursive: true, force: true });
		},
	};
};

// ── Registration ─────────────────────────────────────────────────────────

const ALL: GroupName[] = [
	"readWrite",
	"indexCoherence",
	"casToken",
	"sliceReads",
	"deferredPublish",
	"failureRecovery",
	"lateAtomicRollback",
];

register(
	createStorageConformance("SqlSessionStorage (real SQLite)", sqlHarness, groupsFor(...ALL)),
	// No `withSessionFileLockSync` / `deleteSessionWithArtifactsIf`.
	["crossProcessLock"],
);

register(
	createStorageConformance("IndexedSessionStorage (map control)", mapHarness, groupsFor(...ALL)),
	// No `withSessionFileLockSync` / `deleteSessionWithArtifactsIf`.
	["crossProcessLock"],
);

register(
	createStorageConformance(
		"MemorySessionStorage",
		memoryHarness,
		groupsFor("readWrite", "indexCoherence", "casToken", "sliceReads"),
	),
	// No `defersSyncPublish`/`confirmWrites`, no lock pair, and no backend to fail.
	["crossProcessLock", "deferredPublish", "failureRecovery", "lateAtomicRollback"],
);

register(
	createStorageConformance(
		"FileSessionStorage",
		fileHarness,
		groupsFor("readWrite", "indexCoherence", "casToken", "sliceReads", "crossProcessLock"),
	),
	// No `defersSyncPublish`/`confirmWrites`, and no injectable backend.
	["deferredPublish", "failureRecovery", "lateAtomicRollback"],
);
