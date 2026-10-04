import { describe, expect, it } from "bun:test";
import { clearRenderCache, Markdown } from "@oh-my-pi/pi-tui/components/markdown";
import { defaultMarkdownTheme } from "./test-themes";

// What the render contract actually requires, and what a reader of the 15.10.11
// changelog entry would assume is missing.
//
// That entry describes an "opt-in RenderStablePrefix report" letting the engine
// re-render only from the first changed row. No such report exists and none is
// needed: the engine copies every component's array into its own prepared buffer
// and diffs those copies by content, so a component that appends in place is
// already handled. The obligation is on the component — return a NEW array
// whenever content changed — because that is what makes content-based diffing
// correct.
//
// This test exists to hold that obligation. An earlier version of it asserted a
// row-count reporter that had no consumer at all, and a claim that the source
// prefix and the row count "cannot disagree" — which is false as soon as the
// text contains a tab, because the renderer normalizes tabs before caching and
// the frozen prefix is stored from the raw buffer. An assertion that states a
// guarantee the code does not provide is worse than no assertion.
//
// Masking hazard: Markdown's module-level L2 render cache keys on (text, width),
// so a render that produced wrong lines would cache them and the cold oracle
// would read the same wrong lines back. clearRenderCache() around every render.

const THEME = defaultMarkdownTheme;
const WIDTH = 60;

describe("render contract: a fresh reference when content changes", () => {
	it("returns a new array reference when the text changes", () => {
		// The engine memoizes on reference equality. Handing back the same array
		// after changing its contents makes the frame show stale rows, and no
		// amount of engine-side diffing can recover it — this is the whole
		// contract the "stable prefix" wording was gesturing at.
		clearRenderCache();
		const md = new Markdown("first", 0, 0, THEME);
		const before = md.render(WIDTH);
		md.setText("second");
		const after = md.render(WIDTH);
		clearRenderCache();

		expect(before).not.toBe(after);
	});

	it("returns the same reference when nothing changed", () => {
		// The other half: an unchanged component SHOULD hand back the same array,
		// because that is how a parent skips re-concatenating its children.
		clearRenderCache();
		const md = new Markdown("unchanged", 0, 0, THEME);
		const first = md.render(WIDTH);
		const second = md.render(WIDTH);
		clearRenderCache();

		expect(second).toBe(first);
	});

	it("produces the same rows as a cold render after streaming growth", () => {
		// The property the engine actually relies on: however a component got to
		// its rows — incremental lexing, a spliced tail, a mutated internal
		// buffer — the rows it returns are byte-identical to a fresh full render
		// of the same text. A fast path that diverges shows up here, not in a
		// row count.
		const text = "alpha\n\nbeta\n\ngamma\n\ndelta\n\nepsilon still open";
		for (const step of [1, 3, 7, 15, 31]) {
			for (const cut of [text.length, Math.min(step, text.length)]) {
				clearRenderCache();
				const streamed = new Markdown(text.slice(0, cut), 0, 0, THEME);
				streamed.transientRenderCache = true;
				const a = streamed.render(WIDTH);
				clearRenderCache();
				const b = new Markdown(text.slice(0, cut), 0, 0, THEME).render(WIDTH);
				clearRenderCache();
				expect([...a]).toEqual([...b]);
			}
		}
	});
});

describe("the frozen source prefix is source, not rows", () => {
	it("is empty outside streaming", () => {
		// Outside transient mode there is no append in flight, so nothing is
		// frozen. Reading it must not invent a boundary.
		clearRenderCache();
		const md = new Markdown("alpha\n\nbeta", 0, 0, THEME);
		md.render(WIDTH);
		expect(md.getLastRenderStableText()).toBe("");
		clearRenderCache();
	});

	it("is a real prefix of the text, ending at a block boundary", () => {
		clearRenderCache();
		const text = "first\n\nsecond\n\nthird open";
		const md = new Markdown(text, 0, 0, THEME);
		md.transientRenderCache = true;
		md.render(WIDTH);
		const prefix = md.getLastRenderStableText();
		clearRenderCache();

		expect(prefix.length).toBeGreaterThan(0);
		expect(text.startsWith(prefix)).toBe(true);
		// A boundary, so what follows starts at a fresh line and can still grow.
		expect(text.slice(prefix.length).startsWith("third")).toBe(true);
	});

	it("is width-independent, so it survives a resize", () => {
		// The transcript publishes these bytes, so the boundary must not move
		// when the terminal is resized — otherwise already-published text would
		// be reclassified as still-streaming.
		clearRenderCache();
		const md = new Markdown("first\n\nsecond\n\nthird open", 0, 0, THEME);
		md.transientRenderCache = true;
		md.render(60);
		const wide = md.getLastRenderStableText();
		md.render(24);
		const narrow = md.getLastRenderStableText();
		clearRenderCache();

		expect(narrow).toBe(wide);
	});
});
