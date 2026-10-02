/**
 * Settings declared by this domain (see `config/registry.ts`). Declaration order is the
 * settings-panel order; `config/all-settings.ts` registers every domain.
 */
import { APP_NAME } from "@oh-my-pi/pi-utils";
import { combine, register, type SettingValueOf } from "../config/registry";
import { DEFAULT_SKILLS_URL } from "@oh-my-pi/pi-wire/skillshare";

const EMPTY_STRING_ARRAY: string[] = [];

export const cfgExtensions = register({ id: "extensions", type: "array", default: EMPTY_STRING_ARRAY });

export const cfgDisabledExtensions = register({ id: "disabledExtensions", type: "array", default: EMPTY_STRING_ARRAY });

/** The capability id an extension is disabled by. */
const EXTENSION_ID_PREFIX = "extension-module:";

/**
 * The opt-out grammar for `disabledExtensions`, as a pure predicate over a bare
 * extension name.
 *
 * Entries are processed **in order** and the last one to speak about a name wins:
 *
 *   `name`      disable exactly `name`
 *   `prefix.*`  disable every name beginning `prefix.`
 *   `*`         disable everything
 *   `-name`     re-enable — undoes an earlier entry that would have disabled it
 *
 * Ordering is the whole contract, and it is what makes a bulk opt-out negotiable:
 * `["*", "-mine"]` is how a user says "everything off except this one" without
 * having to enumerate what "everything" currently contains. So the list is scanned
 * **back to front and the first entry that matches decides** — a fold cannot
 * express this, because a negation has to punch through a wildcard that a forward
 * fold has already committed, and `["-mine", "*"]` must mean the opposite of
 * `["*", "-mine"]`.
 *
 * Previously each entry was an exact id and the whole list was a `Set`, so the
 * only expressible sets were the ones a user could enumerate — and the family
 * this grammar exists to retire is exactly the one nobody enumerates by hand.
 *
 * There is deliberately **no** list of ids that resist removal. The grammar came
 * from a host whose console delivers org policy over two built-ins, so it refuses
 * to let a repository switch those off. ultraworkers has no equivalent: extensions are the
 * user's and the project's, there is no policy channel to protect, and naming two
 * ids to protect here would be inventing a guarantee nothing in the tree provides.
 * If a managed-deployment guarantee is ever added, it belongs as an exported set
 * beside this function so the choice is reviewable rather than implicit.
 */
export function createExtensionOptOut(selectors: readonly string[]): (name: string) => boolean {
	const entries = selectors.map(selector => {
		const negated = selector.startsWith("-");
		const pattern = negated ? selector.slice(1) : selector;
		return { negated, pattern };
	});

	return (name: string): boolean => {
		const id = `${EXTENSION_ID_PREFIX}${name}`;
		for (let i = entries.length - 1; i >= 0; i--) {
			const { negated, pattern } = entries[i]!;
			const hit =
				pattern === "*" ||
				(pattern.endsWith(".*")
					? id.startsWith(`${EXTENSION_ID_PREFIX}${pattern.slice(0, -1)}`)
					: pattern === name);
			if (hit) return !negated;
		}
		return false;
	};
}

// Skill registry (ultraworkers skill)
export const cfgSkillsRegistryUrl = register({
	id: "skills.registryUrl",
	type: "string",
	default: DEFAULT_SKILLS_URL,
	ui: {
		tab: "interaction",
		group: "Skills",
		label: "Skill Registry",
		description: `Skillshare registry used by \`${APP_NAME} skill\` to install, search, and publish skills (https://host[:port])`,
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

/** Skill discovery options (`skills.*` except the `ultraworkers skill` registry URL). */
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
