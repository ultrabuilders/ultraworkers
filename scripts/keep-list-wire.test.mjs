/**
 * Every bare "oh-my-pi" literal must appear in section 2 of the keep-list.
 *
 * `scripts/rename/keep-list.txt` section 2 is the part a rename pass must leave
 * alone: bare "oh-my-pi" strings with no `@`, each recorded with the reason it
 * is load-bearing. A scope rename rewrites `@oh-my-pi`, so it reaches these only
 * by accident — which is what makes an unlisted one dangerous rather than
 * merely untidy. `zai.ts`'s key name, the Exa `x-exa-source` header, the RFC
 * 7591 `client_name` on a user's consent screen: change the value and a third
 * party sees a different name, with no local error to notice it by.
 *
 * The list decays the same way section 1 does — silently, by omission. A new
 * bare literal that nobody records is rewritten by the next pass. Section 1 has
 * its gate in `keep-list-drift.test.mjs`; this is the same protection for the
 * other half of the file.
 *
 * Discovery walks the filesystem rather than running the `git grep` the file's
 * header documents, for two reasons that header itself records: git's `**` does
 * not match zero directory levels, so the single-glob form silently omits a file
 * sitting directly in `src/` (it omits `telemetry-export-otlp.ts`, a wire
 * identity), and `git grep` only sees TRACKED files, so a peer's untracked new
 * file is invisible. Both make that command's output a lower bound. A gate built
 * on it would report the inventory as complete while missing exactly the entry
 * it exists to protect.
 *
 * The comparison is two-sided on purpose. A literal that appears in section 2 but
 * no longer exists in the tree is a stale entry that would keep a future rename
 * from touching a path it no longer needs to skip.
 *
 * Granularity is the FILE, not `file:line`. The line number is a promise about
 * where the content sits, which is a stronger claim than the question being
 * asked — inserting a comment turns `zai.ts:41` into `zai.ts:42` without changing
 * a thing about whether the literal is load-bearing. A gate that goes red for an
 * unrelated reason gets ignored once and bulk-updated the next time, and a dead
 * signal is worse than no signal. The `file:line` anchors in section 2's prose
 * are documentation, not test inputs: the gate verifies "`zai.ts` contains the
 * bare token", not "line 41 exists".
 *
 * What that looseness costs, stated rather than glossed: a SECOND bare literal
 * added to a file section 2 already cites is invisible here, because the unit
 * is the file. Confirmed by mutation — that variant stayed green. A rename pass
 * that rewrites every bare literal would take the surviving one with it, so the
 * gate cannot be the thing that stops it; `grep -c 'oh-my-pi"' <file>` after the
 * pass is. In exchange the gate does not fire on a comment insertion, which is
 * the failure mode that kills a signal: the first red-on-nothing gets ignored,
 * and the second time someone bulk-updates the line numbers and the signal is
 * dead for good.
 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEEP_LIST = path.join(REPO_ROOT, "scripts", "rename", "keep-list.txt");

/**
 * The bare-literal pattern: a `"oh-my-pi"` that no scope character precedes.
 *
 * `@oh-my-pi` is the scope a rename is *supposed* to rewrite, so it is excluded
 * by the same class the file's own inventory uses — a preceding `@`, letter,
 * digit, `_` or `-` all disqualify the match.
 */
const BARE_LITERAL = /(^|[^@a-zA-Z0-9_-])"oh-my-pi"/g;

/** Every tracked-or-untracked source file under a workspace package. */
async function sourceFiles() {
	const packageDir = path.join(REPO_ROOT, "packages");
	const found = [];
	for (const entry of await readdir(packageDir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const srcDir = path.join(packageDir, entry.name, "src");
		for await (const candidate of walk(srcDir)) {
			if (candidate.endsWith(".ts")) found.push(candidate);
		}
	}
	return found.sort();
}

async function* walk(dir) {
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else yield full;
	}
}

/** Repo-relative file path for every file holding a bare literal, sorted. */
async function filesWithBareLiterals() {
	const hits = new Set();
	for (const file of await sourceFiles()) {
		const source = await readFile(file, "utf8");
		if (BARE_LITERAL.test(source)) hits.add(path.relative(REPO_ROOT, file));
		BARE_LITERAL.lastIndex = 0;
	}
	return [...hits].sort();
}

/**
 * The files section 2 cites.
 *
 * Anchors are written as `path.ts:line`, and the trailing line number is
 * dropped here: see the granularity note in this file's header. Prose also
 * mentions paths without a line number (the two `segments.ts` anchors are
 * cited by line, but the discussion names the file bare), so a path is
 * recognised with or without the suffix.
 */
function citedFiles(source) {
	const section2 = source.slice(source.indexOf("# 2. WIRE / OPS IDENTITY"));
	const cited = new Set();
	for (const match of section2.matchAll(/(packages\/[\w./-]+\.ts)(?::(\d+))?/g)) {
		cited.add(match[1]);
	}
	return cited;
}

test("every file holding a bare oh-my-pi literal is recorded in section 2", async () => {
	const source = await readFile(KEEP_LIST, "utf8");
	const actual = await filesWithBareLiterals();
	const cited = citedFiles(source);

	// Set comparison so the failure names the unrecorded file rather than only
	// that a count moved. Direction matters: the first difference is a literal
	// the rename would rewrite with no record of why not.
	const unrecorded = actual.filter(file => !cited.has(file));
	assert.deepEqual(unrecorded, [], `bare literals missing from section 2: ${unrecorded.join(", ")}`);
});

test("every file cited in section 2 still holds a bare literal", async () => {
	const source = await readFile(KEEP_LIST, "utf8");
	const actual = new Set(await filesWithBareLiterals());
	const cited = citedFiles(source);

	// The inverse direction. Without this row, deleting a wire identity from an
	// already-listed file drops it out of the inventory silently: the list and
	// the tree diverge and the gate above stays green, because every literal it
	// can see is still recorded. That divergence is the whole reason this gate
	// exists, so it gets its own row rather than a footnote.
	const stale = [...cited].filter(file => !actual.has(file)).sort();
	assert.deepEqual(stale, [], `section 2 cites files with no bare literal left: ${stale.join(", ")}`);
});
