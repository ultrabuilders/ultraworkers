/**
 * Which layer supplies a setting's effective value, and what to tell the user
 * when the value they just saved is not the value in force.
 *
 * This is the one place that knows how to say it. `omp config set` and the
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
export function shadowingSource(
	setting: AnySetting,
	scope: Settings,
):
	| { source: Exclude<SettingProvenance, "global" | "default">; json: Record<string, string>; message: string }
	| undefined {
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
