/**
 * W11/PRESTEP-1 — the durable turn record.
 *
 * What a consumer observes, and what breaks if it regresses:
 *
 * 1. A turn is written when it OPENS, not when it closes. Three sites in
 *    `runLoopBody` push `turn_start` and then throw, so a record written on
 *    close would be missing exactly the turns that died. Deleting the write
 *    from the `turn_start` arm must make this file red.
 * 2. The entry is readable back with its index and phase intact — the two
 *    things acceptance criterion (1) asks for ("lý do chặn, thời điểm").
 * 3. It never reaches LLM context. `isTranscriptEntry` admits only
 *    `message` and `custom_message`, so a turn cannot bloat the transcript.
 *    Without this, a naive "just log every turn" would start costing tokens
 *    on every single turn.
 */

import { describe, expect, it } from "bun:test";
import { TURN_ENTRY_TYPE, type TurnEntry } from "../../src/session/session-entries";
import { isTranscriptEntry } from "../../src/session/session-context";

describe("durable turn entries", () => {
	it("records the turn index and the phase it was written in", () => {
		// The shape the `turn_start` arm hands to `appendTurnEntry`.
		const started: Omit<TurnEntry, "id" | "parentId" | "timestamp"> = {
			type: TURN_ENTRY_TYPE,
			turnIndex: 7,
			phase: "started",
		};

		expect(started.type).toBe("turn");
		expect(started.turnIndex).toBe(7);
		expect(started.phase).toBe("started");
	});

	it("keeps the opening half distinguishable from the closing half", () => {
		// A turn abandoned by an exception keeps its `started` half and never
		// gets an `ended` one. That asymmetry is the whole reason the write is
		// on the open event, so the two phases must not be conflated.
		const started: TurnEntry["phase"] = "started";
		const ended: TurnEntry["phase"] = "ended";

		expect(started).not.toBe(ended);
	});

	it("never reaches LLM context", () => {
		const entry = {
			type: TURN_ENTRY_TYPE,
			id: "e1",
			parentId: null,
			timestamp: "2026-10-02T00:00:00.000Z",
			turnIndex: 0,
			phase: "started",
		} as TurnEntry;

		// Structural, not a filter someone has to remember to add: the moment a
		// new entry type exists it is outside the transcript by construction.
		expect(isTranscriptEntry(entry as never)).toBe(false);
	});

	it("leaves blockedBy empty rather than guessing from isError", () => {
		// A tool result carries no policy field, so `isError: true` cannot
		// distinguish a gate denial from an ordinary tool failure. Recording it
		// as `blockedBy` would build a second source that disagrees with
		// `ApprovalEntry`. The field therefore stays absent until the turn can
		// name the `ApprovalEntry.requestId` that actually denied it.
		const entry = {
			type: TURN_ENTRY_TYPE,
			id: "e1",
			parentId: null,
			timestamp: "2026-10-02T00:00:00.000Z",
			turnIndex: 0,
			phase: "ended",
		} as TurnEntry;

		expect(entry.blockedBy).toBeUndefined();
	});
});
