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
 * Fold one id or key segment to the shape used inside a plugin setting id.
 *
 * `my-plugin` → `my_plugin`, `autoContext.enabled` → `auto_context_enabled`. Camel-case
 * boundaries become `_`, every run of other non-alphanumerics becomes a single `_`, and
 * there is no leading or trailing `_` — the last part matters because `plugins..key` and
 * `plugins.key` must not both be reachable.
 *
 * The camel-case rule is not cosmetic. Lowercasing alone maps both `autoContext` and
 * `autocontext` to `autocontext`, so two keys a plugin author considers distinct would
 * silently become one — the exact collision the reserved root exists to make impossible.
 * Folding keeps them apart, at the cost of treating `autoContext` and `auto-context` as
 * one name, which is the trade the other way.
 *
 * The spec's own sketch (`.lavish-wip/m2-specs/WI-8a.spec.json`) lowercases without folding
 * and so contradicts the mapping in its own docblock; this follows the docblock.
 *
 * An empty result is a real case, not a guard against a hypothetical: a key made only of
 * punctuation folds to `""`. Callers that build an id must decide what that means rather
 * than emit `plugins..`.
 */
export function sanitizePluginSegment(raw: string): string {
	return raw
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

/**
 * The registry id for a plugin-owned setting: `plugins.<plugin>.<key>`.
 *
 * Both segments are sanitized, so a plugin named `my-plugin` and one named `my_plugin`
 * resolve to the same id. That is deliberate — it is the same collision the reserved
 * root exists to surface, and folding them is better than letting two spellings of one
 * plugin own two sets of keys.
 */
export function pluginSettingId(pluginId: string, key: string): string {
	return `${PLUGIN_SETTINGS_ROOT}.${sanitizePluginSegment(pluginId)}.${sanitizePluginSegment(key)}`;
}
