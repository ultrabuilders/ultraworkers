/**
 * A paragraph holding ONE link is lexed in time proportional to its length — not to its square.
 *
 * The trap this defends against is not "a missing optimisation", it is a **measurement domain**.
 * An earlier fix gated the bare-URL scheme search behind `srcHasScheme`, a boolean for the whole
 * string. That is correct for text with no URL — the gate is closed and the search never runs —
 * and it was verified on exactly such text. But one link anywhere keeps the flag true for the
 * entire run, so the unanchored search re-read the whole remaining tail on every iteration:
 * counted, that is 428 million characters scanned for a 121 kB paragraph, ×4.00 per doubling.
 *
 * So the input here carries a link on purpose. A scaling test on link-free prose passes against
 * the broken gate, which is precisely how the broken gate got closed in the first place. If you
 * are tempted to simplify this fixture to plain words, that edit removes the only thing it tests.
 *
 * Why a scaling assertion and not a token assertion: the fix is byte-identical — verified against
 * 40219 inputs, including ones where the scan position lands exactly on a scheme. Every test that
 * compares output therefore stays green whether or not the fix is present, and deleting the fix
 * survives all of them. The only observable separating the two states is how work grows with input.
 *
 * Why a ratio and not a time bound: an absolute millisecond bound is a statement about the machine.
 * Growth from n to 4n is a statement about the code — linear work gives ~4, squared work gives ~16 —
 * so this stays meaningful on a loaded or faster box. Threshold 8 sits between them.
 *
 * If this ever flakes on CI, the fix is to RAISE the threshold. Do not weaken it into
 * "growth < 8 OR time < X" — that is an OR gate, which only goes red when both halves fail at
 * once, and it would pass on any single healthy reading.
 */
import { describe, expect, it } from "bun:test";
import { Lexer } from "../src/marked";

/**
 * Prose carrying stop characters (`*`, `_`, a backtick, a link), which is what ordinary
 * markdown looks like. The punctuation is load-bearing twice over: it is what makes the lexer
 * iterate once per token instead of swallowing the paragraph as one text run, and the number
 * of iterations is exactly what the old whole-string gate multiplied by the length of the
 * remaining tail. Verified: with plain words the scan branch is entered **once** for the whole
 * paragraph and this file passes even against the unfixed lexer. Do not simplify it away.
 */
const PROSE = "The quick brown fox jumps over the lazy dog while parsing *bold* and _em_ and `code` plus [link](u). ";

/** One link at the front — enough to hold the old whole-string gate open for the whole run. */
const withOneLink = (chars: number): string => `http://example.com/x ${PROSE.repeat(Math.ceil(chars / PROSE.length))}`;

/** Min-of-N, so a scheduling hiccup cannot read as a regression. */
function bestMs(lex: (src: string) => unknown, src: string, samples = 5): number {
	for (let i = 0; i < 2; i++) lex(src);
	let min = Infinity;
	for (let i = 0; i < samples; i++) {
		const started = Bun.nanoseconds();
		lex(src);
		min = Math.min(min, Bun.nanoseconds() - started);
	}
	return min / 1e6;
}

describe("one link in the paragraph does not cost the square of the paragraph", () => {
	it("scales linearly in input length", () => {
		const atN = bestMs(s => Lexer.lexInline(s), withOneLink(16_000));
		const at4N = bestMs(s => Lexer.lexInline(s), withOneLink(64_000));

		// Squared work multiplies by 16 across a 4x input; linear work multiplies by 4.
		const growth = at4N / atN;
		expect(growth).toBeLessThan(8);
	}, 20_000);
});
