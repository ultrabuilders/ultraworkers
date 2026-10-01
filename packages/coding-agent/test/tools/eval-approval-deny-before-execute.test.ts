/**
 * A `tools.approval.eval` denial must land BEFORE the eval backend runs anything.
 *
 * `eval-approval-deny-e2e.test.ts` proves the refusal the model reads. It says so itself:
 * "this exercises the approval gate, not a spawned eval backend", because the earlier version
 * of that file declared a `spawn` mock and asserted it was never called while nothing was wired
 * to call it — a zero that was true by construction.
 *
 * This closes that half against the real seam instead. The spy is on a **real `EvalTool`
 * instance's own `execute` method**, and the gate is the **real `resolveApproval`** that
 * `cursor.ts:351,1074` calls to dispatch every tool. Nothing here is a stub standing in for a
 * caller that does not exist.
 *
 * The second case is the point of the file. `expect(execute).not.toHaveBeenCalled()` on its own
 * is satisfiable by a tool that is never dispatched under any configuration — which is the exact
 * failure the previous version committed. So the control case drives the same call through the
 * same gate with the deny removed and proves `execute` *is* reached. Without it, the first
 * assertion is unfalsifiable.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { ToolSession } from "@oh-my-pi/pi-coding-agent/tools";
import { resolveApproval } from "@oh-my-pi/pi-coding-agent/tools/approval";
import { EvalTool } from "@oh-my-pi/pi-coding-agent/tools/eval";

/** Minimal real ToolSession, same shape as `ssh-url-approval.test.ts`. */
function createTestToolSession(): ToolSession {
	return {
		cwd: process.cwd(),
		hasUI: false,
		enableLsp: false,
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		settings: Settings.isolated(),
	} as unknown as ToolSession;
}

/**
 * What `cursor.ts` does with the gate's verdict: a `deny` short-circuits into the refusal
 * path and `execute` is never reached; anything else falls through to the tool.
 *
 * This mirrors the dispatcher's branch rather than re-implementing approval policy — the
 * decision comes from the real `resolveApproval`, only the branch is reproduced.
 */
async function dispatch(tool: EvalTool, args: unknown, userConfig: Record<string, unknown>): Promise<void> {
	const gate = resolveApproval(tool, args, "yolo", userConfig);
	if (gate.policy === "deny") throw new Error(`blocked by user policy (tools.approval.eval)`);
	await tool.execute("call-1", args as never);
}

describe("tools.approval.eval denies before the eval backend runs", () => {
	beforeAll(async () => {
		await Settings.init({ inMemory: true });
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("never reaches execute when the policy denies", async () => {
		const tool = new EvalTool(createTestToolSession());
		const execute = vi.spyOn(tool, "execute");

		await expect(dispatch(tool, { code: "1" }, { eval: "deny" })).rejects.toThrow(/tools\.approval\.eval/);
		expect(execute).not.toHaveBeenCalled();
	});

	it("CONTROL: the same call DOES reach execute once the deny is removed", async () => {
		const tool = new EvalTool(createTestToolSession());
		const execute = vi.spyOn(tool, "execute");

		// The call may still fail — this session is a stub with no eval backend. What is being
		// asserted is that the gate handed the call to `execute` at all, which is what makes the
		// zero in the case above mean "the refusal arrived first" rather than "nothing ever runs".
		await dispatch(tool, { code: "1" }, {}).catch(() => undefined);

		expect(execute).toHaveBeenCalledTimes(1);
	});

	it("the deny is attributed to the user policy, not to yolo", async () => {
		// Otherwise the user cannot tell which knob to turn, and the refusal reads as a bug.
		const tool = new EvalTool(createTestToolSession());
		const denied = resolveApproval(tool, { code: "1" }, "yolo", { eval: "deny" });
		const allowed = resolveApproval(tool, { code: "1" }, "yolo", {});

		expect(denied.policy).toBe("deny");
		expect(denied.source).toBe("user");
		// The yolo side of the same gate: exec tier alone must not produce a deny, or the
		// control case above would pass for the wrong reason.
		expect(allowed.policy).toBe("allow");
		expect(allowed.source).toBe("mode");
	});
});
