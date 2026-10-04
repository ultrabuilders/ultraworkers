import type { TelemetryAttributes, TelemetryAttributeValue, AgentTelemetryContext, TelemetrySpan } from "./context";

/**
 * The contract's negative case: a backend that records nothing, and says so by
 * doing nothing rather than by being absent.
 *
 * A no-op backend is what ships when a session does not want telemetry. It has to
 * exist as a real object rather than as `undefined` checks scattered through the
 * call sites, because a call site that has to ask "is telemetry on?" is a call
 * site whose answer changes what the code does — and the honest answer is always
 * "no, not this time". One frozen span behind one context answers it once.
 *
 * Frozen so a backend that mutates its own span is caught by the type checker
 * rather than by a test that has to remember to look.
 */
export const NOOP_SPAN: TelemetrySpan = Object.freeze({
	name: undefined,
	startTime: undefined,
	endTime: undefined,
	attributes: undefined,
	status: "unset" as const,
	statusMessage: undefined,
	setAttribute(_key: string, _value: TelemetryAttributeValue | undefined): void {},
	setAttributes(_attributes: TelemetryAttributes): void {},
	addEvent(_name: string, _attributes?: TelemetryAttributes): void {},
	recordException(_error: unknown): void {},
	setStatus(_status: "unset" | "ok" | "error", _message?: string): void {},
	end(_endTime?: number): void {},
});

/**
 * Returns `fn(NOOP_SPAN)` — the callback's own value, by identity.
 *
 * No try/catch, no wrapper, no inspection. A wrapper here would have to decide
 * what to do with the callback's return value and its throw, and both decisions
 * are ways to make a no-op backend quietly not one.
 */
export const NOOP_TELEMETRY_CONTEXT: AgentTelemetryContext = Object.freeze({
	startSpan<T>(_name: string, fn: (span: TelemetrySpan) => T): T {
		return fn(NOOP_SPAN);
	},
});
