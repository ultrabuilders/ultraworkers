import { describe, expect, test } from "bun:test";
import type { AgentMessage } from "@oh-my-pi/pi-agent-core";
import {
	DEFAULT_COMPACTION_SETTINGS,
	dropFailedAssistantTurns,
	type SessionEntry,
	type SessionMessageEntry,
	prepareCompaction,
} from "@oh-my-pi/pi-agent-core/compaction";
import { createAssistantMessage, createUserMessage } from "./helpers";

let seq = 0;
function nextId(): string {
	return `e${seq++}`;
}

function messageEntry(message: AgentMessage): SessionMessageEntry {
	return {
		id: nextId(),
		parentId: null,
		timestamp: new Date().toISOString(),
		type: "message",
		message,
	};
}

function userEntry(text: string): SessionMessageEntry {
	return messageEntry(createUserMessage(text));
}

function assistantEntry(
	text: string,
	stopReason: "stop" | "length" | "error" | "aborted" = "stop",
): SessionMessageEntry {
	return messageEntry(createAssistantMessage([{ type: "text", text }], stopReason));
}

/** Assistant that declares a tool call, so it must be followed by a matching result to stay valid. */
function toolCallEntry(callId: string, stopReason: "stop" | "error" | "aborted" = "stop"): SessionMessageEntry {
	return messageEntry(
		createAssistantMessage(
			[
				{ type: "text", text: "calling a tool" },
				{ type: "toolCall", id: callId, name: "search", arguments: {} },
			],
			stopReason,
		),
	);
}

function toolResultEntry(callId: string, text: string): SessionMessageEntry {
	return messageEntry({
		role: "toolResult",
		toolCallId: callId,
		toolName: "search",
		content: [{ type: "text", text }],
		isError: false,
		timestamp: Date.now(),
	});
}

function isMessageEntry(entry: SessionEntry): entry is SessionMessageEntry {
	return entry.type === "message";
}

/**
 * Tool-pair scan in BOTH directions. Providers reject a request carrying a
 * `tool_use` with no `tool_result`, and equally one carrying a `tool_result`
 * with no preceding `tool_use` — so a one-sided check hides exactly the defect
 * it was written to catch.
 */
function unpairedToolMessages(messages: readonly AgentMessage[]): {
	danglingCalls: string[];
	orphanResults: string[];
} {
	const declared = new Set<string>();
	const resolved = new Set<string>();
	for (const message of messages) {
		if (message.role === "assistant") {
			for (const block of message.content) {
				if (block.type === "toolCall") declared.add(block.id);
			}
		} else if (message.role === "toolResult") {
			resolved.add(message.toolCallId);
		}
	}
	return {
		danglingCalls: [...declared].filter(id => !resolved.has(id)),
		orphanResults: [...resolved].filter(id => !declared.has(id)),
	};
}

/** Everything compaction keeps verbatim — the region a provider will accept as-is. */
function keptRegion(preparation: { recentMessages: AgentMessage[] }): AgentMessage[] {
	return preparation.recentMessages;
}

describe("compaction accounting of failed assistant turns", () => {
	test("a failed turn's partial text does not consume the keep budget", () => {
		// Given a settled transcript, plus a newest turn that failed after
		// streaming a large partial answer the provider never accepted
		const settled = [
			userEntry("please summarize ".repeat(200)),
			assistantEntry("old answer"),
			userEntry("and now?"),
			assistantEntry("recent answer"),
		];
		const failedTurn = assistantEntry("PARTIAL".repeat(4000), "error");
		const settings = { ...DEFAULT_COMPACTION_SETTINGS, keepRecentTokens: 200 };

		// When compaction runs over the transcript with and without that turn
		const withFailedTurn = prepareCompaction([...settled, failedTurn], settings);
		const withoutFailedTurn = prepareCompaction(settled, settings);

		// Then storing the failed turn changes nothing about the cut — its text is
		// never charged against `keepRecentTokens`, so the budget spent on real
		// history is the same whether or not the dead turn is present
		expect(withFailedTurn).toBeDefined();
		expect(withoutFailedTurn).toBeDefined();
		expect(withFailedTurn?.firstKeptEntryId).toBe(withoutFailedTurn?.firstKeptEntryId);
		expect(withFailedTurn?.recentEntryIds).toEqual(withoutFailedTurn?.recentEntryIds);
		expect(withFailedTurn?.messagesToSummarize).toEqual(withoutFailedTurn?.messagesToSummarize);
		expect(withFailedTurn?.turnPrefixMessages).toEqual(withoutFailedTurn?.turnPrefixMessages);
		expect(withFailedTurn?.recentMessages).toEqual(withoutFailedTurn?.recentMessages);
	});

	test("an aborted turn is dropped the same way an errored one is", () => {
		// Given the same dead turn terminated by abort rather than error
		const settled = [
			userEntry("please summarize ".repeat(200)),
			assistantEntry("old answer"),
			userEntry("and now?"),
			assistantEntry("recent answer"),
		];
		const abortedTurn = assistantEntry("PARTIAL".repeat(4000), "aborted");
		const settings = { ...DEFAULT_COMPACTION_SETTINGS, keepRecentTokens: 200 };

		// When compaction runs with and without it
		const withAbortedTurn = prepareCompaction([...settled, abortedTurn], settings);
		const withoutAbortedTurn = prepareCompaction(settled, settings);

		// Then it is accounted for exactly like the errored case — a user who
		// interrupts a turn sees the same budget as one who never started it
		expect(withAbortedTurn?.firstKeptEntryId).toBe(withoutAbortedTurn?.firstKeptEntryId);
		expect(withAbortedTurn?.recentMessages).toEqual(withoutAbortedTurn?.recentMessages);
	});

	test("stop, length and toolUse turns with their results all survive", () => {
		// Given a transcript whose turns completed normally, one truncated by the
		// output limit (not a failure), and one whose tool call was answered
		const entries = [
			userEntry("please summarize ".repeat(200)),
			assistantEntry("old answer"),
			userEntry("and now?"),
			toolCallEntry("call-kept"),
			toolResultEntry("call-kept", "search output"),
			assistantEntry("truncated but valid"),
			userEntry("last question"),
			assistantEntry("last answer"),
		];
		const settings = { ...DEFAULT_COMPACTION_SETTINGS, keepRecentTokens: 200 };

		// When compaction runs
		const preparation = prepareCompaction(entries, settings);

		// Then every one of those messages is still accounted for — an over-eager
		// filter that reached past error/aborted would silently delete real history
		const accounted = [
			...preparation!.messagesToSummarize,
			...preparation!.turnPrefixMessages,
			...keptRegion(preparation!),
		];
		for (const entry of entries) {
			expect(accounted).toContain(entry.message);
		}
	});

	test("a failed turn's tool result is dropped with it, never orphaned", () => {
		// Given a turn that failed after emitting a tool call and receiving its
		// result — the shape that strands a result with no preceding tool_use
		const entries = [
			userEntry("please summarize ".repeat(200)),
			assistantEntry("old answer"),
			userEntry("and now?"),
			toolCallEntry("call-dead", "error"),
			toolResultEntry("call-dead", "half-written output"),
			userEntry("carry on"),
			assistantEntry("recovered answer"),
		];
		const settings = { ...DEFAULT_COMPACTION_SETTINGS, keepRecentTokens: 200 };

		// When compaction runs
		const preparation = prepareCompaction(entries, settings);

		// Then neither half of the dead pair survives, in either direction, so the
		// retained request carries no tool_result a provider would reject
		const accounted = [
			...preparation!.messagesToSummarize,
			...preparation!.turnPrefixMessages,
			...keptRegion(preparation!),
		];
		const pairs = unpairedToolMessages(accounted);
		expect(pairs.orphanResults).toEqual([]);
		expect(pairs.danglingCalls).toEqual([]);
		expect(accounted).not.toContain(entries[3].message);
		expect(accounted).not.toContain(entries[4].message);
	});

	test("kept entry ids stay parallel to the messages they produced", () => {
		// Given a transcript where compaction actually drops messages, so the two
		// parallel arrays have to be filtered together to stay aligned
		const entries = [
			userEntry("please summarize ".repeat(200)),
			assistantEntry("old answer"),
			userEntry("and now?"),
			toolCallEntry("call-dead", "error"),
			toolResultEntry("call-dead", "half-written output"),
			userEntry("carry on"),
			assistantEntry("recovered answer"),
		];
		const settings = { ...DEFAULT_COMPACTION_SETTINGS, keepRecentTokens: 200 };
		const messageByEntryId = new Map(entries.filter(isMessageEntry).map(entry => [entry.id, entry.message]));

		// When compaction runs
		const preparation = prepareCompaction(entries, settings)!;

		// Then every kept entry id names the very message kept beside it — a filter
		// applied to only one of the pair shifts every index after the first drop,
		// so the keep-tail boundary would name entries the retained messages never
		// came from (the ratio below it is mis-scaled too, silently)
		const keptIds = preparation.recentEntryIds ?? [];
		expect(keptIds.length).toBe(preparation.recentMessages.length);
		for (const [index, entryId] of keptIds.entries()) {
			expect(messageByEntryId.get(entryId)).toBe(preparation.recentMessages[index]);
		}
	});
});

describe("dropFailedAssistantTurns", () => {
	test("a tool result survives when a kept assistant re-declared the same id", () => {
		// Given a history where a dead turn declared `call-shared`, a live turn
		// re-declared that same id, and the result belongs to the live call
		const deadToolCall = toolCallEntry("call-shared", "error").message;
		const liveToolCall = toolCallEntry("call-shared").message;
		const sharedResult = toolResultEntry("call-shared", "live output").message;
		const history: AgentMessage[] = [
			userEntry("retry").message,
			deadToolCall,
			liveToolCall,
			sharedResult,
			userEntry("thanks").message,
		];

		// When the failed turns are dropped
		const retained = dropFailedAssistantTurns(history);

		// Then the result stays attached to the surviving tool_use — dropping it
		// alongside the dead turn that also named the id would leave the live call
		// with no result, the exact orphan shape providers reject
		expect(retained).toEqual([userEntry("retry").message, liveToolCall, sharedResult, userEntry("thanks").message]);
		expect(unpairedToolMessages(retained)).toEqual({ danglingCalls: [], orphanResults: [] });
	});

	test("a tool result declared only by the failed turn is dropped with it", () => {
		// Given a history whose dead turn is the only declarer of `call-dead`
		const deadToolCall = toolCallEntry("call-dead", "error").message;
		const deadResult = toolResultEntry("call-dead", "dead output").message;
		const liveToolCall = toolCallEntry("call-live").message;
		const history: AgentMessage[] = [
			userEntry("go").message,
			deadToolCall,
			deadResult,
			liveToolCall,
			toolResultEntry("call-live", "live output").message,
			userEntry("thanks").message,
		];

		// When the failed turns are dropped
		const retained = dropFailedAssistantTurns(history);

		// Then both halves of the exclusively-dead pair go, and the untouched live
		// pair survives intact alongside them
		expect(retained).toEqual([
			userEntry("go").message,
			liveToolCall,
			toolResultEntry("call-live", "live output").message,
			userEntry("thanks").message,
		]);
		expect(unpairedToolMessages(retained)).toEqual({ danglingCalls: [], orphanResults: [] });
	});
});
