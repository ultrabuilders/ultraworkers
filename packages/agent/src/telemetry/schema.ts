import type {
	ExactTelemetryAttributes,
	SchemaTelemetrySpan,
	TelemetryContext,
	TelemetrySchemaDefinition,
	TelemetrySchemaSpanEndAttributes,
	TelemetrySchemaSpanEventAttributes,
	TelemetrySchemaSpanEventName,
	TelemetrySchemaSpanName,
	TelemetrySchemaSpanStartAttributes,
	TelemetrySchemaSpanUnion,
	TypedSpanStarter,
} from "@oh-my-pi/pi-telemetry";
import { createTypedSpanStarter } from "@oh-my-pi/pi-telemetry";

// `pi` re-exports the whole `pi-telemetry` type surface from this module, because
// its own barrel has nowhere else to get it. Here it would collide with
// `./telemetry/context`, which already exports `SpanStatus` and `TelemetrySpan`,
// and AGENTS.md resolves a star ambiguity by dropping the redundant path rather
// than keeping both — so `SpanStatus` and `TelemetrySpan` are deliberately absent
// below. Consumers get those from `./telemetry/context`.
export type {
	ExactTelemetryAttributes,
	SchemaTelemetrySpan,
	TelemetryContext,
	TelemetrySchemaDefinition,
	TelemetrySchemaSpanEndAttributes,
	TelemetrySchemaSpanEventAttributes,
	TelemetrySchemaSpanEventName,
	TelemetrySchemaSpanName,
	TelemetrySchemaSpanStartAttributes,
	TelemetrySchemaSpanUnion,
	TypedSpanStarter,
};

/**
 * The typed span vocabulary `pi` declares for agent-owned AI-request and harness
 * telemetry, ported from `pi-ref/packages/agent/src/harness/telemetry.ts`.
 *
 * ## Span names are `omp.*`, and why that is not a wire break
 *
 * Every span name and attribute key below **is** a wire value: it ships to an
 * OpenTelemetry collector and lands in dashboards and alerts. `pi`'s were `pi.*`;
 * they are `omp.*` here. That rename is safe, and the distinction is what makes it
 * safe — it is the same distinction `scripts/rename/disposition.tsv` already draws.
 *
 * That table keeps `SERVICE_NAME = "oh-my-pi"` (`telemetry-export-otlp.ts:51`) as
 * `keep-wire`, rationale *"N7 OTLP service.name shipped to collectors"*. It is kept
 * because *this product* already ships it, so a collector stores it and renaming a
 * stored value breaks the dashboards reading it. No collector here stores a `pi.*`
 * span name: everything this repo emits is the `omp.*` set below. Whether `pi` itself
 * emits one is beside the point — its collectors are not ours.
 *
 * `omp.*` is what the rest of the OTel surface already uses: the twelve instruments
 * in `telemetry-export-otlp.ts` (`omp.log`, `omp.agent.runs`, `omp.gen_ai.agent.id`,
 * …). A new span family under a third prefix would be the odd one out. The ruling is
 * `ultraworkers-a4`'s, made under the owner's delegation; flipping it is one commit
 * over two constants and one string.
 *
 * ## What was adapted, and why it is not a rewrite
 *
 * The two schema bodies and every derived type below are `pi`'s, byte for byte. One
 * thing could not be copied, because the surrounding plumbing differs:
 *
 * - `startAiSpan` / `startHarnessSpan` take pi's harness `Context` and reach the
 *   telemetry layer through `getTelemetryContext` / `withTelemetryContext`, none of
 *   which exist here. `packages/agent/src/telemetry/context.ts` exports a
 *   deliberately **incompatible** contract — `AgentTelemetryContext` is synchronous
 *   with a bare name, where `@oh-my-pi/pi-telemetry`'s `TelemetryContext` is async and
 *   takes a `SpanOptions` object — and its own docblock warns that handing one to a
 *   call site written for the other is the hazard. So these bind to the
 *   `@oh-my-pi/pi-telemetry` `TelemetryContext` and go through that package's existing
 *   `createTypedSpanStarter`, rather than reimplementing a starter. The parent is an
 *   explicit argument instead of ambient: the same boundary, without `chord`.
 *
 * `pi` wires exactly one of these two: `startHarnessSpan` has a production call site
 * at `pi-ref/packages/agent/src/harness/hooks.ts:376`, which opens
 * `pi.harness.hook` around every `before_tool` / `after_tool` handler. So
 * `omp.harness.hook` and its `omp.lane.name` / `omp.operation.id` / `omp.hook.name` /
 * `omp.hook.registration_id` keys describe a span pi really emits.
 * `startAiSpan` has no production call site — only `pi`'s own test calls it — so
 * `omp.ai.request` is vocabulary that nothing opens yet.
 *
 * This port ships the schema and the typed entry points, and wires up neither. That
 * is a deliberate stopping point, not a gap being papered over: turning
 * `omp.harness.hook` into a live span means instrumenting this repo's hook runner,
 * which is a separate change with its own review.
 */

/* ---- ported verbatim from pi-ref/packages/agent/src/harness/telemetry.ts ---- */

export const AI_TELEMETRY_SCHEMA = {
	version: 1,
	spans: {
		"omp.ai.request": {
			description: "One logical request to an AI provider",
			parents: { kind: "any" },
			startAttributes: {
				"omp.ai.operation": {
					type: "string",
					required: true,
					values: ["stream", "fetch_deferred", "cancel_deferred", "generate_images"],
					description: "Logical provider operation",
				},
				"omp.ai.provider": {
					type: "string",
					required: true,
					description: "Selected provider id",
				},
				"omp.ai.model": {
					type: "string",
					required: true,
					description: "Requested model id",
				},
				"omp.ai.api": {
					type: "string",
					required: true,
					description: "Provider API id",
				},
				"omp.ai.streaming": {
					type: "boolean",
					required: true,
					description: "Whether this operation returns a stream",
				},
				"omp.ai.deferred": {
					type: "boolean",
					required: false,
					description: "Whether the operation requests or participates in deferred execution",
				},
			},
			endAttributes: {
				"omp.ai.response.model": { type: "string", description: "Concrete response model" },
				"omp.ai.response.id": {
					type: "string",
					cardinality: "high",
					description: "Provider response id",
				},
				"omp.ai.response.stop_reason": {
					type: "string",
					values: ["stop", "length", "tool_use", "error", "aborted", "deferred"],
					description: "Normalized terminal response reason",
				},
				"omp.ai.http.status_code": { type: "number", description: "Final HTTP status" },
				"omp.ai.usage.input_tokens": { type: "number", description: "Reported input tokens" },
				"omp.ai.usage.output_tokens": { type: "number", description: "Reported output tokens" },
				"omp.ai.usage.cache_read_tokens": { type: "number", description: "Reported cache-read tokens" },
				"omp.ai.usage.cache_write_tokens": {
					type: "number",
					description: "Reported cache-write tokens",
				},
				"omp.ai.usage.reasoning_tokens": { type: "number", description: "Reported reasoning tokens" },
				"omp.ai.usage.total_tokens": { type: "number", description: "Reported total tokens" },
				"omp.ai.usage.cost": { type: "number", description: "Reported total cost" },
				"omp.ai.stream.chunk_count": { type: "number", description: "Streamed update chunk count" },
				"omp.ai.stream.time_to_first_chunk_ms": {
					type: "number",
					description: "Elapsed milliseconds to first update chunk",
				},
				"omp.ai.error.type": {
					type: "string",
					cardinality: "low",
					description: "Provider or transport error class",
				},
			},
			status: { default: "ok", errorWhen: "The operation throws or returns an error result" },
		},
	},
} as const satisfies TelemetrySchemaDefinition;

export type AiSpanName = TelemetrySchemaSpanName<typeof AI_TELEMETRY_SCHEMA>;
export type AiSpanStartAttributes<Name extends AiSpanName> = TelemetrySchemaSpanStartAttributes<
	typeof AI_TELEMETRY_SCHEMA,
	Name
>;
export type AiSpanEndAttributes<Name extends AiSpanName> = TelemetrySchemaSpanEndAttributes<
	typeof AI_TELEMETRY_SCHEMA,
	Name
>;
export type AiSpanAttributes<Name extends AiSpanName> = AiSpanStartAttributes<Name> & AiSpanEndAttributes<Name>;
export type AiSpanEventName<Name extends AiSpanName> = TelemetrySchemaSpanEventName<typeof AI_TELEMETRY_SCHEMA, Name>;
export type AiSpanEventAttributes<
	Name extends AiSpanName,
	EventName extends AiSpanEventName<Name>,
> = TelemetrySchemaSpanEventAttributes<typeof AI_TELEMETRY_SCHEMA, Name, EventName>;
export type AiTelemetrySpan<Name extends AiSpanName> = SchemaTelemetrySpan<typeof AI_TELEMETRY_SCHEMA, Name>;
export type AiSpan = TelemetrySchemaSpanUnion<typeof AI_TELEMETRY_SCHEMA>;

const HOOK_NAMES = [
	"before_run",
	"before_drive",
	"before_run_end",
	"transform_context",
	"before_request",
	"before_payload",
	"after_response",
	"before_tool",
	"after_tool",
	"before_compaction",
	"before_navigation",
] as const;

const EVENT_TYPES = [
	"run_start",
	"run_resume",
	"run_suspend",
	"operation_abort",
	"run_end",
	"fault",
	"handler_error",
	"turn_start",
	"turn_end",
	"retry_scheduled",
	"retry_start",
	"retry_end",
	"message_start",
	"message_update",
	"message_end",
	"tool_start",
	"tool_update",
	"tool_end",
	"entry_added",
	"queue_update",
	"value_update",
	"config_update",
	"compaction_start",
	"compaction_end",
	"navigation_start",
	"navigation_end",
	"lane_created",
	"usage",
] as const;

const operationStartAttributes = {
	"omp.session.id": {
		type: "string",
		required: true,
		cardinality: "high",
		description: "Session id",
	},
	"omp.lane.name": {
		type: "string",
		required: true,
		cardinality: "high",
		description: "Lane name",
	},
	"omp.operation.id": {
		type: "string",
		required: true,
		cardinality: "high",
		description: "Durable operation id",
	},
	"omp.operation.recovery": {
		type: "boolean",
		required: true,
		description: "Whether this invocation resumes durable work",
	},
} as const;

const operationErrorAttributes = {
	"omp.error.code": {
		type: "string",
		cardinality: "low",
		description: "Stable operation error code",
	},
	"omp.error.type": {
		type: "string",
		cardinality: "low",
		description: "Low-cardinality operation error class",
	},
} as const;

export const HARNESS_TELEMETRY_SCHEMA = {
	version: 1,
	spans: {
		"omp.harness.run": {
			description: "One admitted in-process run invocation",
			parents: { kind: "root_or_external" },
			startAttributes: {
				...operationStartAttributes,
				"omp.operation.kind": {
					type: "string",
					required: true,
					values: ["run"],
					description: "Run operation kind",
				},
			},
			endAttributes: {
				"omp.operation.outcome": {
					type: "string",
					values: ["completed", "aborted", "failed", "suspended"],
					description: "Run invocation outcome",
				},
				...operationErrorAttributes,
			},
			status: { default: "ok", errorWhen: "The run fails or throws" },
		},
		"omp.harness.compaction": {
			description: "One admitted in-process manual compaction invocation",
			parents: { kind: "root_or_external" },
			startAttributes: {
				...operationStartAttributes,
				"omp.operation.kind": {
					type: "string",
					required: true,
					values: ["compaction"],
					description: "Compaction operation kind",
				},
			},
			endAttributes: {
				"omp.operation.outcome": {
					type: "string",
					values: ["completed", "declined", "aborted", "failed"],
					description: "Compaction invocation outcome",
				},
				...operationErrorAttributes,
			},
			status: { default: "ok", errorWhen: "The compaction fails or throws" },
		},
		"omp.harness.navigation": {
			description: "One admitted in-process navigation invocation",
			parents: { kind: "root_or_external" },
			startAttributes: {
				...operationStartAttributes,
				"omp.operation.kind": {
					type: "string",
					required: true,
					values: ["navigation"],
					description: "Navigation operation kind",
				},
			},
			endAttributes: {
				"omp.operation.outcome": {
					type: "string",
					values: ["completed", "declined", "aborted", "failed"],
					description: "Navigation invocation outcome",
				},
				...operationErrorAttributes,
			},
			status: { default: "ok", errorWhen: "The navigation fails or throws" },
		},
		"omp.harness.checkpoint": {
			description: "One run checkpoint",
			parents: { kind: "spans", spans: ["omp.harness.run"] },
			startAttributes: {
				"omp.lane.name": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Lane name",
				},
				"omp.operation.id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Durable operation id",
				},
				"omp.checkpoint.kind": {
					type: "string",
					required: true,
					values: ["normal", "abort_reconcile"],
					description: "Checkpoint purpose",
				},
			},
			endAttributes: {},
			status: { default: "ok", errorWhen: "Checkpoint work throws" },
		},
		"omp.harness.turn": {
			description: "One assistant response and its tool batch",
			parents: { kind: "spans", spans: ["omp.harness.run"] },
			startAttributes: {
				"omp.lane.name": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Lane name",
				},
				"omp.operation.id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Durable operation id",
				},
				"omp.turn.id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Invocation-local turn id",
				},
			},
			endAttributes: {},
			status: { default: "ok", errorWhen: "Turn work throws" },
		},
		"omp.harness.step": {
			description: "One durable retry attempt",
			parents: {
				kind: "spans",
				spans: ["omp.harness.turn", "omp.harness.checkpoint", "omp.harness.compaction", "omp.harness.navigation"],
			},
			startAttributes: {
				"omp.lane.name": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Lane name",
				},
				"omp.operation.id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Durable operation id",
				},
				"omp.step.kind": {
					type: "string",
					required: true,
					values: ["assistant", "compaction", "branch_summary"],
					description: "Retryable step kind",
				},
				"omp.step.attempt": {
					type: "number",
					required: true,
					description: "One-based durable attempt number",
				},
				"omp.compaction.reason": {
					type: "string",
					required: false,
					values: ["manual", "threshold", "overflow"],
					description: "Compaction trigger",
				},
			},
			endAttributes: {
				"omp.step.outcome": {
					type: "string",
					values: ["succeeded", "retry", "failed", "aborted", "deferred", "overflow"],
					description: "Attempt outcome",
				},
			},
			status: { default: "ok", errorWhen: "The attempt retries, fails, or throws" },
		},
		"omp.harness.tool": {
			description: "One raw phase-2 tool execution",
			parents: { kind: "spans", spans: ["omp.harness.turn", "omp.harness.run"] },
			startAttributes: {
				"omp.lane.name": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Lane name",
				},
				"omp.operation.id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Durable operation id",
				},
				"omp.turn.id": {
					type: "string",
					required: false,
					cardinality: "high",
					description: "Invocation-local live turn id",
				},
				"omp.tool.name": {
					type: "string",
					required: true,
					description: "Tool name",
				},
				"omp.tool.call_id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Tool call id",
				},
				"omp.tool.replay": {
					type: "string",
					required: true,
					values: ["never", "safe"],
					description: "Declared replay policy",
				},
				"omp.tool.recovery": {
					type: "boolean",
					required: true,
					description: "Whether this is recovery execution",
				},
			},
			endAttributes: {
				"omp.tool.is_error": {
					type: "boolean",
					description: "Whether raw phase-2 execution returned an error",
				},
			},
			status: { default: "ok", errorWhen: "Raw phase-2 execution returns an error" },
		},
		"omp.harness.hook": {
			description: "One registered hook handler invocation",
			parents: { kind: "any" },
			startAttributes: {
				"omp.lane.name": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Lane name",
				},
				"omp.operation.id": {
					type: "string",
					required: false,
					cardinality: "high",
					description: "Durable operation id when accepted",
				},
				"omp.hook.name": {
					type: "string",
					required: true,
					values: HOOK_NAMES,
					description: "Hook name",
				},
				"omp.hook.registration_id": {
					type: "string",
					required: false,
					description: "Optional hook registration metadata",
				},
			},
			endAttributes: {
				"omp.hook.outcome": {
					type: "string",
					values: ["completed", "skipped", "blocked", "failed"],
					description: "Handler outcome",
				},
			},
			status: { default: "ok", errorWhen: "The handler throws" },
		},
		"omp.harness.sleep": {
			description: "One retry delay",
			parents: {
				kind: "spans",
				spans: [
					"omp.harness.run",
					"omp.harness.compaction",
					"omp.harness.navigation",
					"omp.harness.turn",
					"omp.harness.checkpoint",
				],
			},
			startAttributes: {
				"omp.operation.id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Durable operation id",
				},
				"omp.sleep.delay_ms": {
					type: "number",
					required: true,
					description: "Requested delay in milliseconds",
				},
			},
			endAttributes: {
				"omp.sleep.outcome": {
					type: "string",
					values: ["elapsed", "aborted"],
					description: "Delay outcome",
				},
			},
			status: { default: "ok", errorWhen: "Sleep work throws" },
		},
		"omp.harness.event_handler": {
			description: "One passive event listener invocation",
			parents: { kind: "any" },
			startAttributes: {
				"omp.event.type": {
					type: "string",
					required: true,
					cardinality: "low",
					values: EVENT_TYPES,
					description: "Delivered harness event type",
				},
				"omp.lane.name": {
					type: "string",
					required: false,
					cardinality: "high",
					description: "Lane name for lane-scoped events",
				},
			},
			endAttributes: {},
			status: { default: "ok", errorWhen: "The listener throws" },
		},
		"omp.session.write": {
			description: "One committed session transaction",
			parents: { kind: "any" },
			startAttributes: {
				"omp.session.id": {
					type: "string",
					required: true,
					cardinality: "high",
					description: "Session id",
				},
				"omp.lane.name": {
					type: "string",
					required: false,
					cardinality: "high",
					description: "Lane name when supplied by the caller",
				},
				"omp.operation.id": {
					type: "string",
					required: false,
					cardinality: "high",
					description: "Durable operation id when supplied by the caller",
				},
				"omp.session.item_count": {
					type: "number",
					required: true,
					description: "Number of writes in the transaction",
				},
				"omp.session.item_kinds": {
					type: "string[]",
					required: true,
					elementValues: ["entry", "usage", "value", "list"],
					description: "Distinct write kinds in the transaction",
				},
			},
			endAttributes: {
				"omp.session.first_seq": {
					type: "number",
					description: "First committed sequence in the transaction",
				},
				"omp.session.last_seq": {
					type: "number",
					description: "Last committed sequence in the transaction",
				},
			},
			status: { default: "ok", errorWhen: "Storage rejects the transaction" },
		},
	},
} as const satisfies TelemetrySchemaDefinition;

/** Combined typed span vocabulary for agent-owned AI-request and harness telemetry. */
export const AGENT_TELEMETRY_SCHEMAS = [AI_TELEMETRY_SCHEMA, HARNESS_TELEMETRY_SCHEMA] as const;

export type HarnessSpanName = TelemetrySchemaSpanName<typeof HARNESS_TELEMETRY_SCHEMA>;
export type HarnessSpanStartAttributes<Name extends HarnessSpanName> = TelemetrySchemaSpanStartAttributes<
	typeof HARNESS_TELEMETRY_SCHEMA,
	Name
>;
export type HarnessSpanEndAttributes<Name extends HarnessSpanName> = TelemetrySchemaSpanEndAttributes<
	typeof HARNESS_TELEMETRY_SCHEMA,
	Name
>;
export type HarnessSpanAttributes<Name extends HarnessSpanName> = HarnessSpanStartAttributes<Name> &
	HarnessSpanEndAttributes<Name>;
export type HarnessSpanEventName<Name extends HarnessSpanName> = TelemetrySchemaSpanEventName<
	typeof HARNESS_TELEMETRY_SCHEMA,
	Name
>;
export type HarnessSpanEventAttributes<
	Name extends HarnessSpanName,
	EventName extends HarnessSpanEventName<Name>,
> = TelemetrySchemaSpanEventAttributes<typeof HARNESS_TELEMETRY_SCHEMA, Name, EventName>;
export type HarnessTelemetrySpan<Name extends HarnessSpanName> = SchemaTelemetrySpan<
	typeof HARNESS_TELEMETRY_SCHEMA,
	Name
>;
export type HarnessSpan = TelemetrySchemaSpanUnion<typeof HARNESS_TELEMETRY_SCHEMA>;

/**
 * Start one `omp.ai.request` span against an explicit parent context.
 *
 * `pi` threads the parent through its harness `Context`; this takes the
 * `@oh-my-pi/pi-telemetry` `TelemetryContext` directly, which is the same boundary
 * without the harness type.
 */
export function startAiSpan<Name extends AiSpanName, const Attributes extends AiSpanStartAttributes<Name>, Result>(
	name: Name,
	attributes: ExactTelemetryAttributes<AiSpanStartAttributes<Name>, Attributes>,
	callback: (
		span: AiTelemetrySpan<Name>,
		startChildSpan: TypedSpanStarter<[typeof AI_TELEMETRY_SCHEMA]>,
	) => Result | Promise<Result>,
	telemetryContext: TelemetryContext,
): Promise<Result> {
	// `TypedSpanStarter` is a union-to-intersection of one signature per span name,
	// so calling it with an unresolved `Name` resolves to the last overload rather
	// than the right one. Binding it to this wrapper's own signature is the same
	// type the starter already enforces per span name, stated once.
	const start = createTypedSpanStarter(telemetryContext, [AI_TELEMETRY_SCHEMA]) as (
		name: Name,
		attributes: ExactTelemetryAttributes<AiSpanStartAttributes<Name>, Attributes>,
		callback: (
			span: AiTelemetrySpan<Name>,
			startChildSpan: TypedSpanStarter<[typeof AI_TELEMETRY_SCHEMA]>,
		) => Result | Promise<Result>,
	) => Promise<Result>;
	return start(name, attributes, callback);
}

/** Start one harness span against an explicit parent context. */
export function startHarnessSpan<
	Name extends HarnessSpanName,
	const Attributes extends HarnessSpanStartAttributes<Name>,
	Result,
>(
	name: Name,
	attributes: ExactTelemetryAttributes<HarnessSpanStartAttributes<Name>, Attributes>,
	callback: (
		span: HarnessTelemetrySpan<Name>,
		startChildSpan: TypedSpanStarter<[typeof HARNESS_TELEMETRY_SCHEMA]>,
	) => Result | Promise<Result>,
	telemetryContext: TelemetryContext,
): Promise<Result> {
	const start = createTypedSpanStarter(telemetryContext, [HARNESS_TELEMETRY_SCHEMA]) as (
		name: Name,
		attributes: ExactTelemetryAttributes<HarnessSpanStartAttributes<Name>, Attributes>,
		callback: (
			span: HarnessTelemetrySpan<Name>,
			startChildSpan: TypedSpanStarter<[typeof HARNESS_TELEMETRY_SCHEMA]>,
		) => Result | Promise<Result>,
	) => Promise<Result>;
	return start(name, attributes, callback);
}
