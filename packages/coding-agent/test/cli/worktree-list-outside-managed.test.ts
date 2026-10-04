/**
 * `ultraworkers worktree list` and `clear` used to enumerate `getWorktreesDir()` and
 * nothing else, so every worktree git knew about that lived elsewhere was invisible to
 * both — and `clear --all`, a garbage collector, reported a clean sweep over a
 * directory that held a fraction of the garbage. On this repository that was 14 of 15
 * worktrees, six of them dead registrations.
 *
 * The two halves fail differently and both matter. Silence is a missing fact: nothing
 * tells you worktrees exist that the collector cannot reach. A wrong count is a false
 * fact: "1 total" while git holds three is a report that contradicts the tool it is
 * reporting on. The rows below cover both, plus the two ways a fix could over-correct
 * into its own kind of wrong.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { clearWorktrees, listWorktrees, type WorktreeEntry } from "@oh-my-pi/pi-coding-agent/cli/worktree-cli";
import { setWorktreesDir } from "@oh-my-pi/pi-utils";

async function git(args: string[], cwd: string): Promise<string> {
	const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	const [text, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	await proc.exited;
	if (proc.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${err}`);
	return text;
}

describe("worktree list against a repository whose worktrees live outside the managed root", () => {
	let base: string;
	let repo: string;
	let managed: string;
	let savedEnv: string | undefined;

	/** Capture the JSON `list --json` emits. */
	async function listed(): Promise<WorktreeEntry[]> {
		const lines: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
			lines.push(args.map(String).join(" "));
		});
		await listWorktrees({ json: true, cwd: repo });
		return JSON.parse(lines.join("\n")) as WorktreeEntry[];
	}

	async function clearDryRun(): Promise<{ unreachable?: number }> {
		const lines: string[] = [];
		vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
			lines.push(args.map(String).join(" "));
		});
		await clearWorktrees({ all: true, dryRun: true, json: true, cwd: repo });
		return JSON.parse(lines.join("\n")) as { unreachable?: number };
	}

	beforeEach(async () => {
		// Git reports realpaths; on macOS `os.tmpdir()` is under /var, which is a symlink
		// to /private/var. Spelling the fixtures with the raw path would make every
		// comparison below miss — and the "not listed" row would pass for the wrong reason.
		base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-wt-outside-")));
		repo = path.join(base, "repo");
		managed = path.join(base, "managed");
		await fs.mkdir(repo, { recursive: true });
		await fs.mkdir(managed, { recursive: true });
		await git(["init", "-q", "-b", "main"], repo);
		await git(["config", "user.email", "t@example.invalid"], repo);
		await git(["config", "user.name", "T"], repo);
		await Bun.write(path.join(repo, "README.md"), "x\n");
		await git(["add", "-A"], repo);
		await git(["commit", "-qm", "init"], repo);
		savedEnv = process.env.OMP_WORKTREE_DIR;
		delete process.env.OMP_WORKTREE_DIR;
		setWorktreesDir(managed);
	});

	afterEach(async () => {
		setWorktreesDir(undefined);
		if (savedEnv === undefined) delete process.env.OMP_WORKTREE_DIR;
		else process.env.OMP_WORKTREE_DIR = savedEnv;
		vi.restoreAllMocks();
		await fs.rm(base, { recursive: true, force: true });
	});

	it("lists a worktree that lives outside the managed root instead of omitting it", async () => {
		const outside = path.join(base, "outside-wt");
		await git(["worktree", "add", "-q", "-b", "side", outside], repo);

		const entries = await listed();
		const entry = entries.find(e => path.resolve(e.path) === path.resolve(outside));

		expect(entry).toBeDefined();
		expect(entry?.unmanaged).toBe(true);
		expect(entry?.branch).toBe("side");
	});

	it("does not report the repository's own root as an unmanaged worktree", async () => {
		// The over-correction: counting the main worktree would report the directory you
		// are standing in as garbage to collect, and `--all` would offer to delete it.
		const entries = await listed();

		expect(entries.some(e => path.resolve(e.path) === path.resolve(repo))).toBe(false);
	});

	it("marks a registration whose directory is gone as orphaned, not merely present", async () => {
		// The `prunable` case. Folding this into "present" would understate exactly the
		// mess `clear` exists to remove, and it is the state that survives for months
		// because nothing reports it.
		const dead = path.join(base, "dead-wt");
		await git(["worktree", "add", "-q", "-b", "gone", dead], repo);
		await fs.rm(dead, { recursive: true, force: true });

		const entries = await listed();
		const entry = entries.find(e => path.resolve(e.path) === path.resolve(dead));

		expect(entry).toBeDefined();
		expect(entry?.orphanReason).toBeString();
	});

	it("clear reports how many worktrees it could not reach", async () => {
		const outside = path.join(base, "outside-wt");
		await git(["worktree", "add", "-q", "-b", "side", outside], repo);

		const result = await clearDryRun();

		// Zero here is the bug: `--all` means all of the managed root, and saying so
		// plainly is the difference between a collector that reports clean and one that
		// reports what it covered.
		expect(result.unreachable).toBeGreaterThan(0);
	});
});
