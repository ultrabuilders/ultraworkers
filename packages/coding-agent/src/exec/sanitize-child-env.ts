/**
 * Loader-hijack variables stripped from the environment handed to children.
 *
 * `LD_PRELOAD` and friends make a child load a library the parent never named, so
 * anything ultraworkers spawns — a build, a test runner, a user's script — can be taken
 * over without touching ultraworkers' own approval gate.
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
	// macOS. `DYLD_*` is the same hijack with a different prefix, and this is the
	// platform ultraworkers ships on most often — leaving it unfiltered meant the guard
	// covered Linux and left the most common target open.
	"DYLD_INSERT_LIBRARIES",
	"DYLD_LIBRARY_PATH",
	"DYLD_FRAMEWORK_PATH",
	"DYLD_FALLBACK_LIBRARY_PATH",
	"DYLD_FALLBACK_FRAMEWORK_PATH",
] as const;

/**
 * Prefixes stripped wholesale.
 *
 * The enumerated names above are the ones with known behaviour; these cover the
 * rest of each family's namespace without a second list to keep in sync. Both
 * prefixes are loader-specific, so nothing a child legitimately needs matches.
 */
const BLOCKED_PREFIXES = ["LD_", "DYLD_"] as const;

const BLOCKED = new Set<string>(LOADER_HIJACK_VARS);

/** Whether a variable redirects library loading and must not reach a child. */
function isBlocked(key: string): boolean {
	if (BLOCKED.has(key)) return true;
	return BLOCKED_PREFIXES.some(prefix => key.startsWith(prefix));
}

/**
 * Return `env` without loader-hijack variables.
 *
 * Narrow by design: everything a child legitimately needs is kept, so this
 * cannot be the reason a user's LSP server stops starting.
 */
export function sanitizeChildEnv(env: Record<string, string>): Record<string, string> {
	let removed = false;
	for (const key of Object.keys(env)) {
		if (!isBlocked(key)) continue;
		removed = true;
		break;
	}
	// The common case has nothing to strip, and returning the ORIGINAL object keeps
	// identity intact — callers compare `env === callerEnv`, so copying
	// unconditionally is a behaviour change dressed as a refactor.
	if (!removed) return env;

	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (isBlocked(key)) continue;
		result[key] = value;
	}
	return result;
}

export { LOADER_HIJACK_VARS };
