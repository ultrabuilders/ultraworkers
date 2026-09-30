/**
 * Redaction for anything that leaves the machine — a bug report bundle, a crash
 * record, a summary handed to a model.
 *
 * Self-contained by design: no imports, so any caller can use it from a dying
 * process without pulling a dependency graph along.
 */

export const REDACTED = "<redacted>";

const SENSITIVE_KEY = /(?:^|[-_])(api[-_]?key|secret|token|password|passwd|credential|authorization|cookie)(?:$|[-_])/i;

/**
 * The `.replace()` inserts word separators into camelCase before the pattern is
 * tested, and those separators are the only thing the `(?:^|[-_])` boundary can
 * hook onto.
 *
 * A bare `apiKey` matches on its own, because `SENSITIVE_KEY` is
 * case-insensitive — it would be caught with or without the normalisation. What
 * does not match without it is a *prefixed* camelCase key: in `myApiKey` the
 * `Api` follows a letter rather than a separator, so nothing matches and the
 * secret sails through unredacted.
 */
export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY.test(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

/** Strip credentials and secret-looking query parameters from a URL. */
export function redactUrl(value: string): string {
	// Nested scheme (`scheme://user:pass@host?token=…`): recurse on the inner URL.
	const nested = /^([a-z][a-z0-9+.-]*:)([a-z][a-z0-9+.-]*:\/\/.*)$/i.exec(value);
	if (nested) return `${nested[1]}${redactUrl(nested[2])}`;
	try {
		const url = new URL(value);
		let changed = false;
		if (url.username || url.password) {
			url.username = "";
			url.password = "";
			changed = true;
		}
		for (const key of url.searchParams.keys()) {
			if (isSensitiveKey(key)) {
				url.searchParams.set(key, REDACTED);
				changed = true;
			}
		}
		return changed ? url.toString() : value;
	} catch {
		return value;
	}
}

/** Copy a JSON value while removing values that may contain credentials. */
export function redactJsonValue(value: unknown): unknown {
	// Required, not defensive: JSON.parse(JSON.stringify(undefined)) throws.
	if (value === undefined) return undefined;
	return JSON.parse(
		JSON.stringify(value, (key, child: unknown) => {
			if (child !== null && child !== undefined && isSensitiveKey(key)) return REDACTED;
			return typeof child === "string" ? redactUrl(child) : child;
		}),
	);
}
