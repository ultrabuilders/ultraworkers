/**
 * Path rules: the paths a project has declared off-limits.
 *
 * ## What this is, and what it is not
 *
 * This is the **policy** layer, not containment. A rule here decides whether a
 * path may be touched; it does not stop a process that has already been
 * approved, and it is not a sandbox. `docs/approval-mode.md` already draws that
 * line for approval — "it is not process or filesystem containment. An approved
 * command retains the shell's ambient filesystem, network, and subprocess
 * access" — and the same sentence is true here. A denied path is refused by the
 * tools that consult these rules; a command that reaches the same file by
 * another route is not stopped by them.
 *
 * Stating that matters more here than for approval, because the failure is
 * asymmetric: a user who believes `pathRules.deny` is containment will not
 * think to check the other route, and the belief is invisible from the config.
 *
 * ## Why the keys live here and not beside the matcher
 *
 * `utils/glob.ts` is a pure string helper. Registering settings from it would
 * make every import of a glob function mutate the global settings registry, so
 * a module that only needs to match a pattern would silently declare
 * configuration as a side effect. The keys are therefore declared here, in the
 * shape `mcp/settings.ts` uses, so they reach the user through the same
 * settings panel, the same layering, and the same `config migrate` as every
 * other key.
 *
 * ## Deny wins
 *
 * `deny` is checked first and an `allow` cannot rescue a path it matches. See
 * `evaluatePath` for why the expressive-looking alternative is the wrong
 * default.
 */
import { register } from "./registry";
import { compilePathRules, evaluatePath, type PathRuleSet, type PathRuleVerdict } from "../utils/glob";

/** Globs for paths this project may not touch. */
export const cfgPathRulesDeny = register({
	id: "pathRules.deny",
	type: "array",
	default: [] as readonly string[],
	ui: {
		tab: "tools",
		group: "Trust",
		label: "Path Rules — Deny",
		description: "Globs for paths this project may not touch. Deny wins over allow",
	},
});

/** Globs for paths permitted even where a deny rule would otherwise apply — none, effectively. */
export const cfgPathRulesAllow = register({
	id: "pathRules.allow",
	type: "array",
	default: [] as readonly string[],
	ui: {
		tab: "tools",
		group: "Trust",
		label: "Path Rules — Allow",
		description: "Globs permitted when no deny rule matches them",
	},
});

/** What the configured rules say about `path`, compiled once per call by the caller. */
export function evaluateConfiguredPath(
	path: string,
	deny: readonly string[],
	allow: readonly string[],
): PathRuleVerdict {
	return evaluatePath(path, compilePathRules(deny, allow));
}

export type { PathRuleSet, PathRuleVerdict };
