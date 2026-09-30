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
 * The `.replace()` is the whole point of this function: camelCase is normalised
 * to snake_case *before* the pattern is tested. Without it `apiKey` does not
 * match `SENSITIVE_KEY`, and the most common spelling in this project's own
 * config sails through unredacted.
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
