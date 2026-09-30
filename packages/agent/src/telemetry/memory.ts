import type {
	SpanStatus,
	TelemetryAttributeValue,
	TelemetryAttributes,
	TelemetryContext,
	TelemetrySpan,
} from "./context";

/**
 * The reference backend: records everything into memory so a test — or a
 * `--print-telemetry` debug run — can read it back.
 *
 * Its job in this package is to be the implementation the conformance suite is
 * pointed at first. A suite with no reference implementation can only assert
 * that an adapter does whatever that adapter does, so a wrong contract and a
 * wrong adapter agree with each other and stay green. This one is written from
 * the contract, so when the two disagree the suite has something to say.
 */

/** The mutable map behind the read-only `RecordedSpan.attributes` shape. */
type MutableAttributes = Record<string, TelemetryAttributeValue | undefined>;

/** One event as handed to `addEvent`, in call order. */
export interface RecordedEvent {
	readonly name: string;
	readonly attributes: TelemetryAttributes;
}

/** Everything one span accumulated. */
export interface RecordedSpan {
	readonly name: string;
	/** Unix epoch ms the span opened. Pairs with `endTime` to give a real duration. */
	readonly startTime: number;
	/** The enclosing span's name, or undefined when it was top level. */
	readonly parent: string | undefined;
	readonly events: RecordedEvent[];
	readonly attributes: TelemetryAttributes;
	readonly status: SpanStatus;
	readonly statusMessage: string | undefined;
	readonly ended: boolean;
	/** How many times `end()` was called. A correct backend records exactly 1. */
	readonly endCalls: number;
	/** Unix epoch ms, from the FIRST `end()` that carried one. */
	readonly endTime: number | undefined;
	readonly exceptions: unknown[];
}

export interface MemoryTelemetryProbe {
	/** Every span created, in creation order. */
	spans(): RecordedSpan[];
	/** The most recently created span, for the common one-span assertion. */
	last(): RecordedSpan | undefined;
}

export interface MemoryTelemetryContext extends TelemetryContext {
	readonly probe: MemoryTelemetryProbe;
}

/** A clock the caller supplies, so a recording backend is not secretly a time source. */
type Clock = () => number;

class MemorySpan implements TelemetrySpan {
	readonly name: string;
	readonly startTime: number;
	readonly parent: string | undefined;
	readonly events: RecordedEvent[] = [];
	readonly attributes: MutableAttributes = {};
	status: SpanStatus = "unset";
	statusMessage: string | undefined;
	ended = false;
	endCalls = 0;
	readonly exceptions: unknown[] = [];
	endTime: number | undefined;

	constructor(
		name: string,
		parent: MemorySpan | undefined,
		startTime: number,
		readonly clock: Clock,
	) {
		this.name = name;
		this.parent = parent?.name;
		this.startTime = startTime;
	}

	setAttribute(key: string, value: TelemetryAttributeValue | undefined): void {
		// An undefined value is a real instruction, not a missing one: OTEL's SDK
		// drops the key. Copying that here is what lets the suite assert the
		// drop semantics against a backend whose whole job is to be readable.
		if (value === undefined) {
			delete this.attributes[key];
			return;
		}
		this.attributes[key] = value;
	}

	setAttributes(attributes: TelemetryAttributes): void {
		for (const [key, value] of Object.entries(attributes)) this.setAttribute(key, value);
	}

	addEvent(name: string, attributes?: TelemetryAttributes): void {
		this.events.push({ name, attributes: attributes ?? {} });
	}

	recordException(error: unknown): void {
		this.exceptions.push(error);
	}

	setStatus(status: SpanStatus, message?: string): void {
		this.status = status;
		this.statusMessage = message;
	}

	end(endTime?: number): void {
		// A second `end()` would overwrite a first one that carried a real timestamp
		// with one that did not, or record a span as closed twice downstream. OTEL's
		// own implementation ignores the repeat; matching it is the contract.
		if (this.ended) return;
		this.ended = true;
		this.endCalls += 1;
		this.endTime = endTime ?? this.clock();
	}

	snapshot(): RecordedSpan {
		return {
			name: this.name,
			startTime: this.startTime,
			parent: this.parent,
			events: [...this.events],
			attributes: { ...this.attributes },
			status: this.status,
			statusMessage: this.statusMessage,
			ended: this.ended,
			endCalls: this.endCalls,
			endTime: this.endTime,
			exceptions: [...this.exceptions],
		};
	}
}

/**
 * A memory-backed telemetry context.
 *
 * `clock` is a parameter rather than a call to `Date.now()` so a recording
 * backend stays deterministic: a test that cannot predict `endTime` ends up
 * asserting nothing about it, and a suite full of such assertions looks rigorous
 * while proving nothing.
 */
export function createMemoryTelemetryContext(clock: Clock = () => Date.now()): MemoryTelemetryContext {
	const spans: MemorySpan[] = [];
	let active: MemorySpan | undefined;

	const context: MemoryTelemetryContext = {
		startSpan<T>(name: string, fn: (span: TelemetrySpan) => T): T {
			const span = new MemorySpan(name, active, clock(), clock);
			spans.push(span);
			// Saved and restored rather than cleared: a sibling span started after a
			// nested one must still nest under the outer span, not under nothing.
			const previous = active;
			active = span;
			// A promise-returning body is the case that makes a synchronous `finally`
			// wrong: `fn` hands back a pending promise, `finally` runs, `active` is
			// restored — and the body is still going. A span opened after an `await`
			// inside that body then parents to nothing. Measured: `outer`/`inner` both
			// came back with `parent: undefined`.
			//
			// So BOTH the restore and the close wait for the promise to settle.
			let result: T;
			try {
				result = fn(span);
			} catch (error) {
				span.end();
				active = previous;
				throw error;
			}
			// Close on SETTLE, not on return. Ending here would stamp `endTime` from a
			// clock that has not moved: an 80ms async body recorded as a 0ms span —
			// measured, and it exports silently, so every duration downstream reads zero.
			// A backend that measures LLM and tool calls cannot afford that.
			if (result instanceof Promise) {
				return result.finally(() => {
					span.end();
					active = previous;
				}) as T;
			}
			span.end();
			active = previous;
			return result;
		},
		probe: {
			spans: () => spans.map(span => span.snapshot()),
			last: () => spans.at(-1)?.snapshot(),
		},
	};
	return context;
}
