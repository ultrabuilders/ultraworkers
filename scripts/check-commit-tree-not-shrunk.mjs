#!/usr/bin/env node

/**
 * A commit must not shrink the tree.
 *
 * WHY THIS EXISTS. On a shared tree, committing with a stale or wrongly-scoped
 * `GIT_INDEX_FILE` produces a commit whose tree is empty — and git reports it as
 * a complete success. Measured 2026-10-02: `git commit` exited 0, printed a
 * normal subject line, and recorded a tree containing 0 of 9427 files. Every
 * other signal in that session said the commit was fine. The working tree was
 * untouched, so `git status` looked normal too.
 *
 * The failure is silent by construction: a missing index file reads as an empty
 * index, and an empty index is a perfectly valid thing to commit.
 *
 * WHY "SHRUNK" AND NOT "EMPTY". An empty tree is the loudest symptom of this
 * bug, but it is not the only one. A *stale* index carries whatever was staged
 * when it was last written, so the same mistake can commit a tree that is
 * missing thousands of files while still holding a few hundred. A gate written
 * as `files == 0` would pass that one. The invariant that actually holds is
 * that a commit never removes tracked content from the tree; a rename sweep
 * moves files, and a deletion that is genuinely intended shows up here too,
 * which is the point — deletions should be argued for, not discovered later.
 *
 * MERGES AND ROOT COMMITS ARE EXEMPT. A merge commit is compared against each
 * parent; a merge that legitimately resolves in fewer files than one parent is
 * still a shrink by this measure, so merges are skipped and checked by
 * `git fsck`/CI instead. A repository's first commit has no parent and is
 * skipped for the same reason.
 */

import { execFileSync } from "node:child_process";

/** Commits allowed to shrink the tree, for stated reasons. */
const EXEMPT_ENV = "OMP_ALLOW_TREE_SHRINK";

/**
 * `ls-tree -r -l` over this repo emits several MB, well past execFileSync's 1 MB
 * default, which fails the spawn with ENOBUFS. Measured: the same command
 * throws at the default and returns 9430 lines at 64 MB. An ENOBUFS caught by a
 * bare `catch` looks exactly like "cannot read the tree", so without this the
 * gate skips on every real repository while passing its own small fixtures —
 * the worst possible combination.
 */
const MAX_BUFFER = 64 * 1024 * 1024;

function git(args) {
	return execFileSync("git", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		maxBuffer: MAX_BUFFER,
	});
}

function tryGit(args) {
	try {
		return git(args);
	} catch {
		return undefined;
	}
}

/**
 * Total blob bytes in a commit's tree. Byte count, not file count, because a
 * commit that replaces 9000 files with 9000 empty ones keeps the count and still
 * destroys the content.
 *
 * `git ls-tree` exits 0 and prints NOTHING for an empty tree, which is precisely
 * the case this gate exists to catch. So the empty string is a measurement of
 * zero, not a failure to measure: only a non-zero exit (unknown ref, not a
 * repository) returns undefined.
 */
function treeWeight(ref) {
	const out = tryGit(["ls-tree", "-r", "-l", ref]);
	if (out === undefined) return undefined;
	let files = 0;
	let bytes = 0;
	for (const line of out.split("\n")) {
		if (!line.trim()) continue;
		// "<mode> <type> <sha> <size>\t<path>" — size is blank for trees/submodules.
		const tabIndex = line.indexOf("\t");
		const meta = tabIndex === -1 ? line : line.slice(0, tabIndex);
		const fields = meta.trim().split(/\s+/);
		const size = Number.parseInt(fields[3] ?? "", 10);
		files += 1;
		if (Number.isFinite(size)) bytes += size;
	}
	return { files, bytes };
}

function commitMeta(ref) {
	const out = tryGit(["rev-list", "--parents", "-n", "1", ref]);
	if (out === undefined) return undefined;
	const [sha, ...parents] = out.trim().split(/\s+/);
	return { sha, parents };
}

function main() {
	const head = tryGit(["rev-parse", "HEAD"]);
	if (head === undefined) {
		console.error("[tree-shrink] not a git repository, or HEAD is unborn — nothing to check");
		return 0;
	}

	// git prints a trailing newline. Passing that straight back as a ref makes the
	// next call fail with "malformed object name", which is how this gate first
	// shipped reporting "cannot read HEAD" and exiting 0 on every repository —
	// a gate that passes everything is worse than no gate, because it reads as
	// evidence. Trim here, once.
	const headRef = head.trim();
	if (headRef === "") {
		console.error("[tree-shrink] HEAD resolved to an empty ref; skipping");
		return 0;
	}

	const meta = commitMeta(headRef);
	if (meta === undefined) {
		console.error("[tree-shrink] cannot read HEAD; skipping");
		return 0;
	}

	if (meta.parents.length === 0) {
		console.log("[tree-shrink] root commit — no parent to compare against, skipping");
		return 0;
	}

	const commits = tryGit(["rev-list", "--merges", "-n", "1", `${meta.sha}^..${meta.sha}`]);
	if (commits && commits.trim() !== "") {
		console.log("[tree-shrink] HEAD is a merge — parent comparison is ambiguous here, skipping");
		return 0;
	}

	const before = treeWeight(meta.parents[0]);
	const after = treeWeight(meta.sha);
	if (before === undefined || after === undefined) {
		console.error("[tree-shrink] cannot read a tree; skipping rather than guessing");
		return 0;
	}

	const lostFiles = before.files - after.files;
	const lostBytes = before.bytes - after.bytes;
	const shrank = lostFiles > 0 || lostBytes > 0;

	if (!shrank) {
		console.log(
			`[tree-shrink] OK  ${after.files} files / ${after.bytes} bytes  ` +
				`(parent: ${before.files} / ${before.bytes})`,
		);
		return 0;
	}

	const allow = process.env[EXEMPT_ENV];
	if (allow === "1" || allow === "true" || allow === "yes") {
		console.log(
			`[tree-shrink] tree shrank by ${lostFiles} files / ${lostBytes} bytes — ` +
				`allowed by ${EXEMPT_ENV}`,
		);
		return 0;
	}

	console.error(
		`[tree-shrink] FAIL  HEAD ${meta.sha.slice(0, 10)} shrank the tree\n` +
			`  parent ${meta.parents[0].slice(0, 10)}: ${before.files} files / ${before.bytes} bytes\n` +
			`  HEAD                      : ${after.files} files / ${after.bytes} bytes\n` +
			`  lost                      : ${lostFiles} files / ${lostBytes} bytes\n\n` +
			`git reported this commit as a success, so it will not warn you again. The usual\n` +
			`cause is GIT_INDEX_FILE pointing at a path that does not exist: a missing index\n` +
			`reads as an EMPTY index, and an empty index commits as an empty tree. A stale\n` +
			`index does the same thing less completely, keeping whatever was staged last.\n\n` +
			`If this shrink is intended, re-run with ${EXEMPT_ENV}=1 and say why in the commit.`,
	);
	return 1;
}

process.exitCode = main();