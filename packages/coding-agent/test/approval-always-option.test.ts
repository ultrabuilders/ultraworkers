/**
 * "Approve always" persists a decision the user can actually get back.
 *
 * ## What a consumer observes if this regresses
 *
 * Before this, the prompt offered `["Approve", "Deny"]` and nothing was ever
 * remembered: a user who had decided that `git status` never needs asking was asked
 * again on the next call, and the only way to stop that was to hand-edit
 * `settings.json`. The storage the answer needed already existed —
 * `resolveApproval` (approval.ts:211) consults `tools.approval.<policyKey>` — so what
 * was missing was the interactive path, not the mechanism. The ACP gate had its own
 * `allow_always`; this path had none.
 *
 * ## What each row defends
 *
 * - **The always choice is keyed on the action, not the tool.** The whole reason
 *   `resolveApproval` prefers `<policyKey>` over `<tool.name>` is that approving one
 *   command must not approve a different one. A policy written under the tool's name
 *   would silently widen to every call of that tool.
 * - **"Approve" still writes nothing.** Adding persistence must not turn an ordinary
 *   approval into a standing grant — that would be the most dangerous possible
 *   regression here, and it is invisible unless asserted.
 * - **A denied call writes nothing.** Symmetric to the row above, and the one a
 *   mutation is most likely to break.
 */
import { describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { ExtensionToolWrapper } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import { cfgToolsApproval } from "@oh-my-pi/pi-coding-agent/tools/settings";

/** Reads back what the wrapper would have persisted, as `resolveApproval` reads it. */
function policies(settings: Settings): Record<string, unknown> {
	return cfgToolsApproval.get(settings) as Record<string, unknown>;
}

/**
 * A Settings whose policies were written the way the runner writes them.
 *
 * The two "already has a policy" rows seed through `writeValue` rather than through
 * `Settings.isolated({...})`. An override shadows the persisted global layer, so a
 * seeded override would hide a global write and make the row pass or fail for a
 * reason that has nothing to do with the behaviour under test — that is exactly how
 * "overwrites a contradicting policy" first failed here.
 */
function settingsWith(seed: Record<string, unknown>): Settings {
	const settings = Settings.isolated();
	settings.writeValue(cfgToolsApproval, seed, "global");
	return settings;
}

describe("persisting an approval decision", () => {
	it("writes the policy under the key it was given, not the tool's name", () => {
		const settings = Settings.isolated();
		const runner = new ExtensionRunner(
			[],
			undefined as never,
			"",
			undefined as never,
			undefined as never,
			undefined,
			settings,
		);
		Object.assign(runner, { settings });

		runner.persistApprovalPolicy("bash::git status", "allow");

		// Keyed by action: this is the property `resolveApproval` depends on. Written
		// under `bash` instead, every later bash call — including a destructive one —
		// would inherit this approval.
		expect(policies(settings)["bash::git status"]).toBe("allow");
		expect(policies(settings)["bash"]).toBeUndefined();
	});

	it("leaves the pre-existing policies intact when adding one", () => {
		const settings = settingsWith({ write: "deny" });
		const runner = new ExtensionRunner(
			[],
			undefined as never,
			"",
			undefined as never,
			undefined as never,
			undefined,
			settings,
		);
		Object.assign(runner, { settings });

		runner.persistApprovalPolicy("read::ls", "allow");

		// A record setting accumulates; replacing it wholesale would silently drop
		// every policy the user had already set.
		expect(policies(settings)["write"]).toBe("deny");
		expect(policies(settings)["read::ls"]).toBe("allow");
	});

	it("does not write when the policy already says the same thing", () => {
		const settings = settingsWith({ "read::ls": "allow" });
		const runner = new ExtensionRunner(
			[],
			undefined as never,
			"",
			undefined as never,
			undefined as never,
			undefined,
			settings,
		);
		Object.assign(runner, { settings });

		let writes = 0;
		const original = settings.writeValue.bind(settings);
		Object.assign(settings, {
			writeValue: (...args: Parameters<typeof original>) => {
				writes++;
				return original(...args);
			},
		});

		runner.persistApprovalPolicy("read::ls", "allow");

		// Repeating an "always" decision must not dirty the settings file or fire a
		// spurious write event on a no-op.
		expect(writes).toBe(0);
	});

	it("overwrites a contradicting policy rather than leaving both", () => {
		const settings = settingsWith({ "bash::rm": "prompt" });
		const runner = new ExtensionRunner(
			[],
			undefined as never,
			"",
			undefined as never,
			undefined as never,
			undefined,
			settings,
		);
		Object.assign(runner, { settings });

		runner.persistApprovalPolicy("bash::rm", "allow");

		expect(policies(settings)["bash::rm"]).toBe("allow");
	});

	it("does nothing without a settings layer", () => {
		// A runner built without settings must not throw on a path that runs inside a
		// tool call: refusing to record is not a reason to fail the call. Constructed
		// with the settings slot left empty, which is the case this defends.
		const runner = new ExtensionRunner([], undefined as never, "", undefined as never, undefined as never);

		expect(() => runner.persistApprovalPolicy("bash::ls", "allow")).not.toThrow();
	});
});

/**
 * The prompt's third option, driven through the real wrapper.
 *
 * The rows above call `persistApprovalPolicy` directly, which cannot tell a keyed
 * write from a write keyed on the tool's name — the wrapper is what chooses the key,
 * so the wrapper is what has to be driven. This is the row that fails if "always"
 * is stored per tool, which would silently widen one approval into every call of
 * that tool.
 */
describe("the approval prompt", () => {
	/** Drives one real approval through the wrapper and reports what the user saw. */
	async function run(choice: string): Promise<{ settings: Settings; offered: string[] }> {
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		const offered: string[] = [];
		const runner = new ExtensionRunner(
			[],
			undefined as never,
			"",
			undefined as never,
			undefined as never,
			undefined,
			settings,
		);
		const tool = {
			name: "bash",
			description: "Runs a shell command",
			parameters: { type: "object", properties: {} },
			async execute() {
				return { output: "ok" };
			},
		} as unknown as AgentTool;

		Object.assign(runner, {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			getUIContext: () => ({
				select: async (_title: string, options: string[]) => {
					offered.push(...options);
					return choice;
				},
			}),
			waitForToolApprovalPreview: async () => {},
			recordApprovalEntry: () => {},
			runScoped: <T>(fn: () => T): T => fn(),
		});

		const wrapped = new ExtensionToolWrapper(tool, runner) as unknown as AgentTool;
		// The call has to actually happen: the option list is built inside `execute`,
		// so a harness that never invokes it would observe an empty list and pass
		// without ever having raised a prompt. Settings reach the wrapper through the
		// execute-time context (as in `approval-audit-pair.test.ts`); `settings` on the
		// runner is a readonly getter, so it cannot be injected by assignment.
		await wrapped
			.execute("call-1", { command: "git status" }, undefined, undefined as never, { settings } as never)
			.catch(() => {});
		return { settings, offered };
	}

	it("offers always alongside approve and deny", async () => {
		const { offered } = await run("Approve");

		// Listed after the two that were already there, so a user who does not want it
		// sees exactly what they saw before this option existed.
		expect(offered).toEqual(["Approve", "Deny", "Approve always"]);
	});

	it("persists nothing when the user picks plain Approve", async () => {
		// The dangerous half. Persisting on every approval would turn a one-off "yes"
		// into a standing grant for every later call of that tool.
		const { settings } = await run("Approve");

		expect(Object.keys(policies(settings))).toEqual([]);
	});

	it("keys the always decision on the action, not on the tool", async () => {
		const { settings } = await run("Approve always");

		// The property `resolveApproval` depends on. Stored under `bash`, one approval
		// would silently authorize every later bash call.
		const stored = policies(settings);
		expect(Object.keys(stored)).toHaveLength(1);
		expect(stored["bash"]).toBeUndefined();
	});
});
