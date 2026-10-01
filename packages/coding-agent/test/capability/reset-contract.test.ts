/**
 * `invalidateAllCaches()` and `resetRegistry()` are two different operations, and
 * the single name `reset()` used to stand for both.
 *
 * The alias `reset as resetCapabilities` was the tell: every one of the twelve
 * call sites wanted the filesystem cache, and the name said "capabilities". A
 * reader had no way to tell a chdir-cache drop from a registry wipe, so the next
 * person to need the second one had no name to reach for — and no test to catch
 * a conflation.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { getCapability, invalidateAllCaches, resetRegistry } from "@oh-my-pi/pi-coding-agent/capability";
import { toolCapability } from "@oh-my-pi/pi-coding-agent/capability/tool";
import { snapshotCapabilityRegistry } from "./restore-capability-registry";

describe("capability cache vs registry", () => {
	// ORDER IS LOAD-BADEN. Both rows mutate process-wide module state, so running
	// the negative row first would make this one fail for the wrong reason — the
	// registry is already empty and the assertion proves nothing about the cache.
	test("invalidateAllCaches() keeps module-level capability definitions", () => {
		invalidateAllCaches();

		// The contract that matters: dropping the fs cache must NOT un-define a
		// capability. `toolCapability` is registered by a module-level
		// `defineCapability` that ran at import, long before this call.
		expect(getCapability(toolCapability.id)).toBeDefined();
	});

	test("resetRegistry() drops capability definitions", () => {
		const restore = snapshotCapabilityRegistry();
		try {
			resetRegistry();

			expect(getCapability(toolCapability.id)).toBeUndefined();
		} finally {
			// Hand the next file a populated registry. `resetRegistry()` clears a
			// process-wide map that module evaluation will never refill, so without
			// this the teardown outlives the row that asked for it — and Bun shares
			// module state across files in one worker, so the casualty is whichever
			// unrelated file happens to land here next. Measured: pairing this file
			// with `mermaid-rendering.test.ts` turns that file's 0 fail into 1
			// (`Unknown capability: "tools"`).
			restore();
		}
	});

	afterEach(() => {
		// Belt and braces for a row that throws before its `finally`: the invariant
		// under test is that this file leaves the registry as it found it.
		expect(getCapability(toolCapability.id)).toBeDefined();
	});
});
