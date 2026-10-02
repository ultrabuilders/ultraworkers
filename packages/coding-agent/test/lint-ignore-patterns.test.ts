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
});
