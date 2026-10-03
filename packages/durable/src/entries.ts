import type { JsonValue } from "@ultraworkers/chord";
import type { Entry, EntryRecord, TypedEntry } from "./types";

/** Define a typed entry kind whose `is()` guard narrows by `EntryRecord.kind`. */
export function defineEntry<D extends JsonValue = never>(kind: string): Entry<D> {
	if (typeof kind !== "string" || kind.length === 0) throw new TypeError("Entry kind must be a non-empty string");
	return {
		kind,
		is: (entry: EntryRecord | undefined): entry is TypedEntry<D> => entry !== undefined && entry.kind === kind,
	};
}

/** User input: `model` is `[UserMessage]`. Written by submissions. */
export const UserEntry = defineEntry("pi.user");
/** Provider result with any stop reason: `model` is `[AssistantMessage]`. Written by generation. */
export const AssistantEntry = defineEntry("pi.assistant");
/**
 * Named prompt sections carried by a `pi.system` entry. `null` removes a section; re-adding one
 * appends it. This is durable's own bookkeeping — it exists so a later section can be patched
 * without rewriting the ones that did not change — and it lives on the entry rather than on the
 * message precisely because of that. The message carries rendered text for the provider.
 */
export type SystemSections = Record<string, string | null>;

/** Positional prompt and tool change: `data` is the section patch, `model` is `[DeveloperMessage]`. */
export const SystemEntry = defineEntry<SystemSections>("pi.system");
/** Tool result: `model` is `[ToolResultMessage]`. Written by tool tasks. */
export const ToolResultEntry = defineEntry("pi.tool-result");
