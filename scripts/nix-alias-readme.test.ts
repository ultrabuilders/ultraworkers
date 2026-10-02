/**
 * A nix flake attribute the README tells people to build must exist.
 *
 * ## The failure this catches
 *
 * `flake.nix` publishes a deprecated `omp` alias beside `ultraworkers`, and
 * `README.md` documents `nix build .#omp`. Those two facts live in two files
 * joined by nothing but a string literal — no import, no type, no test.
 * Removing the alias while leaving the README alone documents a command that
 * fails with `flake attribute 'omp' not found`; removing the README line while
 * leaving the alias silently drops a compatibility promise from the docs.
 * Neither change breaks a build, so neither review catches it.
 *
 * ## Why reading both files is the contract, not a shortcut
 *
 * AGENTS.md bans tests that read an implementation file and assert on its text.
 * That ban exists because such a test breaks on harmless refactors while passing
 * on broken behaviour. Neither applies to this pair:
 *
 *   - the two literals are not prose about the code, they ARE the interface. The
 *     published attribute name and the documented command are what a nix user
 *     types, and neither is derivable from the other.
 *   - the only observable failure mode of this coupling is "these two name
 *     different attributes", and reading both is the only way to reach it without
 *     a nix toolchain — which is not installed on the machines this is developed
 *     on, so the package build cannot be the oracle. `nix-binary-name.test.mjs`
 *     makes the same argument for the producer/consumer pair beside it.
 *
 * ## Scope, stated because it is the whole point
 *
 * This asserts that code and documentation agree. It says nothing about whether
 * the `omp` alias *should* exist — that is settled policy, recorded in
 * `flake.nix` as a deprecated alias kept "until the removal can be announced as a
 * breaking change" because a downstream `inputs.<this>.packages.<system>.omp`
 * would break.
 *
 * A mechanical rename sweep is what this guards. `README.md` looks like 65 lines
 * containing `omp` and is actually ONE token under the pinned expression; the
 * rest are `omp.sh` (the domain — changing it breaks every install link),
 * `inputs.omp.*` and `programs.omp` (the consumer's own names), and substring
 * hits inside ordinary words like "complete". Renaming that one token by hand
 * would break downstream nix consumers.
 */
import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { packagesBlock, publishedPackageAttributes } from "./nix-flake-attributes";

const README = path.join(import.meta.dir, "..", "README.md");

/** Every attribute the README tells a reader to build with `nix build .#…`. */
async function documentedBuildAttributes(): Promise<string[]> {
	const source = await fs.readFile(README, "utf8");
	return [...source.matchAll(/nix build \.#(\w[\w.-]*)/g)].map(m => m[1]);
}

/**
 * Attributes the `packages` set keeps as an explicitly deprecated alias.
 *
 * Read from the `Deprecated alias` note rather than from a hardcoded name, so
 * retiring the alias retires this expectation with it. A note whose next
 * non-comment line binds nothing means someone removed the alias and left the
 * promise behind, which is its own drift — so that case fails loudly rather than
 * passing as "no deprecated aliases, nothing to check".
 */
async function deprecatedPackageAliases(): Promise<Set<string>> {
	const lines = (await packagesBlock()).split("\n");
	const aliases = new Set<string>();
	for (let i = 0; i < lines.length; i += 1) {
		if (!/deprecated alias/i.test(lines[i])) continue;
		const binding = lines
			.slice(i + 1)
			.map(line => line.trim())
			.find(line => line.length > 0 && !line.startsWith("#"))
			?.match(/^(\w+)\s*=/);
		expect(
			binding,
			`flake.nix marks a deprecated alias in the packages block but binds no attribute after ` +
				`it. Either the alias went and its note stayed, or this gate no longer understands ` +
				`the shape it reads — both mean it is checking nothing.`,
		).not.toBeNull();
		aliases.add(binding![1]);
	}
	return aliases;
}

describe("flake attributes and the README that documents them", () => {
	it("publishes every attribute the README tells a reader to build", async () => {
		const published = await publishedPackageAttributes();
		const documented = await documentedBuildAttributes();

		expect(
			documented.length,
			"README.md no longer documents any `nix build .#…` attribute, so this gate checks nothing",
		).toBeGreaterThan(0);

		const missing = documented.filter(attr => !published.has(attr));
		expect(missing).toEqual([]);
	});

	it("keeps documenting a deprecated alias that flake still publishes", async () => {
		const deprecated = await deprecatedPackageAliases();
		expect(
			deprecated.size,
			"flake.nix no longer marks any packages alias as deprecated, so this gate's premise is gone",
		).toBeGreaterThan(0);

		const documented = new Set(await documentedBuildAttributes());
		expect([...deprecated].filter(attr => !documented.has(attr))).toEqual([]);
	});
});
