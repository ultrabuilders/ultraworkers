/**
 * Fallback service-name probe for the OTLP trace exporter, run as a subprocess by
 * telemetry-export.test.ts. Isolated out-of-process for the same reason as the
 * other probes: initTelemetryExport() registers a process-global provider.
 *
 * Stands up a loopback OTLP/proto receiver with NEITHER OTEL_SERVICE_NAME nor
 * OTEL_RESOURCE_ATTRIBUTES set, exports a span, and inspects the captured
 * protobuf payload for the resource's fallback service.name.
 *
 * Two things this probe is careful about:
 *
 * 1. It DELETES both variables rather than merely leaving them unset. The runner
 *    spawns with `env: { ...process.env }`, so a developer's ambient
 *    OTEL_SERVICE_NAME would otherwise decide the outcome of a test about the
 *    fallback.
 * 2. The tracer name below contains no "oh-my-pi". Attribute keys and values are
 *    inline UTF-8 in the payload, so the sibling probe's tracer string
 *    ("@oh-my-pi/pi-agent-core") would satisfy a `has("oh-my-pi")` check on its
 *    own and make this assertion vacuous.
 */

import {
	flushTelemetryExport,
	initTelemetryExport,
	isTelemetryExportEnabled,
} from "@oh-my-pi/pi-coding-agent/telemetry-export";
import { trace } from "@opentelemetry/api";

/** Must match SERVICE_NAME in src/telemetry-export-otlp.ts. */
const FALLBACK_SERVICE_NAME = "oh-my-pi";

let body: Buffer | undefined;
const server = Bun.serve({
	port: 0,
	async fetch(req) {
		const path = new URL(req.url).pathname;
		if (req.method === "POST" && path.endsWith("/v1/traces")) {
			body = Buffer.from(await req.arrayBuffer());
			return new Response('{"partialSuccess":{}}', {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}
		return new Response("not found", { status: 404 });
	},
});

process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = `http://localhost:${server.port}/v1/traces`;
delete process.env.OTEL_SERVICE_NAME;
delete process.env.OTEL_RESOURCE_ATTRIBUTES;

await initTelemetryExport(true);
if (!isTelemetryExportEnabled()) {
	console.error("PROBE: provider did not register");
	await server.stop(true);
	process.exit(2);
}

const span = trace.getTracer("otel-service-name-probe").startSpan("probe.span");
span.end();

await flushTelemetryExport();
await server.stop(true);

const payload = body ? body.toString("latin1") : "";

// The key and its value are adjacent in the encoded map entry — measured at 13
// bytes apart — so requiring them to be near each other is what ties the value
// to THIS key. Two independent `includes` checks would also pass if the same
// string appeared somewhere else in the payload, which is exactly what happens
// with the sibling probe's tracer name.
const keyAt = payload.indexOf("service.name");
const valueAt = payload.indexOf(FALLBACK_SERVICE_NAME);
const named = keyAt !== -1 && valueAt > keyAt && valueAt - keyAt < 24;

console.log(named ? "PROBE: RECEIVED" : "PROBE: NO_EXPORT");
console.log("fallback service name present:", named, "key at", keyAt, "value at", valueAt);
process.exit(named ? 0 : 1);
