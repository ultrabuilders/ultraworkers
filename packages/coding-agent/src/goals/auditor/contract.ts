/**
 * epic-exmk — P1 auditor contract: the verdict marker and the rule that reads it.
 *
 * Ported from `pi-goal-x` v0.32.3, `extensions/goal-auditor.ts:62-70`
 * (MIT © 2026 Lucas). The reference returns `{ approved, disapproved }`; this
 * returns the three-value `AuditorVerdict` the bead specifies. The parse rule
 * below is the reference's, unchanged — including its docblock, because the
 * docblock states why the rule is last-line-only, and that reason *is* the
 * contract.
 */

/**
 * Every verdict an audit can reach.
 *
 * `"error"` is deliberately unreachable from {@link parseAuditorDecision}: a
 * parse is total, so a missing or unrecognised marker is a disapproval, not an
 * absence of one. `"error"` belongs to the caller — a session or transport that
 * never produced an output at all has no decision to parse, and must not be
 * reported as a disapproval the auditor actually reached.
 */
export type AuditorVerdict = "approved" | "disapproved" | "error";

/** The only output that closes a goal as verified. Must be the final line. */
export const APPROVED_MARKER = "<approved/>";

/** The only output that leaves a goal open. Must be the final line. */
export const DISAPPROVED_MARKER = "<disapproved/>";

/**
 * Read the auditor's verdict out of its report.
 *
 * The prompt contract: the verdict marker must be the FINAL line of the
 * report. Matching anywhere lets a prose mention of the marker (e.g. "I
 * would only emit `<approved/>` if ...") be misread as the verdict.
 *
 * Returns `"disapproved"` for every non-approval, including empty output and a
 * marker that is absent, misspelled, or not last. Approval has to be earned by
 * an exact final line; nothing else opens the door.
 */
export function parseAuditorDecision(output: string): AuditorVerdict {
	const lines = output.split("\n").map((l) => l.trim()).filter(Boolean);
	const marker = lines[lines.length - 1];
	switch (marker) {
		case APPROVED_MARKER:
			return "approved";
		case DISAPPROVED_MARKER:
		default:
			return "disapproved";
	}
}