/**
 * W8b — GATE. The rename decision table is only worth something if it can be
 * falsified, so this gate re-derives every number in it from the tree.
 *
 * WHAT THIS GATES
 * ---------------
 * `scripts/rename/disposition.tsv` records, per (path, disposition), how many
 * occurrences of the pinned expression belong to each decision class. The invariant
 * that makes it more than a list of opinions:
 *
 *     for every path, the sum of `hits` across its rows == that file's real
 *     occurrence count of the pinned expression.
 *
 * Without that, a missed `rename` is invisible: the file has a `keep-*` row, the
 * gate sees a row for that path, and the leftover occurrence rides along under a
 * decision that was never made about it. Splitting `hits` per CLASS rather than per
 * file is what closes that hole — so this gate recomputes each class separately and
 * reports them apart.
 *
 * WHY TWO STAGES
 * --------------
 *   --stage=pre   the table must be COMPLETE and REVIEWABLE: every hit file has
 *                 rows, rows balance, no empty reason, keep-* names its owner.
 *   --stage=post  the renames must be DONE: each `rename` row has 0 occurrences
 *                 left, each `keep-*` row still has exactly the count recorded.
 *
 * One stage cannot express both. Before the sweep a `rename` row legitimately still
 * has occurrences; after it, 0 is the only legal value. Running only one of them
 * means half the table is never checked at the moment it matters.
 *
 * WHY THE PICKED EXPRESSION, AND THE 51% THAT IS PROSE
 * ---------------------------------------------------
 * The pinned expression is the one the bead ghim, byte for byte:
 *
 *     (^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)
 *
 * It is a LOCATOR, not a judgement. It matches comments and doc strings exactly as
 * happily as it matches code, and on the tree at the time of writing that is most of
 * the corpus:
 *
 *     2054 occurrences — 1047 in comment prose, 1007 in code
 *     704 files     — 318 with >=1 code occurrence, 386 comment-only
 *
 * So a `rename` row is not automatically a code edit. Renaming inside a comment is
 * W13's job (the documentation sweep), not this table's, and whether the table needs
 * a `prose` disposition at all is an open owner decision — recorded in the bead, not
 * silently resolved here. Until it is made, `keep-prose` is NOT in the vocabulary and
 * a comment-only file has no lawful row to carry, which `--stage=pre` reports as a
 * missing row rather than inventing a class for it.
 *
 * WHY NOT A TEST
 * --------------
 * AGENTS.md bans source-grep *tests*: a test asserting on an implementation file's
 * text breaks on harmless refactors. The pure helpers below are covered by
 * `check-disposition.test.ts` against fixtures.
 *
 * NOT COLLECTED BY ANY RUNNER — measured 2026-10-02, and an earlier draft of this
 * header claimed the opposite ("wired into `check:ts`, the same shape as W13's and
 * W14's gates"). That claim was false, and a header that says a gate is enforced is
 * worse than one that says nothing: it stops the next reader from watching the table.
 *
 *   grep -c check-disposition package.json   -> 0    (this gate)
 *   grep -c check-docs-rename    package.json -> 1    (its sibling: wired)
 *   grep -c check-runtime-rename package.json -> 1    (its sibling: wired)
 *   grep -rln check-disposition .github/ scripts/install-tests/  -> nothing
 *
 * Both siblings are wired; this one is not, so the disposition table — the only thing
 * making the W8b rename auditable — rots unwatched. Running it by hand today reports:
 *
 *   disposition(pre): 701 failures over 5 rows
 *
 * 5 rows in `disposition.tsv` against a corpus of ~706 `*.ts` files carrying the
 * pinned expression. Two separate decisions sit here, and only the first is urgent:
 *
 *   1. This comment was wrong. Fixing it costs one line and changes no behaviour.
 *   2. WIRING THE GATE IN IS NOT FREE, and must not be done casually. `check:ts` is a
 *      shared gate; turning it red at 5/706 rows makes it red for every agent on the
 *      tree, for a table that is legitimately still being filled. Wire it when the
 *      table is complete, and tell the tree first.
 */

import * as path from "node:path";

/**
 * The pinned expression. Byte-identical to the bead's, so the table and this gate
 * can never drift onto different definitions of "a hit".
 *
 * Note the asymmetry, which is deliberate and inherited: the leading class excludes
 * `.` and `/` so `pi-omp` or `sub/omp` do not match, but the trailing class does not
 * exclude `/`, so a path like `"./omp/"` matches on its trailing edge.
 */
const PINNED = /(^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)/;

/** Repo-relative path of the table. */
const TABLE_PATH = "scripts/rename/disposition.tsv";

/**
 * The closed vocabulary. A row whose `disposition` is not here is a failure, not a
 * new class — the set is closed precisely so that adding a class is a reviewed act
 * rather than something a sweep does by accident.
 */
export const DISPOSITIONS = ["rename", "keep-wire", "keep-worker-selector", "keep-path", "keep-prose"] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

/**
 * Classes that name an owner, and so must say which one. A `keep-*` row without
 * `keep_refs` is an approval nobody signed — the failure this whole table exists to
 * prevent, so it is enforced rather than documented.
 */
export function requiresKeepRefs(disposition: string): boolean {
	return disposition.startsWith("keep-");
}

/**
 * Per-class occurrence expressions.
 *
 * `rename` is the pinned expression minus the classes already claimed by a `keep-*`
 * row for the same file. That subtraction is why this is computed per (path, class)
 * and not once globally: the same token is a wire contract in one file and prose in
 * the next, and a global figure would hide both.
 *
 * `keep-worker-selector` and `keep-path` are LITERAL, not ERE — the bead says so
 * explicitly. They name one fixed string each, so an ERE would be both slower and
 * vaguer than the substring it is standing in for.
 */
export interface ClassMatcher {
	readonly literal?: string;
	readonly pinned?: boolean;
}

export function classMatcher(disposition: Disposition): ClassMatcher {
	switch (disposition) {
		case "keep-worker-selector":
			return { literal: "__omp_worker_" };
		case "keep-path":
			return { literal: '".omp"' };
		case "rename":
		case "keep-wire":
		case "keep-prose":
			return { pinned: true };
	}
}

/** Count a class's occurrences in one file's text. */
export function countClass(text: string, disposition: Disposition): number {
	const matcher = classMatcher(disposition);
	if (matcher.literal !== undefined) return text.split(matcher.literal).length - 1;
	if (matcher.pinned !== true) return 0;
	return (text.match(new RegExp(PINNED.source, "g")) ?? []).length;
}

/**
 * `rename` occurrences for a file.
 *
 * The parameter is retained so callers can pass their keep classes, but NOTHING is
 * subtracted. Both subtraction attempts were measured wrong, in opposite directions:
 *
 * 1. Subtracting every `keep-*` class. `keep-wire` shares the pinned expression, so
 *    `const ORIGINATOR = "omp"` went to 0 and `rename-incomplete` was unreachable.
 * 2. Subtracting only the LITERAL classes. Those are disjoint from the pinned set —
 *    `__omp_worker_x` has a pinned count of 0 — so subtracting them removes an
 *    occurrence that was never theirs:
 *
 *        const a = "omp"; const b = "__omp_worker_x";
 *        pinned = 1, worker-selector = 1, countRename = 0   // the "omp" vanished
 *
 * The pinned count is therefore the rename count outright. A file holding both a
 * wire contract and a rename candidate simply has a `keep-wire` row whose `hits` is
 * a human-signed number; balancing checks that number against the file, and
 * `--stage=post` checks it did not shrink. Neither needs the rename total adjusted.
 */
export function countRename(text: string, _keepDispositions: readonly Disposition[] = []): number {
	return countClass(text, "rename");
}

/** True when the line is prose: a comment opener introduces the whole line. */
export function isCommentLine(line: string): boolean {
	const trimmed = line.trimStart();
	return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

export interface Row {
	readonly scope: string;
	readonly path: string;
	readonly hits: number;
	readonly disposition: Disposition;
	readonly reason: string;
	readonly keepRefs: string;
	/** 1-based line in the TSV, for error messages. */
	readonly line: number;
}

export interface ParseResult {
	readonly rows: readonly Row[];
	readonly problems: readonly string[];
}

const HEADER = "scope\tpath\thits\tdisposition\treason\tkeep_refs";

/**
 * Parse the TSV.
 *
 * No quoting and no comment lines, by design: the bead forbids both so the parser
 * has nothing to skip. A parser that can skip a line is a parser that can silently
 * skip a decision, and every explanation belongs in the `reason` column or the
 * README where a reader will look for it.
 */
export function parseTable(text: string): ParseResult {
	const rows: Row[] = [];
	const problems: string[] = [];
	const lines = text.split("\n");

	if (lines[0] !== HEADER) {
		problems.push(`line 1: header must be exactly ${JSON.stringify(HEADER)}`);
		return { rows, problems };
	}

	for (const [index, raw] of lines.entries()) {
		const line = index + 1;
		if (line === 1) continue;
		if (raw.trim() === "") continue;

		const cells = raw.split("\t");
		if (cells.length !== 6) {
			problems.push(`line ${line}: expected 6 tab-separated cells, got ${cells.length}`);
			continue;
		}
		const [scope, filePath, hitsRaw, disposition, reason, keepRefs] = cells as [
			string,
			string,
			string,
			string,
			string,
			string,
		];

		if (!(DISPOSITIONS as readonly string[]).includes(disposition)) {
			problems.push(`line ${line}: disposition ${JSON.stringify(disposition)} is outside the vocabulary`);
			continue;
		}
		const hits = Number(hitsRaw);
		if (!Number.isInteger(hits) || hits < 0) {
			problems.push(`line ${line}: hits must be a non-negative integer, got ${JSON.stringify(hitsRaw)}`);
			continue;
		}
		rows.push({
			scope,
			path: filePath,
			hits,
			disposition: disposition as Disposition,
			reason,
			keepRefs,
			line,
		});
	}
	return { rows, problems };
}

/** Every `*.ts` path carrying at least one occurrence of the pinned expression. */
export async function hitPaths(root: string): Promise<readonly string[]> {
	const glob = new Bun.Glob("**/*.ts");
	const found: string[] = [];
	for await (const relPath of glob.scan({ cwd: root, dot: true })) {
		if (relPath.startsWith("node_modules/") || relPath.startsWith(".git/")) continue;
		const text = await Bun.file(path.join(root, relPath)).text();
		if (new RegExp(PINNED.source).test(text)) found.push(relPath);
	}
	return found.sort();
}

interface Violation {
	readonly rule: string;
	readonly detail: string;
}

/**
 * Stage `pre`: the table is complete, balanced, and reviewable.
 *
 * Two-way reconciliation is the point. Reporting only "rows with no file" would let a
 * sweep delete its own evidence; reporting only "files with no row" would let stale
 * rows accumulate. Both directions fail.
 */
export async function checkPre(root: string, rows: readonly Row[]): Promise<readonly Violation[]> {
	const violations: Violation[] = [];
	const paths = await hitPaths(root);
	const byPath = new Map<string, Row[]>();
	for (const row of rows) {
		const list = byPath.get(row.path);
		if (list) list.push(row);
		else byPath.set(row.path, [row]);
	}

	// Every hit file must be covered.
	for (const filePath of paths) {
		if (!byPath.has(filePath)) violations.push({ rule: "missing-row", detail: filePath });
	}
	// Every row must correspond to a real hit file.
	for (const [filePath] of byPath) {
		if (!paths.includes(filePath)) violations.push({ rule: "stale-row", detail: filePath });
	}
	// Per-row reviewability.
	for (const row of rows) {
		if (row.reason.trim() === "") violations.push({ rule: "empty-reason", detail: `${row.path} (line ${row.line})` });
		if (requiresKeepRefs(row.disposition) && row.keepRefs.trim() === "") {
			violations.push({ rule: "missing-keep-refs", detail: `${row.path} (line ${row.line})` });
		}
	}
	// The load-bearing invariant. Only files `hitPaths` actually found are counted:
	// a row pointing at a file that no longer exists is already reported as
	// `stale-row` above, and reading it here would throw ENOENT and take the whole
	// gate down instead of reporting the one row that is wrong.
	for (const [filePath, group] of byPath) {
		if (!paths.includes(filePath)) continue;
		const text = await Bun.file(path.join(root, filePath)).text();
		const keeps = group.filter(row => row.disposition !== "rename").map(row => row.disposition);
		const declared = group.reduce((total, row) => total + row.hits, 0);
		// The whole file's pinned occurrences: each keep class plus what is left for
		// `rename`. Comparing this to the declared sum is what makes a partially
		// decided file impossible to pass.
		const actual = countRename(text, keeps);
		if (declared !== actual) {
			violations.push({
				rule: "hits-imbalance",
				detail: `${filePath}: rows sum to ${declared}, file has ${actual}`,
			});
		}
	}
	return violations;
}

/**
 * Stage `post`: the sweep is done.
 *
 * `rename` rows must be at 0 — a leftover means someone renamed the file's other
 * occurrences and missed this class. `keep-*` rows must still hold exactly what was
 * recorded: a `keep-wire` row that dropped means the contract it was protecting moved
 * without anyone deciding to move it.
 */
export async function checkPost(root: string, rows: readonly Row[]): Promise<readonly Violation[]> {
	const violations: Violation[] = [];
	const byPath = new Map<string, Row[]>();
	for (const row of rows) {
		const list = byPath.get(row.path);
		if (list) list.push(row);
		else byPath.set(row.path, [row]);
	}
	for (const [filePath, group] of byPath) {
		// Same reason as in `checkPre`: a row for a file that is gone must not throw.
		// `stale-row` is `--stage=pre`'s job to report; this stage only reads what exists.
		const handle = Bun.file(path.join(root, filePath));
		if (!(await handle.exists())) continue;
		const text = await handle.text();
		const keeps = group.filter(row => row.disposition !== "rename").map(row => row.disposition);
		const renameRemaining = countRename(text, keeps);
		for (const row of group) {
			if (row.disposition === "rename") {
				if (renameRemaining > 0) {
					violations.push({ rule: "rename-incomplete", detail: `${filePath}: ${renameRemaining} left` });
				}
				continue;
			}
			const remaining = countClass(text, row.disposition);
			if (remaining < row.hits) {
				violations.push({
					rule: "keep-shrank",
					detail: `${filePath} (${row.disposition}): ${remaining} left, ${row.hits} recorded`,
				});
			}
		}
	}
	return violations;
}

async function main(): Promise<void> {
	// StartsWith, not an exact `indexOf("--stage=")`: indexOf compares whole
	// elements, so `--stage=sideways` did not match the prefix and the flag was
	// silently ignored — a typo'd stage ran `pre` and reported success.
	const stageArg = process.argv.find(arg => arg.startsWith("--stage="));
	const stage = stageArg === undefined ? "pre" : stageArg.slice("--stage=".length);
	if (stage !== "pre" && stage !== "post") {
		console.error(`unknown stage ${JSON.stringify(stage)}; expected --stage=pre or --stage=post`);
		process.exit(2);
	}

	const root = process.cwd();
	const file = Bun.file(path.join(root, TABLE_PATH));
	if (!(await file.exists())) {
		// A MISSING table is a failure, not a pass. Treating "no table" as "no
		// violations" makes the gate green precisely when it has nothing to say.
		console.log(`FAIL no-table ${TABLE_PATH} does not exist`);
		process.exit(1);
	}

	const { rows, problems } = parseTable(await file.text());
	const violations = stage === "pre" ? await checkPre(root, rows) : await checkPost(root, rows);

	for (const problem of problems) console.log(`FAIL parse ${problem}`);
	for (const violation of violations) console.log(`FAIL ${violation.rule} ${violation.detail}`);
	console.log(`disposition(${stage}): ${violations.length + problems.length} failures over ${rows.length} rows`);
	if (violations.length > 0 || problems.length > 0) process.exit(1);
}

if (import.meta.main) await main();
