import { describe, expect, it } from "bun:test";
import type {
	SpanStatus,
	TelemetryAttributeValue,
	TelemetryAttributes,
	TelemetrySpan,
} from "@oh-my-pi/pi-agent-core/telemetry/context";

// Contract for the vendor-neutral telemetry types.
//
// These exist so a second backend is an adapter rather than an edit of every call
// site. The attribute rules are NOT invented: they are measured from
// @opentelemetry/api, because omp's attributes must stay assignable to whatever
// exporter is in use — a neutral type the current exporter could not satisfy
// would be a second source of truth rather than a contract.
//
// The three tiers pull in opposite directions, so each is pinned separately. The
// failure they prevent is quiet: widening the VALUE type to include null/undefined
// compiles fine and then produces what OTEL documents as undefined behaviour.

describe("TelemetryAttributeValue", () => {
	it("accepts the three primitives and arrays of them", () => {
		const accepted: TelemetryAttributeValue[] = ["a", 1, true, ["a", "b"], [1, 2], [true, false]];
		expect(accepted).toHaveLength(6);
	});

	it("allows null and undefined INSIDE an array, as OTEL does", () => {
		// Measured: `Array<null | undefined | string>` and friends. This is the tier
		// that is easy to lose when someone tightens the array element type.
		const withHoles: TelemetryAttributeValue[] = [
			["a", null, undefined],
			[1, null],
			[true, undefined],
		];
		expect(withHoles).toHaveLength(3);
	});

	it("allows an attribute KEY to map to undefined, which OTEL drops", () => {
		const attributes: TelemetryAttributes = { present: "yes", dropped: undefined };
		expect("dropped" in attributes).toBe(true);
		expect(attributes.dropped).toBeUndefined();
	});

	it("does NOT allow a bare null or undefined value", () => {
		// Asserted as a type error on purpose: `@ts-expect-error` fails the BUILD if the
		// type is ever widened, which a runtime assertion cannot detect at all.
		// @ts-expect-error null is not an attribute value — OTEL calls this undefined behavior
		const bare: TelemetryAttributeValue = null;
		// @ts-expect-error undefined is not an attribute value either
		const alsoBare: TelemetryAttributeValue = undefined;
		expect([bare, alsoBare]).toHaveLength(2);
	});
});

describe("SpanStatus", () => {
	it("is a plain union, so describing a status needs no vendor import", () => {
		// The point of the module: a call site must not need a vendor runtime value
		// merely to say the span failed.
		const statuses: SpanStatus[] = ["unset", "ok", "error"];
		expect(statuses).toHaveLength(3);
	});
});

describe("TelemetrySpan", () => {
	it("requires no OTEL symbol, so an adapter can satisfy it", () => {
		// A structural stand-in. If the interface ever picks up a vendor-only member
		// that a non-OTEL backend cannot implement, this stops compiling — which is the
		// failure that would quietly make the contract vendor-shaped again.
		const span: TelemetrySpan = {
			name: "probe",
			startTime: 0,
			attributes: { a: 1 },
			status: "unset",
			setAttribute: () => {},
			setAttributes: () => {},
			addEvent: () => {},
			recordException: () => {},
			setStatus: () => {},
			end: () => {},
		};
		expect(span.name).toBe("probe");
	});
});

describe("toTelemetrySpan", () => {
	it("translates a vendor span and drops the keys OTEL would reject", async () => {
		// The adapter is where the contract earns its keep: OTEL's setter takes no
		// `undefined` value, and the contract uses `undefined` to mean "drop this
		// key". A readonly array is also not a vendor array.
		const { toTelemetrySpan } = await import("@oh-my-pi/pi-agent-core/telemetry/context");
		const written: Record<string, unknown> = {};
		const statuses: unknown[] = [];
		const fake = {
			setAttribute: (k: string, v: unknown) => {
				written[k] = v;
			},
			setAttributes: (a: unknown) => Object.assign(written, a),
			addEvent: () => {},
			recordException: () => {},
			setStatus: (s: unknown) => statuses.push(s),
			end: () => {},
		} as never;

		const span = toTelemetrySpan(fake);
		span.setAttribute("kept", ["a", null]);
		span.setAttributes({ present: 1, absent: undefined });
		span.setStatus("error", "boom");

		// Readonly array copied into a mutable one rather than rejected.
		expect(written.kept).toEqual(["a", null]);
		// `absent` never reaches the vendor at all.
		expect("absent" in written).toBe(false);
		expect(written.present).toBe(1);
		// "error" maps to OTEL's ERROR code, not to the string.
		expect(statuses).toEqual([{ code: 2, message: "boom" }]);
	});
});
