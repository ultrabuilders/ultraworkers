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
import { describe, expect, test } from "bun:test";
import { getCapability, invalidateAllCaches, resetRegistry } from "@oh-my-pi/pi-coding-agent/capability";
import { toolCapability } from "@oh-my-pi/pi-coding-agent/capability/tool";

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
		resetRegistry();

		expect(getCapability(toolCapability.id)).toBeUndefined();
	});
});
