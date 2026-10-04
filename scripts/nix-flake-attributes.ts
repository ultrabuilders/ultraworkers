/**
 * Reading the `packages` output set out of `flake.nix`.
 *
 * Two gates need the same answer — which attribute names the flake actually
 * publishes — and the parser below is the only definition of "publishes". It
 * lives here rather than in either test so the two cannot drift: a fork of this
 * slice is a fork of the contract, not of an implementation detail.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const REPO_ROOT = path.join(import.meta.dir, "..");
export const FLAKE_PATH = path.join(REPO_ROOT, "flake.nix");

/**
 * The `packages` output set's source, scoped.
 *
 * `nix build .#<attr>` and `inputs.<this>.packages.<system>.<attr>` reach only
 * `packages`, so an attribute bound in `apps` or `devShells` is not one a
 * consumer can resolve that way. Read by index rather than by brace matching so
 * a nested `${...}` interpolation cannot end the block early.
 *
 * Throws rather than returning a partial answer: a caller that treated an
 * unparseable flake as "publishes nothing" would report every attribute as
 * missing, which reads as a finding rather than as a broken premise.
 */
export async function packagesBlock(): Promise<string> {
	const source = await fs.readFile(FLAKE_PATH, "utf8");
	const start = source.indexOf("packages = forAllSystems (");
	if (start === -1) throw new Error("flake.nix no longer declares `packages = forAllSystems (…)`");
	const end = source.indexOf("\n      apps = ", start);
	if (end <= start) throw new Error("flake.nix no longer declares an `apps = …` set after `packages`");
	return source.slice(start, end);
}

/** Attributes the `packages` set publishes, as bare `attr = …` bindings. */
export async function publishedPackageAttributes(): Promise<Set<string>> {
	const block = await packagesBlock();
	return new Set([...block.matchAll(/^\s*(\w+)\s*=/gm)].map(m => m[1]));
}
