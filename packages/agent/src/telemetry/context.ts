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

/**
 * The minimum a backend must supply for omp to record against a span.
 *
 * Only the MUTATING surface is required. The readable properties are optional
 * because OTEL's own `Span` interface does not expose them — `name`,
 * `startTime`, `attributes` and `endTime` are not on the public type, only on
 * its implementation. Requiring them would have made this contract
 * unsatisfiable from the very backend it has to support, which is a bug I only
 * found by compiling an adapter rather than by reading the interface.
 */
export interface TelemetrySpan {
	readonly name?: string;
	/** Unix epoch milliseconds. */
	readonly startTime?: number;
	/** Unix epoch milliseconds. */
	readonly endTime?: number;
	readonly attributes?: TelemetryAttributes;
	readonly status?: SpanStatus;
	readonly statusMessage?: string;
	setAttribute(key: string, value: TelemetryAttributeValue | undefined): void;
	setAttributes(attributes: TelemetryAttributes): void;
	addEvent(name: string, attributes?: TelemetryAttributes): void;
	recordException(error: unknown): void;
	setStatus(status: SpanStatus, message?: string): void;
	end(endTime?: number): void;
}

// ── Adapter ──────────────────────────────────────────────────────────────
//
// Proof that the contract is actually implementable, not just describable.
// `TelemetrySpan.status` is a string union while OTEL's `Span.status` is an
// object — they are deliberately NOT the same shape, which is what "vendor
// neutral" has to mean. This is where the translation lives, so a call site
// depends on the contract and never on OTEL's shape.
import type { Attributes, AttributeValue, Span } from "@opentelemetry/api";
/**
 * The one real incompatibility between the contract and OTEL: the contract's
 * arrays are `readonly` (callers should not be able to mutate what they passed),
 * and OTEL's are mutable. Copy across, rather than widening the contract to match
 * one vendor — that would defeat the point of having it.
 */
function toVendorValue(value: TelemetryAttributeValue): AttributeValue {
	return Array.isArray(value) ? ([...value] as AttributeValue) : (value as AttributeValue);
}

/** Copy a whole attribute map across, dropping the keys OTEL would reject. */
function vendorAttributes(attributes: TelemetryAttributes | undefined): Attributes | undefined {
	if (!attributes) return undefined;
	const present: Record<string, AttributeValue> = {};
	for (const [key, value] of Object.entries(attributes)) {
		if (value !== undefined) present[key] = toVendorValue(value);
	}
	return present;
}

/** Wrap an OTEL span in the vendor-neutral contract. */
export function toTelemetrySpan(span: Span): TelemetrySpan {
	return {
		// OTEL's Span interface does not expose `status` either, so the contract's
		// status is tracked by the adapter rather than read back off the vendor type.
		// `setStatus` is the one direction every backend guarantees.
		status: "unset",
		// `undefined` means "drop this key" in the contract; OTEL's setter rejects it.
		// Dropping is the translation, and it is the whole reason this layer exists.
		// `undefined` means "remove this key" in the contract, so it is NOT forwarded:
		// OTEL's setter would reject it, and the SDK's drop semantic is what the
		// contract is describing.
		setAttribute: (key, value) => {
			if (value === undefined) span.setAttribute(key, undefined as never);
			else span.setAttribute(key, toVendorValue(value));
		},
		setAttributes: attributes => span.setAttributes(vendorAttributes(attributes) ?? {}),
		addEvent: (name, attributes) => span.addEvent(name, vendorAttributes(attributes) ?? {}),
		recordException: error => span.recordException(error as Error),
		setStatus: (status, message) =>
			span.setStatus({ code: status === "error" ? 2 : status === "ok" ? 1 : 0, message }),
		end: endTime => span.end(endTime),
	};
}
