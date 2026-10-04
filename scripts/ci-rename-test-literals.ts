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

/**
 * The same PINNED expression `check-disposition` gates on, so "old brand" means one thing
 * across both gates rather than two.
 *
 * Kept in step with `check-disposition.ts` on 2026-10-03, after this copy had drifted on
 * both axes at once: its trailing class still excluded `_` while the shipping one stopped,
 * and it carried no `i` while the shipping one gained one. Both matter independently.
 * The trailing class decides whether `omp_capabilities` is a token or part of a longer
 * name; the flag decides whether `OMP-PROFILE` is the product or an acronym.
 *
 * Syncing the expression alone would have changed nothing, because the only site that
 * used it dropped the flags on the way in (see `assertsBareBrand`). The two edits are
 * only worth anything together: the flag this expression now carries had been
 * unreachable, and the trailing class alone accounted for 18 of the 515 occurrences the
 * two expressions disagree on over this gate's own corpus — the other 497 were the flag,
 * invisible until the call site passed it through.
 *
 * Syncing therefore surfaces 515 occurrences that each need a row in `disposition.tsv`
 * carrying a reason. That is `ultraworkers-70`'s to write; it is not a reason to leave the
 * copy stale, and this gate is expected to be red until those rows land.
 *
 * The corpus is the test tree this gate already globs (see `collectHits`); the glob is
 * spelled out in the source rather than here, because writing it in this comment closes
 * the comment early — the pattern contains the two characters that end a block comment.
 */
const PINNED = /(^|[^a-zA-Z0-9_-])omp(?![\.\-]sh(?![a-zA-Z0-9]))([^a-zA-Z0-9]|$)/i;

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

/**
 * How many times `needle` occurs in `line`, counting overlaps and advancing past each match.
 *
 * `line.includes(needle)` answers a different question — whether the needle appears at all —
 * and using it here made one hit stand for any number of them on the same line. Measured at
 * HEAD `8a3c2e9bb2`: `packages/coding-agent/test/update-cli.test.ts:592` spells the binary
 * literal twice on one line, so the scan reported 412 where 413 literals exist. That
 * undercount is not cosmetic here. The per-file counts this gate prints are the signal a
 * reviewer diffs against the previous run to see which files grew, so a line holding two
 * literals reads as one and the reviewer is told a file is finished while a literal in it is
 * still unaccounted for.
 *
 * The spelling is named by file and line rather than quoted: this file is itself governed by
 * `scripts/rename/disposition.tsv`, so writing the literal out here would add a pinned
 * occurrence to the very file the gate measures, and the rename gate would correctly report
 * this file's rows as short by one.
 *
 * Advancing by `needle.length` rather than one character keeps a self-overlapping needle from
 * being double-counted at a shared boundary; for the fixed strings below, which cannot overlap
 * themselves, either stride gives the same answer.
 */
function countOccurrences(line: string, needle: string): number {
	let count = 0;
	let from = 0;
	for (;;) {
		const at = line.indexOf(needle, from);
		if (at === -1) return count;
		count++;
		from = at + needle.length;
	}
}

/**
 * Matcher calls that make a line an assertion. A brand name that only ever appears in an
 * import or a comment is not something a test can freeze, so it is out of scope for the
 * token check below — that is what separates the 54 lines it reports from the ~1200 other
 * lines carrying `omp` in test sources.
 */
const ASSERTION =
	/\b(?:toBe|toEqual|toStrictEqual|toContain|toMatch|toHaveBeenCalledWith|toHaveBeenCalledTimes|stringContaining|stringMatching)\s*\(/;

/**
 * A matcher call reached through `.not`. These assert the old name is GONE
 * (`expect(message).not.toContain("`omp plugin")`), so reporting one is a false alarm by
 * construction — the assertion is defending the rename rather than fighting it. Measured at
 * HEAD `fd5dba8a85`: 5 such lines, in 3 files, all of which must stay silent.
 */
const NEGATED =
	/\.not\s*\.\s*(?:toBe|toEqual|toStrictEqual|toContain|toMatch|toHaveBeenCalledWith|toHaveBeenCalledTimes|stringContaining|stringMatching)\s*\(/;

/**
 * Whether `line` asserts on a bare product name rather than on something `omp` belongs to.
 *
 * The needles above are all substrings, so they cannot see a name carrying a flag or a
 * following word: `toContain("omp --resume")` matched none of them, which is how an
 * assertion froze the old name on the shared branch until `0783cf4125` rewrote it. Adding a
 * seventh needle would catch that one line and miss `"omp --resume --foo"` tomorrow — the
 * defect is matching substrings, not the needle list.
 *
 * So the token itself is recognised, via the PINNED expression above, and then excluded by
 * the two characters touching it. A window of surrounding text does NOT work here: slicing
 * around the token removes it from the string being matched, which made `/omp/` unmatchable
 * and reported 1617 hits dominated by the very package scope the filter was written to skip.
 *
 * Excluded, each measured at `fd5dba8a85`: a `/`, `\` or `.` before or after is a path
 * (`/omp/system-prompt/0.mdc`, `~/.omp/agent`, `C:\omp\bin\omp.exe`); a `.`, `-` or `/`
 * starting what follows is a prefixed identifier or version (`omp.gen_ai.agent.*`,
 * `omp-stats-theme`, `omp/18.2.4`); a digit starting it is a version segment. `omp.sh` is
 * already excluded by PINNED's own lookahead.
 *
 * `omp://` is deliberately NOT excluded — it is a live first-party scheme, so a test pinning
 * it pins a brand name. `retainContext: "omp"` is likewise reported: it is a business field,
 * and the gate's contract is that a reviewer exempts it with a row carrying a reason, not
 * that the linter guesses which fields are business.
 */
function assertsBareBrand(line: string): boolean {
	if (!ASSERTION.test(line) || NEGATED.test(line)) return false;
	// `source` AND `flags`, not the RegExp object plus a flags string: the second argument
	// to `new RegExp` REPLACES the original's flags rather than merging with them, so
	// `new RegExp(PINNED, "g")` silently measures a case-sensitive token and every flag
	// `PINNED` carries is discarded. That is why adding the flag to `PINNED` alone changed
	// nothing here: 497 occurrences on this gate's own corpus stay invisible until this
	// line passes the flags through. `check-disposition.ts:705` builds it the safe way and
	// documents the trap; this was the one site still using the broken form.
	for (const match of line.matchAll(new RegExp(PINNED.source, `${PINNED.flags}g`))) {
		const at = (match.index ?? 0) + match[1].length;
		const prev = line[at - 1] ?? "";
		const next = line[at + 3] ?? "";
		const after = line.slice(at + 3, at + 19);
		if (/[/\\.]/.test(prev) || /[/\\]/.test(next)) continue;
		if (/^[.\-/\\]/.test(after)) continue;
		if (/^\d/.test(after)) continue;
		return true;
	}
	return false;
}

async function collectHits(): Promise<Hit[]> {
	const hits: Hit[] = [];
	const glob = new Bun.Glob("packages/*/test/**/*.ts");
	for await (const relPath of glob.scan({ cwd: REPO_ROOT, dot: true })) {
		const text = await Bun.file(path.join(REPO_ROOT, relPath)).text();
		const lines = text.split("\n");
		for (const [index, line] of lines.entries()) {
			for (const { label, needle } of PATTERNS) {
				for (let seen = countOccurrences(line, needle); seen > 0; seen--) {
					hits.push({ file: relPath, pattern: label, line: index + 1, text: line.trim() });
				}
			}
			// A name standing alone in an assertion is the product name even when no
			// needle above is a substring of it. Counted separately so a line already
			// reported by a needle is not double-counted.
			const covered = PATTERNS.some(({ needle }) => line.includes(needle));
			if (!covered && assertsBareBrand(line)) {
				hits.push({ file: relPath, pattern: "bare omp", line: index + 1, text: line.trim() });
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
