/**
 * The host render strategy seam: who decides whether a terminal resize repaints
 * the visible window in place, or borrows the alternate screen and replays.
 *
 * `resolveInPlaceResize` is pure — it takes the environment, the grid-ownership
 * flag and the platform as arguments — so every host combination here is driven
 * directly and nothing mutates `process.env`. That matters beyond tidiness: the
 * alternative is a test file that leaves a terminal multiplexer marker set for
 * whichever file runs next.
 *
 * The registry is process-wide, so every test clears it in `afterEach`.
 */
import { afterEach, describe, expect, it } from "bun:test";
import {
	clearHostRenderStrategies,
	type HostRenderDecision,
	type HostRenderStrategy,
	registerHostRenderStrategy,
	resolveInPlaceResize,
	resizeInPlaceEnvOverride,
} from "../src/host-render-strategy";

const NO_GRID_OWNER = false;
const DARWIN = "darwin" as NodeJS.Platform;

/**
 * `strategies` is left undefined when a test does not supply one, so the
 * resolver falls through to the PROCESS REGISTRY — the production path. Passing
 * `[]` by default would silently bypass the registry and make the "installed in
 * the registry" assertions unfalsifiable.
 */
const gate = (
	env: NodeJS.ProcessEnv,
	strategies?: readonly HostRenderStrategy[],
	hostOwnsGridOnResize = NO_GRID_OWNER,
): boolean => resolveInPlaceResize({ env, hostOwnsGridOnResize, platform: DARWIN }, strategies);

/** A strategy that always answers the same way, for precedence tests. */
const saying = (id: string, decision: HostRenderDecision): HostRenderStrategy => ({
	id,
	label: `test ${id}`,
	decide: () => decision,
});

afterEach(() => {
	clearHostRenderStrategies();
});

describe("the resize gate with no extension", () => {
	it("keeps core's own answers: Warp repaints in place, everything else borrows", () => {
		expect(gate({ TERM_PROGRAM: "WarpTerminal" })).toBe(true);
		expect(gate({ TERM_PROGRAM: "iTerm.app" })).toBe(false);
		expect(gate({})).toBe(false);
	});

	it("defers to the alt-buffer path wherever a multiplexer owns the grid", () => {
		// Warp inside tmux: the mux consumes the alt-buffer toggles itself, so
		// borrowing is the tuned path and an inherited Warp marker must not divert it.
		expect(gate({ TERM_PROGRAM: "WarpTerminal", TMUX: "/tmp/tmux-1000/default,1,0" })).toBe(false);
		expect(gate({ ZELLIJ: "0" })).toBe(false);
		expect(gate({ CMUX_WORKSPACE_ID: "w1" })).toBe(false);
	});

	it("keeps the borrow path on a ConPTY host, where there is no anchor to recover", () => {
		// conhost re-emits its whole viewport and re-homes the cursor on resize, so
		// the settled DSR reply carries column 1 and can never be attributed.
		expect(gate({ TERM_PROGRAM: "WarpTerminal" }, [], true)).toBe(false);
	});

	it("reads the user's own override ahead of any detection", () => {
		expect(gate({ PI_TUI_RESIZE_IN_PLACE: "1", TERM_PROGRAM: "iTerm.app" })).toBe(true);
		expect(gate({ PI_TUI_RESIZE_IN_PLACE: "true", TERM_PROGRAM: "WarpTerminal" })).toBe(true);
		// …including ahead of the multiplexer veto: someone who set the variable
		// did so because the automatic answer was wrong for their terminal.
		expect(gate({ PI_TUI_RESIZE_IN_PLACE: "1", TMUX: "/tmp/tmux-1000/default,1,0" })).toBe(true);
		expect(gate({ PI_TUI_RESIZE_IN_PLACE: "0", TERM_PROGRAM: "WarpTerminal" })).toBe(false);
	});

	it("treats an unset or unrecognised override as no opinion", () => {
		expect(resizeInPlaceEnvOverride({})).toBeNull();
		expect(resizeInPlaceEnvOverride({ PI_TUI_RESIZE_IN_PLACE: "yes" })).toBeNull();
		expect(gate({ PI_TUI_RESIZE_IN_PLACE: "yes", TERM_PROGRAM: "WarpTerminal" })).toBe(true);
	});
});

describe("a registered strategy", () => {
	it("decides for a host core's closed classifier has never heard of", () => {
		const myterm = gate({ TERM_PROGRAM: "MyTerm" }, [saying("myterm", "in-place")]);
		// Core alone borrows here; the vendor knows its terminal repaints in place.
		expect(gate({ TERM_PROGRAM: "MyTerm" })).toBe(false);
		expect(myterm).toBe(true);
	});

	it("sees the environment and the platform", () => {
		const seen: Array<NodeJS.Platform | boolean | string | undefined> = [];
		gate({ TERM_PROGRAM: "MyTerm" }, [
			{
				id: "spy",
				label: "spy",
				decide: context => {
					seen.push(context.platform, context.hostOwnsGridOnResize, context.env.TERM_PROGRAM);
					return "defer";
				},
			},
		]);
		expect(seen).toEqual([DARWIN, false, "MyTerm"]);
	});

	it("is never reached on a host the safety veto already claimed", () => {
		// A consequence of the veto that is worth stating rather than leaving to be
		// discovered: `decide` cannot observe `hostOwnsGridOnResize === true`,
		// because the gate returns before consulting anyone. A strategy that
		// branched on it would have a branch that never runs.
		let called = 0;
		gate(
			{ TERM_PROGRAM: "MyTerm" },
			[
				{
					id: "counting",
					label: "counting",
					decide: () => {
						called++;
						return "in-place";
					},
				},
			],
			true,
		);
		expect(called).toBe(0);
	});

	it("lets a strategy force the conservative borrow path on a host core would repaint", () => {
		expect(gate({ TERM_PROGRAM: "WarpTerminal" }, [saying("careful", "alt-borrow")])).toBe(false);
	});

	it("takes the first strategy with an opinion and skips the ones that defer", () => {
		const order = [
			saying("abstains", "defer"),
			saying("claims-in-place", "in-place"),
			saying("claims-borrow", "alt-borrow"),
		];
		expect(gate({ TERM_PROGRAM: "iTerm.app" }, order)).toBe(true);
		expect(gate({ TERM_PROGRAM: "iTerm.app" }, [order[0]!])).toBe(false);
	});

	it("cannot overrule core's multiplexer and ConPTY safety veto", () => {
		// This is the asymmetry that keeps the seam from being a foot-gun: a vendor
		// may claim a host core has never seen, but these hosts are measurably
		// broken for in-place repaint and an opinion does not change that.
		const aggressive = [saying("aggressive", "in-place")];
		expect(gate({ TERM_PROGRAM: "MyTerm", TMUX: "/tmp/tmux-1000/default,1,0" }, aggressive)).toBe(false);
		expect(gate({ TERM_PROGRAM: "MyTerm" }, aggressive, true)).toBe(false);
	});

	it("is consulted at all, rather than skipped whenever it exists", () => {
		// A guard is only real if it can be observed failing. The multiplexer case
		// above proves the veto; this proves the strategy is genuinely reached when
		// the veto does not apply.
		let called = 0;
		gate({ TERM_PROGRAM: "MyTerm" }, [
			{
				id: "counting",
				label: "counting",
				decide: () => {
					called++;
					return "defer";
				},
			},
		]);
		expect(called).toBe(1);
	});
});

describe("registration", () => {
	it("installs into the process registry the gate reads by default", () => {
		expect(gate({ TERM_PROGRAM: "MyTerm" })).toBe(false);
		const dispose = registerHostRenderStrategy({
			id: "installed",
			label: "installed",
			decide: () => "in-place",
		});

		// No strategies argument: this is the production path.
		expect(gate({ TERM_PROGRAM: "MyTerm" })).toBe(true);

		// Releasing it returns the host to exactly the pre-seam answer.
		dispose();
		expect(gate({ TERM_PROGRAM: "MyTerm" })).toBe(false);
	});

	it("refuses a definition it cannot honour, naming what was wrong", () => {
		expect(() => registerHostRenderStrategy({ id: "  ", label: "x", decide: () => "defer" })).toThrow(
			/non-empty trimmed string/,
		);
		expect(() => registerHostRenderStrategy({ id: "x", label: "   ", decide: () => "defer" })).toThrow(
			/must have a label/,
		);
		expect(() => registerHostRenderStrategy({ id: "x", label: "x", decide: "nope" as never })).toThrow(
			/must provide decide\(\)/,
		);
	});

	it("refuses a duplicate id, because two strategies sharing one make every log line ambiguous", () => {
		const dispose = registerHostRenderStrategy({ id: "twice", label: "first", decide: () => "defer" });
		try {
			expect(() => registerHostRenderStrategy({ id: "twice", label: "second", decide: () => "defer" })).toThrow(
				/already registered/,
			);
		} finally {
			dispose();
		}
	});

	it("leaves the registry untouched when a registration is refused", () => {
		registerHostRenderStrategy({ id: "keeper", label: "keeper", decide: () => "in-place" });
		expect(() => registerHostRenderStrategy({ id: "keeper", label: "clash", decide: () => "defer" })).toThrow();
		// A refused registration must not displace the one that is already there.
		expect(gate({ TERM_PROGRAM: "MyTerm" })).toBe(true);
	});

	it("keeps other strategies running when one is disposed", () => {
		const first = registerHostRenderStrategy({ id: "first", label: "first", decide: () => "defer" });
		registerHostRenderStrategy({ id: "second", label: "second", decide: () => "in-place" });

		first();
		expect(gate({ TERM_PROGRAM: "MyTerm" })).toBe(true);

		clearHostRenderStrategies();
		expect(gate({ TERM_PROGRAM: "MyTerm" })).toBe(false);
	});
});
