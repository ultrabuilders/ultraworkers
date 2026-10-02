/**
 * A handler that returns a value on an event which consumes none has that value
 * dropped. Before this, it was dropped *silently*: the author had no way to learn
 * the seam they wrote to is inert, which is worse than the seam being absent.
 *
 * These assert the observable contract — a report reaches `onError`, the value is
 * still discarded, and the events that legitimately consume a result are untouched.
 */

import { describe, expect, it } from "bun:test";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import {
	EXTENSION_HANDLER_RESULT_DISCARDED_CODE,
	ExtensionRunner,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import type { ExtensionError, ExtensionFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

const VETO = { cancel: true, reason: "policy" };

async function runnerFor(
	factory: ExtensionFactory,
): Promise<{ runner: ExtensionRunner; errors: ExtensionError[]; dispose: () => void }> {
	const runtime = new ExtensionRuntime();
	const extension = await loadExtensionFromFactory(
		factory,
		process.cwd(),
		new EventBus(),
		runtime,
		"discarded-result-test",
	);
	const sessionManager = SessionManager.inMemory(process.cwd());
	const runner = new ExtensionRunner([extension], runtime, process.cwd(), sessionManager, {} as never);
	const errors: ExtensionError[] = [];
	runner.onError(error => errors.push(error));
	return { runner, errors, dispose: () => sessionManager.close() };
}

const APPROVAL_EVENT = {
	type: "tool_approval_requested",
	sessionId: "s",
	toolName: "t",
	toolCallId: "1",
	approvalMode: "always",
} as const;

describe("discarded extension handler result", () => {
	it("reports a returned value on an event that consumes none", async () => {
		const { runner, errors, dispose } = await runnerFor(pi => {
			pi.on("tool_approval_requested", () => VETO);
		});
		try {
			expect(runner.hasHandlers("tool_approval_requested")).toBe(true);
			await runner.emit(APPROVAL_EVENT as never);

			expect(errors).toHaveLength(1);
			expect(errors[0]).toMatchObject({
				event: "tool_approval_requested",
				code: EXTENSION_HANDLER_RESULT_DISCARDED_CODE,
			});
			// The author has to be able to see *what* was thrown away, not just that
			// something was.
			expect(errors[0].error).toContain("cancel");
		} finally {
			dispose();
		}
	});

	it("still discards the value — reporting must not change the outcome", async () => {
		const { runner, dispose } = await runnerFor(pi => {
			pi.on("tool_approval_requested", () => VETO);
		});
		try {
			// No `RunnerEmitResult` branch exists for this event, so the value cannot
			// become a decision. If a future change made it one, this fails loudly.
			expect(await runner.emit(APPROVAL_EVENT as never)).toBeUndefined();
		} finally {
			dispose();
		}
	});

	it("stays silent when the handler returns nothing", async () => {
		// The control. Without it, a runner that reported on every dispatch would
		// pass the test above while spamming every event in the tree.
		const { runner, errors, dispose } = await runnerFor(pi => {
			pi.on("tool_approval_requested", () => undefined);
		});
		try {
			await runner.emit(APPROVAL_EVENT as never);
			expect(errors).toEqual([]);
		} finally {
			dispose();
		}
	});

	it("leaves the events that consume a result alone", async () => {
		// `session_before_switch` reads `cancel`. Reporting there would be a false
		// alarm on the one path where a returned value is the whole point.
		const { runner, errors, dispose } = await runnerFor(pi => {
			pi.on("session_before_switch", () => VETO);
		});
		try {
			const result = await runner.emit({
				type: "session_before_switch",
				sessionId: "s",
			} as never);
			expect(errors).toEqual([]);
			expect(result).toMatchObject({ cancel: true });
		} finally {
			dispose();
		}
	});
});
