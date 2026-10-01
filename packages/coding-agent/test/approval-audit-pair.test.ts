import { describe, expect, it } from "bun:test";
import { ExtensionToolWrapper } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { APPROVAL_ENTRY_TYPE, type ApprovalEntry } from "@oh-my-pi/pi-coding-agent/session/session-entries";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
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
