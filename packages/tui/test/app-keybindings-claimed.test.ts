import { describe, expect, it } from "bun:test";
import { KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import type { KeyId } from "@oh-my-pi/pi-tui";

/**
 * `claimedKeyIds()` answers one question — "may an extension own this key?" — and
 * the answer has to come from the bindings themselves rather than a hand-kept list.
 *
 * The failure this defends against is silent and one-sided: a user rebinds a
 * built-in onto a key nobody had reserved, an extension claims that same key, and
 * the user's remap stops working with no error on either side. The unit that
 * notices is the extension loader, and it can only notice if this returns the
 * remapped key — so the assertions below are about what the set *contains* after
 * a remap, not about the defaults alone.
 *
 * `f7`, `f12` and `alt+j` are the free keys here: none is a default binding and
 * none is on the extension loader's reserved list, which is exactly what makes
 * them the ones a remap can be lost to.
 */
describe("claimedKeyIds", () => {
	it("includes a built-in's default key, so the pre-existing reserved behaviour survives", () => {
		// The extension path refused these before this method existed. If a default
		// were missing here, an extension could claim ctrl+c and the loader would
		// let it through.
		const claimed = new KeybindingsManager().claimedKeyIds();

		expect(claimed.has("ctrl+c")).toBe(true);
		expect(claimed.has("ctrl+q")).toBe(true);
		expect(claimed.has("alt+m")).toBe(true);
	});

	it("includes a key the user remapped a built-in onto", () => {
		// The whole point. `f7` is on no reserved list anywhere in the codebase, so
		// before the remap is applied it is claimable — and after, it is not.
		const claimed = new KeybindingsManager({ "app.session.new": "f7" }).claimedKeyIds();

		expect(claimed.has("f7")).toBe(true);
	});

	it("drops a default the user moved away, because that key is free again", () => {
		// Releasing a key is as much a part of remapping as taking one. A set that
		// only ever grows would permanently reserve keys the user has given up.
		const claimed = new KeybindingsManager({ "app.session.new": "alt+j" }).claimedKeyIds();

		expect(claimed.has("alt+j")).toBe(true);
		expect(claimed.has("ctrl+n")).toBe(false);
	});

	it("normalises case, because a shortcut arrives from user config in any case", () => {
		// `registerShortcut("F7", …)` and a `keybindings.yml` reading `f7` are the
		// same key. Two spellings in one set would let the second one slip past the
		// membership test and shadow the user's remap.
		// `KeybindingsConfig` is a `KeyId` union, and `KeyId` is lowercase-only — but
		// keybindings.yml is read from disk and never type-checked, so an uppercase key
		// is a value this host genuinely receives. The cast marks that crossing.
		const claimed = new KeybindingsManager({
			"app.session.new": "F7" as unknown as KeyId,
		}).claimedKeyIds();

		expect(claimed.has("f7")).toBe(true);
		expect(claimed.has("F7" as never)).toBe(false);
	});

	it("reports every key of a multi-key binding, not just the first", () => {
		// Users bind alternates (`["f12", "alt+j"]`). Testing only the head of the
		// array would leave the tail claimable while the head is refused.
		const claimed = new KeybindingsManager({ "app.session.rename": ["f12", "alt+j"] }).claimedKeyIds();

		expect(claimed.has("f12")).toBe(true);
		expect(claimed.has("alt+j")).toBe(true);
	});

	it("reports nothing beyond the defaults for a stock install", () => {
		// The negative contract for the caller: `getShortcuts()` falls back to the
		// built-in list when given nothing, and a set that invented keys would make
		// extensions lose shortcuts on a machine that configured none.
		const claimed = new KeybindingsManager().claimedKeyIds();

		expect(claimed.has("f12")).toBe(false);
		expect(claimed.has("alt+j")).toBe(false);
	});
});
