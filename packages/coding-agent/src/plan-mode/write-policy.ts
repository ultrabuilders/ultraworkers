/**
 * Write policy, as data.
 *
 * A mode that makes part of the filesystem read-only needs to *say so*, and
 * saying it means branching on every write path in the agent. This module is the
 * branch, separated from the mode: a policy is a small record of what a mode
 * refuses, and {@link checkWritePolicy} turns that record into one of three
 * verdicts. Which mode is active is somebody else's question — the registry
 * answers it and hands the policy here.
 *
 * ## Why the messages live in core
 *
 * The three refusal strings are core text, and they stay here rather than
 * travelling in the policy. A `WritePolicy` is flags, not prose: an extension
 * that could inject its own message would be writing text into a `ToolError` the
 * user reads as the tool's own refusal, which is the wrong provenance for it.
 * A mode that wants different wording gets it from its own tool layer, not by
 * rewriting this one.
 *
 * ## Why the order is what it is
 *
 * Rename, then delete, then location. Rename and delete are refused for
 * *any* target, including the sandbox — they are not writes to the working tree,
 * they are operations this mode does not perform at all. Location is the only
 * question that needs the filesystem, so it is the only one that can be async,
 * and it is asked last so the cheap answers never pay for a path resolution.
 */

/** What a mode permits. Every field is a refusal; absence is permission. */
export type WritePolicy = Readonly<{
	/** Refuse renames, whatever the target. */
	readonly denyRename?: boolean;
	/** Refuse deletes, whatever the target. */
	readonly denyDelete?: boolean;
	/** Refuse writes that land outside the session's `local://` sandbox. */
	readonly denyWorkingTree?: boolean;
}>;

/**
 * Plan mode's policy, declared once.
 *
 * Lives here rather than in the tool guard because it has two readers: the guard
 * that enforces it, and the mode registration that advertises it. A second copy
 * of these three flags is a policy that can drift from the one being enforced —
 * and the drift is invisible until a mode claims to refuse a write it allows.
 */
export const PLAN_MODE_WRITE_POLICY: WritePolicy = {
	denyRename: true,
	denyDelete: true,
	denyWorkingTree: true,
};

/**
 * What a write is, from the caller's point of view. `sandbox` is resolved by the
 * caller rather than computed here, because locating a path needs the session's
 * internal-URL mapping — a filesystem concern, not a policy one.
 */
export interface WritePolicyContext {
	readonly move?: string;
	readonly op?: "create" | "update" | "delete";
	/** Whether the resolved target lands in the session-local sandbox. */
	readonly sandbox: boolean;
}

/**
 * The refusal a policy returns, or `null` when the write is permitted.
 *
 * A discriminated string rather than a `ToolError` so this module stays free of
 * the tool layer: it says *what* is refused, and the guard decides how to
 * surface it. `sandbox` is the sandbox case of a working-tree refusal — the
 * message names the escape hatch, so it is not interchangeable with a plain
 * denial.
 */
export type WritePolicyDenial = "rename" | "delete" | "workingTree";

/**
 * Core refusal text, keyed by denial. Extensions cannot contribute here — see
 * the module docblock.
 */
export const WRITE_POLICY_DENIAL_MESSAGES: Readonly<Record<WritePolicyDenial, string>> = {
	rename: "Plan mode: renaming files is not allowed.",
	delete: "Plan mode: deleting files is not allowed.",
	workingTree: "Plan mode: the working tree is read-only. Write your plan to a local://<slug>-plan.md file instead.",
};

/**
 * Evaluate a policy against one write.
 *
 * Rename and delete are checked before location and are answered without
 * touching the filesystem, matching the order the built-in plan guard used when
 * this logic lived inline in `enforcePlanModeWrite`.
 */
export function checkWritePolicy(policy: WritePolicy | undefined, ctx: WritePolicyContext): WritePolicyDenial | null {
	if (!policy) return null;
	if (policy.denyRename && ctx.move) return "rename";
	if (policy.denyDelete && ctx.op === "delete") return "delete";
	if (policy.denyWorkingTree && !ctx.sandbox) return "workingTree";
	return null;
}
