import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { isExcluded, scanRuntime, ungatedViolations, staleAllowlistEntries } from "./check-runtime-rename";

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

/**
 * The control this trigger change has to earn.
 *
 * Widening the writer set from `console.*` to `logger.*` is only worth doing if
 * the gate can still go RED. A trigger change that cannot fail is indistinguishable
 * from the trigger it replaced: the previous one reported `0 ungated of 0 sites`
 * and exited green because AGENTS.md bans `console.*` beside every runtime this
 * corpus covers, so its domain was empty by policy rather than by cleanliness.
 *
 * Both directions are asserted against a real scan, not against the regex. The
 * `console` row is the load-bearing half — it pins that the old trigger really is
 * the banned one, so a future edit that restores `console.*` (or widens to
 * "anything that writes") fails here instead of passing on a corpus that happens
 * to be clean.
 */
describe("scanRuntime over a fixture root", () => {
	async function scanFixture(files: Record<string, string>): Promise<string[]> {
		const root = await mkdtemp(path.join(tmpdir(), "runtime-rename-"));
		try {
			for (const [relPath, body] of Object.entries(files)) {
				const abs = path.join(root, relPath);
				await mkdir(path.dirname(abs), { recursive: true });
				await writeFile(abs, body);
			}
			return (await scanRuntime(root)).map(violation => `${violation.path}:${violation.line}`);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	}

	it("reports a logger writer carrying the token, and ignores the banned console writer", async () => {
		expect(
			await scanFixture({
				"packages/x/src/writer.ts": [
					'import { logger } from "@oh-my-pi/pi-utils";',
					'logger.debug("omp teardown");',
					"",
				].join("\n"),
				"packages/x/src/legacy.ts": ['logger.debug("no token here");', ""].join("\n"),
				"packages/x/src/banned.ts": ['console.error("omp is interactive");', ""].join("\n"),
			}),
		).toEqual(["packages/x/src/writer.ts:2"]);
	});

	it("reports every level the writer set admits, so a narrowed level cannot pass silently", async () => {
		expect(
			await scanFixture({
				"packages/x/src/levels.ts": [
					'logger.error("omp a");',
					'logger.warn("omp b");',
					'logger.info("omp c");',
					'logger.debug("omp d");',
					'logger.trace("omp e");',
					"",
				].join("\n"),
			}),
		).toEqual([
			"packages/x/src/levels.ts:1",
			"packages/x/src/levels.ts:2",
			"packages/x/src/levels.ts:3",
			"packages/x/src/levels.ts:4",
		]);
	});

	// MEASURED ON THE REAL TREE, NOT HYPOTHESISED
	// ---------------------------------------------
	// `check-runtime-rename` reported `0 ungated of 1 sites` while
	// `discovery/omp-plugins.ts` carried THREE `[omp-plugins]` log messages. Two of
	// them are the same call shape, folded by the formatter:
	//
	//     logger.warn(
	//         `[omp-plugins] MCP server "${name}": invalid requestIdFormat …`,
	//     );
	//
	// The trigger required the writer and the token on the SAME LINE, so the token
	// line matched neither test and the site did not exist as far as the gate was
	// concerned. Only the one call short enough to fit on a single line was counted.
	//
	// That makes the gate's coverage a function of FORMATTING: oxfmt reflowing a
	// message to fit the width limit silently removes it from the census, and no
	// allow-list entry is needed because there is nothing to allow-list. Proven by
	// collapsing one of those calls onto one line — the site count went 1 → 2.
	it("reports a token that a line break separated from its writer call", async () => {
		expect(
			await scanFixture({
				"packages/x/src/multiline.ts": [
					'import { logger } from "@oh-my-pi/pi-utils";',
					"logger.warn(",
					'\t`[omp-plugins] MCP server "${name}": invalid requestIdFormat`,',
					");",
					"",
				].join("\n"),
			}),
		).toEqual(["packages/x/src/multiline.ts:2"]);
	});

	// The other direction, and the reason the fix cannot simply widen the writer
	// test to the whole file: a token in a MIGRATION LIST that never writes is not
	// runtime output, and gating it would put a permanently-red site in the census.
	it("does not report a token that no runtime writer emits", async () => {
		expect(
			await scanFixture({
				"packages/x/src/list.ts": [
					'const LEGACY = ["omp-one", "omp-two"];',
					"export const MIGRATION = LEGACY.map(name => `use ultraworkers, not ${name}`);",
					"",
				].join("\n"),
			}),
		).toEqual([]);
	});
});
