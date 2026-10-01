/**
 * Attribution of a capability provider to the extension source that registered it.
 *
 * What a consumer observes if this breaks: a suspended extension's provider stays
 * in the capability set. `getCapabilityInfo(id).providers` is the RESOLVED list
 * that discovery and the settings UI read, so every assertion here is on that
 * list. Asserting on the internal attribution maps instead would stay green
 * while the resolved list still showed a dead extension's provider — which is
 * the entire failure mode this file exists to catch.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import {
	defineCapability,
	getCapability,
	getCapabilityInfo,
	registerProvider,
	resetRegistry,
	unregisterProvidersForSource,
} from "@oh-my-pi/pi-coding-agent/capability";
import { toolCapability } from "@oh-my-pi/pi-coding-agent/capability/tool";
import type { Provider } from "@oh-my-pi/pi-coding-agent/capability/types";

/** A provider that loads nothing: these rows are about attribution, not resolution. */
function provider(id: string): Provider<never> {
	return {
		id,
		displayName: id,
		description: `test provider ${id}`,
		priority: 50,
		load: () => Promise.resolve({ items: [] }),
	};
}

/** Provider ids as the settings UI and discovery see them, never the internal maps. */
function resolvedIds(): string[] {
	return (getCapabilityInfo(toolCapability.id)?.providers ?? []).map(p => p.id);
}

describe("capability provider source attribution", () => {
	// ORDER IS LOAD-BADEN. The last row calls `resetRegistry()`, which clears the
	// module-level definition map for the life of the process — ESM evaluates each
	// module once, so a capability cannot be defined again afterwards. Running it
	// first would leave the rows above asserting against an empty registry and
	// passing for the wrong reason.

	// `toolCapability` is defined by a module-level `defineCapability` that ran at
	// import — but `reset-contract.test.ts` calls `resetRegistry()`, and bun shares
	// module state across test files in one process. Measured: running this file
	// alone gives 3 pass; running it with that one gives 3 fail with an empty
	// provider list, because the definition was already wiped. So re-establish it
	// rather than assume it survived another file's teardown.
	beforeAll(() => {
		if (getCapability(toolCapability.id)) return;
		defineCapability({
			id: toolCapability.id,
			key: toolCapability.key,
			displayName: toolCapability.displayName,
			description: toolCapability.description,
		});
	});

	test("a source's provider leaves the resolved list when that source is torn down", () => {
		registerProvider(toolCapability.id, provider("attrib-a"), "/ext/a");
		expect(resolvedIds()).toContain("attrib-a");

		unregisterProvidersForSource("/ext/a");

		// The observable a user would see: the extension is gone from disk and
		// disabled, and its provider must not still be offered in the capability.
		expect(resolvedIds()).not.toContain("attrib-a");
	});

	test("tearing down one source leaves a provider the other source has taken over", () => {
		// Same provider id from two sources: `/ext/c` claims it, so ownership moves
		// and `/ext/b` is left holding a stale record of a name it no longer owns.
		//
		// SCOPE, stated honestly: this row pins the observable consequence of the
		// handoff — after ownership moves, tearing down the previous source leaves the
		// provider standing. It does NOT uniquely pin the `!== sourceId` guard inside
		// `unregisterProvidersForSource`, and the plan's spec believed that it did.
		// Measured: deleting the guard leaves this file green, because the handoff in
		// `registerProvider` already removed the id from the old source's set, so the
		// teardown finds an empty map and returns before the guard is reached. The two
		// are redundant — either alone is sufficient. The guard is kept anyway: the
		// failure it prevents is a live extension silently losing a provider, and a
		// redundant check on a destructive path is cheap. What is NOT claimed is a test
		// that proves it necessary.
		registerProvider(toolCapability.id, provider("attrib-shared"), "/ext/b");
		registerProvider(toolCapability.id, provider("attrib-shared"), "/ext/c");
		expect(resolvedIds()).toContain("attrib-shared");

		unregisterProvidersForSource("/ext/b");

		// `/ext/b`'s record still lists the id, but `/ext/c` owns it now. Removing it
		// would take a provider away from a live extension because an unrelated one
		// was suspended — with no error anywhere.
		expect(resolvedIds()).toContain("attrib-shared");
	});

	test("resetRegistry() drops definitions without disturbing either source's providers", () => {
		const live = getCapability(toolCapability.id);
		const before = live?.providers.map(p => p.id) ?? [];
		expect(before).toContain("attrib-shared");

		resetRegistry();

		// The definition is gone — that is the half of the contract `resetRegistry`
		// is named for.
		expect(getCapability(toolCapability.id)).toBeUndefined();
		// And the provider arrays it was holding are untouched, which is the half
		// that is easy to break by widening the clear to "everything". `attrib-shared`
		// is still registered against `/ext/c`, and nothing about the reset reached it.
		expect(live?.providers.map(p => p.id)).toEqual(before);
	});
});
