import { describe, expect, test } from "bun:test";
import * as path from "node:path";

import { PINNED } from "./check-disposition";

/**
 * The `PINNED` table in `README.md` is prose until something checks it. This file checks
 * it: every row claims what `PINNED` does to one literal, and the claim is re-derived
 * from the exported expression at runtime.
 *
 * ## What this file is NOT
 *
 * **It is not a gate, and nothing enforces it.** `check-disposition.ts` does not read
 * `README.md`; the only consumer of this table is the human who reads it. So:
 *
 * - Change `PINNED` and leave the nine rows as prose → **this stays green**. That is the
 *   real limitation, and no assertion here can honestly claim otherwise. This test proves
 *   the table was correct when it was written, not that it stays correct.
 * - Its only value is REGRESSION: if someone edits `PINNED` and forgets the table, the
 *   row whose literal changed behaviour goes loud. That red means something.
 *
 * Do not wire this into `ci:*` and do not name it `*-gate.test.ts`. `eb` records the same
 * limitation in `epic-v0s3`.
 *
 * ## Why it parses instead of grepping
 *
 * A substring check over the README would break on reflow — column padding, a reworded
 * cell — while the claim it is checking survives that untouched. The table is therefore
 * split into cells and compared per cell. The expression is imported, never re-derived by
 * reading its source: a second copy of `PINNED` written here would be a second thing to
 * drift.
 */

interface PinnedRow {
	/** The literal from column 1, backticks stripped. */
	input: string;
	/** What column 2 claims: `yes` / `no`, emphasis stripped. */
	claimed: boolean;
}

const HEADER = ["input", "matches"];

function cells(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map(c => c.trim());
}

/**
 * A delimiter row: every cell is dashes, and at least one cell is non-empty.
 *
 * Markdown requires only ONE dash per column, so `|-|-|-|` is a legal table and a
 * `^-{3,}$` would swallow it as a data row — costing a row and failing the row-count
 * guard for a table that is entirely fine. That is worse than a correct red: it teaches
 * the next reader the table is broken when it is not.
 *
 * The `.some(c => c.length > 0)` clause is what keeps `^-*$` honest. Without it a blank
 * line splits to `[""]`, matches, and the loop would eat the blank instead of stopping.
 *
 * This guards *this* table, written by hand. It is deliberately not a general markdown
 * table parser.
 */
const isSeparator = (cs: string[]): boolean => {
	const dashed = cs.map(c => c.trim());
	return dashed.some(c => c.length > 0) && dashed.every(c => /^-*$/.test(c));
};

/**
 * Read the `input | matches | …` table out of a markdown document.
 *
 * Takes the text rather than the path so the parser's edge shapes can be exercised
 * directly, instead of only ever being reachable by editing the README.
 */
function parsePinnedTable(markdown: string): PinnedRow[] {
	const lines = markdown.split("\n");

	const start = lines.findIndex(line => {
		const c = cells(line);
		return c.length >= 2 && c[0].toLowerCase() === HEADER[0] && c[1].toLowerCase() === HEADER[1];
	});
	// A missing header is a failure, not an empty table: an empty table would make every
	// assertion below pass vacuously.
	expect(start).toBeGreaterThan(-1);

	const rows: PinnedRow[] = [];
	for (const line of lines.slice(start + 1)) {
		if (!line.trim().startsWith("|")) break;
		if (isSeparator(cells(line))) continue;
		const [input, matches] = cells(line);
		if (input === undefined || matches === undefined) continue;
		rows.push({
			input: input.replace(/^`|`$/g, ""),
			claimed: matches.replace(/\*/g, "").toLowerCase() === "yes",
		});
	}
	return rows;
}

async function readPinnedTable(): Promise<PinnedRow[]> {
	const readme = await Bun.file(path.join(import.meta.dir, "README.md")).text();
	return parsePinnedTable(readme);
}

describe("README PINNED table", () => {
	test("every row's claim matches the exported PINNED", async () => {
		const rows = await readPinnedTable();
		const wrong = rows
			.filter(row => PINNED.test(row.input) !== row.claimed)
			.map(row => `${JSON.stringify(row.input)}: table says ${row.claimed}, PINNED says ${PINNED.test(row.input)}`);

		expect(wrong).toEqual([]);
	});

	test("the table was actually read, and carries both polarities", async () => {
		const rows = await readPinnedTable();

		// Guards the row above against a parser that silently yields nothing, or a table
		// that has been flattened to a single verdict — either would make it pass by
		// having nothing to disagree about.
		expect(rows.length).toBe(9);
		expect(rows.some(r => r.claimed)).toBe(true);
		expect(rows.some(r => !r.claimed)).toBe(true);
	});

	test("control: the expression discriminates the literals it is claimed to", async () => {
		const rows = await readPinnedTable();

		// Without this, "every row matches" is also what a PINNED that matched nothing —
		// or everything — would produce. The two anchors are the ends of the range the
		// table is about: the bare token matches, a token glued to a word character
		// before it does not.
		expect(PINNED.test("omp")).toBe(true);
		expect(PINNED.test("aomp")).toBe(false);
		expect(rows.find(r => r.input === "omp")?.claimed).toBe(true);
		expect(rows.find(r => r.input === "aomp")?.claimed).toBe(false);
	});

	// eb's shapes, as a table. Each row is one input and what the parser must do with it;
	// the point of the first two is that a shorter dash run is still a legal delimiter, and
	// a blank line must end the table rather than be absorbed by a permissive `^-*$`.
	test("the delimiter reader admits every legal dash run and stops at a blank line", () => {
		const header = "| input | matches | note |";
		const data = "| `omp` | yes | token |";
		const twoRows = `${data}\n| \`aomp\` | no | glued |`;

		// Both legal delimiters, and both must leave exactly the data rows behind.
		expect(parsePinnedTable(`${header}\n| --- | --- | --- |\n${twoRows}`).length).toBe(2);
		expect(parsePinnedTable(`${header}\n|-|-|-|\n${twoRows}`).length).toBe(2);

		// A blank line ends the table. Without the non-empty clause this swallows it, and
		// the loop would carry on into whatever follows.
		expect(parsePinnedTable(`${header}\n| --- | --- | --- |\n${twoRows}\n`).length).toBe(2);

		// And a data row is never mistaken for a delimiter.
		expect(parsePinnedTable(`${header}\n| --- | --- | --- |\n${twoRows}`).map(r => r.input)).toEqual(["omp", "aomp"]);
	});
});
