/**
 * Populate the crash ring.
 *
 * Both routes go through postmortem, which already owns SIGINT/SIGTERM/SIGHUP,
 * uncaughtException and unhandledRejection. A second `process.on` handler here
 * would compete with it for the same events, so neither exists in this file.
 */

import { interceptUnhandledRejections, Reason, register } from "@oh-my-pi/pi-utils/postmortem";
import type { CrashRecord } from "./crash-log";
import { recordCrash } from "./crash-log";

/** Reasons that mean the process is ending badly enough to be worth recording. */
export const FATAL_REASONS: ReadonlySet<Reason> = new Set([Reason.UNCAUGHT_EXCEPTION, Reason.UNHANDLED_REJECTION]);

export interface CrashRecordingContext {
	/** Absolute path to the session file, when there is one, so the crash can be tied to it. */
	sessionFile?: string;
	cwd: string;
}

/**
 * Arm both crash routes. Returns the cancel functions; call them when the owner
 * goes away so a disposed session stops writing.
 *
 * The rejection route is an interceptor rather than a second handler: returning
 * `false` lets postmortem keep its own fatal path, so this only adds a record and
 * does not decide whether the process survives.
 */
export function armCrashRecording(context: CrashRecordingContext): () => void {
	const cancelCleanup = register("diagnostics:crash-ring", reason => {
		if (!FATAL_REASONS.has(reason)) return;
		recordCrash({
			kind: reason === Reason.UNCAUGHT_EXCEPTION ? "uncaught_exception" : "fatal_error",
			error: new Error(`session ended: ${reason}`),
			cwd: context.cwd,
			...(context.sessionFile ? { sessionFile: context.sessionFile } : {}),
		});
	});

	const cancelRejection = interceptUnhandledRejections((reason: unknown) => {
		recordRejection(reason, context);
		// Not consumed: the rejection is still fatal, it is merely recorded too.
		return false;
	});

	return () => {
		cancelCleanup();
		cancelRejection();
	};
}

/** Record an unhandled rejection. Exported so its contract can be asserted directly. */
export function recordRejection(reason: unknown, context: CrashRecordingContext): CrashRecord | undefined {
	return recordCrash({
		kind: "fatal_error",
		error: reason,
		cwd: context.cwd,
		...(context.sessionFile ? { sessionFile: context.sessionFile } : {}),
	});
}

/** Record a fatal error directly, for a call site that already caught one. */
export function recordFatalCrash(error: unknown, context: CrashRecordingContext): CrashRecord | undefined {
	return recordCrash({
		kind: "fatal_error",
		error,
		cwd: context.cwd,
		...(context.sessionFile ? { sessionFile: context.sessionFile } : {}),
	});
}
