/**
 * The R0 GRP-C file-count gate must report a file that is gone from the working tree
 * as lost — including the case where nobody staged the deletion.
 *
 * `git ls-files` reads the *index*, so a plain `rm` leaves the manifest untouched: the
 * count holds, and the gate reports a full directory for one that has lost a file. That
 * is the single failure this gate exists to catch, hidden by the tool it counts with.
 * Measured in an isolated repo before the fix: three files committed, one `rm`-ed with
 * no `git rm`, and `git ls-files packages/` still returned 3.
 *
 * The gate is run as a subprocess against a real repository rather than exercised
 * through its internals: it resolves its baseline relative to its own directory and
 * shells out to git, so the only honest way to test it is to give it a repository. The
 * script is *copied*, not imported and not stubbed — a test that ran a different
 * implementation would pass while the shipped gate stayed broken.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { ptree, TempDir } from "@oh-my-pi/pi-utils";

const GATE = path.join(import.meta.dir, "check-grp-c-file-counts.ts");

/** Three files under `packages/`, none of them prompts or puppeteer assets. */
async function seed(dir: string): Promise<void> {
	const scripts = path.join(dir, "scripts");
	await Bun.write(path.join(scripts, ".keep"), "");
	for (const name of ["a", "b", "c"]) {
		const file = path.join(dir, "packages/utils/src", `${name}.ts`);
		await Bun.write(file, `export const ${name} = 1;\n`);
	}
	await Bun.write(
		path.join(scripts, "r0-grp-c-file-counts.json"),
		`${JSON.stringify({ head: "test", counts: { "packages (all)": 3, "prompts (any depth)": 0, "tools/puppeteer": 0 } }, null, 2)}\n`,
	);
	await Bun.write(path.join(scripts, "check-grp-c-file-counts.ts"), await Bun.file(GATE).text());

	const git = (...args: string[]) => ptree.exec(["git", ...args], { cwd: dir });
	await git("init", "-q", ".");
	await git("config", "user.email", "gate@test");
	await git("config", "user.name", "gate");
	await git("add", "-A");
	await git("commit", "-qm", "seed");
}

/**
 * Runs the COPY inside the temp repo, not the original: the gate resolves its baseline
 * relative to `import.meta.dir`, so running the original would read the real repository's
 * `r0-grp-c-file-counts.json` and quietly measure this working tree instead.
 */
const runGate = (dir: string) =>
	ptree.exec([process.execPath, path.join(dir, "scripts/check-grp-c-file-counts.ts")], {
		cwd: dir,
		allowNonZero: true,
		env: { ...Bun.env, NO_COLOR: "1" },
	});

describe("R0 GRP-C file-count gate", () => {
	test("a deletion that never reached the index is still a loss", async () => {
		using dir = TempDir.createSync("uw-grp-c-gate-");
		await seed(dir.absolute());

		expect((await runGate(dir.absolute())).exitCode).toBe(0);

		// The hole: removed from disk, index untouched.
		await Bun.file(path.join(dir.absolute(), "packages/utils/src/b.ts")).unlink();

		const after = await runGate(dir.absolute());
		expect(after.exitCode).toBe(1);
		expect(after.stderr).toContain("LOST 1 file(s): 3 → 2");

		// Restoring the file is what makes it green again — the gate tracks the tree.
		await Bun.write(path.join(dir.absolute(), "packages/utils/src/b.ts"), "export const b = 1;\n");
		expect((await runGate(dir.absolute())).exitCode).toBe(0);
	}, 30_000);

	test("a staged removal fails the same way, and adding files never does", async () => {
		using dir = TempDir.createSync("uw-grp-c-gate-staged-");
		await seed(dir.absolute());

		await ptree.exec(["git", "rm", "-q", "packages/utils/src/c.ts"], { cwd: dir.absolute() });
		const staged = await runGate(dir.absolute());
		expect(staged.exitCode).toBe(1);
		expect(staged.stderr).toContain("LOST 1 file(s): 3 → 2");

		// Growth is the point of the exercise: a new file must stay green, or the gate
		// would be unusable for the reorganization it was written to guard. Restoring
		// from HEAD, not the index: `git rm` took the path out of both.
		await ptree.exec(["git", "checkout", "-q", "HEAD", "--", "packages/utils/src/c.ts"], {
			cwd: dir.absolute(),
		});
		await Bun.write(path.join(dir.absolute(), "packages/utils/src/d.ts"), "export const d = 1;\n");
		const grown = await runGate(dir.absolute());
		expect(grown.exitCode).toBe(0);
		expect(grown.stdout).toContain("green");
	}, 30_000);
});
