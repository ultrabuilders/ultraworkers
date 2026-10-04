/**
 * `ModelRegistry`'s registered-provider accessors — the seam `pi`'s `ModelRuntime`
 * offers as `getRegisteredProviderConfig` / `getRegisteredProviderIds` /
 * `getRegisteredNativeProvider`.
 *
 * The failure these pin is not cosmetic. An extension that registered a provider asks
 * the registry what it registered, to reconcile its own record against reality after
 * another extension has loaded: the two can disagree, because ownership moves on
 * re-registration. A method that answers from a stale record makes the extension act on
 * a provider that is no longer its own — and `unregisterProvider` would then remove the
 * NEW owner's registration. That is the failure this tree already documents at
 * `providerSource`.
 *
 * So the assertions here are about *staleness*, not about the happy path. A test that
 * only checked "the config comes back" would survive the bug that matters: it would pass
 * against an implementation that remembers a provider after it is unregistered.
 *
 * Measured, because it decides what these rows can and cannot promise: removing the
 * cleanup on its own leaves every row GREEN, and removing the accessor's ownership check
 * on its own does too. A stale config is only observable when BOTH are gone, and then two
 * rows go red. That is the honest bound — the ownership guard is load-bearing, and it is
 * what makes a missed cleanup unreachable rather than observable-and-fixed. Do not read
 * the green rows below as independent proof that each guard is individually required.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { TempDir } from "@oh-my-pi/pi-utils";
import { createInMemoryAuthStorage } from "./helpers/agent-session-setup";

function makeRegistry(dir: string): ModelRegistry {
	return new ModelRegistry(createInMemoryAuthStorage(), path.join(dir, "models.yml"));
}

// `baseUrl` alone is a valid registration — the shape existing tests use. The config
// does not need a model roster to be retained and read back, and omitting one keeps
// this test on the accessor rather than on model validation.
const PROBE = {
	api: "probe-api",
	baseUrl: "https://probe.invalid/v1",
	apiKey: "probe-key",
};

describe("ModelRegistry registered-provider accessors", () => {
	test("reports a provider an extension registered, with the config it was handed", () => {
		using tempDir = TempDir.createSync("@registry-registered-");
		const registry = makeRegistry(tempDir.path());

		registry.registerProvider("probe-provider", PROBE, "ext-a");

		// The config is returned by identity of CONTENT, not of object: a caller
		// reconciles against fields (baseUrl, api), and a defensive copy that dropped
		// one would compare unequal for a reason the caller cannot see.
		const config = registry.getRegisteredProviderConfig("probe-provider");
		expect(config?.baseUrl).toBe("https://probe.invalid/v1");
		expect(config?.apiKey).toBe("probe-key");
		expect(registry.hasRegisteredProvider("probe-provider")).toBe(true);
		expect(registry.getRegisteredProviderIds()).toContain("probe-provider");
	});

	test("a provider nobody registered is absent, not an empty shell", () => {
		using tempDir = TempDir.createSync("@registry-registered-");
		const registry = makeRegistry(tempDir.path());

		// `anthropic` is a catalogue provider, not a registered one. These accessors
		// answer about EXTENSION registrations, so a shipped provider must not appear
		// here — otherwise an extension concludes it owns a provider it never created,
		// and unregisters it on the way out.
		expect(registry.hasRegisteredProvider("anthropic")).toBe(false);
		expect(registry.getRegisteredProviderConfig("anthropic")).toBeUndefined();
		expect(registry.getRegisteredProviderIds()).not.toContain("anthropic");
	});

	test("forgets a provider once it is unregistered", () => {
		using tempDir = TempDir.createSync("@registry-registered-");
		const registry = makeRegistry(tempDir.path());

		registry.registerProvider("probe-provider", PROBE, "ext-a");
		expect(registry.hasRegisteredProvider("probe-provider")).toBe(true);

		registry.unregisterProvider("probe-provider");

		// This is the row that fails if the config outlives the registration.
		expect(registry.hasRegisteredProvider("probe-provider")).toBe(false);
		expect(registry.getRegisteredProviderIds()).not.toContain("probe-provider");
		expect(registry.getRegisteredProviderConfig("probe-provider")).toBeUndefined();
	});

	test("the config map tracks ownership moves, so a stale read is observable", () => {
		using tempDir = TempDir.createSync("@registry-registered-");
		const registry = makeRegistry(tempDir.path());

		// Two registrations of the same id, with a DIFFERENT baseUrl each time. If the
		// config were stored once and never replaced, the read-back after the handoff
		// would still report the first extension's host — and this is precisely the
		// stale-record scenario `providerSource` exists to warn about. Asserting the
		// value CHANGED is what a first-write-wins or never-cleared map cannot survive.
		registry.registerProvider("probe-provider", PROBE, "ext-a");
		const first = registry.getRegisteredProviderConfig("probe-provider")?.baseUrl;
		expect(first).toBe("https://probe.invalid/v1");

		registry.registerProvider("probe-provider", { ...PROBE, baseUrl: "https://second.invalid" }, "ext-b");

		// Still registered, same id — only the config can distinguish these states.
		expect(registry.hasRegisteredProvider("probe-provider")).toBe(true);
		expect(registry.getRegisteredProviderConfig("probe-provider")?.baseUrl).toBe("https://second.invalid");
		expect(registry.getRegisteredProviderConfig("probe-provider")?.baseUrl).not.toBe(first);
	});

	test("forgets every provider an extension owned when that extension goes away", () => {
		using tempDir = TempDir.createSync("@registry-registered-");
		const registry = makeRegistry(tempDir.path());

		registry.registerProvider("probe-a", PROBE, "ext-a");
		registry.registerProvider("probe-b", PROBE, "ext-a");
		registry.registerProvider("other-c", PROBE, "ext-b");
		expect(registry.getRegisteredProviderIds()).toHaveLength(3);

		registry.clearSourceRegistrations("ext-a");

		// Clearing one extension's registrations must not take another's with it. The
		// ids, the provenance check and the config all have to agree afterwards, or an
		// extension reload quietly unregisters a provider another one still owns.
		expect(registry.getRegisteredProviderIds()).toEqual(["other-c"]);
		expect(registry.hasRegisteredProvider("probe-a")).toBe(false);
		expect(registry.getRegisteredProviderConfig("probe-b")).toBeUndefined();
		expect(registry.getRegisteredProviderConfig("other-c")).toBeDefined();
	});

	test("a re-registration hands the provider to the new owner, config included", () => {
		using tempDir = TempDir.createSync("@registry-registered-");
		const registry = makeRegistry(tempDir.path());

		registry.registerProvider("probe-provider", PROBE, "ext-a");
		registry.registerProvider("probe-provider", { ...PROBE, baseUrl: "https://second.invalid" }, "ext-b");

		// Ownership moved. Reading back the FIRST config would tell the old owner its
		// baseUrl is still live while the second extension is serving traffic from
		// another host — so the map must be replaced, not merged or first-write-wins.
		expect(registry.getRegisteredProviderConfig("probe-provider")?.baseUrl).toBe("https://second.invalid");
		expect(registry.providerSource("probe-provider")).toBe("ext-b");
	});
});
