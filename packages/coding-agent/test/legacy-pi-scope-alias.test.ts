/**
 * The `ultraworkers` scope alias is a live contract, and this is what holds it to
 * that — asserted through the real rewrite, not a copy of the rule.
 *
 * `PI_SCOPE_ALIASES` in `legacy-pi-compat.ts` lists `"ultraworkers"` beside the
 * spellings ultraworkers has to keep resolving. Nothing in the repository publishes under
 * that scope yet, so before this file the alias was an assertion nobody ran: it
 * could be deleted, or narrowed, and every suite stayed green because no
 * specifier ever took that branch. A green positive row alone would not have
 * fixed that either — it is the two negative rows below, which pin what the
 * alias must NOT admit, that keep a well-meaning edit from quietly widening it.
 *
 * The positive rows assert EQUIVALENCE rather than acceptance: a specifier
 * written under `@ultraworkers` must produce byte-identical output to the same
 * specifier written under the canonical scope. "It resolved to something" would
 * pass even if the alias landed on the wrong package; "it produced exactly the
 * same rewrite" cannot.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { __rewriteLegacyExtensionSourceForTests } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/legacy-pi-compat";

/**
 * The importer only has to exist; resolution of a host package goes through
 * `Bun.resolveSync` from the module scope, not from this path. It sits inside the
 * repo so relative and bare-dependency handling sees a plausible extension.
 */
const IMPORTER = path.join(import.meta.dir, "fixtures", "legacy-pi-extension-cache-probe.ts");

function rewriteSpecifier(specifier: string): Promise<string> {
	return __rewriteLegacyExtensionSourceForTests(`import value from ${JSON.stringify(specifier)};`, IMPORTER);
}

describe("the ultraworkers scope alias", () => {
	test("resolves a package to exactly the same file the canonical scope does", async () => {
		const viaAlias = await rewriteSpecifier("@ultraworkers/pi-utils");
		const viaCanonical = await rewriteSpecifier("@oh-my-pi/pi-utils");

		// Equivalence, not mere acceptance: if the alias ever mapped to a different
		// package, or to a shim instead of the real entry, this is the row that says so.
		expect(viaAlias).toBe(viaCanonical);
		// And "equal" must not mean "equally unresolved" — the rewrite has to land on
		// a real file in this repo, not on a string both sides failed to rewrite.
		expect(viaAlias).toMatch(/^import value from "file:\/\/\/.*\.ts";$/);
	});

	test("carries a relocated upstream subpath through the remap table", async () => {
		// The subpath remap keys on the BARE subpath and is applied after the scope
		// is stripped, so a new scope has to keep working through it. Upstream
		// `pi-ai/compat` lived at the package root; ours is the package root itself.
		// If the remap were consulted before scope canonicalisation, or keyed on the
		// scope, this would resolve to a `compat` file that does not exist.
		const remapped = await rewriteSpecifier("@ultraworkers/pi-ai/compat");

		expect(remapped).toBe(await rewriteSpecifier("@oh-my-pi/pi-ai/compat"));
	});

	test("does not let the alias widen the package list", async () => {
		// The negative contract, and the probe is chosen carefully: `@ultraworkers/
		// not-a-package` would be worthless here. Nothing resolves that name, so the
		// rewrite would leave it alone whether or not the filter admitted it — the row
		// would stay green with the package list deleted, which is precisely the
		// mistake it exists to catch.
		//
		// `pi-catalog` is real, installed, and deliberately absent from the six names
		// in `PI_PACKAGE_NAMES` (those are the ones bundled inside the binary). So if
		// the basename half of the filter were dropped, this specifier would remap AND
		// resolve — a difference the row can actually see.
		const rewritten = await rewriteSpecifier("@ultraworkers/pi-catalog");

		expect(rewritten).toContain("@ultraworkers/pi-catalog");
	});

	test("does not admit an unknown scope just because the basename matches", async () => {
		// The mirror image. The package list is shared across every accepted scope,
		// so the scope half of the filter is what stops a third party from claiming
		// `@anything/pi-utils` and inheriting ultraworkers' bundled copy of it.
		const rewritten = await rewriteSpecifier("@evil/pi-utils");

		expect(rewritten).toContain("@evil/pi-utils");
	});
});
