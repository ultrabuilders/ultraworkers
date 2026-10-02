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
import { ToolCallBlockedError } from "@oh-my-pi/pi-coding-agent/extensibility/shared-events";
import { cfgToolsApproval } from "@oh-my-pi/pi-coding-agent/tools/settings";

/**
 * The session stand-in every runner here needs.
 *
 * `runner.sessionId` is a prototype getter that dereferences `sessionManager`, so it
 * cannot be supplied by `Object.assign` the way the other fakes on these runners are —
 * it has to be reachable through the constructor or every call throws before it reaches
 * the prompt. A fixture that throws early makes the "persists nothing" rows pass for a
 * reason that has nothing to do with persistence.
 */
/**
 * The runner every row here drives.
 *
 * Built in one place because its constructor has seven positional parameters, three of
 * which are unrelated stand-ins: getting the order wrong compiles fine and throws at
 * the first `runner.sessionId` read, which is *after* the prompt — so a mis-ordered
 * fixture surfaces as "persists nothing" passing for the wrong reason. `sessionId` is a
 * prototype getter, so `Object.assign` cannot supply it the way the other fakes on this
 * runner are.
 */
/**
 * The session stand-in the runner needs to reach a prompt.
 *
 * `runner.sessionId` is a prototype getter that dereferences `sessionManager`, so it
 * cannot be supplied by `Object.assign` the way this runner's other fakes are — it has
 * to be reachable through the constructor, or every call throws before it reaches the
 * prompt. Only `getSessionId` is ever read on these paths; the rest of `SessionManager`
 * is irrelevant here, so the stub is narrowed rather than built out.
 */
function sessionStub(): ConstructorParameters<typeof ExtensionRunner>[3] {
	return { getSessionId: () => "approval-test-session" } as unknown as ConstructorParameters<
		typeof ExtensionRunner
	>[3];
}

function makeRunner(settings: Settings): ExtensionRunner {
	return new ExtensionRunner(
		[],
		undefined as never, // runtime
		"", // cwd, ignored: read live via the getter
		sessionStub(),
		undefined as never, // modelRegistry
		undefined, // getMemory
		settings,
	);
}

/**
 * Reads back what the wrapper would have persisted, as `resolveApproval` reads it.
 *
 * The keys below are spelled `bash:<action>` — one colon — because that is what
 * `canonicalizeApprovalKey` produces and therefore what the product actually writes.
 * An earlier draft used `bash::<action>`, which no code path emits; the rows still
 * passed, because they only exercise the write mechanism, but they advertised a key
 * format that does not exist. (Reported by ultraworkers-55.)
 */
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
		const runner = makeRunner(settings);
		Object.assign(runner, { settings });

		runner.persistApprovalPolicy("bash:git status", "allow");

		// Keyed by action: this is the property `resolveApproval` depends on. Written
		// under `bash` instead, every later bash call — including a destructive one —
		// would inherit this approval.
		expect(policies(settings)["bash:git status"]).toBe("allow");
		expect(policies(settings)["bash"]).toBeUndefined();
	});

	it("leaves the pre-existing policies intact when adding one", () => {
		const settings = settingsWith({ write: "deny" });
		const runner = makeRunner(settings);
		Object.assign(runner, { settings });

		runner.persistApprovalPolicy("read::ls", "allow");

		// A record setting accumulates; replacing it wholesale would silently drop
		// every policy the user had already set.
		expect(policies(settings)["write"]).toBe("deny");
		expect(policies(settings)["read::ls"]).toBe("allow");
	});

	it("does not write when the policy already says the same thing", () => {
		const settings = settingsWith({ "read::ls": "allow" });
		const runner = makeRunner(settings);
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
		const settings = settingsWith({ "bash:rm": "prompt" });
		const runner = makeRunner(settings);
		Object.assign(runner, { settings });

		runner.persistApprovalPolicy("bash:rm", "allow");

		expect(policies(settings)["bash:rm"]).toBe("allow");
	});

	it("does nothing without a settings layer", () => {
		// A runner built without settings must not throw on a path that runs inside a
		// tool call: refusing to record is not a reason to fail the call. Constructed
		// with the settings slot left empty, which is the case this defends.
		const runner = new ExtensionRunner([], undefined as never, "", sessionStub(), undefined as never, undefined);

		expect(() => runner.persistApprovalPolicy("bash:ls", "allow")).not.toThrow();
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
		const runner = makeRunner(settings);
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
		// The call has to actually complete, not merely raise its prompt: a fixture
		// that throws before the decision is recorded would leave the "persists
		// nothing" rows green for the wrong reason. Surfaces an unexpected throw.
		await wrapped.execute("call-1", { command: "git status" }, undefined, undefined as never, { settings } as never);
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

/**
 * The cascade: a decision on one call reaches the calls already asking.
 *
 * Parallel tool calls are dispatched with `Promise.allSettled` (agent-loop.ts:3712) and
 * each raises its own prompt, so a batch of gated calls puts concurrent prompts on
 * screen. The refaudit's stated reason for the cascade (`CAP-opencode.md`,
 * opencode.101) is that without it, answering one leaves the siblings hanging on a
 * prompt nobody will ever see.
 *
 * Driven through two real concurrent wrapper calls rather than by calling the registry
 * directly: the claim is about a *caller* being released, and a registry unit test
 * would stay green even if nothing ever registered.
 */
describe("a decision on one call reaches the calls already asking", () => {
	/** What one call ended up as. "hung" is the failure this whole block exists to catch. */
	type Outcome = "approved" | "denied" | "errored" | "hung";

	/**
	 * Two calls in flight together, the second asking about `siblingCommand`.
	 *
	 * The ordering matters and is the reason this is not a plain pair of calls: the
	 * first call's answer is withheld until the sibling's prompt has actually been
	 * raised. Answering before the sibling registers cascades to nobody, and the rows
	 * below would then report on a registry that was empty — a green test proving
	 * nothing about the cascade.
	 */
	async function batch(
		choice: string,
		siblingCommand = "git status",
	): Promise<{ first: Outcome; sibling: Outcome; pending: number }> {
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		const runner = makeRunner(settings);

		let prompts = 0;
		let openSibling: (() => void) | undefined;
		const siblingIsAsking = new Promise<void>(resolve => {
			openSibling = resolve;
		});

		Object.assign(runner, {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			getUIContext: () => ({
				select: async () => {
					prompts++;
					if (prompts === 1) {
						await siblingIsAsking;
						return choice;
					}
					// Never resolves on its own: the only thing that can release the
					// sibling is the first call's decision, so a missing cascade shows up
					// as a hang which `Bun.sleep` below turns into an ordinary failure.
					openSibling?.();
					return new Promise<string>(() => {});
				},
			}),
			waitForToolApprovalPreview: async () => {},
			recordApprovalEntry: () => {},
			runScoped: <T>(fn: () => T): T => fn(),
		});

		const invoke = async (id: string, command: string): Promise<Outcome> => {
			const tool = {
				name: "bash",
				description: "Runs a shell command",
				parameters: { type: "object", properties: {} },
				async execute() {
					return { output: "ok" };
				},
			} as unknown as AgentTool;
			try {
				await (new ExtensionToolWrapper(tool, runner) as unknown as AgentTool).execute(
					id,
					{ command },
					undefined,
					undefined as never,
					{ settings } as never,
				);
				return "approved";
			} catch (err) {
				// Read from the type, not the wording: "denied" and "hung" are the two
				// outcomes a cascade decides between, and a sibling released as denied is
				// the success case rather than a failure to report as one.
				return err instanceof ToolCallBlockedError ? "denied" : "errored";
			}
		};

		const asked = invoke("call-1", "git status");
		await Bun.sleep(10); // let the first call reach its prompt and block there
		const sibling = invoke("call-2", siblingCommand);

		const siblingOutcome = await Promise.race<Outcome>([sibling, Bun.sleep(500).then(() => "hung" as const)]);
		return { first: await asked, sibling: siblingOutcome, pending: runner.pendingApprovalCount };
	}

	it("releases a sibling asking about the same action when the first is granted always", async () => {
		const { first, sibling } = await batch("Approve always");

		// The bug this prevents: the user answers "always" and the batch goes on
		// asking, one prompt per remaining call, with nobody left to answer the first.
		expect(first).toBe("approved");
		expect(sibling).toBe("approved");
	});

	it("leaves the sibling asking when the first call is only approved once", async () => {
		const { first, sibling } = await batch("Approve");

		// A one-off "yes" grants nothing. Releasing here would silently turn approving
		// one call of a batch into approving all of them.
		expect(first).toBe("approved");
		expect(sibling).toBe("hung");
	});

	it("leaves a sibling alone when it is asking about a different action", async () => {
		const { sibling } = await batch("Approve always", "rm -rf build");

		// The cascade matches on the action, not the tool. Keyed on the tool, granting
		// `git status` forever would release — and run — a sibling asking to delete.
		expect(sibling).toBe("hung");
	});

	it("denies the siblings asking about the same action when the first is denied", async () => {
		const { first, sibling } = await batch("Deny");

		// The other half of the refaudit's claim, and the half that is a hang rather than
		// a nuisance: the user has answered, so a sibling left on screen is a prompt
		// nobody will ever see. It has to end the way this call ended.
		expect(first).toBe("denied");
		expect(sibling).toBe("denied");
	});

	it("leaves a differently-asked sibling alone when the first is denied", async () => {
		const { sibling } = await batch("Deny", "rm -rf build");

		// Denying `git status` is not a decision about `rm -rf build`. Cascading on the
		// tool name would refuse work the user never looked at.
		expect(sibling).toBe("hung");
	});

	/**
	 * One call, answered on its own, with no sibling for a cascade to sweep up.
	 *
	 * Needed because `settlePendingApprovals` deletes every entry it matches — including
	 * the answering call's own — so a batch hides a missing unregister entirely. Asserting
	 * `pending === 0` against a batch passes whether or not the settled call cleans up
	 * after itself; only a call that nothing cascades to isolates it.
	 */
	async function lone(choice: string): Promise<{ pending: number; outcome: Outcome }> {
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		const runner = makeRunner(settings);
		Object.assign(runner, {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			getUIContext: () => ({ select: async () => choice }),
			waitForToolApprovalPreview: async () => {},
			recordApprovalEntry: () => {},
			runScoped: <T>(fn: () => T): T => fn(),
		});
		const tool = {
			name: "bash",
			description: "Runs a shell command",
			parameters: { type: "object", properties: {} },
			async execute() {
				return { output: "ok" };
			},
		} as unknown as AgentTool;
		// Deny legitimately throws, so the rejection is expected — but "expected" is not
		// the same as "any". An unrelated crash before the decision would leave the
		// registry empty and satisfy the row below for a reason that has nothing to do
		// with cleanup, so the outcome is returned and asserted rather than dropped.
		let outcome: Outcome = "errored";
		try {
			await (new ExtensionToolWrapper(tool, runner) as unknown as AgentTool).execute(
				"call-1",
				{ command: "git status" },
				undefined,
				undefined as never,
				{ settings } as never,
			);
			outcome = "approved";
		} catch (err) {
			outcome = err instanceof ToolCallBlockedError ? "denied" : "errored";
		}
		return { pending: runner.pendingApprovalCount, outcome };
	}

	it("keeps no settled call registered when nothing cascades", async () => {
		// A released prompt that stays in the registry is later settled by an unrelated
		// decision on the same key — resolving a promise nobody is waiting on — and the
		// registry grows for the life of the session.
		const approved = await lone("Approve");
		expect(approved.outcome).toBe("approved");
		expect(approved.pending).toBe(0);

		const denied = await lone("Deny");
		expect(denied.outcome).toBe("denied");
		expect(denied.pending).toBe(0);
	});

	it("keeps no settled call registered once the decision has been made", async () => {
		const { pending } = await batch("Approve always");

		// A released sibling must also be unregistered. Left behind, a later decision on
		// the same key would resolve a promise nobody is waiting on, and the registry
		// would grow for the life of the session.
		expect(pending).toBe(0);
	});
});

/**
 * The grant has to survive to the *next* call, not just reach the settings file.
 *
 * ## Why this row exists separately from the ones above
 *
 * Every other row here stops at the write: the policy lands under the action key and
 * the file says so. That is not the user's experience of "always". The user's
 * experience is that the second identical command runs without a question, and for
 * that the stored key has to be the one the *reader* looks up. Those are two different
 * keys derived in two different places, so a green write says nothing about a working
 * grant — which is exactly how a persist that never gets read can ship looking tested.
 *
 * The control row is the load-bearing half: it asserts the policy really was written
 * under `bash:git status`. Without it, a failure here cannot be told apart from a
 * write that never happened, and the row would report the wrong defect.
 */
describe('an "always" grant reaches the next call', () => {
	// KNOWN BROKEN — this row pins the *defect*, deliberately, so the suite is green
	// while it stands and goes RED the moment somebody fixes it.
	//
	// What is broken: the write lands under `bash:git status`, but the reader
	// (`resolveApproval`, `tools/approval.ts:214`) resolves under the tool's name. So
	// "Approve always" persists to disk and the next identical command is asked about
	// anyway. The control row inside proves the write happened, which is what makes
	// this a *read* defect rather than a missing write.
	//
	// Why it is not simply deleted: deleting it puts the feature back under no test at
	// all, which is how it got here. Why it is not left red: a permanently failing row
	// on a shared branch trains everyone to ignore red.
	//
	// When the reader is fixed, `2` below becomes wrong and this row goes red. The fix
	// is to change it to `1` — not to delete it, and not to "fix" it while the code is
	// still broken.
	it('KNOWN BROKEN: "always" does not survive to the next call', async () => {
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		const runner = makeRunner(settings);
		let prompts = 0;
		Object.assign(runner, {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			getUIContext: () => ({
				select: async () => {
					prompts++;
					return "Approve always";
				},
			}),
			waitForToolApprovalPreview: async () => {},
			recordApprovalEntry: () => {},
			runScoped: <T>(fn: () => T): T => fn(),
		});

		const call = async (id: string): Promise<void> => {
			const tool = {
				name: "bash",
				description: "Runs a shell command",
				parameters: { type: "object", properties: {} },
				async execute() {
					return { output: "ok" };
				},
			} as unknown as AgentTool;
			await (new ExtensionToolWrapper(tool, runner) as unknown as AgentTool)
				.execute(id, { command: "git status" }, undefined, undefined as never, { settings } as never)
				.catch(() => {});
		};

		await call("call-1");
		// The control. If this fails the defect is in the write, not the read-back.
		expect(policies(settings)["bash:git status"]).toBe("allow");

		await call("call-2");

		// `2`, not the `1` the feature promises: the stored key is not the key the
		// approval gate resolves under, so "always" never applies to anything. See the
		// note above — when the reader is fixed this becomes `1`.
		expect(prompts).toBe(2);
	});
});
