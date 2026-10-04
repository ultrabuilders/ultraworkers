/**
 * A MEASUREMENT, NOT A GATE — the filename says `docblock-scan` and not `check-*`
 * on purpose, and the reason is at the bottom of this docblock. Read that first if
 * you came here to wire it into CI.
 *
 * The damage class it investigates: a comment is destroyed and the file still
 * parses.
 *
 * WHY THE QUESTION IS WORTH ASKING AT ALL
 * ---------------------------------------
 * Every other check in this repo reads what the code DOES. This one reads what the
 * code SAYS ABOUT ITSELF, which no runtime assertion can reach — a comment that has
 * been truncated produces a file that runs correctly and documents nothing.
 *
 * WHY IT IS NOT ENOUGH TO JUST BUILD THE FILE
 * --------------------------------------------
 * Measured, on this tree, with `bun build` as the control (d9's experiment, and it
 * overturned an assumption of mine). Marker sequences are described in words below
 * rather than written out, because writing one inside this comment would close it —
 * which is the defect this gate exists to catch, and which cost three drafts of this
 * very file:
 *
 * | shape inside the comment | `bun build` |
 * | --- | --- |
 * | a docblock closed correctly | parses |
 * | a doubled star-slash mid-body | **FAILS** |
 * | the escaped-slash glob fragment — the exact shape I hit twice | **PARSES** |
 * | a bare close followed by prose on the SAME line | **PARSES** |
 * | a bare close with prose on the NEXT line | **FAILS** |
 *
 * The third and fourth rows are why this exists. The glob fragment has a backslash
 * before the slash: in a REGEX LITERAL that is an escape the parser understands, and
 * in a docblock there is no escape at all. The same character sequence, two parsers,
 * two answers. A gate built only on "does it build" would be green on the exact
 * input I have shipped twice.
 *
 * The fourth row is worse still: the docblock is gone, the prose after its close
 * becomes code, and if that prose happens to look like a valid expression the file
 * still runs. So **red build is not the full symptom** — there is a quieter class,
 * and it is the class this rule exists to catch.
 *
 * THE NUMBER OF LIVE CASES IS ZERO, AND THAT IS NOT A REASON TO SKIP THIS
 * --------------------------------------------------------------------------
 * Zero means "has not happened in `src` right now". It does not mean "cannot
 * happen". The fourth row is a demonstration that this class survives a green build,
 * and the counter-example is my own history: I fixed the doubled-marker form twice,
 * and the second fix was the shape the build does not catch. "Harmless to the build"
 * is not "harmless".
 *
 * WHY THERE IS NO TREE-WIDE SCAN HERE
 * -----------------------------------
 * This file deliberately does NOT walk the packages' `src` trees. The first
 * version did, and measuring it against a real file killed it:
 *
 *   - it reported an unterminated comment at `tools/glob.ts:504`, inside a
 *     template literal that is perfectly well formed and compiles;
 *   - and it detected no comment at all across lines 72-503 of that file, 430
 *     lines of ordinary source full of docblocks.
 *
 * A hand-rolled scanner cannot distinguish a `/` that opens a regex literal from
 * one that is division, and cannot descend into `${}` inside a template. Both
 * mistakes are invisible in a fixture and certain in real code.
 *
 * THAT is the failure worth naming. A gate that fires wrongly on healthy code
 * trains its reader to ignore it — the whole point of d9's discarded matcher that
 * flagged 1,974 correctly-closed docblocks. Shipping the scan would have produced
 * the same disease, and the class it was written for would have gone unremarked.
 *
 * So: keep the part that is exact (`isEscapedSlash`), keep the fixtures that
 * prove which shapes a build misses, and do not pretend a scanner that cannot
 * read TypeScript is a gate over TypeScript. Whoever picks this up should use the
 * compiler's own scanner; the measurements above are what to check it against.
 */

/** A finding: one file, one line, and what was wrong there. */
export interface DocblockDefect {
	readonly file: string;
	readonly line: number;
	readonly kind: "truncated-docblock" | "unterminated-comment";
	readonly detail: string;
}

/**
 * Does this marker close a comment, or is it an escaped slash inside a regex?
 *
 * The one distinction this matcher has to get right. Getting it backwards is not a
 * false positive: it is a rule that reports every regex in the tree, which trains
 * its reader to ignore it — the failure mode of a wide-wrong filter, and the reason
 * d9's first matcher (flagging every correctly-closed docblock, 1974 of them) was
 * deleted rather than tuned.
 *
 * A close preceded by an odd number of backslashes is an escaped slash: `\\/` is a
 * literal backslash followed by a real close, `\\\/` is two literal backslashes
 * then a real close. Counting the run is what tells them apart.
 */
export function isEscapedSlash(text: string, index: number): boolean {
	let backslashes = 0;
	for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) backslashes++;
	return backslashes % 2 === 1;
}

/**
 * Find comment damage in one file's text.
 *
 * Deliberately a small scanner rather than a parser: the whole point is to catch
 * the cases where the parser succeeded and the human reading was misled, so the
 * judgement has to be made on the text as written.
 *
 * `inRegex` tracks whether an unclosed close sits inside a regex literal, which is
 * the case `bun build` tolerates and a reader does not.
 */
export function findDefects(file: string, text: string): DocblockDefect[] {
	const defects: DocblockDefect[] = [];
	const lineStarts: number[] = [0];
	for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
	const lineAt = (index: number): number => {
		let lo = 0;
		let hi = lineStarts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (lineStarts[mid]! <= index) lo = mid;
			else hi = mid - 1;
		}
		return lo + 1;
	};

	let i = 0;
	let inRegex = false;
	let inString: '"' | "'" | "`" | undefined;
	while (i < text.length - 1) {
		const ch = text[i]!;
		const next = text[i + 1]!;

		if (inString) {
			if (ch === "\\") i += 2;
			else {
				if (ch === inString) inString = undefined;
				i++;
			}
			continue;
		}
		if (inRegex) {
			if (ch === "\\") {
				i += 2;
				continue;
			}
			// A close here is an escaped slash inside a regex literal — exactly the
			// shape `bun build` accepts and a docblock reader cannot survive.
			if (ch === "*" && next === "/") i += 2;
			else {
				if (ch === "/") inRegex = false;
				i++;
			}
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			inString = ch;
			i++;
			continue;
		}
		if (ch === "/" && next === "/") {
			while (i < text.length && text[i] !== "\n") i++;
			continue;
		}
		if (ch === "/" && next === "*") {
			const isDoc = text[i + 2] === "*" && text[i + 3] !== "/";
			const open = i;
			i += 2;
			let closed = -1;
			while (i < text.length - 1) {
				if (text[i] === "*" && text[i + 1] === "/" && !isEscapedSlash(text, i)) {
					closed = i;
					break;
				}
				i++;
			}
			if (closed === -1) {
				defects.push({
					file,
					line: lineAt(open),
					kind: "unterminated-comment",
					detail: "/* opened and never closed",
				});
				return defects;
			}
			if (isDoc) {
				// The truncated case: a docblock whose close is followed, on the SAME
				// line, by text that reads as prose rather than as the next line of
				// code. `bad3` lands here and `bun build` accepts it.
				const after = text.slice(closed + 2);
				const newline = after.indexOf("\n");
				const tail = (newline === -1 ? after : after.slice(0, newline)).trim();
				if (tail.length > 0 && /^[A-Za-z(]/.test(tail) && !/[;{}]\s*$/.test(tail)) {
					defects.push({
						file,
						line: lineAt(closed),
						kind: "truncated-docblock",
						detail: `docblock closed early; prose followed on the same line: ${tail.slice(0, 60)}`,
					});
				}
			}
			i = closed + 2;
			continue;
		}
		if (ch === "/") {
			inRegex = true;
			i++;
			continue;
		}
		i++;
	}
	return defects;
}
