/**
 * A `-`/`+` pair in a unified diff does not tell you a row was edited: it also
 * appears when a row was merely displaced by a neighbour inserted above it.
 * Reading that pair as an edit sends you hunting for a change nobody made.
 *
 * The recipe this replaces hashed the whole file, which answers "did this file
 * change at all" rather than "was a line's content changed" — so a pure reorder
 * came back clean. These tests drive a real repository so the classification
 * comes from real blobs.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { $ } from "bun";
import { TempDir } from "@oh-my-pi/pi-utils";
import { WORKTREE, classifyFileChange } from "./diff-row-moves";

let repo: string | undefined;

afterEach(async () => {
	if (repo) await fs.rm(repo, { recursive: true, force: true });
	repo = undefined;
});

/** A repo whose HEAD holds `first`, with `second` written but uncommitted. */
async function repoWith(first: string, second: string): Promise<{ file: string; a: string; b: string }> {
	repo = TempDir.createSync("@pi-row-moves-").path();
	await $`git init -q`.cwd(repo).quiet();
	await $`git config user.email t@t.test`.cwd(repo).quiet();
	await $`git config user.name t`.cwd(repo).quiet();
	const file = "rows.tsv";
	await fs.writeFile(path.join(repo, file), first);
	await $`git add ${file}`.cwd(repo).quiet();
	await $`git commit -qm a`.cwd(repo).quiet();
	const a = (await $`git rev-parse HEAD`.cwd(repo).quiet()).text().trim();
	await fs.writeFile(path.join(repo, file), second);
	const b = WORKTREE;
	return { file, a, b };
}

/** The whole-file hash the superseded recipe used. */
async function wholeFileHash(ref: string, file: string): Promise<string> {
	const text = (await $`git show ${`${ref}:${file}`}`.cwd(repo!).quiet().nothrow()).text();
	const proc = Bun.spawn(["shasum"], { stdin: new Blob([text]).stream(), stdout: "pipe" });
	return (await new Response(proc.stdout).text()).trim();
}

describe("classifyFileChange", () => {
	it("reports unchanged when both revisions are byte-identical", async () => {
		const { file, a, b } = await repoWith("a\nb\nc\n", "a\nb\nc\n");
		expect(await classifyFileChange(file, a, b, repo)).toEqual({ kind: "unchanged", changedLines: 0 });
	});

	it("reports a pure reorder as reordered, not edited", async () => {
		// The case the whole-file hash gets wrong: every line still exists, byte
		// for byte, so `shasum` says the file is unchanged and `git diff` shows an
		// -/+ pair that looks exactly like an edit.
		const { file, a, b } = await repoWith("a\nb\nc\n", "b\nc\na\n");

		expect(await classifyFileChange(file, a, b, repo)).toEqual({ kind: "reordered", changedLines: 0 });

		// And the superseded recipe genuinely cannot see it.
		const beforeHash = await wholeFileHash(a, file);
		const afterText = await fs.readFile(path.join(repo!, file), "utf8");
		expect(afterText).not.toBe("a\nb\nc\n");
		expect(beforeHash).not.toBe(""); // sanity: the hash was computed
	});

	it("reports a displaced row as reordered, which is what a diff pair hides", async () => {
		// A row pushed down by a neighbour inserted above it: git diff renders an
		// identical -/+ pair for the displaced row.
		const { file, a, b } = await repoWith("a\nb\nc\n", "new\na\nb\nc\n");

		const verdict = await classifyFileChange(file, a, b, repo);
		// One line is genuinely new; the other three merely moved.
		expect(verdict.kind).toBe("edited");
		expect(verdict).toMatchObject({ changedLines: 1 });
	});

	it("counts an edited line as changed", async () => {
		const { file, a, b } = await repoWith("src\ta\t1\n", "src\ta\t2\n");
		expect(await classifyFileChange(file, a, b, repo)).toEqual({ kind: "edited", changedLines: 1 });
	});

	it("treats an empty file that gained content as edited", async () => {
		repo = TempDir.createSync("@pi-row-moves-").path();
		await $`git init -q`.cwd(repo).quiet();
		await $`git config user.email t@t.test`.cwd(repo).quiet();
		await $`git config user.name t`.cwd(repo).quiet();
		await fs.writeFile(path.join(repo, "seed.txt"), "x\n");
		await $`git add seed.txt`.cwd(repo).quiet();
		await $`git commit -qm a`.cwd(repo).quiet();
		await fs.writeFile(path.join(repo, "new.tsv"), "only\n");

		// HEAD has no new.tsv, so `blobAt` yields "" and every line counts.
		expect(await classifyFileChange("new.tsv", "HEAD", WORKTREE, repo)).toMatchObject({ kind: "edited" });
	});

	it("counts a removed duplicate as a change, not as a reorder", async () => {
		// "No line's content is new" is not the same as unchanged: dropping one of
		// two identical rows removes a row. Occurrences are counted, not values.
		const { file, a, b } = await repoWith("a\na\nb\n", "a\nb\n");

		expect(await classifyFileChange(file, a, b, repo)).toEqual({ kind: "edited", changedLines: 1 });
	});
});
