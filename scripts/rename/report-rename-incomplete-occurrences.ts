/**
 * Report-only: what is actually LEFT in each `rename` row, and what the row says it is.
 *
 * ## Why this exists
 *
 * `--stage=post` reports `rename-incomplete` as a count per file:
 *
 *     FAIL rename-incomplete packages/tui/src/terminal.ts: 1 left
 *
 * That is enough to gate and not enough to act on. "1 left" does not say *which
 * token on which line*, and — the reason this script exists — it does not say
 * **what the row claims that token is**. A row is a sentence in the
 * `reason` column, and the sentence can name the wrong thing: a `rename` row
 * whose reason calls a marker "an omp read truncation notice", when the marker
 * is emitted natively as a bracketed `[Showing N of M lines]` row that carries
 * no product name at all. Whoever picks that row up interpolates `APP_NAME`
 * into a sentence that was already false, and the result *looks maintained*
 * because it now reads as derived from a constant.
 *
 * So the unit worth printing is not the file. It is the pair
 * **(remaining occurrence, row reason)** — you cannot classify one without the
 * other, and the gate prints neither together.
 *
 * ## Counting is imported, not retyped
 *
 * `countRename` is imported from the gate itself. A second copy of the pinned
 * expression here would be a second thing to drift, which is the exact defect
 * this whole exercise exists to find — and a report whose numbers disagree with
 * the gate is worse than no report, because it looks like a second opinion.
 * The reconciliation line at the bottom is the control: if this script's total
 * ever differs from `--stage=post`, the difference is printed rather than
 * smoothed over.
 *
 * ## What is excluded
 *
 * - `.claude/worktrees/**`. A peer's worktree is a second checkout of this repo
 *  sitting inside it; scanning one double-counts every path it shares with the
 *  main tree. Paths are matched against the table's repo-relative form and any
 *  worktree path is refused outright rather than counted.
 * - Rows whose file is missing from disk: reported as their own bucket, never
 *  dropped, so the total still reconciles.
 *
 * Run: `bun scripts/rename/report-rename-incomplete-occurrences.ts [--detail]`
 */
import * as path from "node:path";
import { countRename, parseTable } from "./check-disposition";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");
const TABLE = path.join(REPO_ROOT, "scripts/rename/disposition.tsv");
const WORKTREE_PREFIX = ".claude/worktrees/";

const detail = process.argv.includes("--detail");
const shapes = process.argv.includes("--shapes");

const table = await Bun.file(TABLE).text();
const { rows, problems } = parseTable(table);
if (problems.length > 0) {
	console.error(`table parse reported ${problems.length} problem(s); first: ${problems[0]}`);
}

const renameRows = rows.filter(row => row.disposition === "rename");

interface Open {
	readonly path: string;
	readonly declared: number;
	readonly actual: number;
	readonly reason: string;
	readonly lines: readonly string[];
}

const open: Open[] = [];
const completed: string[] = [];
const missing: string[] = [];
const declaresZero: string[] = [];

/**
 * Shape buckets for a remaining occurrence.
 *
 * The point of bucketing is that `rename` is not one job. An occurrence that reads
 * `omp plugin list` names a command, and interpolating `APP_NAME` there is the whole
 * intended fix. An occurrence that reads `~/.omp/wt` or `st.cfg.agent === "omp"` is
 * NOT naming the binary — it is a directory contract, a field name, or a value
 * something compares for equality — and substituting the product name into it
 * changes behaviour rather than fixing a label.
 *
 * So the sweep cannot be run as "replace every `omp` with APP_NAME". The bucket is
 * what decides whether a row is rename work or a decision that needs an owner.
 *
 * LOCATING the token below is deliberately a plain scan and not the gate's pinned
 * expression: `PINNED` is not exported, and retyping it here would be the second
 * copy that drifts. The authoritative count is always `countRename` above; this only
 * decides which bucket a line is filed under, and the buckets are reported as
 * line counts, never added to the occurrence total.
 */
const SHAPES = ["command", "dir", "hyphen", "dotted", "underscore", "eq-compare", "bare", "unknown"] as const;
type Shape = (typeof SHAPES)[number];
const shapeCounts = new Map<Shape, number>();
const shapeSamples = new Map<Shape, string[]>();
/** Characters that close a token rather than continue it: `"omp"`, `` `omp` ``, `(omp)`, `x, omp;`. */
const BARE_TERMINATORS = new Set(['"', "'", "`", ")", "}", "]", ",", ";", ":"]);

function classifyLine(line: string, relPath: string): void {
	const body = line.includes("|") ? (line.split("|").slice(1).join("|") ?? "") : line;
	for (const match of body.matchAll(/(?<![A-Za-z0-9_])omp(?![A-Za-z0-9_])/g)) {
		const at = match.index ?? 0;
		const before = body[at - 1] ?? "";
		const after = body[at + 3] ?? "";
		const nextNonSpace = body.slice(at + 3).match(/^\s+(\S)/)?.[1] ?? "";
		let shape: Shape;
		// Equality first: in `agent === "omp"` the token's immediate neighbours are
		// both quotes, so a check on them alone can never fire — the comparison is
		// what makes this shape dangerous, and it lives a few characters away.
		const window = body.slice(Math.max(0, at - 24), at + 24);
		if (window.includes("==") || window.includes(".includes(") || window.includes(".startsWith("))
			shape = "eq-compare";
		else if (after === "/" || before === "/") shape = "dir";
		else if (after === "-") shape = "hyphen";
		else if (after === ".") shape = "dotted";
		else if (after === "_") shape = "underscore";
		else if (/\s/.test(after) && /[A-Za-z]/.test(nextNonSpace)) shape = "command";
		else if (after === "" || BARE_TERMINATORS.has(after)) shape = "bare";
		else shape = "unknown";
		shapeCounts.set(shape, (shapeCounts.get(shape) ?? 0) + 1);
		const samples = shapeSamples.get(shape) ?? [];
		if (samples.length < 4) samples.push(`${relPath}: ${body.trim().slice(0, 96)}`);
		shapeSamples.set(shape, samples);
	}
}
let declaredSum = 0;
let actualSum = 0;

for (const row of renameRows) {
	const relPath = row.path;
	if (relPath.startsWith(WORKTREE_PREFIX)) {
		// A peer's worktree is a second checkout inside this one. Counting it would
		// report the same token twice and make every total here a lie.
		missing.push(`${relPath} (refused: inside a peer's worktree)`);
		continue;
	}
	let text: string;
	try {
		text = await Bun.file(path.join(REPO_ROOT, relPath)).text();
	} catch {
		missing.push(`${relPath} (not on disk)`);
		continue;
	}
	const actual = countRename(text);
	actualSum += actual;
	if (actual === 0) {
		completed.push(relPath);
		continue;
	}
	declaredSum += row.hits;
	// A row that declares zero while the file still carries occurrences is a row
	// that has already been closed by a sweep without the rename happening. It is
	// invisible to any filter on `hits > 0`, which is how it stayed invisible here.
	if (row.hits === 0) declaresZero.push(relPath);
	// The file-level count above is authoritative. The per-line scan is illustration
	// only — a match could in principle straddle a line break — so the two are never
	// summed together.
	const lines = text
		.split("\n")
		.flatMap((line, index) => (countRename(line) > 0 ? [String(index + 1).padStart(5) + " | " + line.trim()] : []));
	if (shapes) for (const line of lines) classifyLine(line, relPath);
	open.push({ path: relPath, declared: row.hits, actual, reason: row.reason, lines });
}

const head = (await Bun.$`git rev-parse --short HEAD`.cwd(REPO_ROOT).text()).trim();
console.log(`HEAD ${head} · table ${rows.length} rows · rename rows: ${renameRows.length}\n`);

for (const entry of open.sort((a, b) => b.actual - a.actual || a.path.localeCompare(b.path))) {
	console.log(`${String(entry.actual).padStart(3)} left (declares ${entry.declared})  ${entry.path}`);
	if (detail) {
		console.log(`      reason: ${entry.reason}`);
		for (const line of entry.lines) console.log(`      ${line}`);
	}
}

console.log(`\nrename rows                     ${renameRows.length}`);
console.log(`  still open                    ${open.length}`);
console.log(`  already at zero               ${completed.length}`);
console.log(`  file missing / refused        ${missing.length}`);
console.log(`  open but declaring hits=0     ${declaresZero.length}`);
console.log(`  declared hits total (open)    ${declaredSum}`);
console.log(`  countRename total (open)      ${actualSum}`);
const accounted = open.length + completed.length + missing.length;
console.log(
	`\nreconciliation: ${accounted} accounted of ${renameRows.length} rename rows — ` +
		`${accounted === renameRows.length ? "nothing unaccounted" : `UNACCOUNTED ${renameRows.length - accounted}`}`,
);
console.log(
	`occurrences: ${open.reduce((sum, entry) => sum + entry.actual, 0)} across ${open.length} open files ` +
		`(the per-line scan above is illustration; countRename on the whole file is the authority)`,
);

if (missing.length > 0) {
	console.log(`\nmissing or refused:`);
	for (const entry of missing.sort()) console.log(`  ${entry}`);
}

if (shapes) {
	let shapeTotal = 0;
	for (const shape of SHAPES) shapeTotal += shapeCounts.get(shape) ?? 0;
	console.log(`\noccurrence shapes (line counts, not the occurrence total above):`);
	for (const shape of SHAPES) {
		const count = shapeCounts.get(shape) ?? 0;
		if (count === 0) continue;
		console.log(`  ${shape.padEnd(12)} ${count}`);
		for (const sample of shapeSamples.get(shape) ?? []) console.log(`      ${sample}`);
	}
	console.log(`\nshape total ${shapeTotal} — locate-scan only; the authority is countRename = ${actualSum}`);
}

// Report-only: landing or amending any of these rows is a separate, deliberate step,
// and a4 has asked that nobody write rename rows while the table is adjudicated.
process.exit(0);
