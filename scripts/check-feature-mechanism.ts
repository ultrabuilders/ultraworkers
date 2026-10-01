#!/usr/bin/env bun
/**
 * R0/M4 — GATE. `docs/feature-mechanism.md` must keep pointing at things that
 * exist.
 *
 * WHY THIS IS A GATE AND NOT A DOC
 * --------------------------------
 * A feature→mechanism table is only worth more than a list of intentions if it
 * can be wrong. Written by hand with nothing reading it, it rots the moment a
 * mechanism is renamed: the row keeps asserting a behaviour, the proof file is
 * gone, and a reader who trusts the table is misled about the code they are
 * about to change. So the one invariant is checked mechanically — a row whose
 * `proof` names a file that does not exist turns this red.
 *
 * THE THREE DIRECTIONS THAT MUST BE RED
 * -------------------------------------
 * 1. A `proof` naming a missing file → red. The whole point.
 * 2. A `proof` of `none` with no reason, or over the registered cap → red.
 *    Without a cap a ledger's `none` count climbs one defensible row at a time
 *    and nothing ever goes red, which is how a discipline ledger dies while
 *    still looking correct.
 * 3. No table, or a table with no rows → red. An empty table satisfies every
 *    rule above, so without this the gate's cheapest way to go green is for
 *    someone to delete the rows — the same defect as a baseline that is
 *    regenerated before it is diffed.
 */

import * as path from "node:path";

const TABLE = path.join(import.meta.dir, "..", "docs", "feature-mechanism.md");

/**
 * The registered ceiling on `proof: none` rows. **The owner owns this number.**
 *
 * It is set to the count actually measured in the table today — all four rows
 * carry a real gate, so 0 — rather than to a round number that happens to be
 * generous. A ceiling above the truth would let the first `none` row land
 * silently, which is the exact drift the cap exists to stop. Raising it is a
 * one-line change and belongs in the same commit that adds the row.
 */
const NONE_CEILING = 0;

/** Print and exit. Returns `never` so call sites narrow correctly. */
function fail(lines: string[]): never {
	for (const line of lines) console.error(line);
	process.exit(1);
}

/** Every path git tracks, for resolving a bare test filename to its real path. */
async function trackedFiles(): Promise<Set<string>> {
	const proc = Bun.spawn(["git", "ls-files"], { stdout: "pipe", stderr: "pipe" });
	const out = await new Response(proc.stdout as ReadableStream<Uint8Array>).text();
	await proc.exited;
	return new Set(
		out
			.split("\n")
			.filter(line => line !== "")
			.map(line => line.replace(/^packages\/coding-agent\/test\//, "")),
	);
}

/**
 * Resolve one `proof` token to a tracked file.
 *
 * Rows name proofs the way a person reading a test suite names them:
 * `plugin-runtime-config-lock.test.ts`, or `config/settings-provenance-guard.test.ts`
 * relative to the test root. Both forms have to work, because a gate that only
 * accepts one spelling gets rewritten to the other and stops being a gate.
 */
function resolves(token: string, tracked: Set<string>): boolean {
	if (tracked.has(token)) return true;
	// A row may cite a path relative to the test root (`config/…`) or a bare
	// filename. Match on the trailing segment, against git's manifest rather than
	// the filesystem: an untracked file is not something this table should cite,
	// and a file a peer has just created but not staged is not yet a claim anyone
	// can check.
	const base = token.slice(token.lastIndexOf("/") + 1);
	for (const path of tracked) {
		if (path === base || path.endsWith(`/${base}`)) return true;
	}
	return false;
}

interface Row {
	feature: string;
	proof: string;
}

function parseRows(markdown: string): Row[] {
	const rows: Row[] = [];
	let inTable = false;
	for (const line of markdown.split("\n")) {
		if (!line.trimStart().startsWith("|")) {
			inTable = false;
			continue;
		}
		if (!inTable) {
			inTable = true;
			continue; // header row
		}
		const cells = line.split("|").slice(1, -1);
		if (cells.length < 3) continue;
		const feature = cells[0]!.trim();
		const proof = cells[2]!.trim();
		// The `| --- | --- |` separator is the only row with no content.
		if (feature === "" || /^-+$/.test(cells[1]!.trim())) continue;
		rows.push({ feature, proof });
	}
	return rows;
}

let markdown: string;
try {
	markdown = await Bun.file(TABLE).text();
} catch {
	fail([
		`feature-mechanism gate: NO TABLE at ${TABLE}`,
		"An empty table passes every other rule here, so a missing one cannot mean 'nothing to check'.",
		"Restore the file, or write it deliberately and review the diff.",
	]);
}

const rows = parseRows(markdown);
if (rows.length === 0) {
	fail([
		`feature-mechanism gate: ${TABLE} has no rows.`,
		"Every rule below is satisfied by an empty table, so deleting the rows is",
		"otherwise the cheapest way to turn this gate green.",
	]);
}

const tracked = await trackedFiles();
const missing: string[] = [];
const unexplainedNone: string[] = [];
let noneCount = 0;

for (const row of rows) {
	if (/^`?none`?\b/i.test(row.proof)) {
		noneCount++;
		// `none` alone is not an answer; `none` plus a reason is.
		if (
			row.proof
				.replace(/^`?none`?/i, "")
				.replace(/^[\s—:-]+/, "")
				.trim() === ""
		) {
			unexplainedNone.push(row.feature);
		}
		continue;
	}
	// Every backticked token in the cell is a cited path.
	const tokens = [...row.proof.matchAll(/`([^`]+)`/g)].map(m => m[1]!.trim());
	if (tokens.length === 0) {
		missing.push(`${row.feature} — proof cell cites no file: "${row.proof}"`);
		continue;
	}
	for (const token of tokens) {
		if (!resolves(token, tracked)) missing.push(`${row.feature} — ${token}`);
	}
}

const problems = [
	...missing.map(entry => `  proof does not resolve: ${entry}`),
	...unexplainedNone.map(feature => `  proof is "none" with no reason: ${feature}`),
];
if (noneCount > NONE_CEILING) {
	problems.push(`  ${noneCount} \`none\` row(s) exceed the registered ceiling of ${NONE_CEILING}`);
}

if (problems.length > 0) {
	fail([
		`feature-mechanism gate: ${problems.length} problem(s) in ${TABLE}`,
		...problems,
		"",
		"A row pointing at a deleted file is a stale claim, not a harmless one:",
		"fix the row, or — if the mechanism was deliberately replaced — record the new",
		`one with the date. Ceiling owner: NONE_CEILING in ${path.basename(import.meta.filename)}.`,
	]);
}

console.log(
	`feature-mechanism gate: green — ${rows.length} row(s), every proof resolves, ` +
		`${noneCount}/${NONE_CEILING} \`none\`.`,
);
