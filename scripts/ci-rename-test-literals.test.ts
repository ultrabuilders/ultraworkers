/**
 * The gate's process contract, run for real against throwaway trees.
 *
 * The gate exports nothing and resolves its root from `import.meta.dir`, so the only way to
 * reach it is to run it. Each case copies the real script into a temp tree, which makes that
 * tree its `REPO_ROOT` — the tests below execute the shipped gate, not a transcription of it.
 *
 * ## Why a row can be wrong about `hits` and still be green
 *
 * This is the part the next reader needs, and it is not visible from the table.
 *
 * `hits` is a *column*, not a gate input on this side. `readRows` parses it into
 * `Row.hits` and nothing ever reads that field again: `isAccounted` matches on
 * `row.path === hit.file && row.reason.trim() !== ""`, so a hit is accounted for by the
 * **existence of a path row with a reason**, and the number is inert. A row may declare 0
 * over a file holding two literals, or 99 over a file holding none, and this gate passes
 * both — because "someone can say why" is the contract it enforces, and a count is not a
 * reason.
 *
 * That is deliberate on this side and load-bearing on the other. The sibling gate,
 * `scripts/rename/check-disposition.ts`, owns the table's schema and *does* enforce the
 * number, as a group sum over each path's src rows. One column, two gates, two meanings:
 * here it is provenance ("who decided this literal stays"), there it is an arithmetic
 * invariant. Reading either gate's behaviour as the other's is how the split gets undone.
 *
 * It is not hypothetical. `packages/tui/test/composer-cache.test.ts` declares `hits=0`
 * while this gate counts 2 for it, and the run is green at HEAD. That row is not wrong —
 * the src-side sum balances — but this gate cannot tell you so, and the test below pins the
 * behaviour rather than the wish, so that closing the gap has to be a deliberate edit here
 * instead of a surprise in CI.
 */

import { afterAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/** The gate under test, copied into each tree rather than re-implemented here. */
const REAL_GATE = path.join(import.meta.dir, "ci-rename-test-literals.ts");

/** The shipped header, so a fixture row is the same shape the real table carries. */
const HEADER = "scope\tpath\thits\tdisposition\treason\tkeep_refs";

/**
 * A file holding exactly two hits, on separate lines under different patterns.
 *
 * Two lines rather than two on one line, so the count is unambiguous: the gate appends one
 * hit per (line, pattern) pair, and a file whose count is read as "2" for the wrong reason
 * would make the assertions below prove nothing.
 */
const TWO_LITERALS = ['const LEGACY = ".omp";', 'const MARKER = "__omp_worker_probe";', ""].join("\n");

/** A file whose only literal is outside the gate's glob. */
const OUT_OF_SCOPE = ['export const DIR = ".omp";', ""].join("\n");

const IN_SCOPE_FILE = "packages/tui/test/legacy-name.test.ts";

/** One row body: scope, path, hits, disposition, reason, keep_refs. */
function row(file: string, hits: string, reason: string): string[] {
	return ["test", file, hits, "keep-path", reason, ""];
}

interface Fixture {
	/** Repo-relative path -> file body. Parent directories come from `Bun.write`. */
	files?: Record<string, string>;
	/** Row bodies, tab-joined, written under the header. */
	rows?: string[][];
	/** Skip the table entirely, to reach the "no table" branch. */
	withoutTable?: boolean;
}

const roots: string[] = [];

afterAll(async () => {
	await Promise.all(roots.map(root => fs.rm(root, { recursive: true, force: true })));
});

async function buildTree(name: string, fixture: Fixture): Promise<string> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), `rename-test-literals-${name}-`));
	roots.push(root);
	await fs.mkdir(path.join(root, "scripts"), { recursive: true });
	await fs.copyFile(REAL_GATE, path.join(root, "scripts", "ci-rename-test-literals.ts"));
	for (const [relPath, body] of Object.entries(fixture.files ?? {})) {
		await Bun.write(path.join(root, relPath), body);
	}
	if (!fixture.withoutTable) {
		const table = [HEADER, ...(fixture.rows ?? []).map(cells => cells.join("\t"))].join("\n");
		await Bun.write(path.join(root, "scripts", "rename", "disposition.tsv"), `${table}\n`);
	}
	return root;
}

interface GateRun {
	exitCode: number;
	stdout: string;
	stderr: string;
}

async function runGate(root: string): Promise<GateRun> {
	const proc = Bun.spawnSync([process.execPath, path.join(root, "scripts", "ci-rename-test-literals.ts")], {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
	});
	return { exitCode: proc.exitCode, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() };
}

const table = (root: string) => path.join(root, "scripts", "rename", "disposition.tsv");

describe("ci-rename-test-literals: a row's reason is the contract, its count is not", () => {
	it("covers the file when the row carries a reason", async () => {
		const root = await buildTree("covered", {
			files: { [IN_SCOPE_FILE]: TWO_LITERALS },
			rows: [row(IN_SCOPE_FILE, "2", "XDG cache directory named after the app, asserted by name")],
		});

		const run = await runGate(root);

		expect(run.exitCode).toBe(0);
		expect(run.stdout).toContain("2 hit(s) across 1 test file(s)");
		expect(run.stderr).toBe("");
	});

	it("stays green when the row's count disagrees with the file — the gap this gate leaves open", async () => {
		// The declared count is zero over a file the scan measures as two. A gate that
		// compared the column would fail here; this one passes, and that is the fact the
		// next reader needs stated rather than discovered.
		const root = await buildTree("count-is-inert", {
			files: { [IN_SCOPE_FILE]: TWO_LITERALS },
			rows: [row(IN_SCOPE_FILE, "0", "the count is not what this gate checks")],
		});

		const run = await runGate(root);

		expect(run.exitCode).toBe(0);
		// The scan really did measure two, so this is not passing because it saw nothing.
		expect(run.stdout).toContain("2 hit(s) across 1 test file(s)");
		expect(run.stdout).toContain(`${IN_SCOPE_FILE}=2`);
	});

	it("goes red with output when one row is deleted from a populated table", async () => {
		const other = "packages/tui/test/other-legacy.test.ts";
		const root = await buildTree("row-deleted", {
			files: { [IN_SCOPE_FILE]: TWO_LITERALS, [other]: TWO_LITERALS },
			rows: [
				row(IN_SCOPE_FILE, "2", "XDG cache directory named after the app"),
				row(other, "2", "worker selector, spelled by the CLI that dispatches it"),
			],
		});

		// The bar has to be reachable: an identical tree that is green means the red below
		// came from the deletion and not from the fixture being wrong to begin with.
		expect((await runGate(root)).exitCode).toBe(0);

		// Delete exactly one row and leave the table populated. Emptied to its header it is a
		// different state with a different code, which is the next test — conflating the two
		// would hide which one a sweep that deletes rows has actually reached.
		await Bun.write(table(root), `${[HEADER, row(other, "2", "worker selector").join("\t")].join("\n")}\n`);

		const run = await runGate(root);

		expect(run.exitCode).toBe(1);
		// Actionable, not a count: the line and the spelling are what an author needs.
		expect(run.stderr).toContain(`${IN_SCOPE_FILE}:1  ".omp"`);
		expect(run.stderr).toContain(`${IN_SCOPE_FILE}:2  __omp_worker_`);
		// The surviving row still covers its own file: losing one row loses one file, not both.
		expect(run.stdout).toContain("4 hit(s) across 2 test file(s)");
		expect(run.stdout).toContain("2 without a disposition row carrying a reason");
	});

	it("counts a row as no row when either half of the match fails", async () => {
		// `isAccounted` is one conjunction with two halves, and each half can fail on its own.
		// Both end the same way — the file loses its coverage — for different reasons a reader
		// has to be able to tell apart.
		const emptied = await buildTree("reason-emptied", {
			files: { [IN_SCOPE_FILE]: TWO_LITERALS },
			rows: [row(IN_SCOPE_FILE, "2", "")],
		});
		const emptiedRun = await runGate(emptied);
		expect(emptiedRun.exitCode).toBe(1);
		expect(emptiedRun.stderr).toContain(`${IN_SCOPE_FILE}:1`);

		// A reason on a neighbouring path covers nothing: matching is on the path, and a row
		// for `composer-cache.test.ts` does not speak for `composer-cache-xdg.test.ts`.
		const neighbouring = await buildTree("path-mismatch", {
			files: { [IN_SCOPE_FILE]: TWO_LITERALS },
			rows: [row("packages/tui/test/composer-cache.test.ts", "2", "XDG cache directory named after the app")],
		});
		const neighbourRun = await runGate(neighbouring);
		expect(neighbourRun.exitCode).toBe(1);
		expect(neighbourRun.stderr).toContain(`${IN_SCOPE_FILE}:1`);
	});
});

describe("ci-rename-test-literals: the two codes that mean the scan itself is wrong", () => {
	it("exits 2 on a missing table, distinct from the 1 that means unaccounted", async () => {
		const root = await buildTree("no-table", {
			files: { [IN_SCOPE_FILE]: TWO_LITERALS },
			withoutTable: true,
		});

		const run = await runGate(root);

		// Two for the same file: the row is gone AND the literals are unaccounted-for. The
		// author has to be pointed at the table, not at their test file.
		expect(run.exitCode).toBe(2);
		expect(run.stderr).toContain("no table at scripts/rename/disposition.tsv");
	});

	it("exits 2 when the table survives but holds no rows, rather than blaming every hit", async () => {
		const root = await buildTree("table-emptied", {
			files: { [IN_SCOPE_FILE]: TWO_LITERALS },
			rows: [],
		});

		const run = await runGate(root);

		// Same code as the missing table, for the same reason: zero rows must not be read as
		// "every literal is unaccounted-for", which sends the author to their test file when
		// the table is what emptied.
		expect(run.exitCode).toBe(2);
		// Deliberately NOT asserting on the output. This path exits 2 having written nothing
		// on either stream — the comment in the gate says `readRows` already said why, and it
		// does, but only for the missing-file case. Silence here is a gap, not a contract, and
		// pinning it as one would have to be undone by whoever closes it.
	});

	it("exits 2 when the scan finds nothing, rather than reporting a clean tree", async () => {
		const root = await buildTree("scan-blind", {
			files: { "packages/tui/test/plain.test.ts": "export const ok = 1;\n" },
			rows: [row("packages/tui/test/plain.test.ts", "0", "nothing to account for")],
		});

		const run = await runGate(root);

		// A glob that silently matched nothing would otherwise report a perfect score forever.
		expect(run.exitCode).toBe(2);
		expect(run.stderr).toContain("the scan is not seeing the tree");
	});

	it("counts only files under packages/*/test/, so widening the glob would be caught", async () => {
		const root = await buildTree("scope", {
			files: {
				[IN_SCOPE_FILE]: TWO_LITERALS,
				// The same literal, one directory over. Counting it would redden every run
				// against rows that `check-disposition.ts` already owns.
				"packages/tui/src/prompt/legacy-name.ts": OUT_OF_SCOPE,
			},
			rows: [row(IN_SCOPE_FILE, "2", "XDG cache directory named after the app")],
		});

		const run = await runGate(root);

		expect(run.exitCode).toBe(0);
		expect(run.stdout).toContain("2 hit(s) across 1 test file(s)");
		expect(run.stdout).not.toContain("src/prompt/legacy-name.ts");
	});
});
