/**
 * The feature→mechanism gate must be red for every way the table can rot, and
 * green when the table is true.
 *
 * The direction that matters is the negative one. A table of claims about
 * mechanisms is worth nothing if a row can name a file that was deleted six
 * commits ago and stay green — that is the exact failure this gate exists to
 * catch, and it is silent by nature: nothing throws, the doc still reads well,
 * and a reader trusts it about code they are about to change.
 *
 * The other three directions guard the gate itself rather than the table. A
 * missing table, an empty one, and an over-cap `none` count each satisfy the
 * "every proof resolves" rule trivially, so without them the cheapest way to
 * green this gate is to delete what it checks.
 *
 * Run as a subprocess against a copied gate, not through its internals: the
 * table path is derived from `import.meta.dir`, so the only seam that exercises
 * the real resolution logic is a real directory layout. `git ls-files` has to
 * run from the repo root, which is why `cwd` is pinned rather than the temp dir.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { ptree, TempDir } from "@oh-my-pi/pi-utils";

const GATE = path.join(import.meta.dir, "check-feature-mechanism.ts");
const repoRoot = path.join(import.meta.dir, "..");

/** A proof that genuinely exists, so "green" never depends on a fixture inventing one. */
const REAL_PROOF = "plugin-runtime-config-lock.test.ts";

function table(...rows: string[][]): string {
	const body = rows.map(cells => `| ${cells.join(" | ")} |`).join("\n");
	return `| feature | mechanism | proof |\n| --- | --- | --- |\n${body}\n`;
}

/** Copy the gate into a temp tree and return the paths the run needs. */
async function installGate(root: string): Promise<{ gate: string; table: string }> {
	await Bun.write(path.join(root, "scripts", "check-feature-mechanism.ts"), await Bun.file(GATE).text());
	return {
		gate: path.join(root, "scripts", "check-feature-mechanism.ts"),
		table: path.join(root, "docs", "feature-mechanism.md"),
	};
}

const runGate = (gate: string) =>
	ptree.exec([process.execPath, gate], { cwd: repoRoot, allowNonZero: true, env: { ...Bun.env, NO_COLOR: "1" } });

describe("feature-mechanism gate", () => {
	test("a row citing a file that does not exist is red", async () => {
		using dir = TempDir.createSync("omp-feature-mechanism-deleted-");
		const root = dir.absolute();
		const { gate, table: doc } = await installGate(root);
		await Bun.write(doc, table(["A behaviour", "`somewhere`", "`renamed-away.test.ts`"]));

		const result = await runGate(gate);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("proof does not resolve");
		// Naming the file is the part that makes it actionable: a gate that only
		// says "something is wrong" sends the reader hunting.
		expect(result.stderr).toContain("renamed-away.test.ts");
	}, 60_000);

	test("an empty table is red, so deleting the rows cannot silence the gate", async () => {
		using dir = TempDir.createSync("omp-feature-mechanism-empty-");
		const root = dir.absolute();
		const { gate, table: doc } = await installGate(root);
		await Bun.write(doc, table());

		const result = await runGate(gate);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("has no rows");
	}, 60_000);

	test("a missing table is red, not an empty pass", async () => {
		using dir = TempDir.createSync("omp-feature-mechanism-absent-");
		const root = dir.absolute();
		const { gate } = await installGate(root);
		// Deliberately no table written.

		const result = await runGate(gate);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("NO TABLE");
	}, 60_000);

	test("`none` over the registered ceiling is red, and `none` alone is not a reason", async () => {
		using dir = TempDir.createSync("omp-feature-mechanism-none-");
		const root = dir.absolute();
		const { gate, table: doc } = await installGate(root);
		await Bun.write(doc, table(["A behaviour", "`somewhere`", "none"]));

		const result = await runGate(gate);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain('"none" with no reason');
	}, 60_000);

	test("a table whose proofs all resolve is green", async () => {
		using dir = TempDir.createSync("omp-feature-mechanism-true-");
		const root = dir.absolute();
		const { gate, table: doc } = await installGate(root);
		await Bun.write(doc, table(["A behaviour", "`somewhere`", `\`${REAL_PROOF}\``]));

		const result = await runGate(gate);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("every proof resolves");
	}, 60_000);

	test("the committed table is itself green", async () => {
		// The real artifact, not a fixture. Every other test here could pass while
		// the shipped table rotted, because they all supply their own rows.
		const result = await ptree.exec([process.execPath, GATE], { cwd: repoRoot, allowNonZero: true });
		expect(result.stderr).toBe("");
		expect(result.exitCode).toBe(0);
	}, 60_000);
});
