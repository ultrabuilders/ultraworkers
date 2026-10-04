/**
 * Whether this module graph is the real process entry.
 *
 * Extracted from `cli.ts` so it can be asserted without importing the entrypoint
 * itself, which would run the whole CLI as a side effect of a test.
 *
 * `Bun.build`-API compiled Windows executables report `import.meta.main ===
 * false`: the standalone loader keys the entry module with native backslashes
 * (`B:\~BUN\root\cli.js`) but registers the main path with forward slashes
 * (`B:/~BUN/root/cli.js`), so Bun's internal match fails. `bun build --compile`
 * CLI builds are unaffected. A compiled binary's entry module is by definition
 * the process entry, so the define-folded PI_COMPILED marker stands in.
 *
 * This gates the process hardening. `bun test` and SDK embedding reach the same
 * `cli.ts`, and hardening the test runner makes a test that crashes on purpose
 * go silent — the failure mode with no evidence anywhere.
 */

/**
 * Resolve the entry test from the CALLER's `import.meta.main`, not this module's.
 *
 * `import.meta.main` is per-module, not per-process: it is true only for the
 * module Bun was handed on the command line. Measured on this tree — running
 * `bun src/cli.ts` reported `import.meta.main === true` inside `cli.ts` and
 * `false` inside this file, so reading it here made `isProcessEntry` constant
 * false for every source run of the CLI.
 *
 * That is not a hardening nuance, it is a dead CLI. `cli.ts` gates its whole
 * entry block on this flag, so `runCli` was never called: `ultraworkers --version`,
 * `ultraworkers --help` and every subcommand exited 0 having printed nothing, on both
 * streams. The guard this module exists to provide was never actually consulted
 * — it was answering a question about the wrong module.
 *
 * The caller passes its own `import.meta.main` because only the caller knows it.
 */
export function resolveIsProcessEntry(entryModuleIsMain: boolean, env: NodeJS.ProcessEnv = process.env): boolean {
	return entryModuleIsMain || env.PI_COMPILED === "true";
}

/** This module's own entry status — true only when THIS file is the entry, which
 * `cli.ts` never is. Kept exported for tests that exercise this module directly;
 * `cli.ts` must use `resolveIsProcessEntry(import.meta.main)` instead. */
export const isProcessEntry: boolean = resolveIsProcessEntry(import.meta.main);
