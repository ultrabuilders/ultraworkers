/**
 * Schema check for values an extension hook returns.
 *
 * Every hook result crosses into host control flow — a `session_stop` result
 * decides whether the session continues, a `session_before_*` result cancels a
 * switch. Until now those values were taken on trust and cast, so an extension
 * returning the wrong shape produced strange session behaviour with no code
 * naming the extension at fault. This turns that into a diagnostic.
 *
 * Two rules shape everything here:
 *
 * 1. **Unknown fields pass.** An extension may attach its own bookkeeping to a
 *    result. Rejecting unrecognised keys would be a breaking change against
 *    every extension already published, so only *known* fields with the wrong
 *    type are rejected.
 * 2. **Codes are stable.** Host control flow and other tests branch on them, so
 *    renaming one is a breaking change. Add a code rather than repurpose one.
 */
import type { SessionCompactingResult, SessionStopEventResult } from "../shared-events";

/**
 * Stable failure codes. See rule 2 above before renaming anything.
 */
export const HOOK_RESULT_CODES = ["hook-result-not-an-object", "hook-result-invalid-field"] as const;

export type HookResultCode = (typeof HOOK_RESULT_CODES)[number];

/**
 * The rejection branch on its own, so a caller reporting a failure does not have
 * to re-narrow what {@link validateHookResult} already told it.
 */
export interface HookResultRejection {
	readonly ok: false;
	readonly code: HookResultCode;
	readonly detail: string;
}

export type HookResultValidation = { readonly ok: true } | HookResultRejection;

const OK: HookResultValidation = { ok: true };

function invalid(code: HookResultCode, detail: string): HookResultRejection {
	return { ok: false, code, detail };
}

function typeName(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "array";
	return typeof value;
}

/** A known field is present but carries the wrong type. */
function check(field: string, value: unknown, expected: "boolean" | "string"): HookResultValidation {
	if (typeof value !== expected) {
		return invalid("hook-result-invalid-field", `\`${field}\` must be a ${expected}, received ${typeName(value)}`);
	}
	return OK;
}

/**
 * Validate a hook return value against the shape its event consumes.
 *
 * `event` is the event type string. Unknown event types pass: this guards the
 * shapes the host actually reads, and an event this version does not know about
 * is not this validator's to judge.
 */
export function validateHookResult(event: string, value: unknown): HookResultValidation {
	// `undefined` is a legitimate "this hook declines to act" answer and is what
	// every handler that returns nothing produces. Arrays are rejected because a
	// result is an options bag, and treating one as such silently drops every field.
	if (value === undefined || value === null) return OK;
	if (typeof value !== "object" || Array.isArray(value)) {
		return invalid("hook-result-not-an-object", `expected an options object, received ${typeName(value)}`);
	}

	const record = value as Record<string, unknown>;

	if (event.startsWith("session_before_")) {
		if (record.cancel !== undefined) {
			const verdict = check("cancel", record.cancel, "boolean");
			if (!verdict.ok) return verdict;
		}
	}

	if (event === "session.compacting") {
		if (record.context !== undefined) {
			if (!Array.isArray(record.context) || record.context.some(line => typeof line !== "string")) {
				return invalid("hook-result-invalid-field", "`context` must be an array of strings");
			}
		}
		if (record.prompt !== undefined) {
			const verdict = check("prompt", record.prompt, "string");
			if (!verdict.ok) return verdict;
		}
	}

	if (event === "session_stop") {
		if (record.continue !== undefined) {
			const verdict = check("continue", record.continue, "boolean");
			if (!verdict.ok) return verdict;
		}
		if (record.additionalContext !== undefined) {
			const verdict = check("additionalContext", record.additionalContext, "string");
			if (!verdict.ok) return verdict;
		}
		if (record.reason !== undefined) {
			const verdict = check("reason", record.reason, "string");
			if (!verdict.ok) return verdict;
		}
		if (record.decision !== undefined && record.decision !== "block") {
			// The type is the literal `"block"`, so anything else is a decision the
			// host has no branch for and would otherwise read as "let it stop".
			return invalid(
				"hook-result-invalid-field",
				`\`decision\` must be "block", received ${JSON.stringify(record.decision)}`,
			);
		}
	}

	return OK;
}

// Re-exported so callers can name the shapes without a second import path.
export type { SessionCompactingResult, SessionStopEventResult };
