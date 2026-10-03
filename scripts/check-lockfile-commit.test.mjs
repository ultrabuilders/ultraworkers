import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resolveNode } from "./resolve-node.mjs";

const script = fileURLToPath(new URL("./check-lockfile-commit.mjs", import.meta.url));

/**
 * The gate reads two git states — HEAD and the index — so each case is a real
 * throwaway repository with a committed baseline and a staged change.
 */
async function repo(t, { staged = {}, committed = {} } = {}) {
	const root = await mkdtemp(join(tmpdir(), "uw-lockfile-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
	const write = async (name, value) => writeFile(join(root, name), value);

	await write(".keep", "");
	git("init", "-q");
	git("config", "user.email", "gate@example.invalid");
	git("config", "user.name", "Gate");
	for (const [name, value] of Object.entries(committed)) await write(name, value);
	git("add", "-A");
	git("commit", "-qm", "baseline");
	for (const [name, value] of Object.entries(staged)) await write(name, value);
	git("add", "-A");
	return root;
}

// These gates drive typescript/unstable/sync, which only works on a real Node
// child-process stream — and `process.execPath` is Bun under `bun test`.
const nodePath = resolveNode();

function run(root) {
	return spawnSync(nodePath, [script], { cwd: root, encoding: "utf8" });
}

const LOCK_WITH_DEP = JSON.stringify({ packages: { "": {}, "node_modules/dep": { version: "1.0.0" } } });
const LOCK_BUMPED = JSON.stringify({ packages: { "": {}, "node_modules/dep": { version: "2.0.0" } } });
// Same dependency, unchanged; only a workspace package's own metadata moved. The
// gate must let this through — a version bump on a workspace package is not a
// change to what gets installed.
const LOCK_WORKSPACE_ONLY = JSON.stringify({
	packages: {
		"": {},
		"node_modules/dep": { version: "1.0.0" },
		"packages/agent": { name: "agent", version: "1.1.0" },
	},
});

test("passes when the lockfile is not part of the commit", async t => {
	const result = run(await repo(t));
	assert.equal(result.status, 0, result.stderr);
});

test("fails on a staged lockfile that bumps a dependency version", async t => {
	const result = run(
		await repo(t, {
			committed: { "package-lock.json": LOCK_WITH_DEP },
			staged: { "package-lock.json": LOCK_BUMPED },
		}),
	);
	assert.equal(result.status, 1);
	// The message must name the package: a bare "review the lockfile" leaves the
	// reviewer to diff two files by hand to find out what moved.
	assert.match(result.stderr, /changed dep 1\.0\.0 -> 2\.0\.0/);
	assert.match(result.stderr, /OMP_ALLOW_LOCKFILE_CHANGE=1 git commit/);
});

test("fails on a lockfile that is staged with no baseline to compare", async t => {
	// A brand-new lockfile has no HEAD copy, so the version summary is empty.
	// The gate must still block rather than quietly pass an unreviewed tree.
	const result = run(await repo(t, { staged: { "package-lock.json": LOCK_WITH_DEP } }));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /package-lock\.json is staged/);
});

test("passes when the lockfile only tracks workspace package metadata", async t => {
	const result = run(
		await repo(t, {
			committed: { "package-lock.json": LOCK_WITH_DEP },
			staged: { "package-lock.json": LOCK_WORKSPACE_ONLY },
		}),
	);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stderr, /only updates workspace package metadata/);
});

test("still blocks a dependency bump when the override env var is off by spelling", async t => {
	// The gate must not treat a near-miss value as consent.
	const root = await repo(t, {
		committed: { "package-lock.json": LOCK_WITH_DEP },
		staged: { "package-lock.json": LOCK_BUMPED },
	});
	for (const value of ["", "0", "trueish", "y"]) {
		const result = spawnSync(nodePath, [script], {
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, OMP_ALLOW_LOCKFILE_CHANGE: value },
		});
		assert.equal(result.status, 1, `value ${JSON.stringify(value)} must not unlock the gate`);
	}
});

test("honours the override env var when it is explicitly set", async t => {
	const root = await repo(t, {
		committed: { "package-lock.json": LOCK_WITH_DEP },
		staged: { "package-lock.json": LOCK_BUMPED },
	});
	const result = spawnSync(nodePath, [script], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, OMP_ALLOW_LOCKFILE_CHANGE: "1" },
	});
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stderr, /OMP_ALLOW_LOCKFILE_CHANGE is set/);
});
