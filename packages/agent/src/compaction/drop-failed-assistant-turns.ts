/**
 * Drop assistant turns that terminated in failure (`stopReason` "error" or
 * "aborted") from a message list, together with every tool result whose
 * `toolCallId` was declared ONLY by those dropped assistants. An id
 * re-declared by any kept assistant keeps its results. Order and every other
 * message are preserved.
 *
 * A failed turn is the provider's response to the previous request, never part
 * of one, so removing it keeps every earlier request a prefix of the next
 * (provider prompt caches survive) while preventing the replay of partial text
 * and unexecuted tool calls. `buildSessionContext()` already performs this drop
 * at the session-restore boundary; compaction must perform the same one so the
 * entry set it counts and cuts is the set the next request actually carries.
 *
 * The input is typed structurally so both the AI package `Message[]` and the
 * agent `AgentMessage[]` (a superset with extra custom roles) pass through the
 * same drop.
 *
 * Ported from senpi (`packages/ai/src/utils/drop-failed-assistant-turns.ts`,
 * MIT, Copyright (c) 2025 Mario Zechner (upstream pi-mono)); see W0 attribution.
 */
export function dropFailedAssistantTurns<T extends { role: string }>(messages: readonly T[]): T[] {
	const callIdsByKeptAssistants = new Set<string>();
	const callIdsByFailedAssistants = new Set<string>();
	for (const message of messages) {
		const assistant = asAssistantTurn(message);
		if (!assistant) continue;
		const declared = isFailedStop(assistant.stopReason) ? callIdsByFailedAssistants : callIdsByKeptAssistants;
		for (const block of assistant.content) {
			if (block.type === "toolCall" && typeof block.id === "string") declared.add(block.id);
		}
	}
	for (const id of callIdsByKeptAssistants) callIdsByFailedAssistants.delete(id);

	return messages.filter(message => {
		const assistant = asAssistantTurn(message);
		if (assistant) return !isFailedStop(assistant.stopReason);
		if (message.role === "toolResult" && "toolCallId" in message && typeof message.toolCallId === "string") {
			return !callIdsByFailedAssistants.has(message.toolCallId);
		}
		return true;
	});
}

function asAssistantTurn(message: {
	role: string;
}): { stopReason: unknown; content: readonly { type: string; id?: unknown }[] } | undefined {
	if (message.role !== "assistant") return undefined;
	if (!("content" in message) || !Array.isArray(message.content)) return undefined;
	return {
		stopReason: "stopReason" in message ? message.stopReason : undefined,
		content: message.content,
	};
}

function isFailedStop(stopReason: unknown): boolean {
	return stopReason === "error" || stopReason === "aborted";
}
