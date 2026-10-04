/**
 * The run journal on disk.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/run-record-store.ts`: the `<runPath>.events.jsonl` layout (`:221`), the HEAD/DELTA
 * line discipline, and the `{ flush: true }` write (`:370`). The delta algebra itself lives in
 * `journal-delta.ts`.
 *
 * ## Why the write flushes
 *
 * `flush: true` is the whole durability claim. Without it an append sits in a buffer, a crash
 * loses it, and a resume that trusted the journal would silently continue from an older state
 * than the run actually reached. The cost is a syscall per event, which is the right trade for
 * a journal whose entire purpose is surviving a crash.
 *
 * ## Why a torn final line is IGNORED, not reported
 *
 * A crash mid-write leaves a partial last line. Two readings are possible: the line never
 * happened, or it did. Choosing "it happened" is unrecoverable — the bytes are gone — while
 * choosing "it never happened" costs exactly one event, and that event's work is redone by
 * resume. So a trailing line that does not parse is dropped and the run resumes from the last
 * complete one.
 *
 * The asymmetry is deliberate and is the reason this is safe: **only the last line may be torn.**
 * A line that fails to parse with valid lines after it is not a crash artefact, it is
 * corruption, and that throws rather than being silently skipped — a journal that quietly
 * resumes from the middle is how a run loses state without anyone being told.
 */
import * as fs from "node:fs/promises";
import { WorkflowError, WorkflowErrorCode } from "../errors";
import { type Entry, type Head, FORMAT, type JournalState, applyDelta, isHead } from "./journal-delta";

export type AgentSettler = (agents: unknown[], cause: string, atIso: string) => unknown[];

export function journalPathFor(runPath: string): string {
	return `${runPath}.events.jsonl`;
}

/** Append one line. `head` writes a snapshot and truncates; otherwise it appends a delta. */
export async function appendJournalLine(runPath: string, line: Head | Entry): Promise<string> {
	const serialized = `${JSON.stringify(line)}\n`;
	await fs.appendFile(journalPathFor(runPath), serialized, { flush: true });
	return serialized;
}

function parseLine(raw: string): Head | Entry | undefined {
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return undefined;
	}
	if (!value || typeof value !== "object") return undefined;
	if (isHead(value)) return value;

	// A line that parses, is an object, and carries a FOREIGN `format` is not a torn write — it
	// is a journal written by a different version of this engine. Without this it falls through
	// to the DELTA shape check, fails it, and is reported as a torn final line, which for a
	// single-line journal means `loadRunState` returns `undefined`: "this run never started".
	// The run is not lost, it is INVISIBLE, and resume starts it over having spent every token
	// it already paid for. A version we cannot read must be named, not skipped.
	const format = (value as { format?: unknown }).format;
	if (typeof format === "string" && format !== FORMAT) {
		throw new WorkflowError(
			`workflow journal ${format} is not this build's format (${FORMAT}); refusing to replay it`,
			WorkflowErrorCode.PERSISTENCE_ERROR,
			{ details: { found: format, expected: FORMAT } },
		);
	}

	const candidate = value as Entry;
	// A DELTA is only a delta if it carries the fields a delta is replayed with. Without
	// this, a truncated line that still parses as an object would replay as "no changes",
	// which is the same as saying the event did nothing.
	if (typeof candidate.generation !== "string" || typeof candidate.sequence !== "number") return undefined;
	if (!candidate.delta || typeof candidate.delta !== "object") return undefined;
	return candidate;
}

/**
 * Rebuild a run's state from its journal.
 *
 * Replays every line in order: a HEAD replaces the state wholesale (that is what a compaction
 * line is for), a DELTA is applied on top. Returns `undefined` when the file does not exist —
 * a run with no journal yet is not an error, it is a run that has not started.
 */
export async function loadRunState(runPath: string, settleAgents?: AgentSettler): Promise<JournalState | undefined> {
	let text: string;
	try {
		text = await fs.readFile(journalPathFor(runPath), "utf8");
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw err;
	}

	const lines = text.split("\n");
	const state: JournalState = {};
	let applied = 0;
	let torn = false;

	for (const [index, raw] of lines.entries()) {
		if (raw.trim() === "") continue;
		const line = parseLine(raw);
		if (line === undefined) {
			// Only the LAST non-empty line may be a crash artefact. Anything earlier means the
			// file is damaged in a way a crash cannot explain, and resuming from it would
			// silently drop every event after the damage.
			const remaining = lines.slice(index + 1).some(rest => rest.trim() !== "");
			if (remaining) throw new Error(`workflow journal ${journalPathFor(runPath)} is corrupt at line ${index + 1}`);
			torn = true;
			continue;
		}
		if (isHead(line)) {
			for (const key of Object.keys(state)) delete state[key];
			Object.assign(state, structuredClone(line.state));
		} else {
			applyDelta(state, line.delta, settleAgents);
		}
		applied++;
	}

	if (applied === 0 && torn) return undefined;
	return state;
}
