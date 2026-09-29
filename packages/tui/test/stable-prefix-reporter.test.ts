import { describe, expect, it } from "bun:test";
import { clearRenderCache, Markdown } from "@oh-my-pi/pi-tui/components/markdown";
import { stablePrefixRowsOf } from "@oh-my-pi/pi-tui/tui";
import { defaultMarkdownTheme } from "./test-themes.js";

// Contract: a component that mutates its returned array in place reports
// `stablePrefixRows` — how many leading rows can no longer change — so the engine
// re-renders from the first changed row instead of from row 0.
//
// What a consumer observes if this regresses: a streamed assistant message
// repaints its whole prefix every delta. That is invisible in output — the rows
// are byte-identical either way — so this test has to assert the SKIP itself.
// Asserting the rendered text would pass with the reporter deleted.
//
// The reporter also has to be unclaimable when the premise is absent. Reporting a
// prefix longer than the array, or a negative one, would let the engine skip rows
// that can still change, and the transcript would show text rewritten underneath
// the reader.

const THEME = defaultMarkdownTheme;
const WIDTH = 60;

describe("stablePrefixRowsOf", () => {
	it("returns null for a component that does not report one", () => {
		// The common case: most components return a fresh array, so the engine
		// must fall back to re-rendering from row 0 rather than trust a missing
		// reporter. Claiming 0 here would silently disable the skip for every
		// non-streaming component.
		expect(stablePrefixRowsOf({ render: () => [] })).toBeNull();
	});

	it("returns null for a prefix that is not a row count at all", () => {
		// A reporter is an optimisation, never a correctness input. A value that is
		// not a row boundary must be ignored rather than trusted: -1 would skip
		// from before the start, and 1.5 is not a row.
		const bad = [{}, { stablePrefixRows: -1 }, { stablePrefixRows: 1.5 }];
		for (const c of bad) {
			expect(stablePrefixRowsOf({ render: () => [], ...c } as never)).toBeNull();
		}
	});

	it("clamps a prefix longer than the render it describes", () => {
		// A reporter claiming more rows than exist would have the caller skip past
		// the end, so text appended later is dropped instead of revealed. Clamping
		// to the render is exactly "skip nothing" — the safe degradation.
		const greedy = { render: () => [], stablePrefixRows: 1e9 };
		expect(stablePrefixRowsOf(greedy as never, 5)).toBe(5);
		expect(stablePrefixRowsOf(greedy as never, 0)).toBe(0);
	});

	it("returns the reported count for a well-formed reporter", () => {
		expect(stablePrefixRowsOf({ render: () => [], stablePrefixRows: 4 } as never)).toBe(4);
		expect(stablePrefixRowsOf({ render: () => [], stablePrefixRows: 0 } as never)).toBe(0);
	});
});

describe("Markdown reports its frozen prefix", () => {
	it("claims nothing before any prefix is frozen", () => {
		// A single unfinished paragraph has no block boundary, so nothing is
		// settled. Reporting anything here would let the engine skip a row that
		// the next delta still rewrites — the text would visibly change under a
		// row the engine already considered final.
		clearRenderCache();
		const md = new Markdown("a paragraph with no blank line yet", 0, 0, THEME);
		md.transientRenderCache = true;
		md.render(WIDTH);
		expect(md.stablePrefixRows).toBe(0);
		expect(stablePrefixRowsOf(md)).toBe(0);
		clearRenderCache();
	});

	it("claims the leading rows once a block boundary is frozen", () => {
		// Two complete paragraphs then an open one. The blank-line boundaries
		// freeze the first two; the tail can still grow, so the reported count
		// must be less than the total row count.
		clearRenderCache();
		const md = new Markdown("first para\n\nsecond para\n\nthird para still", 0, 0, THEME);
		md.transientRenderCache = true;
		const rows = md.render(WIDTH);
		const claimed = md.stablePrefixRows;
		clearRenderCache();

		expect(claimed).toBeGreaterThan(0);
		expect(claimed).toBeLessThan(rows.length);
	});

	it("never claims more rows than it returned", () => {
		// The invariant that makes the reporter safe: a prefix longer than the
		// array would have the engine skip rows that do not exist yet, so text
		// appended later would be dropped instead of revealed.
		clearRenderCache();
		const md = new Markdown("alpha\n\nbeta\n\ngamma\n\ndelta", 0, 0, THEME);
		md.transientRenderCache = true;
		const rows = md.render(WIDTH);
		expect(md.stablePrefixRows).toBeLessThanOrEqual(rows.length);
		clearRenderCache();
	});

	it("agrees with the source prefix the transcript already publishes", () => {
		// `getLastRenderStableText` is what assistant-message.ts consumes to decide
		// which bytes are settled. If the two disagreed, the engine would repaint
		// rows the transcript had already published as final — the regression this
		// reporter is meant to make impossible. They derive from one source, and
		// this is the check that they keep doing so.
		clearRenderCache();
		const md = new Markdown("one\n\ntwo\n\nthree partial", 0, 0, THEME);
		md.transientRenderCache = true;
		md.render(WIDTH);
		const hasSource = md.getLastRenderStableText().length > 0;
		expect(md.stablePrefixRows > 0).toBe(hasSource);
		clearRenderCache();
	});

	it("claims nothing outside streaming", () => {
		// Outside transient mode nothing is being appended, so the whole array is
		// the render: there is no prefix to skip, and claiming one would be a lie
		// about rows that are all final-but-unclaimed.
		clearRenderCache();
		const md = new Markdown("alpha\n\nbeta", 0, 0, THEME);
		md.render(WIDTH);
		expect(md.stablePrefixRows).toBe(0);
		clearRenderCache();
	});
});
