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
export const isProcessEntry: boolean = import.meta.main || process.env.PI_COMPILED === "true";
