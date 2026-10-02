import { describe, expect, it } from "bun:test";
import { ExtensionToolWrapper } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import {
	APPROVAL_ENTRY_TYPE,
	isApprovalDenial,
	type ApprovalEntry,
} from "@oh-my-pi/pi-coding-agent/session/session-entries";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { BashTool } from "@oh-my-pi/pi-coding-agent/tools/bash";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";

/**
 * One approval prompt must leave EXACTLY TWO entries — one `asked`, one `answered`.
 *
 * This drives `ExtensionToolWrapper`, the surface a real extension tool is called on,
 * rather than `pairApprovalEntries` over hand-built objects. `approval-audit.test.ts`
 * covers the reader over in-memory entries; this covers the writer, and no reader can
 * tell a doubled write from a single one.
 *
 * Why `toHaveLength(2)` and not "at least one": a writer that emits once per event
 * instead of once per prompt produces a log that is still *correct* — both halves and
 * the decision are present, it just carries a duplicate. Nothing downstream breaks, and
 * `expect(entries.length).toBeGreaterThan(0)` stays green on it. But the entry exists to
 * answer "who approved this", and a duplicated pair turns that into "two people approved
 * this, or one person twice", which the audit command cannot distinguish. Only an exact
 * count catches it.
 */

interface Harness {
	runner: ExtensionRunner;
	entries: ApprovalEntry[];
}

/**
 * A runner that records what the wrapper asks core to record, and answers the approval
 * prompt with `choice`. `getUIContext().select` is the real seam the wrapper uses, and
 * `hasUI` must be true or the wrapper takes the no-UI branch and denies.
 */
function harness(choice: "Approve" | "Deny", onDeny?: () => void): Harness {
	const entries: ApprovalEntry[] = [];
	const runner = {
		hasHandlers: () => false,
		consumeToolCallEmitted: () => false,
		hasUI: () => true,
		sessionId: "approval-audit-pair-test",
		getUIContext: () => ({
			select: async () => {
				onDeny?.();
				return choice;
			},
		}),
		waitForToolApprovalPreview: async () => {},
		recordApprovalEntry: (half: Omit<ApprovalEntry, "type">) => {
			entries.push({ ...half, type: APPROVAL_ENTRY_TYPE } as ApprovalEntry);
		},
		runScoped<T>(fn: () => T): T {
			return fn();
		},
	} as unknown as ExtensionRunner;
	return { runner, entries };
}

function fakeTool(name: string): AgentTool {
	return {
		name,
		description: `fake ${name}`,
		parameters: { type: "object", properties: {} },
		// An object decision carrying a narrower `policyKey` is the case the audit has
		// to get right: `tier` decides the capability class, `policy` forces the ask,
		// and `policyKey` says which user-policy entry decides it.
		approval: { tier: "exec", policy: "prompt", policyKey: `${name}:dangerous` },
		async execute() {
			return { output: "ok" };
		},
	} as unknown as AgentTool;
}

/** Drive one wrapped call and return the entries it recorded. A denial throws. */
async function runApproval(
	tool: AgentTool,
	choice: "Approve" | "Deny",
	settingsOverrides: Record<string, unknown> = {},
): Promise<ApprovalEntry[]> {
	const { runner, entries } = harness(choice);
	const wrapped = new ExtensionToolWrapper(tool, runner) as unknown as AgentTool;
	const settings = Settings.isolated({
		"tools.approvalMode": "always-ask",
		...settingsOverrides,
	});
	try {
		await wrapped.execute("call-1", {}, undefined, undefined as never, { settings } as never);
	} catch {
		// A denial throws after recording; the entries are what this file is about.
	}
	return entries;
}

describe("approval audit records exactly one pair per prompt", () => {
	it("writes exactly two entries for one prompt, sharing the id that ties them", async () => {
		const entries = await runApproval(fakeTool("bash"), "Approve");

		expect(entries).toHaveLength(2);
		expect(entries.map(e => e.phase)).toEqual(["asked", "answered"]);
		// `requestId` is what pairs the halves; the wrapper passes the tool call id, so
		// both halves naming the same call is what lets the reader join them.
		expect(entries[0]?.requestId).toBe(entries[1]?.requestId);
		expect(entries[0]?.requestId).toBe("call-1");
	});

	it("records the decision the gate actually applied", async () => {
		const entries = await runApproval(fakeTool("bash"), "Deny");

		expect(entries).toHaveLength(2);
		expect(entries[1]?.decision).toBe("denied");
		// The `asked` half must carry no decision: recording one there would make an
		// unresolved prompt indistinguishable from an answered one.
		expect(entries[0]?.decision).toBeUndefined();
	});

	it("records both halves under the policy key the decision resolved under, not the tool name", async () => {
		// The tool declares `bash:dangerous`, so a log naming `bash` would misreport
		// which rule fired. The audit exists to name the rule that fired.
		const entries = await runApproval(fakeTool("bash"), "Approve");

		expect(entries).toHaveLength(2);
		expect(entries[0]?.policyKey).toBe("bash:dangerous");
		expect(entries[1]?.policyKey).toBe("bash:dangerous");
	});

	it("records nothing when the policy resolves without asking anyone", async () => {
		// yolo never puts the question to a human, so there is no prompt to audit.
		// Writing entries here would put "asked" in the log for a question that was
		// never asked — and would do it on every single tool call.
		//
		// The tool must NOT declare its own prompt policy: measured against
		// `resolveApproval`, an explicit `policy: "prompt"` is asked even under yolo,
		// which is deliberate fail-closed behaviour. A tool that declares nothing
		// resolves to `allow` under yolo and is never asked.
		const entries = await runApproval(
			{
				name: "bash",
				parameters: { type: "object", properties: {} },
				async execute() {
					return { output: "ok" };
				},
			} as unknown as AgentTool,
			"Approve",
			{ "tools.approvalMode": "yolo" },
		);

		expect(entries).toEqual([]);
	});

	it("still asks a tool that declares its own prompt policy, even under yolo", async () => {
		// The counterpart to the row above, and the reason the row above needs a tool
		// that declares nothing: `policy: "prompt"` is the tool's own floor and yolo
		// does not lower it. If this ever starts recording nothing, the audit has lost
		// the half that matters — a prompt that was asked and answered.
		const entries = await runApproval(fakeTool("bash"), "Approve", {
			"tools.approvalMode": "yolo",
		});

		expect(entries).toHaveLength(2);
	});

	it("does not record a second pair when the same call is executed twice", async () => {
		// The answered half is guarded by an `approvalAnswered` flag, because every
		// terminal outcome funnels through `emitApprovalResolved` and a recorder that
		// double-writes would corrupt the very absence — "asked with no answer" — that
		// makes a crash legible. Two executions are two prompts, so four entries; the
		// invariant under test is that each prompt contributes exactly one pair.
		const { runner, entries } = harness("Approve");
		const wrapped = new ExtensionToolWrapper(fakeTool("bash"), runner) as unknown as AgentTool;
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });

		await wrapped.execute("call-1", {}, undefined, undefined as never, { settings } as never);
		await wrapped.execute("call-2", {}, undefined, undefined as never, { settings } as never);

		expect(entries).toHaveLength(4);
		expect(entries.filter(e => e.phase === "asked")).toHaveLength(2);
		expect(entries.filter(e => e.phase === "answered")).toHaveLength(2);
		expect(new Set(entries.map(e => e.requestId)).size).toBe(2);
	});

	it("writes one answered half even when the prompt is abandoned after the question", async () => {
		// `emitApprovalResolved` has three call sites that can run for one prompt: the
		// selection, a `select` that throws, and the no-UI denial. Whichever fires, the
		// session must end up with a single answer — a second one would report two
		// decisions for one prompt, which is the ambiguity this entry type removes.
		// The aborted-selection path is used here because it is the one a real user
		// reaches by pressing escape.
		const entries: ApprovalEntry[] = [];
		const runner = {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			sessionId: "approval-audit-abort-test",
			getUIContext: () => ({
				select: async () => {
					throw new Error("aborted by user");
				},
			}),
			waitForToolApprovalPreview: async () => {},
			recordApprovalEntry: (half: Omit<ApprovalEntry, "type">) => {
				entries.push({ ...half, type: APPROVAL_ENTRY_TYPE } as ApprovalEntry);
			},
			runScoped<T>(fn: () => T): T {
				return fn();
			},
		} as unknown as ExtensionRunner;

		const wrapped = new ExtensionToolWrapper(fakeTool("bash"), runner) as unknown as AgentTool;
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		await expect(
			wrapped.execute("call-1", {}, undefined, undefined as never, { settings } as never),
		).rejects.toThrow();

		// Asked, then answered once by the abort. Two entries, still a pair: the reader
		// must not see this as a prompt left open by a crash.
		expect(entries).toHaveLength(2);
		expect(entries.filter(e => e.phase === "asked")).toHaveLength(1);
		expect(entries.filter(e => e.phase === "answered")).toHaveLength(1);
		expect(entries[1]?.decision).toBe("denied");
	});
});

/**
 * A refusal decided *before* anyone was asked still has to be in the audit.
 *
 * The pair contract above is about a prompt: two entries, one `asked` one
 * `answered`. This is the other refusal, and it was invisible. Both `deny` sites in
 * the wrapper threw `denyError` and recorded nothing, so a critical `bash` command —
 * which resolves to `policy: "deny"` straight from the tool's approval function, with
 * no prompt — was refused in front of the user and left no trace in the transcript.
 *
 * What makes this a gap rather than an absent feature: `isApprovalDenial`, the reader
 * `blockedBy` is built on, already accepts `phase: "answered"` carrying
 * `policy: "deny"`. The reader was written for an entry no writer produced.
 */
function denyingTool(name: string): AgentTool {
	return {
		name,
		description: `denying ${name}`,
		parameters: { type: "object", properties: {} },
		// The exact shape `BashTool.approval` returns for a critical pattern: an
		// override that also carries a deny policy. Copied rather than approximated,
		// because the wrapper's behaviour keys off `policy`, not off the tool's name.
		approval: { tier: "exec", override: true, policy: "deny", reason: "Critical pattern detected" },
		async execute() {
			return { output: "must not run" };
		},
	} as unknown as AgentTool;
}

describe("a policy denial is auditable without a prompt", () => {
	it("records the refusal so the reader can name what blocked the turn", async () => {
		const { runner, entries } = harness("Deny");
		const wrapped = new ExtensionToolWrapper(denyingTool("bash"), runner) as unknown as AgentTool;
		const settings = Settings.isolated({ "tools.approvalMode": "yolo" });

		await expect(
			wrapped.execute("call-deny", {}, undefined, undefined as never, { settings } as never),
		).rejects.toThrow("blocked by tool policy");

		// Exactly one: a denial asks nothing, so there is no `asked` half to pair with,
		// and inventing one would report a question the user was never shown.
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ phase: "answered", policy: "deny", toolName: "bash", source: "tool" });
		// The reader is the consumer that matters — this is the shape `blockedBy` reads.
		expect(isApprovalDenial(entries[0]!)).toBe(true);
	});

	it("records nothing when the same call is allowed, so the entry above is not ambient", async () => {
		// Control: without this, "one denial produces an entry" is satisfied by a harness
		// that writes an entry on every call, which is its own lie.
		const { runner, entries } = harness("Approve");
		const wrapped = new ExtensionToolWrapper(fakeTool("bash"), runner) as unknown as AgentTool;
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });

		await wrapped.execute("call-allowed", {}, undefined, undefined as never, { settings } as never);

		expect(entries.every(entry => !isApprovalDenial(entry))).toBe(true);
		expect(entries.some(entry => entry.policy === "deny")).toBe(false);
	});
});

/**
 * The seam, end to end: the real `BashTool`, the real critical-pattern path.
 *
 * `denyingTool` above reproduces the *shape* of a critical decision, which proves
 * the wrapper records what it is handed. It cannot prove the thing that actually
 * regressed: that `BashTool.approval` returns `policy: "deny"` for a critical
 * command at all. That decision is made in `bash.ts`, a different file, and a
 * fake tool would stay green if it were reverted — so the audit would be shown to
 * cover a denial the product no longer produces.
 *
 * `rm -rf /` is the only command that reaches that branch, which is what makes it
 * worth naming rather than reaching for any non-empty command.
 */
describe("a critical bash command is the denial this records", () => {
	it("writes the refusal the real tool produces, not a stand-in", async () => {
		const { runner, entries } = harness("Deny");
		const bash = new BashTool({
			settings: Settings.isolated({ "tools.approvalMode": "yolo" }),
		} as unknown as ConstructorParameters<typeof BashTool>[0]);
		const wrapped = new ExtensionToolWrapper(bash, runner) as unknown as AgentTool;
		const settings = Settings.isolated({ "tools.approvalMode": "yolo" });

		await expect(
			wrapped.execute(
				"call-critical",
				{ command: "rm -rf /" },
				undefined,
				undefined as never,
				{
					settings,
				} as never,
			),
		).rejects.toThrow("Critical pattern detected");

		expect(entries).toHaveLength(1);
		expect(isApprovalDenial(entries[0]!)).toBe(true);
		expect(entries[0]).toMatchObject({ phase: "answered", policy: "deny", toolName: "bash" });
	});

	it("stays quiet on a command the classifier does not flag", async () => {
		// Control with the real tool on the other side of the same branch: reverting
		// W6 makes this pass and the test above fail, which is the pair that says the
		// first one is about the classifier and not about the recorder.
		const { runner, entries } = harness("Approve");
		const bash = new BashTool({
			settings: Settings.isolated({ "tools.approvalMode": "always-ask" }),
		} as unknown as ConstructorParameters<typeof BashTool>[0]);
		const wrapped = new ExtensionToolWrapper(bash, runner) as unknown as AgentTool;
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });

		await expect(
			wrapped.execute(
				"call-benign",
				{ command: "echo hello" },
				undefined,
				undefined as never,
				{
					settings,
				} as never,
			),
		).rejects.toThrow();

		expect(entries.some(entry => isApprovalDenial(entry))).toBe(false);
	});
});
