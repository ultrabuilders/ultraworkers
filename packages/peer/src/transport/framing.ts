/**
 * Length-prefixed JSON framing.
 *
 * The requirement that shapes everything here: **one corrupt frame must not
 * swallow the good frame behind it.** A reader that gives up on a decode error
 * loses every message after the first bad byte, so a peer that writes one
 * malformed frame silently stops receiving — and the symptom appears at the
 * sender, in the wrong file, hours later.
 *
 * So the length prefix is what recovers the stream. The prefix is four bytes and
 * is read before anything else; when the payload that follows will not decode,
 * the reader has already consumed exactly `4 + length` bytes and can carry on
 * with the next frame. Recovery does not depend on guessing where the bad frame
 * ended, because the prefix said so.
 */

/** Bytes in the length prefix. */
export const PREFIX_BYTES = 4;

/**
 * Refuse to allocate on a nonsense length.
 *
 * The prefix is attacker-reachable if a peer's socket is, so `length` is
 * untrusted. A 4 GiB allocation from four bytes on disk would turn a bad frame
 * into an OOM kill, which is strictly worse than the bad frame. Generous enough
 * for any real envelope, bounded enough that the worst case is a rejection.
 */
export const MAX_FRAME_BYTES = 8 * 1024 * 1024;

/** One frame's outcome. `ok: false` means the frame was consumed and skipped. */
export type Frame =
	| { readonly ok: true; readonly value: unknown }
	| { readonly ok: false; readonly error: Error; readonly skipped: number };

export function encodeFrame(value: unknown): Buffer {
	const payload = Buffer.from(JSON.stringify(value), "utf8");
	if (payload.length > MAX_FRAME_BYTES) {
		throw new RangeError(`frame of ${payload.length} bytes exceeds the ${MAX_FRAME_BYTES}-byte limit`);
	}
	const out = Buffer.allocUnsafe(PREFIX_BYTES + payload.length);
	out.writeUInt32BE(payload.length, 0);
	payload.copy(out, PREFIX_BYTES);
	return out;
}

/** What one `decodeFrames` pass produced: the frames, and the bytes it did not consume. */
export interface Decoded {
	readonly frames: readonly Frame[];
	/** Unconsumed tail — a partial frame. Feed it back with the next chunk. */
	readonly rest: Buffer;
}

/**
 * Pull as many frames as the buffer holds.
 *
 * The leftover comes BACK rather than being left behind by mutating the input.
 * `Buffer.length` is not assignable, so the in-place version of this function
 * cannot be written on this runtime — and returning the tail makes the caller's
 * loop explicit about carrying a partial frame, instead of relying on a side
 * effect it has to know to look for. `rest` aliases the input when nothing is
 * left over, so the common case allocates nothing.
 *
 * A frame that decodes badly yields `{ ok: false }` and the loop CONTINUES. That
 * is the entire point: the bytes are already consumed, so the next frame's
 * prefix is where it should be.
 */
export function decodeFrames(buffer: Buffer): Decoded {
	const frames: Frame[] = [];
	let offset = 0;

	for (;;) {
		// A partial prefix is not an error — the rest is still in flight.
		if (offset + PREFIX_BYTES > buffer.length) break;

		const length = buffer.readUInt32BE(offset);
		if (length > MAX_FRAME_BYTES) {
			// The stream is desynchronised: this length cannot be right, so no
			// later offset in this buffer can be trusted either. Report it and drop
			// the connection — carrying on would read the length bytes as a prefix.
			const error = new Error(`frame length ${length} exceeds the ${MAX_FRAME_BYTES}-byte limit`);
			frames.push({ ok: false, error, skipped: 0 });
			return { frames, rest: Buffer.alloc(0) };
		}

		const start = offset + PREFIX_BYTES;
		const end = start + length;
		// A partial payload waits for the next chunk rather than being reported.
		if (end > buffer.length) break;

		const payload = buffer.subarray(start, end);
		offset = end;
		try {
			frames.push({ ok: true, value: JSON.parse(payload.toString("utf8")) });
		} catch (error) {
			// Consumed exactly 4 + length bytes, so the NEXT frame's prefix is
			// already in the right place. Skipping the count is what makes this a
			// recoverable error rather than a lost stream.
			frames.push({ ok: false, error: error as Error, skipped: PREFIX_BYTES + length });
		}
	}

	return { frames, rest: offset === 0 ? buffer : buffer.subarray(offset) };
}

/**
 * Assemble one frame, so the peer handshake has a shape the two sides agree on.
 *
 * Not a "protocol" — a struct the fields must come in, kept here so a caller
 * cannot invent a third spelling of the same message.
 */
export interface PeerFrame {
	readonly kind: "hello" | "message" | "ack" | "notice";
	readonly from: string;
	/** Present on `message`; absent elsewhere so an ack cannot carry a body. */
	readonly body?: unknown;
	/** Sequence the receiver acknowledges up to. Present on `ack`. */
	readonly upto?: number;
}

/** True when `frame` is a `PeerFrame` of `kind`. Narrows without a cast at the callsite. */
export function isFrameOfKind(frame: unknown, kind: PeerFrame["kind"]): frame is PeerFrame {
	return typeof frame === "object" && frame !== null && (frame as { kind?: unknown }).kind === kind;
}
