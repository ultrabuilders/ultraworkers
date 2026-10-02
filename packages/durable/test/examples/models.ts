/**
 * The `ModelLookup` the examples hand to a `Harness`.
 *
 * `pi`'s examples call `createModels()` and then `models.setProvider(provider)` to wire one
 * in. This fork has no such registry: `HarnessOptions.models` is a four-method
 * {@link ModelLookup}, so dispatch is named at the call site instead of resolved through a
 * registry that holds providers. The examples keep their shape — build a lookup, open the
 * harness — and this module is the one place that says how a lookup is built.
 *
 * The four members are the whole seam: `getModel` resolves a ref, `streamSimple` streams,
 * and `fetchDeferred`/`cancelDeferred` drive a deferred generation. A real host wires the
 * first from its own catalog and the rest to its provider; the examples use the faux double,
 * which already implements all four.
 */
import type { Model } from "@oh-my-pi/pi-catalog/types";
import type { FauxProviderHandle } from "@oh-my-pi/pi-ai/testing";
import { fauxProvider } from "@oh-my-pi/pi-ai/testing";
import type { ModelLookup } from "../../src/harness/types";

/** The provider name the examples register their model under. */
export const EXAMPLE_PROVIDER = "faux";
export const EXAMPLE_MODEL_ID = "faux-1";

/**
 * A lookup over the faux double.
 *
 * `getModel` stays strict on the provider name, so an example that configures a different
 * provider takes the documented `no_model` path instead of silently streaming from the faux —
 * the same seam the harness's own failure test exercises.
 */
export function exampleModels(faux: FauxProviderHandle = fauxProvider()): ModelLookup {
	return {
		getModel: (provider, modelId) => (provider === EXAMPLE_PROVIDER ? faux.getModel(modelId) : undefined),
		streamSimple: (model, requestContext, options) => faux.streamSimple(model, requestContext, options),
		fetchDeferred: (model, handle, options) => faux.fetchDeferred(model, handle, options),
		cancelDeferred: (model, handle, options) => faux.cancelDeferred(model, handle, options),
	};
}

/** The model ref the examples set on a conversation. */
export const EXAMPLE_MODEL = { provider: EXAMPLE_PROVIDER, modelId: EXAMPLE_MODEL_ID } as const satisfies {
	provider: string;
	modelId: string;
};

/** Re-exported so an example that needs to type a resolved model does not reach into pi-ai. */
export type { Model };
