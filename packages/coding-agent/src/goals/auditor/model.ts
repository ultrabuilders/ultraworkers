import type { Api, Model } from "@oh-my-pi/pi-ai";

/**
 * epic-fj9g (P2) — which model the completion auditor runs on.
 *
 * Ported from `pi-goal-x` v0.32.3, `resolveAuditorModel()` at
 * `extensions/goal-auditor.ts:250-281` (MIT © 2026 Lucas).
 *
 * The reference takes `(ctx: ExtensionContext, config)` and reads `ctx.modelRegistry` and
 * `ctx.model`. Ours takes the two values separately so the resolver stays a pure function
 * of its arguments and can be exercised without a session.
 */

/**
 * The registry surface this module needs. `config/model-registry.ts` `ModelRegistry`
 * satisfies it structurally — this interface exists so a test can pass a stub instead of
 * materialising the bundled catalog.
 *
 * `getAvailable()` is declared with no parameters because the registry's own
 * `kind: ModelKind | "all"` parameter is optional; a wider signature still satisfies it.
 */
export interface AuditorModelRegistry {
	find(provider: string, modelId: string): Model<Api> | undefined;
	getAvailable(): Model<Api>[];
}

/** The user-owned auditor model configuration, mirroring `GoalSettings`' model fields. */
export interface AuditorModelConfig {
	provider?: string | undefined;
	model?: string | undefined;
}

/**
 * A resolution is either a model or a refusal — never neither, and never a silent
 * substitute. A discriminated union rather than the reference's `{ model?, error? }`
 * so that "resolved to undefined with no error" is unrepresentable.
 */
export type AuditorModelResolution = { ok: true; model: Model<Api> } | { ok: false; error: string };

/**
 * Resolve the auditor's model from an explicit configuration, falling back to the
 * session's own model when the user configured nothing.
 *
 * Every failure is a refusal with a reason. In particular a **provider-only**
 * configuration is refused outright: silently picking the first model a provider offers
 * hides a misconfiguration, and — worse for this feature — it could land the auditor on
 * the same model family that wrote the code, which is the review this exists to avoid.
 */
export function resolveAuditorModel(args: {
	config: AuditorModelConfig;
	/** The session's current model, used when the user configured nothing. */
	sessionModel: Model<Api>;
	registry: AuditorModelRegistry;
}): AuditorModelResolution {
	const { config, sessionModel, registry } = args;
	const { provider, model: modelId } = config;

	if (!provider && !modelId) return { ok: true, model: sessionModel };

	if (provider && modelId) {
		const model = registry.find(provider, modelId);
		return model
			? { ok: true, model }
			: { ok: false, error: `Configured auditor model not found: ${provider}/${modelId}` };
	}

	if (provider) {
		// Refuse provider-only config: silently picking the first available model
		// hides misconfiguration. An explicit provider/model is required.
		return {
			ok: false,
			error: `Provider-only auditor configuration is refused; select an explicit model for provider: ${provider}`,
		};
	}

	const requested = modelId as string;
	const slash = requested.indexOf("/");
	if (slash > 0) {
		const qualifiedProvider = requested.slice(0, slash);
		const qualifiedModel = requested.slice(slash + 1);
		const model = registry.find(qualifiedProvider, qualifiedModel);
		return model
			? { ok: true, model }
			: { ok: false, error: `Configured auditor model not found: ${requested}` };
	}

	// Equality against the user's own configured string — a lookup of what the user
	// named, not policy branched on model identity, which AGENTS.md forbids.
	const matches = registry
		.getAvailable()
		.filter((candidate) => candidate.id === requested || candidate.name === requested);
	return matches.length === 1
		? { ok: true, model: matches[0] }
		: { ok: false, error: `Configured auditor model is ambiguous or unavailable: ${requested}` };
}