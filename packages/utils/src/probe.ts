/**
 * A write that stays countable after the test runner withholds it.
 *
 * ## The layer that actually deletes measurements
 *
 * `scripts/ci-test-ts.ts` in quiet mode withholds the **entire captured output of a
 * chunk that passed**, replaying only failing chunks. So an instrument placed in a
 * passing chunk produces **no output at all** — and that is byte-for-byte what an
 * instrument which never fired produces. The general shape is the dangerous one: a
 * positive measurement is deleted while a negative one reports success, so the silence
 * reads as a result.
 *
 * **`--only-failures` is not that layer, and this file used to claim it was.** Measured:
 * a passing test's `console.log` survives `--only-failures` unchanged. That flag hides
 * per-test *result lines*; it does not hide what a passing test wrote. Only the runner's
 * withholding deletes output, so that is the only claim worth making here.
 *
 * ## Why a prefix, then
 *
 * Because survival is not the problem — **countability** is. The withheld output of a
 * passing chunk is hundreds of ordinary lines of bun's own, which is exactly why a4's
 * warning as originally phrased ("warn when a passing chunk has probe output") would
 * fire on every normal run. A tagged line is countable inside that pile, so a discarded
 * instrument becomes a number in the summary instead of an absence nobody can tell from
 * success.
 *
 * `process._rawDebug` targets the file descriptor directly rather than the reporter,
 * which keeps the line out of the reporter's buffering and ordering.
 *
 * ## Why not the logger
 *
 * `@oh-my-pi/pi-utils`'s `logger` writes to `~/.omp/logs/`. The runner captures the
 * chunk's **stdout and stderr**, so a logged probe is invisible to the thing that would
 * have to report it. This is the one place that must write to the stream the runner is
 * actually watching.
 *
 * ## Deliberately unconditional
 *
 * {@link probe} always writes, in every mode. A probe that went quiet under some flag
 * would reintroduce the ambiguity this removes, one layer up.
 */

/**
 * Line prefix that marks output as a probe entry.
 *
 * Shared with `scripts/ci-test-ts.ts`, which counts lines beginning with it. It is
 * exported rather than re-spelled there because a runner counting a different string
 * than the probes write is a gate that reports zero forever and looks calm doing it.
 */
export const PROBE_PREFIX = "OMP_PROBE";

function renderProbePart(part: unknown): string {
	if (typeof part === "string") return part;
	try {
		// `undefined` and functions have no JSON form; `String` is the honest fallback.
		return JSON.stringify(part) ?? String(part);
	} catch {
		// Circular structures throw here, and a probe must never be the thing that fails.
		return String(part);
	}
}

/**
 * Write one tagged, always-surviving line to the chunk's captured output.
 *
 * Parts are joined with spaces; strings are used verbatim so a caller can pass a
 * pre-formatted message without it appearing as a quoted string in the log.
 */
export function probe(...parts: readonly unknown[]): void {
	const line = `${PROBE_PREFIX} ${parts.map(renderProbePart).join(" ")}\n`;
	// `_rawDebug` is deliberately invoked off the typed shape rather than
	// `process._rawDebug` directly: it is an internal of the Node/Bun process object, so
	// this keeps working — and this keeps *not* silently becoming a no-op — if a runtime
	// drops it. A probe that writes nowhere is the failure this module exists to prevent,
	// so the absence is a real branch with a real fallback rather than an optional call.
	const rawDebug = (process as { _rawDebug?: (message: string) => void })._rawDebug;
	if (typeof rawDebug === "function") {
		rawDebug.call(process, line);
		return;
	}
	process.stderr.write(line);
}
