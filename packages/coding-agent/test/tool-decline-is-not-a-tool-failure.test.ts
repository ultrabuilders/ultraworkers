/**
 * A refusal the operator gave is not a tool that crashed.
 *
 * ## What a consumer observes if this regresses
 *
 * The decline path threw a plain `Error`. `agent-loop` decides a call's terminal
 * span status with `caughtError instanceof ToolCallBlockedError`
 * (`agent-loop.ts:3584`), so a plain error missed that test and was filed as
 * `"error"` — the same bucket as a shell that exited non-zero. Two consequences,
 * both observable without reading any source:
 *
 * 1. Telemetry cannot tell a refusal from a crash. "The agent kept retrying a
 *    command the operator refused" is invisible on a span that says `"error"`.
 * 2. The model receives the refusal as ordinary error output, which it has every
 *    reason to retry — the response to a crash is a variation, and the response
 *    to a refusal is to stop asking.
 *
 * ## Why the type, and why *this* type
 *
 * `ToolCallBlockedError` is declared once, in `packages/agent`, and
 * `tool-call-block-kind-boundary.test.ts` already pins that the class thrown on
 * this side is the one the runtime recognises on the other. That test made a
 * second, decline-specific class in this package the wrong move: a new class
 * would not be `instanceof` the runtime's, so it would reintroduce exactly the
 * bug that test was written to prevent. Reusing the existing class is what makes
 * the decline reach the runtime as a block rather than an error.
 *
 * Asserted on the thrown value rather than on the span, because the span status is
 * `agent-loop`'s decision and already has its own coverage; what was untested is
 * which type this path produces. The rows below would all pass if the wrapper threw
 * a subclass that carried the right name — so the negative row pins that a *crash*
 * on this same path has not quietly acquired the block classification, which is
 * what would make real failures file as deliberate refusals.
 */
import { describe, expect, it } from "bun:test";
import { ToolCallBlockedError } from "@oh-my-pi/pi-agent-core/run-collector";
import { ExtensionToolWrapper } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";

function runner(choice: "Approve" | "Deny", opts: { hasUI?: boolean } = {}): ExtensionRunner {
	return {
		hasHandlers: () => false,
		consumeToolCallEmitted: () => false,
		hasUI: () => opts.hasUI ?? true,
		sessionId: "tool-decline-test",
		getUIContext: () => ({
			select: async () => choice,
		}),
		waitForToolApprovalPreview: async () => {},
		recordApprovalEntry: () => {},
		runScoped<T>(fn: () => T): T {
			return fn();
		},
	} as unknown as ExtensionRunner;
}

function tool(throwing?: () => never): AgentTool {
	return {
		name: "dangerous",
		description: "A tool the operator may refuse",
		parameters: { type: "object", properties: {} },
		async execute() {
			if (throwing) throwing();
			return { output: "ran" };
		},
	} as unknown as AgentTool;
}

async function executeWrapped(r: ExtensionRunner, t: AgentTool): Promise<unknown> {
	const wrapped = new ExtensionToolWrapper(t, r) as unknown as AgentTool;
	return wrapped.execute("call-1", {}, undefined, undefined as never, undefined as never);
}

describe("an operator refusal is a block, not a tool failure", () => {
	it("throws the type the runtime classifies as blocked", async () => {
		const thrown = await executeWrapped(runner("Deny"), tool()).then(
			() => undefined,
			(err: unknown) => err,
		);

		// The assertion that matters: `agent-loop.ts:3584` tests exactly this, and
		// only a true answer files the span as `"blocked"` instead of `"error"`.
		expect(thrown).toBeInstanceOf(ToolCallBlockedError);
	});

	it("keeps the transcript wording the approval flow already produced", async () => {
		// The message is user-facing prose that existing assertions and transcripts
		// depend on. Reclassifying a refusal must not silently reword it — a consumer
		// grepping for this string would find nothing and conclude the prompt changed.
		const thrown = (await executeWrapped(runner("Deny"), tool()).then(
			() => undefined,
			(err: unknown) => err,
		)) as Error;

		expect(thrown.message).toBe("Tool call denied by user: dangerous");
	});

	it("carries the `denied` kind, so a hook malfunction is not filed as a decision", async () => {
		const thrown = (await executeWrapped(runner("Deny"), tool()).then(
			() => undefined,
			(err: unknown) => err,
		)) as ToolCallBlockedError;

		// `kind` is the second half of the distinction. Filing a refusal as
		// `hook-failed` would report a deliberate decision as a malfunction.
		expect(thrown.kind).toBe("denied");
	});

	it("does not run the tool", async () => {
		let ran = false;
		await executeWrapped(
			runner("Deny"),
			tool(() => {
				ran = true;
				throw new Error("unreachable");
			}),
		).catch(() => {});

		// The block is a block: classification is not a licence to run.
		expect(ran).toBe(false);
	});

	it("leaves a genuine crash unclassified, so a failure is not filed as a refusal", async () => {
		// The negative half. Reclassifying the decline path must not become
		// reclassifying every error: a tool that throws for its own reasons is a
		// crash, and filing it as `"blocked"` would under-report real breakage.
		const boom = new Error("segfault in native code");
		const thrown = await executeWrapped(
			runner("Approve"),
			tool(() => {
				throw boom;
			}),
		).then(
			() => undefined,
			(err: unknown) => err,
		);

		expect(thrown).toBe(boom);
		expect(thrown).not.toBeInstanceOf(ToolCallBlockedError);
	});

	it("blocks the headless refusal too, not only the prompted one", async () => {
		// The no-UI exit is a second door out of the same decision, and it exited by
		// throwing a plain `Error`. A host without a UI declines every gated call, so
		// leaving that door untyped would classify every headless run as crashing.
		const headless = runner("Approve", { hasUI: false });
		const thrown = await executeWrapped(headless, tool()).then(
			() => undefined,
			(err: unknown) => err,
		);

		expect(thrown).toBeInstanceOf(ToolCallBlockedError);
		expect((thrown as ToolCallBlockedError).kind).toBe("denied");
	});
});
