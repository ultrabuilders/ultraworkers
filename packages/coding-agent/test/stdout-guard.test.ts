import { afterEach, describe, expect, it, vi } from "bun:test";
import { logger } from "@oh-my-pi/pi-utils";
import {
	emitRawStdout,
	flushRawStdout,
	isStdoutTakenOver,
	releaseStdout,
	takeOverStdout,
	writeRawStdout,
} from "@oh-my-pi/pi-coding-agent/utils/stdout-guard";

// Contract for the shared structured-stdout guard.
//
// Two things are worth defending here, and neither is about a retry loop — there
// isn't one, because the ENOBUFS repro this bead was built around does not
// reproduce: 64 MiB into a pipe nobody reads completes with exit 0, no error
// event, and the write callback firing clean.
//
//  1. A takeover is fully reversible, down to object identity. A partial undo
//     would leave `process.stdout` pointing at the stderr sink while reporting
//     that no takeover is active — the worst possible state, because every later
//     write is silently discarded.
//  2. Records cannot be reordered. `writeRawStdout` is fire-and-forget at the
//     call site (`void writeRawStdout(...)` in print-mode), so ordering has to
//     come from the shared tail rather than from awaiting.

afterEach(async () => {
	releaseStdout();
	vi.restoreAllMocks();
	await flushRawStdout();
});

describe("stdout takeover", () => {
	it("restores process.stdout and console.log to their original identity", () => {
		const originalStdout = process.stdout;
		const originalLog = console.log;

		takeOverStdout();
		expect(isStdoutTakenOver()).toBe(true);
		// Identity, not equality: a reassigned-but-equivalent object would pass an
		// equality check while still being the wrong sink.
		expect(process.stdout).not.toBe(originalStdout);

		releaseStdout();
		expect(process.stdout).toBe(originalStdout);
		expect(console.log).toBe(originalLog);
		expect(isStdoutTakenOver()).toBe(false);
	});

	it("refuses a second takeover while one is active", () => {
		// The undo lives in module state precisely so there is one authority on
		// whether this happened. Without the guard, a second takeover would capture
		// the stderr sink as the "real" stdout, and the first undo would then
		// restore the detour to itself.
		takeOverStdout();
		expect(() => takeOverStdout()).toThrow(/already taken over/);
	});
});

describe("writeRawStdout", () => {
	it("serializes records so a later write cannot overtake an earlier one", async () => {
		// Each write is parked until the previous callback fires, so the order the
		// caller enqueued in is the order that reaches the sink. Without the tail a
		// multi-megabyte record followed by a small one can emit the small one
		// first, which is how a JSON-lines stream ends up unparseable.
		const seen: string[] = [];
		// A fake sink rather than the real stdout: the point of the parameter is that
		// records go WHERE THE CALLER SAYS, so the test asserts on exactly that.
		const fake = {
			write: (chunk: unknown, cb?: (e?: Error) => void) => {
				// Hold the first write open long enough that an unserialized
				// implementation would visibly reorder the rest behind it.
				setTimeout(
					() => {
						seen.push(String(chunk));
						cb?.();
					},
					seen.length === 0 ? 12 : 1,
				);
				return true;
			},
		} as unknown as NodeJS.WriteStream;

		void writeRawStdout(fake, "first\n");
		void writeRawStdout(fake, "second\n");
		void writeRawStdout(fake, "third\n");
		await flushRawStdout();

		expect(seen).toEqual(["first\n", "second\n", "third\n"]);
	});

	it("keeps writing after a record fails, instead of poisoning the chain for the process", async () => {
		// The failure this defends against: the consumer goes away mid-stream
		// (`ultraworkers --print … | head -1`), so one write reports EPIPE. If the serializer
		// tail absorbed that rejection, `.then` on the next record would never run
		// its callback and `writeOnce` would stop being called — the channel would
		// report success at every later call site while delivering nothing. Measured
		// before the fix: three records requested, one write() call, zero delivered.
		//
		// Asserting the exact delivered list, not a call count: a sink that swallowed
		// the later records would also satisfy "the writer was called three times" if
		// the fake counted invocations rather than accepted payloads.
		const seen: string[] = [];
		let calls = 0;
		const fake = {
			write: (chunk: unknown, cb?: (e?: Error) => void) => {
				calls++;
				// Fail the first write only, then behave — the shape an early-closing
				// consumer produces, and the only one that distinguishes "survived a
				// single failure" from "the sink is permanently broken".
				if (calls === 1) {
					cb?.(new Error("EPIPE"));
					return true;
				}
				seen.push(String(chunk));
				cb?.();
				return true;
			},
		} as unknown as NodeJS.WriteStream;

		const first = writeRawStdout(fake, "first\n");
		const second = writeRawStdout(fake, "second\n");
		const third = writeRawStdout(fake, "third\n");

		// The failure still reaches the caller that owns that record. Swallowing it
		// inside the guard would trade a dead channel for a silent data loss, which is
		// the same defect wearing a different hat.
		expect(first).rejects.toThrow("EPIPE");
		await expect(second).resolves.toBeUndefined();
		await expect(third).resolves.toBeUndefined();

		// The barrier answers the question a shutdown path actually asks — is the
		// queue empty — rather than re-throwing whichever record happened to fail.
		await expect(flushRawStdout()).resolves.toBeUndefined();
		expect(seen).toEqual(["second\n", "third\n"]);
	});

	it("says so when a fire-and-forget record is dropped, instead of losing it silently", async () => {
		// The chain already guarantees a discarded promise cannot reject unhandled —
		// `writeRawStdout` attaches its own handler before returning. What a caller
		// that drops the result would still lose is the *fact* that a record died:
		// `ultraworkers --print … | head -1` closes the pipe mid-stream, and without this the run
		// ends looking complete while missing output. Asserted on the reported error,
		// not on a bare call count, so a logger that reported the wrong failure fails.
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
		const fake = {
			write: (_chunk: unknown, cb?: (e?: Error) => void) => {
				cb?.(new Error("EPIPE"));
				return true;
			},
		} as unknown as NodeJS.WriteStream;

		emitRawStdout(fake, "gone\n");
		// The failure lands a microtask later; asserting synchronously would pass
		// against a build that never reports anything.
		await flushRawStdout();
		await new Promise(resolve => setTimeout(resolve, 10));

		expect(warn).toHaveBeenCalledTimes(1);
		const [message, fields] = warn.mock.calls[0] as [string, { error: Error }];
		expect(message).toBe("structured stdout record was not delivered");
		expect(fields.error.message).toBe("EPIPE");
	});
});
