#!/usr/bin/env bun
/**
 * CI gate: every old-brand literal left in a test file must carry a disposition row.
 *
 * The problem this exists for is not "a literal is present" — most of them are
 * correct on purpose, because a wire contract, a legacy directory name, or a
 * negative assertion has to keep the old spelling or it stops testing anything.
 * The problem is that the *reason* lives in a human's head. A sweep that "cleans up"
 * a test which asserts a legacy path has silently deleted the assertion, and the suite
 * stays green because nothing was there to fail.
 *
 * So this gate does not judge the literals. It enforces that each one is *accounted
 * for*: every hit must be matched by a row in `scripts/rename/disposition.tsv` whose
 * `reason` is non-empty. The judgement stays with the person who wrote the row, and
 * the cost of forgetting is a red gate rather than a quietly weakened test.
 *
 * A hit that no row covers is reported and exits 1. An empty `reason` is treated as no
 * row at all, because "the row exists" is not the contract — "someone can say why" is.
 *
 * Scoped to test sources on purpose. The src-side census belongs to
 * `scripts/rename/check-disposition.ts`, which owns the table's schema; this gate reads
 * that table and never writes it, so the two cannot disagree about what a row means.
 *
 * Exits by setting `process.exitCode` rather than calling `process.exit()`. The
 * difference is observable: `exit()` tears the process down immediately, so a write
 * still queued from a pending promise never reaches the pipe — the report a CI reader
 * needs most is the one that gets truncated. Measured here: a `setTimeout` write
 * survives `exitCode` and is dropped by `exit`. Every read below is awaited, so this
 * file is not currently losing output, but the hazard is one edit away and the fix
 * costs one word.
 */

import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const TABLE_PATH = path.join(REPO_ROOT, "scripts", "rename", "disposition.tsv");

/**
 * The old-brand spellings, as the exact source text a test would contain.
 *
 * These are literals rather than a loose "omp" search on purpose. A bare `omp` matches
 * variable names, substrings of unrelated words, and the package's own scope, and a gate
 * that reports those is a gate people learn to skip. Each entry below is a spelling where
 * the *old name is the whole token* — a quoted value, a prefix, or a path segment — so a
 * hit is always a real decision point.
 */
const PATTERNS: readonly { label: string; needle: string }[] = [
	{ label: '".omp"', needle: '".omp"' },
	{ label: '"omp"', needle: '"omp"' },
	{ label: "__omp_worker_", needle: "__omp_worker_" },
	{ label: "_omp/", needle: "_omp/" },
	{ label: "omp-export-theme", needle: "omp-export-theme" },
	{ label: '"oh-my-pi"', needle: '"oh-my-pi"' },
];

/** One row of the disposition table, as this gate consumes it. */
interface Row {
	scope: string;
	path: string;
	hits: string;
	disposition: string;
	reason: string;
}

/**
 * Reads the table, skipping its header.
 *
 * A missing or unparseable table is an error rather than an empty result: "no rows"
 * would make every hit look unaccounted-for, which is a confusing way to learn the file
 * moved. Saying so directly costs one line and names the actual problem.
 */
async function readRows(): Promise<Row[]> {
	const file = Bun.file(TABLE_PATH);
	if (!(await file.exists())) {
		console.error(`ci-rename-test-literals: no table at ${path.relative(REPO_ROOT, TABLE_PATH)}`);
		// Return rather than fall through. Setting `exitCode` does not stop execution, so
		// continuing would read a missing file, report every hit as unaccounted-for, and
		// then overwrite this 2 with a 1 — telling CI "your table is missing" as "you have
		// unclassified rows". Distinct failures deserve distinct codes.
		return [];
	}
	const lines = (await file.text()).split("\n");
	const rows: Row[] = [];
	for (const [index, line] of lines.entries()) {
		if (index === 0 || !line.trim()) continue; // header, then blanks
		const cells = line.split("\t");
		rows.push({
			scope: cells[0] ?? "",
			path: cells[1] ?? "",
			hits: cells[2] ?? "",
			disposition: cells[3] ?? "",
			reason: cells[4] ?? "",
		});
	}
	return rows;
}

/** A file that holds at least one old-brand literal, with what it holds. */
interface Hit {
	file: string;
	pattern: string;
	line: number;
	text: string;
}

async function collectHits(): Promise<Hit[]> {
	const hits: Hit[] = [];
	const glob = new Bun.Glob("packages/*/test/**/*.ts");
	for await (const relPath of glob.scan({ cwd: REPO_ROOT, dot: true })) {
		const text = await Bun.file(path.join(REPO_ROOT, relPath)).text();
		const lines = text.split("\n");
		for (const [index, line] of lines.entries()) {
			for (const { label, needle } of PATTERNS) {
				if (line.includes(needle)) hits.push({ file: relPath, pattern: label, line: index + 1, text: line.trim() });
			}
		}
	}
	return hits;
}

/**
 * Whether the table accounts for this hit.
 *
 * Keyed on file only, not on file+line: line numbers move every time an unrelated test is
 * added above, and a row that has to be re-anchored on each such edit is a row that will
 * be deleted rather than updated. The row's `reason` is what carries the judgement, so it
 * is the reason's presence — not its precision — that this checks.
 */
function isAccounted(hit: Hit, rows: Row[]): boolean {
	return rows.some(row => row.path === hit.file && row.reason.trim() !== "");
}

const rows = await readRows();
if (rows.length === 0) {
	// `readRows` reports exactly one cause — the file is missing. An existing table that
	// parsed to zero rows reaches here by the other route, and it used to leave no trace at
	// all: two empty streams and a red CI, with nothing for a reader to start from. The
	// comment this replaces claimed `readRows` had already said why, and it had not.
	//
	// The distinction is worth a syscall on the failure path: both are "unusable table", but
	// only one of them is fixable by restoring a file, and telling those apart is the whole
	// point of a diagnostic.
	if (await Bun.file(TABLE_PATH).exists()) {
		console.error(
			`ci-rename-test-literals: ${path.relative(REPO_ROOT, TABLE_PATH)} exists but has no rows — a header on its own matches nothing`,
		);
	}
	process.exit(2);
}

const hits = await collectHits();

if (hits.length === 0) {
	console.error("ci-rename-test-literals: no old-brand literals in test sources — the scan is not seeing the tree");
	// Zero hits means the scan is broken, not that the tree is clean: a glob that
	// silently matched nothing would report a perfect score forever.
	process.exit(2);
}

const unaccounted = hits.filter(hit => !isAccounted(hit, rows));

for (const hit of unaccounted) {
	console.error(`${hit.file}:${hit.line}  ${hit.pattern}  ${hit.text.slice(0, 100)}`);
}

const files = new Set(hits.map(hit => hit.file)).size;
const perFile = new Map<string, number>();
for (const hit of hits) perFile.set(hit.file, (perFile.get(hit.file) ?? 0) + 1);
const perFileSummary = [...perFile.entries()]
	.sort((a, b) => b[1] - a[1])
	.map(([file, count]) => `${file}=${count}`)
	.join(" ");
console.log(
	`ci-rename-test-literals: ${hits.length} hit(s) across ${files} test file(s); ` +
		`${unaccounted.length} without a disposition row carrying a reason`,
);
if (unaccounted.length > 0) process.exitCode = 1;
// The per-file counts are visibility, not a gate. A file that already has a row is
// covered, so a literal added to it later raises no error — the count moving from 4 to 6
// in the log is the only signal that it happened. Anyone reviewing a rename can diff
// this line against the previous run and see which files grew.
console.log(perFileSummary);
