/**
 * The import policy seam, observed through what a caller actually gets back.
 *
 * ## Why this seam exists at `#resolveFromBase`
 *
 * `rewriteDynamicImports(code, callee = "__omp_import__")` already accepts a callee,
 * which reads like the place to inject an import policy. It is not: that parameter
 * is on the code-rewriting path, while the fallback in `DYNAMIC_IMPORT_CALLEE` is a
 * separate module-private constant used by a different function. Wiring one leaves
 * the other untouched, so a policy installed there would report itself as active
 * while the branch that actually runs in a foreign realm kept its old behaviour.
 *
 * `#resolveFromBase` is the single decision point instead — `resolveForRun` and
 * `resolveForModule` both funnel through it, before any module loads and before the
 * external `import()` is reached. The rows below drive **both** entries, because a
 * seam wired into one of them is not a seam.
 *
 * ## The contract that matters most
 *
 * **No policy ⇒ behaviour identical to before this type existed.** That is what
 * keeps the puppeteer fallback load-bearing: code serialized into a browser page
 * runs in a realm with no worker globals, and a default that rejected unknown
 * specifiers would break `tab.evaluate`/`page.evaluate`. The negative rows exist to
 * pin that default, not just the new behaviour.
 */
import { describe, expect, it } from "bun:test";
import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { LocalModuleLoader, type LocalImportPolicy } from "../src/eval/js/shared/local-module-loader";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");
/**
 * A real module from this package, so the local branch is exercised for real.
 *
 * Chosen because it is self-contained: it references no `__omp_*` runtime global, so
 * it links and evaluates under a bare `LocalModuleLoader`. A module that needed
 * `__omp_get_require__` would fail here for a reason unrelated to the policy, and the
 * resulting error would look like a policy denial.
 */
const EXISTING_LOCAL = path.join(
	REPO_ROOT,
	"packages",
	"coding-agent",
	"src",
	"eval",
	"js",
	"shared",
	"indirect-eval.ts",
);

/**
 * Supplies the one runtime global the local branch needs.
 *
 * `buildModuleSource` (local-module-loader.ts:428) prepends
 * `globalThis.__omp_get_require__(…)` to every module it loads, so a loader used
 * bare cannot evaluate *any* local module — the loader raises its own dependency,
 * not one of ours. Supplying it is what makes the local branch genuinely reachable
 * from a test; without it these rows would assert against an error the policy never
 * produced. It is set and removed per test rather than at module scope so the file
 * leaves no global behind for a later file in the same process.
 */
function withRequireGlobal<T>(run: () => Promise<T>): Promise<T> {
	const globalScope = globalThis as { __omp_get_require__?: unknown };
	const had = "__omp_get_require__" in globalScope;
	const previous = globalScope.__omp_get_require__;
	globalScope.__omp_get_require__ = (moduleUrl?: string) =>
		createRequire(moduleUrl ?? pathToFileURL(EXISTING_LOCAL).href);
	return run().finally(() => {
		if (had) globalScope.__omp_get_require__ = previous;
		else delete globalScope.__omp_get_require__;
	});
}

function loaderWith(policy?: LocalImportPolicy): LocalModuleLoader {
	const loader = new LocalModuleLoader("import-policy-test");
	loader.setImportPolicy(policy);
	return loader;
}

describe("the import policy is consulted for every specifier", () => {
	it("sees the raw specifier, not just the resolved path", async () => {
		const seen: string[] = [];
		const loader = loaderWith(request => {
			seen.push(request.specifier);
			return "allow";
		});

		await loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL).catch(() => {});

		// The raw specifier is what a policy can actually reason about: a policy
		// written against resolved paths would have to re-derive the package name from
		// an absolute path, which is the part that varies by cwd.
		expect(seen).toContain(EXISTING_LOCAL);
	});

	it("sees a bare specifier with no resolved path rather than a fabricated one", async () => {
		let observed: { specifier: string; resolvedPath: string | undefined } | undefined;
		const loader = loaderWith(request => {
			observed = request;
			return "allow";
		});

		await loader.resolveForRun(REPO_ROOT, "node:fs").catch(() => {});

		// `undefined` and the string "undefined" are different facts, and conflating
		// them is how a policy ends up string-matching on a value that is not there.
		expect(observed?.specifier).toBe("node:fs");
		expect(observed?.resolvedPath).toBeUndefined();
	});

	it("reports a builtin so a policy need not maintain its own list", async () => {
		let isBuiltin: boolean | undefined;
		const loader = loaderWith(request => {
			isBuiltin = request.isBuiltin;
			return "allow";
		});

		await loader.resolveForRun(REPO_ROOT, "node:fs").catch(() => {});

		// A policy duplicating the builtin list is a policy that drifts from `node:module`.
		expect(isBuiltin).toBe(true);
	});

	it("is consulted by the module-resolution entry too, not only by dynamic import", async () => {
		let calls = 0;
		const loader = loaderWith(() => {
			calls++;
			return "allow";
		});

		await loader.resolveForModule(path.join(REPO_ROOT, "package.json"), EXISTING_LOCAL, REPO_ROOT).catch(() => {});

		// A seam in `resolveForRun` alone would leave `__omp_import_from__` and
		// `import.meta.resolve` answering a different question than `import()`.
		expect(calls).toBeGreaterThan(0);
	});
});

describe("a policy that denies stops the import", () => {
	it("throws rather than resolving", async () => {
		const loader = loaderWith(() => "deny");

		// Thrown, not resolved-undefined: a denied import and a module that failed to
		// resolve are reported differently, and only one is a decision the host made.
		await expect(loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL)).rejects.toThrow(
			/denied by the configured import policy/,
		);
	});

	it("denies a bare specifier as well, so a policy is not bypassed by shape", async () => {
		const loader = loaderWith(request => (request.specifier === "node:fs" ? "deny" : "allow"));

		await expect(loader.resolveForRun(REPO_ROOT, "node:fs")).rejects.toThrow(/denied/);
	});

	it("names the specifier, so the failure says what was refused", async () => {
		const loader = loaderWith(() => "deny");

		// A bare "import denied" gives a caller no way to tell which of several
		// imports was the problem.
		await expect(loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL)).rejects.toThrow(EXISTING_LOCAL);
	});
});

describe("a policy may replace the resolution rather than merely allow it", () => {
	it("returns the policy's own resolution when it supplies one", async () => {
		const sentinel = { virtual: true };
		const loader = loaderWith(() => ({ mode: "local", value: sentinel }));

		const result = await loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL);

		// This is the capability the seam exists for: a virtual module that no path
		// resolution could ever produce. An allow/deny-only policy could not express it.
		expect(result).toEqual({ mode: "local", value: sentinel });
	});
});

describe("with no policy installed, behaviour is exactly what it was", () => {
	it("resolves an existing local module to the local branch", async () => {
		// No `setImportPolicy` call at all. This is the default every other session in
		// the product runs on, so it is the row that must never move.
		const loader = new LocalModuleLoader("no-policy-test");

		const result = await withRequireGlobal(() => loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL));

		expect(result.mode).toBe("local");
	});

	it("resolves a bare specifier to the external branch", async () => {
		const loader = new LocalModuleLoader("no-policy-test");

		const result = await loader.resolveForRun(REPO_ROOT, "node:path");

		// The foreign-realm path: this must keep resolving, or `tab.evaluate` breaks.
		expect(result.mode).toBe("external");
		if (result.mode === "external") expect(result.target).toBe("node:path");
	});

	it("restores the default when the policy is uninstalled", async () => {
		const loader = loaderWith(() => "deny");
		await expect(loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL)).rejects.toThrow(/denied/);

		loader.setImportPolicy(undefined);
		const result = await withRequireGlobal(() => loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL));

		// Uninstall must be a real reset, not a one-way door — otherwise a host cannot
		// hand the session back to default behaviour without discarding the loader.
		expect(result.mode).toBe("local");
	});

	it("rejects nothing when the policy allows everything", async () => {
		const loader = loaderWith(() => "allow");

		const local = await withRequireGlobal(() => loader.resolveForRun(REPO_ROOT, EXISTING_LOCAL));
		const external = await loader.resolveForRun(REPO_ROOT, "node:path");

		// "allow" delegates rather than short-circuits: an allow-all policy that
		// returned a resolution itself would silently break every import.
		expect(local.mode).toBe("local");
		expect(external.mode).toBe("external");
	});
});
