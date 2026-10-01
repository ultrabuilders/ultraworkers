import { describe, expect, it } from "bun:test";
import {
	PLUGIN_SETTINGS_ROOT,
	pluginSettingId,
	sanitizePluginSegment,
} from "@oh-my-pi/pi-coding-agent/extensibility/settings";
import { register, registerOwned, unregisterOwned } from "@oh-my-pi/pi-coding-agent/config/registry";

describe("a plugin setting id is namespaced and deterministic", () => {
	it("builds the mapping the spec documents", () => {
		expect(pluginSettingId("my-plugin", "autoContext.enabled")).toBe("plugins.my_plugin.auto_context_enabled");
	});

	it("keeps camelCase and its lowercase spelling as different keys", () => {
		// The failure this prevents: lowercasing alone maps both to `autocontext`, so two
		// keys the author considers distinct would become one setting.
		expect(sanitizePluginSegment("autoContext")).not.toBe(sanitizePluginSegment("autocontext"));
	});

	it("collapses separator runs and trims the ends", () => {
		expect(sanitizePluginSegment("-a--b-")).toBe("a_b");
		expect(sanitizePluginSegment("...")).toBe("");
	});
});

describe("registerOwned refuses a bare id from a non-core owner", () => {
	it("names the owner, the id, and the correct shape", () => {
		let message = "";
		try {
			registerOwned("ext-a", { id: "autoContext.enabled", type: "string", default: "x" } as never);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).not.toBe("");
		expect(message).toContain("ext-a");
		expect(message).toContain("autoContext.enabled");
		expect(message).toContain("plugins.<id>.<key>");
	});

	it("accepts a namespaced id built from the exported root", () => {
		// THIS is the drift guard, and it works by crossing the module boundary rather
		// than by comparing two constants: the id is built with extensibility's root, and
		// the registry checks it against its OWN copy. Change either literal and this
		// turns red — verified by mutating the registry's copy to "pluginz", which fails
		// this row and the message-shape row.
		//
		// An earlier version of this file asserted `pluginSettingId(...).startsWith(root)`
		// and was credited in a comment with catching drift. It could not: both sides of
		// that comparison come from the same module, so it stayed green no matter what
		// `registry.ts` held. A guard that cannot fail is not a guard.
		const id = pluginSettingId("ext-a", "enabled");
		expect(() => registerOwned("ext-a", { id, type: "string", default: "x" } as never)).not.toThrow();
		unregisterOwned("ext-a");
	});
});

describe("core keeps declaring bare ids — this is what makes the rule non-breaking", () => {
	it("lets a bare id through for the core owner", () => {
		expect(() => register({ id: "some.core.bare", type: "string", default: "c" } as never)).not.toThrow();
		unregisterOwned("core");
	});

	it("roots every generated id under the reserved prefix", () => {
		// Asserts only what this module guarantees about its own output. It says nothing
		// about the registry's copy of the root — the row above is what covers that, by
		// behaviour rather than by comparison.
		expect(pluginSettingId("p", "k")).toStartWith(`${PLUGIN_SETTINGS_ROOT}.`);
	});
});
