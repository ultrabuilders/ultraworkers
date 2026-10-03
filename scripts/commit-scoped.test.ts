import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { commitStagedPaths, parseArgs } from "./commit-scoped";

/** Run git in `cwd`, returning stdout VERBATIM. Leading whitespace is data for porcelain. */
async function runRaw(args: string[], cwd: string): Promise<string> {
	const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0) throw new Error(`git ${args.join(" ")} exited ${code}: ${stderr.trim()}`);
	return stdout;
}

/** Run git in `cwd`, returning trimmed stdout. */
async function run(args: string[], cwd: string): Promise<string> {
	return (await runRaw(args, cwd)).trim();
}

/** A repo with one commit, so HEAD exists and a tree can be built on top of it. */
async function makeRepo(): Promise<string> {
	const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "commit-scoped-test-"));
	await run(["init", "-q", "-b", "main"], dir);
	await run(["config", "user.email", "scope@example.test"], dir);
	await run(["config", "user.name", "Scope Test"], dir);
	await run(["config", "commit.gpgsign", "false"], dir);
	await fs.promises.writeFile(path.join(dir, "seed.txt"), "seed\n");
	await run(["add", "seed.txt"], dir);
	await run(["commit", "-q", "-m", "seed"], dir);
	return dir;
}

async function write(dir: string, name: string, body: string): Promise<void> {
	await fs.promises.writeFile(path.join(dir, name), body);
}

describe("commitStagedPaths", () => {
	it("commits only the named path and leaves a peer's staged entry staged and uncommitted", async () => {
		// The incident this exists for: a bare `git commit` carried a peer's staged rows
		// under my message. The contract is that the peer's entry survives the commit —
		// still staged, still theirs, absent from the commit.
		const dir = await makeRepo();
		try {
			await write(dir, "mine.txt", "mine v2\n");
			await run(["add", "mine.txt"], dir);
			await write(dir, "peer.txt", "peer row\n");
			await run(["add", "peer.txt"], dir);

			const result = await commitStagedPaths(["mine.txt"], "only mine", { cwd: dir });

			expect(result.wroteCommit).toBe(true);
			expect(result.committed).toEqual(["mine.txt"]);
			// The peer's file is not in the commit at all.
			expect(await run(["show", "--name-only", "--format=", result.commit], dir)).toBe("mine.txt");
			// …and it is still staged afterwards, byte-identical, not swept and not dropped.
			expect(await run(["diff", "--cached", "--name-only"], dir)).toBe("peer.txt");
			expect(await run(["show", ":peer.txt"], dir)).toBe("peer row");
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("commits the staged content, not the working tree, when the two differ", async () => {
		// This is the whole reason a scoped commit exists rather than `git add` + `git
		// commit --only`, both of which take the file's CURRENT content. An edit made
		// after staging must not reach the commit.
		const dir = await makeRepo();
		try {
			await write(dir, "shared.txt", "staged\n");
			await run(["add", "shared.txt"], dir);
			// Someone — the author or a peer — touches the file again, unstaged.
			await write(dir, "shared.txt", "staged\nlater edit, never staged\n");

			const result = await commitStagedPaths(["shared.txt"], "take the staged version", { cwd: dir });

			expect(await run(["show", `${result.commit}:shared.txt`], dir)).toBe("staged");
			// The later edit is still in the working tree, uncommitted and intact.
			expect(await fs.promises.readFile(path.join(dir, "shared.txt"), "utf8")).toBe(
				"staged\nlater edit, never staged\n",
			);
			expect(await runRaw(["status", "--porcelain", "shared.txt"], dir)).toBe(" M shared.txt\n");
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("refuses when the named path has nothing staged, rather than committing a peer instead", async () => {
		// The failure this must not have: naming a path that is clean should never fall
		// back to "commit whatever is staged", which is the bare-commit hazard.
		const dir = await makeRepo();
		try {
			await write(dir, "peer.txt", "peer row\n");
			await run(["add", "peer.txt"], dir);

			const before = await run(["rev-parse", "HEAD"], dir);
			await expect(commitStagedPaths(["seed.txt"], "should not happen", { cwd: dir })).rejects.toThrow(
				/nothing is staged for seed\.txt/,
			);
			// The peer's staged row is untouched by the refusal.
			expect(await run(["rev-parse", "HEAD"], dir)).toBe(before);
			expect(await run(["diff", "--cached", "--name-only"], dir)).toBe("peer.txt");
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("refuses when the staged content is identical to what HEAD already has", async () => {
		// Staging a file with no change to it leaves nothing to commit. Saying "nothing is
		// staged" is the accurate report, and it matters that this is a refusal rather
		// than an empty commit — an empty commit on a shared branch reads as a mistake.
		const dir = await makeRepo();
		try {
			await write(dir, "seed.txt", "seed\n");
			await run(["add", "seed.txt"], dir);

			await expect(commitStagedPaths(["seed.txt"], "nothing changed", { cwd: dir })).rejects.toThrow(
				/nothing is staged for seed\.txt/,
			);
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("--dry-run reports the same scope and writes nothing", async () => {
		const dir = await makeRepo();
		try {
			await write(dir, "mine.txt", "mine v2\n");
			await run(["add", "mine.txt"], dir);
			await write(dir, "peer.txt", "peer row\n");
			await run(["add", "peer.txt"], dir);
			const before = await run(["rev-parse", "HEAD"], dir);

			const preview = await commitStagedPaths(["mine.txt"], "", { cwd: dir, dryRun: true });

			expect(preview.wroteCommit).toBe(false);
			expect(preview.committed).toEqual(["mine.txt"]);
			expect(preview.commit).toBe("");
			// A dry run that moved the ref, or consumed the index, would make the preview
			// a second way to lose a peer's work.
			expect(await run(["rev-parse", "HEAD"], dir)).toBe(before);
			expect((await run(["diff", "--cached", "--name-only"], dir)).split("\n").sort()).toEqual([
				"mine.txt",
				"peer.txt",
			]);
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("commits several named paths together, still excluding everyone else's", async () => {
		const dir = await makeRepo();
		try {
			for (const name of ["one.txt", "two.txt"]) await write(dir, name, `${name} body\n`);
			await run(["add", "one.txt", "two.txt"], dir);
			await write(dir, "peer.txt", "peer row\n");
			await run(["add", "peer.txt"], dir);

			const result = await commitStagedPaths(["one.txt", "two.txt"], "two files", { cwd: dir });

			expect([...result.committed].sort()).toEqual(["one.txt", "two.txt"]);
			const inCommit = (await run(["show", "--name-only", "--format=", result.commit], dir)).split("\n").sort();
			expect(inCommit).toEqual(["one.txt", "two.txt"]);
			expect(await run(["diff", "--cached", "--name-only"], dir)).toBe("peer.txt");
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("commits a staged deletion instead of resurrecting the file", async () => {
		// A deletion leaves NO index entry — `git rm` removes the row — so a tool that
		// enumerates staged entries cannot see one. The tree is built with `read-tree
		// HEAD`, which puts the file back, so the commit lands resurrecting a file the
		// caller deleted while reporting only the paths it did commit. Deletions are not
		// a rare shape here: this tree's last 200 commits delete 59 tracked source files.
		const dir = await makeRepo();
		try {
			await write(dir, "keep.txt", "keep v1\n");
			await write(dir, "gone.txt", "should not survive\n");
			await run(["add", "keep.txt", "gone.txt"], dir);
			await run(["commit", "-q", "-m", "add both"], dir);

			await write(dir, "keep.txt", "keep v2\n");
			await run(["add", "keep.txt"], dir);
			await run(["rm", "-q", "gone.txt"], dir);

			const result = await commitStagedPaths(["keep.txt", "gone.txt"], "modify and delete", { cwd: dir });

			// The deletion is reported as committed — it is part of what the caller staged.
			expect([...result.committed].sort()).toEqual(["gone.txt", "keep.txt"]);
			const inHead = (await run(["ls-tree", "--name-only", "-r", "HEAD"], dir)).split("\n").sort();
			expect(inHead).toEqual(["keep.txt", "seed.txt"]);
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("treats a re-added file as a modification, not a deletion", async () => {
		// The neighbour of the deletion shape, and the one a deletion-blind fix gets
		// wrong in the opposite direction: `git rm` then `git add` leaves the index WITH
		// an entry, so the path must commit as a modification carrying the re-added bytes.
		// Reading it as a deletion would drop a file the caller still has.
		const dir = await makeRepo();
		try {
			await write(dir, "back.txt", "original\n");
			await run(["add", "back.txt"], dir);
			await run(["commit", "-q", "-m", "add back"], dir);

			await run(["rm", "-q", "back.txt"], dir);
			await write(dir, "back.txt", "re-added v2\n");
			await run(["add", "back.txt"], dir);

			const result = await commitStagedPaths(["back.txt"], "rm then re-add", { cwd: dir });

			expect(result.committed).toEqual(["back.txt"]);
			expect(await run(["ls-tree", "--name-only", "HEAD"], dir)).toContain("back.txt");
			expect(await run(["show", "HEAD:back.txt"], dir)).toBe("re-added v2");
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});

	it("commits a deletion that is the only staged change, rather than reporting nothing staged", async () => {
		// The single-deletion shape reaches the emptiness check first, so it is a separate
		// failure: the tool reported "nothing is staged" for a path whose only change was
		// to stop existing, and told the caller to stage lines for a file that is gone.
		const dir = await makeRepo();
		try {
			await write(dir, "gone.txt", "should not survive\n");
			await run(["add", "gone.txt"], dir);
			await run(["commit", "-q", "-m", "add gone"], dir);
			await run(["rm", "-q", "gone.txt"], dir);

			const result = await commitStagedPaths(["gone.txt"], "delete only", { cwd: dir });

			expect(result.wroteCommit).toBe(true);
			expect(result.committed).toEqual(["gone.txt"]);
			expect(await run(["ls-tree", "--name-only", "-r", "HEAD"], dir)).toBe("seed.txt");
		} finally {
			await fs.promises.rm(dir, { force: true, recursive: true });
		}
	});
});

describe("parseArgs", () => {
	it("separates paths, message and the dry-run flag in any order", () => {
		expect(parseArgs(["a.txt", "-m", "msg", "b.txt"])).toEqual({
			files: ["a.txt", "b.txt"],
			message: "msg",
			dryRun: false,
		});
		expect(parseArgs(["--dry-run", "a.txt"])).toEqual({ files: ["a.txt"], message: "", dryRun: true });
	});

	it("refuses an empty path list, and an empty message outside a dry run", () => {
		// Both are refusals rather than defaults: an empty commit and a commit with no
		// paths are the two shapes that silently take someone else's work.
		expect(() => parseArgs(["-m", "msg"])).toThrow(/name at least one path/);
		expect(() => parseArgs(["a.txt"])).toThrow(/no commit message/);
		// A dry run needs no message, because it writes nothing.
		expect(parseArgs(["--dry-run", "a.txt"]).message).toBe("");
	});

	it("rejects an unknown flag instead of treating it as a path", () => {
		expect(() => parseArgs(["--amend", "a.txt"])).toThrow(/unknown flag --amend/);
	});
});
