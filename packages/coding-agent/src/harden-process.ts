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

/** dlopen takes a library path, not a null handle — the process itself. */
const LIBC = process.platform === "linux" ? "libc.so.6" : "libc.dylib";

type Prctl = (option: number, arg: number) => number;

/** `struct rlimit` is two 64-bit fields on every platform omp ships a binary for. */
const RLIMIT_STRUCT_BYTES = 16;

let cachedPrctl: Prctl | null | undefined;

/** Resolve `prctl`, or `null` on any platform without it. Never throws. */
function getPrctl(): Prctl | null {
	if (process.platform !== "linux") return null;
	if (cachedPrctl !== undefined) return cachedPrctl;
	try {
		const libc = dlopen(LIBC, {
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
		logger.debug("harden-process: setrlimit(RLIMIT_CORE) failed", { error: String(error) });
	}

	const prctl = getPrctl();
	if (!prctl) return;

	try {
		prctl(PR_SET_DUMPABLE, 0);
	} catch (error) {
		logger.debug("harden-process: prctl(PR_SET_DUMPABLE) failed", { error: String(error) });
	}
	try {
		prctl(PR_SET_PDEATHSIG, SIGKILL);
	} catch (error) {
		logger.debug("harden-process: prctl(PR_SET_PDEATHSIG) failed", { error: String(error) });
	}
}

function disableCoreDumps(): void {
	const libc = dlopen(LIBC, {
		setrlimit: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.i32 },
	});
	try {
		const buf = new Uint8Array(RLIMIT_STRUCT_BYTES);
		// Both fields zero: soft and hard limit. Setting only the soft limit lets a
		// process raise it again; setting both makes the cap un-raisable.
		libc.symbols.setrlimit(RLIMIT_CORE, ptr(buf));
	} finally {
		libc.close();
	}
}
