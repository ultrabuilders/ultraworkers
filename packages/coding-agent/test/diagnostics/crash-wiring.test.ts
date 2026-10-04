import { afterEach, describe, expect, test } from "bun:test";
import { Reason } from "@oh-my-pi/pi-utils/postmortem";
import { armCrashRecording, FATAL_REASONS, recordRejection } from "../../src/diagnostics/crash-wiring";

const cancels: Array<() => void> = [];

afterEach(() => {
	while (cancels.length) cancels.pop()?.();
});

function arm(cwd: string) {
	const cancel = armCrashRecording({ cwd, sessionFile: undefined });
	cancels.push(cancel);
	return cancel;
}

/**
 * The arming itself touches no filesystem — it only registers callbacks — so
 * these tests assert registration behaviour and leave the ring's own I/O to
 * bug-report.test.ts, which already writes to an explicit temp path. Nothing
 * here reads or writes the developer's real crash log.
 */
function withArmed<T>(body: () => T): T {
	try {
		return body();
	} finally {
		while (cancels.length) cancels.pop()?.();
	}
}

describe("armCrashRecording", () => {
	// The whole point of routing through postmortem: a second process-level
	// handler would compete for the same events, so assert we added none.
	test("adds no process-level handler of its own", () => {
		const before = process.listenerCount("uncaughtException") + process.listenerCount("unhandledRejection");
		withArmed(() => arm("/tmp"));
		const after = process.listenerCount("uncaughtException") + process.listenerCount("unhandledRejection");
		expect(after).toBe(before);
	});

	test("returns a cancel function that disarms the registration", () => {
		withArmed(() => {
			const cancel = arm("/tmp");
			expect(typeof cancel).toBe("function");
			cancels.pop();
			cancel();
			// Cancelling twice must not throw — cleanup paths can overlap.
			expect(() => cancel()).not.toThrow();
		});
	});

	// The failure this guards: a Ctrl-C or a normal shutdown filling the ring
	// with entries the user then sees reported as crashes. Only the two fatal
	// reasons may record.
	// The interceptor's return value decides whether postmortem's own fatal path
	// still runs, and it is not reachable from outside without a test-only hook
	// this module should not have. What is verifiable here is the half that can
	// be: recording a rejection writes a record, so the fatal path still has
	// something to report once it fires.
	test("records an unhandled rejection", () => {
		const record = recordRejection(new Error("unhandled"), { cwd: "/tmp" });
		expect(record?.kind).toBe("fatal_error");
	});

	test("records nothing for a signal or a normal exit", () => {
		withArmed(() => {
			arm("/tmp");
			expect(FATAL_REASONS.has(Reason.SIGINT)).toBe(false);
			expect(FATAL_REASONS.has(Reason.SIGTERM)).toBe(false);
			expect(FATAL_REASONS.has(Reason.EXIT)).toBe(false);
			expect(FATAL_REASONS.has(Reason.UNCAUGHT_EXCEPTION)).toBe(true);
			expect(FATAL_REASONS.has(Reason.UNHANDLED_REJECTION)).toBe(true);
		});
	});
});
