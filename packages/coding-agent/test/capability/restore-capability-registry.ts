/**
 * Snapshot and restore the process-wide capability registry around a test that
 * calls `resetRegistry()`.
 *
 * `resetRegistry()` is `capabilities.clear()`, and ESM evaluates each module
 * exactly once — so a module-level `defineCapability` in `capability/tool.ts`
 * and its siblings has already run by the time anything reaches it, and clearing
 * the map does not re-run those registrations. Its own docstring says so:
 * "it removes them for the remaining life of the process."
 *
 * That matters because Bun batches test files across parallel workers, so which
 * files share a worker — and therefore which file observes another's teardown —
 * is a property of the batching, not of the command line. Measured on this file:
 *
 *     bun test test/modes/theme/mermaid-rendering.test.ts   → 0 fail
 *     bun test test/capability/reset-contract.test.ts \
 *            test/modes/theme/mermaid-rendering.test.ts   → 1 fail
 *            error: Unknown capability: "tools"
 *
 * A single teardown thus poisons whichever unrelated file lands in the same
 * worker afterwards. Restoring the definitions is what keeps that teardown local
 * to the test that asked for it.
 *
 * Providers are carried across, not rebuilt: a definition restored empty would
 * resurrect the *other* half of the failure — a live extension's provider
 * silently gone — which is exactly what `provider-source-attribution.test.ts`
 * exists to catch.
 */
import { defineCapability, getCapability, listCapabilities } from "@oh-my-pi/pi-coding-agent/capability";
import type { Capability } from "@oh-my-pi/pi-coding-agent/capability/types";

/**
 * Capture every currently-defined capability, providers included.
 *
 * Call before `resetRegistry()`. Returns a restore function that is safe to call
 * more than once and a no-op once the definitions are back, so a file can pair it
 * with `afterEach` without ordering care.
 */
export function snapshotCapabilityRegistry(): () => void {
	const snapshot = listCapabilities().map(id => getCapability<never>(id)!);

	return () => {
		for (const capability of snapshot) {
			// Someone (an earlier restore, or a sibling file that only redefined one
			// capability) already put this one back. Redefining would throw.
			if (getCapability(capability.id)) continue;

			const { providers, ...definition } = capability;
			const restored = defineCapability(definition as Omit<Capability<never>, "providers">);
			restored.providers.push(...providers);
		}
	};
}
