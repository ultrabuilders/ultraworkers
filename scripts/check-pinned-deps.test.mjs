import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resolveNode } from "./resolve-node.mjs";

const script = fileURLToPath(new URL("./check-pinned-deps.mjs", import.meta.url));

// These gates drive typescript/unstable/sync, which only works on a real Node
// child-process stream — and `process.execPath` is Bun under `bun test`.
const nodePath = resolveNode();

/** The gate walks the whole tree from its cwd, so each case gets a temp root. */
async function check(t, manifest, extraFiles = {}) {
	const root = await mkdtemp(join(tmpdir(), "omp-pinned-deps-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	const files = { "packages/example/package.json": JSON.stringify(manifest), ...extraFiles };
	for (const [path, contents] of Object.entries(files)) {
		const fullPath = join(root, path);
		await mkdir(join(fullPath, ".."), { recursive: true });
		await writeFile(fullPath, contents);
	}
	return spawnSync(nodePath, [script], { cwd: root, encoding: "utf8" });
}

test("rejects a range specifier in a workspace that reaches a registry", async t => {
	const result = await check(t, { name: "example", version: "1.0.0", dependencies: { external: "^1.2.3" } });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /external must be pinned, found \^1\.2\.3/);
});

test("accepts a range in the exempt tools workspace, and keeps policing everything else", async t => {
	// Not "red so I ignored it": the exemption is a stated fact about one
	// workspace, and it must not leak onto its siblings.
	const result = await check(
		t,
		{ name: "sibling", version: "1.0.0", dependencies: { external: "^1.2.3" } },
		{
			".omp/tools/package.json": JSON.stringify({
				name: "tools",
				version: "1.0.0",
				dependencies: { exempt: "^4.5.6" },
			}),
		},
	);
	assert.equal(result.status, 1);
	assert.ok(!result.stderr.includes("exempt must be pinned"), result.stderr);
	assert.match(result.stderr, /external must be pinned, found \^1\.2\.3/);
});

test("revokes the exemption once the exempt workspace becomes publishable", async t => {
	// The failure this defends: a range is waved through today, the package is
	// published next month, and the gate that should have caught it is now
	// configured to look the other way. Only the exempt path is under test here —
	// every other manifest is exact-pinned, so a red result can only come from
	// the exemption being honoured.
	const result = await check(
		t,
		{ name: "sibling", version: "1.0.0" },
		{
			".omp/tools/package.json": JSON.stringify({
				name: "tools",
				version: "1.0.0",
				publishConfig: { access: "public" },
				dependencies: { external: "^1.2.3" },
			}),
		},
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /\.omp\/tools\/package\.json: dependencies\.external must be pinned, found \^1\.2\.3/);
});

test("accepts Bun's catalog protocol as a pinned specifier", async t => {
	// The version itself lives once in the root manifest's `catalog` block, so
	// the literal string `catalog:` is a pinned reference, not an unpinned range.
	const result = await check(t, { name: "example", version: "1.0.0", dependencies: { external: "catalog:" } });
	assert.equal(result.status, 0, result.stderr);
});

test("still rejects a range hiding behind an npm alias", async t => {
	const result = await check(t, { name: "example", version: "1.0.0", dependencies: { external: "npm:alias@^1.2.3" } });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /external must be pinned, found npm:alias@\^1\.2\.3/);
});

test("exempts internal workspace dependencies, whose version is the workspace's own", async t => {
	const result = await check(t, {
		name: "example",
		version: "1.0.0",
		dependencies: { "@oh-my-pi/pi-tui": "workspace:*" },
	});
	assert.equal(result.status, 0, result.stderr);
});

test("still scans a dot-directory that is not its own repository", async t => {
	// The positive control for the nested-repository skip below. This repository
	// tracks 532 files under dot-directories, and `.omp/tools` is an explicitly
	// exempt workspace here, so a blanket dot-skip would satisfy every other
	// assertion in this file while silently dropping them. The scanned count is
	// what makes this observable: one file, and it was inside a dot-directory.
	const result = await check(
		t,
		{ name: "root", version: "1.0.0" },
		{
			".hidden/package.json": JSON.stringify({
				name: "hidden",
				version: "1.0.0",
				dependencies: { external: "^1.2.3" },
			}),
		},
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /external must be pinned, found \^1\.2\.3/);
});

test("skips a nested repository, whose files a different index governs", async t => {
	// `EnterWorktree` writes a complete checkout with its own `.git` file. Before
	// the guard this reported a violation the parent repository already owns —
	// 661 phantom findings from one worktree — against a real count of ~490.
	const result = await check(
		t,
		{ name: "root", version: "1.0.0" },
		{
			".claude/worktrees/someone/package.json": JSON.stringify({
				name: "nested",
				version: "1.0.0",
				dependencies: { external: "^1.2.3" },
			}),
			".claude/worktrees/someone/.git": "gitdir: ../../../.git/worktrees/someone",
		},
	);
	assert.equal(result.status, 0, result.stderr);
	assert.ok(!result.stderr.includes("external must be pinned"), result.stderr);
});
