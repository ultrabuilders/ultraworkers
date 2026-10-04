/**
 * Turn an unknown thrown value into a message string, without ever throwing.
 *
 * The idiom this replaces —
 *
 * ```ts
 * value instanceof Error ? value.message : String(value)
 * ```
 *
 * — is correct for every value a normal caller throws, and wrong for the ones
 * that actually reach an error path. Both of its property reads can throw:
 * `value.message` is a getter that an object is free to define as anything,
 * and `String(value)` invokes `toString`/`Symbol.toPrimitive`, which a Proxy
 * or a revoked object makes throw. The result is an error handler that replaces
 * the real failure with a second, unrelated one — and the second one names the
 * wrong thing, so the report gets investigated in the wrong place.
 *
 * The remaining ~900 occurrences of the raw idiom are deliberate technical
 * debt, not an oversight: the four call sites migrated so far (agent loop,
 * session, TUI error block, logger) are the ones whose failure text a user
 * actually reads. The rest keep the idiom until they have a reason to move.
 */

/**
 * Describe `value` as a string. Never throws, for any input.
 *
 * Each property access gets its own guard so a failure in one cannot mask the
 * value another would have produced — a throwing `message` getter still leaves
 * the object describable via `name`, and a hostile `toString` still leaves
 * `message` readable.
 */
export function normalizeErrorMessage(value: unknown): string {
	// `instanceof` walks the prototype chain, which is a property access — so on
	// a revoked Proxy it throws, which is the one input this function is
	// required to survive. It gets its own guard rather than being assumed safe.
	if (isErrorLike(value)) {
		// `Error.prototype.message` is a plain own property, so this read is safe
		// for a genuine Error — but a subclass may shadow it with a getter, and
		// nothing stops `Error` being proxied, so the guard stays.
		return readProperty(value, "message") ?? describe(value);
	}
	// A non-Error can still be worth more than "[object Object]": an object
	// carrying a `name` and a throwing `message` getter is exactly the shape a
	// broken error-like value takes, and the name is the one readable field.
	return readProperty(value, "name") ?? describe(value);
}

/** `instanceof Error`, guarded against a prototype walk that throws. */
function isErrorLike(value: unknown): value is Error {
	if (value === null || (typeof value !== "object" && typeof value !== "function")) return false;
	try {
		return value instanceof Error;
	} catch {
		return false;
	}
}

/**
 * The last-resort description, and the only step that is itself unguarded.
 *
 * `Object.prototype.toString.call` is used rather than `String(value)` because
 * it does not consult `toString`, `Symbol.toPrimitive` or `valueOf` on the
 * value — it only reads the internal `[[Class]]` slot. That is what makes it
 * safe against a throwing `toString` and against a revoked Proxy, both of
 * which make the `String()` form throw.
 */
function describe(value: unknown): string {
	try {
		return Object.prototype.toString.call(value);
	} catch {
		// Revoked Proxy: even the internal slot read can throw. There is nothing
		// left to inspect, and returning a string beats propagating a failure
		// out of a function whose entire contract is that it does not throw.
		return "[uninspectable value]";
	}
}

/** Read one string-ish property, or `undefined` if it is absent or unreadable. */
function readProperty(value: unknown, key: string): string | undefined {
	try {
		const raw = (value as Record<string, unknown>)[key];
		return typeof raw === "string" ? raw : undefined;
	} catch {
		// A throwing getter. The caller's error is the one that matters, so this
		// deliberately reports nothing rather than reporting the getter's.
		return undefined;
	}
}
