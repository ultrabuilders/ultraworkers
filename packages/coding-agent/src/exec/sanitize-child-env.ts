/**
 * Loader-hijack variables stripped from the environment handed to children.
 *
 * `LD_PRELOAD` and friends make a child load a library the parent never named, so
 * anything omp spawns — a build, a test runner, a user's script — can be taken
 * over without touching omp's own approval gate.
 *
 * The list is deliberately SHORT. A broad scrub would strip `PATH`, `NODE_PATH`
 * and a user's Homebrew prefixes, and LSP servers, kernels and browsers break
 * without them. Only the loader variables go; everything a child legitimately
 * needs survives.
 *
 * Split out of the `prctl`/`setrlimit` half of the process-hardening bead,
 * because this half is pure and testable anywhere, while the syscalls can only be
 * verified on Linux.
 */

/** Loader variables that redirect which library a child actually loads. */
const LOADER_HIJACK_VARS = [
	"LD_PRELOAD",
	"LD_LIBRARY_PATH",
	"LD_AUDIT",
	"LD_NEWFILE",
	"LD_AUTOLOAD",
	"LD_ORIGIN_PATH",
] as const;

const BLOCKED = new Set<string>(LOADER_HIJACK_VARS);

/**
 * Return `env` without loader-hijack variables.
 *
 * Narrow by design: everything a child legitimately needs is kept, so this
 * cannot be the reason a user's LSP server stops starting.
 */
export function sanitizeChildEnv(env: Record<string, string>): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (BLOCKED.has(key)) continue;
		result[key] = value;
	}
	return result;
}

export { LOADER_HIJACK_VARS };
