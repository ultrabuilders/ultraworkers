import type { Message } from "@oh-my-pi/pi-ai";
import { type EntryDraft, type EntryId, type EntryRecord, MemoryStorage } from "@ultraworkers/pi-durable";
import { describe, expect, it } from "bun:test";
import { assistant, describeMessage, openHarness, toolResult, user } from "./harness-support";
import { context } from "./session-support";

async function setup() {
	const { harness } = await openHarness(new MemoryStorage());
	const root = await harness.root(context);
	const append = (draft: EntryDraft): Promise<EntryRecord> =>
		root.commit(tx => tx.appendEntry(root.id, draft), context);
	const message = (model: Message, kind = "message"): Promise<EntryRecord> => append({ kind, model: [model] });
	/**
	 * This tree has no `SystemMessage`: `pi.system` entries carry their section patch in `data`
	 * and a `DeveloperMessage` in `model` (see `SystemEntry` in `src/entries.ts`), which is a
	 * deliberate fork from pi rather than a gap. So the section map pi puts on the message is
	 * written to `data` here, and the message is the rendered text the provider would receive.
	 */
	const systemEntry = (sections: Record<string, string | null>): Promise<EntryRecord> =>
		append({
			kind: "pi.system",
			data: sections,
			model: [{ role: "developer", content: Object.values(sections).filter(Boolean).join("\n"), timestamp: 4 }],
		});
	return { harness, root, append, message, systemEntry };
}

function ids(entries: readonly EntryRecord[]): EntryId[] {
	return entries.map(entry => entry.id);
}

describe("conversation context", () => {
	it("returns the whole transcript without a head and excludes model-less entries from messages", async () => {
		const { root, append, message } = await setup();
		const first = await message(user("hi"));
		const note = await append({ kind: "note", data: { text: "display only" } });
		const answer = await message(assistant("hello"));
		const view = await root.context(context);
		expect(view.head).toBeUndefined();
		expect(ids(view.entries)).toEqual([first.id, note.id, answer.id]);
		expect(view.messages.map(describeMessage)).toEqual(["user:hi", "assistant:hello"]);
	});

	it("excludes aborted, error, and deferred assistant messages but keeps their raw entries", async () => {
		const { root, message } = await setup();
		await message(user("q"));
		const aborted = await message(assistant("partial", { stopReason: "aborted" }));
		await message(assistant("failed", { stopReason: "error" }));
		await message(assistant("later", { stopReason: "deferred" }));
		await message(assistant("done", { stopReason: "length" }));
		const view = await root.context(context);
		expect(view.entries).toHaveLength(5);
		expect(view.entries[1]!.id).toBe(aborted.id);
		expect(view.messages.map(describeMessage)).toEqual(["user:q", "assistant:done"]);
	});

	it("resolves self heads and uses the newest head marker", async () => {
		const { root, append, message } = await setup();
		await message(user("old"));
		const reset = await append({ kind: "reset", head: "self", model: [user("fresh start")] });
		expect(reset.head).toBe(reset.id);
		const after = await message(assistant("after reset"));
		let view = await root.context(context);
		expect(view.head?.id).toBe(reset.id);
		expect(ids(view.entries)).toEqual([reset.id, after.id]);
		expect(view.messages.map(describeMessage)).toEqual(["user:fresh start", "assistant:after reset"]);

		// A collapse summary heads an earlier kept entry; older head markers in range drop out.
		const summary = await append({ kind: "summary", head: after.id, model: [user("summary")] });
		const tail = await message(user("next"));
		view = await root.context(context);
		expect(view.head?.id).toBe(summary.id);
		expect(ids(view.entries)).toEqual([summary.id, after.id, tail.id]);
		expect(view.messages.map(describeMessage)).toEqual(["user:summary", "assistant:after reset", "user:next"]);
	});

	it("applies the newest edit per target within the active range", async () => {
		const { root, append, message } = await setup();
		const first = await message(user("first"));
		const second = await message(user("second"));
		await append({ kind: "edit", edits: [{ target: first.id, action: "replace", messages: [user("first v2")] }] });
		await append({ kind: "edit", edits: [{ target: first.id, action: "replace", messages: [user("first v3")] }] });
		await append({ kind: "edit", edits: [{ target: second.id, action: "omit" }] });
		let view = await root.context(context);
		expect(view.entries).toHaveLength(5);
		expect(view.messages.map(describeMessage)).toEqual(["user:first v3"]);

		// Edits before the active range no longer apply.
		const reset = await append({ kind: "reset", head: second.id });
		view = await root.context(context);
		expect(view.head?.id).toBe(reset.id);
		expect(view.messages.map(describeMessage)).toEqual([]);
		await append({ kind: "edit", edits: [{ target: second.id, action: "replace", messages: [user("second v2")] }] });
		view = await root.context(context);
		expect(view.messages.map(describeMessage)).toEqual(["user:second v2"]);
	});

	it("keeps positional system messages and orders tool results by call order", async () => {
		const { root, message, systemEntry } = await setup();
		await systemEntry({ preamble: "You help." });
		await message(user("run tools"));
		await message(assistant("calling", { calls: ["b", "a"] }));
		await message(toolResult("a"));
		await systemEntry({ cwd: "/repo" });
		await message(toolResult("b"));
		await message(toolResult("zz"));
		await message(assistant("done"));
		const view = await root.context(context);
		// Positional order is the contract here: a `pi.system` entry holds its slot among the
		// messages around it, and tool results sort by CALL order rather than arrival (b was
		// returned before a). The `b` run the assistant asked for first is likewise dropped.
		//
		// The system entries are labelled by position rather than by section name. `pi` labels
		// them `system:<sections>`, which needs a `system` arm in `describeMessage` reading
		// `message.sections` — and `DeveloperMessage` has no such field on this fork, because
		// the section patch lives on the entry's `data` instead. Asserting the name would
		// assert a field this tree does not carry; the ordering it stood for is asserted here.
		expect(view.messages.map((message, index) => `${index}:${describeMessage(message)}`)).toEqual([
			"0:developer:You help.",
			"1:user:run tools",
			"2:assistant:calling",
			"3:result:b:result b",
			"4:result:a:result a",
			"5:developer:/repo",
			"6:assistant:done",
		]);
	});

	it("synthesizes missing tool results after a fork and drops results cut from their call", async () => {
		const { root, message } = await setup();
		await message(user("go"));
		const call = await message(assistant("calling", { calls: ["x", "y"] }));
		await message(toolResult("x"));
		const second = await message(toolResult("y"));
		const child = await root.fork(call.id, { ownership: { kind: "ownerless" } }, context);
		const childView = await child.context(context);
		expect(childView.messages.map(describeMessage)).toEqual([
			"user:go",
			"assistant:calling",
			"result:x:error",
			"result:y:error",
		]);
		const missing = childView.messages[2]!;
		expect(missing).toMatchObject({
			role: "toolResult",
			toolName: "tool-x",
			details: { reason: "missing_result" },
		});

		// A head between a call and its results leaves stray results that are not sent.
		await root.commit(tx => tx.appendEntry(root.id, { kind: "reset", head: second.id }), context);
		const parentView = await root.context(context);
		expect(parentView.messages.map(describeMessage)).toEqual([]);
		expect(parentView.entries.map(entry => entry.kind)).toEqual(["reset", "message"]);
	});
});
