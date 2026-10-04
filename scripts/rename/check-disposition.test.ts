/**
 * W8b — the disposition gate's pure logic, driven by fixtures.
 *
 * NOT source-grep: every case below runs the parser or the counters against a
 * string or a temp tree and asserts on what they RETURN. The scanner itself is a
 * corpus gate wired into `check:ts`, for the same reason W13's and W14's are.
 *
 * Each row defends one contract a reviewer would otherwise have to take on trust:
 * a malformed table is rejected rather than half-read, the closed vocabulary
 * cannot be widened by accident, and — the one that matters most — a `rename`
 * occurrence is still counted after a `keep-wire` row has claimed the same
 * expression, which is the bug that made `rename-incomplete` unreachable.
 */

import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import {
	checkPost,
	checkPre,
	countUnverifiableKeepRefs,
	findCoinedRefs,
	findPublishedFileRenames,
	findUnreconciledPinned,
	classMatcher,
	countClass,
	countRename,
	DISPOSITIONS,
	hitPaths,
	isCommentLine,
	parseTable,
	requiresKeepRefs,
	RULES_VERSION,
	RULES,
	tallyByRule,
	checkPreWithCoverage,
} from "./check-disposition";

const HEADER = "scope\tpath\thits\tdisposition\treason\tkeep_refs";

function table(...rows: string[]): string {
	return [HEADER, ...rows].join("\n");
}

function row(filePath: string, hits: number | string, disposition: string, reason: string, keepRefs = ""): string {
	return ["src", filePath, String(hits), disposition, reason, keepRefs].join("\t");
}

/** A throwaway tree; never inside the repo. */
async function tree(files: Record<string, string>): Promise<string> {
	const root = (await Bun.$`mktemp -d`.text()).trim();
	for (const [name, body] of Object.entries(files)) {
		await Bun.write(path.join(root, name), body);
	}
	return root;
}

const row_ = (filePath: string, hits: number, disposition: string, reason: string, keepRefs = "", rules = "") => ({
	scope: "src",
	path: filePath,
	hits,
	disposition: disposition as never,
	reason,
	keepRefs,
	rules,
	line: 2,
});

describe("disposition table parsing", () => {
	it("reads the optional `rules` column, and reads a table that has none", () => {
		// The column is additive, so BOTH shapes have to parse: a table that adopted
		// it, and one that has not. If the six-cell header were rejected, adopting the
		// column would fail every existing row at once and the migration would be
		// indistinguishable from breaking the table.
		const withColumn = parseTable(
			[
				"scope\tpath\thits\tdisposition\treason\tkeep_refs\trules",
				"src\ta.ts\t1\tkeep-wire\twhy\tN3\t2026-10-03.2",
				"src\tb.ts\t1\trename\twhy\t\t", // six cells under a seven-cell header
			].join("\n"),
		);
		expect(withColumn.problems).toEqual([]);
		expect(withColumn.rows[0].rules).toBe("2026-10-03.2");
		expect(withColumn.rows[1].rules).toBe("");

		const withoutColumn = parseTable(table(row("a.ts", 1, "keep-wire", "why", "N3")));
		expect(withoutColumn.problems).toEqual([]);
		expect(withoutColumn.rows[0].rules).toBe("");
	});

	it("rejects a table whose header is not the agreed six columns", () => {
		// A header mismatch must fail loudly. Silently parsing anyway would let a
		// reordered or truncated schema through with every row shifted by one cell.
		const { rows, problems } = parseTable("path\thits\tdisposition\nsrc/a.ts\t1\tkeep-wire\n");
		expect(rows).toHaveLength(0);
		expect(problems[0]).toContain("header must be exactly");
	});

	it("rejects a row whose cell count is not six", () => {
		// The no-quoting rule exists so a tab inside a reason cannot shift cells;
		// this is the check that keeps that rule honest.
		expect(parseTable(table("src\ta.ts\t1\tkeep-wire\tN3")).problems[0]).toContain("6 tab-separated cells");
	});

	it("rejects a disposition outside the closed vocabulary", () => {
		expect(parseTable(table(row("a.ts", 1, "rebrand-it", "why"))).problems[0]).toContain("outside the vocabulary");
	});

	it("rejects a non-integer or negative hits count", () => {
		// `hits` is widened to string | number because the malformed case is the
		// point: a column that is not a count at all must be refused, not coerced.
		expect(parseTable(table(row("a.ts", "many", "keep-wire", "N3", "N3"))).problems[0]).toContain("hits must be");
		expect(parseTable(table(row("a.ts", -1, "keep-wire", "N3", "N3"))).problems[0]).toContain("hits must be");
	});

	it("requires keep_refs on every keep-* class and not on rename", () => {
		// A keep-* row with no owner is an approval nobody signed, which is the whole
		// failure this table exists to prevent.
		expect(requiresKeepRefs("keep-wire")).toBe(true);
		expect(requiresKeepRefs("keep-worker-selector")).toBe(true);
		expect(requiresKeepRefs("rename")).toBe(false);
	});
});

describe("occurrence counting", () => {
	it("does not match the token when it is part of a longer identifier", () => {
		// The pinned expression excludes `_` and `.` around the token, so these are
		// not hits. A looser pattern would report them and inflate every count.
		expect(countClass(`const a = "pi-omp";`, "keep-wire")).toBe(0);
		expect(countClass(`const a = "ompx";`, "keep-wire")).toBe(0);
		expect(countClass(`const a = "ompy";`, "keep-wire")).toBe(0);
	});

	it("counts worker selectors and paths as literals, not as pinned matches", () => {
		// Both are disjoint from the pinned set — `__omp_worker_js_eval` has a
		// pinned count of 0 because `_` is excluded on both sides — so they must be
		// counted by their own literal or the row would read as perpetually missing.
		expect(classMatcher("keep-worker-selector").literal).toBe("__omp_worker_");
		expect(classMatcher("keep-path").literal).toBe('".omp"');
		expect(countClass(`x = "__omp_worker_js_eval"`, "keep-wire")).toBe(0);
		expect(countClass(`x = "__omp_worker_js_eval"`, "keep-worker-selector")).toBe(1);
	});

	it("counts a token that a dot or hyphen follows, but never the omp.sh homepage", () => {
		// The pinned expression's trailing class excluded `.`, `-` and `_`, so it was
		// blind to `starts_with("omp.")` and to `format!("omp-oauth-test-{u}")`. That is
		// not a cosmetic gap: `--stage=post` accepts a row when the count reaches zero,
		// so renaming only the occurrences the table names turned the row GREEN with the
		// token still in the file. Measured on `mktemp.rs`, whose row said `hits=1` while
		// lines 665-666 assert on `starts_with("omp.")` and `"omp.".len()`.
		//
		// The load-bearing half is the domain. Dropping `.`/`-` from the trailing class
		// is the obvious fix and it is wrong: `omp.sh` is the homepage wire value
		// (dirs.ts APP_URL), present in 1093 places across 215 .ts files as install,
		// join and stream URLs. A permissive trailing class matches all of them and the
		// sweep starts renaming URLs. So the exclusion is not removed, it is narrowed to
		// the one continuation that is genuinely a domain.
		//
		// `_` stays excluded on both edges. That is not an oversight left over from the
		// fix: the case above at line 112 already pins it, because `__omp_worker_*` is
		// the `keep-worker-selector` class. Measured — allowing `_` on both edges makes
		// every worker selector a pinned hit and reports one in 1467 files.
		expect(countClass(`assert!(name.starts_with("omp."));`, "rename")).toBe(1);
		expect(countClass(`assert_eq!(name.len(), "omp.".len() + 10);`, "rename")).toBe(1);
		expect(countClass(`let scheme = format!("omp-oauth-test-{unique}");`, "rename")).toBe(1);
		expect(countClass(`const INHIBIT_WHO: &str = "omp";`, "rename")).toBe(1);

		// The domain, in every shape it actually appears in the tree.
		expect(countClass(`const APP_URL: string = "https://omp.sh/";`, "keep-wire")).toBe(0);
		expect(countClass(`rejects.toThrow("curl -fsSL https://omp.sh/install")`, "keep-wire")).toBe(0);
		expect(countClass(`resolveCliArgv(["join", "wss://my.omp.sh/s/abc#key"])`, "keep-wire")).toBe(0);
		expect(countClass(`"live.omp.sh/<your Stencil username>"`, "keep-wire")).toBe(0);

		// `omp.shs` is not the domain, so the exclusion must not swallow it.
		expect(countClass(`const x = "omp.shs";`, "rename")).toBe(1);
	});

	it("counts a dotfile directory, which the leading edge was blind to", () => {
		// The companion blind spot to the one above, on the LEADING edge rather than the
		// trailing one, and with no test covering it — which is why it survived.
		//
		// `[^a-zA-Z0-9_.-]` refuses to match when a `.` precedes `omp`, so every
		// reference to the agent's own config directory — `~/.omp/agent/extensions/`,
		// `~/.omp` in prose — counts ZERO. That is not cosmetic: `--stage=post` accepts a
		// row when the count reaches zero, so a file whose only occurrences are dotfile
		// paths reports as finished while the token is still in it.
		//
		// Measured on `test/cli-extension-providers.test.ts`, whose row says `hits=2`:
		// `countRename` returns 0, `hits-imbalance` fires "rows sum to 2, file has 0",
		// and the two `omp` tokens sit at lines 8 and 14 inside a docblock.
		//
		// The narrowing has to stay as tight as the trailing edge's. `.omp` is a
		// directory, so the continuation must be a path or word boundary — `omp.sh`
		// must still not match, and neither must `my.omp.sh`.
		expect(countClass(`~/.omp/agent/extensions/`, "rename")).toBe(1);
		expect(countClass(`the developer's real \`~/.omp\`.`, "rename")).toBe(1);

		// The quoted form is the OTHER class, and stays that way: `".omp"` is the
		// `keep-path` literal, so it counts there and not here even though the widened
		// leading edge can now see it. This is the half that made the naive fix — drop
		// `.` from the leading class — break three existing rows.
		expect(countClass(`path.join(home, ".omp", "agent")`, "rename")).toBe(0);
		expect(countClass(`path.join(home, ".omp", "agent")`, "keep-path")).toBe(1);

		// The domain is still excluded on the leading edge — this is the same wire
		// value the case above protects, seen through the other edge.
		expect(countClass(`"https://omp.sh/install"`, "keep-wire")).toBe(0);
		expect(countClass(`"wss://my.omp.sh/s/abc#key"`, "keep-wire")).toBe(0);
	});

	it("leaves an underscore-delimited token uncounted, on purpose", () => {
		// This is a DECISION, not an oversight, and it is the one place a later reader is
		// most likely to "fix" the expression. A review proposed that `some_omp_thing`
		// should count 1, because the trailing `.`/`-` blind spot had just been fixed and
		// `_` looked like the same bug.
		//
		// It is not the same bug. `_` on BOTH edges is what keeps `__omp_worker_*` out of
		// the pinned set, and that is the `keep-worker-selector` class, counted by its own
		// literal — see the case above at line 112, which already pins the selector at 0.
		// Measured: allowing `_` on both edges turns every worker selector into a pinned
		// hit, one per file across 1467 files, and would put 6 real selectors in the
		// rename count where they can never be renamed.
		//
		// So the two edges are not symmetric and must not be made symmetric: the trailing
		// class admits `.` and `-`, and both edges exclude `_`. If a future change makes
		// this 1, the worker-selector rows are what breaks — not this assertion's intent.
		expect(countClass(`let some_omp_thing = 1;`, "rename")).toBe(0);
		expect(countClass(`let some_omp_x = 1;`, "rename")).toBe(0);
		// The class it protects, restated here so the two are visibly coupled.
		expect(countClass(`x = "__omp_worker_js_eval"`, "keep-wire")).toBe(0);
		expect(countClass(`x = "__omp_worker_js_eval"`, "keep-worker-selector")).toBe(1);
	});

	it("still counts a rename occurrence after a keep-wire row claims the same expression", () => {
		// THE regression, in both directions. `keep-wire` shares the pinned
		// expression, so subtracting keep classes cancelled the file's only
		// occurrence and `rename-incomplete` was unreachable; subtracting only the
		// LITERAL classes then removed an occurrence that was never theirs. The
		// pinned count is the rename count outright.
		const wire = `const ORIGINATOR = "omp";\n`;
		expect(countClass(wire, "keep-wire")).toBe(1);
		expect(countRename(wire, ["keep-wire"])).toBe(1);

		const mixed = `const a = "omp"; const b = "__omp_worker_x";\n`;
		expect(countClass(mixed, "keep-worker-selector")).toBe(1);
		expect(countRename(mixed, ["keep-worker-selector"])).toBe(1);
		expect(countRename(mixed, [])).toBe(1);
	});

	it("classifies a line as prose only when a comment opener leads it", () => {
		// A trailing comment on a code line does not make the whole line prose —
		// getting this backwards would move code occurrences into the docs bucket.
		expect(isCommentLine("   // run omp now")).toBe(true);
		expect(isCommentLine(" * omp is the agent")).toBe(true);
		expect(isCommentLine(`const x = "omp"; // note`)).toBe(false);
	});

	it("reads the comment opener as a property of the language, not of the line", () => {
		// `#` opens a comment in YAML and shell. The path-free form cannot know
		// that, and answering "not prose" put every one of these occurrences in
		// the code bucket — silently, because a wrong answer here looks like a
		// correct one.
		expect(isCommentLine("  # pins omp to 1.4.2", ".github/workflows/ci.yml")).toBe(true);
		expect(isCommentLine("#!/usr/bin/env bash", "scripts/run.sh")).toBe(true);
		expect(isCommentLine("  # the omp provider", "tools/x.py")).toBe(true);

		// The same character in TypeScript is ordinary syntax. A classifier that
		// keyed on the character instead of the language would invert this.
		expect(isCommentLine("  #private readonly omp = 1;", "src/dirs.ts")).toBe(false);
		expect(isCommentLine('  const s = "#omp";', "src/dirs.ts")).toBe(false);

		// Without a path the C-family openers remain the only claimable ones, so
		// the default is unchanged rather than silently widened.
		expect(isCommentLine("  # pins omp to 1.4.2")).toBe(false);
	});
});

describe("rules column", () => {
	const FILES = { "src/a.ts": `const n = "omp";\n` };

	it("passes a row whose stated rule version is the one this build runs", async () => {
		// The green arm. Without it the rule below could be satisfied by a check that
		// never fires at all, which is the shape a vacuous guard takes.
		const root = await tree(FILES);
		const violations = await checkPre(root, [row_("src/a.ts", 1, "keep-wire", "why", "N3", RULES_VERSION)]);
		expect(violations).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("reports a prose paragraph sitting in the keep_refs column", async () => {
		// The arm that made the rule necessary. `missing-keep-refs` only proves the cell
		// is non-empty and `dangling-keep-ref` only proves a plan owner resolves — and a
		// paragraph satisfies BOTH, because prose is non-empty and `planNodeOf` returns
		// null for it, the one answer that silences each. Found in the wild at
		// `disposition.tsv:474`, where a whole justification sat in the ref column and no
		// rule could reach it.
		//
		// This is also the only coverage `keep-ref-shape` had: the rule was emitted and
		// never asserted, so it was a guard nobody had proven able to fire.
		const root = await tree(FILES);
		const prose =
			"This is not a keep ref, it is a whole justification paragraph that happens to be non-empty.";
		const violations = await checkPre(root, [row_("src/a.ts", 1, "keep-wire", "why", prose)]);
		expect(violations.map(v => v.rule)).toContain("keep-ref-shape");
		// The rule is about SHAPE, so it must not fire on a legitimate single token —
		// `N3` resolves and carries no whitespace. A rule that only ever fires would
		// pass this test while rejecting every real row in the table.
		expect(violations.map(v => v.rule)).not.toContain("missing-keep-refs");
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("reports a row measured under a rule version this build no longer runs", async () => {
		// The red arm, and the whole reason the column exists: a row's `hits` is a
		// claim produced by a rule, and nothing else recorded which one. Measured
		// 2026-10-03, two rows drifted by +104 and +32 while their files moved −3 and
		// −1, purely because `PINNED` was widened and `countRename` gained a
		// subtraction. Every other rule in this file was still green throughout.
		const root = await tree(FILES);
		const violations = await checkPre(root, [row_("src/a.ts", 1, "keep-wire", "why", "N3", "2026-10-02.3")]);
		expect(violations.map(v => `${v.rule}:${v.detail}`)).toEqual([
			`rules-drift:src/a.ts (line 2): hits measured under 2026-10-02.3, this build runs ${RULES_VERSION}`,
		]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("stays silent on a row that states no rule version", async () => {
		// The no-flood contract, and it is the reason `rules` is optional rather than
		// required. Every existing row is unstated; reporting them all would bury the
		// one drifted row in a wall of red, and a gate that floods gets switched off
		// rather than fixed. Silence here is the designed behaviour, not a gap.
		const root = await tree(FILES);
		const violations = await checkPre(root, [row_("src/a.ts", 1, "keep-wire", "why", "N3")]);
		expect(violations).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});
});

describe("stage pre", () => {
	const FILES = {
		"src/a.ts": `const n = "omp"; const m = 1; // omp again\n`,
		"src/c.ts": `const ORIGINATOR = "omp";\n`,
	};

	it("passes a table that covers every hit file and balances", async () => {
		const root = await tree(FILES);
		const violations = await checkPre(root, [
			row_("src/a.ts", 2, "rename", "W1"),
			row_("src/c.ts", 1, "keep-wire", "N3", "N3"),
		]);
		expect(violations).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("reports a file with hits but no row, and a row for a file with none", async () => {
		// Two-way reconciliation: reporting only one direction would let a sweep
		// delete its own evidence, or let stale rows accumulate forever. These two
		// checks are independent — dropping a.ts's row and adding a row for a file
		// that does not exist are different mistakes, and each must surface alone.
		const root = await tree(FILES);
		const uncovered = await checkPre(root, [row_("src/c.ts", 1, "keep-wire", "N3", "N3")]);
		expect(uncovered.map(v => `${v.rule}:${v.detail}`)).toEqual(["missing-row:src/a.ts"]);

		const orphaned = await checkPre(root, [
			row_("src/a.ts", 2, "rename", "W1"),
			row_("src/c.ts", 1, "keep-wire", "N3", "N3"),
			row_("src/gone.ts", 1, "rename", "W1"),
		]);
		expect(orphaned.map(v => `${v.rule}:${v.detail}`)).toEqual(["stale-row:src/gone.ts"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("reports rows whose hits do not sum to the file's real count", async () => {
		const root = await tree(FILES);
		const violations = await checkPre(root, [
			row_("src/a.ts", 5, "rename", "W1"),
			row_("src/c.ts", 1, "keep-wire", "N3", "N3"),
		]);
		expect(violations.map(v => v.rule)).toContain("hits-imbalance");
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("reports an empty reason and a keep-* row with no owner", async () => {
		const root = await tree(FILES);
		const violations = await checkPre(root, [
			row_("src/a.ts", 2, "rename", ""),
			row_("src/c.ts", 1, "keep-wire", "N3", ""),
		]);
		expect(violations.map(v => v.rule).sort()).toEqual(["empty-reason", "missing-keep-refs"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("does not throw when a row points at a file that no longer exists", async () => {
		// A gate that crashes on bad input cannot be run by the person who needs to
		// run it; the stale row has to be reported, not thrown.
		const root = await tree(FILES);
		const violations = await checkPre(root, [row_("src/gone.ts", 1, "rename", "W1")]);
		// a.ts and c.ts are uncovered, gone.ts does not exist.
		expect(violations.filter(v => v.rule === "missing-row")).toHaveLength(2);
		expect(violations.filter(v => v.rule === "stale-row").map(v => v.detail)).toEqual(["src/gone.ts"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("does not call a row stale just because its class is disjoint from the pinned set", async () => {
		// The bug this defends: `keep-path` is counted by the literal `".omp"`, which
		// the pinned expression cannot match, so a file holding only `".omp"` has no
		// pinned hit. The gate used to read "no pinned hit" as "row went stale" and
		// flagged every such row — 54 of them, all live. The README already said the
		// opposite: a worker's file "may have no pinned hits at all".
		const root = await tree({
			...FILES,
			"src/p.ts": `const dir = path.join(home, ".omp", "run");\n`,
		});
		const violations = await checkPre(root, [
			row_("src/a.ts", 2, "rename", "W1"),
			row_("src/c.ts", 1, "keep-wire", "N3", "N3"),
			row_("src/p.ts", 1, "keep-path", "on-disk agent dir", "N-path"),
		]);
		expect(violations.filter(v => v.rule === "stale-row")).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("still calls a row stale once the file stops carrying what its class counts", async () => {
		// The negative branch, and the reason the case above is not simply a relaxed
		// gate: widening "stale" to include disjoint classes must not make `stale-row`
		// unreachable. Delete the literal and the row has to be reported again.
		const root = await tree({
			...FILES,
			"src/p.ts": `const dir = path.join(home, "run");\n`,
		});
		const violations = await checkPre(root, [
			row_("src/a.ts", 2, "rename", "W1"),
			row_("src/c.ts", 1, "keep-wire", "N3", "N3"),
			row_("src/p.ts", 1, "keep-path", "on-disk agent dir", "N-path"),
		]);
		expect(violations.filter(v => v.rule === "stale-row").map(v => v.detail)).toEqual(["src/p.ts"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("balances a literal-counted row against its own literal, not the pinned total", async () => {
		// `hits` was only ever checked as a group SUM against the pinned count, and a
		// `".omp"`-only file has a pinned count of 0 — so a `keep-path` row declaring
		// `hits = 0` balanced perfectly against a file holding 45 occurrences.
		// Measured 2026-10-02: 45 such rows, all declaring 0, all carrying `".omp"`.
		const root = await tree({
			...FILES,
			"src/p.ts": `const a = ".omp"; const b = ".omp"; const c = ".omp";\n`,
		});
		const wrong = await checkPre(root, [
			row_("src/a.ts", 2, "rename", "W1"),
			row_("src/c.ts", 1, "keep-wire", "N3", "N3"),
			row_("src/p.ts", 0, "keep-path", "on-disk agent dir", "N-path"),
		]);
		expect(wrong.filter(v => v.rule === "literal-hits-imbalance").map(v => v.detail)).toEqual([
			'src/p.ts (line 2): keep-path declares 0, file has 3 of ".omp"',
		]);

		const right = await checkPre(root, [
			row_("src/a.ts", 2, "rename", "W1"),
			row_("src/c.ts", 1, "keep-wire", "N3", "N3"),
			row_("src/p.ts", 3, "keep-path", "on-disk agent dir", "N-path"),
		]);
		expect(right).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});
});

describe("stage post", () => {
	const DONE = {
		"src/a.ts": `const n = "renamed"; // gone\n`,
		"src/c.ts": `const ORIGINATOR = "omp";\n`,
	};

	it("fails a rename row that still has occurrences and passes once swept", async () => {
		const swept = await tree(DONE);
		expect(await checkPost(swept, [row_("src/a.ts", 0, "rename", "W1")])).toEqual([]);

		// Same row, same file, but the sweep was skipped: the count is what differs.
		const unswept = await tree({ "src/a.ts": `const n = "omp";\n` });
		const violations = await checkPost(unswept, [row_("src/a.ts", 1, "rename", "W1")]);
		expect(violations.map(v => v.rule)).toEqual(["rename-incomplete"]);
		await Bun.$`rm -rf ${swept} ${unswept}`.quiet();
	});

	it("counts rename debt as the file's pinned total minus what the keep rows claim", async () => {
		// Three pinned occurrences: two are the wire contract the keep row promised to
		// keep, the third is the rename row's own. Only the third is rename debt — and
		// before this rule was corrected, all three were demanded, so the file could
		// never clear no matter how much was renamed.
		const owed = await tree({ "src/a.ts": `const A = "omp";\nconst B = "omp";\nconst C = "omp";\n` });
		const violations = await checkPost(owed, [
			row_("src/a.ts", 1, "rename", "W1"),
			row_("src/a.ts", 2, "keep-wire", "N3", "N3"),
		]);
		// The NUMBER matters as much as the rule name: a rule that reported "3 left"
		// here would send a sweeper after occurrences the keep row forbids removing.
		expect(violations.map(v => v.rule)).toEqual(["rename-incomplete"]);
		expect(violations[0]!.detail).toContain(": 1 left");

		// What remains is exactly the keep contract. Reporting here would be a rule no
		// rename could ever satisfy, which is the defect this row exists to rule out.
		const settled = await tree({ "src/a.ts": `const A = "omp";\nconst B = "omp";\n` });
		expect(
			await checkPost(settled, [row_("src/a.ts", 0, "rename", "W1"), row_("src/a.ts", 2, "keep-wire", "N3", "N3")]),
		).toEqual([]);
		await Bun.$`rm -rf ${owed} ${settled}`.quiet();
	});

	it("fails when a keep-* contract shrank without a decision", async () => {
		// The row recorded 1 approved occurrence and the file now has 0: someone
		// renamed a wire contract. That is the opposite of what the row authorised.
		const root = await tree({ "src/c.ts": `const ORIGINATOR = "renamed";\n` });
		const violations = await checkPost(root, [row_("src/c.ts", 1, "keep-wire", "N3", "N3")]);
		expect(violations.map(v => v.rule)).toEqual(["keep-shrank"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("checks a literal row against its own literal, but a pinned row against the file total", async () => {
		// The two classes cannot be checked the same way, and the difference is a
		// limitation rather than an accident — so it is pinned here. If a future change
		// makes `keep-shrank` per-row for pinned classes, this test is where the author
		// learns that the split it would need is a human judgement (epic-qoit B), not
		// something the table can be made to prove.
		const pinnedProse = (n: number) => Array.from({ length: n }, (_, i) => `// an omp session ${i}\n`).join("");

		// LITERAL: the row declared 3 `".omp"`, one is gone, and the file still holds
		// other pinned prose. The row's own literal is what shrank, so it fires.
		const literal = await tree({ "src/d.ts": `a ".omp"\nb ".omp"\n${pinnedProse(2)}` });
		const literalHits = await checkPost(literal, [row_("src/d.ts", 3, "keep-path", "r", "X1")]);
		expect(literalHits.map(v => v.rule)).toEqual(["keep-shrank"]);

		// PINNED: the row declared 1 occurrence; the file went from 8 to 7. The row's
		// own count is indistinguishable from the file's, so `keep-shrank` compares 7
		// against 1 and stays green — the occurrence that left is invisible HERE.
		const pinned = await tree({ "src/e.ts": pinnedProse(7) });
		const pinnedHits = await checkPost(pinned, [row_("src/e.ts", 1, "keep-wire", "r", "N3")]);
		expect(pinnedHits).toEqual([]);

		// ...and the sum in `checkPre` is what does catch it, so the table is not
		// unguarded — it is guarded somewhere other than the row.
		const preHits = await checkPre(pinned, [row_("src/e.ts", 1, "keep-wire", "r", "N3")]);
		expect(preHits.map(v => v.rule)).toEqual(["hits-imbalance"]);

		await Bun.$`rm -rf ${literal} ${pinned}`.quiet();
	});

	it("does not throw on a stale row", async () => {
		const root = await tree(DONE);
		const violations = await checkPost(root, [
			row_("src/a.ts", 0, "rename", "W1"),
			row_("src/gone.ts", 0, "rename", "W1"),
		]);
		expect(violations).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});
});

describe("rule tally", () => {
	/** Gate violations shaped exactly as `checkPre` emits them. */
	const v = (rule: string, detail: string) => ({ rule, detail });

	it("splits the lumped total into one count per rule, biggest first", () => {
		// The single `N failures over M rows` line could not be acted on: a reader
		// could not tell 9 stale rows from 90 without counting `FAIL` lines by hand,
		// and 9 is a ratchet ceiling. A ceiling nobody can see is not a ceiling.
		const violations = [
			...Array.from({ length: 9 }, (_, i) => v("stale-row", `a${i}`)),
			...Array.from({ length: 600 }, (_, i) => v("missing-row", `b${i}`)),
			v("literal-hits-imbalance", "c0"),
		];
		expect([...tallyByRule(violations)]).toEqual([
			["missing-row", 600],
			["stale-row", 9],
			["literal-hits-imbalance", 1],
		]);
	});

	it("counts parse problems as their own rule and breaks ties by name", () => {
		// A table the parser rejected has no rows, so its problems are the only thing
		// there is to report — they must not vanish from the tally. Ties are ordered by
		// name so two runs of the same tree print the same lines in the same order.
		const tallied = [...tallyByRule([v("stale-row", "x"), v("empty-reason", "y")], ["p1", "p2"])];
		expect(tallied).toEqual([
			["parse", 2],
			["empty-reason", 1],
			["stale-row", 1],
		]);
		expect([...tallyByRule([])]).toEqual([]);
	});

	it("refuses to tally a rule that is not in RULES", () => {
		// The drift guard `epic-jwsy.14` needs. A rule emitted without being registered
		// would otherwise be tallied like any other, and the tally is exactly what a
		// reader trusts to name every distinct problem — so a renamed rule would hide
		// inside the summary, and the ratchet's ceiling is computed from those counts.
		expect(() => tallyByRule([v("stale-row", "x"), v("renamed-by-mistake", "y")])).toThrow(
			/not in RULES/,
		);
		// And the vocabulary is not decorative: every rule it names must be one this
		// gate can actually produce, or the guard above rejects the gate's own output.
		for (const rule of RULES) expect([...tallyByRule([v(rule, "x")])]).toEqual([[rule, 1]]);
	});
});

describe("hit discovery", () => {
	it("finds nested files and ignores node_modules", async () => {
		const root = await tree({
			"src/deep/nested.ts": `const x = "omp";\n`,
			"node_modules/pkg/index.ts": `const x = "omp";\n`,
			"src/clean.ts": `const x = "nothing here";\n`,
		});
		expect(await hitPaths(root)).toEqual(["src/deep/nested.ts"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("skips a nested repository but still gates tracked dot-directories", async () => {
		// `EnterWorktree` writes a whole checkout under `.claude/worktrees/<name>/`,
		// carrying its own `.git` FILE. The glob descends into it, so the gate used to
		// re-report every finding the parent repository already owns — 661 phantom
		// failures were measured from a single worktree, against ~490 real ones.
		//
		// The first entry is the positive control and is the reason the rule is not
		// simply `dot: false`: `.omp/tools/tui.ts` is a tracked file of THIS repository
		// with a live hit, and dropping dot-directories loses it silently (measured as
		// exactly one lost hit). A nested repository is what separates them.
		const root = await tree({
			".omp/tools/tui.ts": `const x = "omp";\n`,
			".claude/worktrees/someone/.git": `gitdir: /elsewhere\n`,
			".claude/worktrees/someone/src/copied.ts": `const x = "omp";\n`,
		});
		expect(await hitPaths(root)).toEqual([".omp/tools/tui.ts"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("skips session scratch under .lavish-wip but keeps a tracked dot-directory beside it", async () => {
		// `.lavish-wip/` is 478 tracked files of milestone research notes and
		// one-off document generators, excluded because it is not source. It is the
		// only exclusion here that costs coverage, so the rule worth defending is
		// not "does it skip scratch" but "does it skip ONLY scratch".
		//
		// The two controls are what make this a claim. `.omp/tools/tui.ts` is a
		// tracked file of THIS repository that carries a live token: an exclusion
		// written as "any dot-directory that is not source" would drop it silently,
		// which is the failure `.claude/` above is careful to avoid. And a `.lavish-wip`
		// file with no token must stay out too, or the exclusion would be reporting
		// work rather than hiding any.
		const root = await tree({
			".omp/tools/tui.ts": `const x = "omp";\n`,
			".lavish-wip/m5-md/gen-back2b.mjs": `const LEAD = "omp text-predict listening on";\n`,
			".lavish-wip/m5-index/corrections-b.json": `{"lead":"used by omp"}\n`,
		});
		expect(await hitPaths(root)).toEqual([".omp/tools/tui.ts"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("keeps the vocabulary closed and every class mappable", () => {
		for (const disposition of DISPOSITIONS) {
			expect(classMatcher(disposition)).toBeDefined();
		}
	});
});
describe("a keep_ref whose owner resolves but whose contract is written nowhere", () => {
	// The rows differ in ONE respect each, which is what makes this a discrimination
	// rather than a count: same ref shape, same plan document, same everything else.
	// Only the contract's presence in that document, and the owner's own existence,
	// decide the outcome.
	const FILES = {
		"src/a.ts": `const n = "omp"; const m = 1; // omp again\n`,
		"MILESTONE_9_EXECUTION_PLAN.md":
			"## W9. Attribution usage theo model\n\nThe `W9:known-contract` literal is fixed here.\n",
	};

	it("reports the coined contract by name and stays quiet about the documented one", async () => {
		// A rule that prints a count cannot be told apart from one that prints the
		// right count for the wrong rows, and a rule that always fires cannot be told
		// apart from one that ignores its input. Both directions are asserted — and
		// the assertion is on the NAME, because the whole point is that a reader sees
		// WHICH contracts are unverifiable instead of seeing a green line.
		const root = await tree(FILES);

		const coined = await findCoinedRefs(root, [
			row_("src/a.ts", 2, "keep-literal", "wire name", "W9:known-contract"),
			row_("src/a.ts", 2, "keep-literal", "wire name", "W9:ghost-contract"),
		]);

		expect(coined.map(c => c.contract)).toEqual(["ghost-contract"]);
		expect(coined.map(c => c.owner)).toEqual(["W9"]);
		expect(coined[0]!.ref).toBe("W9:ghost-contract");
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("leaves an undefined owner to dangling-keep-ref rather than counting it twice", async () => {
		// `W99` is introduced by no document at all. That failure already has an owner,
		// and one failure answered by two rules reports a total no remedy can move.
		const root = await tree(FILES);

		const coined = await findCoinedRefs(root, [
			row_("src/a.ts", 2, "keep-literal", "wire name", "W99:ghost-contract"),
		]);

		expect(coined).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("reports a contract a plan mentions in prose, not only one a heading introduces", async () => {
		// The corpus match is `includes`, not `PLAN_ID_HEADING`. If it were tightened,
		// a contract defined in an ordinary sentence would be reported as coined, and
		// the reader would have to go grep to learn the gate was wrong about a name
		// that was written down all along.
		const root = await tree({
			...FILES,
			"MILESTONE_9_EXECUTION_PLAN.md": "## W9. Attribution usage\n\nsee also W9:prose-contract for the old form\n",
		});

		const coined = await findCoinedRefs(root, [
			row_("src/a.ts", 2, "keep-literal", "wire name", "W9:prose-contract"),
		]);

		expect(coined).toEqual([]);
		await Bun.$`rm -rf ${root}`.quiet();
	});
});
describe("a rename row whose file is a published module", () => {
	const FILES = {
		// `./*.js` → `./src/*.ts`, and `*` SPANS `/`: `pub/deep/nested` is served by
		// this entry exactly as `pub/widget` is. Anchored on the single-segment shape
		// instead, this rule reported 16 of 194 and called the other 178 "safe to
		// rename" — a false safety claim about files this package does publish.
		"packages/pub/package.json": JSON.stringify({
			name: "@oh-my-pi/pub",
			exports: { "./*.js": "./src/*.ts" },
		}),
		"packages/pub/src/widget.ts": "export const a = 1;\n",
		"packages/pub/src/deep/nested.ts": "export const b = 1;\n",
		// A NESTED KEY, behind conditions. The `.js` here comes from the KEY, and the
		// entry is only reachable by unwrapping `import`/`types`, so a rule that reads
		// one condition level of `Object.keys` sees the word `import`, not a path.
		"packages/cond/package.json": JSON.stringify({
			name: "@oh-my-pi/cond",
			exports: {
				"./overlays/*": { types: "./src/overlays/*.ts", import: "./src/overlays/*.ts" },
			},
		}),
		"packages/cond/src/overlays/model-hub.ts": "export const f = 1;\n",
		"packages/cond/src/elsewhere/ignored.ts": "export const g = 1;\n",
		// Same export shape, but private: it reaches nobody, so renaming inside it
		// breaks no consumer and reporting it would inflate the count.
		"packages/hidden/package.json": JSON.stringify({
			name: "@oh-my-pi/hidden",
			private: true,
			exports: { "./*.js": "./src/*.ts" },
		}),
		"packages/hidden/src/secret.ts": "export const c = 1;\n",
		// Publishes nothing by wildcard.
		"packages/plain/package.json": JSON.stringify({ name: "@oh-my-pi/plain", exports: { ".": "./src/index.ts" } }),
		"packages/plain/src/thing.ts": "export const d = 1;\n",
	};

	it("reports a nested file as published, because `*` spans `/`", async () => {
		// The regression this defends: a rule that required ONE segment under `src/`
		// reported only the top-level file and silently cleared the nested one, which
		// is the file most likely to be renamed without anyone noticing it was public.
		const root = await tree(FILES);
		const rows = [
			row_("packages/pub/src/widget.ts", 1, "rename", "renamed"),
			row_("packages/pub/src/deep/nested.ts", 1, "rename", "renamed"),
		];

		const survey = await findPublishedFileRenames(root, rows);

		expect(survey.rows.map(r => r.specifier)).toEqual(["@oh-my-pi/pub/widget.js", "@oh-my-pi/pub/deep/nested.js"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("reads the specifier through conditions and the key's own `.js` suffix", async () => {
		// The suffix is the KEY's, not the filename's: a rule that appends `.js` from
		// the file extension would name a specifier that does not resolve, and one that
		// reads `Object.keys(value)` sees `import`, never `./src/overlays/*.ts`.
		const root = await tree(FILES);
		const rows = [
			row_("packages/cond/src/overlays/model-hub.ts", 1, "rename", "renamed"),
			row_("packages/cond/src/elsewhere/ignored.ts", 1, "rename", "renamed"),
		];

		const survey = await findPublishedFileRenames(root, rows);

		expect(survey.rows.map(r => r.specifier)).toEqual(["@oh-my-pi/cond/overlays/model-hub"]);
		expect(survey.notPublishedInSamePackage).toBe(1); // in a publishing package, not published
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("excludes a private package, and a row naming a file that is not there", async () => {
		// Two rows that cannot carry a breaking-change verdict. The private package
		// publishes to nobody; the deleted file has no specifier and no consumer. Both
		// are still COUNTED, so the partition stays whole.
		const root = await tree(FILES);
		const rows = [
			row_("packages/hidden/src/secret.ts", 1, "rename", "renamed"),
			row_("packages/plain/src/thing.ts", 1, "rename", "renamed"),
			row_("packages/pub/src/gone.ts", 1, "rename", "renamed"),
		];

		const survey = await findPublishedFileRenames(root, rows);

		expect(survey.rows).toEqual([]);
		expect(survey.fileMissingOnDisk).toBe(1);
		expect(survey.outsidePublishingPackage).toBe(2); // the private one publishes nothing either
		expect(survey.reconciles).toBe(true);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("partitions every rename row, so the headline count is not a silent subset", async () => {
		// The number means nothing to a reader who cannot see what it was taken from.
		// If the buckets stop summing, one of them is swallowing rows while the total
		// still reads like a complete population.
		const root = await tree(FILES);
		const rows = [
			row_("packages/pub/src/widget.ts", 1, "rename", "renamed"),
			row_("packages/pub/src/deep/nested.ts", 1, "rename", "renamed"),
			row_("packages/plain/src/thing.ts", 1, "rename", "renamed"),
			row_("packages/pub/src/widget.ts", 1, "keep-prose", "prose"), // not a rename
		];

		const survey = await findPublishedFileRenames(root, rows);

		expect(survey.renameRowsTotal).toBe(3); // the keep-prose row is not counted at all
		expect(survey.reconciles).toBe(true);
		expect(
			survey.rows.length +
				survey.notPublishedInSamePackage +
				survey.outsidePublishingPackage +
				survey.fileMissingOnDisk,
		).toBe(survey.renameRowsTotal);
		await Bun.$`rm -rf ${root}`.quiet();
	});
});
describe("a keep_ref that names nothing", () => {
	const FILES = {
		"src/a.ts": `const n = "omp"; const m = 1; // omp again\n`,
		"MILESTONE_9_EXECUTION_PLAN.md": "## W9. Attribution usage theo model\n",
	};

	it("accepts a bare W ref a plan introduces and reports one that introduces none", async () => {
		// The cell is the row's claim about WHO signed the exception. Until the
		// `dangling-keep-ref` rule the gate checked only that it was non-empty, so a
		// ref naming a node that never existed looked exactly like a real one. Both
		// directions are asserted: a rule that only ever fires proves nothing, and
		// neither does one that only ever stays quiet.
		const root = await tree(FILES);

		const live = await checkPre(root, [row_("src/a.ts", 2, "rename", "renamed", "W9")]);
		expect(live.map(v => v.rule)).toEqual([]);

		const dead = await checkPre(root, [row_("src/a.ts", 2, "rename", "renamed", "W99")]);
		expect(dead.map(v => `${v.rule}:${v.detail.split(" ").at(-1)}`)).toEqual(["dangling-keep-ref:W99"]);

		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("resolves the OWNER a namespaced ref names, without resolving the name", async () => {
		// `W11:project-root-.omp` had no owner check at all: `BARE_PLAN_ID` is anchored,
		// so the namespaced shape never matched it and all 338 `W11:` rows sat outside
		// the rule. On the real table that change is invisible — every one of the 338
		// resolves — so this cell varies the OWNER instead, which is the only thing the
		// rule now has an opinion about.
		const withoutW11 = await tree(FILES);
		const dead = await checkPre(withoutW11, [row_("src/a.ts", 2, "rename", "renamed", "W11:project-root-.omp")]);
		// The detail names the OWNER, not the full ref: what is unresolved is the node.
		expect(dead.map(v => `${v.rule}:${v.detail.split(" ").at(-1)}`)).toEqual(["dangling-keep-ref:W11"]);
		await Bun.$`rm -rf ${withoutW11}`.quiet();

		const withW11 = await tree({ ...FILES, "MILESTONE_11_EXECUTION_PLAN.md": "## W11. Contract vocabulary\n" });
		const live = await checkPre(withW11, [row_("src/a.ts", 2, "rename", "renamed", "W11:project-root-.omp")]);
		// Quiet, but NOT because the contract name is defined — it is still coined, and
		// still counted by `countUnverifiableKeepRefs` below. The owner resolved; the name
		// did not. A run that read this as "verified" would be the exact overstatement
		// the unreconciled report exists to prevent.
		expect(live.map(v => v.rule)).toEqual([]);
		await Bun.$`rm -rf ${withW11}`.quiet();
	});

	it("leaves a bead id and a coined contract name unenforced rather than dangling", async () => {
		// The scoping decision that keeps 24 correctly-attributed rows from going red.
		// `PLAN_ID_HEADING` introduces `W<n>` only, so `a57q` and `internal-path-reference`
		// are not plan nodes. Checking "anything before the colon" would fire on all of
		// them the moment it failed to resolve — trading 24 right rows for 24 wrong reds.
		const root = await tree(FILES);
		for (const ref of ["a57q:rs-glob", "N3", "internal-path-reference", "windows-named-pipe-endpoint", ""]) {
			const violations = await checkPre(root, [row_("src/a.ts", 2, "rename", "renamed", ref)]);
			expect(violations.map(v => v.rule)).toEqual([]);
		}
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("does not resolve an id out of prose that merely mentions it", async () => {
		// `_W11` inside a file name and `### GATE B — W9` as a heading's tail both
		// CONTAIN the token without introducing anything. A substring search would
		// call both "defined"; only a heading that OPENS with the id may count.
		const root = await tree({
			...FILES,
			"MILESTONE_9_EXECUTION_PLAN.md": "prose: see _W11 and ### GATE B — W9\n",
		});
		const violations = await checkPre(root, [row_("src/a.ts", 2, "rename", "renamed", "W9")]);
		expect(violations.map(v => v.rule)).toEqual(["dangling-keep-ref"]);
		await Bun.$`rm -rf ${root}`.quiet();
	});

	it("counts the refs it cannot judge, so a green run is not read as full coverage", async () => {
		// The `W11:*` vocabulary and the bare `N*` ids have no definition site at all.
		// They cannot be enforced, but they must still be visible: the whole point is
		// that an unchecked ref must not read as a checked one.
		const counted = countUnverifiableKeepRefs([
			row_("src/a.ts", 1, "keep-wire", "why", "W9"),
			row_("src/c.ts", 1, "keep-wire", "why", "W11:project-root-.omp"),
			row_("src/d.ts", 1, "keep-wire", "why", "a57q:rs-glob"),
			row_("src/e.ts", 1, "keep-wire", "why", "N3"),
		]);
		expect(counted.count).toBe(3);
		expect(counted.kinds).toEqual(["W11:*", "a57q:*", "bare-non-W"]);
	});

	it("decomposes the unverifiable total, largest family first", () => {
		// The point of the breakdown: `333 (W11:*, a57q:*, bare-non-W)` is one number for
		// what may be one large cause or several small ones, and a reader cannot tell which
		// they are looking at. What makes that readable is that the big family is FIRST and
		// carries its own number, so "the coined vocabulary is almost all of it" is
		// something the output states rather than something a reader has to infer.
		const counted = countUnverifiableKeepRefs([
			row_("src/a.ts", 1, "keep-wire", "why", "W11:contract-one"),
			row_("src/b.ts", 1, "keep-wire", "why", "W11:contract-two"),
			row_("src/c.ts", 1, "keep-wire", "why", "W11:contract-three"),
			row_("src/d.ts", 1, "keep-wire", "why", "a57q:rs-glob"),
			row_("src/e.ts", 1, "keep-wire", "why", "N3"),
		]);
		expect(counted.count).toBe(5);
		// Descending by count — the assertion is the ORDER, not the presence of the numbers.
		// An unsorted list carrying the same totals would pass a presence check and fail
		// exactly the reader this breakdown exists for.
		expect(counted.byKind).toEqual([
			["W11:*", 3],
			["a57q:*", 1],
			["bare-non-W", 1],
		]);
		// Ties break by name, so an unchanged table cannot appear to move between runs.
		// `a57q:*` and `bare-non-W` both have 1, and this is the order they must land in.
		expect(counted.byKind[1]?.[0]).toBe("a57q:*");
		expect(counted.byKind[2]?.[0]).toBe("bare-non-W");
	});
});

/**
 * `pinned-not-reconciled` — occurrences no rule in the gate can see.
 *
 * The contract is a coverage claim, not a count: a path carrying pinned occurrences
 * must be *reachable* by something, and the three rules that could reach it each
 * require a row this shape does not have. `missing-row` needs no row at all,
 * `rename-incomplete` needs a `rename` row, and the group sum is skipped when every
 * row is literal-counted. So the report is the only thing standing between a file's
 * brand tokens and a sweep that leaves them behind silently.
 *
 * Each test states the failure it defends. The negative cases matter as much as the
 * positive one: a report that fires on every literal-counted path is noise, and noise
 * is what gets the report deleted.
 */
describe("findUnreconciledPinned", () => {
	/** `".omp"` is a PATH literal — the dot excludes it from the pinned expression. */
	const LITERAL_ONLY = `const dir = ".omp";\n`;
	/** A bare `"omp"` token is pinned, and rides along beside the literal. */
	const LITERAL_PLUS_PINNED = `const dir = ".omp";\nconst brand = "omp";\n`;

	it("reports a literal-counted path that also carries pinned occurrences", async () => {
		const root = await tree({ "t.ts": LITERAL_PLUS_PINNED });
		const rows = [row_("t.ts", 1, "keep-path", "XDG dir", "W1:dir")];

		// The failure: this file's `"omp"` token is never renamed and never reported.
		const found = await findUnreconciledPinned(root, rows);
		expect(found).toEqual([{ path: "t.ts", occurrences: 1 }]);
	});

	it("stays silent for a literal-counted path carrying no pinned occurrences", async () => {
		const root = await tree({ "t.ts": LITERAL_ONLY });
		const rows = [row_("t.ts", 1, "keep-path", "XDG dir", "W1:dir")];

		// The negative contract. Without it the report fires on every `keep-path` row in
		// the table, and a report that always fires is one nobody reads.
		expect(await findUnreconciledPinned(root, rows)).toEqual([]);
	});

	it("leaves a path that has a pinned row to the group sum", async () => {
		const root = await tree({ "t.ts": LITERAL_PLUS_PINNED });
		const rows = [row_("t.ts", 1, "keep-path", "XDG dir", "W1:dir"), row_("t.ts", 1, "rename", "brand", "")];

		// Precedence, and the reason this report cannot simply be "any file with pinned
		// occurrences": `hits-imbalance` already reconciles this path's sum, and the two
		// would report the same file for the same reason.
		expect(await findUnreconciledPinned(root, rows)).toEqual([]);
	});

	it("orders by occurrence count so the cap names the worst first", async () => {
		const many = `const a = "omp"; const b = "omp"; const c = "omp";\n`;
		const root = await tree({ "few.ts": LITERAL_PLUS_PINNED, "many.ts": many });
		const rows = [row_("few.ts", 1, "keep-path", "d", "W1:d"), row_("many.ts", 1, "keep-path", "d", "W1:d")];

		// `main` prints only the first NAMED and counts the tail. If the order were by
		// path, a truncated report could hide the largest offender behind an alphabetical
		// neighbour and still read as complete.
		const found = await findUnreconciledPinned(root, rows);
		expect(found.map(u => [u.path, u.occurrences])).toEqual([
			["many.ts", 3],
			["few.ts", 1],
		]);
	});

	it("skips a row whose file is gone instead of throwing the run away", async () => {
		const root = await tree({ "present.ts": LITERAL_PLUS_PINNED });
		const rows = [row_("present.ts", 1, "keep-path", "d", "W1:d"), row_("deleted.ts", 1, "keep-path", "d", "W1:d")];

		// `stale-row` reports the missing file in the `pre` stage. Reading it here would
		// throw ENOENT and take the whole gate down instead of the one path that is wrong.
		const found = await findUnreconciledPinned(root, rows);
		expect(found.map(u => u.path)).toEqual(["present.ts"]);
	});
});

/**
 * `stale-row`'s coverage, which its own silence used to hide.
 *
 * The failure this defends against is not a wrong count — it is a count that
 * could be wrong without anyone noticing. `tallyByRule` only walks rules that
 * HAVE violations, so a rule that finds nothing prints no line at all. Measured
 * 2026-10-03 at `403cd0e2dc`: `stale-row` reported zero violations, the summary
 * said nothing about it, and a reader seeing two other rules printed could
 * reasonably conclude it had passed, did not exist, or had never been run.
 *
 * Two distinct claims, so two rows. Each fails if the number is faked.
 */
describe("the coverage stale-row's silence used to hide", () => {
	/**
	 * A file carrying `__omp_worker_` and nothing the pinned expression matches.
	 *
	 * This is the ONLY shape the `stale-row` rule ever examines, and that is not an
	 * accident of the fixture — it is what the two guards produce. `keep-path` is a
	 * literal-counted class too, but every file holding `".omp"` also matches
	 * PINNED (which was widened on 2026-10-03 to admit a leading `.`), so guard 1
	 * skips those paths before any counting. Verified against the gate's own
	 * `countClass` and `PINNED`, not by reading the regex: measured at
	 * `403cd0e2dc`, 1 path examined of 644, and that 1 is a `keep-worker-selector`
	 * row. Declared here rather than borrowed from the `findUnreconciledPinned`
	 * block, whose copy is a `const` inside its own `describe`.
	 */
	const CARRIES_SELECTOR = `const w = "__omp_worker_stats_sync";\n`;
	/**
	 * The number is computed, not declared.
	 *
	 * A fixture chosen so the two numbers DIFFER is what makes this a contract:
	 * a hard-coded "1 of 644" — the real repository's values — would fail here,
	 * and so would one that reported the whole table as examined.
	 *
	 * The tree holds one path per way out of the rule, and each escapes by a
	 * DIFFERENT guard, so a counter that conflated them would fail:
	 *   - `survivor.ts`  — examined, and still carries its literal ⇒ no violation
	 *   - `emptied.ts`   — examined, and carries none ⇒ `stale-row`
	 *   - `selector.ts`  — examined; the only literal class whose files do not
	 *                     also match PINNED, so it is the only shape that reaches
	 *                     the counter at all
	 *   - `pinned.ts`    — pinned-counted row, so guard 2 skips it unread
	 *   - `has-hit.ts`   — a `keep-path` file, which matches PINNED, so guard 1
	 *                     skips it even though its class is literal-counted
	 */
	it("counts only the paths the rule actually opened a file for", async () => {
		const root = await tree({
			"survivor.ts": CARRIES_SELECTOR,
			"emptied.ts": "const unrelated = 1;\n",
			"selector.ts": CARRIES_SELECTOR,
			"pinned.ts": 'const brand = "omp";\n',
			"has-hit.ts": 'const dir = ".omp";\n',
		});
		const rows = [
			row_("survivor.ts", 1, "keep-worker-selector", "d", "W1:d"),
			row_("emptied.ts", 1, "keep-worker-selector", "d", "W1:d"),
			row_("selector.ts", 1, "keep-worker-selector", "d", "W1:d"),
			row_("pinned.ts", 1, "rename", "d"),
			row_("has-hit.ts", 1, "keep-path", "d", "W1:d"),
		];

		const { violations, coverage } = await checkPreWithCoverage(root, rows);

		// The numerator: the three paths that got past both guards and were opened.
		// `pinned.ts` (no literal of its own) and `has-hit.ts` (matches PINNED) are
		// NOT in it — counting either would overstate the reach, and they are
		// unreached for two different reasons, which is the distinction worth
		// pinning.
		expect(coverage.staleRow.examined).toBe(3);
		// The denominator: every path the table says something about, including the
		// two the rule cannot look at. That ratio is the whole point of the number.
		expect(coverage.staleRow.of).toBe(5);
		expect(coverage.staleRow.examined).toBeLessThan(coverage.staleRow.of);

		// The verdict is unchanged by the reporting: only the path that lost its
		// literal is stale. The two survivors were examined and passed.
		expect(violations.filter(v => v.rule === "stale-row").map(v => v.detail)).toEqual(["emptied.ts"]);
	});

	/**
	 * The wrapper every other consumer calls is the same function's output.
	 *
	 * `check-disposition-ratchet.ts` calls `checkPre`, so the two shapes have to
	 * agree on violations or the gate and its own ratchet would measure different
	 * things. Asserting equality on the sorted set — not just the length — is what
	 * makes this a contract rather than a count.
	 */
	it("leaves checkPre's violations identical, since the ratchet calls that one", async () => {
		const root = await tree({ "a.ts": CARRIES_SELECTOR, "b.ts": 'const brand = "omp";\n' });
		const rows = [row_("a.ts", 1, "keep-path", "d", "W1:d"), row_("b.ts", 1, "rename", "d")];

		const viaOld = await checkPre(root, rows);
		const viaNew = await checkPreWithCoverage(root, rows);

		expect(viaNew.violations.length).toBe(viaOld.length);
		expect(viaNew.violations.map(v => `${v.rule} ${v.detail}`).sort()).toEqual(
			viaOld.map(v => `${v.rule} ${v.detail}`).sort(),
		);
	});
});

describe("guard falsifier lane (epic-jwsy.14)", () => {
	const TOKEN = `const n = "omp";\n`;

	/** Every rule this battery proved it can drive to fire. */
	async function triggered(): Promise<Set<string>> {
		const seen = new Set<string>();
		const collect = (vs: readonly { rule: string }[]) => vs.forEach(v => seen.add(v.rule));

		// Per-row reviewability. Each row is otherwise valid, so the rule that fires is
		// the one the row is built to trip — an unrelated rule firing first would hide it.
		const perRow = await tree({ "src/a.ts": TOKEN });
		const prose = "This is a whole justification paragraph rather than a name.";
		for (const row of [
			row_("src/a.ts", 1, "keep-wire", ""), // empty-reason
			row_("src/a.ts", 1, "keep-wire", "why", "N3", "2026-10-02.3"), // rules-drift
			row_("src/a.ts", 1, "keep-wire", "why"), // missing-keep-refs
			row_("src/a.ts", 1, "keep-wire", "why", "W999"), // dangling-keep-ref
			row_("src/a.ts", 1, "keep-wire", "why", prose), // keep-ref-shape
		]) {
			collect(await checkPre(perRow, [row]));
		}

		// A file carrying a pinned hit that no row accounts for.
		const uncovered = await tree({ "src/a.ts": TOKEN, "src/b.ts": TOKEN });
		collect(await checkPre(uncovered, [row_("src/a.ts", 1, "rename", "why")]));

		// A row whose file is gone.
		const gone = await tree({ "src/a.ts": TOKEN });
		collect(await checkPre(gone, [row_("src/gone.ts", 1, "keep-path", "why")]));

		// A literal class declaring a count the file does not hold.
		const literal = await tree({ "src/a.ts": `const d = ".omp";\n` });
		collect(await checkPre(literal, [row_("src/a.ts", 5, "keep-path", "why")]));

		// Pinned rows whose sum misses the file.
		const pinned = await tree({ "src/a.ts": TOKEN });
		collect(await checkPre(pinned, [row_("src/a.ts", 7, "rename", "why")]));

		// checkPost: a keep row that shrank, and a rename row that still owes.
		const post = await tree({ "src/a.ts": TOKEN });
		collect(await checkPost(post, [row_("src/a.ts", 3, "keep-wire", "why", "N3")]));
		collect(await checkPost(post, [row_("src/a.ts", 1, "rename", "why")]));

		await Bun.$`rm -rf ${perRow} ${uncovered} ${gone} ${literal} ${pinned} ${post}`.quiet();
		return seen;
	}

	it("drives every rule in RULES to fire, so none of them is unfalsifiable", async () => {
		// `epic-jwsy.14`: a guard nobody has watched go red is a guard whose green means
		// nothing. Measured on this tree: the corpus itself drives exactly ONE of the
		// eleven rules, so ten of them could break without the gate ever noticing. This
		// lane is what makes "the gate is green" a statement about behaviour.
		//
		// Fixtures, not a grep over the source: asserting that a rule NAME appears in a
		// file would pass on a rule that can no longer fire and fail on a rule spelled
		// slightly differently. Every rule below is driven by running the gate.
		const seen = await triggered();
		expect(RULES.filter(rule => !seen.has(rule))).toEqual([]);
	});
});
