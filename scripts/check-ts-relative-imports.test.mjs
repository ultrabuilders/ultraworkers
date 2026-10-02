import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resolveNode } from "./resolve-node.mjs";

const script = fileURLToPath(new URL("./check-ts-relative-imports.mjs", import.meta.url));
const nodePath = resolveNode();

/**
 * The gate walks the whole tree from its cwd, so each case gets a temp root.
 * `sources` are written verbatim; `assets` are written as real files on disk,
 * which is the only way to tell "a .js suffix that lies" from "a .js suffix
 * that names a real JavaScript file" — the second is legal and must stay legal.
 */
async function check(t, sources, assets = {}) {
	const root = await mkdtemp(join(tmpdir(), "omp-ts-relative-imports-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	for (const [path, contents] of Object.entries({ ...sources, ...assets })) {
		const fullPath = join(root, path);
		await mkdir(join(fullPath, ".."), { recursive: true });
		await writeFile(fullPath, contents);
	}
	return spawnSync(nodePath, [script], { cwd: root, encoding: "utf8" });
}

/** Every verdict line, so a test can assert on reasons and not on row order. */
function verdicts(stderr) {
	return stderr.split("\n").filter(line => line.includes("] FAIL "));
}

test("rejects a relative specifier carrying a .ts suffix, and names the file", async t => {
	const result = await check(t, { "src/a.ts": 'import { b } from "./b.ts";\nexport const a = b;\n' });
	assert.equal(result.status, 1);
	const found = verdicts(result.stderr);
	assert.equal(found.length, 1, result.stderr);
	assert.match(found[0], /FAIL src\/a\.ts:1:/);
	assert.match(found[0], /\.ts suffix, drop it/);
});

test("rejects a .js suffix that names no file on disk", async t => {
	// This is the case the copied pi rule was reaching for, stated so that it
	// survives the port: `b.js` does not exist and `b.ts` does, so the suffix
	// is asserting a module that was never written.
	const result = await check(t, { "src/a.ts": 'import { b } from "./b.js";\nexport const a = b;\n' });
	assert.equal(result.status, 1);
	assert.equal(verdicts(result.stderr).length, 1, result.stderr);
	assert.match(result.stderr, /\.js suffix lies about a \.ts sibling/);
});

test("accepts a .js suffix that names a real JavaScript file", async t => {
	// The negative contract. Without it, "no .js file" could be satisfied by
	// never looking at the filesystem — and the gate would pass a repo that had
	// deleted every .js file it imported.
	const result = await check(
		t,
		{ "src/a.ts": 'import { b } from "./b.js";\nexport const a = b;\n' },
		{ "src/b.js": "export const b = 1;\n" },
	);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(verdicts(result.stderr).length, 0);
});

test("accepts a .d.ts specifier, and says so affirmatively", async t => {
	// Both real uses on this tree read a declaration file as text to inline it
	// as a prelude. A declaration file has no runtime module, so the name cannot
	// be dropped. This asserts PASS, not "was not flagged" — an empty allowlist
	// would satisfy the latter while the gate no longer policed anything.
	const result = await check(
		t,
		{ "src/a.ts": 'import decls from "./declarations.d.ts" with { type: "text" };\nexport const a = decls;\n' },
		{ "src/declarations.d.ts": "export {};\n" },
	);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(verdicts(result.stderr).length, 0);
});

test("leaves bare and package specifiers alone", async t => {
	const result = await check(t, {
		"src/a.ts":
			'import { b } from "./b";\nimport { c } from "@oh-my-pi/pi-tui";\nimport { d } from "node:path";\nexport { b, c, d };\n',
	});
	assert.equal(result.status, 0, result.stderr);
});

test("inspects .tsx, not just .ts", async t => {
	// The failure this defends is silence, not a wrong verdict: a walk that only
	// collects `.ts` leaves every `.tsx` in the repo uninspected, and a gate that
	// cannot see a file reports nothing about it — indistinguishable from clean.
	// There are 116 `.tsx` files in this tree, so that is not hypothetical.
	const result = await check(t, {
		"src/a.tsx": 'import { b } from "./b.ts";\nexport const C = () => <div>{b}</div>;\n',
	});
	assert.equal(result.status, 1, result.stderr);
	assert.equal(verdicts(result.stderr).length, 1, result.stderr);
	assert.match(result.stderr, /FAIL src\/a\.tsx:1:/);
});

test("reports how many files it scanned, so scanning nothing cannot look clean", async t => {
	// The failure this defends: a gate whose file walk silently matches nothing
	// still prints "0 errors" and reads exactly like a clean tree.
	const result = await check(t, { "src/a.ts": "export const a = 1;\n" });
	assert.equal(result.status, 0, result.stderr);
	const summary = /\[ts-relative-imports\] (\d+) lỗi \/ (\d+) tệp đã quét/.exec(result.stderr);
	assert.ok(summary, `no summary line in: ${result.stderr}`);
	assert.ok(Number(summary[2]) > 0, `scanned 0 files: ${result.stderr}`);
});

// This is the only test here that walks the real repository rather than a
// fixture, so it is the only one whose runtime scales with the tree. The
// explicit timeout is not slack for a slow machine: `node:test` defaults to 5s,
// which this exceeds by design, and a default that this test cannot meet turns
// a passing gate into a red run that reports elapsed time instead of a defect.
// Measured 2026-10-02: 11.1s unloaded, 18.1s while another full test sweep was
// running against the same tree.
test("runs under Bun, which is this repo's runtime", { timeout: 60_000 }, async t => {
	// The reason this gate was unwired for as long as it was: it drove
	// `typescript/unstable/sync`, which spawns a child and reads
	// `child.stdout._handle` — internals Bun's streams do not have. The failure
	// is a crash before any verdict, so it is only observable by running it.
	const result = spawnSync("bun", [script], { cwd: process.cwd(), encoding: "utf8" });
	assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
	assert.match(result.stderr, /\[ts-relative-imports\] \d+ lỗi \/ [1-9]\d* tệp đã quét/);
});
