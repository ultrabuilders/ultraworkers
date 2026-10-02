import { CustomEntryComponent } from "../components/custom-entry";
import type { CustomEntry } from "../../session/session-entries";

/**
 * The slice of the interactive context a custom entry needs to be drawn.
 *
 * Structural rather than the full `InteractiveModeContext`, so both the live event
 * path (`EventController`) and the replay path (`UiHelpers`) can supply it without
 * one importing the other.
 */
export interface CustomEntryMountContext {
	viewSession: { extensionRunner?: { getEntryRenderer(customType: string): unknown } | undefined };
	chatContainer: { children: unknown[]; addChild(component: unknown): void };
	ui: { requestRender(): void };
	toolOutputExpanded: boolean;
	streamingComponent?: unknown;
}

/**
 * Mount the component a registered `EntryRenderer` returns for one custom entry.
 *
 * One function for both draw paths, deliberately. `pi` reaches this same body from
 * two call sites — the live `entry_appended` event and the transcript replay
 * (`interactive-mode.ts:3343` and `:3888`) — and they exist here too. Two copies
 * would let them drift: one could gain a placement rule or an expanded-state
 * check the other lacks, and the drift would only show up on whichever path a test
 * happened not to exercise.
 *
 * Ported from `pi`'s `addCustomEntryToChat` (`interactive-mode.ts:3739`).
 */
export function mountCustomEntry(ctx: CustomEntryMountContext, entry: CustomEntry): void {
	const renderer = ctx.viewSession.extensionRunner?.getEntryRenderer(entry.customType) as
		| ((...args: never[]) => unknown)
		| undefined;
	if (!renderer) return;

	const component = new CustomEntryComponent(entry, renderer as never);
	component.setExpanded(ctx.toolOutputExpanded);
	if (!component.hasContent()) return;

	// Splice above the streaming component so an entry that lands mid-turn is not
	// buried under the block that is still being written.
	const streaming = ctx.streamingComponent;
	if (streaming) {
		const index = ctx.chatContainer.children.indexOf(streaming);
		if (index >= 0) {
			ctx.chatContainer.children.splice(index, 0, component);
			ctx.ui.requestRender();
			return;
		}
	}
	ctx.chatContainer.addChild(component);
	ctx.ui.requestRender();
}

/**
 * Group a transcript's display items by how many messages precede each entry.
 *
 * The replay loop indexes `messages` and its parallel `cacheMissExplainedAt` by
 * position, so it cannot simply switch to walking `displayItems`. This turns the
 * ordered list into insertion points instead: a custom entry keyed `n` belongs
 * immediately before message `n`.
 */
export function customEntryInsertionPoints(displayItems: readonly unknown[]): Map<number, CustomEntry[]> {
	const byMessageIndex = new Map<number, CustomEntry[]>();
	let seenMessages = 0;
	for (const item of displayItems) {
		const entry = item as Partial<CustomEntry>;
		if (typeof entry === "object" && entry !== null && "customType" in entry) {
			const bucket = byMessageIndex.get(seenMessages);
			if (bucket) bucket.push(entry as CustomEntry);
			else byMessageIndex.set(seenMessages, [entry as CustomEntry]);
		} else {
			seenMessages++;
		}
	}
	return byMessageIndex;
}
