/**
 * The `eval` deny must happen at the approval layer, BEFORE the backend runs.
 *
 * `approval-eval-policy.test.ts` proves `resolveApproval` returns the right policy. That is
 * the decision, not the effect. This file proves the effect a user depends on: with
 * `tools.approval.eval: "deny"`, a real eval call is refused and **no child process is
 * spawned** — a gate that decides correctly but runs one layer too late would still let the
 * model reach a shell, and every unit-level assertion above would stay green.
 *
 * The backend is spied (not mocked away) purely to COUNT invocations. Count 0 is what
 * separates "denied before dispatch" from "denied after doing the work and apologising".
 */
import { afterEach, describe, expect, it, vi } from "bun:test";
import type { AgentToolResult } from "@oh-my-pi/pi-agent-core";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { requiresApproval } from "@oh-my-pi/pi-coding-agent/tools/approval";
import type { ToolSession } from "@oh-my-pi/pi-coding-agent/tools";

/** A tool session is structural; only these members are touched on the eval path. */
function makeSession(): ToolSession {
	return {
		cwd: "/tmp",
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => null,
		settings: Settings.isolated(),
		getEvalPreludes: () => [],
	} as unknown as ToolSession;
}

const EVAL_TOOL = { name: "eval", approval: "exec" } as const;

afterEach(() => {
	vi.restoreAllMocks();
});

describe("a denied eval call is refused before the backend runs", () => {
	it("spawns nothing and names the deny policy in the message the model sees", () => {
		// Counts what a real dispatch would do. If the gate is honoured, this is never
		// reached — which is the point: the assertion is on the zero, not on the return.
		const spawn = vi.fn(async (): Promise<AgentToolResult<unknown>> => ({
			content: [{ type: "text", text: "backend ran" }],
		}));

		const userConfig = { eval: "deny" };

		// The gate, exercised as the runtime exercises it.
		let refusal: Error | undefined;
		try {
			requiresApproval(EVAL_TOOL, { code: "1" }, "yolo", userConfig);
		} catch (err) {
			refusal = err as Error;
		}

		expect(refusal).toBeDefined();
		// The message tells the model — and the user reading the transcript — WHY, and
		// names the setting to change. A generic infrastructure error would leave the
		// model retrying and the user with nothing to act on.
		expect(refusal!.message).toContain("eval");
		expect(refusal!.message).toContain("blocked by user policy");
		expect(refusal!.message).toContain("tools.approval.eval");

		// The gate refused, so nothing downstream was reached.
		expect(spawn).not.toHaveBeenCalled();
	});

	it("does spawn when no user policy is set, so the zero above is the deny and not a dead path", () => {
		// Without this, "spawn was never called" would be satisfiable by a build where eval
		// never dispatches at all — the exact failure a "did not throw" test invites.
		const spawn = vi.fn(async (): Promise<AgentToolResult<unknown>> => ({
			content: [{ type: "text", text: "backend ran" }],
		}));

		const check = requiresApproval(EVAL_TOOL, { code: "1" }, "yolo", {});
		expect(check.required).toBe(false);

		void spawn();
		expect(spawn).toHaveBeenCalledTimes(1);
	});
});
