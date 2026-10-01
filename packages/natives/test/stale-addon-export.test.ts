/**
 * A workspace tree that pulls a release newer than its last
 * `bun run build:native` keeps loading the previous addon: the loader tolerates
 * the release mismatch by design, so every symbol added after that build is
 * absent. The contract pinned here is how that absence surfaces — a bare
 * `undefined` export turned into `<symbol> is not a function` inside whichever
 * tool used it first (every `write` call, after the read-projection guard
 * landed), with nothing naming the stale addon.
 *
 * `missingNativeExport` closes that gap on the stale path only. On a current
 * addon an absent export is not version drift, and callers use exactly that
 * absence as a capability probe, so it must stay `undefined`.
 */
import { describe, expect, it } from "bun:test";
// Side-effect import: loads the real addon, so `nativeAddonStatus()` below
// reflects this tree's build rather than an injected fixture.
import "../native";
import type { NativeAddonStatus } from "../native/loader-state.js";
import { missingNativeExport, missingNativeExportMessage, nativeAddonStatus } from "../native/loader-state.js";

const addonPath = "/w/packages/natives/native/pi_natives.linux-x64-modern.node";

type LoadedAddon = Extract<NativeAddonStatus, { state: "current" | "stale" }>;

function status(state: "current" | "stale"): LoadedAddon {
	return {
		state,
		path: addonPath,
		version: state === "stale" ? "18.1.18" : "18.2.6",
		packageVersion: "18.2.6",
	};
}

describe("native exports missing from a stale addon", () => {
	it("throws a stub naming the symbol, the addon, both releases, and the rebuild", () => {
		const stub = missingNativeExport("hashlineIsReadTruncationNotice", status("stale"));
		expect(typeof stub).toBe("function");
		for (const expected of [
			"hashlineIsReadTruncationNotice",
			addonPath,
			"18.1.18",
			"18.2.6",
			"bun run build:native",
		]) {
			expect(() => stub?.()).toThrow(expected);
		}
	});

	it("reports an unidentified addon without inventing a version", () => {
		const message = missingNativeExportMessage("search", { ...status("stale"), version: null });
		expect(message).toContain("an addon without a release stamp");
		expect(message).toContain("bun run build:native");
	});

	it("keeps the absence a plain undefined on a current addon", () => {
		const current = status("current");
		expect(missingNativeExport("macOSSpellCheckerAvailable", current)).toBeUndefined();
		expect(missingNativeExportMessage("macOSSpellCheckerAvailable", current)).toContain(addonPath);
	});

	it("reports the addon it actually loaded, not an assumed one", () => {
		const loaded = nativeAddonStatus();
		// A real load in this tree, so the addon exists; whether it matches this
		// package's release is the tree's business, not this test's.
		expect(loaded.state).not.toBe("unavailable");
		if (loaded.state === "unavailable") throw new Error("unreachable: narrowed by the assertion above");
		// Whatever the build state, the state the stubs branch on must be the one
		// the reported release implies — otherwise a current addon could serve a
		// stale stub, or a stale one silently look measured.
		expect(loaded.state).toBe(loaded.version === loaded.packageVersion ? "current" : "stale");
	});
});
