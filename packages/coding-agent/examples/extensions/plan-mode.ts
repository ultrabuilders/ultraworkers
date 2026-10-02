/**
 * A mode, declared the way an extension declares one.
 *
 * This used to be 549 lines: a `registerFlag`, a `/plan` command, a keyboard
 * shortcut, an `executionMode` boolean, a `todoItems` array, and a
 * `setActiveTools` call in each direction — a mode reimplemented out of booleans
 * and a tool list, with a branch per transition.
 *
 * `registerMode` is the seam that replaced it. The mode arrives as one record:
 * an id, a status-line chip, a write policy, and an `enter`/`exit` pair. What the
 * host now owns is the activation bookkeeping — which mode is active, when it
 * changed, and what it permits — so an author writes the behaviour and nothing
 * else.
 *
 * What is *not* here any more is the todo tracker that shared this file. It was a
 * second, unrelated concern wearing the same example's clothes, and folding it
 * into a mode would have hidden it; it is now `plan-todos.ts`.
 */
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { modeRegistry } from "@oh-my-pi/pi-coding-agent/modes/mode-registry";
import { Key } from "@oh-my-pi/pi-tui";

/** Read-only while planning. This is the whole point of the mode. */
const PLAN_MODE_TOOLS = ["read", "bash", "search", "find"];
const NORMAL_MODE_TOOLS = ["read", "bash", "edit", "write"];

export default function planModeExtension(pi: ExtensionAPI) {
	/** The one transition this example performs: plan on, or plan off. */
	function toggle(): void {
		modeRegistry.setActivation(modeRegistry.isActive("plan") ? undefined : "plan");
	}

	pi.registerMode({
		id: "plan",
		name: "Plan",
		description: "Read-only exploration. The agent can look, but not change anything.",
		statusLine: { label: "Plan" },
		// A mode that only narrows tools is the weaker half of the contract; the
		// policy is what lets the host refuse a write the tool list would allow.
		writePolicy: { denyWrite: true, denyDelete: true },
		enter: async ({ notify }) => {
			await pi.setActiveTools(PLAN_MODE_TOOLS);
			notify(`Plan mode on — tools: ${PLAN_MODE_TOOLS.join(", ")}`);
		},
		exit: async ({ notify }) => {
			await pi.setActiveTools(NORMAL_MODE_TOOLS);
			notify("Plan mode off — full access restored.");
		},
	});

	// The command and the shortcut now do one thing: move the mode. Which mode is
	// active is the registry's state, not a boolean this file keeps in step with
	// it — the bug that made the old version's status line disagree with its tools.
	pi.registerCommand("plan", {
		description: "Toggle plan mode (read-only exploration)",
		handler: async () => toggle(),
	});

	pi.registerShortcut(Key.shift("p"), {
		description: "Toggle plan mode",
		handler: async () => toggle(),
	});
}
