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
import { headBlob, stageReplacedLines } from "./stage-lines";

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
