/**
 * `ui.setWidget` with a component factory, observed where an author meets it.
 *
 * The defect this pins is not that the feature is missing from RPC mode. It is that
 * `setWidget` used to fall out of its own method with no frame, no error, and no factory
 * run — so an extension whose widget never appeared had no way to learn that the call it
 * made was the reason. `custom()` in the same file already carries that diagnosis in a
 * comment ("not a missing feature but a false report of one"), and `setHeader`/`setFooter`
 * next door already throw. `setWidget` was the one surface still telling the lie.
 *
 * The frame is not missing. RPC emits `setWidget` frames for `undefined` and for a string
 * array; it is the *component* that cannot cross the wire. So the fix is scoped to that arm
 * alone, and the precedence test below is the load-bearing half: a guard that threw on every
 * call would satisfy "it throws" perfectly while breaking the path that works.
 *
 * The guard clause is the other half. RPC's `hasUI` is `true` on every value, so a message
 * telling the author to write `if (pi.ui.hasUI)` sends them straight past the guard and into
 * the throw — the failure `frameless-guard-advice.test.ts` exists to detect. The assertion
 * reads `hasUI` off the real context rather than matching prose, so it holds whoever picks
 * the wrong guard branch later.
 */

import { describe, expect, it } from "bun:test";
import { RpcExtensionUIContext } from "@oh-my-pi/pi-coding-agent/modes/rpc/rpc-mode";

/** A component factory is exactly what the frame cannot carry: it is not text. */
function componentFactory(): () => null {
	return () => null;
}

function context(output: (frame: object) => void): RpcExtensionUIContext {
	return new RpcExtensionUIContext(new Map(), output, false);
}

describe("RPC setWidget with a component factory", () => {
	it("throws instead of dropping the call silently", () => {
		const frames: object[] = [];
		const ui = context(frame => frames.push(frame));

		// The failure this defends: before, this returned normally. An author saw a widget
		// that did not exist and had nothing to grep for.
		expect(() => ui.setWidget("banner", componentFactory())).toThrow(/setWidget/);
		// A throw that still emitted a frame would be two answers at once.
		expect(frames).toHaveLength(0);
	});

	it("does not name hasUI as the guard, because this context's hasUI is always true", () => {
		const ui = context(() => {});

		let message = "";
		try {
			ui.setWidget("banner", componentFactory());
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}

		// Read `hasUI` off the real context rather than asserting on prose: this holds for
		// every guard branch the message could pick, and `hasUI-blocks-the-call` is the one
		// that would be wrong here.
		expect(ui.hasUI).toBe(true);
		expect(message).toContain("setWidget");
		expect(message).not.toMatch(/Guard the call with pi\.ui\.hasUI/);
	});

	it("still emits a frame for the content the wire can carry", () => {
		const frames: Record<string, unknown>[] = [];
		const ui = context(frame => frames.push(frame as Record<string, unknown>));

		// Precedence: the arm that works must keep working. Throwing here would satisfy the
		// contract above while breaking every extension that uses the supported form.
		expect(() => ui.setWidget("status", ["line one", "line two"])).not.toThrow();
		expect(() => ui.setWidget("cleared", undefined)).not.toThrow();

		expect(frames).toHaveLength(2);
		expect(frames[0]).toMatchObject({
			type: "extension_ui_request",
			method: "setWidget",
			widgetKey: "status",
			widgetLines: ["line one", "line two"],
		});
		expect(frames[1]).toMatchObject({ method: "setWidget", widgetKey: "cleared", widgetLines: undefined });
	});

	it("carries the title opt-in from its constructor rather than reading the env at use", () => {
		// `emitRpcTitles` used to be a `runRpcMode` local read once at startup; it is a
		// constructor parameter now that the class is module-level. This pins the wiring,
		// because the failure it guards is a silent one in the other direction: a context
		// built with the flag off emitting a title the host never asked for.
		const withTitles: object[] = [];
		new RpcExtensionUIContext(new Map(), frame => withTitles.push(frame), true).setTitle("build passed");
		expect(withTitles).toHaveLength(1);
		expect(withTitles[0]).toMatchObject({ method: "setTitle", title: "build passed" });

		const withoutTitles: object[] = [];
		new RpcExtensionUIContext(new Map(), frame => withoutTitles.push(frame), false).setTitle("build passed");
		expect(withoutTitles).toHaveLength(0);
	});
});
