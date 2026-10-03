/**
 * Commit exactly what is staged for the paths you name, and nothing else.
 *
 * `scripts/rename/stage-lines.ts` already solves the staging half of the shared-tree
 * problem: it writes only the bytes you produced straight into the index, so a peer's
 * concurrent edit to the same file cannot be swept in. What it cannot solve is the
 * commit. Once your rows are staged alongside a peer's, every ordinary commit verb
 * takes the peer's too:
 *
 *   git add <path>        the path's ENTIRE current content, including a peer's
 *                         in-flight edits to the same file
 *   git commit --only     narrower, but still the whole current file — it differs
 *                         from `git add` in scope, not in kind
 *   git commit (bare)     the whole index, including rows another session staged
 *
 * Measured on this tree: a bare commit carried a peer's staged rows under my message,
 * and `--only` picked up a blank line another session had added to the same TSV. The
 * content stayed correct both times; the attribution did not, and a wrong message on a
 * shared branch cannot be repaired with `git commit --amend` — that rewrites whatever
 * is at HEAD, which on this tree is frequently a peer's commit that landed seconds ago.
 *
 * This builds the commit from an index of its own: HEAD, plus only the staged entries
 * for the named paths. The caller's real index is never read for content and never
 * written, so every other session's staged rows survive the commit untouched — still
 * staged, still theirs.
 *
 * Usage:
 *   bun scripts/commit-scoped.ts <file>... -m "<message>"      # commit
 *   bun scripts/commit-scoped.ts <file>... --dry-run          # report, write nothing
 *
 * ## Why not `git commit` with a temporary index
 *
 * Running `GIT_INDEX_FILE=tmp git commit` (no pathspec) would run the pre-commit hooks
 * and would be simpler. It is unsafe here. The tree has to be built from a HEAD that was
 * current when we read it, and a bare `git commit` resolves its parent against whatever
 * HEAD is at the moment it runs. On a tree where peers commit continuously, that window
 * is real: the commit lands on top of a peer's work and the tree we built from the older
 * HEAD silently reverts it. Losing a peer's commit is worse than skipping a hook.
 *
 * So the tree is written explicitly and the ref is moved with a compare-and-swap that
 * names the HEAD it was built from. If a peer committed in the meantime, the swap fails
 * and nothing is written.
 *
 * ## What this does not run
 *
 * `git commit-tree` does not run pre-commit hooks, and there is no flag here that claims
 * otherwise. That is a deliberate trade, not an oversight: CI still runs them, and a
 * skipped local hook is recoverable where a lost peer commit is not. Run the checks you
 * want first (`bun run check:ts`, `oxfmt --check`, the tests) and then commit.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** One entry as the index records it: mode, blob, stage, path. */
interface IndexEntry {
	readonly mode: string;
	readonly blob: string;
	readonly file: string;
}

/** What a scoped commit did, or would do. */
export interface ScopedCommitResult {
	/** The commit sha. Meaningless unless `committed` is true. */
	readonly commit: string;
	/** The HEAD the tree was built from; the swap names it so a racing commit cannot be lost. */
	readonly base: string;
	/** The tree the commit would contain. */
	readonly tree: string;
	/** Paths whose staged content became the commit. */
	readonly committed: readonly string[];
	/** False for `--dry-run`, where the ref was never moved. */
	readonly wroteCommit: boolean;
}

/** Run git with `env` applied, returning stdout; throw with git's stderr on failure. */
async function git(args: string[], cwd: string, env?: Record<string, string>): Promise<string> {
	const proc = Bun.spawn(["git", ...args], {
		cwd,
		env: env ? { ...process.env, ...env } : process.env,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0) throw new Error(`git ${args[0]} exited ${code}: ${stderr.trim()}`);
	return stdout;
}

/** Run git, returning trimmed stdout, or null when git reports failure. */
async function gitOrNull(args: string[], cwd: string, env?: Record<string, string>): Promise<string | null> {
	try {
		return (await git(args, cwd, env)).trim();
	} catch {
		return null;
	}
}

/** Run git and report only whether it succeeded. */
async function gitSucceeds(args: string[], cwd: string, env?: Record<string, string>): Promise<boolean> {
	return (await gitOrNull(args, cwd, env)) !== null;
}

/**
 * The staged entries for `files`, in the index's own order.
 *
 * Read from the caller's real index — the one place the real index is consulted, and only
 * for blob ids. The bytes come from git's object store, so a working-tree edit made after
 * staging cannot influence what gets committed.
 */
async function stagedEntries(files: string[], cwd: string): Promise<IndexEntry[]> {
	const out = await git(["ls-files", "-s", "--", ...files], cwd);
	const entries: IndexEntry[] = [];
	for (const line of out.split("\n")) {
		if (line.trim() === "") continue;
		// `100644 <blob> 0\t<path>` — the tab separates stage from path, and a path may
		// itself contain spaces, so the split is on the first tab and never on spaces.
		const tab = line.indexOf("\t");
		if (tab < 0) throw new Error(`unparsable ls-files -s line: ${line}`);
		const meta = line.slice(0, tab).split(/\s+/);
		const mode = meta[0];
		const blob = meta[1];
		if (!mode || !blob) throw new Error(`unparsable ls-files -s line: ${line}`);
		entries.push({ mode, blob, file: line.slice(tab + 1) });
	}
	return entries;
}

/**
 * The paths among `files` that HEAD records and the index no longer does.
 *
 * A deletion has no index entry: `git rm` removes the row, so `ls-files -s` cannot
 * report one and the deleted path is indistinguishable from a path that was never
 * touched. Enumerating only staged entries therefore drops the deletion — the tree is
 * built with `read-tree HEAD`, which puts the file BACK, and the commit lands
 * reporting only the paths it did commit.
 *
 * Subtracting the two sets is what makes this correct, because neither alone is the
 * answer: `ls-files -s` also lists CLEAN tracked paths (the caller filters those out
 * by comparing blobs), and `ls-tree HEAD` also lists untouched ones. Only a path in
 * HEAD and absent from the index was actually removed.
 */
async function deletedPaths(head: string, files: string[], indexed: readonly string[], cwd: string): Promise<string[]> {
	const inHead = await git(["ls-tree", "--name-only", "-r", head, "--", ...files], cwd);
	const present = new Set(indexed);
	return inHead.split("\n").filter(line => line.trim() !== "" && !present.has(line));
}

/** Parse argv for the CLI wrapper. Kept separate so the shapes are testable. */
export function parseArgs(argv: string[]): { files: string[]; message: string; dryRun: boolean } {
	let dryRun = false;
	let message = "";
	const files: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		if (arg === "--dry-run") {
			dryRun = true;
		} else if (arg === "-m" || arg === "--message") {
			message = argv[++i] ?? "";
		} else if (arg === "--message-file") {
			const file = argv[++i];
			if (!file) throw new Error("--message-file needs a path");
			message = fs.readFileSync(file, "utf8");
		} else if (arg.startsWith("-")) {
			throw new Error(`unknown flag ${arg}`);
		} else {
			files.push(arg);
		}
	}
	if (files.length === 0) {
		throw new Error(
			'refusing to commit nothing: name at least one path (usage: commit-scoped.ts <file>... -m "<message>")',
		);
	}
	if (!dryRun && message.trim() === "") {
		throw new Error('no commit message: pass -m "<message>" or --message-file <path>');
	}
	return { files, message, dryRun };
}

/**
 * Commit the staged content of `files`, leaving every other staged entry in place.
 *
 * Refuses rather than guessing when there is nothing staged for the named paths, or when
 * the resulting tree would equal HEAD: an empty commit on a shared branch is
 * indistinguishable from a mistake, and `git commit --allow-empty` is one flag away for
 * anyone who means one.
 */
export async function commitStagedPaths(
	files: string[],
	message: string,
	options: { cwd?: string; dryRun?: boolean } = {},
): Promise<ScopedCommitResult> {
	const cwd = options.cwd ?? process.cwd();
	const dryRun = options.dryRun ?? false;
	if (files.length === 0) throw new Error("refusing to commit nothing: name at least one path");
	if (!dryRun && message.trim() === "") throw new Error("refusing to commit an empty message");

	const head = (await git(["rev-parse", "HEAD"], cwd)).trim();

	const allEntries = await stagedEntries(files, cwd);
	// `ls-files -s` lists every TRACKED path, not only the staged ones, so a clean file
	// shows up here carrying HEAD's own blob. Keeping it would make "nothing is staged"
	// unreachable for any tracked path — the caller would fall through to the
	// empty-commit check and be told the wrong thing. Compare each blob against the one
	// HEAD records and keep only what actually differs.
	const entries: IndexEntry[] = [];
	for (const entry of allEntries) {
		const headBlob = (await gitOrNull(["rev-parse", `${head}:${entry.file}`], cwd)) ?? "";
		if (headBlob === entry.blob) continue;
		entries.push(entry);
	}
	// Resolved BEFORE the emptiness check, because a deletion produces no entry and
	// would otherwise read as "nothing is staged" — telling the caller to stage lines
	// for a file that no longer exists.
	const deleted = await deletedPaths(
		head,
		files,
		allEntries.map(e => e.file),
		cwd,
	);
	if (entries.length === 0 && deleted.length === 0) {
		throw new Error(
			`nothing is staged for ${files.join(", ")} — stage the lines first (scripts/rename/stage-lines.ts)`,
		);
	}

	const scratchDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "commit-scoped-"));
	const indexFile = path.join(scratchDir, "index");
	const scopedEnv = { GIT_INDEX_FILE: indexFile };
	try {
		// Base the temporary index on HEAD, so the commit is "HEAD plus my staged paths"
		// rather than "whatever else happens to be staged right now".
		await git(["read-tree", head], cwd, scopedEnv);
		for (const entry of entries) {
			await git(
				["update-index", "--add", "--cacheinfo", `${entry.mode},${entry.blob},${entry.file}`],
				cwd,
				scopedEnv,
			);
		}
		// `read-tree` above restored every deleted path, so each one has to be removed
		// again or the commit would resurrect the file the caller just deleted.
		for (const file of deleted) {
			await git(["update-index", "--force-remove", "--", file], cwd, scopedEnv);
		}

		// Every entry above differs from the blob HEAD records for its path, and each
		// deletion removes a path HEAD has, so this tree cannot equal HEAD's and no
		// separate empty-commit check is needed here.
		const tree = (await git(["write-tree"], cwd, scopedEnv)).trim();
		const committed = [...entries.map(e => e.file), ...deleted];

		if (dryRun) {
			return { commit: "", base: head, tree, committed, wroteCommit: false };
		}

		const messageFile = path.join(scratchDir, "message");
		await fs.promises.writeFile(messageFile, message.endsWith("\n") ? message : `${message}\n`, "utf8");
		const commit = (await git(["commit-tree", tree, "-p", head, "-F", messageFile], cwd)).trim();

		// Compare-and-swap against the HEAD the tree was built from. A peer who committed
		// in between moved HEAD, this fails, and nothing is written — rather than silently
		// reverting their commit under ours.
		const moved = await gitSucceeds(["update-ref", "HEAD", commit, head], cwd);
		if (!moved) {
			throw new Error(
				`HEAD moved while the commit was being built (expected ${head.slice(0, 9)}); ` +
					"nothing was written. Re-run against the new HEAD.",
			);
		}

		return { commit, base: head, tree, committed, wroteCommit: true };
	} finally {
		await fs.promises.rm(scratchDir, { force: true, recursive: true });
	}
}

if (import.meta.main) {
	try {
		const { files, message, dryRun } = parseArgs(process.argv.slice(2));
		const result = await commitStagedPaths(files, message, { dryRun });
		const verb = dryRun ? "would commit" : "committed";
		process.stdout.write(
			`${verb} ${result.committed.join(", ")}` +
				(result.wroteCommit ? ` as ${result.commit.slice(0, 9)} (from ${result.base.slice(0, 9)})` : "") +
				"\nevery other staged entry is untouched and still staged\n",
		);
	} catch (error) {
		// These throws are refusals, not crashes: "nothing is staged for <path>",
		// "HEAD moved while the commit was being built", "name at least one path".
		// Each message is already written to be read by whoever ran the command, so
		// let it reach them — an uncaught rejection buries one actionable sentence
		// under a stack trace of internal frames, which is how a caller ends up
		// reading the wrong line and concluding the tree is broken.
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 1;
	}
}
