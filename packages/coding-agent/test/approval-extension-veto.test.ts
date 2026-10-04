/**
 * An extension can deny a tool call the user was about to be asked to approve.
 *
 * ## What a consumer observes if this regresses
 *
 * `tool_approval_requested` fired before the prompt with a value that `emit` already
 * returned and the call site threw away, so an extension could watch an approval and
 * had no way to act on it. A policy extension — the whole reason this seam exists —
 * could only log.
 *
 * ## The three rows, and why each is here
 *
 * - **The veto denies without prompting.** Not "denies eventually" — the prompt must
 *   never be built. A veto that still opened the dialog would let the user approve a
 *   call an extension had already refused, and the refusal would be a suggestion.
 * - **No handler still prompts.** This is the default-preservation row. The seam adds
 *   a capability; it must not change a single call for an extension that registered
 *   nothing. If it regressed, every approval would silently stop happening.
 * - **A handler that throws still prompts.** The dangerous direction. A first-truthy-
 *   wins short-circuit means a failing handler produces `undefined`, which is exactly
 *   what "no handler objected" looks like — so a broken extension would otherwise
 *   become an allow. The sibling test in `extensions-discarded-handler-result.test.ts`
 *   pins that at the runner; this row pins that it survives the trip through the
 *   wrapper, where an allow is acted upon rather than merely returned.
 */
import { describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { ExtensionToolWrapper } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import { ToolCallBlockedError } from "@oh-my-pi/pi-coding-agent/extensibility/shared-events";

/**
 * `runner.sessionId` is a prototype getter that dereferences `sessionManager`, so it
 * cannot be supplied by `Object.assign` — a fake set that way throws before the prompt
 * is ever reached, and a test that never reaches the prompt passes for the wrong
 * reason. Only `getSessionId` is read on these paths.
 */
function sessionStub(): ConstructorParameters<typeof ExtensionRunner>[3] {
	return { getSessionId: () => "veto-test-session" } as unknown as ConstructorParameters<typeof ExtensionRunner>[3];
}

interface Harness {
	runner: ExtensionRunner;
	execute: () => Promise<unknown>;
	offered: string[];
}

function harness(handlers: (() => unknown)[] | null): Harness {
	const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
	const runner = new ExtensionRunner(
		[],
		undefined as never, // runtime
		"", // cwd, ignored: read live via the getter
		sessionStub(),
		undefined as never, // modelRegistry
		undefined, // getMemory
		settings,
	);

	const offered: string[] = [];
	let executed = false;
	const tool = {
		name: "bash",
		description: "Runs a shell command",
		parameters: { type: "object", properties: {} },
		async execute() {
			executed = true;
			return { output: "ok" };
		},
	} as unknown as AgentTool;

	Object.assign(runner, {
		hasHandlers: (event: string) => (event === "tool_approval_requested" ? handlers !== null : false),
		consumeToolCallEmitted: () => false,
		hasUI: () => true,
		getUIContext: () => ({
			select: async (_title: string, options: string[]) => {
				offered.push(...options);
				return "Approve";
			},
		}),
		waitForToolApprovalPreview: async () => {},
		recordApprovalEntry: () => {},
		emit: async () => {
			// Mirrors the runner's own contract for these two properties, because the
			// wrapper is what this file is about: a throwing handler yields `undefined`
			// (the runner catches it in `#runHandlerWithTimeout`), and the first truthy
			// result wins. A stub that merely propagated the throw would make the
			// fail-open row pass for the wrong reason.
			if (!handlers) return undefined;
			for (const handler of handlers) {
				let result: unknown;
				try {
					result = await handler();
				} catch {
					result = undefined;
				}
				if (result) return result;
			}
			return undefined;
		},
		runScoped: <T>(fn: () => T): T => fn(),
	});

	const wrapped = new ExtensionToolWrapper(tool, runner) as unknown as AgentTool;
	const execute = async (): Promise<unknown> => {
		const result = await wrapped.execute(
			"call-1",
			{ command: "rm -rf ./build" },
			undefined,
			undefined as never,
			{ settings } as never,
		);
		if (!executed) throw new Error("tool body never ran");
		return result;
	};

	return { runner, execute, offered };
}

describe("an extension vetoing an approval", () => {
	it("denies the call without ever putting the prompt on screen", async () => {
		const { execute, offered } = harness([() => ({ cancel: true, reason: "blocked by policy" })]);

		await expect(execute()).rejects.toThrow(ToolCallBlockedError);
		// The property that makes this a veto rather than a denial after the fact: no
		// options were ever offered, so the user was never in a position to override it.
		expect(offered).toEqual([]);
	});

	it("carries the extension's reason into the error the model sees", async () => {
		const { execute } = harness([() => ({ cancel: true, reason: "blocked by policy" })]);

		// A bare "denied" would tell the model nothing about which policy refused, so
		// it could not adapt — the reason is the part an extension author wrote on purpose.
		await expect(execute()).rejects.toThrow(/blocked by policy/);
	});

	it("still prompts when no extension vetoes, so the default is unchanged", async () => {
		// The default-preservation row. An extension that registered nothing must see
		// byte-identical behaviour: prompt offered, Approve chosen, tool runs.
		const { execute, offered } = harness(null);

		await execute();
		expect(offered).toEqual(["Approve", "Deny", expect.any(String)]);
	});

	it("still prompts when a vetoing handler throws", async () => {
		// The fail-open row. `emit` yields `undefined` for a handler that throws, which
		// is what "no handler objected" looks like — so this asserts the broken
		// extension did NOT become a silent allow. Without it, an exception in a policy
		// extension would approve every destructive call in the session.
		const { execute, offered } = harness([
			() => {
				throw new Error("policy service unreachable");
			},
		]);

		await execute();
		expect(offered.length).toBeGreaterThan(0);
	});
});
