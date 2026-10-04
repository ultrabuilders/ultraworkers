/**
 * CLI handler for `ultraworkers worktree` — list and clean up agent-managed worktrees.
 *
 * Layout under the worktrees root (`getWorktreesDir()`):
 *
 *   - **PR-checkout worktrees** (`tools/gh.ts`): a regular git worktree dir
 *     containing a `.git` *file* that points back at
 *     `<parent-repo>/.git/worktrees/<name>/`.
 *   - **Task-isolation dirs** (`task/worktree.ts`): a wrapper dir with a
 *     compact `m` subdir mounted/cloned by `natives.isoStart`. Legacy `merged`
 *     subdirs are still recognized. `ensureIsolation` writes an ownership
 *     marker naming the live ultraworkers process; a
 *     sandbox whose owner is still running is reported `live` and never
 *     removed without `--all`, so `clear` reclaims only crashed leftovers.
 *
 * Legacy entries from before the encoding change keep working because git still
 * tracks them by branch name. This command exists to GC them on demand.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as natives from "@oh-my-pi/pi-natives";
import * as vcs from "@oh-my-pi/pi-natives/vcs";
import { getWorktreesDir, isEnoent } from "@oh-my-pi/pi-utils";
import chalk from "@oh-my-pi/pi-utils/chalk";
import { Settings } from "../config/settings";
import { hasLiveIsolationOwner, ISOLATION_OWNER_FILE, readRetainedMountBackend } from "../task/isolation-ownership";
import { formatIsolationBackend, parseIsolationBackend } from "../task/worktree";

import { cfgIsolationBackend, cfgWorktreeClone } from "../task/settings";

type WorktreeKind = "pr-checkout" | "task-isolation" | "empty" | "stray" | "unmanaged";

const TASK_ISOLATION_MOUNT_DIRS = ["m", "merged"] as const;

export interface WorktreeEntry {
	/** Absolute path to the worktree dir (or stray container) under the worktrees root. */
	path: string;
	/** Classification of what we found on disk. */
	kind: WorktreeKind;
	/** Parent repo root, when this is a registered git worktree. */
	parentRepo?: string;
	/** Branch name extracted from the parent's tracking file, when available. */
	branch?: string;
	/** When set, the entry is unhealthy and `ultraworkers worktree clear` will remove it. */
	orphanReason?: string;
	/**
	 * Git tracks this worktree but it lives outside {@link getWorktreesDir}, so the
	 * managed-root scan cannot classify it and `clear` will not touch it. Reported by
	 * `list` because a garbage collector that cannot see most of the garbage reports
	 * a clean sweep.
	 */
	unmanaged?: boolean;
}

/**
 * What `add` created — returned, and emitted under `--json`, so a script learns
 * the path it just asked for instead of parsing git's prose.
 */
export interface AddWorktreeResult {
	/** Absolute path to the worktree that now exists. */
	path: string;
	/** The ref that was checked out. */
	ref: string;
	/** Short SHA of the commit now at HEAD. */
	sha: string;
	/** True when HEAD is detached rather than on a branch. */
	detached: boolean;
}

export interface AddWorktreeOptions {
	cwd?: string;
	path: string;
	commit?: string;
	branch?: string;
	forceBranch?: string;
	detach: boolean;
	quiet: boolean;
	/**
	 * Emit the created worktree as JSON on stdout, and nothing else.
	 *
	 * The parser accepts `--json` for every action, so `worktree add --json` used to
	 * parse and then print git prose: a script asking where its worktree landed had
	 * nowhere to read the answer. `quiet` does not suppress this — an explicit
	 * machine-readable request is the output, not decoration.
	 */
	json: boolean;
}

export interface ListWorktreesOptions {
	json: boolean;
	/** Repository to report against. Defaults to the process cwd. */
	cwd?: string;
}

export interface ClearWorktreesOptions {
	/** Remove every entry, including live PR-checkout worktrees. */
	all: boolean;
	/** Print what would be removed without touching the filesystem. */
	dryRun: boolean;
	json: boolean;
	/** Repository to report against. Defaults to the process cwd. */
	cwd?: string;
}
/**
 * Run native teardown on a retained workspace before recursive removal.
 * Recursive `rm` through a live overlay mount destroys the preserved upper
 * layer entry by entry and then fails on the mountpoint itself (likewise a
 * Btrfs subvolume root, removable only via subvolume delete) — and mounts
 * survive the owning session, so the reclaim path (unlike teardown) cannot
 * rely on the creator to stop them. Side-effect-free without a retained-
 * backend sidecar (returns false); throws when the sidecar cannot be read
 * or teardown itself fails, so the caller skips removal instead of
 * traversing a possibly live mount — the entry is then reported failed
 * with the error, data intact.
 */
export async function stopRetainedMount(dir: string): Promise<boolean> {
	const backend = await readRetainedMountBackend(dir);
	if (backend === undefined) return false;
	for (const name of TASK_ISOLATION_MOUNT_DIRS) {
		const candidate = path.join(dir, name);
		if (
			await fs
				.stat(candidate)
				.then(stat => stat.isDirectory())
				.catch(() => false)
		) {
			await natives.isoStop(backend, candidate);
			return true;
		}
	}
	return false;
}

export async function addWorktree(options: AddWorktreeOptions): Promise<AddWorktreeResult> {
	if (options.branch && options.forceBranch) {
		throw new Error("fatal: options '-b' and '-B' cannot be used together");
	}
	const cwd = path.resolve(options.cwd ?? process.cwd());
	const repository = vcs.requireGit(cwd);
	const worktreePath = path.resolve(cwd, options.path);
	try {
		const stat = await fs.stat(worktreePath);
		const nonEmpty = !stat.isDirectory() || (await fs.readdir(worktreePath)).length > 0;
		if (nonEmpty) throw new Error(`fatal: '${options.path}' already exists`);
	} catch (error) {
		if (!isEnoent(error)) throw error;
	}

	const settings = await Settings.init({ cwd });
	let ref: string;
	let detach = false;
	let createdBranch: string | undefined;
	if (options.branch || options.forceBranch) {
		const branch = options.branch ?? options.forceBranch;
		if (!branch) throw new Error("branch name is required");
		await repository.createBranch(branch, options.commit ?? "HEAD", Boolean(options.forceBranch));
		ref = branch;
		createdBranch = branch;
	} else if (options.detach) {
		ref = options.commit ?? "HEAD";
		detach = true;
	} else if (options.commit) {
		ref = options.commit;
		detach = !(await repository.refExists(`refs/heads/${options.commit}`));
	} else {
		const branch = path.basename(worktreePath);
		if (!(await repository.refExists(`refs/heads/${branch}`))) {
			await repository.createBranch(branch, "HEAD", false);
			createdBranch = branch;
		}
		ref = branch;
	}

	const commit = await repository.commitDetails(ref);
	const shortSha = commit.sha.slice(0, 7);
	const subject = commit.message.split("\n", 1)[0];
	if (!options.quiet && !options.json) {
		const preparation = createdBranch
			? `new branch '${createdBranch}'`
			: detach
				? `detached HEAD ${shortSha}`
				: `checking out '${ref}'`;
		console.log(`Preparing worktree (${preparation})`);
	}
	const result = await repository.worktreeAdd(worktreePath, ref, {
		detach,
		clone: cfgWorktreeClone.get(settings),
		backend: parseIsolationBackend(cfgIsolationBackend.get(settings)),
	});
	if (options.json) {
		console.log(JSON.stringify({ path: worktreePath, ref, sha: shortSha, detached: detach }, null, 2));
	} else if (!options.quiet) {
		console.log(`HEAD is now at ${shortSha} ${subject}`);
		if (result.clonedWith != null) {
			console.log(`Cloned from ${repository.info().repoRoot} via ${formatIsolationBackend(result.clonedWith)}`);
		}
		// The path is the one fact `add` produces that the caller cannot derive:
		// `../feature` is relative to the cwd the caller passed, not to wherever the
		// worktree landed. Without this line a script has to re-run `list` to learn
		// what it just made.
		console.log(`Worktree ready at ${worktreePath}`);
	}
	if (result.cloneError) {
		console.error(chalk.dim(`warning: worktree clone fell back to plain checkout: ${result.cloneError}`));
	}
	return { path: worktreePath, ref, sha: shortSha, detached: detach };
}

/**
 * Worktrees git tracks that the managed-root scan cannot see.
 *
 * {@link scanWorktrees} enumerates {@link getWorktreesDir}, so a worktree created
 * anywhere else — `git worktree add` by hand, a task runner, an older install — is
 * invisible to `list` and unreachable by `clear`. On this repository that was 14 of 15,
 * and six of the fifteen were dead registrations the collector could not touch.
 *
 * The repository's own root is excluded: it is the main worktree, not a stray, and
 * listing it would report the directory you are standing in as something to clean up.
 */
/**
 * Compare paths the way the filesystem sees them.
 *
 * Git reports realpaths; a managed scan reports whatever `getWorktreesDir()` spelled,
 * and on macOS those differ for anything under `/var` (`/private/var`). Comparing the
 * raw strings makes an identical directory look like two, which would double-report
 * every managed worktree on that platform.
 */
async function canonical(p: string): Promise<string> {
	try {
		return await fs.realpath(p);
	} catch {
		return path.resolve(p);
	}
}

async function listUnmanagedWorktrees(known: readonly WorktreeEntry[], cwd: string): Promise<WorktreeEntry[]> {
	const repo = vcs.git(cwd);
	if (!repo) return [];
	let tracked: Awaited<ReturnType<typeof repo.worktrees>>;
	try {
		tracked = await repo.worktrees();
	} catch {
		// No repository, or git refused. The managed scan is still the truth about what
		// is on disk; reporting "git knows of nothing" here would be its own kind of lie.
		return [];
	}
	const seen = new Set(await Promise.all(known.map(e => canonical(e.path))));
	const repoRoot = await canonical(repo.info().repoRoot);
	const out: WorktreeEntry[] = [];
	for (const entry of tracked) {
		const resolved = path.resolve(entry.path);
		const canonicalPath = await canonical(resolved);
		if (canonicalPath === repoRoot || seen.has(canonicalPath)) continue;
		const present = await fs
			.stat(resolved)
			.then(s => s.isDirectory())
			.catch(() => false);
		out.push({
			path: resolved,
			kind: "unmanaged",
			unmanaged: true,
			...(entry.branch ? { branch: entry.branch.replace(/^refs\/heads\//, "") } : {}),
			// A registration whose directory is gone is exactly what `git worktree prune`
			// exists to clear. The managed `clear` cannot reach it, so reporting it as
			// merely-present would understate the mess.
			...(present ? {} : { orphanReason: "directory is gone; git still holds the registration" }),
		});
	}
	return out;
}

export async function listWorktrees(options: ListWorktreesOptions): Promise<void> {
	const managed = await scanWorktrees();
	const entries = [...managed, ...(await listUnmanagedWorktrees(managed, options.cwd ?? process.cwd()))];
	if (options.json) {
		console.log(JSON.stringify(entries, null, 2));
		return;
	}
	if (entries.length === 0) {
		console.log(chalk.dim(`No agent-managed worktrees found under ${getWorktreesDir()}.`));
		return;
	}
	let live = 0;
	let orphaned = 0;
	for (const entry of entries) {
		const tag = entry.orphanReason ? chalk.yellow("orphaned") : chalk.green("live    ");
		const detail = formatEntryDetail(entry);
		console.log(`${tag}  ${entry.path}`);
		if (detail) console.log(`          ${chalk.dim(detail)}`);
		if (entry.orphanReason) orphaned += 1;
		else live += 1;
	}
	console.log(chalk.dim(`\n${live} live · ${orphaned} orphaned · ${entries.length} total`));
}

export async function clearWorktrees(options: ClearWorktreesOptions): Promise<{ removed: number; failed: number }> {
	const entries = await scanWorktrees();
	// "all" means all of the managed root, which is not all of git. Saying so is the
	// difference between a collector that reports a clean sweep and one that reports
	// what it actually covered.
	const unreachable = await listUnmanagedWorktrees(entries, options.cwd ?? process.cwd());
	const unreachableNote =
		unreachable.length > 0
			? chalk.yellow(
					`${unreachable.length} worktree(s) git tracks live outside ${getWorktreesDir()} and were not touched — run \`git worktree prune\` for the dead ones`,
				)
			: undefined;
	const targets = options.all ? entries : entries.filter(entry => entry.orphanReason !== undefined);

	if (targets.length === 0) {
		if (options.json) {
			console.log(JSON.stringify({ removed: 0, kept: entries.length, unreachable: unreachable.length }));
		} else {
			console.log(chalk.dim(options.all ? "No worktrees to remove." : "No orphaned worktrees to remove."));
			if (unreachableNote) console.log(unreachableNote);
		}
		return { removed: 0, failed: 0 };
	}

	if (options.dryRun) {
		if (options.json) {
			console.log(
				JSON.stringify({ wouldRemove: targets.map(t => t.path), unreachable: unreachable.length }, null, 2),
			);
		} else {
			for (const target of targets) {
				console.log(`${chalk.yellow("would remove")}  ${target.path}`);
			}
			console.log(chalk.dim(`\n${targets.length} dir${targets.length === 1 ? "" : "s"} would be removed.`));
			if (unreachableNote) console.log(unreachableNote);
		}
		return { removed: 0, failed: 0 };
	}

	const results: { path: string; ok: boolean; error?: string }[] = [];
	const parentsToPrune = new Set<string>();
	for (const target of targets) {
		try {
			if (target.kind === "pr-checkout" && target.parentRepo && !target.orphanReason) {
				// Live worktree: ask git to remove it cleanly. If git refuses (locked,
				// dirty, etc.), fall back to fs.rm and rely on `worktree prune` to
				// clean the bookkeeping on the parent side.
				const removed = await vcs.git(target.parentRepo)?.worktreeRemove(target.path, true);
				if (!removed) {
					await fs.rm(target.path, { recursive: true, force: true });
					parentsToPrune.add(target.parentRepo);
				}
			} else {
				if (target.kind === "task-isolation") await stopRetainedMount(target.path);
				await fs.rm(target.path, { recursive: true, force: true });
				if (target.parentRepo) parentsToPrune.add(target.parentRepo);
			}
			results.push({ path: target.path, ok: true });
		} catch (err) {
			results.push({ path: target.path, ok: false, error: err instanceof Error ? err.message : String(err) });
		}
	}

	// Best-effort: drop stale entries from each affected parent's `.git/worktrees/`.
	for (const parent of parentsToPrune) {
		try {
			await vcs.requireGit(parent).worktreePrune();
		} catch {
			/* parent repo may already be gone or pruned — ignore */
		}
	}

	const succeeded = results.filter(r => r.ok).length;
	const failed = results.length - succeeded;

	if (options.json) {
		console.log(JSON.stringify({ removed: succeeded, failed, results, unreachable: unreachable.length }, null, 2));
		return { removed: succeeded, failed };
	}

	for (const result of results) {
		if (result.ok) {
			console.log(`${chalk.green("removed")}  ${result.path}`);
		} else {
			console.log(`${chalk.red("failed ")}  ${result.path}`);
			if (result.error) console.log(`          ${chalk.dim(result.error)}`);
		}
	}
	console.log(chalk.dim(`\n${succeeded} removed${failed > 0 ? ` · ${chalk.red(`${failed} failed`)}` : ""}`));
	if (unreachableNote) console.log(unreachableNote);
	return { removed: succeeded, failed };
}

// ───────────────────────────────────────────────────────────────────────────
// Scanner
// ───────────────────────────────────────────────────────────────────────────

async function scanWorktrees(): Promise<WorktreeEntry[]> {
	const root = getWorktreesDir();
	let topLevel: string[];
	try {
		topLevel = await fs.readdir(root);
	} catch (err) {
		if (isEnoent(err)) return [];
		throw err;
	}

	const entries: WorktreeEntry[] = [];
	for (const name of topLevel) {
		const dir = path.join(root, name);
		const stat = await fs.stat(dir).catch(() => null);
		if (!stat?.isDirectory()) continue;

		const direct = await classifyDir(dir);
		if (direct) {
			entries.push(direct);
			continue;
		}

		// Legacy nesting: <worktrees root>/<encoded-project>/<branch-or-id>
		let children: string[];
		try {
			children = await fs.readdir(dir);
		} catch {
			continue;
		}
		let nested = 0;
		for (const child of children) {
			const childDir = path.join(dir, child);
			const childStat = await fs.stat(childDir).catch(() => null);
			if (!childStat?.isDirectory()) continue;
			const childClassified = await classifyDir(childDir);
			if (childClassified) {
				entries.push(childClassified);
				nested += 1;
			}
		}
		if (nested === 0) {
			entries.push({
				path: dir,
				kind: children.length === 0 ? "empty" : "stray",
				orphanReason: children.length === 0 ? "empty directory" : "no recognizable worktree contents",
			});
		}
	}
	return entries;
}

async function classifyDir(dir: string): Promise<WorktreeEntry | null> {
	const gitEntry = path.join(dir, ".git");
	const gitStat = await fs.stat(gitEntry).catch(() => null);
	if (gitStat?.isFile()) {
		return classifyPrCheckout(dir, gitEntry);
	}
	// A task-isolation sandbox is identified by its ownership marker — written
	// before the backend materialises the mount — or by the `m`/`merged` mount
	// dir itself (legacy dirs and crashed pre-marker runs). Recognizing the
	// marker alone keeps an in-progress sandbox from being mistaken for a stray
	// during the window between marker creation and mount materialisation.
	let isIsolation = await Bun.file(path.join(dir, ISOLATION_OWNER_FILE)).exists();
	if (!isIsolation) {
		for (const mountDir of TASK_ISOLATION_MOUNT_DIRS) {
			const mountStat = await fs.stat(path.join(dir, mountDir)).catch(() => null);
			if (mountStat?.isDirectory()) {
				isIsolation = true;
				break;
			}
		}
	}
	if (!isIsolation) return null;
	const live = await hasLiveIsolationOwner(dir);
	return {
		path: dir,
		kind: "task-isolation",
		// Only after confirming no live owner is the "no live task" claim true.
		// A running subagent's sandbox stays live so `clear` won't delete it.
		orphanReason: live ? undefined : "task-isolation leftover (no live task owns it)",
	};
}

async function classifyPrCheckout(dir: string, gitEntry: string): Promise<WorktreeEntry> {
	let contents: string;
	try {
		contents = await fs.readFile(gitEntry, "utf8");
	} catch (err) {
		return {
			path: dir,
			kind: "pr-checkout",
			orphanReason: `cannot read .git file: ${err instanceof Error ? err.message : String(err)}`,
		};
	}
	const match = /^gitdir:\s*(.+?)\s*$/m.exec(contents);
	const parentGitDir = match?.[1];
	if (!parentGitDir) {
		return { path: dir, kind: "pr-checkout", orphanReason: "malformed .git file (no gitdir line)" };
	}
	// parentGitDir is `<parent-repo>/.git/worktrees/<name>`; back out the repo root.
	const parentRepo = path.dirname(path.dirname(path.dirname(parentGitDir)));
	const branch = await readWorktreeBranch(path.join(parentGitDir, "HEAD"));

	const parentDirStat = await fs.stat(parentGitDir).catch(() => null);
	if (!parentDirStat?.isDirectory()) {
		return {
			path: dir,
			kind: "pr-checkout",
			parentRepo,
			branch,
			orphanReason: "parent repo no longer tracks this worktree",
		};
	}
	const parentRepoStat = await fs.stat(parentRepo).catch(() => null);
	if (!parentRepoStat?.isDirectory()) {
		return {
			path: dir,
			kind: "pr-checkout",
			parentRepo,
			branch,
			orphanReason: "parent repo missing",
		};
	}
	return { path: dir, kind: "pr-checkout", parentRepo, branch };
}

async function readWorktreeBranch(headFile: string): Promise<string | undefined> {
	try {
		const head = (await fs.readFile(headFile, "utf8")).trim();
		const refMatch = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
		return refMatch?.[1];
	} catch {
		return undefined;
	}
}

function formatEntryDetail(entry: WorktreeEntry): string {
	const parts: string[] = [];
	if (entry.kind === "pr-checkout") {
		const repo = entry.parentRepo ? path.basename(entry.parentRepo) : "unknown repo";
		const branch = entry.branch ?? "unknown branch";
		parts.push(`${repo} · ${branch}`);
	} else if (entry.kind === "task-isolation") {
		parts.push("task-isolation sandbox");
	} else if (entry.kind === "empty") {
		parts.push("legacy project shell");
	} else if (entry.kind === "unmanaged") {
		parts.push("outside the managed worktrees root");
	} else {
		parts.push("unrecognized contents");
	}
	if (entry.orphanReason) parts.push(entry.orphanReason);
	return parts.join(" — ");
}
