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

const isSeparator = (line: string) => cells(line).every(c => /^-{3,}$/.test(c));

/** Read the `input | matches | …` table out of the README, wherever it sits. */
async function readPinnedTable(): Promise<PinnedRow[]> {
	const readme = await Bun.file(path.join(import.meta.dir, "README.md")).text();
	const lines = readme.split("\n");

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
		if (isSeparator(line)) continue;
		const [input, matches] = cells(line);
		if (input === undefined || matches === undefined) continue;
		rows.push({
			input: input.replace(/^`|`$/g, ""),
			claimed: matches.replace(/\*/g, "").toLowerCase() === "yes",
		});
	}
	return rows;
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
});
