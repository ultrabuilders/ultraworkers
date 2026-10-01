import { describe, expect, test } from "bun:test";
import { Lexer, Marked, type TokenizerAndRendererExtension } from "../src/marked";
import goldens from "./fixtures/marked/goldens.json";

describe("marked compatibility", () => {
	for (const golden of goldens) {
		test(`matches marked tokens and HTML for ${golden.name}`, () => {
			expect([...Lexer.lex(golden.source)]).toEqual(golden.tokens);
			expect(new Marked().parse(golden.source)).toBe(golden.html);
		});
	}

	// Token-shape parity with real marked (verified against marked v15) at the
	// list/blank-line boundary. The TUI streaming lexer freezes prefixes on
	// these shapes, so a list's raw must never absorb a trailing blank run —
	// mid-document OR at end of input — and looseness must not flip with the
	// follower. The tui incremental tests compare this lexer to itself and
	// cannot catch a shape drift.
	const listBoundaryShapes: Array<[string, Array<[string, string] | [string, string, boolean]>]> = [
		[
			"- item\n\n",
			[
				["list", "- item", false],
				["space", "\n\n"],
			],
		],
		[
			"1. a\n2. b\n\n",
			[
				["list", "1. a\n2. b", false],
				["space", "\n\n"],
			],
		],
		[
			"- a\n\n\n",
			[
				["list", "- a", false],
				["space", "\n\n\n"],
			],
		],
		[
			"- [x] done\n\n",
			[
				["list", "- [x] done", false],
				["space", "\n\n"],
			],
		],
		[
			"- item\n\nhello",
			[
				["list", "- item", false],
				["space", "\n\n"],
				["paragraph", "hello"],
			],
		],
		[
			"1. a\n2. b\n\n1) x",
			[
				["list", "1. a\n2. b", false],
				["space", "\n\n"],
				["list", "1) x", false],
			],
		],
		// Same-marker continuation across the blank still merges into one loose list.
		["1. a\n2. b\n\n1. c", [["list", "1. a\n2. b\n\n1. c", true]]],
		// A blank inside an item (indented continuation) stays in the item raw.
		[
			"- a\n\n  b\n\n",
			[
				["list", "- a\n\n  b", true],
				["space", "\n\n"],
			],
		],
	];
	for (const [source, shape] of listBoundaryShapes) {
		test(`keeps the list/blank boundary shape for ${JSON.stringify(source)}`, () => {
			const tokens = [...Lexer.lex(source)].map(token =>
				token.type === "list" ? [token.type, token.raw, token.loose] : [token.type, token.raw],
			);
			expect(tokens).toEqual(shape);
		});
	}

	// Lazy-continuation boundary shapes (behavior cross-checked against marked
	// v18): an indented code block cannot interrupt a paragraph, so an indented
	// line directly attached to paragraph text stays in the paragraph even when
	// a setext/hr lookahead matches downstream — while a whitespace-padded
	// blank line detaches it, so the next indented run still opens indented
	// code. Documented divergences from marked kept as-is: marked dedents the
	// attached line inside `text` via its code-merge path, and it splits a
	// padded blank into a `space` token where this lexer keeps the padded
	// blank inside the paragraph raw.
	const lazyBoundaryShapes: Array<[string, Array<[string, string]>]> = [
		[
			"lead\n   \n    code\n",
			[
				["paragraph", "lead\n   \n"],
				["code", "    code\n"],
			],
		],
		[
			"lead\n    attached\n---\n",
			[
				["paragraph", "lead\n    attached\n"],
				["hr", "---\n"],
			],
		],
		[
			"lead\n     deeper attached\n---\n",
			[
				["paragraph", "lead\n     deeper attached\n"],
				["hr", "---\n"],
			],
		],
		[
			"lead\n   \n     deeper code\n",
			[
				["paragraph", "lead\n   \n"],
				["code", "     deeper code\n"],
			],
		],
	];
	for (const [source, shape] of lazyBoundaryShapes) {
		test(`keeps the lazy-continuation boundary shape for ${JSON.stringify(source)}`, () => {
			expect([...Lexer.lex(source)].map(token => [token.type, token.raw])).toEqual(shape);
		});
	}

	test("runs block and inline tokenizer/renderer extensions", () => {
		const latexBlock: TokenizerAndRendererExtension = {
			name: "latexBlock",
			level: "block",
			start(src) {
				const index = src.indexOf("$$\n");
				return index === -1 ? undefined : index;
			},
			tokenizer(src) {
				const match = /^\$\$\n([\s\S]+?)\n\$\$(?:\n|$)/.exec(src);
				return match ? { type: "latexBlock", raw: match[0], text: match[1] } : undefined;
			},
			renderer(token) {
				return `<math>${token.text}</math>\n`;
			},
		};
		const inlineLatex: TokenizerAndRendererExtension = {
			name: "latex",
			level: "inline",
			start(src) {
				const index = src.indexOf("$");
				return index === -1 ? undefined : index;
			},
			tokenizer(src) {
				const match = /^\$([^\n$]+)\$/.exec(src);
				return match ? { type: "latex", raw: match[0], text: match[1] } : undefined;
			},
			renderer(token) {
				return `<i>${token.text}</i>`;
			},
		};
		const marked = new Marked().use({ extensions: [latexBlock, inlineLatex] });

		expect([...marked.lexer("before $x_i$\n\n$$\ny^2\n$$\n")]).toEqual([
			{
				type: "paragraph",
				raw: "before $x_i$",
				text: "before $x_i$",
				tokens: [
					{ type: "text", raw: "before ", text: "before ", escaped: false },
					{ type: "latex", raw: "$x_i$", text: "x_i" },
				],
			},
			{ type: "space", raw: "\n\n" },
			{ type: "latexBlock", raw: "$$\ny^2\n$$\n", text: "y^2" },
		]);
		expect(marked.parse("before $x_i$\n\n$$\ny^2\n$$\n")).toBe("<p>before <i>x_i</i></p>\n<math>y^2</math>\n");
	});

	// Reference labels are user-controlled and index the ref-def map. An
	// `Object.prototype` member (`constructor`, `__proto__`, `toString`, …) must
	// not resolve to a fake definition: the link falls back to literal text and
	// never yields a `href: undefined` token that crashes downstream renderers
	// (issue #10283).
	for (const label of ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"]) {
		test(`treats reference label ${label} as literal text, not an inherited definition`, () => {
			const tokens = [...Lexer.lex(`[text][${label}]`)];
			const links: unknown[] = [];
			const walk = (list: readonly { type: string; tokens?: unknown[] }[]) => {
				for (const token of list) {
					if (token.type === "link") links.push(token);
					if (Array.isArray(token.tokens)) {
						walk(token.tokens as { type: string; tokens?: unknown[] }[]);
					}
				}
			};
			walk(tokens as { type: string; tokens?: unknown[] }[]);
			expect(links).toEqual([]);
			// No anchor element is produced: the label is not a reference definition.
			expect(new Marked().parse(`[text][${label}]`)).not.toContain("<a ");
		});
	}
});

// Regression: lexing a long inline run was O(n²), so a large markdown file with no
// inline punctuation (a long prose line, a big base64 blob, a minified asset) hung
// the renderer — 128 KB cost ~10 s. Two independent causes, both in `inlineTokens`:
//   1. `[A-Za-z0-9._+-]+@` backtracks at every start position when no `@` follows.
//   2. Both scans re-ran over the whole remainder on every loop iteration.
describe("marked inline lexing is linear in input size", () => {
	// Doubling the input must not much more than double the time. A quadratic
	// implementation grows ~4x per doubling; the ratio below fails that loudly
	// while leaving ample room for timer noise on a loaded machine.
	const timed = (source: string): number => {
		const start = performance.now();
		const tokens = [...Lexer.lex(source)];
		const elapsed = performance.now() - start;
		// Guard against a vacuous pass: an empty result means nothing was lexed.
		expect(tokens.length).toBeGreaterThan(0);
		return elapsed;
	};

	for (const [label, char] of [["plain characters", "a"]] as const) {
		test(`does not super-linearly scale on long runs of ${label}`, () => {
			const small = timed(char.repeat(32_000));
			const large = timed(char.repeat(64_000));
			// Warm-up: the first lex pays JIT and regex-compile costs.
			timed(char.repeat(1_000));
			const ratio = large / Math.max(small, 0.5);
			// A quadratic implementation grows ~4x per doubling of the input.
			expect(ratio).toBeLessThan(3);
		}, 60_000);
	}

	// Runs made entirely of stop characters are a separate, still-quadratic cost: the
	// loop advances one character at a time and re-runs nine `indexOf` scans over the
	// shrinking remainder each time. That is bounded by the number of stop characters,
	// not by the input length, so it stays acceptable — but it is NOT covered by the
	// linear guarantee above, and is asserted here only as a ceiling so a regression
	// that makes it worse is visible.
	test("stop-character runs stay within a sane ceiling", () => {
		timed("!".repeat(1_000));
		expect(timed("!".repeat(32_000))).toBeLessThan(1_000);
	}, 60_000);

	// The fix must not change what is tokenized. `next <= 1` skips both scans, and a
	// match starting before `next` can still extend past it — a hard break's `\n`
	// sits exactly at `next`, so the window cannot simply be truncated.
	test("keeps hard breaks, links and emails tokenized as before", () => {
		const paragraphTokens = (source: string) => {
			const [first] = [...Lexer.lex(source)];
			if (first?.type !== "paragraph") throw new Error(`expected a paragraph, got ${first?.type}`);
			return first.tokens;
		};
		expect(paragraphTokens("hard break here  \nnext line")).toEqual([
			{ type: "text", raw: "hard break here", text: "hard break here", escaped: false },
			{ type: "br", raw: "  \n" },
			{ type: "text", raw: "next line", text: "next line", escaped: false },
		]);
		// Regression: an earlier attempt bounded the local-part to `{1,64}`, which made
		// the quadratic go away but silently truncated every address longer than 64
		// characters — and only when the address was preceded by text, so an
		// offset-0 check passed. The bound bought speed by discarding data; the fix
		// scans backwards from `@` instead and places no limit at all.
		for (const length of [1, 63, 64, 65, 66, 200]) {
			const address = `${"a".repeat(length)}@x.io`;
			expect(paragraphTokens(`write to ${address}`)).toContainEqual({
				type: "link",
				raw: address,
				text: address,
				href: `mailto:${address}`,
				tokens: [{ type: "text", raw: address, text: address }],
			});
			// Same address at offset 0, where the bounded version happened to agree.
			expect(paragraphTokens(address)).toContainEqual({
				type: "link",
				raw: address,
				text: address,
				href: `mailto:${address}`,
				tokens: [{ type: "text", raw: address, text: address }],
			});
		}

		// A bare `@` with no local-part character before it is not an email, so the
		// scan must advance to the NEXT `@` rather than give up — the leftmost-match
		// regex did exactly that. An early version stopped at the first `@` and lost
		// the link entirely on `@@a@b.co`.
		// Mỗi ca ghi kỳ vọng riêng: địa chỉ khớp ở `@` ĐẦU TIÊN có local-part đứng
		// trước, tức là `@` cuối cùng mà phần trước nó là ký tự local-part.
		for (const [source, address] of [
			["@@a@b.co", "a@b.co"],
			["(@@a@b.co)", "a@b.co"],
			["x @y@z.co", "y@z.co"],
			["a@b@c.co", "b@c.co"],
			["see @y@z.co", "y@z.co"],
		] as const) {
			expect(paragraphTokens(source)).toContainEqual({
				type: "link",
				raw: address,
				text: address,
				href: `mailto:${address}`,
				tokens: [{ type: "text", raw: address, text: address }],
			});
		}

		expect(paragraphTokens("mail a.b+c@co.io now")).toEqual([
			{ type: "text", raw: "mail ", text: "mail ", escaped: false },
			{
				type: "link",
				raw: "a.b+c@co.io",
				text: "a.b+c@co.io",
				href: "mailto:a.b+c@co.io",
				tokens: [{ type: "text", raw: "a.b+c@co.io", text: "a.b+c@co.io" }],
			},
			{ type: "text", raw: " now", text: " now", escaped: false },
		]);
	});
});

/**
 * Hard-break detection was a quadratic regex (`/(?: {2,}|\\)\n/`) and is now a linear
 * scan. The rewrite is only allowed to be faster, never narrower — and the obvious
 * way to make that regex linear is to bound the quantifier, which silently changes
 * what a hard break *consumes*:
 *
 *     "a     \nb"   →  text "a", br "     \n"   (the whole run)
 *
 * Bounded to `{2,3}` the same input yields br "   \n" and leaves two spaces as a
 * separate text token. Every pre-existing test still passes, and no HTML changes,
 * because trailing spaces before a break are not rendered — so this boundary is
 * guarded here rather than left to the next reader of the perf comment.
 */
describe("a hard break consumes its whole run of spaces", () => {
	for (const width of [2, 3, 5, 8, 17]) {
		test(`${width} spaces before a newline form one br spanning all ${width}`, () => {
			const spaces = " ".repeat(width);
			expect([...Lexer.lexInline(`a${spaces}\nb`)]).toEqual([
				{ type: "text", raw: "a", text: "a", escaped: false },
				{ type: "br", raw: `${spaces}\n` },
				{ type: "text", raw: "b", text: "b", escaped: false },
			]);
		});
	}

	test("a single space is not a hard break", () => {
		// The other side of the `{2,}` boundary: one space must not be promoted, or the
		// scan has grown a match the regex never had.
		expect([...Lexer.lexInline("a \nb")]).toEqual([{ type: "text", raw: "a \nb", text: "a \nb", escaped: false }]);
	});

	test("a backslash before a newline is a hard break", () => {
		expect([...Lexer.lexInline("a\\\nb")]).toEqual([
			{ type: "text", raw: "a", text: "a", escaped: false },
			{ type: "br", raw: "\\\n" },
			{ type: "text", raw: "b", text: "b", escaped: false },
		]);
	});
});

/**
 * The bare-link regex is now split so its email branch is skipped unless `rest`
 * actually contains an `@` — the branch had a greedy `+` in front of a required `@`,
 * which is quadratic on any run of `_`. The gate must not cost a match: an address
 * whose local part is nothing but the characters that trigger the quadratic case is
 * the input most likely to be dropped by an over-eager short-circuit.
 */
describe("the bare-link email branch still matches when an @ is present", () => {
	test("a local part made only of the quadratic trigger characters links", () => {
		expect([...Lexer.lexInline("_@a.co")]).toEqual([
			{
				type: "link",
				raw: "_@a.co",
				text: "_@a.co",
				href: "mailto:_@a.co",
				tokens: [{ type: "text", raw: "_@a.co", text: "_@a.co" }],
			},
		]);
	});

	test("a long underscore run followed by an address still links", () => {
		const run = "_".repeat(64);
		// Not "the link spans all 64": the leading run is partly consumed as emphasis
		// first, so the address that survives is shorter. The contract is the one the
		// `@` gate could break — that an address containing the quadratic trigger
		// characters is still recognised, not silently left as text.
		const links = [...Lexer.lexInline(`${run}@a.co`)].filter(t => t.type === "link");
		expect(links).toHaveLength(1);
		expect(links[0]!.raw).toEndWith("@a.co");
		expect(links[0]!.href.startsWith("mailto:")).toBe(true);
	});

	test("without an @ the same characters stay text", () => {
		// The negative contract for the gate: skipping the branch must skip it, not
		// reinterpret the run.
		expect([...Lexer.lexInline("a_b")]).toEqual([{ type: "text", raw: "a_b", text: "a_b", escaped: false }]);
	});
});
