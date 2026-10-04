import { existsSync } from "node:fs";
import * as path from "node:path";

/**
 * True when any directory strictly between `root` and `relPath` is itself a
 * repository root — a directory carrying a `.git` entry.
 *
 * `EnterWorktree` writes a complete checkout under `.claude/worktrees/<name>/`,
 * and that checkout has its own `.git` FILE. A `Bun.Glob(..., { dot: true })`
 * descends straight into it, so a gate re-reports every finding the parent
 * repository already owns: 661 phantom failures were measured from one
 * worktree in `check-disposition`, against a real count near 490.
 *
 * The rule is deliberately NOT "skip dot-directories". `.omp/tools/tui.ts` is a
 * tracked file of THIS repository and carries a live hit, so switching a glob
 * to `dot: false` would silently stop gating it — measured as exactly one lost
 * hit, which is the quiet coverage loss these gates exist to prevent. A nested
 * repository is what separates the two: its files belong to a different index
 * and a different disposition table.
 *
 * `cache` is a per-scan memo of directory verdicts; the same prefixes recur for
 * every file in a subtree, so without it a full walk stats each ancestor once
 * per file.
 */
export function isInsideNestedRepository(
	root: string,
	relPath: string,
	cache: Map<string, boolean> = new Map(),
): boolean {
	const segments = relPath.split("/");
	// Every proper prefix, shallowest first, so the outermost nested repo wins.
	for (let depth = 1; depth < segments.length; depth++) {
		const dir = segments.slice(0, depth).join("/");
		let nested = cache.get(dir);
		if (nested === undefined) {
			nested = existsSync(path.join(root, dir, ".git"));
			cache.set(dir, nested);
		}
		if (nested) return true;
	}
	return false;
}

/** A per-scan memo to pass as the `cache` argument when scanning many paths. */
export function nestedRepoCache(): Map<string, boolean> {
	return new Map<string, boolean>();
}
