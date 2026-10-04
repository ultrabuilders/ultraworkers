import { describe, expect, it } from "bun:test";
import type { DisabledReason, Extension, ExtensionState } from "@oh-my-pi/pi-tui/overlays/extensions/types";
import { toTriageRow } from "@oh-my-pi/pi-coding-agent/cli/extensions-triage-cli";

/**
 * `toTriageRow` is the whole contract of `ultraworkers extensions-triage`: it answers
 * "is my thing loaded, and if not, what stopped it" from a discovered
 * `Extension`. The tests below assert the triage questions rather than field
 * names, because a field rename that keeps the answers intact is not a
 * regression.
 */
function extension(overrides: Partial<Extension> & { id: string }): Extension {
	return {
		kind: "skill",
		name: "demo",
		displayName: "Demo",
		path: "/tmp/demo/SKILL.md",
		source: { provider: "local", providerName: "Local", level: "project" },
		state: "active",
		raw: {},
		...overrides,
	} as Extension;
}

describe("extensions triage projection", () => {
	it("names the id, state, provider and level a triage question needs", () => {
		const row = toTriageRow(extension({ id: "skill:demo" }));

		expect(row.id).toBe("skill:demo");
		expect(row.state).toBe("active");
		expect(row.provider).toBe("local");
		expect(row.level).toBe("project");
	});

	it("carries the policy reason a blocked extension was blocked for", () => {
		const row = toTriageRow(extension({ id: "skill:optin", state: "disabled", disabledReason: "user-opt-in" }));

		expect(row.state).toBe("disabled");
		expect(row.disabledReason).toBe("user-opt-in");
	});

	it("omits disabledReason entirely when nothing blocked the extension", () => {
		// Not `undefined`-valued but absent: a consumer iterating reasons should
		// not have to distinguish "no reason" from "reason not surfaced".
		const row = toTriageRow(extension({ id: "skill:free" }));

		expect("disabledReason" in row).toBe(false);
	});

	it("marks the losing copy as shadowed and refuses to name the winner", () => {
		// Deliberate, and the reason this is asserted at all: a later refactor
		// that starts populating `shadowedBy` here has started re-deriving
		// shadowing in the CLI, which is the thing this module must not do.
		const row = toTriageRow(extension({ id: "skill:dup", state: "shadowed", disabledReason: "shadowed" }));

		expect(row.shadowed).toBe(true);
		expect("shadowedBy" in row).toBe(false);
	});

	it("treats a row carrying only a shadower id as shadowed, since state may lag", () => {
		const row = toTriageRow(extension({ id: "skill:dup2", state: "active", shadowedBy: "skill:dup" }));

		expect(row.shadowed).toBe(true);
	});

	it("shortens the home directory out of the reported path", () => {
		const home = process.env.HOME;
		if (!home) return;

		const row = toTriageRow(extension({ id: "skill:home", path: `${home}/.omp/skills/demo/SKILL.md` }));

		// A triage listing is read in a terminal; a raw absolute path both
		// overflows the line and leaks the user's name.
		expect(row.path).not.toContain(home);
	});

	it("preserves states and reasons that are real union members, not free strings", () => {
		// The row widens nothing: if the projection invented a state or a reason,
		// a consumer switching on it would silently miss a branch.
		const states = ["active", "disabled", "shadowed", "modified"] as const;
		const reasons = [
			"provider-disabled",
			"user-opt-in",
			"item-disabled",
			"shadowed",
			"hook-modified",
		] as const satisfies readonly DisabledReason[];

		// Exhaustive by construction. A plain `ExtensionState[]` annotation would
		// not catch a missing member — a short array assigned to a union
		// typechecks fine — which is how this list came to be missing `modified`
		// while still passing, and stopped checking the union it names. These two
		// objects are a compile error the moment a member is added to either
		// union without being added here.
		const _statesExhaustive: Record<ExtensionState, true> = {
			active: true,
			disabled: true,
			shadowed: true,
			modified: true,
		};
		const _reasonsExhaustive: Record<DisabledReason, true> = {
			"provider-disabled": true,
			"user-opt-in": true,
			"item-disabled": true,
			shadowed: true,
			"hook-modified": true,
		};

		for (const state of states) {
			expect(toTriageRow(extension({ id: `skill:s-${state}`, state })).state).toBe(state);
		}
		for (const reason of reasons) {
			const row = toTriageRow(extension({ id: `skill:r-${reason}`, state: "disabled", disabledReason: reason }));
			expect(row.disabledReason).toBe(reason);
		}
	});
});
