import { escapeXmlText, prompt } from "@oh-my-pi/pi-utils";
import goalAuditorTemplate from "../../prompts/goals/goal-auditor.md" with { type: "text" };

/**
 * epic-exmk — P1 auditor prompt.
 *
 * Ported from `pi-goal-x` v0.32.3, `extensions/goal-auditor.ts:167-227`
 * (MIT © 2026 Lucas). Three declared deviations, each forced by a difference
 * between the reference and this codebase:
 *
 * 1. **The checklist lives in a `.md` file.** The reference builds it as an
 *    array literal in TS (`:178-184`), which AGENTS.md forbids. Handlebars
 *    carries the two payload slots instead.
 * 2. **`renderAuditorTaskTree` and `taskSummaryBlock` are cut** — there is no
 *    task tree here to render.
 * 3. **No `<verification_contract>` field.** The reference reads a flat
 *    `goal.verificationContract`. Here the guided interview already wrote the
 *    contract into the objective as `## Verification` (alongside
 *    `## Success criteria`, `## Boundaries`, `## Stop conditions`), so the
 *    whole objective is passed through and checklist item 3 reads that section.
 *    That section heading IS the natural contract between interview and audit.
 */

/** What the auditor is shown. Everything here is untrusted input. */
export interface GoalAuditorPromptArgs {
	/** The goal objective, already carrying the interview's section headings. */
	objective: string;
	/** The executor's self-report. A claim, never evidence. */
	completionSummary?: string | null;
}

/**
 * Build the auditor's prompt. Pure: no I/O, no session, no model.
 *
 * Both payloads pass through `escapeXmlText`, so a payload containing
 * `</objective>` or `</executor_claim>` cannot close its own block early and
 * forge the surrounding structure. That is the whole job of the escaper here —
 * do not add a second one.
 */
export function buildGoalAuditorPrompt(args: GoalAuditorPromptArgs): string {
	return prompt.render(goalAuditorTemplate, {
		objective: escapeXmlText(args.objective),
		executorClaim: escapeXmlText(args.completionSummary?.trim() || "(no claim provided)"),
	});
}