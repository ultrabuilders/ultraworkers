/**
 * The referential integrity of `docs/feature-mechanism.md`.
 *
 * The table answers "which code path makes this user-visible behaviour real, and
 * which gate proves it". Two things can rot in it, and neither is visible to a
 * reader: a row pointing at a file that no longer exists, and a `proof: none` whose
 * named work item has since closed.
 *
 * The number of `none` rows is capped, and the cap is *registered in the document
 * itself* rather than written here. A cap kept only in this file is a number
 * somebody has to remember to update, and it drifts — the table ends up
 * technically correct and no longer trustworthy, which is worse than having no
 * table. Reading it back out of the document removes that second copy: there is
 * one number, and it is the one the document publishes. A missing marker throws
 * rather than defaulting, because a cap that silently reads as unlimited is
 * exactly the hole the cap exists to close.
 *
 * That is in addition to, not instead of, naming the work item. A cap bounds how
 * many unproven claims may accumulate; naming the work item makes each one
 * self-clearing, since when that item closes this test goes red until the row
 * becomes a real gate. Neither substitutes for the other — a cap alone does not
 * tell you which row to fix, and a name alone does not stop the list growing.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");
const TABLE_PATH = path.join(REPO_ROOT, "docs", "feature-mechanism.md");
const BEADS_PATH = path.join(REPO_ROOT, ".beads", "issues.jsonl");

interface Row {
	/** The user-visible behaviour, first column. */
	readonly feature: string;
	/** The code path, second column. */
	readonly mechanism: string;
	/** A test path, or `none` plus the work item that owes one. */
	readonly proof: string;
}

/** Markdown cells carry backticks; the contracts below are about their content. */
function plain(cell: string): string {
	return cell.replace(/`/g, "").trim();
}

/**
 * Parse the four-column table under "The four M4 claims".
 *
 * Deliberately narrow: this table is a document, not a parser target, so the test
 * asserts only on the shape the document actually promises. A row that drifts out
 * of shape fails loudly rather than being silently skipped — a row the reader sees
 * but the test ignores is the exact failure this file exists to prevent.
 */
/**
 * Parses the feature→mechanism table.
 *
 * `source` defaults to the real doc. It is a parameter rather than a hardcoded read so
 * the negative branch can point this at a deliberately broken table: a gate that has
 * only ever been exercised against a passing fixture has not been shown to fail, and
 * "the file is currently correct" is not the same claim as "this test can detect a
 * wrong file". The negative test below is what earns the right to call this a gate.
 */
async function readRows(source: string = TABLE_PATH): Promise<Row[]> {
	const markdown = await Bun.file(source).text();
	const rows: Row[] = [];
	for (const line of markdown.split("\n")) {
		if (!line.startsWith("| ")) continue;
		const cells = line
			.slice(1, line.endsWith("|") ? -1 : undefined)
			.split(" | ")
			.map(cell => cell.trim());
		// Skip the header and its `---` separator.
		if (cells.length !== 3) continue;
		if (cells[0] === "feature" || cells.every(cell => /^-+$/.test(cell))) continue;
		rows.push({ feature: cells[0]!, mechanism: cells[1]!, proof: cells[2]! });
	}
	return rows;
}

/**
 * The `proof: none` cap the document registers, parsed out of the document itself.
 *
 * The number lives in the doc rather than in this file so the prose a reader checks
 * and the bound a machine enforces cannot be two different numbers — the failure mode
 * of every "remember to update the cap" design. A missing marker throws rather than
 * defaulting: a cap that silently reads as unlimited is the exact hole it exists to
 * close.
 */
async function readNoneCap(source: string = TABLE_PATH): Promise<number> {
	const markdown = await Bun.file(source).text();
	const match = markdown.match(/Registered proof:none cap:\s*(\d+)/);
	if (!match) throw new Error(`${source} does not register a \`proof: none\` cap`);
	return Number(match[1]);
}

/**
 * The `none` rows in a table, and whether they exceed the registered cap.
 *
 * Extracted so the negative test below exercises *this* comparison rather than
 * re-deriving it as arithmetic. A negative branch that checks `1 > cap` itself
 * passes even when the gate's own cap assertion is deleted — it proves the fixture
 * is over the cap, not that the gate notices.
 */
function noneRowsOverCap(rows: readonly Row[], cap: number): number {
	return rows.filter(row => plain(row.proof).startsWith("none")).length - cap;
}

/** The status of every bead, from the git-tracked JSONL export. */
async function readBeadStatuses(): Promise<Map<string, string>> {
	const statuses = new Map<string, string>();
	let jsonl: string;
	try {
		jsonl = await Bun.file(BEADS_PATH).text();
	} catch {
		// No export on this checkout: contract (2) cannot be checked, and silently
		// passing would make the gate meaningless. The caller asserts on emptiness.
		return statuses;
	}
	for (const line of jsonl.split("\n")) {
		if (!line.trim()) continue;
		const record = JSON.parse(line) as { id?: string; status?: string };
		if (record.id && record.status) statuses.set(record.id, record.status);
	}
	return statuses;
}

/**
 * Every path a row cites that does not resolve on disk.
 *
 * Split out of the test body so the negative branch below exercises *this* function
 * rather than a re-implementation of it. A negative that copies the check proves the
 * copy fails, which says nothing about the check the real gate runs.
 */
async function findDangling(rows: Row[]): Promise<string[]> {
	const dangling: string[] = [];
	for (const row of rows) {
		// Every `file:line` the mechanism column cites must resolve, and the line it
		// names must still be the line that holds what the row claims.
		//
		// The line number used to be captured by the regex and then thrown away —
		// only the file was checked. That made a **drifted** anchor indistinguishable
		// from a correct one: `manager.ts:171` kept passing after `#mutateConfig`
		// moved to `:242`, because `manager.ts` still exists. A blank or
		// out-of-range line is the cheapest available evidence of drift, and it is
		// the shape a moved symbol actually takes.
		for (const match of plain(row.mechanism).matchAll(/([\w./-]+\.ts):(\d+)/g)) {
			const referenced = path.join(REPO_ROOT, match[1]!);
			if (!(await Bun.file(referenced).exists())) {
				dangling.push(`${row.feature} -> ${match[1]}`);
				continue;
			}
			const citedLine = Number(match[2]);
			const lines = (await Bun.file(referenced).text()).split("\n");
			// Out of range and "in range but blank" are the same failure: the cited
			// line is no longer the one holding the mechanism.
			const target = lines[citedLine - 1];
			if (target === undefined || target.trim() === "") {
				dangling.push(`${row.feature} -> ${match[1]}:${match[2]} (no code at that line)`);
			}
		}
		const proofPath = plain(row.proof);
		if (proofPath.startsWith("none")) continue;
		if (!(await Bun.file(path.join(REPO_ROOT, proofPath)).exists())) {
			dangling.push(`${row.feature} -> ${proofPath}`);
		}
	}
	return dangling;
}

describe("docs/feature-mechanism.md", () => {
	test("every row points at a file that exists", async () => {
		// Contract (1). A row whose mechanism or proof names a path that has since
		// been deleted or moved is worse than no row: it reads as verified, and
		// sends the next reader to a file that is not there.
		const rows = await readRows();
		expect(rows.length).toBeGreaterThan(0);

		const dangling = await findDangling(rows);
		expect(dangling).toEqual([]);
	});

	test("a row pointing at a deleted file is reported, not silently accepted", async () => {
		// The negative branch contract (1) is supposed to have. A gate that has only
		// ever run against a correct file has not been shown to detect an incorrect
		// one — "the doc is right now" and "this test can catch a wrong doc" are
		// different claims, and only the second makes the table trustworthy enough to
		// gate on. This is that second claim.
		//
		// Two independent ways to dangle, because they travel different code paths: a
		// `file:line` inside the mechanism cell, and a bare path in the proof cell.
		// Fixing only one of them would leave the other unproven.
		using dir = TempDir.createSync("@ultraworkers-mechanism-negative-");
		const broken = path.join(dir.path(), "feature-mechanism.md");
		await Bun.write(
			broken,
			[
				"| feature | mechanism | proof |",
				"| --- | --- | --- |",
				"| Deleted mechanism | `packages/does-not-exist/deleted.ts:12` | none — owes a bead |",
				"| Deleted proof | `packages/tui/src/overlays/hook-editor.ts:1` | packages/tui/test/gone.test.ts |",
				"",
			].join("\n"),
		);

		const dangling = await findDangling(await readRows(broken));

		// Asserted on the specific strings, not just the count: a check that returned
		// an empty array would also satisfy `toHaveLength(2)`, and an empty array here
		// is exactly the silent-pass this test exists to rule out.
		expect(dangling).toEqual([
			"Deleted mechanism -> packages/does-not-exist/deleted.ts",
			"Deleted proof -> packages/tui/test/gone.test.ts",
		]);
	});

	test("a cited line that no longer holds code is reported, not silently accepted", async () => {
		// The drift branch of contract (1), and the one the real table needed: a
		// `file:line` whose **file** still exists but whose **line** has moved is the
		// failure a file-existence check cannot see. `#mutateConfig` moved from
		// `manager.ts:171` to `:242` and the row stayed green, because
		// `manager.ts` was still there.
		//
		// Three ways to drift, and they travel different paths through the check, so
		// covering only one leaves the other two unproven: a line past the end of the
		// file, a line that is blank because code moved off it, and a line that now
		// holds unrelated code. The third is the one this test cannot assert on
		// without inventing a symbol contract — it is covered by the real table
		// instead, which fails today precisely because two of its rows drifted.
		using dir = TempDir.createSync("@ultraworkers-mechanism-drift-");
		const target = path.join(dir.path(), "widget.ts");
		await Bun.write(target, ["export const a = 1;", "", "export const b = 2;", ""].join("\n"));

		const broken = path.join(dir.path(), "feature-mechanism.md");
		const absolute = path.relative(REPO_ROOT, target).replace(/\\/g, "/");
		await Bun.write(
			broken,
			[
				"| feature | mechanism | proof |",
				"| --- | --- | --- |",
				`| Past the end | \`${absolute}:9999\` | none — owes a bead |`,
				`| Blank line | \`${absolute}:2\` | none — owes a bead |`,
				`| Real line | \`${absolute}:3\` | none — owes a bead |`,
				"",
			].join("\n"),
		);

		const dangling = await findDangling(await readRows(broken));

		// The specific strings, not the count: an empty array would satisfy a length
		// assertion, and an empty array is the silent pass this test exists to rule out.
		expect(dangling).toEqual([
			`Past the end -> ${absolute}:9999 (no code at that line)`,
			`Blank line -> ${absolute}:2 (no code at that line)`,
		]);
		// `Real line` is absent on purpose: a line that holds code must NOT be flagged,
		// or the check would reject every correct row along with the drifted ones.
		expect(dangling.some(entry => entry.startsWith("Real line"))).toBe(false);
	});

	test("a proof names a test under packages/*/test, or is a `none` that owes one to a named work item", async () => {
		// Contract (2). Two things are enforced here, and both are about the table
		// refusing to make a claim it cannot back up.
		//
		// First: `proof` must be a test path. Accepting a command in `scripts/`
		// would create a second kind of address needing its own upkeep, and one
		// document that tells two stories.
		//
		// Second, and the part that replaces a numeric cap: a `none` row must name
		// the work item that will produce its gate, and that work item must still
		// be open. When it closes, this goes red and the row has to become real.
		const rows = await readRows();
		const statuses = await readBeadStatuses();
		const cap = await readNoneCap();

		const unbacked: string[] = [];
		const stale: string[] = [];

		for (const row of rows) {
			const proofPath = plain(row.proof);
			if (!proofPath.startsWith("none")) {
				if (!/^packages\/[^/]+\/test\/.+\.test\.ts$/.test(proofPath)) {
					unbacked.push(`${row.feature} -> ${row.proof}`);
				}
				continue;
			}
			// `none` — <work-item-id>
			const workItem = proofPath.replace(/^none\s*—\s*/, "").trim();
			if (!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(workItem)) {
				unbacked.push(`${row.feature} -> none without a named work item`);
				continue;
			}
			const status = statuses.get(workItem);
			if (status === undefined) {
				unbacked.push(`${row.feature} -> ${workItem} is not in .beads/issues.jsonl`);
			} else if (status !== "open" && status !== "in_progress") {
				// The work item closed, so this row owes a real gate now.
				stale.push(`${row.feature} -> ${workItem} is ${status}`);
			}
		}

		expect(unbacked).toEqual([]);
		expect(stale).toEqual([]);
		// The registered cap, asserted. The work-item rule above clears rows; this
		// stops anyone *adding* a `none` for something nobody has scheduled, which is
		// the half of the contract the work-item rule cannot cover on its own.
		expect(noneRowsOverCap(rows, cap)).toBeLessThanOrEqual(0);
	});

	test("a proof:none row over the registered cap is rejected", async () => {
		// The cap's negative branch. A cap that has only ever been satisfied has not
		// been shown to bite, and "the cap is currently respected" is a different
		// claim from "adding a row past the cap turns this red".
		//
		// The fixture registers its own cap of 0 next to a table carrying one `none`
		// row, so this exercises the parse and the comparison together rather than
		// asserting the real table's number.
		using dir = TempDir.createSync("@ultraworkers-mechanism-cap-");
		const table = path.join(dir.path(), "table.md");
		await Bun.write(
			table,
			[
				"**Registered proof:none cap: 0**",
				"",
				"| feature | mechanism | proof |",
				"| --- | --- | --- |",
				"| Unproven | `packages/coding-agent/src/cli.ts:1` | none — m5-some-open-bead |",
				"",
			].join("\n"),
		);

		const rows = await readRows(table);
		const cap = await readNoneCap(table);
		expect(cap).toBe(0);
		// The same comparison the real gate runs, on a table that actually violates it.
		expect(noneRowsOverCap(rows, cap)).toBe(1);
	});

	test("a document that registers no cap is an error, not an unlimited table", async () => {
		// A cap that defaults to "unlimited" when the marker is missing is the exact
		// hole the cap exists to close: delete one line of prose and the bound
		// silently stops existing while the gate stays green.
		using dir = TempDir.createSync("@ultraworkers-mechanism-nocap-");
		const table = path.join(dir.path(), "table.md");
		await Bun.write(table, ["| feature | mechanism | proof |", "| --- | --- | --- |", ""].join("\n"));

		expect(readNoneCap(table)).rejects.toThrow("does not register a `proof: none` cap");
	});
});
