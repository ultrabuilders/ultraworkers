/**
 * Turning a thrown value into text.
 *
 * The obvious one-liner — `error instanceof Error ? error.message : String(error)` —
 * looks total and is not. Both halves can throw: a `message` getter may throw, and
 * `String(error)` invokes `toString`/`Symbol.toPrimitive`, which may throw too. When
 * that happens the throw escapes a `catch` block that exists precisely to contain it,
 * so a value whose own coercion is broken takes the process down from inside error
 * handling. Three copies of that one-liner lived in this repo, byte-identical and
 * equally unsafe; they now share this function.
 *
 * Central rather than per-callsite because hardening that must be applied everywhere
 * cannot live in the three places that happened to need it — a fourth copy added
 * later would not know to be careful.
 */

/** Shown when a value cannot be turned into text by any route. */
export const UNPRINTABLE_THROWN_VALUE = "<unprintable thrown value>";

/**
 * Message text of any thrown value, safe to call from inside a `catch`.
 *
 * Never throws. A value that is an `Error` with a usable string `message` yields that
 * message, exactly as the one-liner did; everything else falls back to `String(...)`.
 *
 * Two behaviours differ from the one-liner, both on inputs it mishandled:
 *   - An `Error` with an empty `message` yields `String(error)` (`"Error"` or its
 *     subclass name) rather than `""`. An empty string is not a description of a
 *     failure, and it used to propagate into logs and wire errors as one.
 *   - A value whose `message`, `toString`, or `Symbol.toPrimitive` throws yields
 *     {@link UNPRINTABLE_THROWN_VALUE} instead of re-throwing from the catch block.
 */
export function errorMessage(error: unknown): string {
	if (error instanceof Error) {
		try {
			const { message } = error;
			if (typeof message === "string" && message.length > 0) return message;
		} catch {
			// A throwing `message` getter is the case this whole function exists for.
			// Fall through to the coercion attempt below rather than propagating.
		}
	}
	try {
		const coerced = String(error);
		if (coerced.length > 0) return coerced;
	} catch {
		// `toString`/`Symbol.toPrimitive` threw, or `String()` was handed a symbol-ish
		// value it cannot coerce. Nothing left to try.
	}
	return UNPRINTABLE_THROWN_VALUE;
}
