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
	classMatcher,
	countClass,
	countRename,
	DISPOSITIONS,
	hitPaths,
	isCommentLine,
	parseTable,
	requiresKeepRefs,
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

const row_ = (filePath: string, hits: number, disposition: string, reason: string, keepRefs = "") => ({
	scope: "src",
	path: filePath,
	hits,
	disposition: disposition as never,
	reason,
	keepRefs,
	line: 2,
});

describe("disposition table parsing", () => {
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

	it("fails when a keep-* contract shrank without a decision", async () => {
		// The row recorded 1 approved occurrence and the file now has 0: someone
		// renamed a wire contract. That is the opposite of what the row authorised.
		const root = await tree({ "src/c.ts": `const ORIGINATOR = "renamed";\n` });
		const violations = await checkPost(root, [row_("src/c.ts", 1, "keep-wire", "N3", "N3")]);
		expect(violations.map(v => v.rule)).toEqual(["keep-shrank"]);
		await Bun.$`rm -rf ${root}`.quiet();
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

	it("keeps the vocabulary closed and every class mappable", () => {
		for (const disposition of DISPOSITIONS) {
			expect(classMatcher(disposition)).toBeDefined();
		}
	});
});
