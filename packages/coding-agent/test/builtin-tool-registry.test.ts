import { describe, expect, it } from "bun:test";
import {
	allBuiltinToolFactories,
	getRegisteredBuiltinTools,
	registerBuiltinTool,
} from "@oh-my-pi/pi-coding-agent/tools";

// Contract: a first-party tool can be registered at runtime and is then treated
// exactly like one compiled into `BUILTIN_TOOLS` — selected by an explicit
// request, included in the default set, gated by settings.
//
// A registry that accepted a factory but never had it selected would be a dead
// seam wearing a live one, so these assert the tool actually reaches
// `allBuiltinToolFactories()` and both selection paths in
// `resolveBuiltinToolPlan`, which is where the literals used to be named
// directly.
//
// And the boundary is *first-party only*. A runtime registration cannot shadow a
// shipped built-in — `registerBuiltinTool` returns false. But an **extension**
// registering the same name is **not** refused: it overwrites in the tool
// registry and drops the name from the built-in set. That asymmetry is
// documented at `tools/index.ts` (`registeredBuiltinTools`) and is an open owner
// decision, not an endorsed design. This file pins the true direction of each
// side so neither docblock can rot again on its own.

const NAME = "reg-tool-probe";
const HIDDEN = "reg-tool-hidden";

describe("registerBuiltinTool", () => {
	it("makes a first-party factory reachable like a compiled-in one", () => {
		expect(registerBuiltinTool(NAME, () => null)).toBe(true);
		expect(NAME in allBuiltinToolFactories()).toBe(true);
		expect(getRegisteredBuiltinTools().has(NAME)).toBe(true);
	});

	it("refuses to shadow a shipped built-in", () => {
		// The product's own tools must not be replaceable at runtime by a stray
		// registration: a session would silently lose `bash` and gain something
		// else, with no error anywhere.
		expect(registerBuiltinTool("bash", () => null)).toBe(false);
		expect(registerBuiltinTool("goal", () => null)).toBe(false);
		// And the original is intact, not merely unreachable.
		expect(typeof allBuiltinToolFactories().bash).toBe("function");
	});

	it("refuses a duplicate registration and an empty name", () => {
		expect(registerBuiltinTool(NAME, () => null)).toBe(false);
		expect(registerBuiltinTool(" reg-space ", () => null)).toBe(false);
		expect(registerBuiltinTool("", () => null)).toBe(false);
	});

	it("leaves the shipped tables untouched", () => {
		// The literals are the product's contract; a runtime registration is
		// additive and must not mutate them.
		const before = Object.keys(allBuiltinToolFactories()).length;
		registerBuiltinTool(HIDDEN, () => null);
		expect(Object.keys(allBuiltinToolFactories()).length).toBe(before + 1);
		expect(NAME in allBuiltinToolFactories()).toBe(true);
	});
});

describe("the first-party side of the built-in/extension boundary", () => {
	it("refuses a first-party registration that collides with a shipped built-in, leaving that built-in reachable", () => {
		// `bash` is a shipped built-in. A first-party registration of it is
		// refused, and the refusal leaves the shipped factory reachable — both are
		// asserted below, because a registry that rejected the duplicate but had
		// already dropped the original would pass a bare `toBe(false)`.
		//
		// The OPPOSITE direction is deliberately not pinned here. An extension
		// registering the same name overwrites it in the tool registry and drops
		// it from the built-in name set — the `wrappedExtensionTools` loop in
		// `sdk.ts`. Whether that asymmetry is intended is an open owner decision,
		// so pinning it now would freeze the answer before it is given, and the
		// seam it would take (exporting `createTools`, or standing up a whole
		// session) would grow the public surface to test behaviour that may not
		// survive the ruling. `registerBuiltinTool` is the seam that decides
		// first-party collisions, and this test pins the contract it owns.
		expect(registerBuiltinTool("bash", () => null)).toBe(false);
		expect(typeof allBuiltinToolFactories().bash).toBe("function");
	});
});

describe("a registered tool is selected, not merely listed", () => {
	it("appears in an explicit tool request and passes the gate", async () => {
		// The failure this guards: registration succeeds, the name is in the
		// registry, and `resolveBuiltinToolPlan` still filters it out because it
		// names the two literals directly. The seam would then accept calls and
		// do nothing — a live-looking dead seam.
		const { resolveBuiltinToolPlan } = await import("@oh-my-pi/pi-coding-agent/tools");
		const { Settings } = await import("@oh-my-pi/pi-coding-agent/config/settings");
		const session = {
			restrictToolNames: true,
			requireYieldTool: false,
			enableLsp: false,
			settings: Settings.isolated({}),
		};
		const plan = await resolveBuiltinToolPlan(session as never, [NAME]);
		expect(plan.names).toContain(NAME);
		expect(plan.isAllowed(NAME)).toBe(true);
	});

	it("is left out of an explicit request that does not name it", async () => {
		// The other half: registering must not widen an explicit list. A session
		// that asked for exactly two tools must still get exactly two.
		const { resolveBuiltinToolPlan } = await import("@oh-my-pi/pi-coding-agent/tools");
		const { Settings } = await import("@oh-my-pi/pi-coding-agent/config/settings");
		const session = {
			restrictToolNames: true,
			requireYieldTool: false,
			enableLsp: false,
			settings: Settings.isolated({}),
		};
		const plan = await resolveBuiltinToolPlan(session as never, ["bash"]);
		expect(plan.names).toEqual(["bash"]);
	});
});
