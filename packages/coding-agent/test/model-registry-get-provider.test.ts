/**
 * `ModelRegistry.getProvider` — the seam an extension reaches a provider through.
 *
 * The failure this pins is a `TypeError` thrown inside third-party extension code
 * that this repo does not own. `pi-background-tasks` calls
 * `registry.getProvider(...)`; with no such method the call fails as
 * `registry.getProvider is not a function` before any of its own logic runs, and
 * an extension cannot catch its way out of it — the registry it is handed is this
 * class, so the missing method is not something the extension can supply.
 *
 * Every row therefore distinguishes "the method is absent" from "the method is
 * present and answered": a missing method raises, so a test that only asserted a
 * truthy result would not survive its own deletion, and one that only asserted
 * `undefined` would pass on a registry that answers nothing at all.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { TempDir } from "@oh-my-pi/pi-utils";
import { createInMemoryAuthStorage } from "./helpers/agent-session-setup";

function makeRegistry(dir: string): ModelRegistry {
	return new ModelRegistry(createInMemoryAuthStorage(), path.join(dir, "models.yml"));
}

describe("ModelRegistry.getProvider", () => {
	test("resolves a provider the catalogue ships, with its id and display name intact", () => {
		using tempDir = TempDir.createSync("@registry-get-provider-");
		const registry = makeRegistry(tempDir.path());

		const definition = registry.getProvider("anthropic");

		expect(definition).toBeDefined();
		// Echoing the id back is what lets a caller key a map on what it asked for
		// rather than on a second lookup that could disagree.
		expect(definition?.id).toBe("anthropic");
		expect(definition?.name).toBe("Anthropic (Claude Pro/Max)");
	});

	test("answers undefined for an id the catalogue does not ship, rather than throwing", () => {
		using tempDir = TempDir.createSync("@registry-get-provider-");
		const registry = makeRegistry(tempDir.path());

		// An extension probing for an optional provider must be able to branch on
		// "not available". A throw here would take down the caller instead, and the
		// call site is in code this repo does not control.
		expect(registry.getProvider("not-a-real-provider")).toBeUndefined();
	});

	test("the answer does not depend on a models.yml having been written", () => {
		using tempDir = TempDir.createSync("@registry-get-provider-");
		const registry = makeRegistry(tempDir.path());

		// The descriptor comes from the compiled catalogue, not from discovered
		// models. A registry that had never synced — the state every fresh install
		// is in, and the state `omp usage` builds one in deliberately — still has to
		// answer, or the seam works only after a network round-trip it has no
		// business requiring.
		expect(fs.existsSync(path.join(tempDir.path(), "models.yml"))).toBe(false);
		expect(registry.getProvider("openai")?.id).toBe("openai");
	});
});

describe("ModelRegistry.getProviderDisplayName", () => {
	test("returns the catalogue's name for a known provider", () => {
		using tempDir = TempDir.createSync("@registry-display-name-");
		const registry = makeRegistry(tempDir.path());

		expect(registry.getProviderDisplayName("google")).toBe("Google Gemini");
	});

	test("falls back to the id for an unknown provider, so the column is never blank", () => {
		using tempDir = TempDir.createSync("@registry-display-name-");
		const registry = makeRegistry(tempDir.path());

		// A provider this build does not ship still has to render somewhere. An
		// empty string is the worst of the three answers: it hides which provider
		// was being asked about, in exactly the place a user would go looking.
		expect(registry.getProviderDisplayName("not-a-real-provider")).toBe("not-a-real-provider");
	});
});
