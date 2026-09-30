// Ported VERBATIM from pi-ref packages/tui/src/alt-screen-search.ts (lines 197-327).
// Copied rather than rewritten: the search bar's layout, button hit-testing and
// key handling are the behaviour, and a hand-written version would drift from them.
//
// Adaptation, in full:
//   - `AltScreenSearchComponent` -> `TranscriptSearchComponent`, per the work item.
//   - `private` fields -> ES `#private`, per AGENTS.md.
//   - `Input`'s construction -> this repo's idiom. pi-ref's `Input` takes an
//     options object; this repo's takes none and exposes the same settings as
//     public fields, assigned after construction (`overlays/history-search.ts`).
//     It also has no `placeholderStyle` hook — the placeholder is a plain string
//     handed to the native input node, and the host dims it. So the dim wrapper
//     is dropped rather than reimplemented against a hook that does not exist.
//   - the result counter's raw `\x1b[2m` -> `theme.fg("dim", …)`, the repo idiom
//     for this. This was the only raw escape under `src/overlays/`, and going
//     through the theme is what makes the counter follow the user's colours.
//   - import specifiers are extensionless, per this repo's convention.
// The class body references no type from the index module, so it imports none.

import { Input } from "../components/input";
import { getKeybindings } from "../keybindings";
import { formatKeyHints } from "../key-hint-format";
import { theme } from "../theme/theme";
import type { Component, Focusable } from "../tui";
import { truncateToWidth, visibleWidth } from "../utils";

export class TranscriptSearchComponent implements Component, Focusable {
	readonly #input = Object.assign(new Input(), {
		prompt: " ",
		placeholder: "Find in transcript",
	});
	readonly #onQueryChange: (query: string) => void;
	readonly #navigationButtonStyle: (text: string, hovered: boolean) => string;
	#resultCount = 0;
	#resultIndex = -1;
	#previousButtonStart = -1;
	#previousButtonEnd = -1;
	#nextButtonStart = -1;
	#nextButtonEnd = -1;
	#hoveredNavigationDirection: -1 | 1 | undefined;
	#focused = false;

	constructor(
		onQueryChange: (query: string) => void,
		navigationButtonStyle: (text: string, hovered: boolean) => string = text => text,
	) {
		this.#onQueryChange = onQueryChange;
		this.#navigationButtonStyle = navigationButtonStyle;
	}

	get focused(): boolean {
		return this.#focused;
	}

	set focused(value: boolean) {
		this.#focused = value;
		this.#input.focused = value;
	}

	setResult(index: number, count: number): void {
		this.#resultIndex = index;
		this.#resultCount = count;
	}

	getNavigationDirectionAt(row: number, column: number): -1 | 1 | undefined {
		if (row !== 2) return undefined;
		if (column >= this.#previousButtonStart && column < this.#previousButtonEnd) return -1;
		if (column >= this.#nextButtonStart && column < this.#nextButtonEnd) return 1;
		return undefined;
	}

	setHoveredNavigationDirection(direction: -1 | 1 | undefined): boolean {
		if (direction === this.#hoveredNavigationDirection) return false;
		this.#hoveredNavigationDirection = direction;
		return true;
	}

	handleInput(data: string): void {
		const previous = this.#input.getValue();
		this.#input.handleInput(data);
		const query = this.#input.getValue();
		if (query !== previous) this.#onQueryChange(query);
	}

	invalidate(): void {
		this.#input.invalidate();
	}

	render(width: number): readonly string[] {
		const safeWidth = Math.max(1, width);
		const innerWidth = Math.max(0, safeWidth - 2);
		const keybindings = getKeybindings();
		const previousKey = formatKeyHints(keybindings.getKeys("tui.transcript.searchPrevious"));
		const nextKey = formatKeyHints(keybindings.getKeys("tui.transcript.searchNext"));
		const query = this.#input.getValue();
		const result = !query
			? ""
			: this.#resultCount === 0
				? "No matches"
				: `${this.#resultIndex + 1}/${this.#resultCount}`;
		const resultSpace = Math.max(0, innerWidth - 3);
		const visibleResult = truncateToWidth(result, resultSpace, "");
		const resultText = visibleResult ? theme.fg("dim", ` ${visibleResult} `) : "";
		const inputWidth = Math.max(0, innerWidth - visibleWidth(resultText));
		const inputLine = truncateToWidth(this.#input.render(Math.max(1, inputWidth))[0] ?? "", inputWidth, "");
		const inputPadding = " ".repeat(Math.max(0, inputWidth - visibleWidth(inputLine)));
		const content = `${inputLine}${inputPadding}${resultText}`;

		let previousButton = `↑ ${previousKey}`;
		let nextButton = `↓ ${nextKey}`;
		let separator = " · ";
		const outerGapWidth = 1;
		const availableControlsWidth = Math.max(0, innerWidth - outerGapWidth * 2 - 1);
		let controlsWidth = visibleWidth(previousButton) + visibleWidth(separator) + visibleWidth(nextButton);
		if (controlsWidth > availableControlsWidth) {
			previousButton = "↑";
			nextButton = "↓";
			separator = " ";
			controlsWidth = visibleWidth(previousButton) + visibleWidth(separator) + visibleWidth(nextButton);
		}
		const showButtons = controlsWidth <= availableControlsWidth;
		const renderedButtons = showButtons
			? this.#navigationButtonStyle(previousButton, this.#hoveredNavigationDirection === -1) +
				separator +
				this.#navigationButtonStyle(nextButton, this.#hoveredNavigationDirection === 1)
			: "";
		const outerGapsWidth = showButtons ? outerGapWidth * 2 : 0;
		const rightRuleWidth = renderedButtons && innerWidth > controlsWidth + outerGapsWidth ? 1 : 0;
		const leftRuleWidth = Math.max(
			0,
			innerWidth - (showButtons ? controlsWidth : 0) - outerGapsWidth - rightRuleWidth,
		);
		const previousStart = 1 + leftRuleWidth + outerGapWidth;
		this.#previousButtonStart = showButtons ? previousStart : -1;
		this.#previousButtonEnd = showButtons ? previousStart + visibleWidth(previousButton) : -1;
		this.#nextButtonStart = showButtons ? this.#previousButtonEnd + visibleWidth(separator) : -1;
		this.#nextButtonEnd = showButtons ? this.#nextButtonStart + visibleWidth(nextButton) : -1;

		if (safeWidth === 1) return ["┌", "│", "└"];
		return [
			`┌${"─".repeat(innerWidth)}┐`,
			`│${content}│`,
			`└${"─".repeat(leftRuleWidth)}${renderedButtons ? " " : ""}${renderedButtons}${renderedButtons ? " " : ""}${"─".repeat(rightRuleWidth)}┘`,
		];
	}
}
