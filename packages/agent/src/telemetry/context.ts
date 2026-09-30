/**
 * Vendor-neutral telemetry contract.
 *
 * omp speaks exactly one telemetry backend today, and every call site names OTEL
 * types directly. That means the only way to add a second backend is to edit every
 * call site — which is the opposite of a contract. These types describe what omp
 * actually needs, and an adapter translates.
 *
 * The attribute types are NOT a guess. They are measured from
 * `@opentelemetry/api`'s own `Attributes.d.ts`, because omp's existing OTEL
 * attributes must remain assignable — a "neutral" type that the current exporter
 * could not satisfy would be a second source of truth, not a contract.
 */

// ── Attribute values ────────────────────────────────────────────────────
//
// Measured from OTEL: `string | number | boolean | Array<null|undefined|T>`.
//
// The three tiers pull in OPPOSITE directions and the distinction is the whole
// point of this file:
//
//   - A value may NOT be null/undefined. OTEL's own doc calls that "undefined
//     behavior", so promising it here would be a contract nobody can keep.
//   - An attribute KEY may map to undefined — the SDK drops it. That is real
//     behaviour and adapters rely on it.
//   - INSIDE an array, null/undefined ARE allowed.
//
// Reading "accept null|undefined like OTEL" and widening the value type would
// open exactly the hole OTEL documents as undefined behavior.
export type TelemetryAttributeValue =
	| string
	| number
	| boolean
	| readonly (string | null | undefined)[]
	| readonly (number | null | undefined)[]
	| readonly (boolean | null | undefined)[];

/** Key may map to `undefined` — OTEL drops the attribute. */
export type TelemetryAttributes = Readonly<Record<string, TelemetryAttributeValue | undefined>>;

// ── Status ──────────────────────────────────────────────────────────────

/**
 * Mirrors OTEL's `SpanStatusCode` as a plain union.
 *
 * A string union rather than an enum so no consumer has to import a vendor
 * runtime value to describe a status, which is the coupling this module exists
 * to remove.
 */
export type SpanStatus = "unset" | "ok" | "error";

// ── Span ────────────────────────────────────────────────────────────────

/** The minimum a backend must supply for omp to record against a span. */
export interface TelemetrySpan {
	readonly name: string;
	/** Unix epoch milliseconds. */
	readonly startTime: number;
	/** Unix epoch milliseconds. */
	readonly endTime?: number;
	readonly attributes: TelemetryAttributes;
	readonly status: SpanStatus;
	readonly statusMessage?: string;
	setAttribute(key: string, value: TelemetryAttributeValue | undefined): void;
	setAttributes(attributes: TelemetryAttributes): void;
	addEvent(name: string, attributes?: TelemetryAttributes): void;
	recordException(error: unknown): void;
	setStatus(status: SpanStatus, message?: string): void;
	end(endTime?: number): void;
}
