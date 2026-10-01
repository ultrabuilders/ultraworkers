/**
 * The contract: a maintainer merges a patch they cannot answer "what does this
 * change, and when may I drop it" for, and nothing told them.
 *
 * Every case below compares against the **real bytes** of `patches/*.patch`.
 * Comparing against a `purpose` column the script filled in itself would be
 * circular — the three sets would always agree, and the gate would be green on
 * a ledger that lies.
 *
 * The mismatch cases run the script as a **separate process** rather than
 * calling `reconcile()` in-process, because the failure they defend is in the
 * reading layer: a script that resolved `package.json` from its own repo root
 * instead of the tree it was given passes on the real repo and breaks on a
 * fixture, and only two processes can tell that apart.
 */

import { afterAll, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	buildLedgerMarkdown,
	collectLedger,
	parseLedger,
	readPatchTree,
	readPatchedDependencies,
	reconcile,
	UNRECORDED,
} from "./gen-patch-ledger";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const SCRIPT = path.join(import.meta.dir, "gen-patch-ledger.ts");
const ARK = "patches/@ark%2Fschema@0.56.2.patch";
const PUPPETEER = "patches/puppeteer-core@25.3.0.patch";

/** Real patch bytes — never a hand-typed stand-in. */
const REAL_ARK = await Bun.file(path.join(REPO_ROOT, ARK)).text();
const REAL_PUPPETEER = await Bun.file(path.join(REPO_ROOT, PUPPETEER)).text();

/** A `diff --git` block that is structurally valid and touches a file no patch has. */
const GHOST_HUNK = `
diff --git a/lib/ghost.js b/lib/ghost.js
index 1111111..2222222 100644
--- a/lib/ghost.js
+++ b/lib/ghost.js
@@ -1 +1 @@
-const before = 1;
+const after = 2;
`;

interface RunResult {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

async function runScript(root?: string): Promise<RunResult> {
	const proc = Bun.spawn(["bun", SCRIPT, ...(root === undefined ? [] : ["--root", root])], {
		cwd: REPO_ROOT,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stdout, stderr };
}

/** Build a throwaway tree: `patches/*.patch` plus a `patchedDependencies` block. */
async function makeTree(patches: Record<string, string>, declared: Record<string, string>): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-patch-ledger-"));
	for (const [rel, content] of Object.entries(patches)) {
		const full = path.join(dir, rel);
		await fs.mkdir(path.dirname(full), { recursive: true });
		await Bun.write(full, content);
	}
	await Bun.write(path.join(dir, "package.json"), JSON.stringify({ patchedDependencies: declared }, null, 2));
	return dir;
}

const dirs: string[] = [];
async function tree(patches: Record<string, string>, declared: Record<string, string>): Promise<string> {
	const dir = await makeTree(patches, declared);
	dirs.push(dir);
	return dir;
}

afterAll(async () => {
	await Promise.all(dirs.map(dir => fs.rm(dir, { recursive: true, force: true })));
});

/** Every hunk the patch bytes actually contain, as `patchPath: file`. */
async function liveHunks(root: string): Promise<string[]> {
	const tree = await readPatchTree(root);
	const out: string[] = [];
	for (const [patchPath, hunks] of tree) {
		for (const hunk of hunks) {
			const file = / b\/(.+)$/.exec(hunk.header)?.[1];
			if (file !== undefined) out.push(`${patchPath}: ${file}`);
		}
	}
	return out.sort();
}

describe("the real patches/ tree reconciles", () => {
	test("every hunk in the shipped patches has a ledger row", async () => {
		const patched = await readPatchedDependencies(REPO_ROOT);
		const hunks = await readPatchTree(REPO_ROOT);
		const rows = parseLedger(await Bun.file(path.join(REPO_ROOT, "patches/LEDGER.md")).text()).flatMap(g => g.rows);

		const result = reconcile(patched, hunks, rows);

		expect(result.ok ? [] : result.missing).toEqual([]);
		expect(result.ok ? [] : result.orphaned).toEqual([]);
		// Counted from the patch bytes, not from the ledger: 12 in puppeteer,
		// 1 in @ark/schema. A ledger that had quietly lost rows would still
		// reconcile if the count were read back out of the ledger.
		expect((await liveHunks(REPO_ROOT)).length).toBe(13);
		expect((await liveHunks(REPO_ROOT)).filter(h => h.startsWith(PUPPETEER)).length).toBe(12);
	});

	test("regenerating the ledger is byte-identical", async () => {
		const ledger = path.join(REPO_ROOT, "patches/LEDGER.md");
		const before = await Bun.file(ledger).text();

		const result = await runScript();

		// Reported even when green: "exit 0" alone does not say which direction
		// the ledger drifted, and a drifted ledger is the whole failure here.
		console.error(`[ledger] exit=${result.exitCode} stderr=${result.stderr.trim()}`);
		expect(result.exitCode).toBe(0);
		expect(await Bun.file(ledger).text()).toBe(before);
	});
});

describe("a hunk with no ledger row is refused", () => {
	test("appending a hunk to a patch fails the run and names the hunk", async () => {
		const root = await tree({ [ARK]: REAL_ARK }, { "@ark/schema@0.56.2": ARK });
		expect((await runScript(root)).exitCode).toBe(0);

		await Bun.write(path.join(root, ARK), REAL_ARK + GHOST_HUNK);
		const result = await runScript(root);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("lib/ghost.js");
		// The only hunk that should be named: a gate that reports the pre-existing
		// rows too would be reporting the wrong thing.
		const missing = /missing=(\[.*\])/.exec(result.stderr)?.[1];
		expect(missing).toBe(JSON.stringify([`${ARK}: lib/ghost.js`]));
	});

	test("deleting a ledger row for a live hunk fails the run", async () => {
		const root = await tree({ [ARK]: REAL_ARK }, { "@ark/schema@0.56.2": ARK });
		await runScript(root);
		const ledgerPath = path.join(root, "patches/LEDGER.md");
		const table = await Bun.file(ledgerPath).text();
		await Bun.write(
			ledgerPath,
			table
				.split("\n")
				.filter(line => !line.includes("out/constraint.js"))
				.join("\n"),
		);

		const result = await runScript(root);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("out/constraint.js");
	});
});

describe("patchedDependencies and patches/ must agree both ways", () => {
	test("three declared against two files on disk fails", async () => {
		const root = await tree(
			{ [ARK]: REAL_ARK, [PUPPETEER]: REAL_PUPPETEER },
			{
				"@ark/schema@0.56.2": ARK,
				"puppeteer-core@25.3.0": PUPPETEER,
				"phantom@1.0.0": "patches/phantom@1.0.0.patch",
			},
		);

		const result = await runScript(root);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("patches/phantom@1.0.0.patch");
		// The two that do exist must not be reported: a gate that lists everything
		// wrong is indistinguishable from one that cannot find the thing.
		expect(result.stderr).not.toContain("patches/undeclared@1.0.0.patch");
	});

	test("a patch file nobody declared fails — it would never be applied", async () => {
		const root = await tree(
			{ [ARK]: REAL_ARK, "patches/undeclared@1.0.0.patch": GHOST_HUNK },
			{ "@ark/schema@0.56.2": ARK },
		);

		const result = await runScript(root);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("patches/undeclared@1.0.0.patch");
		expect(result.stderr).toContain("not in patchedDependencies");
	});
});

describe("a row for a hunk that no longer exists is refused", () => {
	test("orphaning a row fails the run", async () => {
		const root = await tree({ [ARK]: REAL_ARK }, { "@ark/schema@0.56.2": ARK });
		await runScript(root);
		const ledgerPath = path.join(root, "patches/LEDGER.md");
		const kept = (await Bun.file(ledgerPath).text())
			.split("\n")
			.filter(line => !line.startsWith("| `"))
			.join("\n");
		await Bun.write(ledgerPath, `${kept}\n| \`lib/removed-long-ago.js\` | stale | — | 1.0.0 |\n`);

		const result = await runScript(root);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("lib/removed-long-ago.js");
	});
});

describe("regeneration carries the human columns across", () => {
	test("a filled drop-when survives, and the file column is still derived", async () => {
		const root = await tree({ [ARK]: REAL_ARK }, { "@ark/schema@0.56.2": ARK });
		await runScript(root);
		const ledgerPath = path.join(root, "patches/LEDGER.md");
		const filled = (await Bun.file(ledgerPath).text()).replace(
			`| \`out/constraint.js\` | ${UNRECORDED} | — | ${UNRECORDED} |`,
			"| `out/constraint.js` | Keeps the runtime schema check honest | https://github.com/ark-tsio/ark/issues/1 | 0.57.0 |",
		);
		await Bun.write(ledgerPath, filled);

		const result = await runScript(root);

		expect(result.exitCode).toBe(0);
		const rows = parseLedger(await Bun.file(ledgerPath).text()).flatMap(g => g.rows);
		expect(rows).toEqual([
			{
				file: "out/constraint.js",
				purpose: "Keeps the runtime schema check honest",
				upstream: "https://github.com/ark-tsio/ark/issues/1",
				dropWhen: "0.57.0",
			},
		]);
	});

	test("an empty upstream stays empty rather than gaining a fabricated one", async () => {
		const root = await tree({ [ARK]: REAL_ARK }, { "@ark/schema@0.56.2": ARK });
		await runScript(root);
		const ledgerPath = path.join(root, "patches/LEDGER.md");
		await Bun.write(
			ledgerPath,
			(await Bun.file(ledgerPath).text()).replace(
				`| \`out/constraint.js\` | ${UNRECORDED} | — | ${UNRECORDED} |`,
				"| `out/constraint.js` | a purpose with no upstream issue | — | 0.57.0 |",
			),
		);

		expect((await runScript(root)).exitCode).toBe(0);
		const [row] = parseLedger(await Bun.file(ledgerPath).text()).flatMap(g => g.rows);
		expect(row?.upstream).toBeNull();
		expect(row?.purpose).toBe("a purpose with no upstream issue");
	});
});

describe("collectLedger rebuilds rows from the diff, not from the old file", () => {
	test("a hunk that appeared gets a row even when no ledger mentioned it", () => {
		const patched = [{ spec: "@ark/schema@0.56.2", patchPath: ARK }];
		const hunks = new Map([[ARK, [{ header: "diff --git a/out/constraint.js b/out/constraint.js" }]]]);

		const groups = collectLedger(patched, hunks, []);

		expect(groups[0]?.rows).toEqual([
			{ file: "out/constraint.js", purpose: UNRECORDED, upstream: null, dropWhen: UNRECORDED },
		]);
		expect(buildLedgerMarkdown(groups)).toContain("| `out/constraint.js` |");
	});

	test("rows are emitted in patch order, so the ledger is stable across runs", () => {
		const patched = [{ spec: "p", patchPath: "patches/p.patch" }];
		const hunks = new Map([
			["patches/p.patch", [{ header: "diff --git a/z.js b/z.js" }, { header: "diff --git a/a.js b/a.js" }]],
		]);

		const [group] = collectLedger(patched, hunks, []);

		// Patch order, not sorted order: sorting would be a second, invisible
		// ordering rule, and "sorted" and "as the diff has it" disagree the first
		// time a patch touches a file alphabetically before one it does not.
		expect(group?.rows.map(r => r.file)).toEqual(["z.js", "a.js"]);
	});
});
