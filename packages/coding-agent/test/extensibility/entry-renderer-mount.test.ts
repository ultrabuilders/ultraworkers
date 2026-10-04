import { beforeAll, describe, expect, it } from "bun:test";
import { Text } from "@oh-my-pi/pi-tui";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { CustomEntryComponent } from "@oh-my-pi/pi-coding-agent/modes/components/custom-entry";
import {
	mountCustomEntry,
	type CustomEntryMountContext,
} from "@oh-my-pi/pi-coding-agent/modes/utils/mount-custom-entry";
import type { CustomEntry } from "@oh-my-pi/pi-coding-agent/session/session-entries";

// The failure branch of `CustomEntryComponent` builds its error frame with `theme.fg`, so
// without this the renderer-throws case fails on an uninitialized theme rather than on the
// behaviour it is meant to cover — the one path worth covering would be the one that
// reports nothing.
beforeAll(() => {
	initTheme();
});

/**
 * An extension that calls `registerEntryRenderer` and `appendEntry` is the parity path
 * `pi` supports and this tree did not: `appendEntry` existed as an API and nothing ever
 * drew what it appended. `CustomEntryComponent` + `mountCustomEntry` are that missing
 * somewhere.
 *
 * What a user observes is the transcript, so that is what these assert — not that a map
 * contains a key. The contract worth defending is the third-party boundary: a renderer is
 * somebody else's code running inside our render loop, so a renderer that returns nothing
 * or throws must leave the transcript intact rather than take it down.
 */
function makeEntry(customType: string, data: unknown = { note: "hello" }): CustomEntry {
	return {
		id: "entry-1",
		parentId: null,
		timestamp: "2026-01-01T00:00:00.000Z",
		type: "custom",
		customType,
		data,
	};
}

/** Minimal stand-in for the chat container — records what was mounted and in what order. */
function makeContext(
	renderer: unknown,
	streamingComponent?: unknown,
): {
	ctx: CustomEntryMountContext;
	children: unknown[];
	renders: () => number;
} {
	const children: unknown[] = [];
	let renders = 0;
	const ctx: CustomEntryMountContext = {
		viewSession: { extensionRunner: { getEntryRenderer: () => renderer } },
		chatContainer: {
			children,
			addChild: (component: unknown) => {
				children.push(component);
			},
		},
		ui: {
			requestRender: () => {
				renders++;
			},
		},
		toolOutputExpanded: false,
		streamingComponent,
	};
	// A getter, not a copied number: returning `renders` by value would freeze it at 0 and
	// the assertion below would pass without ever observing a render.
	return { ctx, children, renders: () => renders };
}

describe("custom entry rendering", () => {
	it("mounts what the registered renderer returns, for the entry's own customType", () => {
		// The renderer is what an extension outside this repo writes, so it is exercised
		// through the public signature rather than through a component.
		const seen: string[] = [];
		const renderer = (entry: CustomEntry) => {
			seen.push(entry.customType);
			return new Text(`drew ${entry.customType}`);
		};

		const { ctx, children, renders } = makeContext(renderer);
		mountCustomEntry(ctx, makeEntry("deploy-log"));

		// The renderer ran for THIS entry, and what it produced reached the transcript.
		expect(seen).toEqual(["deploy-log"]);
		expect(children).toHaveLength(1);
		expect(renders()).toBe(1);
	});

	it("keeps a renderer that throws from taking the transcript down", () => {
		const renderer = () => {
			throw new Error("extension bug");
		};

		const { ctx, children } = makeContext(renderer);

		// The failure is shown in place, named by customType so the author can tell which
		// of their renderers broke without reading a stack from our internals.
		expect(() => mountCustomEntry(ctx, makeEntry("broken"))).not.toThrow();
		expect(children).toHaveLength(1);
		expect((children[0] as CustomEntryComponent).hasContent()).toBe(true);
	});

	it("adds nothing when the renderer yields nothing", () => {
		const { ctx, children } = makeContext(() => undefined);

		mountCustomEntry(ctx, makeEntry("silent"));

		// A no-op renderer must not leave an empty frame that still forces a render.
		expect(children).toHaveLength(0);
	});

	it("adds nothing when no renderer is registered for the entry's customType", () => {
		const { ctx, children } = makeContext(undefined);

		mountCustomEntry(ctx, makeEntry("unregistered"));

		expect(children).toHaveLength(0);
	});
});
