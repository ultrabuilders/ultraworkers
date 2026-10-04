import * as fs from "node:fs/promises";
import * as path from "node:path";
import { atomicWriteJson } from "@oh-my-pi/pi-utils";

/**
 * The durable per-session inbox: one file per message, written atomically.
 *
 * WHY FILES AND NOT A QUEUE. A durable inbox has to survive the process that
 * wrote it, and its reader is a different process that may be looking at any
 * moment. A single file holding an array would make "is a message in it?" and
 * "is it readable right now?" the same question, and the honest answer to the
 * second is sometimes no. One file per message removes the question: a file is
 * either there and complete, or not there.
 *
 * WHY THE FILENAME IS THE ORDER. `<seq>-<envelopeId>.json` sorts lexicographically
 * into delivery order, so `sorted()` IS the cursor and no sequence column can
 * disagree with what a reader sees. The sequence is allocated centrally (see
 * `epic-jwsy.8`) because a writer-derived one collides when two senders land in
 * the same millisecond, and a collision loses a message with nothing to detect it.
 */

/**
 * Retention horizon, in files.
 *
 * NOT the bus's `MAILBOX_CAP = 100`. That number is a measured property of an
 * in-process RAM queue whose oldest entry is dropped when a receiver is busy.
 * This inbox is different in the way that matters: it survives a restart, so
 * "full" here means BACKLOG, not a busy receiver — and dropping the oldest
 * unread message because a backlog built up while nobody was running is exactly
 * the silent loss this store exists to make impossible. The two caps are
 * separate on purpose; see the table in `epic-jwsy.6`.
 *
 * NOT 8192 EITHER, and the bead that asked for it was wrong about its source.
 * `epic-jwsy.8` attributes 8192 to `pi-parley`'s mailbox cap. Measured in
 * `pi-peer-messaging-ref/pi-parley/broker/broker.ts:109`:
 *
 *     const MAX_MAILBOX_MESSAGES = 256;
 *
 * The 8192 that appears in that repo is a barrier-directory capacity
 * (`federation-conversation.ts:64`), a max qualified-id length, and a metrics
 * cache in a different repo — none of them a mailbox. The number was borrowed
 * from a premise that does not hold, so it is not reproduced here.
 *
 * This is a PLACEHOLDER pending the owner's backlog measurement, which
 * `epic-jwsy.8` calls a hard first step: a horizon too low loses history when a
 * user returns after a day, too high lets the inbox grow without bound. 256 is
 * the one number here that was measured rather than assumed, and it is the right
 * default to start from.
 */
export const INBOX_HORIZON = 256;

/**
 * One delivered message.
 *
 * `seq` is central and monotonic, never writer-derived — two senders in the same
 * millisecond would otherwise produce the same number and one message would
 * vanish with no error anywhere.
 */
export interface InboxEnvelope {
	readonly seq: number;
	readonly envelopeId: string;
	readonly from: string;
	readonly subject: string;
	readonly bodyMd: string;
	readonly importance: "low" | "normal" | "high" | "urgent";
	readonly createdTs: string;
}

/**
 * Raised when a send would exceed {@link INBOX_HORIZON}.
 *
 * This is a REFUSAL, not a drop. `irc/bus.ts` still shifts the oldest message
 * out of an in-process mailbox; doing that here would discard unread mail
 * because a backlog accumulated while no session was running, which is the one
 * failure mode a durable store must not have.
 */
export class MailboxFullError extends Error {
	readonly code = "mailbox_full";
	constructor(readonly horizon: number) {
		super(`inbox is full (${horizon} messages); refusing to deliver rather than drop the oldest`);
		this.name = "MailboxFullError";
	}
}

/** Zero-padded so lexicographic order matches numeric order. */
const SEQ_WIDTH = 12;

/**
 * The filename that encodes delivery order.
 *
 * Zero-padding is what makes the sort correct: unpadded `9-…` sorts after
 * `10-…`, so a reader would replay a later message first. The envelope id is in
 * the name so two envelopes that share a sequence — which a central allocator
 * makes impossible, but a caller can still construct — do not collide into one
 * file and silently overwrite each other.
 */
export function inboxFileName(seq: number, envelopeId: string): string {
	if (!Number.isSafeInteger(seq) || seq < 0) {
		throw new RangeError(`seq must be a non-negative safe integer, got ${seq}`);
	}
	return `${String(seq).padStart(SEQ_WIDTH, "0")}-${envelopeId}.json`;
}

/** Parse a filename back into its parts. Returns null for anything that is not ours. */
export function parseInboxFileName(name: string): { seq: number; envelopeId: string } | null {
	const match = /^(\d{1,})-([^/]+)\.json$/.exec(name);
	if (!match) return null;
	const seq = Number(match[1]);
	if (!Number.isSafeInteger(seq)) return null;
	return { seq, envelopeId: match[2] };
}

/**
 * A durable inbox rooted at a directory.
 *
 * The sequence is passed in rather than kept here: two processes writing the
 * same inbox must agree on order, and only a central allocator can promise that.
 */
export class InboxStore {
	readonly #dir: string;
	readonly #horizon: number;

	constructor(dir: string, options: { readonly horizon?: number } = {}) {
		this.#dir = dir;
		this.#horizon = options.horizon ?? INBOX_HORIZON;
	}

	/** Absolute path of the directory backing this inbox. */
	get dir(): string {
		return this.#dir;
	}

	/**
	 * Write one envelope.
	 *
	 * Throws {@link MailboxFullError} rather than evicting: the caller decides
	 * whether to apply backpressure or fail, and this store does not decide for
	 * them by destroying mail it was asked to keep.
	 */
	async append(envelope: InboxEnvelope): Promise<string> {
		const name = inboxFileName(envelope.seq, envelope.envelopeId);
		await fs.mkdir(this.#dir, { recursive: true });
		// The cap is checked against what is already on disk, so two processes
		// appending at once can overshoot by one rather than by a queue's worth.
		// Overshoot is recoverable (the horizon is reclaimed on read); dropping a
		// delivered message is not.
		if ((await this.count()) >= this.#horizon) throw new MailboxFullError(this.#horizon);
		await atomicWriteJson(path.join(this.#dir, name), envelope);
		return name;
	}

	/**
	 * Every envelope in delivery order.
	 *
	 * Order comes from the FILENAME, not from anything stored in the file, so a
	 * hand-edited or corrupt `seq` field cannot reorder history. A file that does
	 * not parse is skipped rather than thrown: one damaged message must not make
	 * the whole inbox unreadable, and the alternative — refusing to list — turns
	 * a single bad write into total loss.
	 */
	async list(): Promise<InboxEnvelope[]> {
		const out: InboxEnvelope[] = [];
		for (const name of await this.#names()) {
			try {
				out.push((await Bun.file(path.join(this.#dir, name)).json()) as InboxEnvelope);
			} catch {
				// Best effort: a torn or hand-written file is not a reason to
				// hide every other message in the inbox.
			}
		}
		return out;
	}

	/** Number of envelope files present, including any that do not parse. */
	async count(): Promise<number> {
		return (await this.#names()).length;
	}

	/**
	 * Delete one envelope by identity.
	 *
	 * Takes BOTH parts of the name rather than a sequence alone, because the
	 * envelope id is what distinguishes two messages that would otherwise share a
	 * filename — removing by sequence alone would delete the wrong one of a pair.
	 *
	 * `force` makes an absent file a no-op, so a retention pass racing another
	 * process does not fail halfway: the message is already gone, which is the
	 * state the caller asked for.
	 */
	async remove(seq: number, envelopeId: string): Promise<void> {
		await fs.rm(path.join(this.#dir, inboxFileName(seq, envelopeId)), { force: true });
	}

	/**
	 * Delete the oldest entries until the inbox is within `count`.
	 *
	 * The blunt instrument, kept for callers that genuinely only care about size.
	 * The cursor layer (`epic-jwsy.8`) does NOT use this: retention there follows
	 * the read cursor, and must report what it removed and why, which a count
	 * cannot express.
	 */
	async pruneTo(count: number): Promise<number> {
		const names = await this.#names();
		if (names.length <= count) return 0;
		const doomed = names.slice(0, names.length - count);
		for (const name of doomed) {
			await fs.rm(path.join(this.#dir, name), { force: true });
		}
		return doomed.length;
	}

	/** Envelope filenames in delivery order. Anything not named like ours is ignored. */
	async #names(): Promise<string[]> {
		let entries: string[];
		try {
			entries = await fs.readdir(this.#dir);
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
			throw err;
		}
		return entries.filter(name => parseInboxFileName(name) !== null).sort();
	}
}
