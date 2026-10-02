/**
 * The NixOS / Home Manager option surface, and the README that teaches it.
 *
 * ## The failure this catches
 *
 * `nix/nixos-module.nix` and `nix/home-manager.nix` are the only places in the
 * repository that declare `options.programs.omp`, and `README.md` is the only
 * place that tells a user to write `programs.omp = { … }`. Nothing joins them:
 * measured 2026-10-02, `git grep -l 'nixos-module\|home-manager'` over every
 * `*.test.ts`/`*.test.mjs` in the repo returns nothing, so no test had ever
 * opened either module.
 *
 * So the option can be renamed in the module while the README keeps teaching
 * the old name, and every configuration that follows the README fails to
 * evaluate with `The option `programs.omp` does not exist`. That breaks at
 * activation time, on a machine, not in CI.
 *
 * The second contract here is the module's own default. Each module resolves
 * its package through
 * `lib.literalExpression "inputs.<name>.packages.<system>.<attr>"`, so the
 * attribute it names has to be one `flake.nix` actually publishes. Deleting
 * that attribute breaks the module silently — the string is never checked
 * against the flake.
 *
 * ## Why reading these files is the contract, not a shortcut
 *
 * AGENTS.md bans tests that read an implementation file and assert on its text.
 * That ban exists because such a test breaks on harmless refactors while passing
 * on broken behaviour. Neither applies to any assertion here:
 *
 *   - the literals under test ARE the interface. `programs.omp` is what a user
 *     types into `configuration.nix`; the `options.programs.omp` binding is what
 *     has to answer to it. Neither is derivable from the other, and there is no
 *     import between them.
 *   - the only observable failure mode of this coupling is "these two spell the
 *     option differently", and reading both files is the only way to reach it
 *     without a nix toolchain — which is not installed on the machines this is
 *     developed on, so `nix flake check` cannot be the oracle. `nix flake check`
 *     evaluates the flake, not a user's `configuration.nix`, and would not notice
 *     a README teaching an option nobody declares.
 *
 * ## What it deliberately does NOT settle
 *
 * Whether `programs.omp` *should* keep its name is the owner's decision, exactly
 * as `flake.nix` records for its own deprecated `omp` alias. This asserts that
 * the modules, the README and the flake's published attribute names agree with
 * each other; it does not assert that any particular name is correct. Retiring
 * the name is a separate, deliberate change, not a rename sweep.
 *
 * The sibling `nix-alias-readme.test.ts` covers the flake's `packages` aliases
 * against `nix build .#…` in the README. Both read the flake through
 * `./nix-flake-attributes` so the definition of "publishes" cannot fork.
 */
import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { publishedPackageAttributes } from "./nix-flake-attributes";

const REPO_ROOT = path.join(import.meta.dir, "..");
const README = path.join(REPO_ROOT, "README.md");
const NIXOS_MODULE = path.join(REPO_ROOT, "nix", "nixos-module.nix");
const HOME_MANAGER_MODULE = path.join(REPO_ROOT, "nix", "home-manager.nix");

/** The two modules that declare the option surface, as `{ platform, file }`. */
const MODULES = [
	{ platform: "NixOS", file: NIXOS_MODULE },
	{ platform: "Home Manager", file: HOME_MANAGER_MODULE },
] as const;

const read = (file: string) => fs.readFile(file, "utf8");

/** `options.programs.<name> =` — what each module actually declares. */
async function declaredOptions(file: string): Promise<Set<string>> {
	const source = await read(file);
	return new Set([...source.matchAll(/options\.(programs\.\w+)\s*=/g)].map(m => m[1]));
}

/**
 * `programs.<name> = { … }` as the README teaches it inside a nix block.
 *
 * The lookbehind keeps `options.programs.x` from counting as a use, so a future
 * README that documents the module's own declaration is not read as a consumer
 * writing the option.
 */
async function documentedOptions(): Promise<Set<string>> {
	const source = await read(README);
	return new Set([...source.matchAll(/(?<![.\w])programs\.(\w+)\s*=/g)].map(m => `programs.${m[1]}`));
}

/** The package attribute each module's `defaultText` resolves `inputs.<…>` to. */
async function defaultTextAttributes(file: string): Promise<string[]> {
	const source = await read(file);
	return [...source.matchAll(/lib\.literalExpression\s+"(inputs\.[^"]*?\.packages\.[^"]*?\.(\w+))"/g)].map(m => m[2]);
}

describe("the nix modules and the README that documents them", () => {
	it("declares every option the README tells a user to write", async () => {
		const documented = await documentedOptions();
		expect(
			documented.size,
			"README.md no longer shows any `programs.<name> = {` config, so this gate checks nothing",
		).toBeGreaterThan(0);

		for (const { platform, file } of MODULES) {
			const declared = await declaredOptions(file);
			expect(
				declared.size,
				`${path.relative(REPO_ROOT, file)} declares no \`options.programs.<name>\`, ` +
					`so this gate cannot be reading the module surface any more`,
			).toBeGreaterThan(0);

			expect(
				[...documented].filter(name => !declared.has(name)),
				`README.md teaches ${[...documented].filter(n => !declared.has(n)).join(", ")} but the ` +
					`${platform} module never declares it — following the README fails at activation.`,
			).toEqual([]);
		}
	});

	it("documents every option both modules declare", async () => {
		const documented = await documentedOptions();
		const [nixos, homeManager] = await Promise.all(MODULES.map(m => declaredOptions(m.file)));

		expect(
			[...nixos].filter(name => !documented.has(name)),
			"the NixOS module declares an option the README never mentions",
		).toEqual([]);
		expect([...homeManager].filter(name => !documented.has(name))).toEqual([]);
	});

	it("NEGATIVE: the two modules declare the same options", async () => {
		const [nixos, homeManager] = await Promise.all(MODULES.map(m => declaredOptions(m.file)));

		// Divergence is not cosmetic: the README shows one config for both
		// platforms, so an option present on only one of them evaluates on a
		// machine and fails on the other.
		expect([...nixos].filter(name => !homeManager.has(name))).toEqual([]);
		expect([...homeManager].filter(name => !nixos.has(name))).toEqual([]);
	});

	it("points every module default at an attribute the flake really publishes", async () => {
		const published = await publishedPackageAttributes();
		expect(
			published.size,
			"no `packages` attributes parsed out of flake.nix, so this checks nothing",
		).toBeGreaterThan(0);

		for (const { platform, file } of MODULES) {
			const referenced = await defaultTextAttributes(file);
			expect(
				referenced.length,
				`${path.relative(REPO_ROOT, file)} no longer carries a \`lib.literalExpression\` default, ` +
					`so this gate is no longer reading the module's package default`,
			).toBeGreaterThan(0);

			expect(
				referenced.filter(attr => !published.has(attr)),
				`the ${platform} module resolves its package through packages attribute(s) ` +
					`${referenced.filter(a => !published.has(a)).join(", ")} that flake.nix does not publish.`,
			).toEqual([]);
		}
	});
});
