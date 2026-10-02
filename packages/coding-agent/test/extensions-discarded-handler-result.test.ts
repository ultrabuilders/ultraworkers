/**
 * A handler that returns a value on an event which reads none has that value
 * dropped. Before this, it was dropped *silently*: the author had no way to learn
 * the seam they wrote to is inert, which is worse than the seam being absent.
 *
 * These assert the observable contract — a report reaches `onError`, the value is
 * still discarded, and the events that legitimately consume a result are untouched.
 *
 * The seam is closed at the TYPE layer as well as at runtime: `on()` declares
 * `ExtensionHandler<E, R = undefined>` and the `tool_approval_requested` overload
 * supplies no `R`, so a returned value does not compile there. The runtime tests
 * therefore register through `extension.handlers` rather than through `on()` — that
 * is not a way around the type, it is the only way to *reach the path at all*, and
 * the probe at the bottom of this file is what holds the type closed.
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
			extension.handlers.set("tool_approval_requested", [async () => VETO]);
			await runner.emit(APPROVAL_EVENT);

			expect(errors).toHaveLength(1);
			expect(errors[0]).toMatchObject({
				event: "tool_approval_requested",
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
			extension.handlers.set("tool_approval_requested", [async () => VETO]);
			// No `RunnerEmitResult` branch exists for this event, so the value cannot
			// become a decision. If a future change made it one, this fails loudly.
			expect(await runner.emit(APPROVAL_EVENT)).toBeUndefined();
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

// Compiled, never called: the contract under test here is that this line does NOT
// compile. If the `on()` overload for `tool_approval_requested` is ever given a
// result type, `@ts-expect-error` stops applying and the typecheck fails — at which
// point the veto decision is live and the runtime tests above need revisiting
// rather than assuming they already cover it.
const closedSeamProbe: ExtensionFactory = pi => {
	// @ts-expect-error `tool_approval_requested` exposes no result type (`R` defaults to `undefined`).
	pi.on("tool_approval_requested", () => VETO);
};
void closedSeamProbe;
