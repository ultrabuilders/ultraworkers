/**
 * A compaction cut must not separate a tool call from its result.
 *
 * `findCutPoint` walks backwards over "valid cut points" and keeps from the one
 * it lands on. If a tool result could be a cut point, the walk could stop on it
 * and drop the assistant that issued the call — leaving the kept half-session
 * opening on a `toolResult` whose `toolCallId` resolves to nothing. The provider
 * rejects that transcript, so the user loses the turn to the very compaction
 * that was meant to be preserving it.
 *
 * The implementation already prevents this, and says so in its docstring:
 * `toolResult` is excluded from the cut-point table, and a result always
 * follows the assistant that issued the call. That reasoning is load-bearing
 * and was untested — the cut-point suite covered oversized entries and boundary
 * walking, never a call/result pair straddling the chosen index.
 *
 * The fixture is shaped so the two behaviours actually diverge. The tool CALL is
 * the expensive message and its RESULT is cheap, which is the shape a large
 * `edit` or `write` produces. The backward walk accumulates every entry it
 * passes, so it blows the budget on the assistant; whether the result one step
 * newer was accepted as a cut point before that is exactly the difference being
 * pinned. A fixture whose expensive entry sat at the far end would let the walk
 * run to the bottom and land on the assistant either way, passing under both
 * behaviours — that fixture was tried first and caught nothing.
 */
import { describe, expect, test } from "bun:test";
import { findCutPoint, type SessionMessageEntry } from "@oh-my-pi/pi-agent-core/compaction";
import { Tokenizer } from "@oh-my-pi/pi-agent-core/tokenizer";
import { createAssistantMessage, createUserMessage } from "./helpers";

const tokenizer = new Tokenizer();
/** Big enough that the assistant alone exceeds the budget the walk is given. */
const HUGE = "y".repeat(200_000);

let seq = 0;
function base(type: string) {
	return { id: `p${seq++}`, parentId: null, timestamp: new Date().toISOString(), type };
}

function userEntry(text: string): SessionMessageEntry {
	return { ...base("message"), type: "message", message: createUserMessage(text) } as SessionMessageEntry;
}

function toolCallEntry(callId: string, argumentText: string): SessionMessageEntry {
	return {
		...base("message"),
		type: "message",
		message: createAssistantMessage([
			{ type: "toolCall", id: callId, name: "edit", arguments: { path: "a.txt", content: argumentText } },
		]),
	} as SessionMessageEntry;
}

function toolResultEntry(callId: string): SessionMessageEntry {
	return {
		...base("message"),
		type: "message",
		message: {
			role: "toolResult",
			toolCallId: callId,
			toolName: "edit",
			content: [{ type: "text", text: "ok" }],
			isError: false,
			timestamp: seq,
		},
	} as unknown as SessionMessageEntry;
}

function issuedCallIds(entries: SessionMessageEntry[]): string[] {
	return entries.flatMap(entry => {
		const message = entry.message as { role?: string; content?: Array<{ type?: string; id?: string }> };
		if (message.role !== "assistant" || !Array.isArray(message.content)) return [];
		return message.content.filter(part => part.type === "toolCall").map(part => part.id!);
	});
}

function referencedCallIds(entries: SessionMessageEntry[]): string[] {
	return entries.flatMap(entry => {
		const message = entry.message as { role?: string; toolCallId?: string };
		return message.role === "toolResult" && message.toolCallId ? [message.toolCallId] : [];
	});
}

describe("compaction cut keeps tool calls paired with their results", () => {
	test("an expensive tool call is kept together with its cheap result", () => {
		const entries: SessionMessageEntry[] = [
			userEntry("please edit the file"),
			toolCallEntry("call-big", HUGE),
			toolResultEntry("call-big"),
		];

		const cut = findCutPoint(entries, tokenizer, 0, entries.length, 20);
		const kept = entries.slice(cut.firstKeptEntryIndex);

		// The contract as a provider sees it: no kept result may be left
		// without the assistant that issued it. Expressed over both directions
		// because a cut that keeps neither half is a different (also wrong)
		// failure and must not pass by accident.
		for (const callId of referencedCallIds(kept)) {
			expect(issuedCallIds(kept)).toContain(callId);
		}
		expect(referencedCallIds(kept)).toEqual(["call-big"]);
		expect(issuedCallIds(kept)).toEqual(["call-big"]);
	});

	test("the newest affordable cut is the assistant, not the result after it", () => {
		// Stated directly as well, because the loop above would also be
		// satisfied by a cut that dropped both halves — asserting the index
		// pins that the walk kept the most it could while staying paired.
		const entries: SessionMessageEntry[] = [
			userEntry("please edit the file"),
			toolCallEntry("call-big", HUGE),
			toolResultEntry("call-big"),
		];

		const cut = findCutPoint(entries, tokenizer, 0, entries.length, 20);

		expect(cut.firstKeptEntryIndex).toBe(1);
		expect(entries[cut.firstKeptEntryIndex]?.message.role).toBe("assistant");
	});

	test("a later turn does not pull the result away from its call", () => {
		// Three turns, so the walk has a cheaper cut point newer than the pair
		// and would take it if the pair were splittable.
		const entries: SessionMessageEntry[] = [
			userEntry("first"),
			toolCallEntry("call-1", HUGE),
			toolResultEntry("call-1"),
			userEntry("second"),
			toolCallEntry("call-2", "small"),
			toolResultEntry("call-2"),
		];

		const cut = findCutPoint(entries, tokenizer, 0, entries.length, 20);
		const kept = entries.slice(cut.firstKeptEntryIndex);

		for (const callId of referencedCallIds(kept)) {
			expect(issuedCallIds(kept)).toContain(callId);
		}
		// Non-vacuity: without this a cut that kept everything would satisfy
		// the loop above, and so would a cut that compacted nothing at all.
		expect(kept.length).toBeLessThan(entries.length);
	});
});
