/**
 * Settings declared by this domain (see `config/registry.ts`). Declaration order is the
 * settings-panel order; `config/all-settings.ts` registers every domain.
 */
import { combine, register, type SettingValueOf } from "../config/registry";
import { DEFAULT_SKILLS_URL } from "@oh-my-pi/pi-wire/skillshare";

const EMPTY_STRING_ARRAY: string[] = [];

export const cfgExtensions = register({ id: "extensions", type: "array", default: EMPTY_STRING_ARRAY });

export const cfgDisabledExtensions = register({ id: "disabledExtensions", type: "array", default: EMPTY_STRING_ARRAY });

// Skill registry (omp skill)
export const cfgSkillsRegistryUrl = register({
	id: "skills.registryUrl",
	type: "string",
	default: DEFAULT_SKILLS_URL,
	ui: {
		tab: "interaction",
		group: "Skills",
		label: "Skill Registry",
		description:
			"Skillshare registry used by `omp skill` to install, search, and publish skills (https://host[:port])",
	},
});

// Skills
export const cfgSkillsEnabled = register({ id: "skills.enabled", type: "boolean", default: true });

export const cfgSkillsEnableSkillCommands = register({
	id: "skills.enableSkillCommands",
	type: "boolean",
	default: true,
	ui: {
		tab: "tasks",
		group: "Commands & Skills",
		label: "Skill Commands",
		description: "Register skills as /skill:name commands",
	},
});

export const cfgSkillsEnableCodexUser = register({ id: "skills.enableCodexUser", type: "boolean", default: false });

export const cfgSkillsEnableClaudeUser = register({ id: "skills.enableClaudeUser", type: "boolean", default: false });

export const cfgSkillsEnableClaudeProject = register({
	id: "skills.enableClaudeProject",
	type: "boolean",
	default: true,
});

export const cfgSkillsEnablePiUser = register({ id: "skills.enablePiUser", type: "boolean", default: true });

export const cfgSkillsEnablePiProject = register({ id: "skills.enablePiProject", type: "boolean", default: true });

export const cfgSkillsEnableAgentsUser = register({ id: "skills.enableAgentsUser", type: "boolean", default: true });

export const cfgSkillsEnableAgentsProject = register({
	id: "skills.enableAgentsProject",
	type: "boolean",
	default: true,
});

export const cfgSkillsCustomDirectories = register({
	id: "skills.customDirectories",
	type: "array",
	default: EMPTY_STRING_ARRAY,
});

export const cfgSkillsIgnoredSkills = register({
	id: "skills.ignoredSkills",
	type: "array",
	default: EMPTY_STRING_ARRAY,
});

export const cfgSkillsIncludeSkills = register({
	id: "skills.includeSkills",
	type: "array",
	default: EMPTY_STRING_ARRAY,
});

/** Skill discovery options (`skills.*` except the `omp skill` registry URL). */
export const cfgSkills = combine({
	enabled: cfgSkillsEnabled,
	enableSkillCommands: cfgSkillsEnableSkillCommands,
	enableCodexUser: cfgSkillsEnableCodexUser,
	enableClaudeUser: cfgSkillsEnableClaudeUser,
	enableClaudeProject: cfgSkillsEnableClaudeProject,
	enablePiUser: cfgSkillsEnablePiUser,
	enablePiProject: cfgSkillsEnablePiProject,
	enableAgentsUser: cfgSkillsEnableAgentsUser,
	enableAgentsProject: cfgSkillsEnableAgentsProject,
	customDirectories: cfgSkillsCustomDirectories,
	ignoredSkills: cfgSkillsIgnoredSkills,
	includeSkills: cfgSkillsIncludeSkills,
});

/** Skill discovery options ({@link cfgSkills}); omitted fields fall back to the setting defaults. */
export type SkillsSettings = Partial<SettingValueOf<typeof cfgSkills>>;

// Commands
export const cfgCommandsEnableClaudeUser = register({
	id: "commands.enableClaudeUser",
	type: "boolean",
	default: false,
	ui: {
		tab: "tasks",
		group: "Commands & Skills",
		label: "Claude User Commands",
		description: "Load commands from ~/.claude/commands/",
	},
});

export const cfgCommandsEnableClaudeProject = register({
	id: "commands.enableClaudeProject",
	type: "boolean",
	default: true,
	ui: {
		tab: "tasks",
		group: "Commands & Skills",
		label: "Claude Project Commands",
		description: "Load commands from .claude/commands/",
	},
});

export const cfgCommandsEnableOpencodeUser = register({
	id: "commands.enableOpencodeUser",
	type: "boolean",
	default: false,
	ui: {
		tab: "tasks",
		group: "Commands & Skills",
		label: "OpenCode User Commands",
		description: "Load commands from ~/.config/opencode/commands/",
	},
});

export const cfgCommandsEnableOpencodeProject = register({
	id: "commands.enableOpencodeProject",
	type: "boolean",
	default: true,
	ui: {
		tab: "tasks",
		group: "Commands & Skills",
		label: "OpenCode Project Commands",
		description: "Load commands from .opencode/commands/",
	},
});

export const cfgExtensionHandlersToolCallTimeoutMs = register({
	id: "extensionHandlers.toolCallTimeoutMs",
	type: "number",
	default: 30_000,
	ui: {
		tab: "tools",
		group: "Extensions",
		label: "Tool Call Handler Timeout (ms)",
		description:
			"Positive finite active-work timeout for extension tool_call handlers; invalid values use 30000ms, and time awaiting OMP-owned dialogs does not count",
	},
});

// ── Plugin setting identity ─────────────────────────────────────────────────────

/**
 * Reserved root for settings an extension owns.
 *
 * The registry's `byId` map is global and flat, so today an extension may claim any id
 * it likes — including one a core setting already uses, in which case one of the two
 * silently loses. Putting extension settings under a reserved root makes the collision
 * impossible to express rather than merely unlikely, and it is the same discipline the
 * tool and command registries already follow for the same reason.
 *
 * Lives here, beside the extension settings, rather than in `config/registry.ts` so the
 * naming rule has one home. `registry.ts` holds only the bare-id rejection, which it
 * must enforce itself because it is the thing being protected.
 */
export const PLUGIN_SETTINGS_ROOT = "plugins";

/**
 * Fold a plugin id segment, matching how the marketplace already compares plugin names.
 *
 * Lowercase only — deliberately NOT the same fold as a setting key below. The marketplace
 * decides plugin identity with `nameSegmentCollisionKey` (`plugins/marketplace/types.ts:24`),
 * which is `toLowerCase()`, and a catalog may legitimately ship `myPlugin` and `my_plugin` as
 * two DIFFERENT plugins. Folding the camel case here would map both to `my_plugin` and give
 * two distinct plugins one settings namespace, so one silently overwrites the other's keys.
 *
 * The invariant this preserves: two plugin ids collide in settings if and only if the
 * marketplace already treats them as colliding. Settings may never be coarser than the layer
 * that decides what a plugin is — so nothing else is folded here either, not even the
 * separator runs the key fold collapses. A dot is legal inside a plugin name
 * (`NAME_RE` in `plugins/marketplace/types.ts` allows it), and folding `.` to `_` would
 * merge `foo.bar` with `foo_bar`: two different plugins, one settings namespace, silent
 * overwrite. `foo-bar` and `foo.bar` are NOT merged, because the marketplace does not
 * merge them either.
 *
 * The id is consequently not round-trippable: `plugins.foo.bar.enabled` does not parse
 * back into `("foo.bar", "enabled")`. Nothing parses it — the id is an opaque registry key —
 * and merging two live plugins is worse than an id that cannot be split.
 */
export function sanitizePluginIdSegment(raw: string): string {
	return raw.toLowerCase();
}

/**
 * Fold a setting key segment.
 *
 * `autoContext.enabled` → `auto_context_enabled`. The camel-case fold is not cosmetic here:
 * lowercasing alone maps both `autoContext` and `autocontext` to `autocontext`, so two keys
 * an author considers distinct would silently become one setting. Folding keeps them apart,
 * at the cost of treating `autoContext` and `auto-context` as one name.
 *
 * It has a limit worth knowing: the fold only fires at a lower-to-upper boundary, so
 * `HTTPServer` folds to `httpserver` — the same result lowercasing alone gives. Two names
 * that differ only by an internal capital run that way together.
 *
 * The spec's own sketch (`.lavish-wip/m2-specs/WI-8a.spec.json`) applies this same fold to
 * the PLUGIN segment as well. That half is not reproduced here: a setting key has no
 * upstream identity rule, so folding it merges only names its own author already treats as
 * spelling variants, whereas folding a plugin id merges two plugins the marketplace is
 * willing to install side by side. See `sanitizePluginIdSegment`.
 */
export function sanitizeSettingKeySegment(raw: string): string {
	return raw
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

/**
 * The registry id for a plugin-owned setting: `plugins.<plugin>.<key>`.
 *
 * The two segments go through different folds on purpose — see `sanitizePluginIdSegment`
 * for why a plugin id must track the marketplace's own notion of identity while a setting
 * key does not.
 */
export function pluginSettingId(pluginId: string, key: string): string {
	return `${PLUGIN_SETTINGS_ROOT}.${sanitizePluginIdSegment(pluginId)}.${sanitizeSettingKeySegment(key)}`;
}
