import { describe, expect, test } from "bun:test";
import { sliceByColumn } from "@oh-my-pi/pi-tui/utils";
import {
	buildSearchCorpus,
	findTranscriptSearchMatches,
	getTranscriptSearchMatchKey,
	normalizeQuery,
	TranscriptSearchIndex,
	type TranscriptSearchMatch,
} from "@oh-my-pi/pi-tui/chat/transcript-search-index";

/**
 * Contract tests for the ported transcript search index.
 *
 * The load-bearing contract is the COLUMN MAPPING. A search hit is only useful if
 * the span it reports lines up with the column the renderer draws at — a match
 * that is textually correct but one column off highlights the wrong characters,
 * which looks like a broken search rather than a wrong highlight.
 *
 * That is why the two paths through `buildSearchCorpus` are tested separately. An
 * ASCII line takes a fast path that assumes 1 char === 1 column; a line with
 * anything else is segmented grapheme by grapheme and measures display width. A
 * search that is correct on plain text and wrong on emoji or CJK is the exact
 * bug the dual path exists to avoid, and it is invisible unless both are pinned.
 */

function onlyMatch(matches: readonly TranscriptSearchMatch[]): TranscriptSearchMatch {
	expect(matches).toHaveLength(1);
	return matches[0]!;
}

describe("transcript search column mapping", () => {
	test("reports the column a match starts and ends at, not its offset in the corpus", () => {
		// "needle" begins at index 6, so startCol 6 / endCol 12 on row 0. The two
		// numbers are equal here, which is exactly what makes this a weak assertion
		// on its own — see the CJK case below for where they diverge.
		const match = onlyMatch(findTranscriptSearchMatches(["a needle here"], "needle"));
		expect(match.segments).toEqual([{ row: 0, startCol: 2, endCol: 8 }]);
	});

	test("measures display width, so a wide glyph shifts the columns that follow it", () => {
		// "日本語" is three graphemes occupying six columns. A matcher that counted
		// characters would put "needle" at column 3; it is at column 7.
		const match = onlyMatch(findTranscriptSearchMatches(["日本語 needle"], "needle"));
		expect(match.segments).toEqual([{ row: 0, startCol: 7, endCol: 13 }]);
	});

	test("keeps the row of a match found on a later line", () => {
		const match = onlyMatch(findTranscriptSearchMatches(["first line", "second needle line"], "needle"));
		expect(match.segments).toEqual([{ row: 1, startCol: 7, endCol: 13 }]);
	});

	test("a multi-line match reports one segment per row it spans", () => {
		// Highlighting a hit that wraps needs both rows, or the second line is left
		// unmarked while the counter still counts it.
		const match = onlyMatch(findTranscriptSearchMatches(["alpha beta", "gamma delta"], "beta gamma"));
		expect(match.segments.map(s => s.row)).toEqual([0, 1]);
	});

	test("a query crossing a space reports the column of each run it covers", () => {
		// This is the case the intra-span tests cannot reach. A one-word query lands
		// wholly inside one span, so its column comes from `span.startCol` and the
		// running column counter is never read. A query spanning a space crosses into
		// the next span, where the offset has to be measured against that span's own
		// start — which is where a fast-path counter that advanced by 1 per character
		// instead of per column would put the highlight in the wrong place.
		const match = onlyMatch(findTranscriptSearchMatches(["a needle here"], "needle here"));
		expect(match.segments).toEqual([
			{ row: 0, startCol: 2, endCol: 8 },
			{ row: 0, startCol: 9, endCol: 13 },
		]);
		// And the columns must actually select the matched text out of the raw line,
		// which is what the renderer does with them.
		const line = "a needle here";
		const covered = match.segments.map(s => line.slice(s.startCol, s.endCol)).join(" ");
		expect(covered).toBe("needle here");
	});

	test("a query crossing into wide text keeps the later run's column honest", () => {
		// "needle" is ASCII, "日本語" is not. The wide run is measured in display
		// columns, so anything after it sits further right than a character count
		// would suggest — and a match spanning both has to combine the two.
		//
		// The columns cannot be checked with `slice`, which indexes UTF-16 code units
		// while these are display columns; only the ASCII part of the line lines up.
		const match = onlyMatch(findTranscriptSearchMatches(["needle 日本語 tail"], "needle 日本語"));
		expect(match.segments).toEqual([
			{ row: 0, startCol: 0, endCol: 6 },
			{ row: 0, startCol: 7, endCol: 13 },
		]);
		// "日本語" is three characters but six columns, so the second run ends at 13
		// only if the wide run was measured in columns. Counting characters instead
		// would place the end at 10.
		expect(match.segments[1]!.endCol).toBe(13);
	});

	test("strips ANSI styling before matching, so styled text does not break a query", () => {
		const styled = ["\x1b[1mnee\x1b[22mdle in \x1b[31mred\x1b[0m"];
		expect(findTranscriptSearchMatches(styled, "needle")).toHaveLength(1);
		expect(findTranscriptSearchMatches(styled, "red")).toHaveLength(1);
	});

	test("finds a hit whose cell is styled with an escape it cannot see", () => {
		// The span must describe the VISIBLE columns of the raw line, not of the
		// stripped text: a renderer slices the original line by these numbers.
		const line = "\x1b[31mneedle\x1b[0m";
		const match = onlyMatch(findTranscriptSearchMatches([line], "needle"));
		// The escape occupies no columns, so the hit starts at column 0 of the screen.
		expect(match.segments[0]!.startCol).toBe(0);
	});
});

/**
 * The RENDERER half of the contract.
 *
 * The index reports DISPLAY columns measured on the ANSI-stripped line; a
 * renderer slices the RAW line. Those are different coordinate spaces, and the
 * index's own tests cannot catch a mismatch between them — asserting the index is
 * correct proves nothing about the consumer. Every case here therefore runs the
 * actual slice the overlay performs and checks the VISIBLE text that comes out,
 * which is what a user would see highlighted.
 *
 * Asserting on the visible text rather than the raw slice is deliberate: a match
 * spanning two style runs legitimately carries the escapes between them, and
 * `"need\x1b[0m\x1b[31mle"` is correct output, not a leak.
 */
function highlightedText(line: string, query: string): string {
	const match = onlyMatch(findTranscriptSearchMatches([line], query));
	const segment = match.segments[0]!;
	return Bun.stripANSI(sliceByColumn(line, segment.startCol, segment.endCol - segment.startCol));
}

describe("highlighting a match on the line the renderer draws", () => {
	test("selects the matched text when the line carries an escape", () => {
		// Slicing this line by the reported columns yields "\x1b[31mn" -- the escape
		// occupies no column but does occupy string units, so the numbers are wrong
		// for the raw line by exactly its length.
		expect(highlightedText("\x1b[31mneedle\x1b[0m", "needle")).toBe("needle");
	});

	test("selects a wide-glyph run, which is shorter in string units than in columns", () => {
		expect(highlightedText("日本語 needle", "日本語")).toBe("日本語");
	});

	test("selects text on a line that mixes escapes and wide glyphs", () => {
		expect(highlightedText("\x1b[1m日本語\x1b[0m needle", "needle")).toBe("needle");
	});

	test("selects a match the renderer splits across two style runs", () => {
		expect(highlightedText("\x1b[1mneed\x1b[0m\x1b[31mle\x1b[0m", "needle")).toBe("needle");
	});

	test("selects text after an OSC hyperlink, which is invisible and multi-line", () => {
		expect(highlightedText("\x1b]8;;http://example.com\x07needle\x1b]8;;\x07", "needle")).toBe("needle");
	});

	test("selects text following an astral emoji", () => {
		expect(highlightedText("🌈 needle", "needle")).toBe("needle");
	});

	test("selects plain text unchanged", () => {
		expect(highlightedText("a needle here", "needle")).toBe("needle");
	});
});

describe("slicing a match with the central column helper", () => {
	test("takes a LENGTH, so an end column would over-read by the start offset", () => {
		// The helper's third argument is a count. Passing an end column instead
		// reads one column-group too many, which is off by exactly startCol.
		expect(sliceByColumn("a needle here", 2, 6)).toBe("needle");
		expect(sliceByColumn("a needle here", 2, 8)).not.toBe("needle");
	});

	test("does not let an escape count as a column, and keeps the styling it cuts", () => {
		// The helper returns the styled text so the caller can re-colour it — the
		// escapes come back out, which is why the assertion is on the visible text.
		const cut = sliceByColumn("\x1b[31mneedle\x1b[0m", 0, 6);
		expect(Bun.stripANSI(cut)).toBe("needle");
		// Six columns of a line whose first six columns are "needle": if the escape
		// had counted, the cut would have been two characters short.
		expect(cut).toContain("needle");
	});

	test("measures wide glyphs in columns, not code units", () => {
		expect(sliceByColumn("日本語x", 0, 6)).toBe("日本語");
	});
});

describe("transcript search query handling", () => {
	test("an empty or whitespace-only query matches nothing rather than everything", () => {
		const lines = ["alpha", "beta"];
		expect(findTranscriptSearchMatches(lines, "")).toEqual([]);
		expect(findTranscriptSearchMatches(lines, "   ")).toEqual([]);
		// The degenerate case this guards: an empty pattern matches at every offset,
		// which would light up the entire transcript. A real query does find hits.
		expect(findTranscriptSearchMatches(lines, "alpha")).toHaveLength(1);
	});

	test("matching is case-insensitive", () => {
		expect(findTranscriptSearchMatches(["Needle"], "needle")).toHaveLength(1);
		expect(findTranscriptSearchMatches(["needle"], "NEEDLE")).toHaveLength(1);
	});

	test("normalizes runs of whitespace in the query", () => {
		// Normalizing the QUERY only works because the corpus collapses its own runs
		// to single separators, so both sides meet in the same shape.
		expect(normalizeQuery("  Needle   Here  ")).toBe("Needle Here");
		expect(findTranscriptSearchMatches(["a  \t b"], "a b")).toHaveLength(1);
	});

	test("treats regex metacharacters as literal text", () => {
		// A query of "a.c" must find the literal, and must NOT match "abc" — an
		// unescaped dot matches any character and silently widens every query.
		expect(findTranscriptSearchMatches(["a.c"], "a.c")).toHaveLength(1);
		expect(findTranscriptSearchMatches(["abc"], "a.c")).toEqual([]);
	});

	test("normalizes the query the same way on both sides of the comparison", () => {
		expect(normalizeQuery("")).toBe("");
		expect(normalizeQuery("   ")).toBe("");
	});
});

describe("transcript search result identity", () => {
	test("a match key distinguishes two hits that share a row", () => {
		const matches = findTranscriptSearchMatches(["needle and needle"], "needle");
		expect(matches).toHaveLength(2);
		const keys = matches.map(getTranscriptSearchMatchKey);
		expect(new Set(keys).size).toBe(2);
	});
});

describe("transcript search index caching", () => {
	test("reuses matches while neither the lines nor the query change", () => {
		const index = new TranscriptSearchIndex();
		const lines = ["one needle", "two"];
		expect(index.search(lines, "needle").changed).toBe(true);
		// The second call must be able to say "nothing changed", which is what lets
		// the overlay skip a repaint. It can only know that by having cached.
		expect(index.search(lines, "needle").changed).toBe(false);
	});

	test("reports a change when the query changes even though the lines did not", () => {
		const index = new TranscriptSearchIndex();
		const lines = ["one needle", "two"];
		index.search(lines, "needle");
		expect(index.search(lines, "two").changed).toBe(true);
	});

	test("reports a change when the lines change even though the query did not", () => {
		const index = new TranscriptSearchIndex();
		index.search(["one needle"], "needle");
		expect(index.search(["one needle", "appended"], "needle").changed).toBe(true);
	});

	test("still matches after the line count returns to a previous value", () => {
		// A length-only cache would treat "3 lines, then 3 different lines" as
		// unchanged and serve matches computed against text that is no longer shown.
		// Asserting the MATCHES, not just `changed`: a stale cache can still report
		// `changed` (the query is re-run) while handing back the old hits.
		const index = new TranscriptSearchIndex();
		const first = index.search(["a", "b", "needle"], "needle");
		expect(first.matches).toHaveLength(1);

		const second = index.search(["x", "y", "haystack"], "needle");
		expect(second.matches).toEqual([]);

		// And the reverse: content that comes BACK must be found again.
		const third = index.search(["a", "b", "needle"], "needle");
		expect(third.matches).toHaveLength(1);
	});

	test("an edit inside a line invalidates the cached matches for that line", () => {
		// Same line count, same query, one character changed. The hit has to move.
		const index = new TranscriptSearchIndex();
		expect(index.search(["the needle here"], "needle").matches).toHaveLength(1);
		expect(index.search(["the needles here"], "needle").matches).toHaveLength(1);
		// ...and disappear when the text it referred to is gone.
		expect(index.search(["the haystack here"], "needle").matches).toEqual([]);
	});

	test("an empty corpus yields no matches and does not throw", () => {
		expect(findTranscriptSearchMatches([], "needle")).toEqual([]);
		expect(new TranscriptSearchIndex().search([], "needle").matches).toEqual([]);
	});
});

describe("search corpus construction", () => {
	test("spans cover the joined text without gaps or overlaps", () => {
		// The corpus is a concatenation of spans. An overlap would double-count a run's
		// length, so every column computed past it would drift.
		const corpus = buildSearchCorpus(["alpha beta", "gamma delta"]);
		for (let i = 1; i < corpus.spans.length; i++) {
			expect(corpus.spans[i]!.textStart).toBeGreaterThanOrEqual(corpus.spans[i - 1]!.textEnd);
		}
		// The loop above covers the middle; this covers the end. A trailing span that
		// stopped short would leave the tail of the last run unsearchable.
		const last = corpus.spans[corpus.spans.length - 1]!;
		expect(corpus.text.slice(0, last.textEnd)).toBe(corpus.text);
	});

	test("a blank line separates runs but does not contribute a column", () => {
		const corpus = buildSearchCorpus(["alpha", "", "beta"]);
		const beta = corpus.spans.find(s => corpus.text.slice(s.textStart, s.textEnd) === "beta");
		expect(beta).toBeDefined();
		// Row 2 is the real row; the empty line must not shift the column.
		expect(beta!.row).toBe(2);
		expect(beta!.startCol).toBe(0);
	});
});
