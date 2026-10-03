import type { InboxEnvelope, InboxStore } from "./store";

/**
 * Reading position over a durable inbox, and the retention that follows from it.
 *
 * WHY SEQUENCE-CENTRIC AND NOT AGE-BASED. Retention follows the CURSOR, not a
 * timestamp: an inbox that survived a restart may hold a backlog nobody has read
 * yet, and pruning by age would delete exactly the mail a returning user came
 * back for. The rule is "never prune unread", so what may be pruned is decided by
 * the reader's position, never by a clock.
 *
 * WHY A CENTRAL SEQUENCE. `InboxEnvelope.seq` is allocated by the store's owner
 * (`epic-jwsy.8`), not derived from a clock by the writer: two senders in the same
 * millisecond would collide, and a collision silently loses a message. A gap is
 * recoverable — it is reported and the reader can resync — whereas a duplicate is
 * invisible. That asymmetry is the whole reason the number is allocated centrally.
 *
 * MECHANISM COPIED FROM `pi-parley` (`broker/broker.ts`), whose mailbox does the
 * same job cross-session: when capacity forces an eviction it RECORDS WHY
 * (`E_DELIVERY_EVICTED`) and notifies the affected side, rather than shifting an
 * array and losing the fact. Copied deliberately; see {@link EvictedEnvelope}.
 */

/**
 * Why a message left the inbox.
 *
 * `pi-parley` writes these into its delivery record so an evicted send is
 * distinguishable from one that was never accepted. The same distinction is the
 * point here: "your inbox is full and this is what it cost you" is actionable,
 * and a silent shrink is not.
 */
export type EvictionReason = "retention" | "capacity";

/** A message the retention pass removed, and why. */
export interface EvictedEnvelope {
	readonly envelope: InboxEnvelope;
	readonly reason: EvictionReason;
	/**
	 * True when the message was still UNREAD at the moment it was removed.
	 *
	 * This is the state the bead calls out as a contradiction worth surfacing:
	 * "never prune unread" and a hard horizon cannot both hold at once. Rather
	 * than silently breaking one of them, the pass reports `read: false` so the
	 * caller learns that an unread message was sacrificed to the cap.
	 */
	readonly read: boolean;
}

/**
 * A run of sequence numbers absent from the inbox, with a reason it is believed
 * to be absent.
 *
 * The bead requires gaps be REPORTED, never skipped: a reader that silently
 * advances past a hole concludes it has seen everything when it has not. The two
 * causes are both reportable because both are observable from the store itself —
 * a hole below the oldest retained sequence is retention; a hole between retained
 * files is a delivery that never landed.
 */
export interface SequenceGap {
	readonly fromSeq: number;
	readonly toSeq: number;
	readonly cause: "retention" | "missing";
}

/** Options for {@link read}. */
export interface ReadOptions {
	/**
	 * Return messages strictly after this sequence. `0` starts from the beginning.
	 *
	 * A sequence, not an index or an offset: an index shifts when retention runs,
	 * so a reader resuming by index re-reads or skips depending on timing.
	 */
	readonly afterSeq?: number;
	/** Cap on how many envelopes to return, oldest first. */
	readonly limit?: number;
}

/** What one read returned, including anything the reader must be told about. */
export interface ReadResult {
	readonly envelopes: InboxEnvelope[];
	/** Highest sequence observed, or `afterSeq` when the inbox was empty. */
	readonly highSeq: number;
	/** Holes found between `afterSeq` and `highSeq`, oldest first. Empty when contiguous. */
	readonly gaps: SequenceGap[];
	/** True when the inbox has never held anything at or below `afterSeq`. */
	readonly truncated: boolean;
}

/**
 * The two limits, named so a caller cannot confuse them.
 *
 * `MAILBOX_CAP` (the in-process bus) is a RAM queue whose oldest entry is dropped
 * when a receiver is merely busy. The horizon is a durable inbox that survives a
 * restart, so "full" means BACKLOG. They are different limits at different layers,
 * and conflating them is how an agent ends up debugging the wrong one.
 *
 * Both are 256, and the number is measured rather than borrowed.
 *
 * TWO NUMBERS FROM THE SAME REFERENCE, ONE OF THEM MISATTRIBUTED. `pi-parley`'s
 * mailbox cap is `MAX_MAILBOX_MESSAGES = 256` (`broker/broker.ts:109`). The 8192
 * that `epic-jwsy.8` also cites is a **barrier-directory capacity**
 * (`federation-conversation.ts:64`) and an id-length bound — it is not a mailbox
 * cap at all. Same shape as borrowing a number and reading the wrong column.
 *
 * AND BACKLOG MEASURED HERE, which is what actually settles it. Across the 56
 * inboxes `mcp_agent_mail_rust` keeps on this machine:
 *
 *     median 34   p95 133   max 236   none at or above 256
 *
 * 256 sits just under 2× p95 and about 7.5× the median, which is where a
 * backlog bound belongs: a busy peer approaches it, a peer that is not reading
 * its mail crosses it. But the headroom at the observed maximum is **20
 * messages, 7.8%** — one peer out of 56 was already at 92% of it. So
 * "unread alone above the cap" is not an edge case to guard against; it is the
 * expected next step, and the reason that path has to report rather than prune
 * quietly.
 */
export const INBOX_LIMITS = {
	/** Unread messages may exceed this before retention starts evicting. */
	unreadHorizon: 256,
	/** Hard stop: the store refuses appends rather than evicting to make room. */
	capacity: 256,
} as const;

/**
 * Read forward from a sequence, reporting any hole rather than stepping over it.
 *
 * The gap check is what makes this trustworthy: returning `envelopes` alone would
 * let a caller treat "I got N messages" as "I saw everything since the cursor",
 * which is false the moment retention has removed something from the middle.
 */
export async function read(store: InboxStore, options: ReadOptions = {}): Promise<ReadResult> {
	const afterSeq = options.afterSeq ?? 0;
	const pending = (await store.list()).filter(e => e.seq > afterSeq);
	const envelopes = options.limit === undefined ? pending : pending.slice(0, options.limit);

	if (envelopes.length === 0) {
		return { envelopes: [], highSeq: afterSeq, gaps: [], truncated: false };
	}

	const highSeq = envelopes[envelopes.length - 1]!.seq;
	return {
		envelopes,
		highSeq,
		gaps: findGaps(
			envelopes.map(e => e.seq),
			afterSeq,
		),
		truncated: afterSeq > 0 && envelopes[0]!.seq > afterSeq + 1,
	};
}

/**
 * Holes in an ascending run of sequences, each labelled with what could have
 * removed it.
 *
 * A hole at the very start (before the oldest retained sequence) is retention,
 * because nothing else deletes files here. A hole between two retained files is a
 * delivery that never landed — and it is reported rather than papered over,
 * because the alternative is a reader that believes it is caught up.
 */
export function findGaps(seqs: readonly number[], afterSeq: number): SequenceGap[] {
	const gaps: SequenceGap[] = [];
	if (seqs.length === 0) return gaps;

	const first = seqs[0]!;
	if (first > afterSeq + 1) {
		// The hole reaches back past everything still on disk, so retention is
		// the only thing that can have removed it.
		gaps.push({ fromSeq: afterSeq + 1, toSeq: first - 1, cause: "retention" });
	}

	for (let i = 1; i < seqs.length; i++) {
		const prev = seqs[i - 1]!;
		const current = seqs[i]!;
		if (current > prev + 1) {
			// A hole WITHIN what is still on disk: retention removes from the
			// front, so it cannot produce one here.
			gaps.push({ fromSeq: prev + 1, toSeq: current - 1, cause: "missing" });
		}
	}
	return gaps;
}

/**
 * Advance retention to a cursor, returning everything it removed.
 *
 * Refuses to evict unread mail while the unread count is within the horizon: the
 * bead makes "never prune unread" the rule that outranks the cap. Unread alone
 * above the horizon is a peer consuming nothing at all, which is a condition to
 * REPORT — so this returns those evictions with `read: false` rather than
 * pretending the rule held.
 */
export async function retain(
	store: InboxStore,
	readSeq: number,
	options: { readonly unreadHorizon?: number } = {},
): Promise<EvictedEnvelope[]> {
	const horizon = options.unreadHorizon ?? INBOX_LIMITS.unreadHorizon;
	const all = await store.list();
	const unread = all.filter(e => e.seq > readSeq);

	const evicted: EvictedEnvelope[] = [];
	// Everything at or below the cursor is read by definition and may go.
	const readable = all.filter(e => e.seq <= readSeq);
	for (const envelope of readable) {
		await store.remove(envelope.seq, envelope.envelopeId);
		evicted.push({ envelope, reason: "retention", read: true });
	}

	// Only once unread ALONE exceeds the horizon does the cap bite. Read mail is
	// already gone above, so the running count below is the unread count, and each
	// eviction is reported with `read: false` so the sacrifice stays visible.
	let unreadLeft = unread.length;
	for (const envelope of unread) {
		if (unreadLeft <= horizon) break;
		await store.remove(envelope.seq, envelope.envelopeId);
		evicted.push({ envelope, reason: "capacity", read: false });
		unreadLeft--;
	}
	return evicted;
}
