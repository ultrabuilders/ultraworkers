import { describe, expect, it } from "bun:test";
import { buildSessionContext, isTranscriptEntry } from "@oh-my-pi/pi-coding-agent/session/session-context";
import {
	APPROVAL_ENTRY_TYPE,
	type ApprovalEntry,
	type SessionEntry,
} from "@oh-my-pi/pi-coding-agent/session/session-entries";
import type { AgentMessage } from "@oh-my-pi/pi-agent-core";

/**
 * An approval audit entry must never reach the provider.
 *
 * There are TWO independent filters, and they are not the same filter. Conflating them is
 * the mistake this file is written to prevent, because a test aimed at the wrong one
 * passes while the boundary is open:
 *
 *   1. `isTranscriptEntry` (`session-context.ts:214`) — a positive allowlist,
 *      `message` or `custom_message`. Consumed by the selector controller, the annotate
 *      text source, and `getRestorableSessionModels`. It is NOT what builds the
 *      provider's message list.
 *   2. `appendMessage` inside `buildSessionContext` — its own inline chain, admitting
 *      `message`, `custom_message`, AND `branch_summary`. This is the actual boundary
 *      the provider sees.
 *
 * Measured: widening `isTranscriptEntry` to admit `approval` leaves every message-count
 * assertion in this file green, because `buildSessionContext` never calls it. So the two
 * halves below are deliberately aimed one at each, and the mutation that kills the first
 * half is not the mutation that kills the second.
 *
 * `denied` is called out on purpose. An `approved` half is the boring case: "you ran this
 * tool" is already implied by the tool call in the transcript. A `denied` half carries
 * `policyKey` — the rule that fired — and replaying that into a prompt tells the model
 * which policy keys exist and which one just stopped it, the shape of a
 * prompt-injection surface. Testing only `approved` would leave that half unexamined.
 *
 * Entries are threaded as a parent chain because that is how `buildSessionContext` walks:
 * it resolves the leaf and follows `parentId` to the root. Flat siblings with
 * `parentId: null` collapse to one message, which would make every count below pass for
 * the wrong reason.
 */

const TS = "2026-01-01T00:00:00.000Z";

function userMessage(id: string, parentId: string | null, content: string): SessionEntry {
	return {
		type: "message",
		id,
		parentId,
		timestamp: TS,
		message: { role: "user", content } as unknown as AgentMessage,
	};
}

function approvalHalf(
	id: string,
	parentId: string | null,
	decision: "approved" | "denied",
	phase: "asked" | "answered" = "answered",
): ApprovalEntry {
	return {
		type: APPROVAL_ENTRY_TYPE,
		id,
		parentId,
		timestamp: TS,
		requestId: "call-1",
		phase,
		// `policyKey` names the rule that decided — the field that must not leak.
		policyKey: "bash:dangerous",
		toolName: "bash",
		...(phase === "asked" ? {} : { decision }),
		source: "user",
	} as unknown as ApprovalEntry;
}

/** user → entry-under-test → user, the shape a real turn lays down. */
function contextThroughMiddle(entry: SessionEntry) {
	return buildSessionContext([userMessage("m-1", null, "run it"), entry, userMessage("m-2", entry.id, "ok")], "m-2");
}

describe("the transcript allowlist does not classify audit entries as messages", () => {
	it("rejects every phase and decision of an approval half", () => {
		expect(isTranscriptEntry(approvalHalf("e", null, "approved"))).toBe(false);
		expect(isTranscriptEntry(approvalHalf("e", null, "denied"))).toBe(false);
		expect(isTranscriptEntry(approvalHalf("e", null, "denied", "asked"))).toBe(false);
	});

	it("rejects the other non-message members of the union too", () => {
		// The allowlist is one predicate over the whole union, so any type that joins it
		// leaks the way `approval` would. Naming them turns "remember to extend the
		// filter" into a red test. A type added to the union belongs in this list.
		const base = { parentId: null, timestamp: TS };
		const others: Array<[string, SessionEntry]> = [
			["model_usage", { ...base, type: "model_usage", id: "e" } as SessionEntry],
			["model_change", { ...base, type: "model_change", id: "e" } as SessionEntry],
			["thinking_level_change", { ...base, type: "thinking_level_change", id: "e" } as SessionEntry],
			["service_tier_change", { ...base, type: "service_tier_change", id: "e" } as SessionEntry],
			["label", { ...base, type: "label", id: "e" } as SessionEntry],
			["mode_change", { ...base, type: "mode_change", id: "e" } as SessionEntry],
			["credential_pin", { ...base, type: "credential_pin", id: "e" } as SessionEntry],
			["custom", { ...base, type: "custom", id: "e" } as SessionEntry],
		];

		for (const [label, entry] of others) {
			expect(isTranscriptEntry(entry), `${label} must not be a transcript entry`).toBe(false);
		}
	});

	it("still admits the two types the allowlist exists to admit", () => {
		// Every row above would pass if `isTranscriptEntry` returned `false`
		// unconditionally. Pin the other direction so the allowlist cannot be "fixed" by
		// breaking it.
		expect(isTranscriptEntry(userMessage("m", null, "hi"))).toBe(true);
		expect(
			isTranscriptEntry({
				type: "custom_message",
				id: "c",
				parentId: null,
				timestamp: TS,
			} as unknown as SessionEntry),
		).toBe(true);
	});
});

describe("the provider's message list excludes audit entries", () => {
	it("keeps a denial out and leaves the two real turns intact", () => {
		const context = contextThroughMiddle(approvalHalf("e-deny", "m-1", "denied"));

		expect(context.messages).toHaveLength(2);
		// Not just a count: a leak that REPLACED a message would satisfy the count while
		// the transcript lost real content.
		const rendered = JSON.stringify(context.messages);
		expect(rendered).toContain("run it");
		expect(rendered).toContain("ok");
	});

	it("leaks neither the decision nor the policy key of a denial", () => {
		// The negative contract on the strings that would do damage. Counting messages
		// proves something was excluded; this proves the sensitive FIELDS are the
		// excluded part, which is what a widened `appendMessage` chain would drag in.
		const rendered = JSON.stringify(contextThroughMiddle(approvalHalf("e-deny", "m-1", "denied")).messages);

		expect(rendered).not.toContain("denied");
		expect(rendered).not.toContain("bash:dangerous");
		expect(rendered).not.toContain(APPROVAL_ENTRY_TYPE);
	});

	it("keeps a denied pair out while still keeping the two real messages", () => {
		// Both halves together, as a real denial writes them. If exclusion were
		// per-half, a full pair could still contribute one message and the counts above
		// would pass while the transcript grew.
		const asked = approvalHalf("e-ask", "m-1", "denied", "asked");
		const answered = approvalHalf("e-deny", "e-ask", "denied");
		const context = buildSessionContext(
			[userMessage("m-1", null, "run it"), asked, answered, userMessage("m-2", "e-deny", "ok")],
			"m-2",
		);

		expect(context.messages).toHaveLength(2);
		expect(JSON.stringify(context.messages)).not.toContain("bash:dangerous");
	});
});
