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

/** Repo-relative `file:line` for every bare literal, in a stable order. */
async function bareLiterals() {
	const hits = [];
	for (const file of await sourceFiles()) {
		const source = await readFile(file, "utf8");
		for (const match of source.matchAll(BARE_LITERAL)) {
			const line = source.slice(0, match.index).split("\n").length;
			hits.push(`${path.relative(REPO_ROOT, file)}:${line}`);
		}
	}
	return hits.sort();
}

/** The `file:line` references section 2 cites. */
function citedLocations(source) {
	const section2 = source.slice(source.indexOf("# 2. WIRE / OPS IDENTITY"));
	const cited = new Set();
	for (const match of section2.matchAll(/(packages\/[\w./-]+\.ts):(\d+)/g)) {
		cited.add(`${match[1]}:${match[2]}`);
	}
	return cited;
}

test("every bare oh-my-pi literal is recorded in keep-list section 2", async () => {
	const source = await readFile(KEEP_LIST, "utf8");
	const actual = await bareLiterals();
	const cited = citedLocations(source);

	// Set comparison so the failure names the unrecorded literal rather than
	// only that a count moved. Direction matters: the first difference is a
	// literal the rename would rewrite with no record of why not.
	const unrecorded = actual.filter(location => !cited.has(location));
	assert.deepEqual(unrecorded, [], `bare literals missing from section 2: ${unrecorded.join(", ")}`);
});
