#!/usr/bin/env node
/**
 * The declared minimum Bun version must agree everywhere it can actually stop
 * someone.
 *
 * Two sources can act on it, and only two:
 *
 *   packages/utils/package.json  engines.bun  — the ONLY manifest any code
 *       reads (`packages/utils/src/dirs.ts` imports `../package.json`, which
 *       resolves to this file, and derives `MIN_BUN_VERSION` from it)
 *   scripts/install.sh          MIN_BUN_VERSION="…" — a hand-written shell
 *       literal, compared by `require_bun_version` before the repo is cloned
 *
 * They are unrelated by construction: nothing derives one from the other, so
 * nothing keeps them equal. They have diverged for real. In 2d248a2cef the
 * installer moved to 1.3.15 while this manifest stayed at 1.3.14, so a user on
 * 1.3.14 was refused an install of a build that runs fine on it — and the
 * message says only that a newer Bun is required, never why.
 *
 * The other manifests declaring `engines.bun` are decoration: no code reads
 * them, and the same commit raised `packages/coding-agent/package.json` while
 * describing it as "runtime metadata". They are listed here so the report names
 * the manifest people will reach for, and so nobody mistakes this gate for a
 * reason to keep twenty-three copies in step. Which spelling should win is an
 * owner decision; this gate only makes a disagreement impossible to miss.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const UTILS_MANIFEST = path.join(ROOT, "packages/utils/package.json");
const INSTALL_SCRIPT = path.join(ROOT, "scripts/install.sh");

/** `">=1.3.14"` / `"^1.3.14"` → `1.3.14`. Any other shape is a finding, not a fallback. */
function toBareVersion(declared) {
	if (typeof declared !== "string") throw new Error(`expected a version string, got ${JSON.stringify(declared)}`);
	const match = /^[\^~>=< ]*([0-9][0-9A-Za-z.+-]*)\s*$/.exec(declared.trim());
	if (!match) throw new Error(`cannot read a version out of ${JSON.stringify(declared)}`);
	return match[1];
}

function readEnginesBun(manifestPath) {
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	return manifest?.engines?.bun;
}

function readInstallScriptVersion() {
	const source = fs.readFileSync(INSTALL_SCRIPT, "utf8");
	// Anchored to an assignment, so a mention of the name in a comment or an
	// error message cannot stand in for the value.
	const match = /^MIN_BUN_VERSION=["']?([^\s"']+)["']?/m.exec(source);
	if (!match) throw new Error(`no MIN_BUN_VERSION assignment found in ${INSTALL_SCRIPT}`);
	return match[1];
}

/** Every manifest declaring engines.bun, reported rather than gated. */
function declaringManifests() {
	const packagesDir = path.join(ROOT, "packages");
	const found = [];
	for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const manifestPath = path.join(packagesDir, entry.name, "package.json");
		if (!fs.existsSync(manifestPath)) continue;
		let declared;
		try {
			declared = readEnginesBun(manifestPath);
		} catch {
			continue;
		}
		if (declared !== undefined) found.push({ pkg: entry.name, declared });
	}
	return found;
}

const manifestVersion = toBareVersion(readEnginesBun(UTILS_MANIFEST));
const installerVersion = toBareVersion(readInstallScriptVersion());
const others = declaringManifests();

if (manifestVersion !== installerVersion) {
	console.error("bun-version sources: FAIL the two sources that can stop someone disagree");
	console.error(
		`  packages/utils/package.json engines.bun → ${manifestVersion}   (read by dirs.ts, gates the runtime)`,
	);
	console.error(
		`  scripts/install.sh           MIN_BUN_VERSION → ${installerVersion}   (gates the install, refuses before cloning)`,
	);
	console.error(
		"  A user on " +
			manifestVersion +
			" is refused an install of a build that runs on it, and the message never says why.",
	);
	const stale = others.filter(m => toBareVersion(m.declared) !== manifestVersion);
	if (stale.length > 0) {
		console.error("  Manifests declaring a different engines.bun, none of which any code reads:");
		for (const { pkg, declared } of stale) console.error(`    packages/${pkg} → ${declared}`);
	}
	process.exit(1);
}

console.log(
	`bun-version sources: ${manifestVersion} agrees across utils manifest and install.sh` +
		` (${others.length} manifest(s) declare engines.bun; only the utils one is read)`,
);
