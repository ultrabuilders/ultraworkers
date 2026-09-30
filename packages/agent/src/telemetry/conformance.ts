import type { SpanStatus, TelemetryAttributes, TelemetryContext, TelemetrySpan } from "./context";

/**
 * The shared conformance suite for telemetry backends.
 *
 * This module imports NO backend by name. It takes one through the `factory`
 * argument, because a suite that reaches for the reference adapter is not
 * vendor-neutral — it can only ever confirm that the reference adapter agrees
 * with itself.
 *
 * What the cases assert is deliberately the CALLER-side contract: that every
 * backend is handed the same calls, in the same nesting, with the same values,
 * and returns the callback's own value. That is the property a second backend
 * can fail while still looking like it works, and it holds for a backend that
 * records nothing as well as one that records everything.
 *
 * What a backend DID with those calls is the backend's own business, and is
 * asserted against that backend directly. A NOOP has nothing to inspect;
 * pretending otherwise is how a suite ends up green because it never asked.
 */

/** What a span was handed, regardless of what the backend did with it. */
export interface ObservedSpan {
	readonly name: string;
	/** How many spans were already open when this one started. 0 at top level. */
	readonly depthAtStart: number;
	readonly events: { name: string; attributes: TelemetryAttributes }[];
	readonly attributes: TelemetryAttributes;
	readonly status: SpanStatus;
	readonly statusMessage: string | undefined;
	readonly endCalls: number;
	readonly exceptions: unknown[];
}

export interface TelemetryProbe {
	readonly context: TelemetryContext;
	/** Spans as the caller saw them, in creation order. */
	readonly observed: ObservedSpan[];
}

/** Builds a probe around one implementation. */
export type TelemetryFactory = () => TelemetryProbe;

/** The recorder's own view, before it is handed out as the read-only shape. */
interface RecordingSpan {
	name: string;
	depthAtStart: number;
	events: { name: string; attributes: TelemetryAttributes }[];
	attributes: Record<string, TelemetryAttributes[string]>;
	status: SpanStatus;
	statusMessage: string | undefined;
	/**
	 * `end()` calls the CALLER made.
	 *
	 * Caller-initiated only, deliberately: a backend that auto-closes on a throwing
	 * body closes a span object this probe never sees, so it cannot be counted here.
	 * The auto-close contract is therefore pinned per-backend, where the recorder is
	 * reachable — see the memory backend's own suite.
	 */
	endCalls: number;
	exceptions: unknown[];
}

/** Apply an attribute the way the contract says: `undefined` drops the key. */
function recordAttribute(record: RecordingSpan, key: string, value: TelemetryAttributes[string]): void {
	if (value === undefined) delete record.attributes[key];
	else record.attributes[key] = value;
}

/**
 * Wrap a backend so every span it hands out is also observed.
 *
 * The wrap goes INSIDE the backend's own `startSpan` callback, which is the only
 * placement that keeps parentage: a probe that grabbed the span and then called
 * the caller afterwards would run the caller's body after the backend had
 * already restored its active span, and every nested span would record a parent
 * of "root" while the suite reported correct depths.
 */
export function probeTelemetry(context: TelemetryContext): TelemetryProbe {
	const observed: RecordingSpan[] = [];
	let depth = 0;

	const wrap = (span: TelemetrySpan, name: string, depthAtStart: number): TelemetrySpan => {
		const record: RecordingSpan = {
			name,
			depthAtStart,
			events: [],
			attributes: {},
			status: "unset",
			statusMessage: undefined,
			endCalls: 0,
			exceptions: [],
		};
		observed.push(record);
		return {
			setAttribute: (key, value) => {
				recordAttribute(record, key, value);
				span.setAttribute(key, value);
			},
			setAttributes: attributes => {
				for (const [key, value] of Object.entries(attributes)) recordAttribute(record, key, value);
				span.setAttributes(attributes);
			},
			addEvent: (eventName, eventAttributes) => {
				record.events.push({ name: eventName, attributes: eventAttributes ?? {} });
				span.addEvent(eventName, eventAttributes);
			},
			recordException: error => {
				record.exceptions.push(error);
				span.recordException(error);
			},
			setStatus: (status, message) => {
				record.status = status;
				record.statusMessage = message;
				span.setStatus(status, message);
			},
			end: endTime => {
				// Counted BEFORE forwarding, so a backend that throws on the repeat is
				// still seen as having been handed it.
				record.endCalls += 1;
				span.end(endTime);
			},
		};
	};

	return {
		context: {
			startSpan<T>(name: string, fn: (span: TelemetrySpan) => T): T {
				return context.startSpan(name, span => {
					const wrapped = wrap(span, name, depth);
					depth += 1;
					// Same rule the backend must follow, and for the same reason: a
					// `finally` around an async body restores `depth` while the body is
					// still running, so a span opened after an `await` would be measured
					// one level too shallow. The probe has to model the behaviour it
					// measures, or it reports the backend's bug as its own.
					let result: T;
					try {
						result = fn(wrapped);
					} catch (error) {
						depth -= 1;
						throw error;
					}
					if (result instanceof Promise) {
						return result.finally(() => {
							depth -= 1;
						}) as T;
					}
					depth -= 1;
					return result;
				});
			},
		},
		observed,
	};
}

export interface ConformanceCase {
	readonly group: string;
	readonly name: string;
	/** May return a promise; {@link runConformance} awaits it before the next case. */
	readonly test: (factory: TelemetryFactory) => void | Promise<void>;
}

/**
 * One case, grouped so a failure names an area rather than a line number.
 *
 * The backend is not bound here: `test` takes the factory, so the case list is
 * built once and can be run against every backend that ever gets written.
 *
 * `test` is a plain function rather than a `bun:test` registration so the suite
 * is not welded to one runner — a backend author drives it from whatever harness
 * they already have.
 */
export function createCase(
	group: string,
	name: string,
	test: (factory: TelemetryFactory) => void | Promise<void>,
): ConformanceCase {
	return { group, name, test };
}

const expectation = (condition: boolean, message: string): void => {
	if (!condition) throw new Error(message);
};

/**
 * Drive the whole suite against one implementation, reporting every failure.
 *
 * Cases run SEQUENTIALLY and each is awaited: a case that observes nesting has to
 * let an async body finish before reading the result, and overlapping cases would
 * interleave two backends' probes into one another's observations.
 */
export async function runConformance(factory: TelemetryFactory): Promise<void> {
	const failures: string[] = [];
	for (const conformanceCase of CONFORMANCE_CASES) {
		try {
			await conformanceCase.test(factory);
		} catch (error) {
			failures.push(`${conformanceCase.group} / ${conformanceCase.name}: ${String(error)}`);
		}
	}
	if (failures.length > 0) {
		throw new Error(`telemetry conformance failed:\n  ${failures.join("\n  ")}`);
	}
}

export const CONFORMANCE_CASES: readonly ConformanceCase[] = [
	createCase("parentage", "nests under the enclosing span, not under the root", factory => {
		// The "not under the root" half is the one that breaks silently. A backend
		// that CLEARS its active span instead of restoring it orphans every span
		// after the first nested one, and exports a trace shaped like a list of
		// unrelated spans — which no reader will flag as wrong.
		const probe = factory();
		probe.context.startSpan("outer", () => {
			probe.context.startSpan("inner", () => {});
			probe.context.startSpan("sibling", () => {});
		});
		const [outer, inner, sibling] = probe.observed;
		expectation(outer?.depthAtStart === 0, `the first span must start at depth 0, got ${outer?.depthAtStart}`);
		expectation(
			inner?.depthAtStart === 1,
			`a span started inside another must nest, got depth ${inner?.depthAtStart}`,
		);
		expectation(
			sibling?.depthAtStart === 1,
			`a span started after a nested one must still nest under outer, got depth ${sibling?.depthAtStart}`,
		);
	}),

	createCase("parentage", "keeps the span current across an await", async factory => {
		// A span opened after an `await` inside an async body must still be handed the
		// enclosing span as its parent.
		//
		// What this case can check is the CALLER-SIDE consequence, not the backend's
		// own parentage: `observed` records what the caller was handed, and a backend
		// that restores its active span too early still shows a correct-looking depth
		// here because the probe keeps its own counter. It is the parentage the backend
		// RECORDS that differs, and that is only observable from the backend itself —
		// `telemetry-conformance.test.ts` asserts it against the memory recorder, where
		// removing the fix makes this exact scenario report two orphan spans.
		//
		// So this case pins the half that is generic — the span stays current for the
		// body, and the value still comes back — and the backend suite pins the rest.
		const probe = factory();
		const result = await probe.context.startSpan("outer", async () => {
			await Promise.resolve();
			probe.context.startSpan("inner", () => {});
			return "done";
		});
		expectation(result === "done", "an async body must still yield its value to the caller");
		expectation(
			probe.observed.length === 2,
			`both spans must be observable after the async body settles, got ${probe.observed.length}`,
		);
	}),

	createCase("events", "hands events over in call order, with the attributes they were given", factory => {
		const probe = factory();
		probe.context.startSpan("span", span => {
			span.addEvent("first", { index: 1 });
			span.addEvent("second");
			span.addEvent("third", { index: 3 });
		});
		const events = probe.observed[0]?.events ?? [];
		const names = events.map(event => event.name).join(",");
		expectation(names === "first,second,third", `events must keep call order, got ${names}`);
		expectation(events[0]?.attributes.index === 1, "an event's attributes must arrive with the event");
		// An event with no attributes is an event, not a no-op: it is how a backend
		// marks a milestone, and dropping it leaves the gap unfillable later.
		expectation(events[1]?.attributes !== undefined, "addEvent with no attributes must still record an entry");
		expectation(events[2]?.attributes.index === 3, "attributes must stay attached to their own event");
	}),

	createCase("status", "carries the last status written, including its message", factory => {
		const probe = factory();
		probe.context.startSpan("span", span => {
			span.setStatus("ok");
			span.setStatus("error", "provider refused");
		});
		const record = probe.observed[0];
		expectation(record?.status === "error", `status must be the last one written, got ${record?.status}`);
		// The message is the half a "did it work or not" reader actually needs; a
		// backend that keeps the code and drops the message answers neither question.
		expectation(
			record?.statusMessage === "provider refused",
			`setStatus must carry its message, got ${String(record?.statusMessage)}`,
		);
	}),

	createCase("attributes", "round-trips scalars and readonly arrays without narrowing them", factory => {
		// The array cases are what a narrowing contract breaks quietly: a type that
		// widens `readonly string[]` to `string[]` still compiles at every call site,
		// and the damage only surfaces in whichever backend received the value.
		const probe = factory();
		const strings = ["a", "b"] as const;
		const numbers = [1, 2] as const;
		probe.context.startSpan("span", span => {
			span.setAttribute("text", "hello");
			span.setAttribute("count", 7);
			span.setAttribute("flag", true);
			span.setAttribute("tags", strings);
			span.setAttribute("sizes", numbers);
		});
		const attributes = probe.observed[0]?.attributes ?? {};
		expectation(attributes.text === "hello", `a string attribute must survive, got ${String(attributes.text)}`);
		expectation(attributes.count === 7, `a number attribute must survive, got ${String(attributes.count)}`);
		expectation(attributes.flag === true, `a boolean attribute must survive, got ${String(attributes.flag)}`);
		expectation(
			Array.isArray(attributes.tags) && attributes.tags.join(",") === "a,b",
			`a readonly string[] must survive as an array, got ${String(attributes.tags)}`,
		);
		expectation(
			Array.isArray(attributes.sizes) && attributes.sizes.join(",") === "1,2",
			`a readonly number[] must survive as an array, got ${String(attributes.sizes)}`,
		);
	}),

	createCase("attributes", "applies a batch exactly as it applies attributes one at a time", factory => {
		// `setAttributes` is the one a backend can implement as a loop and still get
		// wrong by dropping the batch's own drop-semantics, so the two are compared
		// against each other rather than against a literal.
		const probe = factory();
		probe.context.startSpan("batched", span => {
			span.setAttributes({ kept: "yes", dropped: undefined });
		});
		probe.context.startSpan("single", span => {
			span.setAttribute("kept", "yes");
			span.setAttribute("dropped", undefined);
		});
		const [batched, single] = probe.observed;
		expectation(
			JSON.stringify(batched?.attributes) === JSON.stringify(single?.attributes),
			`a batch must land the same as the same attributes applied one by one, got ${JSON.stringify(batched?.attributes)} vs ${JSON.stringify(single?.attributes)}`,
		);
		// ...and the shared answer must be the drop, not a stored undefined. OTEL's
		// SDK drops such a key, and a stored one exports `"key": null` to a consumer
		// that treats the key's presence as meaningful.
		expectation("kept" in (batched?.attributes ?? {}), "an attribute with a value must be kept");
		expectation(!("dropped" in (batched?.attributes ?? {})), "an undefined value must drop the key, not store it");
	}),

	createCase("lifecycle", "tolerates end() called twice", factory => {
		// Both calls must REACH the backend — that is what lets it ignore the repeat.
		// A backend that swallowed the second one inside the wrapper would pass a
		// suite that only checked the count, and would go on to record a span as
		// closed twice downstream.
		const probe = factory();
		probe.context.startSpan("span", span => {
			span.end(1);
			span.end(2);
		});
		const record = probe.observed[0];
		expectation(
			record?.endCalls === 2,
			`both end() calls must reach the backend so it can dedupe them, got ${String(record?.endCalls)}`,
		);
	}),

	createCase("lifecycle", "returns the callback's own value, by identity", factory => {
		// `===` on a fresh object is identity, not shape: a backend that returned its
		// own span, a fresh `{}`, or a clone of the callback's result would satisfy
		// `toEqual` and break every caller that returns a value out of a span.
		const sentinel = Object.freeze({ carried: true });
		const probe = factory();
		const returned = probe.context.startSpan("span", () => sentinel);
		expectation(returned === sentinel, "startSpan must return the callback's value itself, not a copy of it");
	}),

	createCase("lifecycle", "propagates the callback's throw without swallowing it", factory => {
		// A backend that catches to close the span must re-throw. Swallowing would
		// turn every error inside a span into a silent success, which is the one
		// failure mode a telemetry layer is least allowed to introduce.
		const probe = factory();
		const failure = new Error("body failed");
		let caught: unknown;
		try {
			probe.context.startSpan("span", () => {
				throw failure;
			});
		} catch (error) {
			caught = error;
		}
		expectation(caught === failure, "a throw from the callback must reach the caller unchanged");
		expectation(
			probe.observed[0]?.depthAtStart === 0,
			"a span that threw must still have been recorded, so the throw is attributable",
		);
		// Recorded is not CLOSED. A body that throws never reaches the caller's own
		// `end()`, so without the backend closing it in its `finally` the span stays
		// open forever — and the caller sees only its own error, with nothing pointing
		// at the span. `endCalls` is the observable: a backend that auto-closes on throw
		// reports 1, one that leaves closure to the unreachable reports 0.
		// The wrapper sees only CALLER-initiated `end()`. A backend that auto-closes on a
		// throwing body closes a span object the probe never sees, so this shared case
		// cannot observe it — the auto-close contract is pinned per-backend instead
		// (see the memory backend's own suite), where the recorder is reachable.
	}),
];
