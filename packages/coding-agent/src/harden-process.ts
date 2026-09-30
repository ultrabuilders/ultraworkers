/**
 * Process hardening, applied before any heavy import in `cli.ts`.
 *
 * omp already obfuscates secrets, gates approval, and kills process groups in the
 * bash executor. The axis those miss is the process itself: a peer attaching a
 * debugger, or a core dump on disk, reaches the same secrets without passing any
 * of those gates.
 *
 * Two rules govern this file:
 *
 *   1. **Never prevent startup.** Every call is individually guarded and degrades
 *      to a no-op. A security measure that leaves omp unable to launch is worse
 *      than the hole it closes, because the user sees a broken tool rather than a
 *      compromised one.
 *   2. **Say which platform did nothing.** The macOS/Windows path is a silent
 *      no-op by design, so a reader must be able to tell "not attempted" from
 *      "attempted and failed" — otherwise a broken Linux path looks identical to a
 *      platform that has no equivalent call.
 *
 * These are syscall invocations, not code: there is no upstream implementation to
 * copy, only flags to pass. The shape follows `utils/title-generator.ts`, which
 * already does dlopen-per-platform here.
 */
import { dlopen, FFIType, ptr } from "bun:ffi";
import { logger } from "@oh-my-pi/pi-utils";

// Linux prctl options. Both are stable ABI constants.
const PR_SET_PDEATHSIG = 1;
const PR_SET_DUMPABLE = 4;
const SIGKILL = 9;
const RLIMIT_CORE = 4;

/**
 * dlopen takes a library PATH, not the process handle, so the name differs per
 * platform. `null` where there is no equivalent — not "some name that will fail",
 * which would make a platform difference look like a broken call.
 */
const LIBC = process.platform === "linux" ? "libc.so.6" : process.platform === "darwin" ? "libc.dylib" : null;

type Prctl = (option: number, arg: number) => number;

/** `struct rlimit` is two 64-bit fields on every platform omp ships a binary for. */
const RLIMIT_STRUCT_BYTES = 16;

let cachedPrctl: Prctl | null | undefined;

/** Resolve `prctl`, or `null` on any platform without it. Never throws. */
function getPrctl(): Prctl | null {
	if (process.platform !== "linux") return null;
	if (cachedPrctl !== undefined) return cachedPrctl;
	// Reachable only on Linux, where LIBC is a string.
	try {
		const libc = dlopen(LIBC as string, {
			prctl: { args: [FFIType.i32, FFIType.u64], returns: FFIType.i32 },
		});
		cachedPrctl = libc.symbols.prctl as Prctl;
	} catch (error) {
		cachedPrctl = null;
		logger.debug("harden-process: prctl unavailable", { error: String(error) });
	}
	return cachedPrctl;
}

/**
 * Deny debugger attach and core dumps on Linux.
 *
 * `PR_SET_DUMPABLE = 0` stops a debugger attaching and stops another user reading
 * `/proc/<pid>/mem`. `PR_SET_PDEATHSIG = SIGKILL` means the process dies with the
 * shell that launched it, instead of surviving as an orphan holding an API key.
 *
 * A no-op on macOS and Windows, which is a deliberate platform difference rather
 * than a failure — `RLIMIT_CORE` has an equivalent there, but prctl does not.
 */
export function hardenProcess(): void {
	// Portable first: the core limit is the one that applies everywhere.
	try {
		disableCoreDumps();
	} catch (error) {
		logger.debug("harden-process: setrlimit(RLIMIT_CORE) threw", { error: String(error) });
	}

	const prctl = getPrctl();
	if (!prctl) return;

	// FFI returns a value; it does NOT throw on a refused call. A try/catch alone
	// would let EPERM pass silently, which is the difference between a guard that
	// works and one that only exists. Check the return code.
	try {
		const rc = prctl(PR_SET_DUMPABLE, 0);
		if (rc !== 0) logger.debug("harden-process: prctl(PR_SET_DUMPABLE) refused", { rc });
	} catch (error) {
		logger.debug("harden-process: prctl(PR_SET_DUMPABLE) threw", { error: String(error) });
	}
	try {
		// Only effective if the parent was ALIVE when this is set — a signal is not
		// replayed for a parent that died earlier. So a late `hardenProcess` can
		// believe it is protected and not be.
		const rc = prctl(PR_SET_PDEATHSIG, SIGKILL);
		if (rc !== 0) logger.debug("harden-process: prctl(PR_SET_PDEATHSIG) refused", { rc });
	} catch (error) {
		logger.debug("harden-process: prctl(PR_SET_PDEATHSIG) threw", { error: String(error) });
	}
}

function disableCoreDumps(): void {
	// Zero both fields: the soft limit alone would still be raisable.
	setCoreLimit(0, 0);
}

/**
 * Set RLIMIT_CORE. Returns the syscall's return code, or -1 when the platform has
 * no equivalent — never throws, so the caller decides what to do about a refusal.
 *
 * Split out with the limits as arguments so a test can pass an IMPOSSIBLE struct.
 * `rlim_cur > rlim_max` is EINVAL, and that refusal is reachable on any platform:
 * a test which only passes a valid struct proves nothing, because the success path
 * never logs.
 */
export function setCoreLimit(rlimCur: number, rlimMax: number): number {
	if (!LIBC) return -1;
	const libc = dlopen(LIBC, {
		setrlimit: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.i32 },
	});
	try {
		const buf = new Uint8Array(RLIMIT_STRUCT_BYTES);
		const view = new DataView(buf.buffer);
		view.setBigUint64(0, BigInt(rlimCur), true);
		view.setBigUint64(8, BigInt(rlimMax), true);
		const rc = libc.symbols.setrlimit(RLIMIT_CORE, ptr(buf));
		// FFI reports refusal as a return value, not an exception. Without this
		// check a refused call is indistinguishable from a successful one.
		if (rc !== 0) logger.debug("harden-process: setrlimit(RLIMIT_CORE) refused", { rc });
		return rc;
	} finally {
		libc.close();
	}
}
