/**
 * Config CLI command handlers.
 *
 * Handles `ultraworkers config <command>` subcommands for managing settings.
 * The settings registry (`config/registry.ts`) is the source of truth for available settings.
 */

import { APP_NAME, getAgentDir } from "@oh-my-pi/pi-utils";
import chalk from "@oh-my-pi/pi-utils/chalk";
import { orderedSettings } from "../config/all-settings";
import { type AnySetting, lookup } from "../config/registry";
import { globalLayerValue, writeGlobalSetting } from "../config/shadowing";
import { Settings, settings } from "../config/settings";
import { theme } from "@oh-my-pi/pi-tui/theme";
import { configMigrate } from "./commands/config-migrate";
import { initXdg } from "./commands/init-xdg";

// =============================================================================
// Types
// =============================================================================

export type ConfigAction = "list" | "get" | "set" | "reset" | "path" | "init-xdg" | "migrate";

export interface ConfigCommandArgs {
	action: ConfigAction;
	key?: string;
	value?: string;
	flags: {
		json?: boolean;
		/** Opt in to the destructive path. `config migrate` alone never writes. */
		apply?: boolean;
		/**
		 * Move anyway when the config root is open. Without it a live database or
		 * daemon refuses the move, because renaming it is what loses the data.
		 */
		force?: boolean;
	};
}
// =============================================================================
// Setting Filtering
// =============================================================================

type CliSettingDef = {
	setting: AnySetting;
	path: string;
	type: string;
	description: string;
	tab: string;
};

/** Printed instead of a credential value in human output only. */
const REDACTED = "********";

function toSettingDef(setting: AnySetting): CliSettingDef {
	const ui = setting.ui;
	return {
		setting,
		path: setting.id,
		type: setting.type,
		description: ui?.description ?? "",
		tab: ui?.tab ?? "internal",
	};
}

/** Find setting definition by path */
function findSettingDef(path: string): CliSettingDef | undefined {
	const setting = lookup(path);
	return setting ? toSettingDef(setting) : undefined;
}

// =============================================================================
// Argument Parser
// =============================================================================

const VALID_ACTIONS: ConfigAction[] = ["list", "get", "set", "reset", "path", "init-xdg", "migrate"];

/**
 * Parse config subcommand arguments.
 * Returns undefined if not a config command.
 */
export function parseConfigArgs(args: string[]): ConfigCommandArgs | undefined {
	if (args.length === 0 || args[0] !== "config") {
		return undefined;
	}

	if (args.length < 2 || args[1] === "--help" || args[1] === "-h") {
		return { action: "list", flags: {} };
	}

	const action = args[1];
	if (!VALID_ACTIONS.includes(action as ConfigAction)) {
		console.error(chalk.red(`Unknown config command: ${action}`));
		console.error(`Valid commands: ${VALID_ACTIONS.join(", ")}`);
		process.exit(1);
	}

	const result: ConfigCommandArgs = {
		action: action as ConfigAction,
		flags: {},
	};

	const positionalArgs: string[] = [];
	for (let i = 2; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--json") {
			result.flags.json = true;
		} else if (arg === "--apply") {
			result.flags.apply = true;
		} else if (arg === "--force") {
			result.flags.force = true;
		} else if (!arg.startsWith("-")) {
			positionalArgs.push(arg);
		}
	}

	if (positionalArgs.length > 0) {
		result.key = positionalArgs[0];
	}
	if (positionalArgs.length > 1) {
		result.value = positionalArgs.slice(1).join(" ");
	}

	return result;
}

// =============================================================================
// Value Formatting
// =============================================================================

function formatValue(value: unknown): string {
	if (value === undefined || value === null) {
		return chalk.dim("(not set)");
	}
	if (typeof value === "boolean") {
		return value ? chalk.green("true") : chalk.red("false");
	}
	if (typeof value === "number") {
		return chalk.cyan(String(value));
	}
	if (typeof value === "string") {
		return chalk.yellow(value);
	}
	if (Array.isArray(value) || typeof value === "object") {
		try {
			return chalk.yellow(JSON.stringify(value));
		} catch {
			return chalk.yellow(String(value));
		}
	}
	return chalk.yellow(String(value));
}

function getTypeDisplay(def: CliSettingDef): string {
	const values = def.setting.enumValues;
	if (values && values.length > 0) {
		return `(${values.join("|")})`;
	}
	switch (def.type) {
		case "boolean":
			return "(boolean)";
		case "number":
			return "(number)";
		case "array":
			return "(array)";
		case "record":
			return "(record)";
		default:
			return "(string)";
	}
}

// =============================================================================
// Command Handlers
// =============================================================================

export async function runConfigCommand(cmd: ConfigCommandArgs): Promise<void> {
	await Settings.init();

	switch (cmd.action) {
		case "list":
			await handleList(cmd.flags);
			break;
		case "get":
			handleGet(cmd.key, cmd.flags);
			break;
		case "set":
			await handleSet(cmd.key, cmd.value, cmd.flags);
			break;
		case "reset":
			await handleReset(cmd.key, cmd.flags);
			break;
		case "path":
			handlePath();
			break;
		case "init-xdg":
			await initXdg();
			break;
		case "migrate":
			await configMigrate(cmd.flags.apply === true, cmd.flags.force === true);
			break;
	}
}

async function writeStdout(text: string): Promise<void> {
	const pending = Promise.withResolvers<void>();
	process.stdout.write(text, error => {
		if (error) {
			pending.reject(error);
			return;
		}
		pending.resolve();
	});
	await pending.promise;
}

async function handleList(flags: { json?: boolean }): Promise<void> {
	const defs = orderedSettings().map(toSettingDef);

	if (flags.json) {
		// A redacted entry omits `value` and says so, rather than substituting a
		// placeholder string: a consumer cannot tell a stand-in from a real value
		// and could write it back as the credential.
		//
		// Redaction is driven by the value, not by classification alone. Marking an
		// unset credential as redacted would report every fresh install as having
		// one configured, which leaks the opposite of what redaction is for. A
		// configured "" renders as unset, like in the settings panel (credentials
		// are all strings).
		const result: Record<string, { value?: unknown; redacted?: true; type: string; description: string }> = {};
		for (const def of defs) {
			const value = def.setting.get(settings);
			result[def.path] =
				def.setting.isCredential && value
					? { redacted: true, type: def.type, description: def.description }
					: { value, type: def.type, description: def.description };
		}
		await writeStdout(`${JSON.stringify(result, null, 2)}\n`);
		return;
	}

	console.log(chalk.bold("Settings:\n"));

	const groups: Record<string, CliSettingDef[]> = {};
	for (const def of defs) {
		if (!groups[def.tab]) {
			groups[def.tab] = [];
		}
		groups[def.tab].push(def);
	}

	const sortedGroups = Object.keys(groups).sort((a, b) => {
		if (a === "config") return -1;
		if (b === "config") return 1;
		return a.localeCompare(b);
	});

	for (const group of sortedGroups) {
		console.log(chalk.bold.blue(`[${group}]`));
		for (const def of groups[group]) {
			// `list` dumps every value without anyone asking for a specific
			// credential, so redact here. `get <path>` stays an explicit
			// single-value request and is left alone. An unset or cleared ("")
			// credential keeps its ordinary rendering: masking it would imply one
			// is configured.
			const value = def.setting.get(settings);
			const valueStr = def.setting.isCredential && value ? REDACTED : formatValue(value);
			const typeStr = getTypeDisplay(def);
			console.log(`  ${chalk.white(def.path)} = ${valueStr} ${chalk.dim(typeStr)}`);
		}
		console.log("");
	}
}

function handleGet(key: string | undefined, flags: { json?: boolean }): void {
	if (!key) {
		console.error(chalk.red(`Usage: ${APP_NAME} config get <key>`));
		console.error(chalk.dim(`\nRun '${APP_NAME} config list' to see available keys`));
		process.exit(1);
	}

	const def = findSettingDef(key);
	if (!def) {
		console.error(chalk.red(`Unknown setting: ${key}`));
		console.error(chalk.dim(`\nRun '${APP_NAME} config list' to see available keys`));
		process.exit(1);
	}

	const value = def.setting.get(settings);

	if (flags.json) {
		console.log(JSON.stringify({ key: def.path, value, type: def.type, description: def.description }, null, 2));
		return;
	}

	console.log(formatValue(value));
}

async function handleSet(key: string | undefined, value: string | undefined, flags: { json?: boolean }): Promise<void> {
	if (!key || value === undefined) {
		console.error(chalk.red(`Usage: ${APP_NAME} config set <key> <value>`));
		console.error(chalk.dim(`\nRun '${APP_NAME} config list' to see available keys`));
		process.exit(1);
	}

	const def = findSettingDef(key);
	if (!def) {
		console.error(chalk.red(`Unknown setting: ${key}`));
		console.error(chalk.dim(`\nRun '${APP_NAME} config list' to see available keys`));
		process.exit(1);
	}

	// Validate before write, and report the value that is in force. Parsing sits
	// inside the `try` because it is what rejects a value the definition will not
	// accept: an invalid entry must fail here, with the reason, and never reach
	// `config.yml`. The shared latch in `shadowing.ts` then asks who won, under the
	// CLI's own policy of `keep` — someone running `ultraworkers config set` may be
	// configuring a checkout where the layer that shadows the value here does not
	// exist, so discarding their edit would destroy something they meant to keep.
	// The write stays on disk and the shadowing is reported, which is what makes
	// the value observable rather than silently ineffective. Detection and wording
	// come from `shadowing.ts`, so this surface and the settings panel cannot
	// disagree about *why* a value is not in force.
	try {
		const outcome = writeGlobalSetting(def.setting, settings, def.setting.parse(value), "keep");
		await settings.flush();

		const saved = globalLayerValue(def.setting, settings);
		if (flags.json) {
			console.log(
				JSON.stringify({ key: def.path, value: saved, ...(outcome.status === "shadowed" ? outcome.json : {}) }),
			);
			return;
		}
		console.log(chalk.green(`${theme.status.success} Set ${def.path} = ${formatValue(saved)}`));
		if (outcome.status === "shadowed") console.log(chalk.yellow(`${theme.status.warning} ${outcome.message}`));
	} catch (err) {
		console.error(chalk.red(String(err)));
		process.exit(1);
	}
}

async function handleReset(key: string | undefined, flags: { json?: boolean }): Promise<void> {
	if (!key) {
		console.error(chalk.red(`Usage: ${APP_NAME} config reset <key>`));
		console.error(chalk.dim(`\nRun '${APP_NAME} config list' to see available keys`));
		process.exit(1);
	}

	const def = findSettingDef(key);
	if (!def) {
		console.error(chalk.red(`Unknown setting: ${key}`));
		console.error(chalk.dim(`\nRun '${APP_NAME} config list' to see available keys`));
		process.exit(1);
	}

	try {
		// Remove the key rather than writing the default, so later default changes still apply.
		def.setting.unset(settings);
		await settings.flush();
	} catch (err) {
		console.error(chalk.red(String(err)));
		process.exit(1);
	}

	// The effective value may now come from another layer or the environment: never echo a credential.
	const value = def.setting.get(settings);
	const redacted = def.setting.isCredential && !!value;
	if (flags.json) {
		console.log(JSON.stringify(redacted ? { key: def.path, redacted: true } : { key: def.path, value }));
	} else {
		console.log(
			chalk.green(`${theme.status.success} Reset ${def.path} to ${redacted ? REDACTED : formatValue(value)}`),
		);
	}
}

function handlePath(): void {
	console.log(getAgentDir());
}

// =============================================================================
// Help
// =============================================================================

export function printConfigHelp(): void {
	console.log(`${chalk.bold(`${APP_NAME} config`)} - Manage settings

${chalk.bold("Commands:")}
  list               List all settings with current values
  get <key>          Get a specific setting value
  set <key> <value>  Set a setting value
  reset <key>        Remove a setting from config.yml so its default applies
  path               Print the config directory path
  init-xdg           Initialize XDG Base Directory structure
  migrate            Move the config root to its new name (dry run; --apply to move)

${chalk.bold("Options:")}
  --json             Output as JSON
  --apply           Actually move directories (config migrate only)
  --force           Move even when a database or daemon is still using the root

${chalk.bold("Examples:")}
  ${APP_NAME} config list
  ${APP_NAME} config get theme
  ${APP_NAME} config set theme catppuccin-mocha
  ${APP_NAME} config set compaction.enabled false
  ${APP_NAME} config set defaultThinkingLevel medium
  ${APP_NAME} config reset steeringMode
  ${APP_NAME} config list --json
  ${APP_NAME} config init-xdg
  ${APP_NAME} config migrate
  ${APP_NAME} config migrate --apply

${chalk.bold("Boolean Values:")}
  true, false, yes, no, on, off, 1, 0
`);
}
