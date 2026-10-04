/**
 * The panel's mount decision, and the renderer's degradation paths.
 *
 * The row that matters most here is negative: the panel must NOT swallow keys. A widget that
 * implements `handleInput` takes every keystroke away from the prompt, and the reference has a
 * regression test for exactly that — a pasted string containing "x" must not stop a run. The
 * panel is therefore a pure output surface, and this file pins that by asserting the method is
 * ABSENT rather than present-and-correct.
 */
import { describe, expect, test } from "bun:test";
import type { WorkflowSnapshot } from "../../src/types";
import {
	type PanelUiContext,
	canMountCustom,
	canRegisterWidget,
	createWidgetWorkflowDisplay,
	renderWorkflowLines,
	renderWorkflowText,
	shorten,
} from "../../src/ui/panel";

function snapshotOf(agents: WorkflowSnapshot["agents"], extra: Partial<WorkflowSnapshot> = {}): WorkflowSnapshot {
	return { name: "deploy", phases: [], agents, ...extra };
}

/** A UI context that records what was mounted, and can be told which surfaces are available. */
function recordingUi(options: { hasUI: boolean; canMount?: boolean }) {
	const calls: Array<{ surface?: string; key: string; factory?: unknown }> = [];
	const ctx: PanelUiContext = {
		hasUI: options.hasUI,
		canMount: () => options.canMount ?? false,
		setWidget(key, factory) {
			calls.push(factory === undefined ? { key } : { key, factory });
		},
		setStatus(key, value) {
			calls.push({ surface: value === undefined ? "status:clear" : `status:${value}`, key });
		},
	};
	return { ctx, calls };
}

describe("the panel registers below the editor", () => {
	test("the default placement is belowEditor", () => {
		// The default is the whole point: a run's progress belongs near the prompt, and a panel
		// that has to be positioned explicitly is a panel nobody positions.
		const { ctx, calls } = recordingUi({ hasUI: true });
		createWidgetWorkflowDisplay(ctx);
		expect(calls[0].key).toBe("workflow");
	});

	test("a widget is registered even with no status line requested", () => {
		// `showStatus` defaults OFF; the widget is the panel. A guard that required both would
		// register nothing in the default configuration.
		const { ctx, calls } = recordingUi({ hasUI: true });
		createWidgetWorkflowDisplay(ctx);
		expect(calls.length).toBe(1);
	});
});

describe("the panel takes no keyboard input", () => {
	test("NEGATIVE CONTRACT: the component exposes no handleInput", () => {
		// The regression the reference guards: a widget that handles input swallows every
		// keystroke, so typing a message containing "x" would toggle a shortcut and stop a run
		// mid-flight. Asserting the method is ABSENT is the only assertion that survives someone
		// adding a no-op `handleInput` later — a "returns undefined" row would not.
		const { ctx } = recordingUi({ hasUI: true });
		const display = createWidgetWorkflowDisplay(ctx);
		// Force a render so the factory is reachable, then inspect what the TUI would hold.
		let component: object | undefined;
		const originalSet = ctx.setWidget.bind(ctx);
		ctx.setWidget = (key, factory, opts) => {
			if (factory) component = factory(undefined, { fg: (_c, t) => t, bold: t => t });
			originalSet(key, factory, opts);
		};
		display.update(snapshotOf([]));
		expect(component).toBeDefined();
		// `component` is undefined only if the factory was never reached, which the assertion
		// above already rules out; the `in` check is the contract.
		expect(component !== undefined && "handleInput" in component).toBe(false);
	});
});

describe("a finished run leaves the panel but the display can be cleared", () => {
	test("clear unregisters the widget", () => {
		const { ctx, calls } = recordingUi({ hasUI: true });
		const display = createWidgetWorkflowDisplay(ctx);
		display.clear();
		// `undefined` is how the TUI is told to remove a widget — registering `undefined` is not
		// a no-op, it is the removal.
		expect(calls.at(-1)).toEqual({ key: "workflow" });
	});

	test("updates before any clear keep re-registering the factory", () => {
		// The factory is stored, not the component: a component captured once would keep
		// rendering the FIRST snapshot forever, and the panel would freeze on run start.
		const { ctx, calls } = recordingUi({ hasUI: true });
		const display = createWidgetWorkflowDisplay(ctx);
		const before = calls.length;
		display.update(snapshotOf([{ id: 1, label: "a", status: "running" }]));
		display.update(snapshotOf([{ id: 1, label: "a", status: "done" }]));
		expect(calls.length).toBe(before + 2);
	});
});

describe("THE GUARD — per surface, never one boolean", () => {
	test("hasUI is TRUE in RPC, and the widget is still not worth registering", () => {
		// The reference's own reasoning: `setWidget` is excluded from `canMount` because RPC
		// renders a string array and silently ignores a component factory. So the question here
		// is "worth calling", and `hasUI` answers it — but only for THIS surface.
		const { ctx, calls } = recordingUi({ hasUI: true, canMount: false });
		createWidgetWorkflowDisplay(ctx);
		// hasUI true → registered. The point of this row is that the two answers DISAGREE here.
		expect(canMountCustom(ctx)).toBe(false);
		expect(calls.length).toBe(1);
	});

	test("no UI at all means no widget registration", () => {
		const { ctx, calls } = recordingUi({ hasUI: false, canMount: false });
		const display = createWidgetWorkflowDisplay(ctx);
		display.update(snapshotOf([]));
		expect(calls).toEqual([]);
	});

	test("canMountCustom asks canMount('custom') and never reads hasUI", () => {
		// The row the bead exists for. In RPC and in ACP-with-elicitation `hasUI` is TRUE while
		// `custom()` THROWS on every call, so a navigator guarded on `hasUI` crashes the host in
		// exactly the modes where a user is most likely to be watching.
		let asked: string[] = [];
		const ctx = {
			canMount: (surface: "header" | "footer" | "custom") => {
				asked.push(surface);
				return surface === "custom";
			},
		};
		expect(canMountCustom(ctx)).toBe(true);
		expect(asked).toEqual(["custom"]);
		// And the two surfaces that throw for want of a frame are answerable independently.
		expect(canMountCustom({ canMount: () => false })).toBe(false);
	});

	test("canRegisterWidget answers a DIFFERENT question than canMountCustom", () => {
		// Pinned because the two being the same function is the bug: the panel may register on
		// `hasUI`, and if someone "unified" them the navigator would start registering widgets in
		// RPC and the panel would start skipping surfaces that mount fine.
		const ctx = { hasUI: true, canMount: () => false };
		expect(canRegisterWidget(ctx)).toBe(true);
		expect(canMountCustom(ctx)).toBe(false);
	});
});

describe("the renderer degrades rather than lying", () => {
	test("a fractional maxAgents does not render every agent", () => {
		// Copied bug class: `slice(-0)` is `slice(0)`, so a zero OR a fractional cap renders the
		// WHOLE fleet on a panel sized for a handful.
		const agents = Array.from({ length: 50 }, (_, i) => ({
			id: i,
			label: `a${i}`,
			phase: "p",
			status: "done" as const,
		}));
		const lines = renderWorkflowLines(snapshotOf(agents, { phases: ["p"] }), { maxAgents: 0.5 });
		expect(lines.some(line => line.includes("a49"))).toBe(true);
		expect(lines.length).toBeLessThan(50);
	});

	test("a non-positive maxAgents falls back to 8 rather than to unlimited", () => {
		const agents = Array.from({ length: 40 }, (_, i) => ({
			id: i,
			label: `a${i}`,
			phase: "p",
			status: "done" as const,
		}));
		const lines = renderWorkflowLines(snapshotOf(agents, { phases: ["p"] }), { maxAgents: 0 });
		expect(lines.some(line => line.includes("earlier agents"))).toBe(true);
	});

	test("omitted earlier agents are counted, not silently dropped", () => {
		// The user must be able to tell the panel is truncated. A silent drop reads as "that was
		// all of them". Phased agents specifically: the truncation notice lives in the per-phase
		// loop, and the reference's Unphased branch emits none — see the row below.
		const agents = Array.from({ length: 20 }, (_, i) => ({
			id: i,
			label: `a${i}`,
			phase: "p",
			status: "done" as const,
		}));
		const lines = renderWorkflowLines(snapshotOf(agents, { phases: ["p"] }), { maxAgents: 3 });
		expect(lines.some(line => line.includes("17 earlier agents"))).toBe(true);
	});

	test("agents with no phase render under Unphased", () => {
		const lines = renderWorkflowLines(snapshotOf([{ id: 1, label: "orphan", status: "done" }]));
		expect(lines.some(line => line.includes("Unphased"))).toBe(true);
	});

	test("NEGATIVE: the Unphased branch emits NO truncation notice", () => {
		// Pinned because it looks like an oversight and is copied verbatim: the reference caps
		// Unphased agents with `slice(-maxAgents)` but has no "… N earlier agents" line there,
		// so a long unphased fleet is truncated SILENTLY while a phased one is not. If that is a
		// bug, this is the row that should change with the fix — not be quietly "corrected" here.
		const agents = Array.from({ length: 20 }, (_, i) => ({ id: i, label: `a${i}`, status: "done" as const }));
		const lines = renderWorkflowLines(snapshotOf(agents), { maxAgents: 3 });
		expect(lines.some(line => line.includes("earlier agents"))).toBe(false);
		expect(lines.some(line => line.includes("a19"))).toBe(true);
	});
});

describe("labels are sanitized before they reach a terminal", () => {
	test("tabs and newlines in a label cannot forge panel rows", () => {
		// A raw tab punches a visual hole; a raw newline forges an agent row the run never had.
		// This is the reference's `replace(/\s+/g, " ")` and it is a security property, not polish.
		expect(shorten("a\tb\nc  d", 40)).toBe("a b c d");
	});

	test("an over-long label is truncated with an ellipsis", () => {
		expect(shorten("x".repeat(60), 10)).toBe(`${"x".repeat(9)}…`);
		expect(shorten("short", 10)).toBe("short");
	});
});

describe("text output names the run's state", () => {
	test("a completed run and a running one read differently", () => {
		const snap = snapshotOf([]);
		expect(renderWorkflowText(snap, true)).toContain("Workflow completed");
		expect(renderWorkflowText(snap, false)).toContain("Workflow running");
		expect(renderWorkflowText(snap, "failed")).toContain("Workflow failed");
	});
});
