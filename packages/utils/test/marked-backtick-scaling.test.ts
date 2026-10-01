/**
 * A run of backticks is lexed in time proportional to its length — not to its square.
 *
 * `93bb6177e5` collapsed a pure-backtick run into a single pass. Before it, `inlineTokens`
 * advanced one backtick per iteration, and every one of those iterations re-ran `` /^`+/ ``
 * over the *whole remaining run* — O(n) work per O(1) step. Measured by counting loop
 * iterations: 65536 iterations at n=65536, versus 1 after the fix.
 *
 * Why a scaling assertion and not a token assertion: the fix is byte-identical, so every
 * test that compares output stays green whether or not it is present. Deleting the fix
 * survives all of them. The only observable that separates the two states is how the work
 * grows with input, so that is what this measures.
 *
 * Why a ratio and not a time bound: an absolute millisecond bound is a statement about the
 * machine. Growth from n to 4n is a statement about the code — linear work gives ~4, squared
 * work gives ~16 — so this stays meaningful on a loaded or faster box. Threshold 8 sits
 * between them: measured 2.65-3.32 with the fix, 16.90-20.64 without.
 */
import { describe, expect, it } from "bun:test";
import { Lexer } from "../src/marked";

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

describe("a run of backticks does not cost its own square", () => {
	it("scales linearly in input length", () => {
		const n = 8192;
		const small = "`".repeat(n);
		const large = "`".repeat(n * 4);

		const atN = bestMs(s => Lexer.lexInline(s), small);
		const at4N = bestMs(s => Lexer.lexInline(s), large);

		// Squared work multiplies by 16 across a 4x input; linear work multiplies by 4.
		const growth = at4N / atN;
		expect(growth).toBeLessThan(8);
	}, 30_000);
});
