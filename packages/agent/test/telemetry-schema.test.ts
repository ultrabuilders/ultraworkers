/**
 * The ported span vocabulary is a *value* contract, and this reads it as one.
 *
 * The failure worth defending: someone re-copies `pi`'s `harness/telemetry.ts` over
 * this port. The file still typechecks, still exports the same symbols, and the
 * difference — `pi.*` span names that no collector here has ever seen — is invisible
 * to every other test in the package. So these assert the values, not the wiring.
 */

import { describe, expect, it } from "bun:test";
import { AGENT_TELEMETRY_SCHEMAS, AI_TELEMETRY_SCHEMA, HARNESS_TELEMETRY_SCHEMA } from "@oh-my-pi/pi-agent-core";

const SPAN_PREFIX = "omp.";

/** Every span name and attribute key in one schema, recursively. */
function collectKeys(schema: { spans: Record<string, Record<string, unknown>> }): string[] {
	const keys: string[] = [];
	for (const [spanName, span] of Object.entries(schema.spans)) {
		keys.push(spanName);
		for (const group of ["startAttributes", "endAttributes"] as const) {
			for (const key of Object.keys((span[group] ?? {}) as Record<string, unknown>)) keys.push(key);
		}
	}
	return keys;
}

describe("telemetry schema port", () => {
	it("names every span and attribute key with the omp prefix", () => {
		const keys = [...collectKeys(AI_TELEMETRY_SCHEMA), ...collectKeys(HARNESS_TELEMETRY_SCHEMA)];
		expect(keys.length).toBeGreaterThan(0);
		const unprefixed = keys.filter(key => !key.startsWith(SPAN_PREFIX));
		expect(unprefixed).toEqual([]);
	});

	it("carries no pi-prefixed name from the upstream port", () => {
		// The specific regression: `pi` ships `pi.ai.request` / `pi.harness.run`. A
		// verbatim re-copy restores them and nothing else in the package notices.
		const keys = [...collectKeys(AI_TELEMETRY_SCHEMA), ...collectKeys(HARNESS_TELEMETRY_SCHEMA)];
		expect(keys.filter(key => key.startsWith("pi."))).toEqual([]);
	});

	it("keeps the AI request span's required operation attributes", () => {
		const span = AI_TELEMETRY_SCHEMA.spans["omp.ai.request"];
		const start = span.startAttributes as Record<string, { required?: boolean }>;
		const required = Object.entries(start)
			.filter(([, def]) => def.required)
			.map(([key]) => key)
			.sort();
		expect(required).toEqual([
			"omp.ai.api",
			"omp.ai.model",
			"omp.ai.operation",
			"omp.ai.provider",
			"omp.ai.streaming",
		]);
	});

	it("preserves the operation enum the provider layer switches on", () => {
		const span = AI_TELEMETRY_SCHEMA.spans["omp.ai.request"];
		const operation = (span.startAttributes as Record<string, { values?: readonly string[] }>)["omp.ai.operation"];
		expect(operation?.values).toEqual(["stream", "fetch_deferred", "cancel_deferred", "generate_images"]);
	});

	it("keeps every declared parent span resolvable", () => {
		// A parent naming a span that does not exist is a schema that silently
		// refuses to nest — the shape error no typecheck catches.
		for (const schema of [AI_TELEMETRY_SCHEMA, HARNESS_TELEMETRY_SCHEMA]) {
			const names = new Set(Object.keys(schema.spans));
			for (const [spanName, span] of Object.entries(schema.spans)) {
				if (span.parents.kind !== "spans") continue;
				for (const parent of span.parents.spans) {
					expect({ span: spanName, parent, known: names.has(parent) }).toEqual({
						span: spanName,
						parent,
						known: true,
					});
				}
			}
		}
	});

	it("orders the combined vocabulary as AI then harness", () => {
		// Consumers index into this array positionally, so order is the contract.
		expect(AGENT_TELEMETRY_SCHEMAS).toEqual([AI_TELEMETRY_SCHEMA, HARNESS_TELEMETRY_SCHEMA]);
		expect(AGENT_TELEMETRY_SCHEMAS[0].spans["omp.ai.request"]).toBeDefined();
		expect(AGENT_TELEMETRY_SCHEMAS[1].spans["omp.harness.run"]).toBeDefined();
	});
});
