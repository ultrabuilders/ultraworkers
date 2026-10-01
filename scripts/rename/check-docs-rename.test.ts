import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { isExcluded, loadAllowlist, scanRuleA, staleAllowlistEntries, ungatedViolations } from "./check-docs-rename";

/**
 * The gate's contract, in the terms a user of the gate experiences:
 * a file that has been renamed is not reported, a file that has NOT been
 * renamed is a failure, and a file that is allowed but has grown since it was
 * allowed is also a failure.
 *
 * Every case here was run against the real script before being written down.
 * The budget row is not hypothetical: with a bare path list, injecting one more
 * legacy token into an already-allowed file left the gate at exit 0.
 */

async function fixture(files: Record<string, string>): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-rename-"));
	for (const [rel, body] of Object.entries(files)) {
		const target = path.join(dir, rel);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(target, body);
	}
	return dir;
}

describe("rule A path exclusion", () => {
	// The exclusion list is where a rename sweep does its damage if it is wrong:
	// `src/**.md` is prompt corpus compiled into system prompts at runtime, so
	// renaming a token there changes what the model is told.
	it("keeps runtime prompt corpus and plan history out of the documentation surface", () => {
		expect(isExcluded("packages/coding-agent/src/prompts/internal-urls/omp.md")).toBe(true);
		expect(isExcluded("packages/coding-agent/src/prompts/anything.md")).toBe(true);
		expect(isExcluded("packages/coding-agent/test/fixtures/case.md")).toBe(true);
		expect(isExcluded(".omp/skills/semantic-compression/SKILL.md")).toBe(true);
		expect(isExcluded(".lavish/logs/one.md")).toBe(true);
		expect(isExcluded("packages/coding-agent/CHANGELOG.md")).toBe(true);
		expect(isExcluded("MILESTONE_1_EXECUTION_PLAN.md")).toBe(true);
	});

	it("does not exclude real documentation", () => {
		// The failure that matters: an exclusion broad enough to swallow docs is
		// a gate that can never go red on the thing it exists to catch.
		expect(isExcluded("docs/settings.md")).toBe(false);
		expect(isExcluded("README.md")).toBe(false);
		expect(isExcluded("docs/skills/authoring-extensions.md")).toBe(false);
	});
});

describe("rule A scanning", () => {
	it("reports a documentation file carrying the legacy token", async () => {
		const dir = await fixture({ "docs/a.md": "run omp please\n" });
		const violations = await scanRuleA(dir);
		expect(violations).toEqual([{ path: "docs/a.md", occurrences: 1 }]);
		await fs.rm(dir, { recursive: true, force: true });
	});

	// The token must be word-bounded, or the gate fires on `omplete`,
	// `compile.ts` prose and every other word containing the letters.
	it("does not match the token inside a longer word", async () => {
		const dir = await fixture({ "docs/a.md": "omplete and compiler\n" });
		expect(await scanRuleA(dir)).toEqual([]);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it("ignores an excluded path even when it carries the token", async () => {
		const dir = await fixture({
			"packages/x/src/prompts/p.md": "omp\n",
			".omp/skills/s/SKILL.md": "omp\n",
		});
		expect(await scanRuleA(dir)).toEqual([]);
		await fs.rm(dir, { recursive: true, force: true });
	});

	// MT4 SURVIVED the assertion above: widening `EXCLUDED_PACKAGE_PATHS` from
	// `src|test|bench` to all of `packages/` left the suite green, because every
	// other case checked `isExcluded` in isolation and never asked the SCAN to
	// honour it. This row is the one that dies — a real scan over a real
	// package-shaped tree, not a predicate call.
	it("keeps prompt corpus out of a real scan even when the exclusion is widened", async () => {
		const dir = await fixture({
			// A package README is documentation and MUST still be reported.
			"packages/x/README.md": "run omp\n",
			// Prompt corpus under src/ is runtime, and must not be.
			"packages/x/src/prompts/p.md": "omp\n",
			"packages/x/src/prompts/internal-urls/omp.md": "omp\n",
			"packages/x/test/fixtures/case.md": "omp\n",
		});
		const violations = await scanRuleA(dir);
		expect(violations).toEqual([{ path: "packages/x/README.md", occurrences: 1 }]);
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe("rule A allow-list", () => {
	it("fails a file that is not on the list", async () => {
		const violations = [{ path: "docs/a.md", occurrences: 1 }];
		expect(ungatedViolations(violations, [])).toHaveLength(1);
	});

	it("passes a file the list accepts", async () => {
		const violations = [{ path: "docs/a.md", occurrences: 4 }];
		expect(ungatedViolations(violations, [{ path: "docs/a.md" }])).toEqual([]);
	});

	// Measured, not assumed: with a bare path list, adding one more token to an
	// allowed file left the gate green. Without a count, an allow-list silences a
	// file forever and the sweep stops converging while still passing.
	it("fails an allowed file that has grown past the count it was accepted at", () => {
		const grown = [{ path: "docs/a.md", occurrences: 5 }];
		expect(ungatedViolations(grown, [{ path: "docs/a.md", budget: 4 }])).toHaveLength(1);
	});

	// The sweep working is the point: a file that dropped tokens stays allowed.
	it("does not fail an allowed file that shrank", () => {
		const shrank = [{ path: "docs/a.md", occurrences: 2 }];
		expect(ungatedViolations(shrank, [{ path: "docs/a.md", budget: 4 }])).toEqual([]);
	});

	// Naming the finished file is how the allow-list shrinks toward the bead's
	// budget instead of growing forever.
	it("names an allow-list line that no longer matches anything", () => {
		const violations = [{ path: "docs/b.md", occurrences: 1 }];
		expect(staleAllowlistEntries(violations, [{ path: "docs/a.md", budget: 1 }])).toEqual(["docs/a.md"]);
	});

	it("treats a missing allow-list as no exemptions rather than as a pass", async () => {
		// A missing file must not read as "nothing to check": that is the state
		// before anyone has seeded it, and it is exactly when the gate must be
		// loudest.
		const dir = await fixture({ "docs/a.md": "omp\n" });
		expect(await loadAllowlist(dir)).toEqual([]);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it("reads a tab-pinned budget and ignores comment lines", async () => {
		const dir = await fixture({
			"scripts/rename/docs-legacy-allowlist.txt": ["# reason goes here", "", "docs/a.md\t7", "docs/b.md"].join("\n"),
		});
		expect(await loadAllowlist(dir)).toEqual([{ path: "docs/a.md", budget: 7 }, { path: "docs/b.md" }]);
		await fs.rm(dir, { recursive: true, force: true });
	});
});
