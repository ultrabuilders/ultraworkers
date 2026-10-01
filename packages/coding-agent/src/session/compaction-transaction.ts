/**
 * Compaction as a log-bracketed transaction: a durable opening marker, exactly
 * one closing attempt, and a lock recovered by replaying the log.
 *
 * Copied in shape from `~/Projects/deepseek-harness/packages/compaction/compaction-basic/src/region.ts`,
 * which writes `compaction/start` at `:210`, `compaction/end` at `:237`, and the
 * error-path close at `:245`. Its own comment states the reason the opening
 * marker is placed where it is, and that reason is the whole design:
 *
 * > Idle/log validation and `compaction/start` are synchronously adjacent, so the
 * > durable opening marker is the compaction lock before summarization yields.
 * > Every later failure makes exactly one `compaction/end` attempt; a failed close
 * > deliberately leaves the unmatched start detectable.
 *
 * The lock is therefore not advisory. `findUnclosedCompactionTransaction` replays
 * entries and reports the last unmatched start, which is what makes a crash
 * *visible* instead of silently losing the work.
 *
 * **Why this is a seam and not a built-in.** The session entry union is already
 * open to out-of-repo types through the `CustomCompactionSessionEntries`
 * declaration-merge interface (`session-entries.ts:200-206`, which core itself
 * uses for `titleChange`, `credentialPin` and `modelUsage`), so an extension can
 * already declare its own marker entry types. What it could not do was learn that
 * a transaction opened at a chokepoint every compaction path passes, or that one
 * was left open. That is what registration here buys, and it is why unregistering
 * restores the previous behaviour exactly: nothing is written unless an observer
 * is registered.
 */

import type { SessionEntry } from "./session-entries";

/**
 * Identity shared by one compaction's open marker, summary, and close marker.
 *
 * Opaque on purpose. It is a correlation key for a transaction, not a value
 * anything branches on, and the reference repo brands it for the same reason
 * (`packages/compaction/compaction/src/brand.ts:3`).
 */
export type CompactionTransactionId = string & { readonly __compactionTransaction: unique symbol };

/** What an observer is told about a transaction it asked to follow. */
export interface CompactionTransactionObserver {
	/**
	 * Called synchronously before the work, so the observer's durable opening
	 * marker lands before any `await` that could lose it.
	 */
	opened(transaction: { id: CompactionTransactionId; reason?: string }): void;
	/**
	 * Called once after the work settles. `error` is present when the transaction
	 * failed; the close is still attempted, because an unmatched start is the
	 * signal that something went wrong and leaving it unmatched by accident
	 * would make a healthy session look crashed.
	 */
	closed(transaction: { id: CompactionTransactionId; reason?: string; error?: unknown }): void;
}

/**
 * One observer may be registered once. Re-registering the same object would give
 * it two notifications per transaction and make an `opened`/`closed` pair
 * impossible to attribute, so it is refused rather than deduplicated silently.
 */
const observers = new Set<CompactionTransactionObserver>();

const open = new Map<CompactionTransactionId, { reason: string | undefined }>();

let minted = 0;

/**
 * Register an observer of compaction transactions. Returns the unregister
 * function; call it to stop being notified.
 *
 * Refuses anything that is not an object carrying both callbacks. A registration
 * that silently does nothing is the failure this guards: the extension believes
 * it is bracketing compactions and the log says otherwise only after a crash.
 */
export function registerCompactionTransactionObserver(observer: CompactionTransactionObserver): () => void {
	if (observer === null || typeof observer !== "object") {
		throw new Error(
			`Compaction transaction observer must be an object with opened/closed, received ${observer === null ? "null" : typeof observer}`,
		);
	}
	for (const method of ["opened", "closed"] as const) {
		if (typeof observer[method] !== "function") {
			throw new Error(`Compaction transaction observer is missing an ${method}() callback`);
		}
	}
	if (observers.has(observer)) {
		throw new Error(
			"This compaction transaction observer is already registered; unregister it before registering again",
		);
	}
	observers.add(observer);
	return () => {
		observers.delete(observer);
	};
}

/** Registered observers, for a caller that needs to know whether anyone is listening. */
export function hasCompactionTransactionObservers(): boolean {
	return observers.size > 0;
}

/**
 * Open a transaction: mint its id, record it, then notify observers.
 *
 * Notification is last so an observer that throws cannot leave the transaction
 * recorded as open with nobody told — the id is only reachable by a caller that
 * already holds it, so a throw here fails the compaction before any durable
 * marker claims a transaction that is not running.
 */
export function openCompactionTransaction(reason?: string): CompactionTransactionId {
	minted += 1;
	const id = `compact-${minted}-${Date.now().toString(36)}` as CompactionTransactionId;
	open.set(id, { reason });
	for (const observer of observers) observer.opened({ id, reason });
	return id;
}

/**
 * Close a transaction that {@link openCompactionTransaction} opened.
 *
 * Refuses an unknown id rather than ignoring it: a close addressed to a
 * transaction nobody opened means the caller's own bookkeeping is wrong, and
 * swallowing that turns a lost bracket into a silent one.
 */
export function closeCompactionTransaction(id: CompactionTransactionId, error?: unknown): void {
	if (!open.has(id)) {
		throw new Error(
			`Cannot close compaction transaction "${id}": it was never opened, or was already closed. A close for an unknown transaction means the bracket cannot be trusted.`,
		);
	}
	const { reason } = open.get(id)!;
	open.delete(id);
	for (const observer of observers) observer.closed({ id, reason, error });
}

/**
 * Run `work` inside a transaction, closing it exactly once on both outcomes.
 *
 * The close on the failure path is what keeps a failed compaction from reading
 * as a crashed one on the next replay, and the close on the success path is what
 * keeps a *working* session from reading as permanently busy — a transaction
 * left open after a compaction that committed is the failure mode this function
 * exists to prevent, and it is silent: every later reader sees a lock nobody can
 * release. When the close on the failure path itself throws, it replaces the
 * original error, because an untrustworthy bracket is the more consequential
 * problem and losing the summarizer's error would hide it.
 */
export async function runCompactionTransaction<T>(
	reason: string | undefined,
	work: (id: CompactionTransactionId) => Promise<T>,
): Promise<T> {
	const id = openCompactionTransaction(reason);
	let result: T;
	try {
		result = await work(id);
	} catch (error) {
		closeCompactionTransaction(id, error);
		throw error;
	}
	closeCompactionTransaction(id);
	return result;
}

/** Marker entry types an observer writes to bracket a transaction durably. */
export const COMPACTION_TRANSACTION_START = "compaction_transaction_start";
export const COMPACTION_TRANSACTION_END = "compaction_transaction_end";

/** The subset of a marker entry this module reads back. */
interface TransactionMarker {
	type?: string;
	customType?: string;
	data?: { transactionId?: string };
}

/**
 * The lock: the transaction whose opening marker has no closing marker after it.
 *
 * Replayed from the branch in order, so the answer is whatever the log says —
 * including after a crash, which is the case a flag in memory cannot cover. A
 * branch whose last transaction markers are balanced returns `undefined`, and so
 * does a branch with none: no observer registered means no markers, and "no
 * markers" must not read as "busy".
 */
export function findUnclosedCompactionTransaction(
	entries: readonly SessionEntry[],
): CompactionTransactionId | undefined {
	const pending = new Map<string, CompactionTransactionId>();
	for (const entry of entries as readonly TransactionMarker[]) {
		const id = entry.data?.transactionId;
		if (typeof id !== "string" || id.length === 0) continue;
		if (entry.type === "custom" && entry.customType === COMPACTION_TRANSACTION_START) {
			pending.set(id, id as CompactionTransactionId);
		} else if (entry.type === "custom" && entry.customType === COMPACTION_TRANSACTION_END) {
			pending.delete(id);
		}
	}
	// A Map preserves insertion order, so the last one to be opened is the one
	// still outstanding — the transaction a concurrent caller must not start over.
	const ids = [...pending.values()];
	return ids.length > 0 ? ids[ids.length - 1] : undefined;
}
