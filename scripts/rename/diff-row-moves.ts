/**
 * Tell a moved row from an edited one in a unified diff.
 *
 * `git diff` reports both as a `-`/`+` pair, so a `-src` / `+src` pair whose two
 * lines are identical looks like an edit and is not one: the row was displaced
 * by a neighbour being inserted above it. Reading that pair as "a row changed"
 * sends you looking for an edit nobody made — and, worse, invites a fix to the
 * wrong row.
 *
 * The existing recipes for telling them apart are wrong in a specific way.
 * Hashing the **whole file** (`git show <sha>:<path> | shasum`) answers "did
 * this file change at all", which is not the question: moving `a` to the end
 * leaves every line byte-identical and still deserves to be called a reorder.
 * What actually distinguishes them is hashing **each line** and counting the
 * ones that differ, never the count of `-`/`+` lines the diff happens to print.
 *
 * Usage:
 *   bun scripts/rename/diff-row-moves.ts <file> [<commit> [<commit>]]
 *
 * With no commits it compares HEAD against the working tree. Two commits are
 * compared directly, which is the case that matters when a peer's commit is
 * under review.
 */
import { $ } from "bun";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/** One line of a file, keyed by content so equal lines can be matched up. */
function splitLines(text: string): string[] {
	const lines = text.split("\n");
	// A trailing newline yields a final empty element that is not a line.
	if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
	return lines;
}

/** How many of `b`'s lines are absent from `a`, counted per line, not per diff. */
function changedLineCount(before: string[], after: string[]): number {
	const remaining = new Map<string, number>();
	for (const line of before) remaining.set(line, (remaining.get(line) ?? 0) + 1);
	let changed = 0;
	for (const line of after) {
		const left = remaining.get(line) ?? 0;
		if (left > 0) remaining.set(line, left - 1);
		else changed++;
	}
	return changed;
}

/** File content at `ref` (a commit-ish), or "" when the path does not exist there. */
async function blobAt(ref: string, file: string, cwd: string): Promise<string> {
	const result = await $`git show ${`${ref}:${file}`}`.cwd(cwd).quiet().nothrow();
	return result.exitCode === 0 ? result.text() : "";
}

/**
 * Content of `ref:file`, except that the literal ref `WORKTREE` reads the
 * working tree from disk.
 *
 * Reading the index instead would be wrong on a shared tree: it holds whatever
 * other sessions have staged, so "what changed" would answer a question about
 * them. The working tree is the author's own uncommitted state.
 */
async function contentAt(ref: string, file: string, cwd: string): Promise<string> {
	if (ref === WORKTREE) {
		try {
			return await fs.readFile(path.join(cwd, file), "utf8");
		} catch {
			return "";
		}
	}
	return blobAt(ref, file, cwd);
}

/** The ref name that means "the working tree on disk". */
export const WORKTREE = "WORKTREE";

export type RowMoveVerdict =
	| { kind: "unchanged"; changedLines: 0 }
	| { kind: "reordered"; changedLines: number }
	| { kind: "edited"; changedLines: number };

/**
 * Classify the change to `file` between two revisions.
 *
 * `reordered` means every line still exists in both revisions — the diff only
 * shows `-`/`+` pairs because lines moved. `edited` means at least one line's
 * content is genuinely new or gone.
 */
export async function classifyFileChange(
	file: string,
	beforeRef: string,
	afterRef: string,
	cwd = process.cwd(),
): Promise<RowMoveVerdict> {
	const before = splitLines(await contentAt(beforeRef, file, cwd));
	const after = splitLines(await contentAt(afterRef, file, cwd));

	if (before.length === after.length && before.every((line, i) => line === after[i])) {
		return { kind: "unchanged", changedLines: 0 };
	}
	// Count BOTH directions. "No line's content is new" does not mean unchanged:
	// dropping a duplicate of a line that also exists removes a row, which is
	// exactly the disappearance this tool exists to make visible.
	const removed = changedLineCount(after, before);
	const added = changedLineCount(before, after);
	if (added === 0 && removed === 0) return { kind: "reordered", changedLines: 0 };
	return { kind: "edited", changedLines: Math.max(added, removed) };
}

if (import.meta.main) {
	const [file, from, to] = process.argv.slice(2);
	if (!file) {
		process.stderr.write("usage: diff-row-moves.ts <file> [<commit> [<commit>]]\n");
		process.exit(2);
	}
	const verdict = await classifyFileChange(file, from ?? "HEAD", to ?? WORKTREE);
	const changed = verdict.changedLines;
	process.stdout.write(`${file}: ${verdict.kind} (${verdict.changedLines} line(s) differ)\n`);
	// A reorder is a real change that `git diff` renders as an edit, so it must
	// not exit 0: the caller is deciding whether to go looking for an edit.
	process.exit(verdict.kind === "edited" ? 1 : 0);
}
