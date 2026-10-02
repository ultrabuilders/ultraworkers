/**
 * The contract: no test file in `scripts/` can be invisible to the gate.
 *
 * This gate is the only thing that notices a test nobody runs, and it had the
 * same blind spot it exists to prevent. Its collector matched `.test.ts` and
 * nothing else, so the nine `.mjs` gate tests could not be classified at all —
 * and because a listed file that is absent from disk is also an error, adding
 * one to the manifest was not an escape. Nine tests, including the one behind
 * the nix/build-binary pairing, ran zero times and every gate reported green.
 *
 * So the assertions below are about the collector's DOMAIN rather than about
 * the manifest's contents: each extension that is legal for a script test must
 * reach the gate and be named, and anything that is not a script test must not
 * be swept in. The failure a narrowing causes is silence, so a test that only
 * counted violations would pass on the broken version.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { checkScriptTests } from "./check-script-tests";
import { RUN } from "./script-test-manifest";

/** The repository root, one level above `scripts/`. */
const repoRoot = path.join(import.meta.dir, "..");

/**
 * Whether this is a git checkout at all.
 *
 * The index assertions below have no meaning outside one — a tarball install has no index
 * to ask — so they are skipped there rather than failed. Skipping is honest only because
 * the thing being protected (the gate's dot-skip) has nothing to lose when no file is
 * tracked at all: with an empty index there is no coverage for the skip to delete.
 */
const isGitCheckout = fs.existsSync(path.join(repoRoot, ".git"));

/** Repository-tracked paths under `dir`, relative to the root. Empty outside a checkout. */
function gitLsFiles(dir: string): string[] {
	if (!isGitCheckout) return [];
	const result = Bun.spawnSync(["git", "ls-files", dir], { cwd: repoRoot, stdout: "pipe", stderr: "ignore" });
	if (result.exitCode !== 0) return [];
	return result.stdout
		.toString()
		.split("\n")
		.filter(line => line.length > 0);
}

/** A throwaway scripts/ tree holding only the files a test declares. */
function scriptsDir(files: readonly string[]): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-script-tests-"));
	for (const file of files) fs.writeFileSync(path.join(dir, file), "");
	return dir;
}

function withScriptsDir<T>(files: readonly string[], body: (dir: string) => T): T {
	const dir = scriptsDir(files);
	try {
		return body(dir);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

/** As {@link scriptsDir}, but creates intermediate directories for nested paths. */
function scriptsTree(files: readonly string[]): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-script-tests-tree-"));
	for (const file of files) {
		const full = path.join(dir, file);
		fs.mkdirSync(path.dirname(full), { recursive: true });
		fs.writeFileSync(full, "");
	}
	return dir;
}

function withScriptsTree<T>(files: readonly string[], body: (dir: string) => T): T {
	const dir = scriptsTree(files);
	try {
		return body(dir);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

/** The gate names an offender on a line of its own; anything else is not it. */
function named(messages: readonly string[], file: string): boolean {
	return messages.some(message => message.trim() === file);
}

describe("checkScriptTests — the collector's domain", () => {
	test("every extension a script test may use is reported when unclassified", () => {
		// One row per extension, because each is a separate way to be invisible:
		// a collector listing `.ts` and `.mjs` but not `.cjs` fails only here.
		const strays = ["stray.test.ts", "stray.test.mjs", "stray.test.cjs"];
		withScriptsDir(strays, dir => {
			const { ok, messages } = checkScriptTests(dir);

			expect(ok).toBe(false);
			for (const file of strays) expect(named(messages, file)).toBe(true);
		});
	});

	test("a file that is not a script test is not swept into the report", () => {
		// The other direction, and the one a widened collector can get wrong: a
		// gate that names `helper.ts` or `notes.txt` trains people to ignore it.
		const bystanders = ["helper.ts", "notes.txt", "gate.mjs", "test-utils.js"];
		withScriptsDir(bystanders, dir => {
			const { messages } = checkScriptTests(dir);

			for (const file of bystanders) expect(named(messages, file)).toBe(false);
		});
	});

	test("a file the manifest already lists is not reported as unclassified", () => {
		// Control for the two tests above. Without a classified file present, a
		// collector that named everything would still pass them, so this is what
		// makes "reported" mean "unclassified" rather than "seen".
		const known = RUN[0].file;
		expect(known).toBeDefined();
		withScriptsDir([known, "stray.test.mjs"], dir => {
			const { messages } = checkScriptTests(dir);

			expect(named(messages, known)).toBe(false);
			expect(named(messages, "stray.test.mjs")).toBe(true);
		});
	});

	test("a manifest entry with no file behind it is reported as stale", () => {
		// The reverse direction. A renamed script otherwise leaves the gate
		// reporting on something it can no longer run, and the gate still exits
		// green because RUN is non-empty.
		withScriptsDir([], dir => {
			const { ok, messages } = checkScriptTests(dir);

			expect(ok).toBe(false);
			for (const entry of RUN) expect(named(messages, entry.file)).toBe(true);
		});
	});

	test("a dot-directory's test file is not reported, because the repository does not own it", () => {
		// The failure this pins: `readdirSync` returns dot-entries unconditionally, so a
		// worktree or cache under `scripts/` handed this gate a test file no maintainer
		// can classify. The gate then failed on a file that is not in the repository —
		// 661 such phantom failures were measured from one worktree in a sibling gate.
		withScriptsTree([".worktree/rename/leak.test.ts", ".cache/stale.test.mjs"], dir => {
			const { messages } = checkScriptTests(dir);

			expect(named(messages, ".worktree/rename/leak.test.ts")).toBe(false);
			expect(named(messages, ".cache/stale.test.mjs")).toBe(false);
		});
	});

	test("a subdirectory the repository owns is still walked, so the dot-skip is not a walk-stop", () => {
		// The control, and it is the one that makes the test above mean something. A gate
		// "fixed" by refusing to recurse at all would report nothing anywhere and still pass
		// the dot-directory row, so this is what proves the guard skips dot-entries and
		// nothing else. `rename/` is a real subdirectory holding six gated tests.
		withScriptsTree(["rename/stray.test.ts", "deep/nested/stray.test.mjs"], dir => {
			const { messages } = checkScriptTests(dir);

			expect(named(messages, "rename/stray.test.ts")).toBe(true);
			expect(named(messages, "deep/nested/stray.test.mjs")).toBe(true);
		});
	});

	test.skipIf(!isGitCheckout)(
		"scripts/ tracks no file under a dot-directory, so the dot-skip costs no coverage",
		() => {
			// This is what stops the gate's justification from rotting. Skipping dot-entries is
			// correct here ONLY because the repository tracks nothing under one; five sibling
			// gates deliberately do the opposite, because 532 tracked files elsewhere live under
			// dot-directories and `.omp/tools/tui.ts` is a gated source. If that ever becomes
			// true HERE, a tracked script test would become invisible to the gate while the gate
			// still reported green — so this asserts the precondition and fails the day it stops
			// holding, instead of letting the skip quietly delete coverage.
			//
			// Queries the index rather than the disk: the question is what the repository
			// contains, and a disk walk would be the very thing under suspicion.
			const tracked = gitLsFiles("scripts/");
			const inDotDirectory = tracked.filter(file =>
				file
					.split("/")
					.slice(1)
					.some(segment => segment.startsWith(".")),
			);

			expect(inDotDirectory).toEqual([]);
		},
	);

	test("the real scripts/ directory is fully classified", () => {
		// The end-to-end contract, and the one that costs the most when it breaks:
		// the runner validates this before it executes anything, so a single
		// unclassified test file stops every other script test from running. This
		// is what turns that into a failure on the commit that adds the file
		// rather than a mystery the next time someone opens the runner.
		//
		// It reads the tree and asserts the gate accepts it, so it fails for
		// whoever adds the next unclassified test — which is the intended
		// direction. Reported as names, not a count, because the person who has to
		// act is the one who just added the file.
		const { ok, messages } = checkScriptTests(import.meta.dir);

		expect(messages.join("\n")).toBe("");
		expect(ok).toBe(true);
	});
});
