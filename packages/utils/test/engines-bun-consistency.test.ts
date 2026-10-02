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

/**
 * The installer holds a SECOND declaration of the same floor, and the drift between
 * the two is the half a manifest-only gate cannot see.
 *
 * `2d248a2c` raised `scripts/install.sh` and `packages/coding-agent/package.json`
 * together and left `packages/utils/package.json` — the one manifest code reads —
 * behind. A manifest-to-manifest gate catches that instance. The reverse instance is
 * unguarded by construction: bump the installer alone and every manifest agrees with
 * every other manifest, so the floor is green, while `require_bun_version` refuses a
 * runtime the app runs on. The failure is a user who cannot install, and nothing in
 * the repository is red.
 *
 * The floor is read by RUNNING the installer, never by matching its text. A test that
 * greps `MIN_BUN_VERSION=` out of a shell script asserts how the script looks; renaming
 * the variable breaks it while behaviour is identical, and a hand-maintained copy of
 * the number in a test would drift in exactly the way this file exists to catch.
 */
describe("the installer's floor is the same declaration", () => {
	const INSTALL_SH = path.join(REPO_ROOT, "scripts", "install.sh");

	function runInstaller(...args: string[]): { exitCode: number; stdout: string; stderr: string } {
		const proc = Bun.spawnSync(["sh", INSTALL_SH, ...args]);
		return {
			exitCode: proc.exitCode,
			stdout: proc.stdout.toString().trim(),
			stderr: proc.stderr.toString().trim(),
		};
	}

	// Control on the query itself. Without a real answer there is nothing to compare,
	// and the assertion below would pass against an installer that reports nothing.
	it("answers which floor it enforces", () => {
		const result = runInstaller("--print-min-bun-version");
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toMatch(/^\d+\.\d+\.\d+$/);
	});

	// The whole point: the number the installer refuses users below, and the number the
	// app refuses at startup, must be the same. Compared in the shape `dirs.ts` uses —
	// it strips everything but digits and dots before comparing.
	it("enforces the same floor the manifest code reads", () => {
		const authoritative = readManifest(AUTHORITATIVE).engines?.bun ?? "";
		expect(runInstaller("--print-min-bun-version").stdout).toBe(
			authoritative.replace(/[^0-9.]/g, ""),
		);
	});

	// The query is an added case in an argument parser, and the parser is what rejects a
	// typo in a `curl | sh` line before anything is installed. A new case that swallowed
	// the fallback would turn "Unknown option" into a silent success.
	it("still refuses an unknown option", () => {
		const result = runInstaller("--not-a-real-option");
		expect(result.exitCode).toBe(1);
		expect(result.stderr + result.stdout).toContain("Unknown option");
	});
});
