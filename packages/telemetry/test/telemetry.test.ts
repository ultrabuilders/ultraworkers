import { describe, expect, expectTypeOf, it } from "bun:test";
import {
	createTypedSpanStarter,
	defineTelemetrySchema,
	InMemoryTelemetryContext,
	NOOP_TELEMETRY_CONTEXT,
	type SchemaTelemetrySpan,
	type SpanAttributes,
	type SpanOptions,
	type SpanStatus,
	type TelemetrySchemaSpanStartAttributes,
	type TelemetrySpan,
} from "../src/index";

function unreadable<T extends object>(value: T): T {
	return new Proxy(value, {
		get: () => {
			throw new Error("read");
		},
		getOwnPropertyDescriptor: () => {
			throw new Error("inspect");
		},
		ownKeys: () => {
			throw new Error("enumerate");
		},
	});
}

describe("telemetry schemas", () => {
	it("preserves serializable definitions and infers exact attributes", () => {
		const definition = {
			version: 1,
			spans: {
				operation: {
					description: "Test operation",
					parents: { kind: "any" },
					startAttributes: {
						kind: { type: "string", required: true, values: ["read", "write"], description: "Kind" },
					},
					endAttributes: {},
					events: {
						result: {
							description: "Result",
							attributes: {
								outcome: { type: "string", required: true, values: ["ok", "error"], description: "Outcome" },
							},
						},
					},
					status: { default: "ok", errorWhen: "The operation fails" },
				},
			},
		} as const;
		const schema = defineTelemetrySchema(definition);
		expect(schema).toBe(definition);
		// The exact bytes, not merely "serialisation did not throw": a definition
		// that dropped a key, renamed one, or reordered them would still stringify.
		expect(JSON.stringify(schema)).toBe(
			'{"version":1,"spans":{"operation":{"description":"Test operation","parents":{"kind":"any"},' +
				'"startAttributes":{"kind":{"type":"string","required":true,"values":["read","write"],"description":"Kind"}},' +
				'"endAttributes":{},"events":{"result":{"description":"Result","attributes":{"outcome":' +
				'{"type":"string","required":true,"values":["ok","error"],"description":"Outcome"}}}},' +
				'"status":{"default":"ok","errorWhen":"The operation fails"}}}}',
		);
		expectTypeOf<TelemetrySchemaSpanStartAttributes<typeof schema, "operation">>().toMatchTypeOf<{
			kind: "read" | "write";
		}>();

		const _compileTimeFailures = (span: SchemaTelemetrySpan<typeof schema, "operation">) => {
			span.addEvent("result", { outcome: "ok" });
			// @ts-expect-error required event attributes cannot be omitted
			span.addEvent("result");
			// @ts-expect-error closed-set event values are exact
			span.addEvent("result", { outcome: "other" });
			// @ts-expect-error undeclared events are rejected
			span.addEvent("unknown", {});
			// @ts-expect-error empty end schemas reject every attribute
			span.setAttributes({ unknown: true });
		};
	});

	it("combines schema vocabularies and binds child starters to their parent spans", async () => {
		const operationSchema = defineTelemetrySchema({
			version: 1,
			spans: {
				operation: {
					description: "Operation",
					parents: { kind: "root_or_external" },
					startAttributes: {
						kind: { type: "string", required: true, values: ["read", "write"], description: "Kind" },
					},
					endAttributes: {},
					status: { default: "ok", errorWhen: "The operation fails" },
				},
			},
		} as const);
		const requestSchema = defineTelemetrySchema({
			version: 3,
			spans: {
				request: {
					description: "Request",
					parents: { kind: "spans", spans: ["operation"] },
					startAttributes: {
						provider: { type: "string", required: true, description: "Provider" },
					},
					endAttributes: {
						response: { type: "string", description: "Response kind" },
					},
					status: { default: "ok", errorWhen: "The request fails" },
				},
			},
		} as const);
		const telemetryContext = new InMemoryTelemetryContext();
		const startSpan = createTypedSpanStarter(telemetryContext, [operationSchema, requestSchema]);

		const result = await startSpan("operation", { kind: "read" }, (_operationSpan, startChildSpan) =>
			startChildSpan("request", { provider: "example" }, requestSpan => {
				requestSpan.setAttributes({ response: "cached" });
				return 42;
			}),
		);

		expect(result).toBe(42);
		expectTypeOf(result).toEqualTypeOf<number>();
		const spans = telemetryContext.getSpans();
		const operationSpan = spans.find(span => span.name === "operation");
		const requestSpan = spans.find(span => span.name === "request");
		expect(operationSpan?.parentId).toBeNull();
		expect(requestSpan?.parentId).toBe(operationSpan?.id);
		// Binding the starter is the assertion: `_schemas` is captured but never
		// read (see the contract noted at src/index.ts), so every later span on
		// this context still starts and resolves normally.
		const unreadableStarter = createTypedSpanStarter(
			telemetryContext,
			unreadable([operationSchema, requestSchema] as const),
		);
		expect(unreadableStarter).toBeInstanceOf(Function);
		expect(await startSpan("operation", { kind: "read" }, () => 7)).toBe(7);

		const syncError = { kind: "sync" };
		const syncResult = startSpan("operation", { kind: "write" }, () => {
			throw syncError;
		});
		await expect(syncResult).rejects.toBe(syncError);

		const asyncError = { kind: "async" };
		const asyncResult = startSpan("request", { provider: "example" }, async () => {
			throw asyncError;
		});
		await expect(asyncResult).rejects.toBe(asyncError);

		const _compileTimeFailures = () => {
			const spanName: "operation" | "request" = Math.random() > 0.5 ? "operation" : "request";
			// @ts-expect-error union-valued names must be narrowed to preserve name and attribute correlation
			void startSpan(spanName, { kind: "read" }, () => {});
			const extraRequestAttributes = { provider: "example", unknown: true } as const;
			// @ts-expect-error variables with unknown attributes are rejected
			void startSpan("request", extraRequestAttributes, () => {});
			// @ts-expect-error unknown span names are rejected across the combined vocabulary
			void startSpan("unknown", {}, () => {});
			// @ts-expect-error attributes are selected from the schema that owns the span
			void startSpan("request", { kind: "read" }, () => {});
			// @ts-expect-error duplicate span names across schemas are rejected
			void createTypedSpanStarter(telemetryContext, [operationSchema, operationSchema]);
		};
	});
});

describe("NOOP_TELEMETRY_CONTEXT", () => {
	it("admits callbacks synchronously and reuses one inert span", async () => {
		let admitted = false;
		let firstSpan: TelemetrySpan | undefined;
		const result = NOOP_TELEMETRY_CONTEXT.startSpan({ name: "first" }, async span => {
			admitted = true;
			firstSpan = span;
			const child = await span.startSpan({ name: "child" }, childSpan => childSpan);
			expect(child).toBe(span);
			return 42;
		});

		expect(admitted).toBe(true);
		expect(await result).toBe(42);
		expect(Object.isFrozen(firstSpan)).toBe(true);
	});

	it("preserves synchronous and asynchronous rejection values", async () => {
		const syncError = { kind: "sync" };
		const sync = NOOP_TELEMETRY_CONTEXT.startSpan({ name: "sync" }, () => {
			throw syncError;
		});
		await expect(sync).rejects.toBe(syncError);

		const asyncError = { kind: "async" };
		const asyncResult = NOOP_TELEMETRY_CONTEXT.startSpan({ name: "async" }, async () => {
			throw asyncError;
		});
		await expect(asyncResult).rejects.toBe(asyncError);
	});

	it("does not inspect or retain telemetry payloads", async () => {
		const options = unreadable<SpanOptions>({ name: "operation", attributes: { secret: "prompt content" } });
		const sentinel = { ran: true } as const;
		const result = await NOOP_TELEMETRY_CONTEXT.startSpan(options, span => {
			const attributes = unreadable<SpanAttributes>({ secret: "content" });
			const status = unreadable<SpanStatus>({ status: "ok" });
			span.addEvent("event", attributes);
			span.setAttributes(attributes);
			span.setStatus(status);
			return sentinel;
		});
		// The sentinel coming back proves all three writes ran to completion —
		// a no-op span that threw or swallowed would not return it.
		expect(result).toBe(sentinel);
	});
});
