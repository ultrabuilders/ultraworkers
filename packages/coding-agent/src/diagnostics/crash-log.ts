/**
 * A small ring of recent crashes, written while the process is on its way out.
 *
 * Every filesystem call here is deliberately **synchronous**. This module runs
 * from crash handlers, where the process is already failing and a rejected
 * promise would be dropped on the floor. AGENTS.md calls that out as the
 * exception to "avoid sync in async flows".
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getCrashLogPath, VERSION } from "@oh-my-pi/pi-utils";

export interface CrashRecord {
	timestamp: string;
	version: string;
	kind: "uncaught_exception" | "fatal_error";
	message: string;
	stack: string | null;
	sessionFile: string | null;
	cwd: string;
	notified?: boolean;
}

const MAX_CRASH_RECORDS = 5;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function readCrashLog(file = getCrashLogPath()): CrashRecord[] {
	try {
		const records: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
		return Array.isArray(records)
			? records.filter(
					(record): record is CrashRecord =>
						typeof record === "object" &&
						record !== null &&
						typeof (record as CrashRecord).timestamp === "string" &&
						typeof (record as CrashRecord).message === "string",
				)
			: [];
	} catch {
		return [];
	}
}

function writeCrashLog(records: readonly CrashRecord[], file: string): void {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`);
}

/** Best-effort persistence for callers that are already crashing. */
export function recordCrash(
	crash: { kind: CrashRecord["kind"]; error: unknown; sessionFile?: string; cwd: string },
	file = getCrashLogPath(),
): CrashRecord | undefined {
	try {
		const { error } = crash;
		const record: CrashRecord = {
			timestamp: new Date().toISOString(),
			version: VERSION,
			kind: crash.kind,
			message: error instanceof Error ? error.message || error.name : String(error),
			stack: error instanceof Error && error.stack ? error.stack : null,
			sessionFile: crash.sessionFile ?? null,
			cwd: crash.cwd,
		};
		writeCrashLog([...readCrashLog(file), record].slice(-MAX_CRASH_RECORDS), file);
		return record;
	} catch {
		return undefined;
	}
}

/** Return the newest recent crash, marking pending records as announced. */
export function takeUnnotifiedCrash(file = getCrashLogPath(), now = Date.now()): CrashRecord | undefined {
	const records = readCrashLog(file);
	const crash = [...records]
		.reverse()
		.find(record => !record.notified && now - Date.parse(record.timestamp) <= MAX_AGE);
	if (!crash) return undefined;
	try {
		writeCrashLog(
			records.map(record => (record.notified ? record : { ...record, notified: true })),
			file,
		);
	} catch {
		// Showing the notice again is harmless.
	}
	return crash;
}

export function clearCrashLog(file = getCrashLogPath()): void {
	try {
		fs.rmSync(file, { force: true });
	} catch {
		// The records can be attached again if cleanup fails.
	}
}
