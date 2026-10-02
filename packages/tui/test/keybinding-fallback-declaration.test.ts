/**
 * A default key that the user has claimed elsewhere yields — and *how an action
 * says so* is a declaration, not an entry in a table.
 *
 * ## What this defends
 *
 * The yield rule used to be a two-entry table in `app-keybindings.ts`: a function
 * comparing the requested action against two hardcoded string constants and
 * returning a fallback for exactly those, `undefined` for all ~70 others. That is
 * the shape AGENTS.md calls out — "a declaration on the definition" was missing, so
 * the fact that an action yields lived in one file and the action itself in
 * another. A third action could not yield without someone remembering to edit that
 * function, and nothing failed when they forgot: it just quietly shadowed the user.
 *
 * So the contract here is not "follow-up yields ctrl+q". It is that the two sets
 * agree — every action whose definition carries `fallbackKey` yields that key, and
 * no other action does. That reading goes red if the lookup is re-hardcoded and
 * drifts away from the declarations, which is exactly the regression.
 *
 * ## Why rows are built rather than hand-listed
 *
 * The declaring entries are read out of `KEYBINDINGS` instead of being written
 * down here. Naming them in the test would make it a second copy of the same table
 * — it would keep passing while the real one regressed, which is the mirror image
 * of the bug. Reading them means adding a `fallbackKey` to a new action extends
 * coverage here automatically, and a mismatch fails loudly.
 */
import { describe, expect, it } from "bun:test";
import { KEYBINDING_DEFINITIONS, KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import type { Keybinding, KeyId, KeybindingDefinition } from "@oh-my-pi/pi-tui/keybindings";

/** An action that exists and has no `fallbackKey`, used as the thing the user binds to. */
const CLAIMANT: Keybinding = "app.session.new";

// Read through the same widening production uses. `KEYBINDINGS` is `as const`, so
// reading it directly here would type each entry as its own literal shape and this
// file would need a second copy of that widening — a third place to disagree.
const declaringEntries = Object.entries(KEYBINDING_DEFINITIONS).filter(
	(entry): entry is [string, KeybindingDefinition] => entry[1].fallbackKey !== undefined,
);

/** A manager where the user has bound `key` to some other action. */
function userClaims(userKey: Keybinding, key: KeyId): KeybindingsManager {
	return new KeybindingsManager({ [userKey]: key });
}

describe("a declared fallback key yields to the user", () => {
	it("has at least one declaring action, or these rows assert nothing", () => {
		// Without this, deleting `fallbackKey` from every definition leaves the rows
		// below iterating an empty list and passing — a green gate over zero cases.
		expect(declaringEntries.length).toBeGreaterThan(0);
	});

	it("drops the declared key from an action whose default still lists it", () => {
		for (const [action, definition] of declaringEntries) {
			const fallback = definition.fallbackKey as KeyId;
			const before = new KeybindingsManager().getKeys(action as Keybinding);
			// The declaration is only meaningful if the key is actually a default.
			expect(before).toContain(fallback);

			const after = userClaims(CLAIMANT, fallback).getKeys(action as Keybinding);

			expect(after).not.toContain(fallback);
		}
	});

	it("keeps the action's other default keys, because yielding is not unbinding", () => {
		// The yield removes one key, not the whole binding. If this ever dropped every
		// default, an action that yields would become unreachable for a user who
		// happened to claim its fallback.
		const [, definition] = declaringEntries.find(([, d]) => Array.isArray(d.defaultKeys)) as [
			string,
			KeybindingDefinition,
		];
		const action = declaringEntries.find(([, d]) => Array.isArray(d.defaultKeys))![0] as Keybinding;
		const fallback = definition.fallbackKey as KeyId;
		const remaining = userClaims(CLAIMANT, fallback).getKeys(action);

		expect(remaining.length).toBeGreaterThan(0);
		expect(remaining).not.toContain(fallback);
	});
});

describe("an action that declares nothing does not yield", () => {
	it("keeps its default even when the user claims that exact key elsewhere", () => {
		// The negative contract, and the reason the other rows mean anything. Without
		// it, a manager that dropped *every* claimed key would pass the rows above —
		// the yield must be opt-in per action, not a global "user wins" rule.
		const plain = Object.entries(KEYBINDING_DEFINITIONS).find(
			([, definition]) => definition.fallbackKey === undefined && !Array.isArray(definition.defaultKeys),
		);
		expect(plain).toBeDefined();
		const [action, definition] = plain as [string, KeybindingDefinition];
		const key = definition.defaultKeys as KeyId;

		const after = userClaims(CLAIMANT, key).getKeys(action as Keybinding);

		expect(after).toContain(key);
	});
});
