/**
 * Stage whole files by exact path, without `git add` and without a time gap.
 *
 * ## What already exists, and what each one cannot do
 *
 * `scripts/rename/stage-lines.ts` stages individual LINES of a file several
 * sessions are editing, building the blob from HEAD plus only the named lines. It
 * solves the case where a peer's edit to the SAME file must not be swept in.
 *
 * `scripts/commit-scoped.ts` commits the staged entries for the paths you name,
 * in a tree of its own, with a compare-and-swap on the HEAD it was built from.
 * It fixes the commit half: it never reads the caller's index for CONTENT.
 *
 * Neither covers staging a NEW file, and that gap is where the measured failures
 * on this tree came from. `commitScoped` reads whatever is already staged for the
 * paths it is given, so it faithfully commits what `git add` put there — and
 * `git add` takes the path's entire current content. A brand-new file authored
 * here cannot be staged line-by-line (there is no HEAD version to take the other
 * lines from), so the only available verb was `git add`, and it ran in a
 * SEPARATE invocation from the commit.
 *
 * ## Why the gap cannot be closed with discipline
 *
 * `git add` and `git commit` are two moments in time. On a tree where several
 * sessions stage continuously, a peer can stage between them, and a read-back of
 * the staged set — which is the obvious mitigation — is only true at the instant
 * it runs. Measured four times in one day: read-back showed exactly the four files
 * I had named, and the commit still carried a fifth that a peer staged in
 * between. No amount of checking before the commit closes a window that is defined
 * by the two commands being separate.
 *
 * This closes it by construction. The blob is written with `git hash-object -w`
 * and installed with `git update-index --add --cacheinfo`, both inside this one
 * function, so there is no interval in which a peer's `git add` can land between
 * deciding what is mine and recording it. A peer's staged entries for OTHER paths
 * are untouched — this only ever calls `--cacheinfo` for the paths it was given.
 *
 * ## Scope, and why there is no `--all`
 *
 * Whole files. This is for files this session authored or rewrote end to end,
 * where every byte is ours by construction. For a file a peer is editing
 * concurrently, use `stage-lines.ts` instead: taking the whole file here would
 * take their half too, which is the failure this repo's tools exist to prevent.
 *
 * There is deliberately no mode that infers which files are mine. Every
 * measurement of that on this tree went wrong — a path that looks untouched by
 * me can hold a peer's uncommitted work, and a modified file can be entirely my
 * own. The caller names the paths; that is the whole contract.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { $ } from "bun";

/** Mode recorded for a staged file. 100755 when the working file is executable. */
const MODE_FILE = "100644";
const MODE_EXEC = "100755";

export interface StagedFile {
	/** Repo-relative path, as `git update-index --cacheinfo` records it. */
	readonly path: string;
	/** The blob sha written into the object store. */
	readonly hash: string;
	/** Bytes staged, so a caller can report what it actually recorded. */
	readonly bytes: number;
	/** True when the path was not in HEAD, i.e. this stages a new file. */
	readonly isNew: boolean;
}

/**
 * Validate the request before touching the index.
 *
 * A typo in a path is the one failure mode that would be silent: `git add` on a
 * nonexistent path errors, but a path resolved against the wrong root would stage
 * something real and unexpected. Requiring the file to exist, and requiring the
 * path to be inside the repository, turns both into errors.
 */
export function validateTargets(files: readonly string[], cwd: string): string[] {
	if (files.length === 0) throw new Error("refusing to stage nothing: name at least one file");
	const root = path.resolve(cwd);
	const seen = new Set<string>();
	for (const file of files) {
		if (path.isAbsolute(file)) throw new Error(`path must be repo-relative, got ${JSON.stringify(file)}`);
		const abs = path.resolve(root, file);
		// `path.relative` yields a `..`-prefixed path when `abs` escapes `root`, which is
		// the shape to reject; comparing prefixes instead would also reject a sibling
		// directory that merely shares a name prefix.
		const rel = path.relative(root, abs);
		if (rel.startsWith("..")) throw new Error(`path escapes the repository: ${JSON.stringify(file)}`);
		if (!fs.existsSync(abs)) throw new Error(`no such file: ${JSON.stringify(file)}`);
		if (!fs.statSync(abs).isFile()) throw new Error(`not a regular file: ${JSON.stringify(file)}`);
		if (seen.has(file)) throw new Error(`path named twice: ${JSON.stringify(file)}`);
		seen.add(file);
	}
	return [...seen];
}

/** True when `file` is tracked at HEAD, i.e. this stages a modification. */
export async function isTrackedAtHead(file: string, cwd: string): Promise<boolean> {
	const result = await $`git cat-file -e HEAD:${file}`.cwd(cwd).quiet().nothrow();
	return result.exitCode === 0;
}

/**
 * Write one file's bytes into the object store and point the index entry at them.
 *
 * Reads the file on disk, so what lands in the index is what is there at this
 * moment — which is the right answer for a file only this session is writing to.
 * Pass `override` when that is not true: on a shared file the working tree holds
 * the peer's half too, and staging it under your message is the exact failure
 * these tools exist to prevent. The mode still comes from disk, since the
 * executable bit is a property of the path rather than of the bytes.
 */
export async function stageFile(file: string, cwd: string, override?: string): Promise<StagedFile> {
	const abs = path.resolve(cwd, file);
	const contents = override === undefined ? await fs.promises.readFile(abs) : new TextEncoder().encode(override);
	const executable = (await fs.promises.stat(abs)).mode & 0o111 ? MODE_EXEC : MODE_FILE;

	const hashed = Bun.spawn(["git", "hash-object", "-w", "--stdin"], {
		cwd,
		stdin: new Blob([contents]).stream(),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [hashOut, hashErr, hashCode] = await Promise.all([
		new Response(hashed.stdout).text(),
		new Response(hashed.stderr).text(),
		hashed.exited,
	]);
	if (hashCode !== 0) throw new Error(`git hash-object exited ${hashCode} for ${file}: ${hashErr}`);
	const hash = hashOut.trim();
	if (!/^[0-9a-f]{40,64}$/.test(hash)) throw new Error(`git hash-object printed ${JSON.stringify(hash)} for ${file}`);

	// `--add` is what makes this work for a path HEAD has never seen.
	const updated = Bun.spawn(["git", "update-index", "--add", "--cacheinfo", `${executable},${hash},${file}`], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [, updateErr, updateCode] = await Promise.all([
		new Response(updated.stdout).text(),
		new Response(updated.stderr).text(),
		updated.exited,
	]);
	if (updateCode !== 0) throw new Error(`git update-index exited ${updateCode} for ${file}: ${updateErr}`);

	return { path: file, hash, bytes: contents.byteLength, isNew: !(await isTrackedAtHead(file, cwd)) };
}

/**
 * Stage every named file. Validation happens for all of them BEFORE any index
 * write, so a bad path in the middle of the list cannot leave the first half
 * staged — which on a shared tree means work of yours sitting in an index
 * another session will commit under its own message.
 *
 * `shared` names files another session may be writing to. For those, the working
 * tree cannot be trusted to hold only your bytes, so the content is passed in
 * explicitly and the file on disk is never read. `stage-lines.ts` is the general
 * answer for a shared file you are editing in place; this is the answer for a
 * whole file you authored where a peer may ALSO have a hand in it.
 */
export async function stageFiles(
	files: readonly string[],
	cwd = process.cwd(),
	options: { readonly contents?: ReadonlyMap<string, string> } = {},
): Promise<StagedFile[]> {
	const targets = validateTargets(files, cwd);
	const staged: StagedFile[] = [];
	for (const file of targets) {
		const override = options.contents?.get(file);
		staged.push(await stageFile(file, cwd, override));
	}
	return staged;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const files = args.filter(arg => arg !== "--dry-run");
	if (files.length === 0) {
		console.error("usage: stage-files.ts <file>... [--dry-run]");
		process.exit(2);
	}
	const cwd = process.cwd();
	// Same all-or-nothing rule as the real path: validate everything first.
	validateTargets(files, cwd);
	if (dryRun) {
		for (const file of files) {
			const tracked = await isTrackedAtHead(file, cwd);
			console.log(`would stage ${file} (${tracked ? "modify" : "new"})`);
		}
		return;
	}
	for (const staged of await stageFiles(files, cwd)) {
		console.log(`staged ${staged.path} (${staged.isNew ? "new" : "modify"}, ${staged.bytes} bytes, ${staged.hash})`);
	}
}

if (import.meta.main) await main();
