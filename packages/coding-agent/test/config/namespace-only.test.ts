import { describe, expect, it } from "bun:test";
import {
	PLUGIN_SETTINGS_ROOT,
	pluginSettingId,
	sanitizePluginIdSegment,
	sanitizeSettingKeySegment,
} from "@oh-my-pi/pi-coding-agent/extensibility/settings";
import { nameSegmentCollisionKey } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace/types";
import { register, registerOwned, unregisterOwned } from "@oh-my-pi/pi-coding-agent/config/registry";

describe("a plugin setting id is namespaced and deterministic", () => {
	it("builds the spec's key segment under a plugin segment that is only lowercased", () => {
		// The spec's sketch (`.lavish-wip/m2-specs/WI-8a.spec.json`) folds BOTH segments:
		// `my-plugin` → `my_plugin`. The key half is right and is kept. The plugin half is
		// a measured defect, not a style preference — the marketplace treats `my-plugin`
		// and `my_plugin` as two different plugins (`nameSegmentCollisionKey` is
		// `toLowerCase()`), so folding them here gives one settings namespace to two
		// installable plugins and whichever loads last owns the other's keys.
		//
		// So this row is deliberately NOT the spec's literal output, and the reason it
		// is quoted at all is that the key half still has to match.
		expect(pluginSettingId("my-plugin", "autoContext.enabled")).toBe("plugins.my-plugin.auto_context_enabled");
		// And the spec's own example, corrected only in the segment that is unsafe to fold.
		expect(sanitizeSettingKeySegment("autoContext.enabled")).toBe("auto_context_enabled");
	});

	it("keeps camelCase and its lowercase spelling as different keys", () => {
		// The failure this prevents: lowercasing alone maps both to `autocontext`, so two
		// keys the author considers distinct would become one setting.
		expect(sanitizeSettingKeySegment("autoContext")).not.toBe(sanitizeSettingKeySegment("autocontext"));
	});

	it("collapses separator runs and trims the ends", () => {
		expect(sanitizeSettingKeySegment("-a--b-")).toBe("a_b");
		expect(sanitizeSettingKeySegment("...")).toBe("");
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

describe("a settings id is never coarser than the marketplace's notion of a plugin", () => {
	// The invariant, asserted over pairs rather than over the two examples that exposed
	// it. `nameSegmentCollisionKey` is the marketplace's own identity rule; settings must
	// agree with it in BOTH directions, because the failure is silent — two plugins that
	// the marketplace happily installs side by side would share one settings namespace,
	// and whichever loaded last would own the other's keys.
	//
	// Folding the camel case into the plugin id broke the first direction and was caught
	// by exactly this comparison: `myPlugin` and `my_plugin` are two different plugins to
	// the marketplace, but one id to a folding `pluginSettingId`.
	//
	// Every row must be able to go red. A row that compares a value with itself settles
	// nothing: with a pure function it can only fail by throwing or by becoming
	// non-deterministic, so it reports 0 mutations of 4. `["x","x"]` was such a row and
	// was replaced by `["Foo.Bar","FOO.BAR"]`, which collides in BOTH layers and so
	// separates only if the lowercase is dropped — a real way for the two layers to drift.
	const PAIRS: ReadonlyArray<readonly [string, string]> = [
		["myPlugin", "my_plugin"],
		["myPlugin", "myplugin"],
		["aPlugin", "a-plugin"],
		["HTTPServer", "httpserver"],
		["myPlugin", "other"],
		["Foo.Bar", "foo_bar"],
		["Foo.Bar", "FOO.BAR"],
	];

	for (const [a, b] of PAIRS) {
		it(`${a} and ${b} agree between the two layers`, () => {
			const marketplaceAgrees = nameSegmentCollisionKey(a) === nameSegmentCollisionKey(b);
			const settingsAgree = pluginSettingId(a, "enabled") === pluginSettingId(b, "enabled");
			expect(
				settingsAgree,
				`${a}/${b}: marketplace says same=${marketplaceAgrees}, settings says same=${settingsAgree}`,
			).toBe(marketplaceAgrees);
		});
	}

	it("still separates the key segment the way the camel fold intends", () => {
		// The key has no upstream identity rule, so the fold stays — and the split above
		// must not have quietly removed it along with the plugin-id fold.
		expect(sanitizePluginIdSegment("myPlugin")).not.toBe(sanitizeSettingKeySegment("myPlugin"));
		expect(sanitizeSettingKeySegment("autoContext")).toBe("auto_context");
		expect(sanitizePluginIdSegment("autoContext")).toBe("autocontext");
	});
});
