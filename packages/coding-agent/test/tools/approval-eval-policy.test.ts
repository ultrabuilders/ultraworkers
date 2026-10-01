/**
 * `tools.approval` must be honoured for the `eval` tool under `yolo`.
 *
 * `docs/settings.md:183` promises the user that a per-tool `deny` works in every mode, and
 * `docs/approval-mode.md:28` says `tools.approval` "is honored in every mode". Nothing
 * asserted either promise. The `eval` tool declares the `exec` tier and can reach a shell,
 * so a `yolo` install with no config at all resolves its calls to `allow` — the promise is
 * the only thing standing between a user who wrote `tools.approval.eval: "deny"` and a
 * model-written shell call.
 *
 * What a regression here looks like: someone narrows the `userConfig` lookup into a name
 * allowlist, or keys off `policyKey` where the setting is filed under the tool name. Both
 * keep running without error and silently reopen the path. A "does not throw" test sees
 * none of it; only the resolved policy does.
 */
import { describe, expect, it } from "bun:test";
import type { ApprovalSubject } from "@oh-my-pi/pi-coding-agent/tools/approval";
import { resolveApproval } from "@oh-my-pi/pi-coding-agent/tools/approval";

/**
 * The real `EvalTool` identity, as declared at `tools/eval.ts:346-347`: name `eval`, tier
 * `exec`. Only those two fields drive `resolveApproval`, so a structural stand-in keeps the
 * assertion on the resolution contract rather than on the tool's implementation.
 */
const EVAL_TOOL: ApprovalSubject = { name: "eval", approval: "exec" } as ApprovalSubject;

describe("tools.approval is honoured for eval under yolo", () => {
	it("a user `deny` for eval resolves to deny, attributed to the user", () => {
		const resolved = resolveApproval(EVAL_TOOL, {}, "yolo", { eval: "deny" });

		// Both halves matter. `policy` alone would pass for a build that hardcodes eval to
		// deny; `source` alone would pass for one that denies everything under yolo. The
		// pair is what says "this denial came from the user's own setting".
		expect(resolved.policy).toBe("deny");
		expect(resolved.source).toBe("user");
		expect(resolved.policyKey).toBe("eval");
	});

	it("an empty config leaves eval alone under yolo, attributed to the mode", () => {
		// The negative boundary. Without it, T1 could be green because something always
		// denies eval — which would be a different, much larger claim, and a wrong one.
		const resolved = resolveApproval(EVAL_TOOL, {}, "yolo", {});

		expect(resolved.policy).not.toBe("deny");
		expect(resolved.policy).toBe("allow");
		expect(resolved.source).toBe("mode");
	});

	it("a user `prompt` for eval survives yolo rather than being overridden", () => {
		// `yolo` overrides override-based prompts, but `tools.approval` is user policy and
		// stays authoritative. This is the branch most easily broken by someone editing the
		// `mode === "yolo"` early-return, and it is a different branch from the deny case.
		const resolved = resolveApproval(EVAL_TOOL, {}, "yolo", { eval: "prompt" });

		expect(resolved.policy).toBe("prompt");
		expect(resolved.source).toBe("user");
	});

	it("a bash.patterns deny does not reach eval — the two policies stay separate", () => {
		// Deliberate, not an oversight: `bash.patterns` is a shell-command matching language,
		// and what a "command" means inside model-written JS has no agreed definition. The
		// documented way to restrict eval is `tools.approval.eval`. This test exists so a
		// future attempt to bridge the two fails loudly and gets argued about, rather than
		// happening quietly.
		const resolved = resolveApproval(EVAL_TOOL, { command: "rm -rf /" }, "yolo", {});

		expect(resolved.policy).toBe("allow");
		expect(resolved.source).toBe("mode");
	});

	it("another tool's deny does not leak onto eval", () => {
		// Scope check. A policy filed under a different key must not deny a tool the user
		// never named — otherwise adding one `deny` silently disables unrelated tools.
		const resolved = resolveApproval(EVAL_TOOL, {}, "yolo", { bash: "deny" });

		expect(resolved.policy).toBe("allow");
		expect(resolved.source).toBe("mode");
	});

	it("eval's own exec tier is what yolo resolves by default, so the deny is the only thing standing there", () => {
		// Names the premise the rest of the file rests on: with no user policy, eval's
		// `exec` tier resolves to `allow` under yolo. If a future default tightened this,
		// T2 would change and the deny contract would no longer be load-bearing.
		expect(EVAL_TOOL.approval).toBe("exec");
		expect(resolveApproval(EVAL_TOOL, {}, "yolo", {}).policy).toBe("allow");
	});
});
