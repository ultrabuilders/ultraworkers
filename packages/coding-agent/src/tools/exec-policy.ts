/**
 * A registrable exec-policy rule provider.
 *
 * The rule engine this feeds is real and predates this file: `bash.patterns`
 * (`exec/settings.ts:120`) is parsed by `getBashApprovalPatternRules`
 * (`tools/bash.ts:265`), matched per shell segment by `bashApprovalRuleMatches`
 * (`tools/bash.ts:309`), and decided in `BashTool.approval` (`tools/bash.ts:509`).
 * What was missing was the other half — the whole engine was module-private, so
 * an extension could configure policy in its own settings but could not
 * contribute a rule to it.
 *
 * **A contributed rule is exactly as strong as one the user writes.** Both are
 * `allow` / `deny` / `prompt` over the same glob, evaluated by the same matcher,
 * with the same deny-beats-prompt ordering. This is deliberately not a DSL and
 * not a second policy language: a provider that could invent its own rule shape
 * would be a second engine with its own bugs, and the reference repo rates the
 * Starlark idea as a separate, larger build.
 *
 * **User policy still wins.** Contributed rules are appended after the ones read
 * from settings, and the matcher keeps its ordered first-match semantics, so a
 * user's own `allow` is reached before anything an extension contributed. An
 * extension can therefore never pre-empt a decision the user made.
 *
 * **Two guarantees, and they are not the same one.** Ordering (above) is about
 * *policy*: the user's rules are consulted first. The floor is about *effects*:
 * `resolveEffectFloor` runs at `tools/approval.ts:262`, ahead of both the `yolo`
 * branch (`:274`) and the `decision.override` branch (`:306`), and `bash`
 * declares the `subprocess` effect (`tools/effects.ts:46`). So a contributed
 * `allow` cannot escape a user who wrote `effects: { subprocess: "deny" }` — the
 * floor is non-empty for bash and sits under every path that could otherwise
 * wave the call through. Ordering alone would not give this: a rule that is
 * merely *first* still decides what "allow" means.
 *
 * **The asymmetry, stated rather than left to be discovered.** The safety floor
 * is closed to plugins and the `allow` direction is open to them. If a user has
 * no rule for `npm *` and an extension contributes one, that command runs
 * without asking. That is the point of the seam — the alternative is the user
 * hand-writing a glob for every tool they trust — but it is a real opening, and
 * it is the deliberate counterpart to leaving `CRITICAL_BASH_PATTERNS` shut.
 *
 * **What this does not open:** `CRITICAL_BASH_PATTERNS` (`tools/bash.ts:193`)
 * stays core-owned and unregistered. Those patterns force the `exec` tier, so a
 * contributed one could only ever raise scrutiny and never lower it — but the
 * safety floor is exactly where a plugin-authored rule is hardest to reason
 * about after the fact, so widening it is the owner's call, not this bead's.
 */

import { logger } from "@oh-my-pi/pi-utils";

/** The three verdicts a rule may carry. Mirrors the `bash.patterns` shape. */
export type ExecPolicyApproval = "allow" | "deny" | "prompt";

const EXEC_POLICY_APPROVALS: ReadonlySet<string> = new Set<ExecPolicyApproval>(["allow", "deny", "prompt"]);

/** One contributed rule, before it is merged with the user's own. */
export interface ExecPolicyRuleInput {
	/**
	 * Glob over a command or one segment of it, `*` the only wildcard — the same
	 * language `bash.patterns` uses, so matching semantics cannot diverge.
	 */
	readonly match: string;
	readonly approval: ExecPolicyApproval;
}

/** A contributor. `id` names the extension so a decision can be attributed. */
export interface ExecPolicyProvider {
	readonly id: string;
	rules(): readonly ExecPolicyRuleInput[];
}

/** A contributed rule with its provenance attached. */
export interface ExecPolicyRule extends ExecPolicyRuleInput {
	readonly source: string;
}

const providers = new Map<string, ExecPolicyProvider>();

/**
 * Register an exec-policy provider. Returns the function that unregisters it.
 *
 * Refuses a registration it cannot honour, naming the reason. Silently dropping
 * one would leave an extension believing it gates commands while the matcher
 * never sees its rules — the failure only shows up as a command that ran.
 */
export function registerExecPolicyProvider(provider: ExecPolicyProvider): () => void {
	if (provider === null || typeof provider !== "object") {
		throw new Error(
			`Exec-policy provider must be an object with id and rules(), received ${provider === null ? "null" : typeof provider}`,
		);
	}
	const id = typeof provider.id === "string" ? provider.id.trim() : "";
	if (id.length === 0) {
		throw new Error("Exec-policy provider needs a non-empty id so its rules can be attributed to a source");
	}
	if (typeof provider.rules !== "function") {
		throw new Error(`Exec-policy provider "${id}" is missing a rules() function`);
	}
	if (providers.has(id)) {
		throw new Error(`Exec-policy provider "${id}" is already registered; unregister it before registering again`);
	}
	// Validated eagerly so a malformed rule is a loud registration failure rather
	// than a rule that silently never matches. `rules()` is called once here and
	// once per decision; a provider returning something different each time is
	// allowed, but it was still checked at least once before it could take effect.
	assertProviderRules(id, provider.rules());
	providers.set(id, provider);
	logger.debug("Registered exec-policy provider", { provider: id });
	return () => {
		providers.delete(id);
	};
}

function assertProviderRules(id: string, rules: readonly ExecPolicyRuleInput[]): void {
	if (!Array.isArray(rules)) {
		throw new Error(`Exec-policy provider "${id}" returned a non-array from rules()`);
	}
	for (const [index, rule] of rules.entries()) {
		if (!rule || typeof rule !== "object") {
			throw new Error(`Exec-policy provider "${id}" returned a non-object rule at index ${index}`);
		}
		if (typeof rule.match !== "string" || rule.match.trim().length === 0) {
			throw new Error(`Exec-policy provider "${id}" returned a rule at index ${index} with no match pattern`);
		}
		if (!EXEC_POLICY_APPROVALS.has(rule.approval)) {
			throw new Error(
				`Exec-policy provider "${id}" returned a rule at index ${index} with approval "${String(rule.approval)}"; expected one of ${[...EXEC_POLICY_APPROVALS].join(", ")}`,
			);
		}
	}
}

/** Whether anything is registered. The seam's absence has to be observable. */
export function hasExecPolicyProviders(): boolean {
	return providers.size > 0;
}

/**
 * Every contributed rule, in registration order, stamped with its provider id.
 *
 * Evaluated per decision rather than cached, because a provider is free to read
 * live state — a skill directory, a project rule file — and a cached snapshot
 * would go stale exactly when the user changed what they meant to gate.
 *
 * **More than once per decision, so `rules()` must be cheap and idempotent.**
 * Measured: an extension tool's `execute` resolves approval twice — once against
 * the original arguments to short-circuit a deny before the runner is touched,
 * and again against the arguments a handler may have revised, closing the
 * "approve one thing, run another" gap (`extensions/wrapper.ts:247` and `:320`) —
 * so `rules()` is called twice for one tool call there, and once on the direct
 * path. A provider that counts calls, memoizes, or has a side effect observes that
 * side effect once per resolution rather than once per user decision.
 */
export function contributedExecPolicyRules(): ExecPolicyRule[] {
	const out: ExecPolicyRule[] = [];
	for (const provider of providers.values()) {
		for (const rule of provider.rules()) {
			out.push({ match: rule.match, approval: rule.approval, source: provider.id });
		}
	}
	return out;
}
