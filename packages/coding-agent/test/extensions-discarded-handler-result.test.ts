/**
 * A handler that returns a value on an event which reads none has that value
 * dropped. Before this, it was dropped *silently*: the author had no way to learn
 * the seam they wrote to is inert, which is worse than the seam being absent.
 *
 * These assert the observable contract — a report reaches `onError`, the value is
 * still discarded, and the events that legitimately consume a result are untouched.
 *
 * `tool_approval_requested` is the one event that used to sit here and no longer
 * does: it now carries a `ToolApprovalRequestedEventResult`, so a returned veto is
 * consumed rather than discarded. The discarding cases below therefore use
 * `session_start`, an event that reads no result — which keeps both halves of the
 * contract asserted instead of leaving one of them untested.
 */

import { describe, expect, it } from "bun:test";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import {
	EXTENSION_HANDLER_RESULT_DISCARDED_CODE,
	ExtensionRunner,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import type {
	Extension,
	ExtensionError,
	ExtensionFactory,
	ToolApprovalRequestedEvent,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

const VETO = { cancel: true, reason: "policy" };

const APPROVAL_EVENT: ToolApprovalRequestedEvent = {
	type: "tool_approval_requested",
	sessionId: "s",
	toolCallId: "1",
	toolName: "t",
	approvalMode: "always-ask",
};

async function harness(): Promise<{
	extension: Extension;
	runner: ExtensionRunner;
	errors: ExtensionError[];
	dispose: () => void;
}> {
	const runtime = new ExtensionRuntime();
	const extension = await loadExtensionFromFactory(
		() => {},
		process.cwd(),
		new EventBus(),
		runtime,
		"discarded-result-test",
	);
	const sessionManager = SessionManager.inMemory(process.cwd());
	const runner = new ExtensionRunner([extension], runtime, process.cwd(), sessionManager, {} as never);
	const errors: ExtensionError[] = [];
	runner.onError(error => errors.push(error));
	return { extension, runner, errors, dispose: () => sessionManager.close() };
}

describe("discarded extension handler result", () => {
	it("reports a returned value on an event that consumes none", async () => {
		const { extension, runner, errors, dispose } = await harness();
		try {
			extension.handlers.set("session_start", [async () => VETO]);
			await runner.emit({ type: "session_start", sessionId: "s" } as never);

			expect(errors).toHaveLength(1);
			expect(errors[0]).toMatchObject({
				event: "session_start",
				code: EXTENSION_HANDLER_RESULT_DISCARDED_CODE,
			});
			// The author has to see *what* was thrown away, not merely that
			// something was — otherwise the report cannot be acted on.
			expect(errors[0].error).toContain("cancel");
		} finally {
			dispose();
		}
	});

	it("still discards the value — reporting must not change the outcome", async () => {
		const { extension, runner, dispose } = await harness();
		try {
			extension.handlers.set("session_start", [async () => VETO]);
			// No `RunnerEmitResult` branch exists for this event, so the value cannot
			// become a decision. If a future change made it one, this fails loudly.
			expect(await runner.emit({ type: "session_start", sessionId: "s" } as never)).toBeUndefined();
		} finally {
			dispose();
		}
	});

	it("stays silent when the handler returns nothing", async () => {
		// The control. Without it, a runner reporting on every dispatch would pass
		// the test above while flooding every event in the tree.
		const { extension, runner, errors, dispose } = await harness();
		try {
			extension.handlers.set("tool_approval_requested", [async () => undefined]);
			await runner.emit(APPROVAL_EVENT);
			expect(errors).toEqual([]);
		} finally {
			dispose();
		}
	});

	it("leaves the events that consume a result alone", async () => {
		// `session_before_switch` reads `cancel`. Reporting there would be a false
		// alarm on the one path where returning something is the whole point.
		const { extension, runner, errors, dispose } = await harness();
		try {
			extension.handlers.set("session_before_switch", [async () => VETO]);
			const result = await runner.emit({ type: "session_before_switch", sessionId: "s" } as never);
			expect(errors).toEqual([]);
			expect(result).toMatchObject({ cancel: true });
		} finally {
			dispose();
		}
	});
});

describe("the tool_approval_requested veto seam", () => {
	it("returns a handler's veto so the caller can act on it", async () => {
		// The seam, stated as an observable contract: what a handler returns is what
		// `emit` hands back. The two tests above now cover an event that still
		// discards, so this pair brackets the change rather than restating it.
		const { extension, runner, errors, dispose } = await harness();
		try {
			extension.handlers.set("tool_approval_requested", [async () => VETO]);
			const result = await runner.emit(APPROVAL_EVENT);

			expect(result).toMatchObject({ cancel: true, reason: "policy" });
			// Consumed, not thrown away — reporting here would be a false alarm on the
			// one path where returning something is the whole point.
			expect(errors).toEqual([]);
		} finally {
			dispose();
		}
	});

	it("takes the FIRST veto and stops asking the rest", async () => {
		// First-truthy-wins, matching `emitUserEvent`. A second handler that also
		// objects must not overturn the first decision, and one that declines must not
		// be consulted after the fact.
		const { extension, runner, dispose } = await harness();
		try {
			let secondRan = false;
			extension.handlers.set("tool_approval_requested", [
				async () => VETO,
				async () => {
					secondRan = true;
					return { cancel: false };
				},
			]);
			expect(await runner.emit(APPROVAL_EVENT)).toMatchObject({ cancel: true });
			expect(secondRan).toBe(false);
		} finally {
			dispose();
		}
	});

	it("asks the user when the handler throws — a broken extension must not allow", async () => {
		// THE direction that matters. A handler that fails yields `undefined`, which is
		// exactly what "no handler objected" looks like: the caller falls through to the
		// prompt. Without this a throwing extension would silently become an allow.
		const { extension, runner, dispose } = await harness();
		try {
			extension.handlers.set("tool_approval_requested", [
				async () => {
					throw new Error("handler exploded");
				},
			]);
			expect(await runner.emit(APPROVAL_EVENT)).toBeUndefined();
		} finally {
			dispose();
		}
	});

	it("asks the user when the handler declines", async () => {
		// The control for the two above: an explicit non-veto is not a veto. If this
		// returned its value, the caller could not tell "declined" from "denied".
		const { extension, runner, dispose } = await harness();
		try {
			extension.handlers.set("tool_approval_requested", [async () => ({ cancel: false })]);
			expect(await runner.emit(APPROVAL_EVENT)).toBeUndefined();
		} finally {
			dispose();
		}
	});
});

// Compiled, never called: a type-level guard that the seam is OPEN. It replaces an
// earlier `@ts-expect-error` asserting the opposite — that a returned veto did not
// compile. If a future change closes the seam again this stops compiling, which is
// the point: the veto is now a published contract, not an accident.
const openSeamProbe: ExtensionFactory = pi => {
	pi.on("tool_approval_requested", () => VETO);
};
void openSeamProbe;
