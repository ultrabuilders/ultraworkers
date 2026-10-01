/**
 * A missing native export has three causes, and the diagnostic must not merge them.
 *
 * No addon, a current addon missing the symbol, and a stale addon missing it
 * are three situations with three different fixes — install, accept that this
 * build does not implement the symbol, or rebuild. `missingNativeExportMessage`
 * words all three differently, and that wording is what a user reads when a
 * symbol turns out to be missing, so merging any two of them sends the reader
 * to the wrong place.
 *
 * The no-addon branch is the one with no other coverage. `stale-addon-export.test.ts`
 * pins the current and stale wordings, and `legacy-desktop-sentinel.test.ts` owns
 * `validateLoadedBindings` outright; nothing asserted that the third wording is
 * distinct from the other two, so a reword that folded "no addon" into the
 * current-addon sentence would have stayed green.
 *
 * This deliberately does not assert the *gate* for the no-addon case.
 * `missingNativeExport` answers `undefined` there, the same answer it gives for
 * "this build does not implement it" — the collapse `m8-w7-099` exists to
 * prevent. Asserting today's answer would enshrine the defect, and changing it
 * is a type change on an API with no production caller, so it waits for a
 * ruling. The ruling only has to move that one branch; the wording it produces
 * is pinned here and will not need to change with it.
 */
import { describe, expect, test } from "bun:test";
import { missingNativeExportMessage, type NativeAddonStatus } from "../native/loader-state.js";

const addonPath = "/w/packages/natives/native/pi_natives.darwin-arm64.node";

function status(overrides: Partial<NativeAddonStatus> = {}): NativeAddonStatus {
	return { path: addonPath, version: "18.2.6", packageVersion: "18.2.6", stale: false, ...overrides };
}

describe("missing-export diagnostics separate the three addon states", () => {
	test("no addon is worded distinctly from both kinds of loaded addon", () => {
		const absent = missingNativeExportMessage("readProjection");
		const current = missingNativeExportMessage("readProjection", status());
		const stale = missingNativeExportMessage("readProjection", status({ version: "18.1.18", stale: true }));

		// Pairwise rather than against a set: three distinct strings would also
		// satisfy a set, but what the reader needs is that no two *causes* share
		// a sentence, and a cause is a pair of wordings.
		expect(absent).not.toBe(current);
		expect(absent).not.toBe(stale);

		// The load-bearing difference, not a rewording. Only the stale case can
		// name two different releases — that is the entire reason it earns a
		// sentence of its own rather than a variant of the current-addon one.
		expect(stale).toContain("18.1.18");
		expect(stale).toContain("18.2.6");
		expect(current).toContain(addonPath);
		expect(current).not.toContain("18.1.18");
	});
});
