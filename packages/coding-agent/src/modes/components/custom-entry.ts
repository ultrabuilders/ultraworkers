/**
 * Draws a `custom` session entry with the renderer its extension registered.
 *
 * Ported from `pi` (`packages/coding-agent/src/modes/interactive/components/
 * custom-entry.ts`). The local tree had no equivalent: `appendEntry` existed as
 * an API and nothing ever drew what it appended, so a registered
 * `EntryRenderer` had nowhere to land. This is that somewhere.
 *
 * A renderer that returns `undefined`, or that throws, must not take the
 * transcript down with it — an extension is third-party code running inside the
 * host's render loop, so its failure is shown in place and the session
 * continues. That is the whole reason this is a component with a `rebuild`
 * rather than a direct call at the append site.
 */
import { Box, Container, type Component, Spacer, Text } from "@oh-my-pi/pi-tui";
import { theme } from "@oh-my-pi/pi-tui/theme";
import type { CustomEntry } from "@oh-my-pi/pi-coding-agent/session/session-entries";
import type { EntryRenderer } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

export class CustomEntryComponent extends Container {
	#entry: CustomEntry<unknown>;
	#renderer: EntryRenderer;
	#customComponent?: Component;
	#expanded = false;

	constructor(entry: CustomEntry<unknown>, renderer: EntryRenderer) {
		super();
		this.#entry = entry;
		this.#renderer = renderer;
		this.#rebuild();
	}

	/** Whether the renderer produced anything at all. */
	hasContent(): boolean {
		return this.#customComponent !== undefined;
	}

	setExpanded(expanded: boolean): void {
		if (this.#expanded !== expanded) {
			this.#expanded = expanded;
			this.#rebuild();
		}
	}

	override invalidate(): void {
		super.invalidate();
		this.#rebuild();
	}

	#rebuild(): void {
		this.clear();
		this.#customComponent = undefined;

		let component: Component | undefined;
		try {
			component = this.#renderer(this.#entry, { expanded: this.#expanded }, theme);
		} catch (error) {
			// Named by customType so the author can tell which of their renderers
			// failed without cross-referencing a stack trace in someone else's code.
			const message = error instanceof Error ? error.message : String(error);
			const box = new Box(1, 1, text => theme.bg("customMessageBg", text));
			box.addChild(new Text(theme.fg("error", `[${this.#entry.customType}] renderer failed: ${message}`), 0, 0));
			component = box;
		}

		if (!component) {
			return;
		}

		this.#customComponent = component;
		this.addChild(new Spacer(1));
		this.addChild(component);
	}
}
