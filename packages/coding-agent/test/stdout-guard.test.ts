import { afterEach, describe, expect, it, vi } from "bun:test";
import {
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
});
