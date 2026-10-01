/**
 * Every bundled package must declare the one scope the shim serves.
 *
 * `legacy-pi-compat.ts` builds virtual specifiers from `CANONICAL_PI_SCOPE` to
 * hand a plugin its dependencies out of the host bundle. A virtual specifier is
 * only meaningful if it matches a real package name: if `packages/ai` declares
 * a scope the constant does not name, a plugin's `import … from
 * "@oh-my-pi/pi-ai"` matches no bundled module, falls through to the plugin's
 * own `node_modules`, and the host silently ends up with two copies of the
 * module in one process — the double-instance failure that
 * `issue-6449-legacy-pi-cjs-double-instance.test.ts` exists to prevent,
 * arriving by another door.
 *
 * Nothing guards this. `CANONICAL_PI_SCOPE` is module-private, so no test can
 * name it; the two nearest tests pass straight through it —
 * `issue-6449-…` proves the CJS `require` bridge is not duplicated, and
 * `pi-scope-aliases.test.ts` proves the legacy aliases resolve. Neither connects
 * the scope to what `package.json` actually says, so a scope rename (M5 W7) that
 * missed the constant would turn every plugin-bound import into a silent second
 * copy with nothing red.
 *
 * The scope is therefore read from the shim's own output rather than restated:
 * a literal here would agree with a wrong constant by construction, which is the
 * trap in `update-cli.test.ts`, where an `APP_NAME`-derived expectation passes
 * no matter what `APP_NAME` is. The value under test is the one the shim uses.
 *
 * The package set is discovered from the workspace, not listed. An earlier
 * version of this file enumerated ten directories by hand; `packages/natives`
 * and eleven others were simply not in the list, so renaming their scope left
 * the gate green. A list is a promise to update it, and W7 depends on this gate
 * not being kept.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { __buildLegacyPiPackageRootOverrides } from "../src/extensibility/plugins/legacy-pi-compat";

const REPO_ROOT = path.join(import.meta.dir, "..", "..", "..");
const PACKAGES_DIR = path.join(REPO_ROOT, "packages");

interface PackageManifest {
	name?: string;
	private?: boolean;
}

/** Every package manifest under `packages/`, discovered rather than listed. */
async function findManifests(): Promise<string[]> {
	// The trailing star is written with a non-adjacent slash so the pattern
	// cannot be mistaken for a comment terminator where this is quoted above.
	const found = [...new Bun.Glob("packages/*" + "/package.json").scanSync({ cwd: REPO_ROOT, onlyFiles: true })];
	return found.sort();
}

async function readManifest(relativePath: string): Promise<PackageManifest> {
	return (await Bun.file(path.join(REPO_ROOT, relativePath)).json()) as PackageManifest;
}

function scopeOf(packageName: string): string {
	return packageName.slice(0, packageName.indexOf("/") + 1);
}

/**
 * The scope the shim actually serves, read off its own canonical specifiers.
 *
 * `CANONICAL_PI_SCOPE` is module-private, but every key this builder emits is
 * the canonical scope joined to a package basename — so the keys carry the
 * constant without the test restating it. Non-bundled mode emits the three
 * compat roots and nothing else, which is enough to read the scope off.
 */
function canonicalScopeFromShim(): string {
	const specifiers = Object.keys(__buildLegacyPiPackageRootOverrides(false));
	if (specifiers.length === 0) throw new Error("shim produced no canonical specifiers");
	const scopes = new Set(specifiers.map(specifier => scopeOf(specifier)));
	if (scopes.size !== 1) {
		throw new Error(`shim serves more than one scope: ${[...scopes].sort().join(", ")}`);
	}
	return [...scopes][0]!;
}

describe("canonical pi scope vs declared package names", () => {
	test("the gate covers every package directory, not a hand-kept list", async () => {
		const manifests = await findManifests();
		const covered = new Set(manifests.map(relativePath => relativePath.split("/")[1]));

		const entries = await fs.readdir(PACKAGES_DIR, { withFileTypes: true });
		const directories = entries
			.filter(entry => entry.isDirectory())
			.map(entry => entry.name)
			.sort();

		// The scope rows below are only as strong as the set they range over, and
		// a discovered set that silently missed a directory would shrink to
		// "all of these agree" — green for a package nobody looked at. This row
		// is what makes the others non-vacuous.
		expect(directories.filter(directory => !covered.has(directory))).toEqual([]);
	});

	test("every bundled package declares a scoped name", async () => {
		const unscoped: string[] = [];
		for (const relativePath of await findManifests()) {
			const { name } = await readManifest(relativePath);
			if (typeof name !== "string" || !/^@[^/]+\//.test(name)) unscoped.push(relativePath);
		}
		expect(unscoped).toEqual([]);
	});

	test("every bundled package shares the scope the shim serves", async () => {
		const byScope = new Map<string, string[]>();
		for (const relativePath of await findManifests()) {
			const { name } = await readManifest(relativePath);
			const scope = scopeOf(name!);
			byScope.set(scope, [...(byScope.get(scope) ?? []), relativePath]);
		}

		// Grouped by scope and sorted on both sides: a rename failure then names
		// which packages moved, rather than only that something did. Comparing
		// declaration order against sorted order would fail on a green tree,
		// which teaches the reader to ignore this row.
		const observed = [...byScope.entries()]
			.map(([scope, members]) => ({ scope, members: members.sort() }))
			.sort((left, right) => left.scope.localeCompare(right.scope));

		expect(observed).toEqual([{ scope: canonicalScopeFromShim(), members: (await findManifests()).sort() }]);
	});
});
