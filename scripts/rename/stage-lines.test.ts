/**
 * `stage-lines.ts` exists because the ordinary staging verbs each take something
 * that is not yours on a shared tree. Its worth is entirely in the failure it
 * prevents, so every test here drives a real git index in a real repository and
 * asserts on what actually landed in the index — not on a return value.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { $ } from "bun";
import { TempDir } from "@oh-my-pi/pi-utils";
import { headBlob, stageLines, stageReplacedLines } from "./stage-lines";
import { commitStagedPaths } from "../commit-scoped";

let repo: string | undefined;

afterEach(async () => {
	if (repo) await fs.rm(repo, { recursive: true, force: true });
	repo = undefined;
});

/** A throwaway repo whose HEAD holds `seed` at `file`. */
async function makeRepo(file: string, seed: string): Promise<string> {
	repo = TempDir.createSync("@pi-stage-lines-").path();
	await $`git init -q`.cwd(repo).quiet();
	await $`git config user.email t@t.test`.cwd(repo).quiet();
	await $`git config user.name t`.cwd(repo).quiet();
	await fs.writeFile(path.join(repo, file), seed);
	await $`git add ${file}`.cwd(repo).quiet();
	await $`git commit -qm seed`.cwd(repo).quiet();
	return repo;
}

/** What the index currently holds for `file`. */
async function staged(file: string): Promise<string> {
	return (await $`git show :${file}`.cwd(repo!).quiet().nothrow()).text();
}

describe("stageReplacedLines", () => {
	it("stages the named line from the working tree", async () => {
		await makeRepo("rows.tsv", "a\nb\nc\n");
		await fs.writeFile(path.join(repo!, "rows.tsv"), "a\nMINE\nc\n");

		await stageReplacedLines("rows.tsv", "a\nMINE\nc\n", [2], repo);

		expect(await staged("rows.tsv")).toBe("a\nMINE\nc\n");
	});

	it("does not sweep a peer's uncommitted edit to the same file", async () => {
		// The exact failure this script is for: a peer edits another line of the
		// file between my edit and my commit. `git add` and `--only` both take
		// that line; only naming the line I wrote leaves it out.
		await makeRepo("rows.tsv", "a\nb\nc\n");
		await fs.writeFile(path.join(repo!, "rows.tsv"), "a\nMINE\nPEERS\n");

		await stageReplacedLines("rows.tsv", "a\nMINE\nPEERS\n", [2], repo);

		const index = await staged("rows.tsv");
		expect(index).toBe("a\nMINE\nc\n");
		expect(index).not.toContain("PEERS");
		// And the peer's line is still theirs to commit, not lost.
		expect(await fs.readFile(path.join(repo!, "rows.tsv"), "utf8")).toContain("PEERS");
	});

	it("leaves the index clean when the named line is unchanged", async () => {
		await makeRepo("rows.tsv", "a\nb\nc\n");
		const working = "a\nb\nc\n";

		await stageReplacedLines("rows.tsv", working, [2], repo);

		expect(await staged("rows.tsv")).toBe("a\nb\nc\n");
		expect((await $`git diff --cached --numstat`.cwd(repo!).quiet().nothrow()).text().trim()).toBe("");
	});

	it("appends a line that does not exist in HEAD yet", async () => {
		await makeRepo("rows.tsv", "a\nb\n");
		const working = "a\nb\nNEW\n";

		await stageReplacedLines("rows.tsv", working, [3], repo);

		expect(await staged("rows.tsv")).toBe("a\nb\nNEW\n");
	});

	it("refuses a line number past the end of the file", async () => {
		// Staging a line that is not there would silently truncate the file, which
		// on a shared tree is how another session's rows disappear.
		await makeRepo("rows.tsv", "a\nb\n");

		await expect(stageReplacedLines("rows.tsv", "a\nb\n", [9], repo)).rejects.toThrow(/do not exist|does not exist/);
	});

	it("preserves a missing trailing newline rather than adding one", async () => {
		await makeRepo("rows.tsv", "a\nb");
		const working = "a\nMINE";

		await stageReplacedLines("rows.tsv", working, [2], repo);

		expect(await staged("rows.tsv")).toBe("a\nMINE");
	});

	it("stages a new file that HEAD has never seen", async () => {
		await makeRepo("seed.txt", "x\n");
		const working = "first\nsecond\n";

		await stageReplacedLines("new.tsv", working, [1, 2], repo);

		expect(await staged("new.tsv")).toBe("first\nsecond\n");
	});
});

/**
 * What a COMMIT does with the index this script writes.
 *
 * The tests above all stop at the index, which is the right boundary for staging —
 * but it left the last step unmeasured, and that step is where a correct index gets
 * thrown away. Measured on this tree 2026-10-03: seven rows staged here landed in
 * the index exactly as intended, `git commit --only -- rows.tsv` was run next, and
 * the commit carried eleven rows — the two a peer had added to the same file and
 * left uncommitted. `--only` rebuilds the named path from the WORKING TREE, so
 * choosing the index at stage time does not carry the index into the commit.
 *
 * These assert which source the commit reads, by driving a real `git commit` and
 * reading back what it wrote. Nothing here inspects a source file's text.
 */
describe("committing what stage-lines staged", () => {
	it("carries the staged lines when the commit reads the index", async () => {
		await makeRepo("rows.tsv", "a\nb\nc\n");
		await fs.writeFile(path.join(repo!, "rows.tsv"), "a\nMINE\nPEERS\n");

		await stageReplacedLines("rows.tsv", "a\nMINE\nPEERS\n", [2], repo);
		await $`git commit -qm mine`.cwd(repo!).quiet();

		// The peer's line stayed out, which is the whole point of staging a line.
		expect(await $`git show HEAD:rows.tsv`.cwd(repo!).quiet().text()).toBe("a\nMINE\nc\n");
	});

	it("takes the WORKING TREE's rows, not the staged ones, under --only", async () => {
		// The counterfactual for the test above: identical staging, one different
		// commit verb. `--only` is documented as narrower than a bare commit, and it
		// is — narrower in PATH. What it does not narrow is the SOURCE: it rebuilds
		// the path from disk, so the peer's uncommitted line rides along.
		//
		// Both halves matter. If `--only` started reading the index, the first test
		// would still pass and this one would go red, which is what makes the pair a
		// claim about the flag rather than about this repository.
		await makeRepo("rows.tsv", "a\nb\nc\n");
		await fs.writeFile(path.join(repo!, "rows.tsv"), "a\nMINE\nPEERS\n");

		await stageReplacedLines("rows.tsv", "a\nMINE\nPEERS\n", [2], repo);
		await $`git commit -qm mine --only -- rows.tsv`.cwd(repo!).quiet();

		const committed = await $`git show HEAD:rows.tsv`.cwd(repo!).quiet().text();
		expect(committed).toContain("PEERS");
		expect(committed).not.toBe("a\nMINE\nc\n");
	});
});

/**
 * The safe path, end to end.
 *
 * The two tests above are about a verb that LOSES your staging. This one covers the
 * verb a session is supposed to use instead, and the reason it is not the default:
 * on a tree where twelve sessions share one index, a bare `git commit` takes every
 * row any of them has staged. That is `f9b23a9cba` and `d985fe7dc9`.
 *
 * The escape is a THROWAWAY INDEX — `GIT_INDEX_FILE` pointed at a fresh file, seeded
 * with `read-tree HEAD`, holding only the lines you name. The real index is never
 * opened for writing, so a peer's staged rows are not merely left out of the commit;
 * they are still staged afterwards.
 *
 * Both halves are asserted. "My commit is clean" alone would pass for a script that
 * ran `git reset` on the way past and quietly unstaged everyone, which is a worse
 * outcome than the one it prevents.
 */
describe("committing through a throwaway index", () => {
	it("takes only the named rows and leaves the real index holding the peer's", async () => {
		await makeRepo("rows.tsv", "a\nb\nc\n");
		// A peer's uncommitted work, in the real index, on a path of its own.
		await fs.writeFile(path.join(repo!, "peer.tsv"), "peer's row\n");
		await $`git add peer.tsv`.cwd(repo!).quiet();
		await fs.writeFile(path.join(repo!, "rows.tsv"), "a\nMINE\nPEERS\n");
		await stageReplacedLines("rows.tsv", "a\nMINE\nPEERS\n", [2], repo);

		await commitStagedPaths(["rows.tsv"], "mine", { cwd: repo! });

		// My commit carries my row and not the peer's line in the same file.
		expect(await $`git show HEAD:rows.tsv`.cwd(repo!).quiet().text()).toBe("a\nMINE\nc\n");
		// And it does not carry the peer's path, which the real index had staged.
		expect(await $`git show --name-only --format= HEAD`.cwd(repo!).quiet().text()).not.toContain(
			"peer.tsv",
		);
		// The peer's row is STILL STAGED. Losing it would trade one accident for another.
		expect(await $`git show :peer.tsv`.cwd(repo!).quiet().text()).toBe("peer's row\n");
		expect(await $`git status --porcelain peer.tsv`.cwd(repo!).quiet().text()).toContain("A ");
	});

	it("would take the peer's staged rows under a bare commit", async () => {
		// The control. Identical starting state, and the verb the shared-tree rules
		// warn about — so this file states what the throwaway index is buying rather
		// than asserting the throwaway index is merely correct.
		await makeRepo("rows.tsv", "a\nb\nc\n");
		await fs.writeFile(path.join(repo!, "peer.tsv"), "peer's row\n");
		await $`git add peer.tsv`.cwd(repo!).quiet();

		await $`git commit -qm bare`.cwd(repo!).quiet();

		expect(await $`git show --name-only --format= HEAD`.cwd(repo!).quiet().text()).toContain(
			"peer.tsv",
		);
	});
});

/**
 * `.gitignore` is the repository's own statement of what it does not track, and the
 * staging verb that makes this script worth using is also the one that ignores it.
 *
 * Measured on a throwaway repo with `.scratch/` ignored: `git add -A` respects the
 * rule, `update-index --cacheinfo` does not. That combination is how `.lavish-wip/`
 * reached 478 tracked files under a `.gitignore:100` that says "Ignored, not
 * committed" — so this is the shape of a real drift, not a hypothetical.
 */
describe("staging a path the repository ignores", () => {
	it("refuses, and names the rule instead of only the path", async () => {
		const dir = TempDir.createSync("@pi-stage-ignored-").path();
		const root = dir;
		await $`git init -q`.cwd(root).quiet();
		await $`git config user.email t@t.test`.cwd(root).quiet();
		await $`git config user.name t`.cwd(root).quiet();
		await fs.writeFile(path.join(root, ".gitignore"), ".scratch/\n");
		await fs.mkdir(path.join(root, ".scratch"));
		await $`git add .gitignore`.cwd(root).quiet();
		await $`git commit -qm seed`.cwd(root).quiet();
		await fs.writeFile(path.join(root, ".scratch/note.md"), "scratch\n");

		await expect(
			stageLines(".scratch/note.md", "scratch\n", "", root),
		).rejects.toThrow(/refusing to stage .*\.scratch\/note\.md/);
		// The refusal must actually leave the index alone, not merely complain.
		expect(await $`git ls-files`.cwd(root).quiet().text()).not.toContain(".scratch/note.md");
		await fs.rm(root, { recursive: true, force: true });
	});

	it("stages a path the repository does not ignore", async () => {
		// The control. A guard that refused everything would pass the test above, and
		// this script would be unusable rather than careful.
		const dir = TempDir.createSync("@pi-stage-allowed-").path();
		const root = dir;
		await $`git init -q`.cwd(root).quiet();
		await $`git config user.email t@t.test`.cwd(root).quiet();
		await $`git config user.name t`.cwd(root).quiet();
		await fs.writeFile(path.join(root, ".gitignore"), ".scratch/\n");
		await fs.mkdir(path.join(root, ".scratch"));
		await fs.writeFile(path.join(root, "rows.tsv"), "a\n");
		await $`git add .gitignore rows.tsv`.cwd(root).quiet();
		await $`git commit -qm seed`.cwd(root).quiet();

		await stageLines("rows.tsv", "a\nb\n", "a\n", root);

		expect(await $`git show :rows.tsv`.cwd(root).quiet().text()).toBe("a\nb\n");
		await fs.rm(root, { recursive: true, force: true });
	});

	it("refuses a path the repository ignores even when it is ALREADY tracked", async () => {
		// The case that makes `--no-index` load-bearing rather than defensive. A file
		// tracked from before the ignore rule exists is exactly the shape
		// `.lavish-wip/` is in: 478 of them. Without `--no-index`, `check-ignore`
		// skips tracked paths, so the guard would go quiet on precisely the files it
		// exists for — reading as careful while never firing.
		const dir = TempDir.createSync("@pi-stage-tracked-").path();
		const root = dir;
		await $`git init -q`.cwd(root).quiet();
		await $`git config user.email t@t.test`.cwd(root).quiet();
		await $`git config user.name t`.cwd(root).quiet();
		await fs.writeFile(path.join(root, ".gitignore"), ".scratch/\n");
		await fs.mkdir(path.join(root, ".scratch"));
		await fs.writeFile(path.join(root, ".scratch/n.md"), "old\n");
		await $`git add -f .scratch/n.md`.cwd(root).quiet();
		await $`git add .gitignore`.cwd(root).quiet();
		await $`git commit -qm seed`.cwd(root).quiet();
		// Control: git itself says the path is NOT ignored without --no-index.
		expect((await $`git check-ignore -q .scratch/n.md`.cwd(root).quiet().nothrow()).exitCode).toBe(1);

		await expect(stageLines(".scratch/n.md", "new\n", "old\n", root)).rejects.toThrow(
			/refusing to stage/,
		);
		await fs.rm(root, { recursive: true, force: true });
	});
});

describe("headBlob", () => {
	it("returns HEAD's content, not the working tree's", async () => {
		await makeRepo("rows.tsv", "committed\n");
		await fs.writeFile(path.join(repo!, "rows.tsv"), "uncommitted\n");

		expect(await headBlob("rows.tsv", repo)).toBe("committed\n");
	});

	it("returns empty for a file HEAD does not have", async () => {
		await makeRepo("rows.tsv", "a\n");
		expect(await headBlob("absent.tsv", repo)).toBe("");
	});
});
