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
import type { ScrollRangeAnchor } from "../components/scroll-view";
import { getKeybindings } from "../keybindings";
import { formatKeyHints } from "../key-hint-format";
import { theme } from "../theme/theme";
import type { Component, Focusable } from "../tui";
import { sliceByColumn, truncateToWidth, visibleWidth } from "../utils";
import { ChatTranscriptBuilder, type ChatTranscriptBuilderDeps } from "../chat/chat-transcript-builder";
import {
	TranscriptBrowser,
	type TranscriptBrowserFrame,
	type TranscriptBrowserRenderContext,
} from "../chat/transcript-browser";
import {
	getTranscriptSearchMatchKey,
	TranscriptSearchIndex,
	type TranscriptSearchMatch,
} from "../chat/transcript-search-index";

/** Construction options for {@link TranscriptSearchOverlay}. */
export interface TranscriptSearchOverlayOptions {
	/** Whole branch to rebuild, not just its recent tail. */
	entries: Parameters<ChatTranscriptBuilder["rebuild"]>[0];
	builder: ChatTranscriptBuilderDeps;
	getHeight: () => number;
	onClose: () => void;
}

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

	/** The query currently typed in the bar. */
	getQuery(): string {
		return this.#input.getValue();
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

/**
 * Fullscreen transcript search.
 *
 * Owns a whole-branch {@link ChatTranscriptBuilder} rather than the recent tail a
 * copy selector uses by default: a search box that cannot see the rest of the
 * session is not a search box.
 *
 * The line buffer is built by flattening `container.children` — calling
 * `child.render(contentWidth)` per child and concatenating. That is the same
 * contract `OutlineRowCache` already depends on, where a child returns the very
 * same array when its rows have not changed.
 *
 * Deliberately NOT `TranscriptBrowser.renderOutlineRows` / `stripPromptZones`:
 * those cut prompt zones and shift columns, and the whole match mapping depends
 * on the columns being the real ones.
 */
export class TranscriptSearchOverlay implements Component, Focusable {
	readonly #builder: ChatTranscriptBuilder;
	readonly #index = new TranscriptSearchIndex();
	readonly #browser: TranscriptBrowser;
	readonly #bar: TranscriptSearchComponent;
	readonly #onClose: () => void;

	#matches: TranscriptSearchMatch[] = [];
	#matchIndex = -1;
	#dirty = true;
	#pointerRow = -1;
	#pointerColumn = -1;

	constructor(options: TranscriptSearchOverlayOptions) {
		this.#builder = new ChatTranscriptBuilder(options.builder);
		this.#builder.rebuild(options.entries);
		this.#onClose = options.onClose;

		this.#bar = new TranscriptSearchComponent(
			() => this.#onQueryChange(),
			(text, hovered) => theme.fg(hovered ? "accent" : "dim", text),
		);
		this.#browser = new TranscriptBrowser({
			getHeight: () => options.getHeight() - 3,
			frame: context => this.#frame(context),
		});
	}

	/** Flat rendered lines for the whole branch, in transcript order. */
	#lines(contentWidth: number): readonly string[] {
		const lines: string[] = [];
		for (const child of this.#builder.container.children) {
			lines.push(...child.render(Math.max(1, contentWidth)));
		}
		return lines;
	}

	/**
	 * Highlight on a COPY of the lines.
	 *
	 * The index is built from the plain lines — `buildSearchCorpus` strips escapes
	 * anyway, so indexing styled text would only cost time — and the copy is what
	 * gets highlighted, leaving the builder's own rows untouched for the next frame.
	 */
	#frame(context: TranscriptBrowserRenderContext): TranscriptBrowserFrame {
		const lines = this.#lines(context.contentWidth);
		if (this.#dirty) {
			const result = this.#index.search(lines, this.#bar.getQuery());
			if (result.changed) {
				this.#matches = result.matches;
				this.#matchIndex = this.#matches.length > 0 ? 0 : -1;
			}
			this.#dirty = false;
		}
		this.#bar.setResult(this.#matchIndex, this.#matches.length);

		return {
			header: [],
			body: { lines: this.#highlight(lines), anchor: this.#anchor() },
			footer: this.#bar.render(context.chromeWidth) as string[],
		};
	}

	#highlight(lines: readonly string[]): readonly string[] {
		if (this.#matches.length === 0) return lines;
		return lines.map((line, row) => {
			const spans: Array<{ startCol: number; endCol: number; current: boolean }> = [];
			for (const [matchIndex, match] of this.#matches.entries()) {
				for (const segment of match.segments) {
					if (segment.row !== row) continue;
					spans.push({
						startCol: segment.startCol,
						endCol: segment.endCol,
						current: matchIndex === this.#matchIndex,
					});
				}
			}
			if (spans.length === 0) return line;

			// Columns are display columns and the line is raw, so they cannot index it
			// directly. `sliceByColumn` is the central helper for exactly this and
			// already handles escapes and wide glyphs; it takes a LENGTH, not an end
			// column.
			spans.sort((a, b) => a.startCol - b.startCol);
			let out = "";
			let column = 0;
			for (const span of spans) {
				const start = Math.max(column, span.startCol);
				const end = Math.max(start, span.endCol);
				out += sliceByColumn(line, column, start - column);
				const text = sliceByColumn(line, start, end - start);
				// A match split across two style runs keeps the escapes between them:
				// `"need\x1b[0m\x1b[31mle"` is correct output, not a leak.
				out += span.current ? theme.fg("accent", text) : text;
				column = end;
			}
			return out + sliceByColumn(line, column, Number.MAX_SAFE_INTEGER);
		});
	}

	/**
	 * Anchor that pulls the current match into view.
	 *
	 * `mode: "once"` is the load-bearing part: the browser reveals the range and
	 * stops following it, which is right for a row the user navigated to. A
	 * default-mode anchor would keep yanking the viewport back on every resize,
	 * so scrolling away from the current match would not stick.
	 *
	 * The `id` changes with the match, so consecutive navigations re-reveal rather
	 * than being treated as the same unchanged range.
	 */
	#anchor(): ScrollRangeAnchor | undefined {
		const match = this.#matches[this.#matchIndex];
		const first = match?.segments[0];
		if (!first) return undefined;
		return {
			id: `transcript-search:${this.#matchIndex}:${getTranscriptSearchMatchKey(match)}`,
			start: first.row,
			end: first.row,
			alignment: "center",
			mode: "once",
		};
	}

	#onQueryChange(): void {
		this.#dirty = true;
	}

	#step(delta: number): void {
		if (this.#matches.length === 0) return;
		this.#matchIndex = (this.#matchIndex + delta + this.#matches.length) % this.#matches.length;
		this.#bar.setResult(this.#matchIndex, this.#matches.length);
	}

	/** Query text currently in the bar. */
	getQuery(): string {
		return this.#bar.getQuery();
	}

	get focused(): boolean {
		return this.#bar.focused;
	}

	set focused(value: boolean) {
		this.#bar.focused = value;
	}

	handleInput(data: string): void {
		// The bar owns the query field, so typing goes there first; it reports a
		// change through its callback, which is what marks the frame dirty.
		this.#bar.handleInput(data);
		if (this.#dirty) return;
		// With no query being typed, the keys mean navigation.
		if (this.#browser.handleScrollKey(data)) return;
		if (data === "down" || data === "up") {
			this.#step(data === "down" ? 1 : -1);
		} else if (data === "escape") {
			this.#onClose();
		}
	}

	/** Where a click landed, so the host can route clicks on the nav arrows. */
	setPointer(row: number, column: number): void {
		this.#pointerRow = row;
		this.#pointerColumn = column;
	}

	/** Direction the hovered nav arrow points, for the host to style the cursor. */
	getHoveredNavigationDirection(): -1 | 1 | undefined {
		return this.#bar.getNavigationDirectionAt(this.#pointerRow, this.#pointerColumn);
	}

	navigate(direction: -1 | 1): void {
		this.#step(direction);
	}

	invalidate(): void {
		this.#bar.invalidate();
		this.#builder.container.invalidate();
		this.#browser.invalidate();
	}

	render(width: number): readonly string[] {
		return this.#browser.render(width);
	}

	dispose(): void {
		this.#builder.dispose();
	}
}
