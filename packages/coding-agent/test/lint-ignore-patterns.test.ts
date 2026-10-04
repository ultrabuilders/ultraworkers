import { describe, expect, it } from "bun:test";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");

interface OxlintConfig {
	ignorePatterns?: string[];
}

/**
 * `ignorePatterns` must not switch lint off for this repository's own code.
 *
 * `ignorePatterns` is all-or-nothing: a matching file loses **every** rule —
 * `no-unused-vars` and `no-debugger` included, not just the formatting. So a glob
 * added to silence one vendored bundle can quietly take the repository's own gate
 * scripts out of lint with it, and nothing anywhere reports that.
 *
 * It has happened here twice, in the same family. (The globs are spelled out
 * below rather than quoted: a glob ending in an extension begins with the two
 * characters that close a block comment, so writing one literally here ends the
 * comment mid-sentence and the file fails to parse.)
 *
 *   - A glob matching every `.js` file covered
 *     `packages/coding-agent/src/tools/{browser,computer}/prelude.js` and every
 *     other JS source in the repo — narrowed by `e21e07eb0e`.
 *   - A glob matching every `.mjs` file sat beside it, left 25 files un-guarded
 *     (21 under `scripts/`, 15 of them this repository's own gates), and was
 *     only removed by `00baa0026f` — three days later, once someone asked why
 *     `.mjs` was exempt.
 *
 * The failure this guards is that one returns silently. `00baa0026f` proved its
 * fix by injecting `debugger;` into a `.mjs` file and watching it get reported;
 * that control was run by hand and never committed, so the fix itself is the
 * thing being protected here — a regression would otherwise leave the gates
 * unlinted with a green tree and no failing test.
 *
 * The narrow assertion is deliberate. Demanding a stated reason for EVERY entry
 * in this list would reach the vendored-bundle and dependency globs, which are
 * obviously right and would only add noise; what is worth pinning is the class
 * that has actually bitten — a blanket extension glob that covers code we wrote.
 */
/**
 * The globs that switch lint off for a whole file extension, whatever the file is.
 *
 * Extracted so a test can drive it with a list that *does* contain one. The assertion
 * below is `expect(...).toEqual([])`, and a filter that returns `[]` for everything
 * satisfies it forever — so the rule's ability to fail is asserted separately, against
 * inputs chosen to make the two outcomes differ.
 */
function blanketExtensionExemptions(ignorePatterns: readonly string[]): string[] {
	return ignorePatterns.filter(pattern => /^\*\*\/\*\.(js|mjs|cjs)$/.test(pattern));
}

/**
 * How many tracked fixture files a pattern must exempt before it counts as a *fixture*
 * exemption rather than a vendor or tooling exclusion that happens to clip one.
 *
 * Measured, not chosen. At `HEAD=d73fed57a7` exactly three `ignorePatterns` touch a
 * tracked `test/fixtures/` file, and they are not comparable:
 *
 *   the `python` tree                     -> 1 file
 *   every `.min.js`                       -> 2 files
 *   `packages/coding-agent/test/fixtures/` -> 95 files
 *
 * The first two are exclusions for vendored and Python trees that incidentally contain a
 * fixture; only the third is an exemption written *for* fixtures. A threshold of 3 is
 * what separates them, and it is a floor rather than an exact count so that adding one
 * more vendored fixture does not silently promote a vendor pattern into this rule.
 *
 * (The globs are named in prose because a leading `**` followed by a slash contains the
 * two characters that close this comment — spelled literally, it ends the sentence and
 * the file fails to parse. That is the same trap the file docblock above records.)
 */
const MIN_FIXTURE_FILES = 3;

/**
 * Ignore patterns that exempt test fixtures from more than one package.
 *
 * The regression this catches is **breadth**, not presence. The approved entry covers one
 * package's `test/fixtures/` directory, written down on purpose. Rewriting it to wildcard
 * the package segment — or to wildcard every directory named `test/fixtures` anywhere —
 * keeps the entry looking like the one that is already approved while quietly taking the
 * other 44 fixture files in this repository out of lint with it. Those 44 are linted
 * today; after the rewrite nothing reports that they stopped being.
 *
 * Keyed on the owning directory rather than a file count, so adding a fixture file does
 * not trip it, and widening a path does.
 */
export function overbroadFixtureExemptions(patterns: readonly string[], fixtureFiles: readonly string[]): string[] {
	const overbroad: string[] = [];
	for (const pattern of patterns) {
		const glob = new Bun.Glob(pattern);
		const matched = fixtureFiles.filter(file => glob.match(file));
		if (matched.length < MIN_FIXTURE_FILES) continue;
		const owners = new Set(matched.map(file => file.split("/test/fixtures/")[0] ?? file));
		if (owners.size > 1) overbroad.push(`${pattern} (covers ${owners.size} packages: ${[...owners].join(", ")})`);
	}
	return overbroad;
}

async function readOxlintConfig(): Promise<OxlintConfig> {
	// JSON5, not JSON: oxlint reads this file as JSONC, and it carries the comment
	// recording why `.mjs` was dropped. A strict parser would fail on exactly the
	// prose that documents the decision, which is a good way to get it deleted.
	return Bun.JSON5.parse(await Bun.file(path.join(repoRoot, ".oxlintrc.json")).text()) as OxlintConfig;
}

describe("the lint ignore-list", () => {
	it("does not exempt a whole source extension from lint", async () => {
		const { ignorePatterns = [] } = await readOxlintConfig();
		// Printed rather than counted, so a failure names the glob that came back.
		const blanket = blanketExtensionExemptions(ignorePatterns);
		expect(blanket).toEqual([]);
	});

	it("would go red if a blanket extension exemption were added back", () => {
		// The control this file was missing. `expect(filter(...)).toEqual([])` passes just
		// as well against a filter that never matches anything, so the rule above could
		// have been dead code and the suite would have said nothing. Two inputs that differ
		// only in shape, with opposite required outcomes:
		expect(blanketExtensionExemptions(["**/*.mjs"])).toEqual(["**/*.mjs"]);
		expect(blanketExtensionExemptions(["**/*.js", "**/*.cjs"])).toHaveLength(2);
		// …and one that is narrow rather than blanket, which must survive: a gate that
		// cannot be satisfied without deleting real exemptions will be deleted.
		expect(blanketExtensionExemptions(["packages/*/test/fixtures/**", "**/vendor/**"])).toEqual([]);
		// `.d.ts` is exempt by the rule below's own exception, so it must not read as a
		// blanket exemption here — otherwise the two assertions contradict each other.
		expect(blanketExtensionExemptions(["**/*.d.ts"])).toEqual([]);
	});

	it("keeps `.d.ts` exempt, since declarations are emitted rather than authored", async () => {
		// The one extension exemption that is legitimate, asserted so the rule above
		// cannot be satisfied by deleting it: this guards against a future reader
		// "fixing" the list by dropping the one entry that earns its place.
		const { ignorePatterns = [] } = await readOxlintConfig();
		expect(ignorePatterns).toContain("**/*.d.ts");
	});

	it("does not let one pattern exempt test fixtures across packages", async () => {
		// Measured against the real tracked tree, because the failure is a pattern matching
		// more of this repository than its author read. 139 tracked files live under a
		// `test/fixtures/` directory today; 44 of them are linted, and a widening is exactly
		// what would stop them being linted while still looking like the approved entry.
		const { ignorePatterns = [] } = await readOxlintConfig();
		const tracked = await Bun.$`git ls-files -z`.cwd(repoRoot).quiet().text();
		const fixtureFiles = tracked.split("\0").filter(file => file.includes("/test/fixtures/"));
		// Printed so a failure reports the breadth, and so an empty run cannot be mistaken
		// for a scan that found nothing to look at.
		console.error(`[ignore-list] tracked fixture files: ${fixtureFiles.length}`);
		expect(overbroadFixtureExemptions(ignorePatterns, fixtureFiles)).toEqual([]);
	});

	it("would go red if a fixture exemption were widened across packages", () => {
		// The control. Without it this rule is the same shape as the one above: a filter
		// asserted to return `[]`, which a filter that never matches also satisfies.
		//
		// The two rewrites below are the ones that would look like an edit rather than a
		// deletion — each keeps an approved pattern's *name* in view while multiplying what
		// it covers. Both must be reported, and the anchored original must not be.
		const sixPackages = [
			"packages/ai/test/fixtures/a.ts",
			"packages/client/test/fixtures/b.mjs",
			"packages/coding-agent/test/fixtures/c.ts",
			"packages/durable/test/fixtures/d.ts",
			"packages/server/test/fixtures/e.mjs",
			"packages/utils/test/fixtures/f.ts",
		];
		expect(overbroadFixtureExemptions(["packages/*/test/fixtures/**"], sixPackages)).toHaveLength(1);
		expect(overbroadFixtureExemptions(["**/test/fixtures/**"], sixPackages)).toHaveLength(1);
		// …and the approved shape, which covers only one package's fixtures, must survive.
		expect(overbroadFixtureExemptions(["packages/coding-agent/test/fixtures/**"], sixPackages)).toEqual([]);
		// Below the fixture threshold: a vendor or tooling exclusion that clips one or two
		// fixtures is not a fixture exemption, and must not be dragged into this rule.
		expect(overbroadFixtureExemptions(["**/*.min.js"], sixPackages.slice(0, 2))).toEqual([]);
		expect(overbroadFixtureExemptions(["python/**"], sixPackages.slice(0, 1))).toEqual([]);
		// A pattern that matches no fixture at all is likewise not this rule's business.
		expect(overbroadFixtureExemptions(["**/vendor/**"], sixPackages)).toEqual([]);
	});
});
