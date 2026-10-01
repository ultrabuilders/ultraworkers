import { afterEach, describe, expect, it } from "bun:test";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { ToolSession } from "@oh-my-pi/pi-coding-agent/tools";
import { BashTool } from "@oh-my-pi/pi-coding-agent/tools/bash";
import {
	contributedExecPolicyRules,
	hasExecPolicyProviders,
	registerExecPolicyProvider,
	type ExecPolicyApproval,
	type ExecPolicyProvider,
} from "@oh-my-pi/pi-coding-agent/tools/exec-policy";

/**
 * The rule engine these rules feed is the user's own: `bash.patterns` is parsed
 * by `getBashApprovalPatternRules` (`tools/bash.ts:265`), matched per segment by
 * `bashApprovalRuleMatches` (`:309`), and decided in `BashTool.approval`. What
 * was missing was a way in — the engine was module-private, so an extension
 * could set policy in its own settings but could not contribute a rule to it.
 *
 * Every case below drives the real `BashTool.approval` and asserts the verdict
 * it returns. Asserting that a provider's function ran would pass with the rule
 * plumbed nowhere, which is the exact way this seam could ship broken.
 */

const disposers: Array<() => void> = [];

function provide(
	rules: ExecPolicyApproval extends never ? never : readonly { match: string; approval: ExecPolicyApproval }[],
	id = "test-provider",
): () => void {
	const provider: ExecPolicyProvider = { id, rules: () => rules };
	const dispose = registerExecPolicyProvider(provider);
	disposers.push(dispose);
	return dispose;
}

function makeSession(overrides: Record<string, unknown> = {}): ToolSession {
	return {
		cwd: "/tmp",
		hasUI: false,
		skills: [],
		getSessionFile: () => null,
		settings: Settings.isolated({
			"async.enabled": false,
			"bash.allowCompoundCommands": false,
			...overrides,
		}),
		getClientBridge: () => undefined,
	} as unknown as ToolSession;
}

/** The decision bash actually reaches for a command. */
function decide(command: string) {
	return new BashTool(makeSession()).approval({ command });
}

afterEach(() => {
	while (disposers.length > 0) disposers.pop()?.();
});

describe("a contributed exec-policy rule reaches the bash decision", () => {
	it("denies a command the user's own policy would have allowed", () => {
		// The load-bearing case, and the one that proves the rule is plumbed into
		// the real matcher rather than merely stored. Without it this command is
		// unremarkable; with the rule it is refused.
		expect(decide("deployprod --now").policy).not.toBe("deny");

		provide([{ match: "deployprod *", approval: "deny" }]);

		const decision = decide("deployprod --now");
		expect(decision.policy).toBe("deny");
		expect(decision.override).toBe(true);
		// The user is told which rule stopped them, by name — a bare "denied" would
		// send them looking through their own settings for something that is not there.
		expect(decision.reason).toContain("deployprod *");
	});

	it("returns to exactly the pre-seam decision once the provider is unregistered", () => {
		// The red gate. If unregistering left the rule in place the seam would be
		// indistinguishable from a hardcoded one; if it left a residue the user's
		// session would keep refusing commands for a provider that is gone.
		const before = decide("rollbackme --hard");
		const dispose = provide([{ match: "rollbackme *", approval: "deny" }]);
		expect(decide("rollbackme --hard").policy).toBe("deny");

		dispose();

		expect(decide("rollbackme --hard")).toEqual(before);
	});

	it("keeps a user's own allow ahead of a contributed allow for the same command", () => {
		// The precedence contract, and the direction that matters: an extension must
		// never pre-empt a decision the user made. Ordered first-match means the
		// user's rule is reached first, so a contributed `allow` for the same command
		// is simply never consulted.
		const session = makeSession({ "bash.patterns": [{ match: "shipit *", approval: "allow" }] });
		provide([{ match: "shipit *", approval: "deny" }]);

		const decision = new BashTool(session).approval({ command: "shipit --now" });

		expect(decision.policy).toBe("allow");
	});

	it("matches per shell segment, so a contributed rule cannot be smuggled past", () => {
		// Same semantics the user's own rules get: a dangerous command inside a
		// compound line still matches. A contributed rule that only ever looked at
		// the whole string would be a weaker rule wearing the same name.
		provide([{ match: "rm -rf *", approval: "deny" }]);

		expect(decide("cd /tmp && rm -rf /data").policy).toBe("deny");
	});

	it("leaves the registry empty when nothing is registered", () => {
		// The seam's absence has to be observable, not merely quiet.
		expect(hasExecPolicyProviders()).toBe(false);
		expect(contributedExecPolicyRules()).toEqual([]);
	});

	it("stamps every contributed rule with the provider that supplied it", () => {
		// Attribution is what makes a surprising denial actionable. Two extensions
		// contributing the same pattern must be distinguishable after the fact.
		provide([{ match: "one *", approval: "deny" }], "provider-one");
		provide([{ match: "two *", approval: "prompt" }], "provider-two");

		const sources = contributedExecPolicyRules().map(rule => rule.source);

		expect(sources).toEqual(["provider-one", "provider-two"]);
	});
});

describe("a bad registration is refused with a reason", () => {
	// Silently dropping a provider would leave an extension believing it gates
	// commands while the matcher never sees its rules — a failure that only
	// surfaces later as a command that ran.

	it("refuses a provider with no id", () => {
		expect(() => registerExecPolicyProvider({ id: "  ", rules: () => [] })).toThrow(/non-empty id/);
	});

	it("refuses a provider with no rules function", () => {
		expect(() => registerExecPolicyProvider({ id: "no-rules" } as unknown as ExecPolicyProvider)).toThrow(
			/missing a rules\(\) function/,
		);
	});

	it("refuses a rule whose approval is not one of the three verdicts", () => {
		// The dangerous direction: a typo that stored would produce a rule that looks
		// protective and is not.
		expect(() => provide([{ match: "x *", approval: "allowl" as ExecPolicyApproval }])).toThrow(
			/expected one of allow, deny, prompt/,
		);
		expect(hasExecPolicyProviders()).toBe(false);
	});

	it("refuses a rule with no match pattern", () => {
		expect(() => provide([{ match: "   ", approval: "deny" }])).toThrow(/no match pattern/);
		expect(hasExecPolicyProviders()).toBe(false);
	});

	it("refuses a non-array from rules()", () => {
		expect(() =>
			registerExecPolicyProvider({
				id: "not-an-array",
				rules: () => "nope" as unknown as readonly { match: string; approval: ExecPolicyApproval }[],
			}),
		).toThrow(/non-array/);
	});

	it("refuses a second provider with the same id", () => {
		// Replacing silently would make one extension's rules appear to be another's,
		// and the attribution on a denial would name the wrong owner.
		provide([], "duplicate-id");
		expect(() => registerExecPolicyProvider({ id: "duplicate-id", rules: () => [] })).toThrow(/already registered/);
	});
});
