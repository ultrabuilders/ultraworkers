// Ported from opencoding's `packages/workflow-engine/src/engine/structuredOutput.ts`
// (MIT, Copyright (c) 2026 opencoding) — Ajv → omptype. The JSON Schema dialect,
// the weak cache keyed by schema object, and the `{ valid, errors }` shape are
// preserved; see the bead for the measured mapping and the one fidelity loss.
import { fromJsonSchema, type BaseType } from "@oh-my-pi/omptype";

const cache = new WeakMap<object, BaseType>();

/** JSON Schema `type` values. A bare string outside this set is a typo, not a schema. */
const JSON_SCHEMA_TYPES: ReadonlySet<string> = new Set([
	"array",
	"boolean",
	"integer",
	"null",
	"number",
	"object",
	"string",
]);

/**
 * Guards the importer is too lenient to enforce.
 *
 * `fromJsonSchema` documents that it ignores unknown and non-structural keywords,
 * which is the right call for a lenient importer and the wrong one here: Ajv
 * rejected a schema it could not compile, and callers rely on that — an
 * uncompilable schema must fail at registration, not silently validate nothing
 * at run time. `$async` is the same story: Ajv flagged it and the engine is
 * synchronous end to end.
 */
function assertSchemaIsUsable(schema: object): void {
	const record = schema as Record<string, unknown>;
	if (record.$async === true) {
		throw new Error("Async JSON schemas are not supported");
	}
	// Only the single-string form is checked. JSON Schema also allows an array of
	// types, and rejecting one this cannot judge would reject a valid schema.
	const type = record.type;
	if (typeof type === "string" && !JSON_SCHEMA_TYPES.has(type)) {
		throw new Error(`Unsupported JSON Schema type: ${type}`);
	}
}

function getValidator(schema: object): BaseType {
	const cached = cache.get(schema);
	if (cached) return cached;

	assertSchemaIsUsable(schema);
	const validator = fromJsonSchema(schema);
	cache.set(schema, validator);
	return validator;
}

/** Compile a JSON Schema up front so configuration errors fail before journal replay or backend execution. */
export function assertValidJsonSchema(schema: object): void {
	getValidator(schema);
}

/**
 * Validate agent output against a JSON Schema (compiled up front, cached by schema object).
 * The engine performs secondary validation on the schema result returned by the adapter, and uses it for tests.
 *
 * `assert` is used rather than `run` because `run` returns `{}` for a failing value
 * and reports no reason — the `errors` array would be empty for every rejection.
 * It collects all violations in one throw, matching Ajv's `allErrors: true`.
 */
export function validateAgainstSchema(value: unknown, schema: object): { valid: boolean; errors: string[] } {
	// Compiled OUTSIDE the try: a schema that will not compile is a configuration
	// error, not a rejection of `value`, and must not be reported as one.
	const validator = getValidator(schema);
	try {
		validator.assert(value);
		return { valid: true, errors: [] };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { valid: false, errors: message.split("\n").filter(line => line.length > 0) };
	}
}
