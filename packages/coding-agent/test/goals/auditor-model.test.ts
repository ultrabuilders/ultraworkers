import { describe, expect, it } from "bun:test";
import type { Api, Model } from "@oh-my-pi/pi-ai";
import {
	type AuditorModelRegistry,
	resolveAuditorModel,
} from "@oh-my-pi/pi-coding-agent/goals/auditor/model";

/**
 * epic-fj9g (P2) — the auditor's model contract.
 *
 * The property under test is that resolution **never degrades silently**. Every path that
 * cannot honour the configured model returns a refusal carrying the reason, and none of
 * them falls back to the session's model — because that model is, by construction, the
 * one that wrote the code the auditor is being asked to check.
 */

function model(id: string, provider: string): Model<Api> {
	return { id, provider, name: id } as unknown as Model<Api>;
}

const sessionModel = model("author-model", "author-provider");

/** Registry stub: `find` resolves only the two pairs it was given. */
function registry(
	available: Model<Api>[],
	found: ReadonlyMap<string, Model<Api>> = new Map(),
): AuditorModelRegistry {
	return {
		find: (provider, modelId) => found.get(`${provider}/${modelId}`),
		getAvailable: () => available,
	};
}

describe("resolveAuditorModel", () => {
	it("inherits the session model when nothing is configured", () => {
		const resolution = resolveAuditorModel({
			config: {},
			sessionModel,
			registry: registry([]),
		});
		expect(resolution).toEqual({ ok: true, model: sessionModel });
	});

	it("refuses a provider-only configuration instead of picking one for you", () => {
		// The bead's row. Provider-only config is a misconfiguration, and the silent
		// fix — first model the provider offers — can land the auditor on the same
		// family that wrote the code, which is the review this feature exists to stop.
		const resolution = resolveAuditorModel({
			config: { provider: "openai" },
			sessionModel,
			registry: registry([model("gpt-x", "openai")]),
		});
		expect(resolution.ok).toBe(false);
		expect(resolution.ok === false && resolution.error).toContain("Provider-only");
	});

	it("never falls back to the session model when an unknown model is configured", () => {
		// A fallback here would make the auditor review its own author under the
		// author's own model — the exact self-review the gate exists to prevent.
		const resolution = resolveAuditorModel({
			config: { provider: "openai", model: "does-not-exist" },
			sessionModel,
			registry: registry([], new Map([["openai/real-model", model("real-model", "openai")]])),
		});
		expect(resolution.ok).toBe(false);
		expect(resolution.ok === false && resolution.error).toBe(
			"Configured auditor model not found: openai/does-not-exist",
		);
	});

	it("resolves an explicit provider and model", () => {
		const target = model("real-model", "openai");
		const resolution = resolveAuditorModel({
			config: { provider: "openai", model: "real-model" },
			sessionModel,
			registry: registry([], new Map([["openai/real-model", target]])),
		});
		expect(resolution).toEqual({ ok: true, model: target });
	});

	it("splits a provider-qualified model string", () => {
		const target = model("real-model", "anthropic");
		const resolution = resolveAuditorModel({
			config: { model: "anthropic/real-model" },
			sessionModel,
			registry: registry([], new Map([["anthropic/real-model", target]])),
		});
		expect(resolution).toEqual({ ok: true, model: target });
	});

	it("refuses a bare name that matches nothing rather than guessing", () => {
		const resolution = resolveAuditorModel({
			config: { model: "mystery" },
			sessionModel,
			registry: registry([model("other", "other-provider")]),
		});
		expect(resolution.ok).toBe(false);
		expect(resolution.ok === false && resolution.error).toBe(
			"Configured auditor model is ambiguous or unavailable: mystery",
		);
	});

	it("refuses a bare name matching several models instead of picking one", () => {
		// Two catalog entries share the name; picking either would be a coin flip that
		// decides who reviews the code.
		const resolution = resolveAuditorModel({
			config: { model: "shared" },
			sessionModel,
			registry: registry([model("shared", "p1"), model("shared", "p2")]),
		});
		expect(resolution.ok).toBe(false);
		expect(resolution.ok === false && resolution.error).toContain("ambiguous or unavailable");
	});
});