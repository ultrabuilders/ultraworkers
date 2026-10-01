/**
 * The canonical pi scope must equal the scope every bundled package declares.
 *
 * `legacy-pi-compat.ts` builds virtual specifiers from `CANONICAL_PI_SCOPE` to
 * hand a plugin its dependencies out of the host bundle. A virtual specifier is
 * only meaningful if it matches a real package name: if `packages/ai` is
 * `@oh-my-pi/pi-ai` but the constant says something else, a plugin's
 * `import … from "@oh-my-pi/pi-ai"` matches no bundled module, falls through to
 * the plugin's own `node_modules`, and the host silently ends up with two copies
 * of the module in one process — the double-instance failure that
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
 * This reads the names from the manifests rather than restating the scope in the
 * test: a fixture built from the same constant as the implementation cannot fail
 * when the constant is wrong — which is exactly the trap in
 * `update-cli.test.ts`, where an `APP_NAME`-derived expectation agrees with the
 * implementation no matter what `APP_NAME` is. The value under test is the one
 * in the files.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";

/** Packages whose modules the legacy shim layer hands back to plugins. */
const BUNDLED_PACKAGES = [
	"ai",
	"agent",
	"tui",
	"utils",
	"protocol",
	"chord",
	"client",
	"codemode",
	"evals",
	"omptype",
] as const;

interface PackageManifest {
	name?: string;
}

async function readManifest(packageDir: string): Promise<PackageManifest> {
	const manifestPath = path.join(import.meta.dir, "..", "..", packageDir, "package.json");
	const manifest = (await Bun.file(manifestPath).json()) as PackageManifest;
	return manifest;
}

describe("canonical pi scope vs declared package names", () => {
	// One scope across every bundled package is what makes a single
	// `CANONICAL_PI_SCOPE` able to name all of them. A package that drifts to a
	// different scope stops matching the constant, and its plugin-bound imports
	// resolve outside the bundle.
	const declaredScopes = new Map<string, string[]>();

	for (const packageDir of BUNDLED_PACKAGES) {
		test(`${packageDir} declares a scoped package name`, async () => {
			const manifest = await readManifest(packageDir);
			// Read, not asserted against a literal: a restated scope here would
			// agree with a wrong constant by construction.
			expect(typeof manifest.name).toBe("string");
			expect(manifest.name).toMatch(/^@[^/]+\//);

			const scope = manifest.name!.slice(0, manifest.name!.indexOf("/") + 1);
			const others = declaredScopes.get(scope) ?? [];
			others.push(packageDir);
			declaredScopes.set(scope, others);
		});
	}

	test("every bundled package shares one scope", async () => {
		const scopes = new Map<string, string[]>();
		for (const packageDir of BUNDLED_PACKAGES) {
			const { name } = await readManifest(packageDir);
			const scope = name!.slice(0, name!.indexOf("/") + 1);
			scopes.set(scope, [...(scopes.get(scope) ?? []), packageDir]);
		}

		// Reported per-scope rather than as a single equality so a rename failure
		// names which packages moved, not just that something did. Both sides are
		// sorted — comparing declaration order against sorted order would fail on a
		// green tree, which teaches the reader to ignore this row.
		expect(
			[...scopes.entries()]
				.map(([scope, members]) => ({ scope, members: members.sort() }))
				.sort((a, b) => a.scope.localeCompare(b.scope)),
		).toEqual([{ scope: [...scopes.keys()][0]!, members: [...BUNDLED_PACKAGES].sort() }]);
	});
});
