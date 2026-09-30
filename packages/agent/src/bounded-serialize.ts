/**
 * Bounded serialization for anything that leaves the process as telemetry.
 *
 * A span attribute is not a log line: it is exported, retained, and read by
 * people who were not there when it was written. An error payload is exactly the
 * wrong thing to hand that path unbounded — it can carry a whole request body, and
 * a request body can carry anything the user typed.
 *
 * Two budgets, both enforced by TRUNCATION rather than by throwing. A telemetry
 * helper that throws takes down the call it was instrumenting, which is the
 * opposite of what instrumentation is for.
 *
 * A key outside the allowlist is the one case that is NOT truncation. It returns
 * `ok: false` and the caller drops the whole export. Silently keeping half of a
 * payload whose shape you do not recognise is how a secret ends up retained
 * forever because the code that would have noticed it was busy cutting strings to
 * length.
 */

export interface BoundedSerializeOptions {
	/** Nesting levels to descend before the value is summarised as a depth marker. */
	readonly maxDepth: number;
	/** Serialized-size budget in bytes. */
	readonly maxBytes: number;
	/** Keys permitted to appear at any level. Anything else fails closed. */
	readonly allowlist: readonly string[];
}

export interface BoundedSerializeOk {
	readonly ok: true;
	readonly value: unknown;
	/** True when either budget forced a cut. */
	readonly truncated: boolean;
}

export interface BoundedSerializeRejected {
	readonly ok: false;
	readonly reason: "key-not-allowlisted";
	readonly key: string;
}

export type BoundedSerializeResult = BoundedSerializeOk | BoundedSerializeRejected;

const TRUNCATED = "[truncated]";
const DEPTH_MARKER = "[max depth reached]";

/**
 * Serialize `value` within a depth and byte budget, allowing only listed keys.
 *
 * Never throws. Exceeding a budget truncates; encountering a disallowed key
 * returns `ok: false` so the caller can refuse to export rather than export a
 * partially-understood payload.
 */
export function boundedSerialize(value: unknown, options: BoundedSerializeOptions): BoundedSerializeResult {
	const allowed = new Set(options.allowlist);
	let truncated = false;
	// A sentinel rather than a union return, because the walker returns `unknown`
	// and narrowing a discriminated union back out of that costs more than the
	// check it would perform.
	let rejectedKey: string | undefined;

	const walk = (input: unknown, depth: number): unknown => {
		if (rejectedKey !== undefined) return undefined;
		if (depth > options.maxDepth) {
			truncated = true;
			return DEPTH_MARKER;
		}
		if (input === null || typeof input !== "object") {
			if (typeof input === "string" && input.length > options.maxBytes) {
				truncated = true;
				return input.slice(0, options.maxBytes);
			}
			if (typeof input === "bigint") return input.toString();
			return input;
		}
		if (Array.isArray(input)) {
			return input.map(item => walk(item, depth + 1));
		}
		const out: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(input as Record<string, unknown>)) {
			if (!allowed.has(key)) {
				rejectedKey = key;
				return undefined;
			}
			out[key] = walk(item, depth + 1);
		}
		return out;
	};

	const walked = walk(value, 0);
	if (rejectedKey !== undefined) {
		return { ok: false, reason: "key-not-allowlisted", key: rejectedKey };
	}

	// The byte budget is enforced on the VALUE, and the serialized form is the
	// MEASUREMENT of it — a value can be small as a tree and large as JSON.
	//
	// It cannot be enforced by slicing the serialized text and re-parsing: a prefix
	// of valid JSON is not valid JSON, so that throws from inside a telemetry
	// helper, which is the one place a throw is least welcome.
	const text = safeStringify(walked);
	if (text.length <= options.maxBytes) return { ok: true, value: walked, truncated };

	// Over budget: summarise, and size the preview so the SUMMARY also fits. A
	// preview of exactly `maxBytes` would be a payload LARGER than the budget it
	// exists to enforce, which is the failure this whole helper is about.
	let preview = options.maxBytes;
	let summary = { truncated: true, bytes: text.length, preview: text.slice(0, preview) };
	for (let attempt = 0; attempt < 4; attempt++) {
		const size = safeStringify(summary).length;
		if (size <= options.maxBytes) break;
		preview = Math.max(0, preview - (size - options.maxBytes));
		summary = { truncated: true, bytes: text.length, preview: text.slice(0, preview) };
	}
	return { ok: true, value: summary, truncated: true };
}

/**
 * `JSON.stringify` with the two failure modes that matter here removed: a
 * BigInt or a cycle throws, and a throw from telemetry instrumentation is a
 * crash in the code being instrumented.
 */
function safeStringify(value: unknown): string {
	const seen = new WeakSet<object>();
	try {
		return (
			JSON.stringify(value, (_key, item: unknown) => {
				if (typeof item === "bigint") return item.toString();
				if (typeof item === "object" && item !== null) {
					if (seen.has(item)) return "[circular]";
					seen.add(item);
				}
				return item;
			}) ?? "null"
		);
	} catch {
		return JSON.stringify(TRUNCATED);
	}
}
