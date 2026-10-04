import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * `engines.bun` is declared by every published package manifest, but exactly one of them
 * is read: `src/dirs.ts` imports `../package.json` — i.e. this package's — and derives
 * `MIN_BUN_VERSION`, which is what `cli.ts` uses to refuse an old runtime. Every other
 * manifest is decoration for npm consumers; no code imports it.
 *
 * That asymmetry has already cost a real drift: `2d248a2c` ("upgraded bundled bun to
 * 1.3.15") raised `packages/coding-agent/package.json` and `scripts/install.sh` and called
 * it runtime metadata, while the one manifest that is actually read stayed behind. The
 * installer then demanded 1.3.15 from users the app runs fine on. Nothing complained,
 * because `bun install` does not enforce `engines.bun` — measured on both a root manifest
 * and a workspace member, a manifest demanding `>=99.0.0` installs clean on 1.3.14.
 *
 * So this file is the only thing standing between the next person and the same silent
 * no-op: a floor bump in any manifest that does not reach this package's manifest is a
 * bump that changes nothing, and this is what notices.
 */

// Resolved from the module path, never from `process.cwd()`: this file runs both as
// `bun test` inside the package and as `bun test packages/utils` from the repo root, and
// a cwd-derived root silently globs nothing under the second invocation.
const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");
const PACKAGES_DIR = path.join(REPO_ROOT, "packages");
const AUTHORITATIVE = path.join(PACKAGES_DIR, "utils", "package.json");

interface Manifest {
	private?: boolean;
	engines?: { bun?: string };
}

function readManifest(manifest: string): Manifest {
	return JSON.parse(fs.readFileSync(manifest, "utf8")) as Manifest;
}

/**
 * Published workspace packages only. `engines.bun` is metadata npm enforces at install
 * time, so a `private: true` manifest that omits it is correct, not a gap —
 * `packages/evals` is the case that proves this filter is load-bearing.
 */
function publishedManifests(): string[] {
	return fs
		.readdirSync(PACKAGES_DIR, { withFileTypes: true })
		.filter(entry => entry.isDirectory())
		.map(entry => path.join(PACKAGES_DIR, entry.name, "package.json"))
		.filter(manifest => fs.existsSync(manifest) && readManifest(manifest).private !== true);
}

describe("engines.bun consistency", () => {
	const authoritative = readManifest(AUTHORITATIVE).engines?.bun;

	// Control on the reader under test. Without a real floor there is nothing to compare
	// against, and every assertion below would pass vacuously. The shape is the one
	// `dirs.ts` survives: it strips everything but digits and dots before comparing.
	it("reads a bun floor from the one manifest code actually imports", () => {
		expect(authoritative).toMatch(/^>=\d+\.\d+\.\d+$/);
		expect(authoritative?.replace(/[^0-9.]/g, "")).toBe("1.3.14");
	});

	it("declares engines.bun in every published workspace manifest", () => {
		const missing = publishedManifests()
			.filter(manifest => readManifest(manifest).engines?.bun === undefined)
			.map(manifest => path.relative(REPO_ROOT, manifest));

		expect(missing).toEqual([]);
	});

	it("keeps every published manifest on the same floor as the manifest code reads", () => {
		const drifted = publishedManifests()
			.map(manifest => ({ manifest: path.relative(REPO_ROOT, manifest), bun: readManifest(manifest).engines?.bun }))
			.filter(entry => entry.bun !== authoritative);

		expect(drifted).toEqual([]);
	});

	// A gate that quietly stops seeing manifests passes for the wrong reason. The
	// authoritative manifest must be inside the compared set — otherwise the assertions
	// above compare a set that excludes its own reference point and drift in
	// `packages/utils` itself would go unnoticed.
	it("compares the authoritative manifest against a set that contains it", () => {
		expect(publishedManifests()).toContain(AUTHORITATIVE);
	});

	// Ratchet, not a measurement: adding or removing a workspace package changes this
	// number on purpose, so the change is reviewed instead of absorbed silently. Bump it
	// in the same commit that adds or removes a package.
	it("compares every published workspace manifest", () => {
		expect(publishedManifests().length).toBe(19);
	});
});
