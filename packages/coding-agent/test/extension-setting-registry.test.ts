import { describe, expect, it } from "bun:test";
import { registerOwned, unregisterOwned, ownerOf, lookup } from "../src/config/registry";
import { orderedSettings } from "../src/config/all-settings";

/**
 * An extension-owned setting has to survive a whole round trip to be worth
 * having: registered, findable by id, visible where the panel reads, and gone
 * again on unload.
 *
 * The failure this defends is quiet. `orderedSettings()` walks DOMAINS, and an
 * extension's setting is in none of them — so before the registry grew an owner
 * index the handle existed, `lookup` found it, and the settings panel never
 * showed it. A setting that reads back correctly but never appears looks to its
 * author like a panel bug, not a missing registration.
 */
describe("extension-owned settings", () => {
	it("registers, resolves, and surfaces in the panel's data source", () => {
		const handle = registerOwned("extension:/tmp/demo.ts", {
			id: "plugins.demo.thing",
			type: "boolean",
			default: false,
		});
		try {
			expect(lookup("plugins.demo.thing")).toBe(handle);
			expect(ownerOf("plugins.demo.thing")).toBe("extension:/tmp/demo.ts");
			// The load-bearing half: registered is not the same as visible.
			expect(orderedSettings().map(setting => setting.id)).toContain("plugins.demo.thing");
		} finally {
			unregisterOwned("extension:/tmp/demo.ts");
		}
	});

	it("removes only its owner's settings on unload", () => {
		const mine = registerOwned("extension:/tmp/mine.ts", {
			id: "plugins.demo.mine",
			type: "boolean",
			default: false,
		});
		const theirs = registerOwned("extension:/tmp/theirs.ts", {
			id: "plugins.demo.theirs",
			type: "boolean",
			default: false,
		});
		try {
			// A shared teardown that took everything would delete a live
			// extension's configuration — the worst possible blast radius.
			expect(lookup("plugins.demo.mine")).toBe(mine);
			unregisterOwned("extension:/tmp/mine.ts");
			expect(lookup("plugins.demo.mine")).toBeUndefined();
			expect(lookup("plugins.demo.theirs")).toBe(theirs);
			expect(orderedSettings().map(setting => setting.id)).not.toContain("plugins.demo.mine");
		} finally {
			unregisterOwned("extension:/tmp/mine.ts");
			unregisterOwned("extension:/tmp/theirs.ts");
		}
	});

	it("rejects a duplicate id rather than letting the later owner win silently", () => {
		registerOwned("extension:/tmp/first.ts", { id: "plugins.demo.dup", type: "boolean", default: false });
		try {
			expect(() =>
				registerOwned("extension:/tmp/second.ts", { id: "plugins.demo.dup", type: "boolean", default: true }),
			).toThrow(/plugins\.demo\.dup/);
			// The holder, so the author knows which OTHER owner took the id instead of
			// having to bisect their own setting list. Wording is not asserted: the
			// message is a diagnostic, its content is not a wire contract.
			expect(() =>
				registerOwned("extension:/tmp/third.ts", { id: "plugins.demo.dup", type: "boolean", default: false }),
			).toThrow(/first\.ts/);
		} finally {
			unregisterOwned("extension:/tmp/first.ts");
		}
	});
});
