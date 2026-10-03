import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vcs from "@oh-my-pi/pi-natives/vcs";
import { removeWithRetries } from "@oh-my-pi/pi-utils";
import { resolveStagedFiles } from "../src/commit/agentic/index";
import { createCommitTools } from "../src/commit/agentic/tools";

const tempDirs: string[] = [];

async function mkTempDir(prefix: string): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

async function runGit(cwd: string, args: string[]): Promise<string> {
	const env = { ...process.env, HOME: cwd, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" };
	const proc = Bun.spawn(["git", "-C", cwd, ...args], { env, stdout: "pipe", stderr: "pipe" });
	const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
	if (code !== 0) {
		const stderr = await new Response(proc.stderr).text();
		throw new Error(`git ${args.join(" ")} failed (${code}): ${stderr}\n${out}`);
	}
	return out;
}

/** The observable under test: what git itself reports is staged. */
async function stagedPaths(cwd: string): Promise<string[]> {
	const out = await runGit(cwd, ["diff", "--cached", "--name-only"]);
	return out.split("\n").filter(line => line.trim() !== "");
}

/**
 * A repo holding one committed file and one UNSTAGED file, so the index starts
 * empty and the "nothing is staged" branch is the one under test.
 */
async function repoWithUnstagedFile(prefix: string): Promise<string> {
	const dir = await mkTempDir(prefix);
	await runGit(dir, ["init", "-q", "-b", "main"]);
	await runGit(dir, ["config", "user.email", "test@example.com"]);
	await runGit(dir, ["config", "user.name", "Test"]);
	await fs.writeFile(path.join(dir, "committed.txt"), "seed\n");
	await runGit(dir, ["add", "."]);
	await runGit(dir, ["commit", "-q", "-m", "seed"]);
	await fs.writeFile(path.join(dir, "uncommitted.txt"), "work in progress\n");
	if ((await stagedPaths(dir)).length !== 0) {
		throw new Error("fixture precondition failed: the index must start empty");
	}
	return dir;
}

describe("resolveStagedFiles honours --dry-run", () => {
	afterEach(async () => {
		while (tempDirs.length > 0) {
			const dir = tempDirs.pop()!;
			await removeWithRetries(dir);
		}
	});

	// CONTROL. Without this row the row below proves nothing: a measurement that
	// cannot tell "declined to stage" apart from "staged nothing" would pass it.
	it("stages the whole tree when it is not a dry run", async () => {
		const dir = await repoWithUnstagedFile("commit-staged-control-");

		const staged = await resolveStagedFiles(vcs.requireGit(dir), false);

		expect(staged).toEqual(["uncommitted.txt"]);
		expect(await stagedPaths(dir)).toEqual(["uncommitted.txt"]);
	});

	it("leaves the index empty under a dry run", async () => {
		const dir = await repoWithUnstagedFile("commit-staged-dry-");

		// The call itself is the trigger; the index is the contract. `--dry-run`
		// reports, it does not stage.
		await resolveStagedFiles(vcs.requireGit(dir), true);

		expect(await stagedPaths(dir)).toEqual([]);
	});

	// A dry run that returned nothing would leave the caller printing "No changes
	// to commit" on a dirty tree — one wrong answer traded for its opposite. It
	// must report what a real run WOULD stage, including files git has never
	// tracked: `git add -A` takes untracked files, and gix's diff options have no
	// untracked mode, so the report has to come from porcelain status.
	it("reports what a real run would stage, untracked files included", async () => {
		const dir = await repoWithUnstagedFile("commit-staged-dry-report-");

		const reported = await resolveStagedFiles(vcs.requireGit(dir), true);

		expect(reported).toContain("uncommitted.txt");
		// Still nothing staged: reporting and staging are different acts.
		expect(await stagedPaths(dir)).toEqual([]);
	});

	// Git permits a newline in a filename. Splitting the line-terminated porcelain
	// on "\n" cuts one path into two fragments, each of which matches nothing.
	it("reports a filename containing a newline as one intact path", async () => {
		const dir = await repoWithUnstagedFile("commit-staged-dry-newline-");
		await fs.writeFile(path.join(dir, "weird\nnewline.txt"), "x\n");

		const reported = await resolveStagedFiles(vcs.requireGit(dir), true);

		expect(reported).toContain("weird\nnewline.txt");
		// The two halves a line-split would have produced must not appear.
		expect(reported).not.toContain("weird");
		expect(reported).not.toContain("newline.txt");
		expect(await stagedPaths(dir)).toEqual([]);
	});

	it("leaves an already-populated index exactly as it found it under a dry run", async () => {
		const dir = await repoWithUnstagedFile("commit-staged-dry-populated-");
		await runGit(dir, ["add", "uncommitted.txt"]);

		const staged = await resolveStagedFiles(vcs.requireGit(dir), true);

		expect(staged).toEqual(["uncommitted.txt"]);
		expect(await stagedPaths(dir)).toEqual(["uncommitted.txt"]);
	});

	// The agent runs on tools of its own, and `restrictToolNames` locks the session to
	// exactly those, so the built-in toolset is unreachable. That makes the dry-run
	// contract hold through the agent too — but only while every tool here is
	// read-only. `dryRun` is not plumbed into the session, so a tool that staged,
	// committed or unstaged would mutate the index during a preview and NOTHING in
	// this command would report it: the next bare `git commit` would sweep the result
	// under someone else's message.
	//
	// If this row goes red, a tool was ADDED or REMOVED. Do not widen the list to make
	// it pass — decide first whether the new tool can write.
	it("gives the commit agent only read-and-propose tools, none able to touch the index", async () => {
		const dir = await repoWithUnstagedFile("commit-tool-surface-");
		const options = {
			cwd: dir,
			authStorage: {} as never,
			modelRegistry: {} as never,
			settings: {} as never,
			spawns: "",
			state: {} as never,
			changelogTargets: [] as string[],
		};

		expect(
			createCommitTools(options)
				.map(tool => tool.name)
				.sort(),
		).toEqual([
			"analyze_files",
			"git_file_diff",
			"git_hunk",
			"git_overview",
			"propose_changelog",
			"propose_commit",
			"recent_commits",
			"split_commit",
		]);
		// The one tool that is conditionally absent; a count that silently drops it
		// would still satisfy the list above if it were ever renamed into another entry.
		expect(createCommitTools({ ...options, enableAnalyzeFiles: false }).map(tool => tool.name)).toHaveLength(7);
	});
});
