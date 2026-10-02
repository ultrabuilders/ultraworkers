import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * `engines-bun-consistency.test.ts` guards the *manifests*: every published workspace
 * `package.json` must agree with the one manifest code imports. That leaves three more
 * places the same floor is written down, none of which is a manifest and none of which
 * that gate can see:
 *
 *   scripts/install.sh:16              MIN_BUN_VERSION="1.3.14"
 *   packages/natives/scripts/gen-npm-packages.ts:106   engines: { bun: ">=1.3.14" }
 *   scripts/setup-npm-trust.ts:266                    engines: { bun: ">=1.3.14" }
 *
 * The gap is not hypothetical. `2d248a2c` ("upgraded bundled bun to 1.3.15") raised
 * `packages/coding-agent/package.json` *and* `scripts/install.sh` while the one manifest
 * that is read — `packages/utils/package.json`, which `dirs.ts` turns into the
 * `MIN_BUN_VERSION` `cli.ts` refuses old runtimes on — stayed at 1.3.14. The installer
 * then demanded 1.3.15 from users the app runs fine on, and the symptom was silent.
 *
 * Reproduced against the manifest gate to confirm it is still open: bumping
 * `scripts/install.sh` to 1.3.15 leaves `engines-bun-consistency` at 5 pass / 0 fail,
 * while `cli.ts` still accepts 1.3.14. That is the whole point of this file — it closes
 * the three sources the manifest gate structurally cannot reach.
 *
 * What is deliberately NOT proposed here: making one authority derive the rest. Which
 * way the single source should point is an architecture decision (bead `epic-31sc`,
 * and the installer's own constraint in `epic-0twi`), not a test's. This asserts only
 * that the four agree today, so the next bump cannot be a silent no-op.
 */

// Resolved from the module path, never from `process.cwd()`: this runs both as
// `bun test` inside the package and as `bun test packages/utils` from the repo root,
// and a cwd-derived root silently finds nothing under the second invocation.
const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");

/** The only floor any code reads. `dirs.ts` imports this package's manifest; `cli.ts` refuses old runtimes on it. */
const AUTHORITATIVE = path.join(REPO_ROOT, "packages", "utils", "package.json");

/**
 * The manifest form's floor, digits only — the shape `dirs.ts` survives before comparing
 * (`engines.bun.replace(/[^0-9.]/g, "")`). `install.sh` spells the same floor without a
 * range operator, so the two are compared in that shared digits-only space.
 */
function digitsOnly(version: string): string {
	return version.replace(/[^0-9.]/g, "");
}

/** The floor `dirs.ts` reads, typed rather than cast — a missing `engines.bun` must fail here, not downstream. */
function authoritativeFloor(): string {
	const manifest: { engines?: { bun?: string } } = JSON.parse(fs.readFileSync(AUTHORITATIVE, "utf8"));
	const declared = manifest.engines?.bun;
	if (typeof declared !== "string") throw new Error(`${AUTHORITATIVE} declares no engines.bun`);
	return declared;
}

function readFile(relative: string): string {
	return fs.readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

/** Every writer found by construction, so a new one cannot slip in unlisted. */
const INSTALL_SH = "scripts/install.sh";
const MANIFEST_WRITERS = ["packages/natives/scripts/gen-npm-packages.ts", "scripts/setup-npm-trust.ts"] as const;

describe("bun floor sources outside the manifests", () => {
	const authoritative = digitsOnly(authoritativeFloor());

	// Control on the reader under test. If this stops matching there is no floor to
	// compare against and every assertion below would pass vacuously.
	it("reads a bun floor from the manifest code actually imports", () => {
		expect(authoritative).toMatch(/^\d+\.\d+\.\d+$/);
	});

	// The installer's literal, matched structurally rather than by line number: the
	// assignment is what must agree, and a pin that moves to another line is still the
	// same declaration. A line-numbered read would pass on a moved pin and fail on a
	// renamed variable, which is the opposite of what this gate is for.
	it("installer demands the same floor the runtime accepts", () => {
		const declared = readFile(INSTALL_SH).match(/^MIN_BUN_VERSION="([^"]+)"/m);

		expect(declared).not.toBeNull();
		expect(digitsOnly(declared![1])).toBe(authoritative);
	});

	// The two npm-manifest writers. Same reasoning as the shell pin: find the literal
	// where it is written, wherever it sits. A plain loop rather than `it.each`: bun types
	// a readonly-tuple row as `unknown[]`, so the parameter arrives as `unknown` and the
	// call no longer typechecks — the assertion is identical either way.
	for (const writer of MANIFEST_WRITERS) {
		it(`${writer} writes the same floor into the manifests it generates`, () => {
			const declared = readFile(writer).match(/bun:\s*"([^"]+)"/);

			expect(declared).not.toBeNull();
			expect(digitsOnly(declared![1])).toBe(authoritative);
		});
	}

	// A gate that quietly stops reaching its sources passes for the right-looking wrong
	// reason. Each source must be locatable by the patterns above, or the assertions
	// would be comparing against nothing.
	it("locates every bun floor source outside the manifests", () => {
		expect(readFile(INSTALL_SH)).toMatch(/^MIN_BUN_VERSION="[^"]+"/m);
		for (const writer of MANIFEST_WRITERS) {
			expect(readFile(writer)).toMatch(/bun:\s*"[^"]+"/);
		}
	});

	// Ratchet, not a measurement: adding a source here changes this number on purpose,
	// so the addition is reviewed instead of absorbed silently. Bump it in the same
	// commit that adds a source.
	it("covers every bun floor source outside the manifests", () => {
		expect(MANIFEST_WRITERS.length + 1).toBe(3);
	});
});
