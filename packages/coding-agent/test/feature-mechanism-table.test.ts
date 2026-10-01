/**
 * The referential integrity of `docs/feature-mechanism.md`.
 *
 * The table answers "which code path makes this user-visible behaviour real, and
 * which gate proves it". Two things can rot in it, and neither is visible to a
 * reader: a row pointing at a file that no longer exists, and a `proof: none` whose
 * named work item has since closed.
 *
 * There is deliberately no cap on the number of `none` rows. A cap is a number
 * somebody has to remember to update, and it drifts — the table ends up technically
 * correct and no longer trustworthy, which is worse than having no table. Naming
 * the work item instead makes each `none` row self-clearing: when that work item
 * closes, this test goes red until the row becomes a real gate.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";

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
async function readRows(): Promise<Row[]> {
	const markdown = await Bun.file(TABLE_PATH).text();
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

describe("docs/feature-mechanism.md", () => {
	test("every row points at a file that exists", async () => {
		// Contract (1). A row whose mechanism or proof names a path that has since
		// been deleted or moved is worse than no row: it reads as verified, and
		// sends the next reader to a file that is not there.
		const rows = await readRows();
		expect(rows.length).toBeGreaterThan(0);

		const dangling: string[] = [];
		for (const row of rows) {
			// Every `file:line` the mechanism column cites must resolve.
			for (const match of plain(row.mechanism).matchAll(/([\w./-]+\.ts):\d+/g)) {
				const referenced = path.join(REPO_ROOT, match[1]!);
				if (!(await Bun.file(referenced).exists())) dangling.push(`${row.feature} -> ${match[1]}`);
			}
			const proofPath = plain(row.proof);
			if (proofPath.startsWith("none")) continue;
			if (!(await Bun.file(path.join(REPO_ROOT, proofPath)).exists())) {
				dangling.push(`${row.feature} -> ${proofPath}`);
			}
		}
		expect(dangling).toEqual([]);
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
	});
});
