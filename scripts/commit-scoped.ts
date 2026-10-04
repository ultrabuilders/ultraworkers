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
 * ## A rename is two paths, and a half-named one is refused
 *
 * `git mv` leaves the index holding only the DESTINATION; the source has no entry at all,
 * exactly like a deletion. Naming the destination alone would commit the addition and
 * leave the source in the tree — a file duplicated under two names, reported as a success.
 *
 * That was once documented here as an accepted hazard, on the grounds that recovering the
 * source from the destination "would be a guess". It is not a guess: `git mv` records the
 * pair, and `git diff --cached --diff-filter=R` reports it while the rename is still staged
 * and uncommitted — which is exactly when the caller is deciding what to name. So the tool
 * asks git and **refuses**, naming the path that is missing.
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

/**
 * The hash of git's empty tree — what an intent-to-add entry carries in place of content.
 *
 * A constant of git's, not of ours: `git hash-object -t tree /dev/null` is this value on
 * every repository, and hardcoding it means the check cannot drift from the git it runs
 * against the way a per-call computation could not be checked at all.
 */
const EMPTY_BLOB = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";

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

/**
 * Write `bytes` into the object store and return its blob id.
 *
 * `hash-object -w` touches the OBJECT STORE and nothing else — no index, no ref, no
 * worktree. That is what makes it safe to run against the caller's repository here: the
 * blob becomes available for the scoped tree to reference, and nothing on the real index
 * moves. A `--stdin` path avoids the temp-file dance, which would put a peer's
 * simultaneous write of the same path in the way.
 */
async function hashBytes(bytes: Uint8Array, cwd: string): Promise<string> {
	const proc = Bun.spawn(["git", "hash-object", "-w", "--stdin"], {
		cwd,
		stdin: new Blob([bytes]),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (code !== 0) throw new Error(`git hash-object exited ${code}: ${stderr.trim()}`);
	return stdout.trim();
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
		//
		// The `0` is the STAGE, and it is the field this must read rather than skip. A
		// conflicted path carries three rows for the same file — stages 1/2/3 — and they
		// are three DIFFERENT candidate resolutions of one unresolved merge. Treating
		// them as three independent entries made the last one win, and stage 3 is
		// "theirs": the tool committed a side of a conflict that git refuses to commit
		// at all, and reported success. Stage 0 is the only row that means "this is the
		// content".
		const tab = line.indexOf("\t");
		if (tab < 0) throw new Error(`unparsable ls-files -s line: ${line}`);
		const meta = line.slice(0, tab).split(/\s+/);
		const mode = meta[0];
		const blob = meta[1];
		const stage = meta[2];
		if (!mode || !blob || stage === undefined) throw new Error(`unparsable ls-files -s line: ${line}`);
		if (stage !== "0") {
			throw new Error(
				`${line.slice(tab + 1)} has an unmerged index entry (stage ${stage}) — ` +
					"a merge conflict is not committable until it is resolved. git refuses this commit; so does this tool.",
			);
		}
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

/**
 * The rename SOURCE for each of `files` that is the destination half of a staged rename.
 *
 * `git mv` stages only the destination, so from the index alone a rename is
 * indistinguishable from a deletion wearing the destination's name — and `read-tree HEAD`
 * then puts the source back. Committing the destination alone therefore lands a file
 * duplicated under two names while reporting only the paths it committed.
 *
 * This was documented as an unavoidable hazard on the grounds that recovering the source
 * from the destination "would be a guess". It is not: `git mv` records the PAIR, and
 * `git diff --cached --diff-filter=R` reports it, in the very state that matters (staged,
 * not yet committed — the moment a caller is choosing what to name). Git does the rename
 * detection; this only reads the answer git already computed.
 *
 * `--no-renames` is what a caller must NOT reach for: with it the source disappears from
 * the report entirely, which is the ambiguity this function exists to remove.
 */
async function renameSources(files: readonly string[], cwd: string): Promise<Map<string, string>> {
	const sources = new Map<string, string>();
	if (files.length === 0) return sources;
	// `-z` so a path containing a space or a newline cannot split a line into two fields.
	// The NUL-separated form is `R100\0<src>\0<dst>`; without it the tab form is ambiguous.
	const raw = await git(["diff", "--cached", "--name-status", "--diff-filter=R", "-z"], cwd);
	const fields = raw.split("\0").filter(field => field !== "");
	for (let i = 0; i + 2 < fields.length + 1; i += 3) {
		const status = fields[i];
		const source = fields[i + 1];
		const destination = fields[i + 2];
		// A rename is only relevant if the caller named the DESTINATION but not the source.
		if (status?.startsWith("R") !== true || source === undefined || destination === undefined) continue;
		if (files.includes(destination) && !files.includes(source)) sources.set(destination, source);
	}
	return sources;
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
	// empty-commit check and be told the wrong thing. Compare each entry against the one
	// HEAD records and keep only what actually differs.
	//
	// BOTH fields are compared, not just the blob. A mode-only change — `chmod +x` on a
	// script — leaves the blob byte-identical, so comparing blobs alone classifies it as
	// clean and the commit is refused with "nothing is staged" for a change git itself
	// records as staged. The mode is half of what an index entry is.
	const entries: IndexEntry[] = [];
	for (const entry of allEntries) {
		const inHead = await gitOrNull(["ls-tree", head, "--", entry.file], cwd);
		// A path absent from HEAD's tree is new; nothing to compare against.
		//
		// `gitOrNull` returns null only when git EXITS non-zero. `ls-tree` on a path it
		// does not have exits 0 and prints nothing, so that case arrives as an EMPTY
		// STRING — testing `!== null` here treated every new file as one HEAD already
		// had, and the intent-to-add guard below could never run. Both empty results mean
		// the same thing: HEAD has no entry for this path.
		// An EMPTY blob is a PLACEHOLDER, not content — and that is a property of the
		// index entry alone. It says nothing about whether HEAD has the path, so this test
		// must not sit in an `else` on "is this path in HEAD".
		//
		// `git add -N` on a NEW path records it with git's EMPTY blob, and so does
		// `git rm --cached` + `git add -N` on a path that is ALREADY COMMITTED: HEAD keeps
		// the real source while the index carries the placeholder (`git status` reports
		// `DA`). Keyed on the `else` — as this was — the second shape took the `if` branch,
		// the empty blob survived, and the commit wrote a 0-byte file over kilobytes of
		// real source. Found on the shared tree with six such paths staged at once.
		//
		// Committing the placeholder blob is never right, so this is not a reason to
		// refuse. `git add -N` exists precisely so a file can be committed by path, and
		// `git commit --only <path>` commits it correctly by reading the working tree — the
		// same source this tool reads for every other path. Refusing here made this tool
		// reject a state the tool it replaces accepts, which is the wrong way round.
		//
		// So the placeholder is resolved the way `--only` resolves it: hash what is on
		// disk. If the file is gone there is nothing to commit, and `deletedPaths` reports
		// the path as a deletion.
		if (entry.blob === EMPTY_BLOB) {
			const bytes = await fs.promises.readFile(path.resolve(cwd, entry.file)).catch(() => null);
			if (bytes === null) continue;
			const written = await hashBytes(bytes, cwd);
			entries.push({ ...entry, blob: written });
			continue;
		}
		if (inHead) {
			// `<mode> SP <type> SP <sha> TAB <path>` — the type sits BETWEEN the mode and
			// the sha, so the blob is field 2, not field 1. Reading field 1 compares every
			// entry against the literal string "blob" and nothing is ever clean, which
			// turns the refusal below into a false alarm on an unchanged file.
			const [headMode, , headBlob] = inHead.split(/\s+/);
			if (headMode === entry.mode && headBlob === entry.blob) continue;
		}
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
	// A rename the caller half-named is refused, not reported. Naming only the destination
	// commits the addition and leaves the source in the tree — one file under two names,
	// reported as a success. Git already knows the pair, so the tool can say which path is
	// missing instead of letting the caller discover it in `git show` much later.
	const halfRenames = await renameSources(files, cwd);
	if (halfRenames.size > 0) {
		const pairs = [...halfRenames].map(([destination, source]) => `${source} -> ${destination}`);
		throw new Error(
			`refusing a half-named rename: ${pairs.join(", ")} — a rename spans TWO paths, and ` +
				"only the destination was named. Name the source too, so the commit removes it.",
		);
	}
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
