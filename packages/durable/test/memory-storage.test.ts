import { describe, expect, it } from "bun:test";
import { BACKGROUND_CONTEXT } from "@oh-my-pi/chord/context";
import { registerStorageConformance } from "@ultraworkers/pi-durable/testing";
import { idFromNumber, seqFromNumber } from "../src/ids";
import { MemoryStorage } from "../src/storage/memory";
import { type EntryId, ROOT_CONVERSATION_ID } from "../src/types";

registerStorageConformance({ describe, expect, it }, "MemoryStorage", use => use(new MemoryStorage()));

it("does not expose retained state through a prepared commit", async () => {
	const storage = new MemoryStorage();
	await storage.commit([{ type: "conversation", value: { id: ROOT_CONVERSATION_ID } }], BACKGROUND_CONTEXT);
	const entryId = idFromNumber<EntryId>(2);
	const prepared = storage.prepareCommit([
		{
			type: "entry",
			value: {
				id: entryId,
				conversationId: ROOT_CONVERSATION_ID,
				kind: "test",
				data: { nested: [1] },
			},
		},
	]);
	const exposed = prepared.writes[0];
	if (exposed.type !== "entry") throw new Error("Expected an entry write");
	expect(() => (exposed.value.data as { nested: number[] }).nested.push(2)).toThrow();

	expect(prepared.apply()).toBe(seqFromNumber(2));
	expect(prepared.apply()).toBe(seqFromNumber(2));
	expect((await storage.entry(entryId, BACKGROUND_CONTEXT))?.entry.data).toEqual({ nested: [1] });
});
