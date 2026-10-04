/**
 * The structural layer proves itself by failing.
 *
 * A gate that has only ever returned 0 has not been tested, it has been trusted — and this repo
 * has shipped that shape twice (`epic-jwsy.11`'s never-reached fence, `epic-jwsy.14`'s gate that
 * abstained and exited 0). The bead this file serves says it outright: "Prove the guard can fail
 * before trusting it green."
 *
 * So the load-bearing row here is the one where a commit touches `packages/` and the gate is
 * required to return non-zero. If that row ever passes without the core change, the gate is
 * inert and every green it has ever printed was decoration.
 *
 * The fixtures are REAL repositories rather than a stubbed git. The property under test is what
 * `git diff <base>...HEAD` actually reports for a given tree, and a mock asserts only that the
 * right function was called — which is the failure `epic-jwsy.11` already demonstrated in
 * production code.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { $ } from "bun";
import { coreDiffPaths, runGate } from "./check-extension-core-diff";

/**
 * A repository with one commit, returning that commit's sha.
 *
 * No `origin` remote on purpose: rows that need a base set `ULTRAWORKERS_SEAM_BASE`, so the
 * merge-base fallback cannot silently supply one and make the "unresolvable" row unreachable.
 */
async function fixtureRepo(): Promise<{ dir: string; base: string }> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ext-core-diff-"));
	const git = async (...args: string[]) => $`git ${args}`.cwd(dir).quiet().nothrow();
	await git("init", "-q");
	await git("config", "user.email", "gate@test.invalid");
	await git("config", "user.name", "gate");
	await fs.mkdir(path.join(dir, "extensions"), { recursive: true });
	await fs.writeFile(path.join(dir, "extensions", "workflow.ts"), "export default function () {}\n");
	await git("add", "-A");
	await git("commit", "-q", "-m", "base");
	const base = (await git("rev-parse", "HEAD")).text().trim();
	return { dir, base };
}

/** Commit `contents` at `relativePath` on top of the fixture's base commit. */
async function commitFile(dir: string, relativePath: string, contents: string): Promise<void> {
	const target = path.join(dir, relativePath);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, contents);
	const git = async (...args: string[]) => $`git ${args}`.cwd(dir).quiet().nothrow();
	await git("add", "-A");
	await git("commit", "-q", "-m", `add ${relativePath}`);
}

/** Pin the base for a row, and clear it again so no row inherits another's measurement. */
function withBase(base: string | undefined): void {
	if (base === undefined) {
		delete Bun.env.ULTRAWORKERS_SEAM_BASE;
		return;
	}
	Bun.env.ULTRAWORKERS_SEAM_BASE = base;
}

describe("check-extension-core-diff", () => {
	afterEach(() => {
		delete Bun.env.ULTRAWORKERS_SEAM_BASE;
	});

	test("a commit outside packages/ leaves the gate green", async () => {
		// WHY: the gate's whole claim is that an extension is free. If ordinary extension work
		// turned it red, the first person to hit that would reach for a bypass rather than a
		// fix, and the criterion stops meaning anything.
		const { dir, base } = await fixtureRepo();
		withBase(base);
		await commitFile(dir, "extensions/workflow/index.ts", "export default function () {}\n");

		expect(await runGate(dir)).toBe(0);
		await fs.rm(dir, { recursive: true, force: true });
	});

	test("a commit touching packages/ turns the gate RED", async () => {
		// WHY THIS ROW IS THE POINT: it is the falsifier. A guard proven only in the passing
		// direction has not been shown to reach the thing it guards — the exact defect the bead
		// cites from epic-jwsy.11, where a fence existed, was correct, was tested, and was never
		// called by anything. If this row is ever satisfied without the core change below, the
		// gate is inert.
		const { dir, base } = await fixtureRepo();
		withBase(base);
		await commitFile(dir, "packages/coding-agent/src/index.ts", "export const x = 1;\n");

		expect(await runGate(dir)).toBe(1);
		await fs.rm(dir, { recursive: true, force: true });
	});

	test("a tree with no resolvable base FAILS rather than reporting clean", async () => {
		// WHY: an unmeasurable tree is the abstention-as-success bug. `epic-jwsy.14` exited 0
		// because it could not reach a verdict, and a CI badge read that as a pass. Returning 0
		// here would reintroduce it exactly, one layer down — so an unresolvable base is a
		// non-zero exit with a message that says CANNOT MEASURE, not a quiet green.
		const { dir } = await fixtureRepo();
		withBase(undefined); // no env var, and the fixture has no `origin` to merge-base against

		expect(await runGate(dir)).toBe(1);
		await fs.rm(dir, { recursive: true, force: true });
	});

	test("core paths are matched by path segment, not by substring", async () => {
		// WHY: `startsWith` on a normalized prefix is load-bearing. A predicate "simplified" to
		// `includes("packages")` would flag `docs/packages/notes.md` and `mypackages/x.ts` as
		// core, and a gate that cries wolf on ordinary paths gets disabled rather than obeyed.
		expect(coreDiffPaths(["packages/coding-agent/src/index.ts"])).toEqual(["packages/coding-agent/src/index.ts"]);
		expect(coreDiffPaths(["docs/packages/notes.md", "mypackages/x.ts", "packages-extra/y.ts"])).toEqual([]);
	});

	test("a Windows-style separator is still recognised as core", async () => {
		// WHY: git prints POSIX separators, but a caller that assembled the changed-file list on
		// Windows has backslashes. A gate that understood only one spelling would read a real
		// core change as clean on the other platform — and it would be green in CI, which is
		// where the miss would be read as a verdict.
		expect(coreDiffPaths(["packages\\coding-agent\\src\\index.ts"])).toEqual([
			"packages\\coding-agent\\src\\index.ts",
		]);
	});
});
