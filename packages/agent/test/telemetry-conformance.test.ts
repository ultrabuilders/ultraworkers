import { describe, expect, it } from "bun:test";
import {
	CONFORMANCE_CASES,
	probeTelemetry,
	runConformance,
	type TelemetryFactory,
} from "@oh-my-pi/pi-agent-core/telemetry/conformance";
import { createMemoryTelemetryContext } from "@oh-my-pi/pi-agent-core/telemetry/memory";
import { NOOP_SPAN, NOOP_TELEMETRY_CONTEXT } from "@oh-my-pi/pi-agent-core/telemetry/noop";

// The shared suite, run against BOTH shipped backends.
//
// `telemetry-contract.test.ts` pins the types and the OTEL adapter. This file
// pins the two contexts and the suite itself. The split matters: a backend is
// not conformant because the module compiles, and the suite is not vendor-neutral
// because it only ever met one implementation.
//
// Imports are all DEEP. The package root re-exports these modules, and importing
// through it would pull the whole barrel — including the 86KB OTEL telemetry
// module — into a test about a contract that must not need it.

const memoryFactory: TelemetryFactory = () => probeTelemetry(createMemoryTelemetryContext());
const noopFactory: TelemetryFactory = () => probeTelemetry(NOOP_TELEMETRY_CONTEXT);

describe("conformance suite", () => {
	it("runs green on the memory backend", async () => {
		await runConformance(memoryFactory);
	});

	it("runs green on the NOOP backend", async () => {
		// A backend that records nothing still has to nest, forward, and return the
		// callback's value. If NOOP fails here, it is not a no-op — it is a backend
		// that changes what the surrounding code does.
		await runConformance(noopFactory);
	});

	it("covers parentage, events, status, attributes, end() and the return value", () => {
		// The case list is the deliverable a backend author reads. If a group is
		// renamed or dropped, this stops naming what the suite is supposed to check.
		const groups = CONFORMANCE_CASES.map(conformanceCase => conformanceCase.group);
		expect([...new Set(groups)].sort()).toEqual(["attributes", "events", "lifecycle", "parentage", "status"]);
		expect(CONFORMANCE_CASES.length).toBeGreaterThanOrEqual(7);
	});

	it("names every case, so a failure report is readable without a stack trace", () => {
		const unnamed = CONFORMANCE_CASES.filter(c => c.group === "" || c.name === "");
		expect(unnamed).toEqual([]);
	});

	it("reports every failing case at once instead of stopping at the first", async () => {
		// A suite that throws on the first failure reports one problem per run, which
		// is how a seven-case suite gets "fixed" six times.
		//
		// `observed` is a GETTER, and that is load-bearing: `probeTelemetry` returns
		// its live array, so mapping it eagerly would map an empty array before any
		// case had run, and this would still go green while proving nothing about
		// multi-failure reporting.
		const broken: TelemetryFactory = () => {
			const probe = probeTelemetry(NOOP_TELEMETRY_CONTEXT);
			return {
				context: probe.context,
				get observed() {
					return probe.observed.map(record => ({ ...record, depthAtStart: 99, status: "unset" as const }));
				},
			};
		};
		let message = "";
		try {
			// Awaited: `runConformance` is async, and an unawaited call would leave
			// `message` empty and every assertion below passing on nothing.
			await runConformance(broken);
		} catch (error) {
			message = String(error);
		}
		expect(message).toContain("parentage");
		expect(message).toContain("status");
		// The untouched groups really did run, so this is a report and not a crash.
		expect(message).not.toContain("conformance failed: undefined");
	});
});

describe("NOOP backend", () => {
	it("returns the callback's value bit-for-bit", () => {
		// `toBe` is identity, not shape. A no-op that returned its own span, a fresh
		// `{}`, or a copy of the callback's result would pass `toEqual` and break
		// every caller that returns a value out of a span — which is every caller,
		// since the callback form is the only way to get a span.
		const sentinel = { carried: true };
		expect(NOOP_TELEMETRY_CONTEXT.startSpan("span", () => sentinel)).toBe(sentinel);

		const primitive = 42;
		expect(NOOP_TELEMETRY_CONTEXT.startSpan("span", () => primitive)).toBe(primitive);
	});

	it("records nothing, and says so by staying frozen and unchanged", () => {
		// Every method is called and the span is compared afterwards. A no-op that
		// quietly accumulated a status or an attribute would be a backend that costs
		// something to carry and reports something untrue.
		expect(Object.isFrozen(NOOP_SPAN)).toBe(true);
		const before = JSON.stringify({ ...NOOP_SPAN });

		NOOP_SPAN.setAttribute("key", "value");
		NOOP_SPAN.setAttributes({ a: 1, b: ["x"] });
		NOOP_SPAN.addEvent("event", { index: 1 });
		NOOP_SPAN.recordException(new Error("ignored"));
		NOOP_SPAN.setStatus("error", "pretend");
		NOOP_SPAN.end(1);
		NOOP_SPAN.end(2);

		expect(JSON.stringify({ ...NOOP_SPAN })).toBe(before);
		expect(NOOP_SPAN.status).toBe("unset");
		expect(NOOP_SPAN.attributes).toBeUndefined();
		expect(NOOP_SPAN.endTime).toBeUndefined();
	});

	it("lets the callback's throw through untouched", () => {
		// Catching here to "still close the span" would swallow every error raised
		// inside a span. That is the single worst thing a telemetry layer can do, so
		// it is asserted directly rather than left to the suite.
		const failure = new Error("body failed");
		expect(() =>
			NOOP_TELEMETRY_CONTEXT.startSpan("span", () => {
				throw failure;
			}),
		).toThrow(failure);
	});
});

describe("memory backend", () => {
	it("keeps its own parentage intact while the probe wraps its spans", () => {
		// The probe wraps INSIDE the backend's `startSpan` callback, so the caller's
		// body still runs with the backend's active span set. A probe that grabbed
		// the span first and invoked the caller afterwards would report correct
		// depths to the suite — while the backend recorded every nested span as a
		// root. Nothing else in this file can catch that, because the memory cases
		// below drive the context directly and never go through the probe.
		const memory = createMemoryTelemetryContext(() => 1);
		const probe = probeTelemetry(memory);
		probe.context.startSpan("outer", () => {
			probe.context.startSpan("inner", () => {});
		});
		expect(memory.probe.spans().map(span => span.parent)).toEqual([undefined, "outer"]);
	});

	it("records a child under the span that encloses it", () => {
		// The suite proves the CALLER saw correct nesting. This proves the BACKEND
		// did: the suite's probe wraps inside the backend's callback, and a probe
		// that had grabbed the span first would report correct depths while every
		// span here recorded a parent of undefined.
		const context = createMemoryTelemetryContext(() => 1);
		context.startSpan("outer", () => {
			context.startSpan("inner", () => {});
		});
		const [outer, inner] = context.probe.spans();
		expect(outer?.parent).toBeUndefined();
		expect(inner?.parent).toBe("outer");
	});

	it("records a span opened after an await under the span that is still running", async () => {
		// The async twin of the case above, and the one that bites. The shared suite
		// CANNOT see this: its probe keeps its own depth counter, so it reports correct
		// nesting whether or not the backend restored its active span — removing the
		// `instanceof Promise` branch from `memory.ts` leaves the whole shared suite
		// green. Only the backend's own recorded parentage shows the difference:
		// before the fix both spans came back with `parent: undefined`.
		const context = createMemoryTelemetryContext(() => 1);
		await context.startSpan("outer", async () => {
			await Promise.resolve();
			context.startSpan("inner", () => {});
		});
		expect(context.probe.spans().map(span => span.parent)).toEqual([undefined, "outer"]);
	});

	it("stamps endTime when an async body settles, not when it returns its promise", async () => {
		// A backend that ends the span as soon as `fn` returns a pending promise stamps
		// `endTime` from a clock that has not moved: an 80ms body recorded as 0ms,
		// exported silently, so every duration downstream reads zero. Measured before
		// the fix — the recorder is the only place this is visible, and a duration that
		// is quietly wrong is worse than one that is missing.
		//
		// The clock is relative so the assertion is about the ORDER of the two stamps,
		// not about wall time: a fixed 80ms sleep would be a timing test.
		const t0 = performance.now();
		const context = createMemoryTelemetryContext(() => Math.round(performance.now() - t0));
		void context.startSpan("llm.call", async () => {
			await Bun.sleep(20);
		});
		// Read while the body is still running: an `end()` on return would already have
		// fired here, and `endTime` would be non-undefined.
		expect(context.probe.last()?.endTime).toBeUndefined();
		await Bun.sleep(80);
		const span = context.probe.last();
		expect(span?.startTime).toBeLessThan(span?.endTime ?? 0);
	});

	it("closes a span whose body threw, so it cannot leak with nothing to attribute it to", () => {
		// A throwing body never reaches the statement after `startSpan`, so a backend
		// that leaves closure to the caller leaves the span open forever — and the
		// caller sees only its own error. Measured before the fix: `ended: false,
		// endCalls: 0`, where an explicit `end()` gave `ended: true, endCalls: 1`.
		const context = createMemoryTelemetryContext(() => 1);
		expect(() =>
			context.startSpan("throwing", () => {
				throw new Error("body failed");
			}),
		).toThrow("body failed");
		const span = context.probe.last();
		expect(span?.ended).toBe(true);
		expect(span?.endCalls).toBe(1);
	});

	it("restores the enclosing span, so a later sibling is not orphaned", () => {
		const context = createMemoryTelemetryContext(() => 1);
		context.startSpan("outer", () => {
			context.startSpan("inner", () => {});
			context.startSpan("sibling", () => {});
		});
		expect(context.probe.spans().map(span => span.parent)).toEqual([undefined, "outer", "outer"]);
	});

	it("closes a span once, however many times end() is called", () => {
		// The one guarantee the shared suite structurally CANNOT make. Its probe only
		// sees that both calls were FORWARDED; whether the backend then honoured
		// the repeat is invisible from outside, so it is asserted here.
		const context = createMemoryTelemetryContext(() => 7);
		context.startSpan("span", span => {
			span.end(100);
			span.end(200);
		});
		const record = context.probe.last();
		expect(record?.endCalls).toBe(1);
		expect(record?.ended).toBe(true);
		// The FIRST end wins. A backend that let the second overwrite would drop the
		// timestamp that carried the real one and record the span as closing at 200.
		expect(record?.endTime).toBe(100);
	});

	it("takes its end time from the supplied clock, so a recorded trace is predictable", () => {
		// `Date.now()` here would make every assertion about timing either flaky or
		// absent, which is how a "recording backend" ends up with no test on it.
		let calls = 0;
		const context = createMemoryTelemetryContext(() => ++calls);
		context.startSpan("span", span => {
			span.end();
		});
		// Two readings: `startSpan` takes one for the start, `end()` takes the next.
		expect(context.probe.last()?.endTime).toBe(2);
	});

	it("keeps events, status, attributes and exceptions for a caller to read back", () => {
		const context = createMemoryTelemetryContext(() => 1);
		const failure = new Error("tool blew up");
		context.startSpan("tool.call", span => {
			span.setAttribute("tool.name", "bash");
			span.setAttributes({ dropped: undefined, kept: 1 });
			span.addEvent("started", { attempt: 1 });
			span.recordException(failure);
			span.setStatus("error", failure.message);
			span.end();
		});
		const record = context.probe.last();
		expect(record?.name).toBe("tool.call");
		expect(record?.attributes).toEqual({ "tool.name": "bash", kept: 1 });
		expect(record?.events).toEqual([{ name: "started", attributes: { attempt: 1 } }]);
		// Identity, not shape: two Errors with the same message are equal enough for
		// `toEqual`, so that assertion would pass even if the backend recorded a copy
		// of the error instead of the one that was thrown.
		expect(record?.exceptions[0]).toBe(failure);
		expect(record?.status).toBe("error");
		expect(record?.statusMessage).toBe("tool blew up");
	});

	it("hands out snapshots, so a caller cannot mutate what was recorded", () => {
		// `spans()` copies attributes and events. Without the copy, a caller holding
		// an earlier snapshot would see later writes — a test asserting on history
		// would be reading whatever the test itself had just changed.
		const context = createMemoryTelemetryContext(() => 1);
		context.startSpan("span", span => {
			span.setAttribute("stage", "one");
		});
		const early = context.probe.last();
		context.startSpan("span", span => {
			span.setAttribute("stage", "two");
		});
		expect(early?.attributes.stage).toBe("one");
		expect(context.probe.last()?.attributes.stage).toBe("two");
	});
});
