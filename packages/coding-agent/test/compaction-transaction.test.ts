import { afterEach, describe, expect, it } from "bun:test";
import {
	COMPACTION_TRANSACTION_END,
	COMPACTION_TRANSACTION_START,
	closeCompactionTransaction,
	findUnclosedCompactionTransaction,
	hasCompactionTransactionObservers,
	openCompactionTransaction,
	registerCompactionTransactionObserver,
	runCompactionTransaction,
	type CompactionTransactionId,
	type CompactionTransactionObserver,
} from "@oh-my-pi/pi-coding-agent/session/compaction-transaction";
import type { SessionEntry } from "@oh-my-pi/pi-coding-agent/session/session-entries";

/**
 * Compaction is bracketed in the session log so an interrupted one is visible on
 * the next replay rather than silently lost. The shape is copied from
 * `deepseek-harness/packages/compaction/compaction-basic/src/region.ts` — the
 * opening marker is written before summarization yields (`:210`), the close at
 * `:237`, and the error-path close at `:245`, with the lock recovered by walking
 * the log backwards (`inspectCompactionEntryState`, `:566`).
 *
 * The registry is process-global with no reset, so every case unregisters in
 * `afterEach` and registers under its own observer object.
 */

const registered: Array<() => void> = [];

function observe(): { events: string[]; unregister: () => void } {
	const events: string[] = [];
	const observer: CompactionTransactionObserver = {
		opened: ({ id }) => events.push(`open:${id}`),
		closed: ({ id, error }) => events.push(`close:${id}${error === undefined ? "" : ":err"}`),
	};
	const unregister = registerCompactionTransactionObserver(observer);
	registered.push(unregister);
	return { events, unregister };
}

afterEach(() => {
	while (registered.length > 0) registered.pop()?.();
});

/** A marker entry as `ctx.appendEntry` would write it. */
function marker(customType: string, transactionId: string): SessionEntry {
	return {
		type: "custom",
		customType,
		data: { transactionId },
		id: `${customType}-${transactionId}`,
		parentId: null,
		timestamp: "2026-01-01T00:00:00.000Z",
	} as unknown as SessionEntry;
}

describe("registration", () => {
	it("announces nothing when no observer is registered", () => {
		// The seam's whole red gate. With nobody registered the transaction runs
		// and produces no notification and no entry, so a session's log is
		// byte-identical to one that never had this feature.
		expect(hasCompactionTransactionObservers()).toBe(false);
		const id = openCompactionTransaction("unobserved");
		closeCompactionTransaction(id);
		expect(hasCompactionTransactionObservers()).toBe(false);
	});

	it("pairs an open with a close carrying the same transaction id", async () => {
		// The identity is what lets a reader line the two markers up; two events
		// with no shared id are two facts rather than one transaction.
		const { events } = observe();

		let seen: CompactionTransactionId | undefined;
		await runCompactionTransaction("summary", async transaction => {
			seen = transaction;
			return "committed";
		});

		expect(seen).toBeDefined();
		expect(events).toEqual([`open:${seen}`, `close:${seen}`]);
	});

	it("still closes when the work throws, and reports the failure on the close", async () => {
		// The failure path is the one that matters. If a failed compaction left no
		// close, every crash and every rejected summary would look identical on the
		// next replay — an interrupted one — and the lock would stop meaning
		// anything.
		const { events } = observe();
		const boom = new Error("summarizer refused");

		await expect(
			runCompactionTransaction("summary", async () => {
				throw boom;
			}),
		).rejects.toThrow("summarizer refused");

		expect(events).toHaveLength(2);
		expect(events[1]).toMatch(/^close:compact-.+:err$/);
	});

	it("refuses an observer missing a callback, rather than registering one that cannot fire", () => {
		// The negative criterion. A registration that silently accepted a bad shape
		// would leave an extension believing it brackets compactions, with the log
		// disagreeing only after a crash.
		expect(() =>
			registerCompactionTransactionObserver({ opened: () => {} } as unknown as CompactionTransactionObserver),
		).toThrow(/missing an closed\(\) callback/);
		expect(() => registerCompactionTransactionObserver(null as unknown as CompactionTransactionObserver)).toThrow(
			/must be an object/,
		);
		expect(hasCompactionTransactionObservers()).toBe(false);
	});

	it("refuses a double registration, so each open/close pair stays attributable", () => {
		// Silently deduplicating would be a reasonable-looking choice and the wrong
		// one: the extension would receive two notifications per transaction and
		// could not tell which pair was its own.
		const observer: CompactionTransactionObserver = { opened: () => {}, closed: () => {} };
		const unregister = registerCompactionTransactionObserver(observer);
		registered.push(unregister);

		expect(() => registerCompactionTransactionObserver(observer)).toThrow(/already registered/);
	});

	it("refuses to close a transaction it never opened", () => {
		// A close addressed to an unknown id means the caller's own bookkeeping is
		// wrong. Ignoring it would convert a lost bracket into a silent one.
		observe();
		expect(() => closeCompactionTransaction("compact-not-real" as CompactionTransactionId)).toThrow(
			/never opened, or was already closed/,
		);
	});

	it("refuses a second close of the same transaction", () => {
		// DSH makes exactly one close attempt per transaction; a second one means
		// the close path ran twice, which would unbalance a bracket an observer
		// already wrote.
		observe();
		const id = openCompactionTransaction();
		closeCompactionTransaction(id);
		expect(() => closeCompactionTransaction(id)).toThrow(/already closed/);
	});
});

describe("the lock is read back off the log", () => {
	it("reports the transaction whose start has no end after it", () => {
		// The reason this is worth writing to a file at all: a crash leaves exactly
		// this shape, and nothing in memory survives to notice it.
		const id = openCompactionTransaction();

		expect(findUnclosedCompactionTransaction([marker(COMPACTION_TRANSACTION_START, id)])).toBe(id);
	});

	it("reports nothing once the end marker follows the start", () => {
		// The negative direction. A reader that always answered "busy" would be
		// indistinguishable from one that works, until it blocked every healthy
		// session.
		const id = openCompactionTransaction();
		closeCompactionTransaction(id);

		expect(
			findUnclosedCompactionTransaction([
				marker(COMPACTION_TRANSACTION_START, id),
				marker(COMPACTION_TRANSACTION_END, id),
			]),
		).toBeUndefined();
	});

	it("reports the last outstanding transaction when several overlap", () => {
		// An earlier transaction left open must not mask a later one: the caller
		// deciding whether to start work needs the transaction actually in flight,
		// and hiding it behind a stale marker would report a session as busy for
		// the wrong reason.
		const first = openCompactionTransaction();
		const second = openCompactionTransaction();

		expect(
			findUnclosedCompactionTransaction([
				marker(COMPACTION_TRANSACTION_START, first),
				marker(COMPACTION_TRANSACTION_START, second),
			]),
		).toBe(second);
	});

	it("reads nothing out of a branch with no markers, so an unwatched session is not busy", () => {
		// Nobody registered means no markers were ever written. Reading that as
		// "busy" would make the seam's absence look like a crash — the opposite of
		// what unregistering is supposed to restore.
		expect(findUnclosedCompactionTransaction([])).toBeUndefined();
	});

	it("ignores unrelated custom entries sharing the marker shape", () => {
		// Extensions persist their own custom entries with arbitrary customTypes.
		// Matching on `type: "custom"` alone would let any of them register as a
		// compaction transaction.
		const entries = [
			marker("some_other_extension_state", "compact-1-abc"),
			marker(COMPACTION_TRANSACTION_END, "compact-2-def"),
		] as SessionEntry[];

		expect(findUnclosedCompactionTransaction(entries)).toBeUndefined();
	});
});
