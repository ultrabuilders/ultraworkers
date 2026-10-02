/**
 * Plugin CLI command handlers.
 *
 * Handles `omp plugin <command>` subcommands for plugin lifecycle management.
 */

import * as path from "node:path";
import { APP_NAME, getPluginsNodeModules, getProjectDir } from "@oh-my-pi/pi-utils";
import chalk from "@oh-my-pi/pi-utils/chalk";
import { resolveOrDefaultProjectRegistryPath } from "../discovery/helpers";
import { type ChangeResult, PluginManager, parseSettingValue, validateSetting } from "../extensibility/plugins";
import {
	getInstalledPluginsRegistryPath,
	getMarketplacesCacheDir,
	getMarketplacesRegistryPath,
	getPluginsCacheDir,
	MarketplaceManager,
	parsePluginId,
} from "../extensibility/plugins/marketplace/index";
import { type InstalledPlugin } from "../extensibility/plugins/types";
import { formatDoctorResults, runDoctorChecks } from "../extensibility/plugins/doctor";
import { doctorPresentation } from "../extensibility/plugins/doctor-report";
import { theme } from "@oh-my-pi/pi-tui/theme";

// =============================================================================
// Types
// =============================================================================

export type PluginAction =
	| "install"
	| "uninstall"
	| "list"
	| "link"
	| "doctor"
	| "features"
	| "config"
	| "enable"
	| "disable"
	| "marketplace"
	| "discover"
	| "upgrade";

export interface PluginCommandArgs {
	action: PluginAction;
	args: string[];
	flags: {
		json?: boolean;
		fix?: boolean;
		force?: boolean;
		dryRun?: boolean;
		local?: boolean;
		enable?: string;
		disable?: string;
		set?: string;
		scope?: "user" | "project";
	};
}

// =============================================================================
// Argument Parser
// =============================================================================

/**
 * Report what a plugin-config write actually did.
 *
 * `changed: false` means the value was already in the requested state and
 * nothing was written, so announcing "Set …" there would claim a write that
 * never happened. `restart-required` is reported separately because a user
 * toggling a plugin from the shell otherwise has no way to know the running
 * session is unaffected.
 */
function reportChange(result: ChangeResult, verb: string, subject: string): void {
	if (!result.changed) {
		console.log(chalk.dim(`${subject} was already in that state — nothing written`));
		return;
	}
	console.log(chalk.green(`${theme.status.success} ${verb} ${subject}`));
	if (result.application === "restart-required") {
		console.log(chalk.dim(`Restart ${APP_NAME} for this to apply to the running session.`));
	}
}

const VALID_ACTIONS: PluginAction[] = [
	"install",
	"uninstall",
	"list",
	"link",
	"doctor",
	"features",
	"config",
	"enable",
	"disable",
	"marketplace",
	"discover",
	"upgrade",
];

/**
 * Parse plugin subcommand arguments.
 * Returns undefined if not a plugin command.
 */
export function parsePluginArgs(args: string[]): PluginCommandArgs | undefined {
	if (args.length === 0 || args[0] !== "plugin") {
		return undefined;
	}

	if (args.length < 2) {
		return { action: "list", args: [], flags: {} };
	}

	const action = args[1];
	if (!VALID_ACTIONS.includes(action as PluginAction)) {
		console.error(chalk.red(`Unknown plugin command: ${action}`));
		console.error(`Valid commands: ${VALID_ACTIONS.join(", ")}`);
		process.exit(1);
	}

	const result: PluginCommandArgs = {
		action: action as PluginAction,
		args: [],
		flags: {},
	};

	// Parse remaining arguments
	for (let i = 2; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--json") {
			result.flags.json = true;
		} else if (arg === "--fix") {
			result.flags.fix = true;
		} else if (arg === "--force") {
			result.flags.force = true;
		} else if (arg === "--dry-run") {
			result.flags.dryRun = true;
		} else if (arg === "-l" || arg === "--local") {
			result.flags.local = true;
		} else if (arg === "--enable" && i + 1 < args.length) {
			result.flags.enable = args[++i];
		} else if (arg === "--disable" && i + 1 < args.length) {
			result.flags.disable = args[++i];
		} else if (arg === "--set" && i + 1 < args.length) {
			result.flags.set = args[++i];
		} else if (arg === "--scope" && i + 1 < args.length && !args[i + 1].startsWith("-")) {
			const s = args[++i];
			if (s === "user" || s === "project") {
				result.flags.scope = s;
			} else {
				console.error(chalk.red(`Invalid --scope value: "${s}". Must be "user" or "project".`));
				process.exit(1);
			}
		} else if (arg === "--scope") {
			// --scope with no value following
			console.error(chalk.red(`--scope requires a value: "user" or "project".`));
			process.exit(1);
		} else if (!arg.startsWith("-")) {
			result.args.push(arg);
		}
	}

	return result;
}

import { classifyInstallTarget, handleMarketplaceInstall } from "./classify-install-target";

export { classifyInstallTarget } from "./classify-install-target";

// =============================================================================
// Command Handlers
// =============================================================================

/**
 * Run a plugin command.
 */
export async function runPluginCommand(cmd: PluginCommandArgs): Promise<void> {
	const manager = new PluginManager();

	switch (cmd.action) {
		case "install":
			await handleInstall(manager, cmd.args, cmd.flags);
			break;
		case "uninstall":
			await handleUninstall(manager, cmd.args, cmd.flags);
			break;
		case "list":
			await handleList(manager, cmd.flags);
			break;
		case "link":
			await handleLink(manager, cmd.args, cmd.flags);
			break;
		case "doctor":
			await handleDoctor(manager, cmd.flags);
			break;
		case "features":
			await handleFeatures(manager, cmd.args, cmd.flags);
			break;
		case "config":
			await handleConfig(manager, cmd.args, cmd.flags);
			break;
		case "enable":
			await handleEnable(manager, cmd.args, cmd.flags);
			break;
		case "disable":
			await handleDisable(manager, cmd.args, cmd.flags);
			break;
		case "marketplace":
			await handleMarketplace(cmd.args, cmd.flags);
			break;
		case "discover":
			await handleDiscover(cmd.args, cmd.flags);
			break;
		case "upgrade":
			await handleUpgrade(cmd.args, cmd.flags);
			break;
	}
}

// =============================================================================
// Marketplace Handlers
// =============================================================================

async function makeMarketplaceManager(): Promise<MarketplaceManager> {
	return new MarketplaceManager({
		marketplacesRegistryPath: getMarketplacesRegistryPath(),
		installedRegistryPath: getInstalledPluginsRegistryPath(),
		projectInstalledRegistryPath: await resolveOrDefaultProjectRegistryPath(getProjectDir()),
		marketplacesCacheDir: getMarketplacesCacheDir(),
		pluginsCacheDir: getPluginsCacheDir(),
	});
}

async function handleMarketplace(args: string[], _flags: PluginCommandArgs["flags"]): Promise<void> {
	const subcommand = args[0] ?? "list";
	const manager = await makeMarketplaceManager();

	switch (subcommand) {
		case "add": {
			const source = args[1];
			if (!source) {
				console.error(chalk.red(`Usage: ${APP_NAME} plugin marketplace add <source>`));
				process.exit(1);
			}
			try {
				await manager.addMarketplace(source);
				console.log(chalk.green(`${theme.status.success} Added marketplace: ${source}`));
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to add marketplace: ${err}`));
				process.exit(1);
			}
			break;
		}
		case "remove":
		case "rm": {
			const name = args[1];
			if (!name) {
				console.error(chalk.red(`Usage: ${APP_NAME} plugin marketplace remove <name>`));
				process.exit(1);
			}
			try {
				await manager.removeMarketplace(name);
				console.log(chalk.green(`${theme.status.success} Removed marketplace: ${name}`));
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to remove marketplace: ${err}`));
				process.exit(1);
			}
			break;
		}
		case "update": {
			try {
				const name = args[1];
				if (name) {
					await manager.updateMarketplace(name);
					console.log(chalk.green(`${theme.status.success} Updated marketplace: ${name}`));
				} else {
					const results = await manager.updateAllMarketplaces();
					console.log(chalk.green(`${theme.status.success} Updated ${results.length} marketplace(s)`));
				}
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to update marketplace: ${err}`));
				process.exit(1);
			}
			break;
		}
		default: {
			if (subcommand !== "list") {
				console.error(chalk.red(`Unknown marketplace subcommand: ${subcommand}`));
				console.error(chalk.dim("Valid subcommands: add, remove, update, list"));
				process.exit(1);
			}
			try {
				const marketplaces = await manager.listMarketplaces();
				if (marketplaces.length === 0) {
					console.log(chalk.dim("No marketplaces configured"));
					console.log(chalk.dim(`\nAdd one with: ${APP_NAME} plugin marketplace add <source>`));
					return;
				}
				console.log(chalk.bold("Configured Marketplaces:\n"));
				for (const mp of marketplaces) {
					console.log(`  ${chalk.cyan(mp.name)}  ${chalk.dim(mp.sourceUri)}`);
				}
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to list marketplaces: ${err}`));
				process.exit(1);
			}
			break;
		}
	}
}

async function handleDiscover(args: string[], _flags: PluginCommandArgs["flags"]): Promise<void> {
	const marketplace = args[0];
	const manager = await makeMarketplaceManager();
	try {
		const plugins = await manager.listAvailablePlugins(marketplace);

		if (plugins.length === 0) {
			console.log(chalk.dim(marketplace ? `No plugins found in ${marketplace}` : "No plugins available"));
			return;
		}

		console.log(chalk.bold(`Available Plugins${marketplace ? ` (${marketplace})` : ""}:\n`));
		for (const plugin of plugins) {
			console.log(`  ${chalk.cyan(plugin.name)}${plugin.version ? `@${plugin.version}` : ""}`);
			if (plugin.description) {
				console.log(chalk.dim(`    ${plugin.description}`));
			}
		}
	} catch (err) {
		console.error(chalk.red(`${theme.status.error} Failed to discover plugins: ${err}`));
		process.exit(1);
	}
}

async function handleUpgrade(args: string[], flags: PluginCommandArgs["flags"]): Promise<void> {
	const pluginId = args[0];
	// `upgrade` targets marketplace plugins, whose IDs are `name@marketplace`.
	// An npm-installed plugin (e.g. a scoped `@scope/pkg`) never parses as one,
	// so steer the user to the force-reinstall that actually upgrades it instead
	// of the bare "Expected name@marketplace" parse error (#11090).
	if (pluginId && !parsePluginId(pluginId)) {
		console.error(chalk.red(`Invalid plugin ID: "${pluginId}". Marketplace plugins upgrade as "name@marketplace".`));
		console.error(
			chalk.yellow(`For an npm-installed plugin, upgrade with: ${APP_NAME} plugin install ${pluginId} --force`),
		);
		process.exit(1);
	}
	const manager = await makeMarketplaceManager();
	try {
		if (pluginId) {
			if (flags.scope) {
				const result = await manager.upgradePlugin(pluginId, flags.scope, { force: flags.force });
				console.log(chalk.green(`Upgraded ${pluginId} (${flags.scope}) to ${result.version}`));
			} else {
				const entries = await manager.upgradePluginAcrossScopes(pluginId, { force: flags.force });
				for (const entry of entries) {
					console.log(chalk.green(`Upgraded ${pluginId} (${entry.scope}) to ${entry.version}`));
				}
			}
		} else {
			if (flags.scope) {
				console.error(
					chalk.yellow(
						`Warning: --scope is ignored when upgrading all plugins. Use 'omp plugin upgrade <id> --scope ${flags.scope}' to target a specific plugin and scope.`,
					),
				);
			}
			const results = await manager.upgradeAllPlugins();
			if (results.length === 0) {
				console.log("All marketplace plugins are up to date.");
			} else {
				for (const r of results) {
					console.log(chalk.green(`  ${r.pluginId} (${r.scope}): ${r.from} -> ${r.to}`));
				}
			}
		}
	} catch (err) {
		console.error(chalk.red(`Failed to upgrade: ${err}`));
		process.exit(1);
	}
}

function printLinkPreview(pluginPath: string, json?: boolean): void {
	if (json) {
		console.log(JSON.stringify({ dryRun: true, action: "link", path: pluginPath }, null, 2));
	} else {
		console.log(chalk.dim(`[dry-run] Would link ${pluginPath}`));
	}
}

async function handleInstall(
	manager: PluginManager,
	packages: string[],
	flags: { json?: boolean; force?: boolean; dryRun?: boolean; scope?: "user" | "project" },
): Promise<void> {
	if (packages.length === 0) {
		console.error(chalk.red(`Usage: ${APP_NAME} plugin install <source>[features] ...`));
		console.error(chalk.dim("Examples:"));
		console.error(chalk.dim(`  ${APP_NAME} plugin install @oh-my-pi/exa`));
		console.error(chalk.dim(`  ${APP_NAME} plugin install name@marketplace`));
		console.error(chalk.dim(`  ${APP_NAME} plugin install github:user/repo`));
		console.error(chalk.dim(`  ${APP_NAME} plugin install https://github.com/user/repo#v1.0`));
		console.error(chalk.dim(`  ${APP_NAME} plugin install ./path/to/local/plugin`));
		process.exit(1);
	}

	// Build known marketplace set for classification
	const mktMgr = await makeMarketplaceManager();
	const knownMarketplaces = new Set((await mktMgr.listMarketplaces()).map(m => m.name));

	for (const spec of packages) {
		const target = classifyInstallTarget(spec, knownMarketplaces);

		if (target.type === "marketplace") {
			try {
				const handled = await handleMarketplaceInstall(
					mktMgr,
					target,
					{ dryRun: flags.dryRun ?? false, force: flags.force, scope: flags.scope },
					preview => {
						if (flags.json) {
							console.log(JSON.stringify(preview, null, 2));
						} else {
							console.log(chalk.dim(`[dry-run] Would install ${spec}`));
						}
					},
				);
				if (handled) continue;
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to install ${spec}: ${err}`));
				process.exit(1);
			}
			try {
				const entry = await mktMgr.installPlugin(target.name, target.marketplace, {
					force: flags.force,
					scope: flags.scope,
				});
				console.log(
					chalk.green(
						`${theme.status.success} Installed ${target.name} from ${target.marketplace} (${entry.version})`,
					),
				);
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to install ${spec}: ${err}`));
				process.exit(1);
			}
			continue;
		}

		if (target.type === "local") {
			// Local paths route to link(): symlink the directory into the plugins
			// node_modules tree so source edits show up without a reinstall. Matches
			// `omp plugin link <path>` so users can use either verb interchangeably.
			if (flags.scope) {
				console.error(
					chalk.yellow(
						`Warning: --scope is only supported for marketplace installs (name@marketplace). Ignoring for ${spec}.`,
					),
				);
			}
			if (flags.force) {
				console.error(
					chalk.yellow(
						`Warning: --force has no effect for local path installs (link is already idempotent). Ignoring for ${spec}.`,
					),
				);
			}
			if (flags.dryRun) {
				printLinkPreview(spec, flags.json);
				continue;
			}
			try {
				const result = await manager.link(target.path);
				if (flags.json) {
					console.log(JSON.stringify(result, null, 2));
				} else {
					console.log(chalk.green(`${theme.status.success} Linked ${result.name} from ${spec}`));
					if (result.manifest.description) {
						console.log(chalk.dim(`  ${result.manifest.description}`));
					}
				}
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to install ${spec}: ${err}`));
				process.exit(1);
			}
			continue;
		}

		// --scope only applies to marketplace installs; warn when it would be silently no-op'd for npm.
		if (flags.scope) {
			console.error(
				chalk.yellow(
					`Warning: --scope is only supported for marketplace installs (name@marketplace). Ignoring for ${spec}.`,
				),
			);
		}

		// npm path
		try {
			const result = await manager.install(spec, { force: flags.force, dryRun: flags.dryRun });

			if (flags.json) {
				console.log(JSON.stringify(result, null, 2));
			} else {
				if (flags.dryRun) {
					console.log(chalk.dim(`[dry-run] Would install ${spec}`));
				} else {
					console.log(chalk.green(`${theme.status.success} Installed ${result.name}@${result.version}`));
					if (result.enabledFeatures && result.enabledFeatures.length > 0) {
						console.log(chalk.dim(`  Features: ${result.enabledFeatures.join(", ")}`));
					}
					if (result.manifest.description) {
						console.log(chalk.dim(`  ${result.manifest.description}`));
					}
				}
			}
		} catch (err) {
			console.error(chalk.red(`${theme.status.error} Failed to install ${spec}: ${err}`));
			process.exit(1);
		}
	}
}

async function handleUninstall(
	manager: PluginManager,
	packages: string[],
	flags: { json?: boolean; dryRun?: boolean; scope?: "user" | "project" },
): Promise<void> {
	if (packages.length === 0) {
		console.error(chalk.red(`Usage: ${APP_NAME} plugin uninstall <package> ...`));
		process.exit(1);
	}

	// For uninstall, check the installed plugins registry directly.
	// This works even if the marketplace entry was later removed from marketplaces.json.
	const mktMgr = await makeMarketplaceManager();
	const installedIds = (await mktMgr.listInstalledPlugins()).map(p => p.id);
	const installedPlugins = new Set(installedIds);

	// Installed marketplace IDs are `name@marketplace`, so a bare name never matches one
	// exactly. Resolve it when exactly one marketplace supplies that name: without this the
	// bare form falls through to the npm path, where `bun uninstall` exits 0 for a package
	// that was never a dependency and the command reports a removal that did not happen.
	const marketplaceIdsFor = (name: string): string[] =>
		installedIds.filter(id => id.slice(0, id.lastIndexOf("@")) === name);

	for (const rawName of packages) {
		let name = rawName;
		if (!installedPlugins.has(name)) {
			const candidates = marketplaceIdsFor(name);
			if (candidates.length === 1) {
				name = candidates[0] as string;
			} else if (candidates.length > 1) {
				console.error(
					chalk.red(
						`${theme.status.error} ${rawName} is installed from ${candidates.length} marketplaces. Qualify it: ${candidates.join(", ")}`,
					),
				);
				process.exit(1);
			}
		}

		const viaMarketplace = installedPlugins.has(name);

		if (flags.dryRun) {
			if (viaMarketplace) {
				try {
					await mktMgr.uninstallPlugin(name, flags.scope, { dryRun: true });
				} catch (err) {
					console.error(chalk.red(`${theme.status.error} Failed to uninstall ${name}: ${err}`));
					process.exit(1);
				}
			}

			// Marketplace dry-runs validate the requested scope before reporting.
			if (flags.json) {
				console.log(
					JSON.stringify({
						dryRun: true,
						action: "uninstall",
						plugin: name,
						source: viaMarketplace ? "marketplace" : "npm",
					}),
				);
			} else {
				console.log(chalk.dim(`[dry-run] Would uninstall ${name}`));
			}
			continue;
		}

		if (viaMarketplace) {
			// Exact match against installed marketplace plugin IDs (name@marketplace)
			try {
				await mktMgr.uninstallPlugin(name, flags.scope);
				console.log(chalk.green(`${theme.status.success} Uninstalled ${name}`));
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to uninstall ${name}: ${err}`));
				process.exit(1);
			}
			continue;
		}

		// npm path. `bun uninstall` exits 0 for a package that is not a dependency, so an
		// unknown name would otherwise print a success line having removed nothing.
		const npmPlugins = await manager.list();
		if (!npmPlugins.some(p => p.name === name)) {
			console.error(chalk.red(`${theme.status.error} ${rawName} is not installed`));
			process.exit(1);
		}

		try {
			await manager.uninstall(name);
			if (flags.json) {
				console.log(JSON.stringify({ uninstalled: name }));
			} else {
				console.log(chalk.green(`${theme.status.success} Uninstalled ${name}`));
			}
		} catch (err) {
			console.error(chalk.red(`${theme.status.error} Failed to uninstall ${name}: ${err}`));
			process.exit(1);
		}
	}
}

async function handleList(manager: PluginManager, flags: { json?: boolean }): Promise<void> {
	const npmPlugins = await manager.list();
	const mktMgr = await makeMarketplaceManager();
	const mktPlugins = await mktMgr.listInstalledPlugins();

	if (flags.json) {
		console.log(JSON.stringify({ npm: npmPlugins, marketplace: mktPlugins }, null, 2));
		return;
	}

	if (npmPlugins.length === 0 && mktPlugins.length === 0) {
		console.log(chalk.dim("No plugins installed"));
		console.log(chalk.dim(`\nInstall plugins with: ${APP_NAME} plugin install <package>`));
		return;
	}

	if (npmPlugins.length > 0) {
		console.log(chalk.bold("npm Plugins:\n"));
		for (const plugin of npmPlugins) {
			const status = plugin.enabled ? chalk.green(theme.status.enabled) : chalk.dim(theme.status.disabled);
			const nameVersion = `${plugin.name}@${plugin.version}`;
			console.log(`${status} ${nameVersion}`);
			if (plugin.manifest.description) {
				console.log(chalk.dim(`  ${plugin.manifest.description}`));
			}
			if (plugin.enabledFeatures && plugin.enabledFeatures.length > 0) {
				console.log(chalk.dim(`  Features: ${plugin.enabledFeatures.join(", ")}`));
			}
			if (plugin.manifest.features) {
				const availableFeatures = Object.keys(plugin.manifest.features);
				if (availableFeatures.length > 0) {
					const enabledSet = new Set(plugin.enabledFeatures ?? []);
					const featureDisplay = availableFeatures
						.map(f => (enabledSet.has(f) ? chalk.green(f) : chalk.dim(f)))
						.join(", ");
					console.log(chalk.dim(`  Available: [${featureDisplay}]`));
				}
			}
		}
	}

	if (mktPlugins.length > 0) {
		if (npmPlugins.length > 0) console.log();
		console.log(chalk.bold("Marketplace Plugins:\n"));
		for (const plugin of mktPlugins) {
			const entry = plugin.entries[0];
			const version = entry?.version ?? "unknown";
			const shadowLabel = plugin.shadowedBy ? chalk.dim(" [shadowed]") : "";
			const scopeLabel = chalk.dim(` (${plugin.scope})`);
			console.log(`  ${plugin.id} (${version})${scopeLabel}${shadowLabel}`);
		}
	}
}

async function handleLink(
	manager: PluginManager,
	paths: string[],
	flags: { json?: boolean; dryRun?: boolean },
): Promise<void> {
	if (paths.length === 0) {
		console.error(chalk.red(`Usage: ${APP_NAME} plugin link <path>`));
		process.exit(1);
	}

	if (flags.dryRun) {
		printLinkPreview(paths[0], flags.json);
		return;
	}

	try {
		const result = await manager.link(paths[0]);

		if (flags.json) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			console.log(chalk.green(`${theme.status.success} Linked ${result.name} from ${paths[0]}`));
		}
	} catch (err) {
		console.error(chalk.red(`${theme.status.error} Failed to link: ${err}`));
		process.exit(1);
	}
}

/**
 * Render the health check.
 *
 * Exported for the same reason `runPluginCommand` is: it takes its manager as a
 * parameter, and that is the only seam through which a caller can point the
 * renderer at a project root that genuinely lacks a `patches/` directory. A test
 * driving the real repo checkout can only ever see the ledger pass, so it could
 * not cover the branch that matters.
 */
export async function handleDoctor(manager: PluginManager, flags: { json?: boolean; fix?: boolean }): Promise<void> {
	// Two collectors, one command. `manager.doctor()` answers "is the plugin
	// system itself healthy"; `runDoctorChecks()` answers "is the environment
	// this host runs in healthy" — PATH lookups, credentials, and the extension
	// seam registries. They share no check name at all, so running only the first
	// reported a clean bill of health to anyone whose registered theme would
	// never load.
	//
	// `runDoctorChecks` used to be exported, tested, and unreachable: nothing in
	// `src/` called it, so the checks existed only for the tests that called them
	// directly. A caller can go away while its tests stay green — that is what
	// "a registry that accepted a registration and is never consulted is a dead
	// seam wearing a live one" looks like from the outside.
	//
	// They are reported as TWO blocks rather than one merged list. Merging is the
	// obvious shape and it is wrong here: the partition contract the plugin report
	// is pinned by is stated over the rows that collector produced, and folding
	// eight machine-dependent environment checks into the same denominator makes
	// that number a property of the host instead of a property of the code. Two
	// blocks keep the plugin section exactly what it was and still give the user
	// both answers. Same module, same formatter — the split is in the report, not
	// in the implementation.
	const pluginChecks = await manager.doctor({ fix: flags.fix });
	const environmentChecks = await runDoctorChecks();

	if (flags.json) {
		console.log(JSON.stringify([...pluginChecks, ...environmentChecks], null, 2));
		return;
	}

	// The report is built by the shared formatter rather than inlined here, so the
	// bucketing that produced two wrong summaries in a row has one implementation
	// and one set of tests instead of a copy per renderer. Colouring stays a
	// parameter, but the DEFAULT set now comes from `doctorPresentation()` —
	// building the same five chalk wrappers in a third file was how `omp doctor`
	// and this command ended up with two copies that could disagree.
	const { styles, icons } = doctorPresentation();

	const pluginReport = formatDoctorResults(pluginChecks, styles, icons, { heading: "Plugin Health Check" });
	const environmentReport = formatDoctorResults(environmentChecks, styles, icons, {
		heading: "Environment Health Check",
	});

	// The plugin block prints exactly as it did before the environment half was
	// added — including its `Summary:` line — so a reader (or a script) that only
	// cares about plugin health sees an unchanged report.
	for (const line of pluginReport.lines) console.log(line);
	console.log("");

	// The environment block prints its checks but NOT its own `Summary:`. Two
	// summary lines in one report is not a report: a reader cannot tell which one
	// is the verdict, and any tooling that reads the first `Summary:` it finds
	// then disagrees with the number of lines above it. The counts ride on a
	// labelled line instead, so both halves stay legible and only one of them
	// claims to be the summary.
	const summaryIndex = environmentReport.lines.findIndex(line => line.startsWith("Summary:"));
	for (const line of environmentReport.lines.slice(0, summaryIndex)) console.log(line);
	const env = environmentReport.counts;
	console.log(
		styles.dim(
			`Environment: ${env.ok} ok, ${env.warning} warnings, ${env.error} errors` +
				`${env.unavailable > 0 ? `, ${env.unavailable} not checked` : ""}` +
				`${env.fixed > 0 ? `, ${env.fixed} fixed` : ""}`,
		),
	);
	// Anything the formatter appended after its summary (the --fix advice) is
	// still advice the reader needs.
	for (const line of environmentReport.lines.slice(summaryIndex + 1)) console.log(line);

	// Either half failing is a failing health check, so the exit code spans both.
	if (pluginReport.errors + environmentReport.errors > 0 && !flags.fix) {
		process.exit(1);
	}
}

async function handleFeatures(
	manager: PluginManager,
	args: string[],
	flags: { json?: boolean; enable?: string; disable?: string; set?: string },
): Promise<void> {
	if (args.length === 0) {
		console.error(
			chalk.red(`Usage: ${APP_NAME} plugin features <plugin> [--enable f1,f2] [--disable f1] [--set f1,f2]`),
		);
		process.exit(1);
	}

	const pluginName = args[0];
	const plugin = await manager.getPlugin(pluginName, { path: path.join(getPluginsNodeModules(), pluginName) });

	if (!plugin) {
		console.error(chalk.red(`Plugin "${pluginName}" not found`));
		process.exit(1);
	}

	// Handle modifications
	if (flags.enable || flags.disable || flags.set) {
		let currentFeatures = new Set((await manager.getEnabledFeatures(pluginName)) ?? []);

		if (flags.set) {
			// --set replaces all features
			currentFeatures = new Set(
				flags.set
					.split(",")
					.map(f => f.trim())
					.filter(Boolean),
			);
		} else {
			if (flags.enable) {
				for (const f of flags.enable
					.split(",")
					.map(f => f.trim())
					.filter(Boolean)) {
					currentFeatures.add(f);
				}
			}
			if (flags.disable) {
				for (const f of flags.disable
					.split(",")
					.map(f => f.trim())
					.filter(Boolean)) {
					currentFeatures.delete(f);
				}
			}
		}

		const result = await manager.setEnabledFeatures(pluginName, [...currentFeatures]);
		reportChange(result, "Updated features for", pluginName);
	}

	// Display current state
	const updatedFeatures = await manager.getEnabledFeatures(pluginName);

	if (flags.json) {
		console.log(
			JSON.stringify(
				{
					plugin: pluginName,
					enabledFeatures: updatedFeatures,
					availableFeatures: plugin.manifest.features ? Object.keys(plugin.manifest.features) : [],
				},
				null,
				2,
			),
		);
		return;
	}

	console.log(chalk.bold(`Features for ${pluginName}:\n`));

	if (!plugin.manifest.features || Object.keys(plugin.manifest.features).length === 0) {
		console.log(chalk.dim("  No optional features available"));
		return;
	}

	const enabledSet = new Set(updatedFeatures ?? []);
	for (const [name, feat] of Object.entries(plugin.manifest.features)) {
		const enabled = enabledSet.has(name);
		const icon = enabled ? chalk.green(theme.status.enabled) : chalk.dim(theme.status.disabled);
		const defaultLabel = feat.default ? chalk.dim(" (default)") : "";
		console.log(`${icon} ${name}${defaultLabel}`);
		if (feat.description) {
			console.log(chalk.dim(`    ${feat.description}`));
		}
	}
}

async function handleConfig(
	manager: PluginManager,
	args: string[],
	flags: { json?: boolean; local?: boolean },
): Promise<void> {
	if (args.length === 0) {
		console.error(
			chalk.red(`Usage: ${APP_NAME} plugin config <list|get|set|delete|validate> <plugin> [key] [value]`),
		);
		process.exit(1);
	}

	const [subcommand, pluginName, key, ...valueArgs] = args;

	// Special case: validate doesn't need a plugin name
	if (subcommand === "validate") {
		await handleConfigValidate(manager, flags);
		return;
	}

	if (!pluginName) {
		console.error(chalk.red("Plugin name required"));
		process.exit(1);
	}

	const plugin = await manager.getPlugin(pluginName);

	if (!plugin) {
		console.error(chalk.red(`Plugin "${pluginName}" not found`));
		process.exit(1);
	}

	switch (subcommand) {
		case "list": {
			const settings = await manager.getPluginSettings(pluginName);
			const schema = plugin.manifest.settings || {};

			if (flags.json) {
				console.log(JSON.stringify({ settings, schema }, null, 2));
				return;
			}

			console.log(chalk.bold(`Settings for ${pluginName}:\n`));

			if (Object.keys(schema).length === 0) {
				console.log(chalk.dim("  No settings defined"));
				return;
			}

			for (const [k, s] of Object.entries(schema)) {
				const value = settings[k] ?? s.default;
				const displayValue = s.secret && value ? "********" : String(value ?? chalk.dim("(not set)"));
				console.log(`  ${k}: ${displayValue}`);
				if (s.description) {
					console.log(chalk.dim(`    ${s.description}`));
				}
				if (s.env) {
					console.log(chalk.dim(`    env: ${s.env}`));
				}
			}
			break;
		}

		case "get": {
			if (!key) {
				console.error(chalk.red("Key required"));
				process.exit(1);
			}

			const settings = await manager.getPluginSettings(pluginName);
			const schema = plugin.manifest.settings?.[key];
			const value = settings[key] ?? schema?.default;

			if (flags.json) {
				console.log(JSON.stringify({ [key]: value }));
			} else {
				const displayValue = schema?.secret && value ? "********" : String(value ?? "(not set)");
				console.log(displayValue);
			}
			break;
		}

		case "set": {
			if (!key) {
				console.error(chalk.red("Key required"));
				process.exit(1);
			}

			const valueStr = valueArgs.join(" ");
			const schema = plugin.manifest.settings?.[key];

			// Parse value according to type
			let value: unknown = valueStr;
			if (schema) {
				value = parseSettingValue(valueStr, schema);

				// Validate
				const validation = validateSetting(value, schema);
				if (!validation.valid) {
					console.error(chalk.red(validation.error!));
					process.exit(1);
				}
			}

			const result = await manager.setPluginSetting(pluginName, key, value);
			reportChange(result, "Set", `${key} for ${pluginName}`);
			break;
		}

		case "delete": {
			if (!key) {
				console.error(chalk.red("Key required"));
				process.exit(1);
			}

			const result = await manager.deletePluginSetting(pluginName, key);
			reportChange(result, "Deleted", `${key} from ${pluginName}`);
			break;
		}

		default:
			console.error(chalk.red(`Unknown config subcommand: ${subcommand}`));
			console.error(chalk.dim("Valid subcommands: list, get, set, delete, validate"));
			process.exit(1);
	}
}

/**
 * Enumerate every installed plugin to validate — npm/link plugins from
 * {@link PluginManager.list} plus marketplace runtime packages, which `list()`
 * intentionally omits. Marketplace summaries are resolved through their trusted
 * install path; deduped by resolved package name using the same active-scope
 * precedence as runtime loading.
 */
async function collectPluginsForValidation(manager: PluginManager): Promise<InstalledPlugin[]> {
	const byName = new Map<string, InstalledPlugin>();
	for (const plugin of await manager.list()) {
		byName.set(plugin.name, plugin);
	}
	const mktMgr = await makeMarketplaceManager();
	for (const summary of await mktMgr.listInstalledPlugins()) {
		const entry = summary.entries[0];
		if (!entry) continue;
		const fallbackName = parsePluginId(summary.id)?.name ?? summary.id;
		const resolved = await manager.getPlugin(fallbackName, { path: entry.installPath });
		if (!resolved) continue;
		byName.set(resolved.name, (await manager.getPlugin(resolved.name)) ?? resolved);
	}
	return [...byName.values()];
}

async function handleConfigValidate(manager: PluginManager, flags: { json?: boolean }): Promise<void> {
	const plugins = await collectPluginsForValidation(manager);
	const results: Array<{ plugin: string; key: string; error: string }> = [];

	for (const plugin of plugins) {
		const settings = await manager.getPluginSettings(plugin.name);
		const schema = plugin.manifest.settings || {};

		for (const [key, s] of Object.entries(schema)) {
			const value = settings[key];
			if (value !== undefined) {
				const validation = validateSetting(value, s);
				if (!validation.valid) {
					results.push({ plugin: plugin.name, key, error: validation.error! });
				}
			}
		}
	}

	if (flags.json) {
		console.log(JSON.stringify({ valid: results.length === 0, errors: results }, null, 2));
		return;
	}

	if (results.length === 0) {
		console.log(chalk.green(`${theme.status.success} All settings valid`));
	} else {
		for (const { plugin, key, error } of results) {
			console.log(chalk.red(`${theme.status.error} ${plugin}.${key}: ${error}`));
		}
		process.exit(1);
	}
}

async function handleEnable(
	manager: PluginManager,
	plugins: string[],
	flags: { json?: boolean; scope?: "user" | "project" },
): Promise<void> {
	return handleSetEnabled(manager, plugins, flags, true);
}

async function handleDisable(
	manager: PluginManager,
	plugins: string[],
	flags: { json?: boolean; scope?: "user" | "project" },
): Promise<void> {
	return handleSetEnabled(manager, plugins, flags, false);
}

async function handleSetEnabled(
	manager: PluginManager,
	plugins: string[],
	flags: { json?: boolean; scope?: "user" | "project" },
	enabled: boolean,
): Promise<void> {
	const action = enabled ? "enable" : "disable";
	const pastTense = enabled ? "Enabled" : "Disabled";
	const jsonKey = enabled ? "enabled" : "disabled";

	if (plugins.length === 0) {
		console.error(chalk.red(`Usage: ${APP_NAME} plugin ${action} <plugin> ...`));
		process.exit(1);
	}

	const mktMgr = await makeMarketplaceManager();
	const installedPlugins = new Set((await mktMgr.listInstalledPlugins()).map(p => p.id));

	for (const name of plugins) {
		if (installedPlugins.has(name)) {
			try {
				await mktMgr.setPluginEnabled(name, enabled, flags.scope);
				if (flags.json) {
					console.log(JSON.stringify({ [jsonKey]: name }));
				} else {
					console.log(chalk.green(`${theme.status.success} ${pastTense} ${name}`));
				}
			} catch (err) {
				console.error(chalk.red(`${theme.status.error} Failed to ${action} ${name}: ${err}`));
				process.exit(1);
			}
			continue;
		}

		try {
			const result = await manager.setEnabled(name, enabled);
			if (flags.json) {
				// Structured output carries the outcome rather than prose, so a
				// script can tell a no-op write from a real one.
				console.log(JSON.stringify({ [jsonKey]: name, changed: result.changed, application: result.application }));
			} else {
				reportChange(result, pastTense, name);
			}
		} catch (err) {
			console.error(chalk.red(`${theme.status.error} Failed to ${action} ${name}: ${err}`));
			process.exit(1);
		}
	}
}

// =============================================================================
// Help
// =============================================================================

export function printPluginHelp(): void {
	console.log(`${chalk.bold(`${APP_NAME} plugin`)} - Plugin lifecycle management

${chalk.bold("Commands:")}
  install <source>[features]     Install plugins from npm, GitHub, or git URL
  uninstall <pkg>                Remove plugins
  list                           Show installed plugins
  link <path>                    Link local plugin for development
  doctor                         Check plugin health
  features <pkg>                 View/modify enabled features
  config <cmd> <pkg> [key] [val] Manage plugin settings
  enable <pkg>                   Enable a disabled plugin
  disable <pkg>                  Disable plugin without uninstalling
  marketplace <cmd>            Manage marketplace sources (add, remove, update, list)
  discover [marketplace]        Browse available marketplace plugins

${chalk.bold("Feature Syntax:")}
  pkg                Install with default features
  pkg[feat1,feat2]   Install with specific features
  pkg[*]             Install with all features
  pkg[]              Install with no optional features

${chalk.bold("Sources:")}
  pkg, pkg@1.2.3                  npm package (optionally pinned)
  github:user/repo[#ref]          GitHub shorthand (also gitlab:, bitbucket:, codeberg:, sourcehut:)
  https://github.com/user/repo    Full git URL (https, ssh, or git protocol)
  name@marketplace                Marketplace plugin (see marketplace command)
  ./path, ../path, /abs, ~/path   Local plugin directory (symlinked, same as plugin link)

${chalk.bold("Config Subcommands:")}
  config list <pkg>              List all settings
  config get <pkg> <key>         Get a setting value
  config set <pkg> <key> <val>   Set a setting value
  config delete <pkg> <key>      Delete a setting
  config validate                Validate all plugin settings

${chalk.bold("Options:")}
  --json           Output as JSON
  --fix            Attempt automatic fixes (doctor)
  --force          Overwrite without prompting (install)
  --scope <scope>  Install scope: user (default) or project (install name@marketplace)
  --dry-run        Preview changes without applying (install)
  -l, --local      Use project-local overrides

${chalk.bold("Examples:")}
  ${APP_NAME} plugin install @oh-my-pi/exa[search]
  ${APP_NAME} plugin list --json
  ${APP_NAME} plugin features my-plugin --enable search,web
  ${APP_NAME} plugin config set my-plugin apiKey sk-xxx
  ${APP_NAME} plugin doctor --fix
  ${APP_NAME} plugin install --scope project name@marketplace
  ${APP_NAME} plugin install github:user/repo#v1.0
`);
}
