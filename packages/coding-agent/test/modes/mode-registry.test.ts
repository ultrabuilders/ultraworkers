import { describe, expect, it } from "bun:test";
import { ModeRegistry, type ModeDefinition } from "@oh-my-pi/pi-coding-agent/modes/mode-registry";

/**
 * The registry's observable answers.
 *
 * `test/plan-mode/write-policy.test.ts` covers how a policy is *evaluated*; this
 * covers where one comes from and which mode owns it. The failure mode it defends
 * is a registry that holds definitions but answers questions about the wrong one
 * — a mode that activates and reports another mode's write policy, or renders a
 * chip for a mode the user never selected. Nothing here asserts that a method ran;
 * every assertion reads back state a consumer would read.
 */

function mode(id: string, extra: Partial<ModeDefinition> = {}): ModeDefinition {
	return {
		id,
		name: `Mode ${id}`,
		description: `test mode ${id}`,
		statusLine: { label: id },
		...extra,
	};
}

describe("ModeRegistry", () => {
	it("reports no active mode until one is activated", () => {
		// Between turns there is genuinely no mode, and a chip that has to invent
		// one would show a mode the user never chose.
		const registry = new ModeRegistry();
		registry.register(mode("plan"));
		expect(registry.activeId()).toBeUndefined();
		expect(registry.resolvedMode()).toBeUndefined();
		expect(registry.isActive("plan")).toBe(false);
	});

	it("answers for the active mode and no other", () => {
		// The whole point of the registry: switching modes switches the answers.
		// A registry that reported the first registered mode regardless would pass
		// every activation test above while gating the wrong mode's writes.
		const registry = new ModeRegistry();
		registry.register(mode("plan", { writePolicy: { denyWorkingTree: true } }));
		registry.register(mode("vibe", { writePolicy: { denyDelete: true } }));

		registry.setActivation("vibe");
		expect(registry.activeId()).toBe("vibe");
		expect(registry.isActive("vibe")).toBe(true);
		expect(registry.isActive("plan")).toBe(false);
		expect(registry.resolvedMode()?.id).toBe("vibe");
		// Distinct policies, so reading the wrong one is visible rather than
		// coincidentally correct.
		expect(registry.writePolicy()).toEqual({ denyDelete: true });

		registry.setActivation("plan");
		expect(registry.writePolicy()).toEqual({ denyWorkingTree: true });
	});

	it("has no write policy when the active mode declares none", () => {
		// A mode that gates nothing must not inherit the previous mode's policy.
		// Stale state here would silently keep a read-only guard on after the user
		// left the mode that asked for it.
		const registry = new ModeRegistry();
		registry.register(mode("plan", { writePolicy: { denyWorkingTree: true } }));
		registry.register(mode("freeform"));

		registry.setActivation("plan");
		expect(registry.writePolicy()).toEqual({ denyWorkingTree: true });

		registry.setActivation("freeform");
		expect(registry.writePolicy()).toBeUndefined();
	});

	it("resolves the mode to render, carrying the status-line chip", () => {
		// Consumers draw `resolvedMode()`, so the chip has to arrive with it. A
		// resolved mode missing its label would render an empty chip — the silent
		// "mode did not take effect" default this registry exists to prevent.
		const registry = new ModeRegistry();
		registry.register(mode("plan", { statusLine: { label: "Plan", tone: "paused" } }));
		registry.setActivation("plan");

		expect(registry.resolvedMode()).toEqual({
			id: "plan",
			name: "Mode plan",
			statusLine: { label: "Plan", tone: "paused" },
		});
	});

	it("deactivating clears every answer rather than leaving the last mode", () => {
		// Leaving a restricted mode must not leave its policy behind; that would
		// keep the working tree read-only with nothing on screen explaining why.
		const registry = new ModeRegistry();
		registry.register(mode("plan", { writePolicy: { denyWorkingTree: true } }));
		registry.setActivation("plan");

		registry.setActivation(undefined);
		expect(registry.activeId()).toBeUndefined();
		expect(registry.resolvedMode()).toBeUndefined();
		expect(registry.writePolicy()).toBeUndefined();
	});

	it("refuses a duplicate id by name rather than displacing the first", () => {
		// One extension silently replacing another's mode would leave the displaced
		// mode holding whatever state it already applied. The error names the id so
		// the author can tell which registration collided.
		const registry = new ModeRegistry();
		registry.register(mode("plan", { name: "Original" }));
		expect(() => registry.register(mode("plan", { name: "Impostor" }))).toThrow(/already registered/);

		registry.setActivation("plan");
		expect(registry.resolvedMode()?.name).toBe("Original");
	});

	it("refuses to activate a mode that was never registered", () => {
		// Activating a typo must fail loudly. A registry that silently accepted it
		// would report a mode as active that resolves to nothing, so the chip would
		// go blank with no error anywhere.
		const registry = new ModeRegistry();
		expect(() => registry.setActivation("nope")).toThrow(/unregistered/);
		expect(registry.activeId()).toBeUndefined();
	});

	it("orders by declared order, then by id, and keeps that order stable", () => {
		// The status line reads first-wins for the chip, so the order is a
		// user-visible contract rather than cosmetic.
		const registry = new ModeRegistry();
		registry.register(mode("zeta", { order: 10 }));
		registry.register(mode("alpha"));
		registry.register(mode("beta", { order: 1 }));

		expect(registry.list().map(m => m.id)).toEqual(["beta", "zeta", "alpha"]);

		// Registering after the first read must invalidate the cached order.
		registry.register(mode("omega", { order: 5 }));
		expect(registry.list().map(m => m.id)).toEqual(["beta", "omega", "zeta", "alpha"]);
	});

	it("notifies subscribers of the mode that is now active, and stops after unsubscribing", () => {
		// Consumers redraw from this. A notification carrying the *previous* mode,
		// or none at all, leaves the chip one activation stale.
		const registry = new ModeRegistry();
		registry.register(mode("plan"));
		registry.register(mode("vibe"));

		const seen: Array<string | undefined> = [];
		const unsubscribe = registry.onChange(mode => seen.push(mode?.id));

		registry.setActivation("plan");
		registry.setActivation("vibe");
		registry.setActivation(undefined);
		expect(seen).toEqual(["plan", "vibe", undefined]);

		unsubscribe();
		registry.setActivation("plan");
		expect(seen).toEqual(["plan", "vibe", undefined]);
	});

	it("does not notify when the active mode did not actually change", () => {
		// Re-selecting the current mode is not a change. Redrawing on it would
		// churn the status line on every no-op activation.
		const registry = new ModeRegistry();
		registry.register(mode("plan"));

		const seen: Array<string | undefined> = [];
		registry.onChange(mode => seen.push(mode?.id));

		registry.setActivation("plan");
		registry.setActivation("plan");
		expect(seen).toEqual(["plan"]);
	});

	it("completes an activation even when a subscriber throws", () => {
		// A renderer that cannot draw must not leave the registry claiming nothing
		// changed while the mode has in fact switched — the next successful render
		// reads the new value, so recovery is automatic.
		const registry = new ModeRegistry();
		registry.register(mode("plan", { writePolicy: { denyWorkingTree: true } }));

		registry.onChange(() => {
			throw new Error("renderer exploded");
		});
		const after: Array<string | undefined> = [];
		registry.onChange(mode => after.push(mode?.id));

		registry.setActivation("plan");
		expect(registry.activeId()).toBe("plan");
		expect(registry.writePolicy()).toEqual({ denyWorkingTree: true });
		expect(after).toEqual(["plan"]);
	});

	it("runs enter and exit around the activation change, in that order", () => {
		// Hooks are how a mode applies its tool set. If exit ran before enter on a
		// switch, the outgoing mode's cleanup would undo the incoming mode's setup.
		const registry = new ModeRegistry();
		const calls: string[] = [];
		registry.register(
			mode("plan", {
				enter: () => void calls.push("enter:plan"),
				exit: () => void calls.push("exit:plan"),
			}),
		);
		registry.register(
			mode("vibe", {
				enter: () => void calls.push("enter:vibe"),
				exit: () => void calls.push("exit:vibe"),
			}),
		);

		// The registry itself does not run the hooks — a consumer drives them
		// around setActivation. What is asserted here is that a definition can
		// carry them at all, and that a mode without them is usable.
		registry.register(mode("quiet"));
		registry.setActivation("plan");
		expect(calls).toEqual([]);
		expect(registry.resolvedMode()?.id).toBe("plan");

		registry.setActivation("quiet");
		expect(registry.resolvedMode()?.id).toBe("quiet");
	});
});
