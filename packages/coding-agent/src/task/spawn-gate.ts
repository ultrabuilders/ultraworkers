/**
 * Structured receipt required before a large fan-out.
 *
 * Below the threshold nothing changes: the gate returns no receipt and the caller
 * behaves exactly as it did. That is the whole reason a threshold exists rather
 * than always demanding a receipt — a requirement applied to every small spawn
 * would tax the common case to protect the rare one.
 *
 * Pure on purpose: no I/O, no state, no clock. A gate that decides whether to
 * launch N subagents must be answerable from its inputs alone, or a test cannot
 * present the failure it exists to catch.
 *
 * Why it is NOT disableable: an unplanned fan-out fails unattributably — N
 * subagents die, and the batch reads as N unrelated problems rather than one
 * missing plan. That is a failure the user cannot diagnose from the transcript,
 * which is a different thing from a safety rail (it is closer to a useful
 * default). The escape hatch is stated in the rejection itself: split the work
 * into batches under the threshold. Turning the gate off is only ever the right
 * answer when the work genuinely cannot be split, which has no demonstrated case.
 */

/**
 * Fan-out size above which a receipt is required.
 *
 * A judgement of magnitude, not a measured limit. Below this, writing a receipt
 * costs more than it can catch, because a small fan-out's failures are already
 * individually visible in the transcript. The number wants measuring on a tree
 * that actually runs large fan-outs; the machine this was written on runs four.
 */
export const DEFAULT_SPAWN_THRESHOLD = 8;

/**
 * The fields a receipt must carry, in the order they should be reported.
 *
 * One list, matching the schema's own `spawnPlanSchema`, so the error the user
 * reads cannot drift from the fields the model is allowed to send.
 */
export const REQUIRED_PLAN_FIELDS = ["goal", "steps", "verification"] as const;

export interface PlanReceipt {
	readonly goal?: unknown;
	readonly steps?: unknown;
	readonly verification?: unknown;
}

export interface SpawnPlanReceipt {
	/** True when no receipt was required, or a complete one was supplied. */
	readonly ok: boolean;
	/**
	 * Names of the missing fields, NOT a boolean. The message is the entire value
	 * of this gate: a rejection that says "incomplete plan" rather than "you are
	 * missing `goal`" costs a round trip per omission instead of one.
	 */
	readonly missing: readonly string[];
	/** Threshold the decision was made against. */
	readonly threshold: number;
}

/**
 * Names of the required fields the plan did not supply.
 *
 * A blank string counts as absent: a field present but empty is the same failure
 * as a missing one, and treating them differently would let a model satisfy the
 * gate with whitespace.
 */
export function findMissingPlanFields(plan: PlanReceipt | undefined): readonly string[] {
	if (!plan) return REQUIRED_PLAN_FIELDS;
	return REQUIRED_PLAN_FIELDS.filter(field => {
		const value = plan[field];
		return value === undefined || value === null || String(value).trim() === "";
	});
}

/** Decide whether a fan-out of `spawnCount` may proceed. */
export function evaluateSpawnGate(
	spawnCount: number,
	plan?: PlanReceipt,
	threshold: number = DEFAULT_SPAWN_THRESHOLD,
): SpawnPlanReceipt {
	if (spawnCount <= threshold) {
		return { ok: true, missing: [], threshold };
	}
	const missing = findMissingPlanFields(plan);
	return { ok: missing.length === 0, missing, threshold };
}
