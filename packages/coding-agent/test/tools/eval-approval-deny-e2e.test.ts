/**
 * What the MODEL sees when `tools.approval.eval` denies its call under `yolo`.
 *
 * `approval-eval-policy.test.ts` proves `resolveApproval` returns the right policy. That
 * is the decision; this is the consequence a user reads in their transcript. The refusal
 * has to name the setting that caused it, or the model retries the same call forever and
 * the user has nothing to act on.
 *
 * Scope, stated honestly: this exercises the approval gate, not a spawned eval backend.
 * An earlier version of this file declared a `spawn` mock and asserted it was never
 * called — but nothing was ever wired to call it, so the zero was true by construction
 * and proved nothing. Asserting on a mock you did not connect is the same failure as
 * `expect(true).toBe(true)`, wearing a disguise.
 */
import { describe, expect, it } from "bun:test";
import { requiresApproval } from "@oh-my-pi/pi-coding-agent/tools/approval";

/** The real `EvalTool` identity as declared at `tools/eval.ts`: name `eval`, tier `exec`. */
const EVAL_TOOL = { name: "eval", approval: "exec" } as const;

describe("what the model sees when a yolo install denies eval", () => {
	it("is a refusal naming tools.approval.eval, not a generic failure", () => {
		let refusal: Error | undefined;
		try {
			requiresApproval(EVAL_TOOL, { code: "1" }, "yolo", { eval: "deny" });
		} catch (err) {
			refusal = err as Error;
		}

		expect(refusal).toBeDefined();
		// All three, or the model cannot tell a policy denial from a broken install and
		// will retry — and the user cannot tell which knob to turn.
		expect(refusal!.message).toContain("eval");
		expect(refusal!.message).toContain("blocked by user policy");
		expect(refusal!.message).toContain("tools.approval.eval");
	});

	it("leaves the same call untouched when no eval policy is configured", () => {
		// The zero above is only meaningful if the gate has a non-deny side. Without this
		// row, "it always throws" would satisfy the test above while telling the user
		// nothing about their own configuration.
		const check = requiresApproval(EVAL_TOOL, { code: "1" }, "yolo", {});

		expect(check.required).toBe(false);
	});
});
