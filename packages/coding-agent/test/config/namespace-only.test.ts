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

	it("accepts a namespaced id from the same owner", () => {
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

	it("keeps the registry's copy of the root in step with the exported one", () => {
		// `config/registry.ts` holds a literal rather than importing, because config/ must
		// not depend on extensibility/. This is what stops the copy drifting.
		expect(pluginSettingId("p", "k")).toStartWith(`${PLUGIN_SETTINGS_ROOT}.`);
	});
});
