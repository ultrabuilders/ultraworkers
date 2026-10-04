/**
 * The addon behind this process has three states, and the middle one used to be
 * invisible.
 *
 * `nativeAddonStatus()` returned `{ stale: boolean } | null`. That shape makes
 * two of the three situations reachable by accident: a caller that never reads
 * `stale` sees a stale addon as an object like any other, and `null` wears the
 * same type as a successful answer. So a gate whose assertion depends on the
 * addon being the release it expects could report `allow` while having measured
 * nothing — the two outcomes a gate must never confuse.
 *
 * These rows pin the shape, the decision drawn from it, the diagnostic wording,
 * and the fact that the passing path is unchanged.
 */
import { describe, expect, it } from "bun:test";
import type { NativeAddonStatus } from "../native/loader-state.js";
import { missingNativeExport, missingNativeExportMessage, nativeAddonGateVerdict } from "../native/loader-state.js";

const ADDON_PATH = "/w/packages/natives/native/pi_natives.linux-x64-modern.node";
const PACKAGE_VERSION = "18.2.6";

const loaded = (state: "current" | "stale", version: string | null): NativeAddonStatus => ({
	state,
	path: ADDON_PATH,
	version,
	packageVersion: PACKAGE_VERSION,
});

const UNAVAILABLE: NativeAddonStatus = { state: "unavailable" };

describe("addon state has three values, not two", () => {
	// The contract itself. A boolean-flagged object still satisfies "is it
	// stale?" for a caller that asks the right question, so this row has to ask
	// about the *state* — the regression it guards is a caller that does not.
	it("gives the three real situations three distinct values", () => {
		const current = loaded("current", PACKAGE_VERSION);
		const stale = loaded("stale", "18.1.18");
		const states = [current.state, stale.state, UNAVAILABLE.state];
		expect(new Set(states).size).toBe(3);
	});

	// Negative contract, focused. T1 above asks about the type; this asks about
	// the decision. An install that coerces the third state to `allow` passes
	// T1 and fails here, and it is precisely that install W7 exists to stop.
	it("never turns an addon it could not measure into a pass", () => {
		expect(nativeAddonGateVerdict(loaded("current", PACKAGE_VERSION))).toBe("allow");
		expect(nativeAddonGateVerdict(loaded("stale", "18.1.18"))).toBe("unknown");
		expect(nativeAddonGateVerdict(UNAVAILABLE)).toBe("unknown");
	});

	// The diagnostic path is where a user actually reads when something breaks.
	// Two causes, two fixes; merging the wording sends them to debug the wrong
	// one. Asserting only "the message is non-empty" would pass for both.
	it("tells a stale addon apart from an absent one in the diagnostic", () => {
		const stale = missingNativeExportMessage("search", loaded("stale", "18.1.18"));
		const absent = missingNativeExportMessage("search", UNAVAILABLE);
		expect(stale).toContain("18.1.18");
		expect(stale).toContain(PACKAGE_VERSION);
		expect(absent).not.toContain(ADDON_PATH);
		expect(stale).not.toBe(absent);
	});

	// Preservation: W7 adds a state, it does not tighten a gate. A current addon
	// must keep returning the bare `undefined` that callers probe with
	// (`typeof native.x === "function"`), or every capability probe breaks.
	it("leaves a current addon's absent export a plain undefined", () => {
		expect(missingNativeExport("write", loaded("current", PACKAGE_VERSION))).toBeUndefined();
		// And the stub still exists where it must: the stale path is the one that
		// gains a diagnostic, so a regression that silenced it would hide the
		// very failure this whole mechanism reports.
		expect(typeof missingNativeExport("write", loaded("stale", "18.1.18"))).toBe("function");
	});
});
