import { describe, expect, it } from "bun:test";
import { INBOUND_POLICIES } from "@ultraworkers/peer";
import { CFG_PEER_CROSS_SESSION_INBOUND_VALUES, cfgPeerCrossSessionInbound } from "../src/peer/settings";
import { orderedSettings } from "../src/config/all-settings";
import { Settings } from "../src/config/settings";

/**
 * `crossSessionInbound` as a REAL setting.
 *
 * The contract worth defending is the four-state one. An absent key, a user's
 * `accept`, and a `hold` must be three distinguishable things, because the fence
 * treats the absent key as "compare the two sessions' permission classes" and
 * `accept` as "no comparison needed". Collapse the first into the second and a
 * fresh install starts admitting peer messages with nobody having chosen to.
 */

describe("crossSessionInbound", () => {
	it("is unset on a settings instance that configured nothing", () => {
		// The whole reason this setting declares no default. `toBeUndefined` rather
		// than `not.toBe("accept")`: the fence branches on `undefined` itself, so a
		// default of `accept` would typecheck here and still be the wrong value.
		expect(cfgPeerCrossSessionInbound.get(Settings.isolated({}))).toBeUndefined();
	});

	it("reads back each value the fence accepts", () => {
		for (const value of CFG_PEER_CROSS_SESSION_INBOUND_VALUES) {
			expect(cfgPeerCrossSessionInbound.get(Settings.isolated({ crossSessionInbound: value }))).toBe(value);
		}
	});

	it("offers exactly the three values, in restrictiveness order", () => {
		// An enumeration, because a fourth value added by accident would reach the
		// settings panel as a choice the fence cannot honour — and `hold`/`refuse`
		// ordering matters wherever two layers are compared.
		expect(CFG_PEER_CROSS_SESSION_INBOUND_VALUES.slice()).toEqual(["accept", "hold", "refuse"]);
	});

	it("offers exactly what the fence accepts, so the two copies cannot drift apart", () => {
		// THE ROW THAT MAKES THE LOCAL DECLARATION SAFE.
		//
		// `src/peer/settings.ts` declares these values itself rather than importing
		// them, because `@ultraworkers/peer` depends on `@oh-my-pi/pi-coding-agent` and
		// importing back would close that cycle. That reasoning is about the
		// *dependency graph* — and it is correct — but it leaves two lists of the same
		// three strings, and nothing in `src` can compare them.
		//
		// A test can: tests are not part of the package graph, so this file imports the
		// real `INBOUND_POLICIES` while still exercising the coding-agent copy. If a
		// fourth policy is added to the fence and not here, this row goes red naming
		// the drift — instead of the fence accepting a value the settings layer cannot
		// represent, which is the failure that would otherwise ship silently.
		//
		// This is a different claim from the row above, which pins the three literal
		// names. That one says "these are the values"; this one says "and they are the
		// fence's values". Together: renaming one side alone cannot pass.
		expect(CFG_PEER_CROSS_SESSION_INBOUND_VALUES.slice()).toEqual([...INBOUND_POLICIES]);
	});

	it("rejects a value outside the vocabulary rather than falling back", () => {
		// A typo must not silently become `accept`. Constructing a Settings with an
		// override runs `assertWritable`, so the rejection happens at the call that
		// supplied it and names the legal values — which is what makes it a typo the
		// user can fix rather than a message that quietly changed behaviour.
		expect(() => Settings.isolated({ crossSessionInbound: "ask-me-later" })).toThrow(/accept, hold, refuse/);
	});

	it("refuses a write naming a value the fence would reject", () => {
		// The write path the settings UI and `/config` go through: `writeValue` is what
		// both call, and its first statement is `setting.assertWritable(value)`.
		//
		// Matched against the legal values rather than a bare `toThrow()`, because a
		// bare one cannot tell THIS rejection from the call simply blowing up. That is
		// not hypothetical: this row read `.set(...)`, which does not exist on `Settings`
		// at all, so it threw `TypeError: .set is not a function` and passed — green for
		// the whole time the row named a validator it never reached. Asserting the
		// message is what makes the row evidence about the fence.
		expect(() => Settings.isolated({}).writeValue(cfgPeerCrossSessionInbound, "ask-me-later", "override")).toThrow(
			/accept, hold, refuse/,
		);
	});

	it("reaches the settings panel rather than only the lookup table", () => {
		// The failure this guards is named in `all-settings.ts`: a setting that is
		// registered but unreachable from a DOMAINS entry still reads back correctly
		// and is invisible in the panel, which looks to its author like a panel bug.
		// Registering the module is therefore the assertion — a domain left out of
		// DOMAINS passes every other row in this file.
		const ids = orderedSettings().map(setting => setting.id);
		expect(ids).toContain("crossSessionInbound");
		expect(ids.filter(id => id === "crossSessionInbound").length).toBe(1);
		expect(orderedSettings()).toContain(cfgPeerCrossSessionInbound);
	});
});
