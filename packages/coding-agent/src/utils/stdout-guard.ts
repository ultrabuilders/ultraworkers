// Structured-stdout guard, shared by every mode that owns fd 1 as a protocol
// channel or a machine-read stream.
//
// This consolidates three previously separate arrangements — the ACP stdout
// isolation, print-mode's own tail, and nothing at all elsewhere — into one
// module, so the invariants live in one place rather than being rediscovered per
// mode.
//
// There is deliberately NO retry loop here. The plan called for retrying
// ENOBUFS/EAGAIN/EWOULDBLOCK, and that was measured before writing any of it:
// a child writing 64 MiB into a pipe whose reader never reads completes with
// exit 0, no `error` event, no synchronous throw, and the write callback fires
// with no error — Bun buffers it. Across repeated runs the three codes never
// appeared. A retry loop for an unreachable condition is unprovable by
// construction, so it is not here; `writeRawStdout` re-joins the point if a real
// repro turns up.

import * as stream from "node:stream";
import { inspect } from "node:util";
import { logger } from "@oh-my-pi/pi-utils";

// Module-private by virtue of not being exported; ES `#private` fields only
// exist inside a class body, so they cannot express this at module scope.
let tail: Promise<void> = Promise.resolve();
let undoTakeover: (() => void) | undefined;

export function isStdoutTakenOver(): boolean {
	return undoTakeover !== undefined;
}

/**
 * Detach fd 1 from the process and return the REAL stdout for protocol use.
 *
 * Everything else that writes to `process.stdout` — extensions, dependencies, a
 * stray `console.log` — is detoured to stderr, because a single OSC title or BEL
 * spliced into a JSON-RPC stream desyncs frame parsing and the client times out.
 *
 * The undo is held in module state, not returned, so there is exactly one
 * authority on whether the takeover happened; a caller holding a return value
 * could restore it twice, or restore it after something else had taken over.
 */
export function takeOverStdout(): NodeJS.WriteStream {
	if (undoTakeover) throw new Error("stdout is already taken over");
	// fd 1 is the JSON-RPC transport — the same invariant rpc-mode guards by
	// suppressing notifications.
	const protocolStdout = process.stdout;
	const stderrSink = new stream.Writable({
		write(chunk, _encoding, callback) {
			process.stderr.write(chunk, callback);
		},
	}) as unknown as NodeJS.WriteStream;
	const originalLog = console.log;
	Object.defineProperty(process, "stdout", { value: stderrSink, configurable: true, writable: true });
	console.log = (...args: unknown[]) => {
		process.stderr.write(`${formatConsoleArgs(args)}\n`);
	};
	undoTakeover = () => {
		Object.defineProperty(process, "stdout", { value: protocolStdout, configurable: true, writable: true });
		console.log = originalLog;
		undoTakeover = undefined;
	};
	return protocolStdout;
}

/** Restore stdout and console.log. Exported because this module owns the only safe
 * way to reverse a takeover: a caller that undid it by hand would be re-implementing
 * the thing it is testing, and would have to reproduce the identity restore too. */
export function releaseStdout(): void {
	undoTakeover?.();
}

/**
 * Write one structured record to `writer`, serialized on the previous write's
 * completion so records cannot be reordered on the wire.
 *
 * The sink is a parameter rather than `process.stdout` on purpose. `takeOverStdout`
 * REPLACES `process.stdout` with the stderr sink, so a module that reached for the
 * global would silently start writing structured records to stderr — and the write
 * would succeed, so nothing would report the loss. Passing the sink makes the
 * destination explicit at every call site and removes the trap entirely.
 *
 * The tail advances before this resolves, so a caller that never awaits still gets
 * ordering; `flushRawStdout` is how you wait for the whole sequence.
 */
export function writeRawStdout(writer: NodeJS.WriteStream, text: string): Promise<void> {
	const result = tail.then(() => writeOnce(writer, text));
	// The chain advances on SETTLEMENT, not on success. Assigning `result` to `tail`
	// directly would let one failed write poison every write after it: `.then` on a
	// rejected promise never runs its callback, so `writeOnce` would stop being called
	// and the structured channel would die silently for the rest of the process. The
	// failure still reaches a caller that awaits — it is only the *chain* that is kept
	// clean, because the chain's job is ordering, not error reporting.
	tail = result.catch(() => {});
	return result;
}

function writeOnce(writer: NodeJS.WriteStream, text: string): Promise<void> {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	writer.write(text, err => {
		if (err) reject(err);
		else resolve();
	});
	return promise;
}

/**
 * Resolves only AFTER the tail has settled — never before.
 *
 * A barrier, not an error channel: it resolves even when a write failed, because
 * `tail` carries ordering only. A caller that needs to know whether a *particular*
 * record made it awaits that record's own promise from `writeRawStdout`; awaiting
 * this one tells you the queue is empty, which is a different question and the one
 * a shutdown path actually has.
 */
export function flushRawStdout(): Promise<void> {
	return tail;
}

/**
 * Fire-and-forget write for call sites that have nothing to await.
 *
 * The chain fix above is what keeps a dropped record from killing the run:
 * `writeRawStdout` attaches its own handler to every promise it returns, so a caller
 * that discards the result cannot manufacture an unhandled rejection. What is still
 * missing there is *visibility* — a record lost to a closed consumer would vanish
 * with nothing said, which is the failure mode that costs an afternoon. This logs
 * the loss and returns, so the run finishes with the truth in the log.
 */
export function emitRawStdout(writer: NodeJS.WriteStream, text: string): void {
	void writeRawStdout(writer, text).catch((error: unknown) => {
		logger.warn("structured stdout record was not delivered", { error });
	});
}

function formatConsoleArgs(args: unknown[]): string {
	return args
		.map(arg => {
			if (typeof arg === "string") return arg;
			if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
			return inspect(arg, { depth: 2, breakLength: 120 });
		})
		.join(" ");
}
