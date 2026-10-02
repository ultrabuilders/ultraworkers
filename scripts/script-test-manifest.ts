/**
 * Every `scripts/*.test.ts` on disk, and what happens to it.
 *
 * This list existed as a hand-typed argument in `package.json` and a hand-typed
 * argument in `ci.yml`, and they disagreed. Measured on this tree: 16 test files,
 * `test:scripts` naming 6, CI running 3, and the two lists overlapping on
 * `ci-test-ts` and `release` — so the union was 7 and **9 files ran nowhere**,
 * including `gen-patch-ledger.test.ts`. A test can be written, be green, and
 * still gate nothing at all; that is the failure this file exists to make
 * impossible rather than merely unlikely.
 *
 * The two lists were separate lists precisely because there was no single place
 * that had to be right, and two lists that agree today are two lists that drift.
 *
 * Classification is explicit for every file, in BOTH directions, and
 * {@link classifyScriptTests} is the only thing that reads it:
 *
 * - a test file that is in neither list is an error, and the error names the
 *   files — adding a test and forgetting to wire it is the common direction, and
 *   it is the one that looks like progress;
 * - a listed file that no longer exists is equally an error, so a renamed script
 *   cannot leave a gate that reports on nothing.
 *
 * A `run`/`excluded` split is checked, but no naming convention is imposed. The
 * obvious convention — "a test has a same-named script" — was tried against the
 * tree and is wrong: `musl-release.test.ts` exercises `ci-release-build-binaries.ts`
 * and `install.sh`, so 1 of 16 files would fail a check that encodes a guess.
 */

export interface ScriptTestClassification {
	readonly file: string;
	/** Why this file is not run, when it is not. Empty for a run file. */
	readonly reason: string;
}

/** Files CI executes. */
export const RUN: readonly ScriptTestClassification[] = [
	{ file: "ci-failure-extract.test.ts", reason: "" },
	{ file: "ci-release-build-binaries.test.ts", reason: "" },
	{ file: "ci-release-checksums.test.ts", reason: "" },
	{ file: "ci-release-publish.test.ts", reason: "" },
	{ file: "ci-test-ts.test.ts", reason: "" },
	{ file: "ci-update-brew-formula.test.ts", reason: "" },
	{ file: "fix-changelogs.test.ts", reason: "" },
	{ file: "fix-dt-verdef.test.ts", reason: "" },
	{ file: "gen-nix-bun.test.ts", reason: "" },
	{ file: "nix-alias-readme.test.ts", reason: "" },
	{ file: "gen-patch-ledger.test.ts", reason: "" },
	{ file: "inline-functions.test.ts", reason: "" },
	{ file: "measure-fan-in.test.ts", reason: "" },
	{ file: "merge-pr.test.ts", reason: "" },
	{ file: "musl-release.test.ts", reason: "" },
	{ file: "release.test.ts", reason: "" },
	// Pins the local render path only — `rewrite-changelog`'s model call is not
	// exercised, so this needs no credentials and no network.
	{ file: "rewrite-changelog.test.ts", reason: "" },
	{ file: "stamp-native-version.test.ts", reason: "" },
	// Tests of gates that run in `check:ts`. These were unclassified, which meant
	// `test:scripts` refused to start at all — the refusal at the top of the runner
	// is what makes an unclassified file block every other file too.
	{ file: "check-grp-c-file-counts.test.ts", reason: "" },
	{ file: "check-grp-c-test-baseline.test.ts", reason: "" },
	{ file: "ci-check-full.test.ts", reason: "" },
	{ file: "check-script-tests.test.ts", reason: "" },

	// The `.mjs` gates' own tests. These run under `node --test`, not `bun test`:
	// they import `node:test`, whose runner node owns. Measured 2026-10-02 —
	// `node --test` over all nine: 47 pass / 0 fail. `bun test` over the same nine:
	// 46 pass / 1 fail, and the failure is `check-ts-relative-imports.test.mjs`
	// tripping the 5s default `node:test` timeout that bun also enforces (12s
	// actual, as it walks the module graph). So the split follows the runtime the
	// file declares rather than a preference: under the wrong runner one of the
	// nine goes red on elapsed time alone and reports a defect that is not there.
	{ file: "check-commit-tree-not-shrunk.test.mjs", reason: "" },
	{ file: "check-entry-graphs.test.mjs", reason: "" },
	{ file: "check-lockfile-commit.test.mjs", reason: "" },
	{ file: "check-pinned-deps.test.mjs", reason: "" },
	{ file: "check-runtime-deps.test.mjs", reason: "" },
	{ file: "check-ts-relative-imports.test.mjs", reason: "" },
	{ file: "keep-list-drift.test.mjs", reason: "" },
	{ file: "keep-list-wire.test.mjs", reason: "" },
	{ file: "nix-binary-name.test.mjs", reason: "" },
];

/**
 * Files deliberately not executed, each with the reason it is not.
 *
 * Empty, and that is the point: it is a list someone must argue themselves into.
 * `musl-release.test.ts` sat in `test:scripts` while CI skipped the whole script
 * because of a comment saying it "fails on main" — measured, it passes (2 pass),
 * so the recorded reason no longer held and the file is now actually run. An
 * exclusion with no measured reason is a preference; this list is where a
 * preference has to be written down.
 */
export const EXCLUDED: readonly ScriptTestClassification[] = [];

/**
 * Classify the files on disk against the manifest.
 *
 * Pure, so the gate and the runner agree by construction rather than by two
 * reads of the same list drifting.
 */
export function classifyScriptTests(onDisk: readonly string[]): {
	unclassified: readonly string[];
	stale: readonly string[];
	duplicated: readonly string[];
	misplaced: readonly string[];
	run: readonly string[];
} {
	const run = RUN.map(entry => entry.file);
	const excluded = EXCLUDED.map(entry => entry.file);
	const listed = [...run, ...excluded];
	const seen = new Set<string>();
	const duplicated: string[] = [];
	for (const file of listed) {
		if (seen.has(file)) duplicated.push(file);
		seen.add(file);
	}

	const onDiskSet = new Set(onDisk);
	// An exclusion with no stated reason is the one way to be on this list
	// without having argued for it, so it is treated as a classification error
	// rather than trusted.
	const misplaced = EXCLUDED.filter(entry => entry.reason.trim().length === 0).map(entry => entry.file);

	return {
		unclassified: onDisk.filter(file => !seen.has(file)),
		stale: listed.filter(file => !onDiskSet.has(file)),
		duplicated,
		misplaced,
		run: run.filter(file => onDiskSet.has(file)),
	};
}
