/**
 * Which layer supplies a setting's effective value, and what to tell the user
 * when the value they just saved is not the value in force.
 *
 * This is the one place that knows how to say it. `ultraworkers config set` and the
 * settings panel both route through here, so the CLI and the UI cannot describe
 * the same shadowing differently — the messages are released strings, and two
 * copies of them would drift.
 *
 * Both functions take the settings scope explicitly rather than closing over
 * the module singleton: the settings host holds its own instance, and a
 * closed-over proxy would silently report the wrong scope's layers.
 */

import type { AnySetting } from "./registry";
import { type SettingProvenance, type Settings } from "./settings";

export type { SettingProvenance };

/** The layers that can supply a value other than the global config or the default. */
export type ShadowSource = Exclude<SettingProvenance, "global" | "default">;

/**
 * Which layer supplies the effective value when it is not the global config (or
 * the default), if anywhere.
 */
export interface ShadowingSource {
	readonly source: ShadowSource;
	readonly json: Record<string, string>;
	readonly message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Value `setting` holds in the global config layer — what `config set` wrote. */
export function globalLayerValue(setting: AnySetting, scope: Settings): unknown {
	let value: unknown = scope.getGlobalSettings();
	for (const segment of setting.segments) value = isRecord(value) ? value[segment] : undefined;
	return value;
}

/** Where the effective value comes from when it is not the global config (or the default), if anywhere. */
export function shadowingSource(setting: AnySetting, scope: Settings): ShadowingSource | undefined {
	const provenance = setting.provenance(scope);
	switch (provenance) {
		case "global":
		case "default":
			return undefined;
		case "env": {
			const name = setting.envName;
			if (!name) return undefined;
			return setting.envFallback
				? {
						source: "env",
						json: { fallbackEnv: name },
						message: `$${name} is used as a fallback while the saved value is blank.`,
					}
				: {
						source: "env",
						json: { overriddenBy: name },
						message: `$${name} overrides this value; unset it for the saved value to apply.`,
					};
		}
		case "project":
			return {
				source: "project",
				json: { overriddenBy: provenance },
				message: "Project settings override this value here; edit or remove it there for the saved value to apply.",
			};
		case "overlay":
			return {
				source: "overlay",
				json: { overriddenBy: provenance },
				message: "A --config / PI_CONFIG_FILES overlay overrides this value for this process.",
			};
		case "runtime":
			return {
				source: "runtime",
				json: { overriddenBy: provenance },
				message: "A runtime override supplies the effective value for this process.",
			};
	}
}

/**
 * What happened to a value written to the global config layer.
 *
 * `written` is separate from `status` because the two facts are independent and
 * the surfaces disagree on the second one. A `shadowed` write is one a higher
 * layer overrode; whether the saved value was then put back is a *policy*, and
 * the two surfaces answer it differently. Collapsing them would have one of them
 * report a rollback that did not happen.
 */
export type SettingWriteOutcome =
	| { readonly status: "applied" }
	| {
			readonly status: "shadowed";
			readonly source: ShadowSource;
			/**
			 * Machine-readable form of the same fact, for `ultraworkers config set --json`.
			 * Carried rather than recomputed: a second `shadowingSource` call at
			 * the callsite is the fork this module exists to prevent, and the JSON
			 * shape is a wire contract a consumer may already parse.
			 */
			readonly json: Record<string, string>;
			readonly message: string;
			readonly written: "reverted" | "kept";
	  };

/**
 * Whether a shadowed write is put back.
 *
 * - `revert` — the saved value takes effect immediately, or not at all. A user
 *   who edits a value in a live session wants the edit they made to be the edit
 *   that applies, and a value that silently does not apply is the confusing
 *   case: the file shows it, the behaviour does not.
 * - `keep` — the write stands and the shadowing is reported instead. A user
 *   writing `config.yml` from a shell may be configuring a *different* checkout
 *   where the layer that shadows it here does not exist, so discarding their
 *   edit would destroy something they meant to keep.
 *
 * The policy is a parameter rather than a fixed behaviour because both answers
 * are defensible and only the calling surface knows which user it is serving.
 * What is not a parameter is the detection and the wording: those are shared, so
 * the panel and the CLI cannot disagree about *why* a value is not in force.
 */
export type ShadowedWritePolicy = "revert" | "keep";

/**
 * Write a value to the global config layer and report whether it is in force.
 *
 * **The post-write latch.** A layer above global can supply the effective value,
 * in which case a value saved to global is written, reported as saved, and then
 * never takes effect. So: remember what was there, write, then ask who actually
 * won. Reading the value back *after* normalization is what makes the answer
 * right — a normalization pass alone can change the value, and asking before the
 * write would miss that entirely.
 *
 * A higher layer holding the very same value is not shadowing: the outcome is
 * identical either way, so the write stands and no rollback runs.
 *
 * On `revert`, restoring puts back exactly what was there — an absent value is
 * unset rather than written as `null`, which is a different thing to find in a
 * config file later.
 */
export function writeGlobalSetting(
	setting: AnySetting,
	scope: Settings,
	value: unknown,
	policy: ShadowedWritePolicy,
): SettingWriteOutcome {
	const previous = globalLayerValue(setting, scope);
	setting.set(scope, value);

	const written = globalLayerValue(setting, scope);
	const effective = setting.get(scope);
	const shadow = shadowingSource(setting, scope);

	if (!shadow || Bun.deepEquals(effective, written)) return { status: "applied" };

	if (policy === "keep") {
		return { status: "shadowed", source: shadow.source, json: shadow.json, message: shadow.message, written: "kept" };
	}

	if (previous === undefined) setting.unset(scope);
	else setting.set(scope, previous);
	return {
		status: "shadowed",
		source: shadow.source,
		json: shadow.json,
		message: shadow.message,
		written: "reverted",
	};
}
