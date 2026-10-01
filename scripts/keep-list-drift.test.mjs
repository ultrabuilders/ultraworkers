/**
 * The rename plan must name every package it intends to rewrite.
 *
 * `scripts/rename/keep-list.txt` section 1 lists the manifests a scope rename
 * rewrites. It is hand-maintained, and its own header says so: "A keep-list
 * written by hand decays SILENTLY: each new package that forgets to be added is
 * skipped by the rename with no error and no way to notice afterwards." That
 * header also states the requirement this file exists to satisfy — "a gate must
 * compare this list against that command and fail when they differ" — and no
 * such gate was written.
 *
 * The failure it describes was live when this gate was added: six public
 * packages were ported from `pi` after the list was captured (`chord`,
 * `client`, `codemode`, `protocol`, `server`, `telemetry`), so the list named 17
 * manifests while 23 carried the scope. A rename pass consuming the list would
 * have rewritten those 17 and left those 6 resolving under the old scope —
 * "nothing errors, the package just stops being the one other packages import".
 *
 * node:test rather than bun:test because `scripts/` packaging gates run under
 * `node --test` (see the discovery in `ci-test-ts.ts`), and a gate that the
 * runner never collects is the same silent failure in a different costume.
 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEEP_LIST = path.join(REPO_ROOT, "scripts", "rename", "keep-list.txt");

/** Manifest names currently carrying the old scope, as the list's header defines them. */
async function manifestsWithOldScope() {
	const packageDir = path.join(REPO_ROOT, "packages");
	const directories = (await readdir(packageDir, { withFileTypes: true }))
		.filter(entry => entry.isDirectory())
		.map(entry => `packages/${entry.name}/package.json`)
		.sort();
	const matching = [];
	for (const manifest of directories) {
		const { name } = JSON.parse(await readFile(path.join(REPO_ROOT, manifest), "utf8"));
		if (typeof name === "string" && name.startsWith("@oh-my-pi/")) matching.push(manifest);
	}
	return matching;
}

/**
 * Manifest paths named by section 1.
 *
 * Section 1 runs to the next NUMBERED heading, not to the next `#`: both
 * sections carry `#`-prefixed prose, so slicing at the next `#` truncates
 * section 1 before it reaches a single manifest, and the gate then passes on an
 * empty list — the one failure mode that must never be silent.
 */
function listedManifests(source) {
	const start = source.indexOf("# 1. SCOPE IDENTIFIERS");
	assert.notEqual(start, -1, "section 1 heading is gone from keep-list.txt");
	const rest = source.slice(start + 1);
	const nextSection = rest.search(/^# \d+\. /m);
	const section = nextSection === -1 ? source.slice(start) : source.slice(start, start + 1 + nextSection);
	return section
		.split("\n")
		.filter(line => /^packages\/.+\/package\.json$/.test(line))
		.sort();
}

test("keep-list section 1 names every manifest carrying the old scope", async () => {
	const listed = listedManifests(await readFile(KEEP_LIST, "utf8"));
	const actual = await manifestsWithOldScope();

	// Asserted as sets so a drift names which packages moved rather than only
	// that a count changed; both directions matter, since a manifest listed but
	// gone would aim the rename at a file that no longer exists.
	assert.deepEqual(listed, actual);
});

test("the declared manifest count matches the number of listed lines", async () => {
	const source = await readFile(KEEP_LIST, "utf8");
	const listed = listedManifests(source);
	const declared = source.match(/:\s*(\d+) manifests\.$/m);

	assert.notEqual(declared, null, "provenance line no longer states a manifest count");
	assert.equal(Number.parseInt(declared[1], 10), listed.length);
});
