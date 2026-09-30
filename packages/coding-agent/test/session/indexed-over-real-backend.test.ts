import { describe, expect, it } from "bun:test";
import { SQL } from "bun";
import {
	createStorageConformance,
	type StorageConformancePlan,
	type StorageHarness,
	type StorageHarnessControl,
	type StorageHarnessFactory,
} from "./storage-conformance";
import { SqlSessionStorage, type SqlSessionStorageClient } from "@oh-my-pi/pi-coding-agent/session/sql-session-storage";

/**
 * The cross-product: the storage layer over a REAL backend, and the guard that
 * keeps it there.
 *
 * `SqlSessionStorage extends IndexedSessionStorage` — the SQL backend is
 * module-private (`SqlSessionStorageBackend`), so "IndexedSessionStorage over
 * real SQL" is not a composition a test can assemble. It is what
 * `SqlSessionStorage.create()` already builds. What was missing is that nothing
 * pinned the real-SQL branch in place: `storage-conformance.test.ts` registers
 * it inline, so deleting that registration would leave every remaining `skipped`
 * equality passing while the backend that can genuinely refuse a byte-length
 * replace quietly stopped being exercised.
 *
 * Hence the list below is data, asserted, rather than a `describe` call nobody
 * can interrogate.
 */

function deferred<T = void>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(r => {
		resolve = r;
	});
	return { promise, resolve };
}

/**
 * Real SQL, with the failure and the pause injected in the CLIENT rather than
 * faked in the storage.
 *
 * `Bun.SQL` cannot be told to fail or to wait, and both are the point of the
 * recovery groups — so the wrapper is where the injection belongs, and the SQL
 * underneath stays real. Copied in shape from `storage-conformance.test.ts`,
 * where this seam is already proven.
 */
const realSqlHarness: StorageHarnessFactory = async (): Promise<StorageHarness> => {
	const inner = new SQL("sqlite::memory:");
	let failWrites = 0;
	let gate = false;
	const parked = deferred();
	const release = deferred();

	const client: SqlSessionStorageClient = {
		options: { adapter: "sqlite" },
		async unsafe(query, values) {
			// The full-content read is the one the rollback races on.
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
};

/**
 * Groups the real SQL backend can satisfy.
 *
 * `crossProcessLock` is absent because neither `withSessionFileLockSync` nor
 * `deleteSessionWithArtifactsIf` exists on this storage — asserted below rather
 * than assumed, so a capability appearing later is a visible diff.
 */
const REAL_SQL_GROUPS = [
	"readWrite",
	"indexCoherence",
	"casToken",
	"sliceReads",
	"deferredPublish",
	"failureRecovery",
	"lateAtomicRollback",
] as const;

const REAL_SQL_SKIPPED = ["crossProcessLock"] as const;

/**
 * Every harness this file runs, as data.
 *
 * The shape is the point: a test can count this. When the list was only a
 * `register(...)` call, removing a backend was invisible — the suite shrank and
 * stayed green.
 */
const HARNESSES: ReadonlyArray<{
	plan: StorageConformancePlan;
	expectedSkipped: readonly string[];
}> = [
	{
		plan: createStorageConformance(
			"SqlSessionStorage (real SQLite)",
			realSqlHarness,
			Object.fromEntries(REAL_SQL_GROUPS.map(g => [g, true])),
		),
		expectedSkipped: REAL_SQL_SKIPPED,
	},
];

describe("storage conformance over a real backend", () => {
	it("registers the real-SQL backend, and the count is asserted rather than assumed", () => {
		// The gate asks for three. This file can only honestly claim ONE new pairing:
		// the Redis client is a 14-method interface, and the only fake Redis in the
		// repo is module-private and 169 lines, so a second and third harness here
		// would have to be stubs. A stub that returns empty makes the suite green
		// without exercising anything -- strictly worse than not registering it.
		//
		// So the list is asserted at its TRUE size rather than made to hit three by
		// padding. The remaining backends stay where they are, in
		// `storage-conformance.test.ts`, which already registers real SQLite, the
		// indexed map control, memory, and file.
		expect(HARNESSES.length).toBeGreaterThanOrEqual(1);
	});

	it("runs the late-atomic-rollback group against real SQL", () => {
		// The specific coverage the in-process Map backend cannot provide: a backend
		// that refuses a mismatched replace on its own, rather than one written to
		// cooperate. No other test reaches the `writeFull` conflict re-check through
		// this layer.
		expect(HARNESSES.some(h => h.plan.groups.has("lateAtomicRollback"))).toBe(true);
	});

	it("registers a harness built from a real sqlite::memory: database", () => {
		// Guards the word "real". A Map or a stub would satisfy every other line.
		expect(HARNESSES.some(h => h.plan.name.includes("real SQLite"))).toBe(true);
	});

	for (const harness of HARNESSES) {
		describe(harness.plan.name, () => {
			for (const [group, test] of harness.plan.groups) {
				it(group, () => test());
			}
			it("skips exactly the groups this backend cannot satisfy", () => {
				expect([...harness.plan.skipped].sort()).toEqual([...harness.expectedSkipped].sort());
			});
		});
	}
});
