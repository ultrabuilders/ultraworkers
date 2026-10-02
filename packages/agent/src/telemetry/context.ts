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

// ── Context ────────────────────────────────────────────────────────────

/**
 * What a telemetry backend hands the code that records against it.
 *
 * `startSpan` is a CALLBACK, not a begin/end pair. A begin/end pair leaks a span
 * whenever the body throws, and the leak is invisible: the caller sees its own
 * error and has no reason to suspect the span. A callback cannot leak, and it
 * hands the span to the body without threading it through a return value the
 * body might forget to produce.
 *
 * The span is closed when the body finishes, THROWING OR NOT — a body that throws
 * never reaches the statement after `startSpan`, so leaving closure to the caller
 * would leave the span open with nothing to attribute the error to. An explicit
 * `end()` inside the body is therefore redundant rather than required, and
 * `endTime` is stamped at the point the body actually finished.
 *
 * `fn` MAY return a promise, and nesting survives an `await`: the span stays
 * current for the whole body, so a span opened after an `await` nests under this
 * one rather than under whatever happened to be current. A backend must not
 * restore the enclosing span until the returned promise settles.
 */
export interface TelemetryContext {
	startSpan<T>(name: string, fn: (span: TelemetrySpan) => T): T;
}

/*
 * NOT the same contract as `@oh-my-pi/pi-telemetry`'s `TelemetryContext`, despite
 * the identical name. That one is `startSpan(options, cb): Promise<T>` with an
 * options object and an object-shaped `SpanStatus`; this one is synchronous, takes
 * a bare name, and uses the string union `"unset" | "ok" | "error"`. Neither is
 * assignable to the other.
 *
 * They are two different layers that share a name, not a fork that was left behind.
 * A size comparison is what makes them look like one: this file and
 * `packages/agent/src/telemetry.ts` hold the OTEL adapter (`toVendorValue`,
 * `vendorAttributes`, and the `@opentelemetry/api` imports below), while the
 * package holds the vendor-neutral type vocabulary and the typed-schema helpers.
 * Deleting either on the strength of "one is newer" would remove a working
 * contract — this one is covered by `telemetry-contract.test.ts` and
 * `telemetry-conformance.test.ts`.
 */

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
