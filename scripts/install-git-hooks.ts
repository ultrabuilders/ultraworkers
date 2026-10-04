#!/usr/bin/env bun
/**
 * Arm the shared-tree commit guard by pointing git at `scripts/hooks`.
 *
 * `epic-z4zg`. The guard in `scripts/hooks/pre-commit` refuses a bare `git commit`,
 * which on this tree would carry every agent's staged rows. Shipping it is not
 * enough, and the reason is worth stating because it has already cost this repo
 * twice: **git does not read hooks from the tree.** It reads them from the install
 * location, resolved per clone. A committed, executable `scripts/hooks/pre-commit`
 * is therefore documentation — and a guard that never runs looks exactly like a
 * guard that is working.
 *
 * Measured on this tree before this script existed:
 *
 *     $ git ls-tree HEAD scripts/hooks/pre-commit
 *     100755 blob 89ea7a2b…        # executable IN THE TREE
 *     $ git config --get core.hooksPath
 *     (unset)                       # ...and never consulted
 *
 * `core.hooksPath` is local config: it does not travel with a clone, so no amount
 * of committing makes a fresh clone safe. This script is the step that makes it
 * travel — `bun setup` runs it once per clone.
 *
 * Standalone and importable on purpose: `setup.ts` executes its step chain at
 * import time, so a test could not reach a helper defined there without running
 * the whole install. Split out, the behaviour below is assertable against a real
 * temp clone.
 */

import * as path from "node:path";

/** The value git must resolve for the committed guard to be the one that runs. */
export const HOOKS_PATH = "scripts/hooks";

export interface InstallResult {
	readonly exitCode: number;
	/** The value git had before this ran; `undefined` when unset. */
	readonly previous: string | undefined;
	/** What it holds after. */
	readonly current: string | undefined;
	/** True when this call changed it. */
	readonly changed: boolean;
}

function readHooksPath(repoRoot: string): string | undefined {
	// `git config --get` exits 1 when the key is absent, which is not an error here.
	const proc = Bun.spawnSync(["git", "config", "--get", "core.hooksPath"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (proc.exitCode !== 0) return undefined;
	const value = proc.stdout.toString().trim();
	return value.length > 0 ? value : undefined;
}

/**
 * Set `core.hooksPath` to {@link HOOKS_PATH} in `repoRoot`.
 *
 * Idempotent: a second run reports `changed: false` and writes nothing, so
 * `bun setup` can run on every clone without churning config.
 */
export function installGitHooks(repoRoot: string): InstallResult {
	const previous = readHooksPath(repoRoot);
	if (previous === HOOKS_PATH) {
		return { exitCode: 0, previous, current: previous, changed: false };
	}
	const proc = Bun.spawnSync(["git", "config", "core.hooksPath", HOOKS_PATH], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (proc.exitCode !== 0) {
		const detail = proc.stderr.toString().trim();
		console.error(`install-git-hooks: git config failed${detail ? `: ${detail}` : ""}`);
		return { exitCode: proc.exitCode, previous, current: previous, changed: false };
	}
	// A pre-existing DIFFERENT value is a deliberate choice by someone. Say so
	// rather than overwriting it quietly: this script runs on every `bun setup`,
	// so a silent clobber would be invisible until a guard stopped firing.
	if (previous !== undefined) {
		console.log(
			`install-git-hooks: replaced core.hooksPath ${previous} -> ${HOOKS_PATH} (the guard that refuses bare commits)`,
		);
	}
	return { exitCode: 0, previous, current: HOOKS_PATH, changed: true };
}

// Standalone invocation: `bun scripts/install-git-hooks.ts`
if (import.meta.main) {
	const repoRoot = path.join(import.meta.dir, "..");
	const result = installGitHooks(repoRoot);
	if (result.exitCode === 0 && !result.changed) {
		console.log(`install-git-hooks: core.hooksPath already ${result.current}`);
	}
	process.exit(result.exitCode);
}