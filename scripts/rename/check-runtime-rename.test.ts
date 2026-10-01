import { describe, expect, it } from "bun:test";
import { isExcluded, ungatedViolations, staleAllowlistEntries } from "./check-runtime-rename";

/**
 * The gate's decision logic, driven by fixtures.
 *
 * `ungatedViolations` is where the gate decides whether a legacy token is
 * ACCEPTED or BLOCKED, so it carries the contract that matters: an allow-list
 * entry makes a specific site disappear, and it does that by EXACT `path:line`
 * rather than by pattern. Every test below is written so that a plausible
 * implementation error fails it — an allow-list keyed by path alone, keyed by
 * file, or matched with a substring all pass a weaker suite and are exactly the
 * errors that would let a stale instruction through.
 *
 * The allow-list is deliberately NOT a regex. `omp git` in a help string is
 * stale prose, while the same token stored as a data identity (the hindsight
 * default bank id) is not. Only a human reading the line can tell those apart,
 * so the gate refuses to guess and this file pins the refusal.
 */

const SITE = {
	path: "packages/coding-agent/src/commands/git.ts",
	line: 34,
	text: 'console.error("omp git is interactive and requires a TTY")',
};

describe("isExcluded", () => {
	it("keeps runtime source in scope", () => {
		expect(isExcluded("packages/coding-agent/src/commands/git.ts")).toBe(false);
		expect(isExcluded("packages/tui/src/chrome/keybinding-hints.ts")).toBe(false);
	});

	it("excludes work-log and plan trees that are not shipped code", () => {
		// Same exclusions W13 applies, for the same reason: a corpus with no
		// reader must not be able to make the gate permanently red or green.
		expect(isExcluded(".lavish-wip/MILESTONE.md")).toBe(true);
		expect(isExcluded(".lavish/anything.md")).toBe(true);
	});

	it("excludes prompt corpus, tests, and benches from the runtime surface", () => {
		// Markdown under src/ is imported into a system prompt; renaming a token
		// there changes what the model is told, which is not this gate's business.
		expect(isExcluded("packages/coding-agent/src/prompts/foo.md")).toBe(true);
		// A test may assert on a legacy string on purpose — that is the corpus
		// W11's own rename gate reads, not shipped output.
		expect(isExcluded("packages/coding-agent/test/foo.test.ts")).toBe(true);
		expect(isExcluded("packages/coding-agent/bench/foo.ts")).toBe(true);
	});
});

describe("ungatedViolations", () => {
	it("fails every site when the allow-list is empty", () => {
		expect(ungatedViolations([SITE], [])).toEqual([SITE]);
	});

	it("accepts a site whose exact path:line was signed for", () => {
		expect(ungatedViolations([SITE], [{ path: SITE.path, line: SITE.line }])).toEqual([]);
	});

	it("does NOT accept a sibling line in a file that was signed for", () => {
		// The case a path-only allow-list would wave through. A human accepted
		// line 34 after reading THAT sentence; line 35 is a different sentence
		// nobody read, and inheriting the approval is how an allow-list turns
		// into a permanent exemption.
		const other = { ...SITE, line: 35, text: 'console.log("run omp git")' };
		expect(ungatedViolations([other], [{ path: SITE.path, line: SITE.line }])).toEqual([other]);
	});

	it("does NOT accept a different file at the same line number", () => {
		// The case a line-only allow-list would wave through.
		const other = { ...SITE, path: "packages/coding-agent/src/cli/ps-cli.ts" };
		expect(ungatedViolations([other], [{ path: SITE.path, line: SITE.line }])).toEqual([other]);
	});

	it("does not match a path by substring or prefix", () => {
		// The case a regex or `startsWith` allow-list would wave through: an
		// entry for a directory must not exempt every file beneath it.
		const deeper = { ...SITE, path: "packages/coding-agent/src/commands/nested/git.ts" };
		expect(ungatedViolations([deeper], [{ path: "packages/coding-agent/src/commands", line: 34 }])).toEqual([deeper]);
	});

	it("keeps failing sites that no entry names, even alongside accepted ones", () => {
		// Subtracting the allow-list must not be able to empty the result set by
		// accident: one acceptance cannot silence an unrelated file.
		const stale = { ...SITE, path: "packages/coding-agent/src/cli/update-cli.ts" };
		expect(ungatedViolations([SITE, stale], [{ path: SITE.path, line: SITE.line }])).toEqual([stale]);
	});
});

describe("staleAllowlistEntries", () => {
	it("reports an approval whose site no longer matches", () => {
		// Otherwise a retired exemption outlives its line invisibly, and the next
		// sweep inherits an approval nobody can account for.
		expect(staleAllowlistEntries([], [{ path: SITE.path, line: SITE.line }])).toEqual([`${SITE.path}:${SITE.line}`]);
	});

	it("reports nothing when every approval still matches a site", () => {
		expect(staleAllowlistEntries([SITE], [{ path: SITE.path, line: SITE.line }])).toEqual([]);
	});
});
