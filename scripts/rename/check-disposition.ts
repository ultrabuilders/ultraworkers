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
 * WHAT RUNS IT — re-measured 2026-10-02, because this paragraph has now been wrong twice
 * ------------------------------------------------------------------------------
 * This gate is NOT a link in `check:ts`, and must not become one. `check:ts` is a `&&`
 * chain that stops at the first red link, and `check:test-rename-literals` sits at
 * position 7 and is red on this tree — so anything chained after it never executes. A
 * gate in that position is a gate that does not run, which is worse than an unwired
 * one because it looks enforced. (That is not hypothetical: the ratchet was first
 * chained at position 8 and would never have fired.)
 *
 * What DOES run it, and runs it even when `check:ts` is red:
 *
 *   scripts/rename/check-disposition-ratchet.ts   -> package.json `check:disposition-ratchet`
 *   -> `GATES` in scripts/ci-check-full.ts -> `ci:check:full`
 *
 * Measured, not asserted: `bun run ci:check:full` reports
 * `PASS check:disposition-ratchet (exit 0)` on a run where `check:ts` exited 1. The
 * ratchet re-implements no rule — it calls `checkPre` — so it cannot drift from here.
 *
 * It is a RATCHET, not this gate in full, and that is deliberate. This gate reports
 * every way the table is incomplete, and the table is legitimately incomplete, so
 * running it as a gate would make CI red for work that is going correctly. The ratchet
 * pins the one number that may only rise when a frozen literal is deleted; everything
 * else it reports as a ceiling that must fall.
 *
 * Running this file directly reports the whole picture, now split by rule so a reader
 * can see which number is which without counting `FAIL` lines:
 *
 *   disposition(pre): missing-row = 628
 *   disposition(pre): literal-hits-imbalance = 0
 *   disposition(pre): stale-row = 9
 */

import * as path from "node:path";
import { readGateArgsOrExit } from "./args";
import { isInsideNestedRepository, nestedRepoCache } from "./scan-scope";

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
 * a human-signed number; balancing checks that number against the file.
 *
 * Balancing, though, is the ONLY stage that checks it, and it checks the SUM —
 * see the `keep-shrank` note in `checkPost` for why a pinned `keep-*` row's own
 * `hits` is not verifiable on its own. Neither needs the rename total adjusted.
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

/**
 * Path prefixes excluded from the rule, not from the allow-list.
 *
 * `node_modules/` is here because the scan below is a FILESYSTEM walk, not an
 * index read, and a filesystem walk does not consult `.gitignore` —
 * `check-docs-rename.ts` records the same reason and measures it (1516 markdown
 * files walked against 972 in the repository).
 *
 * Build output belongs here for a sharper version of that reason. Widening the
 * walk to `.js`/`.mjs` reached four files this repository does not ship, all
 * gitignored: `packages/collab-web/dist/rmyk4s85.js`,
 * `packages/stats/dist/client/index.js`, and the two built bundles under
 * `python/robomp/{src/static,web/dist}`. Two of those names are content hashes
 * that a rebuild changes, so a `missing-row` naming one is a violation nobody can
 * legitimately allow-list AND a verdict that differs between a fresh clone and a
 * machine that has run a build.
 *
 * Adding a new build-output root means adding it here. That is a real cost: a
 * root forgotten here reappears as a `missing-row` on whoever builds next, which
 * is the failure this list exists to prevent, so it fails loudly rather than
 * silently narrowing the gate.
 *
 * `.claude/` is a different exclusion and needs its own reason, because
 * `isInsideNestedRepository` already covers the case this list used to be the
 * only defence against. Two shapes were probed against this gate's own
 * `hitPaths`, both under `.claude/worktrees/`:
 *
 *   probe A — with a `.git` FILE, the shape `EnterWorktree` writes
 *     → reported 0 times. The nested-repository guard catches it.
 *   probe B — the same path with no `.git`, i.e. an ordinary dot-directory
 *     → reported as `missing-row`. The guard does not, and nothing else did.
 *
 * So the guard and this list cover disjoint cases and both are needed. What
 * makes `.claude/` safe to exclude here is measured, not assumed:
 * `git ls-files -- .claude` returns **0 files**, so excluding it costs no
 * coverage at all — unlike `.omp/`, which holds 16 tracked files and must stay
 * in scope for this gate.
 *
 * The local-only half of this is worth stating: `.claude/worktrees/` is hidden
 * by `.git/info/exclude`, which is never committed. A clean CI clone has
 * neither the directory nor the exclusion, so this line is free there and load-
 * bearing on a developer machine — the same walk reading a different corpus in
 * the two places is the drift this gate must not have.
 */
const EXCLUDED_PREFIXES = [
	"node_modules/",
	".git/",
	".claude/",
	"python/robomp/src/static/",
	"python/robomp/web/dist/",
];

/** Build output: any path with a `dist` segment, matching the per-package dist rule. */
function isBuildOutput(relPath: string): boolean {
	return relPath.split("/").includes("dist");
}

/**
 * Every source path carrying at least one occurrence of the pinned expression.
 *
 * `.js` and `.mjs` are inside the gate because the rename has to hold on every
 * file the repository ships, not only the ones TypeScript compiles: a `.js` file
 * under a package's `src` tree, or under `packages/natives/native/`, reaches
 * production at runtime exactly like a `.ts` beside it, and leaving it outside
 * made `missing-row` report a domain it was not measuring.
 */
export async function hitPaths(root: string): Promise<readonly string[]> {
	const glob = new Bun.Glob("**/*.{ts,js,mjs}");
	const found: string[] = [];
	const nestedRepos = nestedRepoCache();
	for await (const relPath of glob.scan({ cwd: root, dot: true })) {
		if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) continue;
		if (isBuildOutput(relPath)) continue;
		if (isInsideNestedRepository(root, relPath, nestedRepos)) continue;
		const text = await Bun.file(path.join(root, relPath)).text();
		if (new RegExp(PINNED.source).test(text)) found.push(relPath);
	}
	return found.sort();
}

/**
 * Which set of rules this file implements.
 *
 * A ratchet over one of those rules records what it measured AND what it measured
 * against. Recording only the table's digest is not enough, and the hole is
 * specific: `59 changes the meaning of stale-row inside this file` leaves
 * `disposition.tsv` byte-identical, so the table digest still matches, no drift is
 * reported, the ceiling stays 9 — now silently wrong — and the run still prints
 * GREEN. Silence that looks like a pass is the worst failure a gate has.
 *
 * Bump this when a rule's MEANING changes: a class added to or removed from
 * `classMatcher`, a row that used to be reported under one name now reported under
 * another, a check that stops firing or starts firing on new input. Rewording a
 * comment, reformatting, or changing how a violation is WORDED does not need a
 * bump — a digest of this file would demand one for those, which is a false alarm,
 * and a ratchet that cries wolf is ignored.
 *
 * Read by `check-disposition-ratchet.ts`, which reports drift and never blocks on it.
 */
export const RULES_VERSION = "2026-10-02.3";

interface Violation {
	readonly rule: string;
	readonly detail: string;
}

/**
 * Tally violations by rule name, most frequent first.
 *
 * The single `N failures over M rows` line this replaces could not be acted on: a
 * reader cannot tell 9 stale rows from 90, and the baseline of 9 existed only as 9
 * scattered `FAIL stale-row` lines. A ceiling nobody can see is not a ceiling.
 */
export function tallyByRule(
	violations: readonly { readonly rule: string }[],
	problems: readonly string[] = [],
): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();
	for (const violation of violations) {
		counts.set(violation.rule, (counts.get(violation.rule) ?? 0) + 1);
	}
	if (problems.length > 0) counts.set("parse", problems.length);
	return new Map([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
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
	// Every row must still describe something its own class can count.
	//
	// "Not in `paths`" is NOT that test. `paths` holds files with a PINNED hit, and
	// `keep-path` / `keep-worker-selector` are counted by LITERAL and are documented
	// as disjoint from the pinned expression — so their files legitimately have no
	// pinned hit at all. Measured 2026-10-02: that rule flagged 54 rows, every one of
	// them a live `keep-path` row over a file carrying `".omp"`, and the README states
	// the opposite ("its file may have no pinned hits at all"). A row is stale when the
	// file no longer carries what its class counts, or when the file is gone.
	for (const [filePath, group] of byPath) {
		if (paths.includes(filePath)) continue;
		const handle = Bun.file(path.join(root, filePath));
		if (await handle.exists()) {
			// Only a class counted BY ITS OWN LITERAL can witness its own row here.
			// `keep-wire` / `keep-prose` / `rename` share one expression across every
			// row, so "does this file carry an `omp` token" is a property of the FILE,
			// not of the contract the row freezes. Measured 2026-10-02: nine rows were
			// reported stale, every one over a file that never contained an `omp` token
			// at all, because what they freeze is a third-party value (`facebook/react`,
			// the `x-exa-source` header, an OAuth `client_name`) that was never a brand
			// token. Seven of those contracts were verifiably still in force, so
			// completing the rename could never fix them — the remedy this rule used to
			// print ("delete the row with a reason") would have deleted the evidence
			// that the contract survived.
			//
			// A file that is GONE still reports, for every class: that needs no
			// counter, and a row pointing at nothing is wrong whoever wrote it.
			const literalRows = group.filter(row => classMatcher(row.disposition).literal !== undefined);
			if (literalRows.length === 0) continue;
			const text = await handle.text();
			const stillCarriesIt = literalRows.some(row => countClass(text, row.disposition) > 0);
			if (stillCarriesIt) continue;
		}
		violations.push({ rule: "stale-row", detail: filePath });
	}
	// Per-row reviewability.
	for (const row of rows) {
		if (row.reason.trim() === "") violations.push({ rule: "empty-reason", detail: `${row.path} (line ${row.line})` });
		if (requiresKeepRefs(row.disposition) && row.keepRefs.trim() === "") {
			violations.push({ rule: "missing-keep-refs", detail: `${row.path} (line ${row.line})` });
		}
	}
	for (const [filePath, group] of byPath) {
		// A row pointing at a file that no longer exists is already reported as
		// `stale-row` above, and reading it here would throw ENOENT and take the whole
		// gate down instead of reporting the one row that is wrong.
		const handle = Bun.file(path.join(root, filePath));
		if (!(await handle.exists())) continue;
		const text = await handle.text();
		// Literal-counted classes are checked per row, against their OWN literal.
		// The group-sum invariant below cannot reach them: it compares against the
		// pinned count, which is 0 for a `".omp"`-only file, so a `keep-path` row
		// declaring `hits = 0` balanced perfectly while the file held 45 occurrences.
		// Measured 2026-10-02 across 45 rows, all declaring 0, all carrying `".omp"`.
		for (const row of group) {
			const matcher = classMatcher(row.disposition);
			if (matcher.literal === undefined) continue;
			const actual = countClass(text, row.disposition);
			if (row.hits !== actual) {
				violations.push({
					rule: "literal-hits-imbalance",
					detail: `${filePath} (line ${row.line}): ${row.disposition} declares ${row.hits}, file has ${actual} of ${matcher.literal}`,
				});
			}
		}
		// The load-bearing invariant for the pinned-counted classes, which share one
		// expression and can only be checked as a sum.
		const pinnedRows = group.filter(row => classMatcher(row.disposition).literal === undefined);
		if (pinnedRows.length === 0) continue;
		const keeps = pinnedRows.filter(row => row.disposition !== "rename").map(row => row.disposition);
		const declared = pinnedRows.reduce((total, row) => total + row.hits, 0);
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
 * occurrences and missed this class.
 *
 * `keep-*` rows are checked per row, and what that means DIFFERS BY CLASS, which is
 * why the split below is not uniform:
 *
 * - LITERAL classes (`keep-path`, `keep-worker-selector`) are genuinely per row.
 *   `countClass` returns that literal's own count, so a row declaring 3 fires
 *   `keep-shrank` when one of its 3 goes — verified by deleting one `".omp"` from a
 *   file that still held other pinned prose.
 * - PINNED classes (`rename`, `keep-wire`, `keep-prose`) are **not**. Those three are
 *   one arm of `classMatcher`, so `countClass` returns the same number for each: the
 *   FILE-WIDE pinned total. `keep-shrank` is therefore comparing the whole file's
 *   count against ONE row's `hits`, and it stays green when an occurrence leaves while
 *   the total still clears that row's number. Measured: a real file with 8 pinned
 *   occurrences, one deleted, leaves 7 — green here, while `checkPre`'s `hits-imbalance`
 *   catches it on the sum.
 *
 * So the honest statement is: **for a pinned `keep-*` row, shrinkage is verified by
 * the sum in `checkPre`, not per row here.** The per-row check that exists for these
 * classes is the literal one above. Nothing about the table's data is wrong — the two
 * files carrying both a `keep-wire` and a `keep-prose` row declare splits verified
 * occurrence by occurrence (1+7, and 6+2). A split recorded in this table is a
 * **human judgement**; the gate can confirm the pair sums to the file, and cannot
 * confirm the split between them. (epic-qoit findings B and C.)
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
	// Every unrecognised argument is refused rather than defaulted past. `--gate0`
	// is documented in MILESTONE_5_EXECUTION_PLAN.md as W8b's Gate 0, but nothing
	// here ever read it, so it fell through to the `pre` default below and the gate
	// returned the whole pre-sweep's verdict while looking like it had been asked a
	// narrower question. StartsWith, not `indexOf`, still matters: indexOf compares
	// whole elements, so `--stage=sideways` would not match the prefix.
	readGateArgsOrExit(process.argv.slice(2), { flags: ["--stage="] });
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
	// One line per rule, not one lumped total. A reader has to be able to tell
	// `stale-row = 9` from `= 90` without counting `FAIL` lines by hand, because the
	// 9 is a ratchet ceiling and a ceiling nobody can see is not a ceiling.
	const tally = tallyByRule(violations, problems);
	if (tally.size === 0) console.log(`disposition(${stage}): clean over ${rows.length} rows`);
	else {
		for (const [rule, count] of tally) console.log(`disposition(${stage}): ${rule} = ${count}`);
		console.log(`disposition(${stage}): ${violations.length + problems.length} failures over ${rows.length} rows`);
	}
	console.log(`disposition(${stage}): rules ${RULES_VERSION}`);
	if (violations.length > 0 || problems.length > 0) process.exit(1);
}

if (import.meta.main) await main();
