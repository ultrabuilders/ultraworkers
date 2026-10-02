/**
 * Top-level CLI command table.
 *
 * Lives in its own module (importable without side effects) so that tests can
 * inspect the registered subcommands without triggering the side-effectful
 * top-level await in `cli.ts`. Adding a new subcommand here is enough to make
 * `runCli` route to it instead of forwarding the argv as a prompt to
 * `launch` — see #1496 for the original "args silently leak to the LLM"
 * regression that motivated the split.
 */
import type { CommandEntry } from "@oh-my-pi/pi-utils/cli";
import { APP_NAME } from "@oh-my-pi/pi-utils/dirs";
import * as commandHelp from "./cli/command-help";
import {
	EXTENSION_SHADOWABLE_STRING_FLAGS,
	flagConsumesValue,
	OPTIONAL_VALUE_FLAGS,
	STRING_VALUE_FLAGS,
	VALUELESS_FLAGS,
} from "./cli/flag-tables";

import type * as LaunchHelp from "./commands/launch-help";

function loadLaunchHelp(): typeof LaunchHelp.launchHelp {
	const module: typeof LaunchHelp = require("./commands/launch-help");
	return module.launchHelp;
}

export const commands: CommandEntry[] = [
	{
		name: "launch",
		load: () => import("./commands/launch").then(m => m.default),
		get help() {
			return loadLaunchHelp();
		},
	},
	{
		name: "acp",
		load: () => import("./commands/acp").then(m => m.default),
		help: commandHelp.acpHelp,
	},
	{
		name: "auth-broker",
		load: () => import("./commands/auth-broker").then(m => m.default),
		help: commandHelp.authBrokerHelp,
	},
	{
		name: "auth-gateway",
		load: () => import("./commands/auth-gateway").then(m => m.default),
		help: commandHelp.authGatewayHelp,
	},
	{
		name: "agents",
		load: () => import("./commands/agents").then(m => m.default),
		help: commandHelp.agentsHelp,
	},
	{
		name: "bench",
		load: () => import("./commands/bench").then(m => m.default),
		help: commandHelp.benchHelp,
	},
	{
		name: "browser-relay",
		load: () => import("./commands/browser-relay").then(m => m.default),
		help: commandHelp.browserRelayHelp,
	},
	{
		name: "cleanse",
		load: () => import("./commands/cleanse").then(m => m.default),
		help: commandHelp.cleanseHelp,
	},
	{
		name: "collab",
		// Keep implementation imports behind the command boundary: this table is
		// also imported before profile bootstrap and by native-free worker entries.
		load: () => import("./commands/collab").then(m => m.default),
		help: commandHelp.collabHelp,
	},
	{
		name: "commit",
		load: () => import("./commands/commit").then(m => m.default),
		help: commandHelp.commitHelp,
	},
	{
		name: "completions",
		load: () => import("./commands/completions").then(m => m.default),
		help: commandHelp.completionsHelp,
	},
	{
		name: "__complete",
		load: () => import("./commands/complete").then(m => m.default),
		help: commandHelp.completeHelp,
	},
	{
		name: "compress",
		load: () => import("./commands/compress").then(m => m.default),
		help: commandHelp.compressHelp,
	},
	{
		name: "config",
		load: () => import("./commands/config").then(m => m.default),
		help: commandHelp.configHelp,
	},
	{
		name: "extensions-triage",
		load: () => import("./commands/extensions-triage").then(m => m.default),
		help: commandHelp.extensionsTriageHelp,
	},
	{
		name: "approval-audit",
		load: () => import("./commands/approval-audit").then(m => m.default),
		help: commandHelp.approvalAuditHelp,
	},
	{
		name: "dry-balance",
		load: () => import("./commands/dry-balance").then(m => m.default),
		help: commandHelp.dryBalanceHelp,
	},
	{
		name: "doctor",
		load: () => import("./commands/doctor").then(m => m.default),
		help: commandHelp.doctorHelp,
	},
	{
		name: "find",
		load: () => import("./commands/find").then(m => m.default),
		help: commandHelp.findHelp,
	},
	{
		name: "gc",
		load: () => import("./commands/gc").then(m => m.default),
		help: commandHelp.gcHelp,
	},
	{
		name: "grep",
		load: () => import("./commands/grep").then(m => m.default),
		help: commandHelp.grepHelp,
	},
	{
		name: "gallery",
		load: () => import("./commands/gallery").then(m => m.default),
		help: commandHelp.galleryHelp,
	},
	{
		name: "git",
		load: () => import("./commands/git").then(m => m.default),
		help: commandHelp.gitHelp,
	},
	{
		name: "grievances",
		load: () => import("./commands/grievances").then(m => m.default),
		help: commandHelp.grievancesHelp,
	},
	{
		name: "images",
		load: () => import("./commands/images").then(m => m.default),
		aliases: ["img"],
		help: commandHelp.imagesHelp,
	},
	{
		name: "if-bench",
		load: () => import("./commands/if-bench").then(m => m.default),
		help: commandHelp.ifBenchHelp,
	},
	{
		name: "install",
		load: () => import("./commands/install").then(m => m.default),
		help: commandHelp.installHelp,
	},
	{
		name: "join",
		load: () => import("./commands/join").then(m => m.default),
		help: commandHelp.joinHelp,
	},
	{
		name: "login",
		load: () => import("./commands/login").then(m => m.default),
		help: commandHelp.loginHelp,
	},
	{
		name: "models",
		load: () => import("./commands/models").then(m => m.default),
		help: commandHelp.modelsHelp,
	},
	{
		name: "plugin",
		load: () => import("./commands/plugin").then(m => m.default),
		aliases: ["plugins"],
		help: commandHelp.pluginHelp,
	},
	{
		name: "predict",
		load: () => import("./commands/predict").then(m => m.default),
		help: commandHelp.predictHelp,
	},
	{
		name: "ps",
		load: () => import("./commands/ps").then(m => m.default),
		help: commandHelp.psHelp,
	},
	{
		name: "say",
		load: () => import("./commands/say").then(m => m.default),
		help: commandHelp.sayHelp,
	},
	{
		name: "clip",
		load: () => import("./commands/clip").then(m => m.default),
		help: commandHelp.clipHelp,
	},
	{
		name: "play",
		load: () => import("./commands/play").then(m => m.default),
		help: commandHelp.playHelp,
	},
	{
		name: "share",
		load: () => import("./commands/share").then(m => m.default),
		help: commandHelp.shareHelp,
	},
	{
		name: "session",
		load: () => import("./commands/session").then(m => m.default),
		help: commandHelp.sessionHelp,
	},
	{
		name: "setup",
		load: () => import("./commands/setup").then(m => m.default),
		help: commandHelp.setupHelp,
	},
	{
		name: "shell",
		load: () => import("./commands/shell").then(m => m.default),
		help: commandHelp.shellHelp,
	},
	{
		name: "read",
		load: () => import("./commands/read").then(m => m.default),
		help: commandHelp.readHelp,
	},
	{
		name: "render",
		load: () => import("./commands/render").then(m => m.default),
		help: commandHelp.renderHelp,
	},
	{
		name: "skill",
		load: () => import("./commands/skill").then(m => m.default),
		aliases: ["skills"],
		help: commandHelp.skillHelp,
	},
	{
		name: "ssh",
		load: () => import("./commands/ssh").then(m => m.default),
		help: commandHelp.sshHelp,
	},
	{
		name: "stats",
		load: () => import("./commands/stats").then(m => m.default),
		help: commandHelp.statsHelp,
	},
	{
		name: "stream",
		load: () => import("./commands/stream").then(m => m.default),
		help: commandHelp.streamHelp,
	},
	{
		name: "update",
		load: () => import("./commands/update").then(m => m.default),
		help: commandHelp.updateHelp,
	},
	{
		name: "usage",
		load: () => import("./commands/usage").then(m => m.default),
		help: commandHelp.usageHelp,
	},
	{
		name: "tiny-models",
		load: () => import("./commands/tiny-models").then(m => m.default),
		help: commandHelp.tinyModelsHelp,
	},
	{
		name: "token",
		load: () => import("./commands/token").then(m => m.default),
		help: commandHelp.tokenHelp,
	},
	{
		name: "toks",
		load: () => import("./commands/toks").then(m => m.default),
		help: commandHelp.toksHelp,
	},
	{
		name: "ttsr",
		load: () => import("./commands/ttsr").then(m => m.default),
		help: commandHelp.ttsrHelp,
	},
	{
		name: "worktree",
		load: () => import("./commands/worktree").then(m => m.default),
		aliases: ["wt"],
		help: commandHelp.worktreeHelp,
	},
	{
		name: "search",
		load: () => import("./commands/web-search").then(m => m.default),
		aliases: ["q", "web-search"],
		help: commandHelp.searchHelp,
	},
];

const SUBCOMMAND_NAMES = new Set<string>();
for (const command of commands) {
	SUBCOMMAND_NAMES.add(command.name);
	if (command.aliases) {
		for (const alias of command.aliases) SUBCOMMAND_NAMES.add(alias);
	}
}

// =============================================================================
// Extension-registered top-level verbs
// =============================================================================
//
// `SUBCOMMAND_NAMES` is a snapshot: it is built when this module is first
// evaluated, and pushing onto the exported `commands` array afterwards changes
// nothing, because every lookup reads the closed Set. A `registerSubcommand`
// that only appended there would compile, export a correctly-named function,
// and dispatch nothing — the verb keeps falling through to `launch` and the
// argv reaches the model as a prompt. Nothing throws and nothing logs.
//
// So extension verbs are held in a Map that is read per call, never snapshotted.
// This is the shape `cli/extension-flags.ts` already uses for flags: the
// registry is consulted at the point of use, and there is no built-in name list
// for a plugin author to collide with.
//
// Two extensions claiming one verb is a mistake worth surfacing rather than a
// race to win, following the tool-collision contract WI-2 set: the collision
// records *both* claimants and the first registration still routes, so dispatch
// stays deterministic. Silent last-writer-wins is the invisible-override class
// WI-2 called out by name.

/**
 * Runs a registered verb, receiving the argv that follows it.
 *
 * The handler closes over whatever it captured from the extension API at
 * registration time, so it needs nothing from core to reach its own state.
 */
export type SubcommandHandler = (argv: string[]) => Promise<void>;

interface RegisteredSubcommand {
	owner: string;
	handler: SubcommandHandler;
}

const registeredSubcommands = new Map<string, RegisteredSubcommand>();
const subcommandCollisions: Array<{ verb: string; owner: string; existingOwner: string }> = [];

/**
 * Register a top-level verb owned by an extension, plus the handler `omp <verb>`
 * runs.
 *
 * Returns `false` when `verb` was already claimed so the caller can surface the
 * collision; the existing registration is kept, keeping dispatch deterministic.
 * A verb shadowing a *built-in* command is refused for the same reason, with the
 * installed app name as the other claimant: {@link extensionCommandEntries} entries
 * are matched after the static table, so a handler registered under a built-in name
 * would never be reached — and a silently-unreachable handler is precisely the
 * invisible override this registry exists to make loud.
 */
export function registerSubcommand(verb: string, owner: string, handler: SubcommandHandler): boolean {
	const existing = registeredSubcommands.get(verb);
	if (existing !== undefined) {
		subcommandCollisions.push({ verb, owner, existingOwner: existing.owner });
		return false;
	}
	if (SUBCOMMAND_NAMES.has(verb)) {
		subcommandCollisions.push({ verb, owner, existingOwner: APP_NAME });
		return false;
	}
	registeredSubcommands.set(verb, { owner, handler });
	return true;
}

/** Whether an extension has registered `verb`. Read per call — never cached. */
function isRegisteredSubcommand(verb: string): boolean {
	return registeredSubcommands.has(verb);
}

/** Every verb collision seen so far, naming both claimants. */
export function subcommandCollisionDiagnostics(): ReadonlyArray<{
	verb: string;
	owner: string;
	existingOwner: string;
}> {
	return subcommandCollisions;
}

/** Test-only: drop all registrations so one file cannot poison another's. */
export function resetSubcommandRegistry(): void {
	registeredSubcommands.clear();
	subcommandCollisions.length = 0;
}

/**
 * Whether `first` could name an extension verb, and so whether extensions must
 * be loaded before routing decides.
 *
 * A verb is a single bare token, so a token containing whitespace cannot be one
 * — and such a token only arrives if the user quoted it, which is the ordinary
 * way to send a multi-word prompt. Priming the registry for those would buy
 * nothing. Every other bare word *could* be a verb, so it must be asked.
 */
export function couldBeExtensionSubcommand(first: string | undefined): boolean {
	if (!first || first.startsWith("-") || first.startsWith("@")) return false;
	return !/\s/.test(first);
}

/**
 * Load extensions far enough that their `registerSubcommand` calls have run.
 *
 * Extensions are otherwise loaded *inside* the session `run()` dispatches to, so
 * a verb an extension registers cannot be known at routing time: without this,
 * the two wait on each other and every extension verb stays unreachable.
 * Priming the registry here closes that loop and leaves `run()` untouched.
 *
 * Discovery runs ambient-only — user, project, and installed-plugin extensions.
 * Paths configured in settings belong to the session that owns them and are
 * deliberately not read here; doing so would pull the settings manager onto a
 * path that currently costs one filesystem scan.
 */
export async function preloadExtensionSubcommands(): Promise<void> {
	// Lazy for the same reason every command entry above is lazy: this module is
	// reached by `omp --version` and `omp --help`, and a static import of the
	// loader would drag its whole graph onto those paths.
	const { discoverAndLoadExtensions } = await import("./extensibility/extensions/loader");
	await discoverAndLoadExtensions([], process.cwd(), undefined, undefined, { includeAmbientHooks: false });
}

/**
 * The registered verbs, shaped as the command entries `run()` dispatches on.
 *
 * `run()` matches `argv[0]` against a static `CommandEntry[]` and knows nothing
 * about extensions. Rather than teach it a second concept, each verb becomes a
 * real entry whose class calls the handler from `run()` — so an extension verb
 * reaches the same dispatch path, with the same argv slicing and the same
 * `CliUsageError` handling, as every built-in command.
 */
export function extensionCommandEntries(): CommandEntry[] {
	return Array.from(registeredSubcommands, ([verb, { handler }]) => ({
		name: verb,
		// Lazy through `load`, like every other entry in the table above: the class
		// is only needed once a verb actually dispatches. That also keeps `Command` a
		// type-only edge here — importing it as a value would drag
		// `@oh-my-pi/pi-utils/cli` into the `cli.ts` entry graph and break its
		// budget. See `cli/extension-subcommand.ts`.
		load: () => import("./cli/extension-subcommand").then(module => module.createSubcommandClass(handler)),
	}));
}

/** Commands that accept launch-global flags before their command token. */
export const LAUNCH_FLAG_COMMANDS: Readonly<Record<string, true>> = { launch: true, acp: true };

/** Whether a token names a registered top-level command or alias. */
export function isSubcommand(first: string | undefined): boolean {
	if (!first || first.startsWith("-") || first.startsWith("@")) return false;
	// Extension-registered verbs are read live. `SUBCOMMAND_NAMES` is a snapshot
	// taken when this module loaded, so a verb registered later is only visible
	// here — consulting the registry is what makes the seam real rather than a
	// function that type-checks and dispatches nothing.
	return SUBCOMMAND_NAMES.has(first) || isRegisteredSubcommand(first);
}

// Documented-looking plugin/marketplace verbs that are NOT registered top-level
// commands. Without a guard `resolveCliArgv` rewrites e.g. `omp marketplace add
// xyz` to `omp launch marketplace add xyz`, silently forwarding the argv to the
// model as a prompt instead of managing plugins (#4845; same class as the
// `list`/`remove` leak fixed in #2935 and the `install` leak in #1496/#1498).
// The real commands live under `omp plugin <action>`; each entry maps a verb to
// a hint pointing there. See {@link reservedTopLevelWordMessage} for when a hint
// fires vs. when the argv still falls through to `launch`.
//
// `{invoked}` is replaced with the name the CLI was actually started under. It
// is NOT a synonym for the product name: this clause echoes the command the
// user typed, and a hardcoded binary in it made the message accuse them of
// running something they never ran — a user who typed `ultraworkers list` was
// told "`omp list` is not a top-level command". Only this clause is
// substituted. The `omp plugin …` recommendations after it name the command to
// run next, which is a separate product decision about the installed binary
// name and is deliberately left untouched here.
const RESERVED_TOP_LEVEL_WORDS: Record<string, string> = {
	extensions:
		'`{invoked} extensions` is not a management command. Use `omp plugin list` / `omp plugin install`, or run `omp launch extensions` if you meant to send "extensions" as a prompt.',
	list: '`{invoked} list` is not a top-level command. Use `omp plugin list` to list installed plugins, or run `omp launch list` if you meant to send "list" as a prompt.',
	remove:
		'`{invoked} remove` is not a top-level command. Use `omp plugin uninstall <name>` to remove a plugin, or run `omp launch remove` if you meant to send "remove" as a prompt.',
	uninstall:
		'`{invoked} uninstall` is not a top-level command. Use `omp plugin uninstall <name@marketplace>` to remove a plugin, or run `omp launch uninstall` if you meant to send "uninstall" as a prompt.',
	marketplace:
		'`{invoked} marketplace` is not a top-level command. Use `omp plugin marketplace <add|remove|update|list>` to manage marketplaces, or run `omp launch marketplace` if you meant to send "marketplace" as a prompt.',
	discover:
		'`{invoked} discover` is not a top-level command. Use `omp plugin discover [marketplace]` to browse available plugins, or run `omp launch discover` if you meant to send "discover" as a prompt.',
	upgrade:
		'`{invoked} upgrade` is not a top-level command. Use `omp plugin upgrade [name@marketplace]` to upgrade plugins, or run `omp launch upgrade` if you meant to send "upgrade" as a prompt.',
	enable:
		'`{invoked} enable` is not a top-level command. Use `omp plugin enable <name@marketplace>` to enable a plugin, or run `omp launch enable` if you meant to send "enable" as a prompt.',
	disable:
		'`{invoked} disable` is not a top-level command. Use `omp plugin disable <name@marketplace>` to disable a plugin, or run `omp launch disable` if you meant to send "disable" as a prompt.',
};

// Sub-actions that make `omp marketplace <sub>` unambiguously a management
// command even when multi-word (the reporter's `omp marketplace add xyz`,
// #4845). Mirrors the switch in `handleMarketplace` (cli/plugin-cli.ts).
const MARKETPLACE_SUBCOMMANDS: Record<string, true> = { add: true, remove: true, rm: true, update: true, list: true };

/**
 * The name the CLI was started under, used to echo the user's own invocation
 * back to them in a hint.
 *
 * `process.argv[1]` is the resolved entry, so a symlinked launcher reports the
 * binary it points at rather than the link's name — which is the right answer
 * here, because that binary is the one that produced the message. A source-file
 * entry (`bun src/cli.ts`) is not a command name at all, so it falls back to
 * {@link APP_NAME} instead of telling the user they typed `cli.ts`.
 */
function invokedBinaryName(): string {
	const entry = process.argv[1];
	if (!entry) return APP_NAME;
	const base = entry.split(/[/\\]/).pop() ?? entry;
	if (base.length === 0 || /\.(ts|js|mjs|cjs)$/.test(base)) return APP_NAME;
	return base;
}

/**
 * Hint for a reserved plugin/marketplace verb used as a top-level command, or
 * `undefined` when the argv should fall through to `launch`.
 *
 * A bare verb (`omp marketplace`) always hints. A multi-word invocation only
 * hints when the arguments follow the documented plugin grammar — a marketplace
 * sub-action (`omp marketplace add …`) or a `name@marketplace` plugin id
 * (`omp uninstall foo@bar`) — so genuine prompts that merely begin with one of
 * these words (`omp list all my files`, `omp upgrade the deps`) still launch.
 *
 * Flags (`-…`) and `@file` arguments in the verb slot are never management
 * commands; those fall through to the default `launch` command.
 *
 * `invokedAs` names the binary in the echoed clause. It is a parameter rather
 * than an inline read of the process so the echo contract can be asserted
 * directly, and so an embedded SDK call can say which name to echo.
 */
export function reservedTopLevelWordMessage(
	argv: readonly string[],
	invokedAs: string = invokedBinaryName(),
): string | undefined {
	const first = argv[0];
	if (!first || first.startsWith("-") || first.startsWith("@")) return undefined;
	const template = RESERVED_TOP_LEVEL_WORDS[first];
	if (!template) return undefined;
	const hint = template.replaceAll("{invoked}", invokedAs);
	const second = argv[1];
	if (second === undefined) return hint;
	if (first === "marketplace" && MARKETPLACE_SUBCOMMANDS[second]) return hint;
	for (let index = 1; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg.startsWith("-") && arg.includes("@")) return hint;
	}
	return undefined;
}

export type ResolvedCliArgv = { argv: string[] } | { error: string };

/**
 * Index of the first argv token that names a registered subcommand, skipping
 * leading global option flags (and any value they consume) with the same
 * contract as the launch parser ({@link flagConsumesValue}). Returns -1 when
 * scanning hits a non-subcommand positional, an end-of-options `--`, or the end
 * of argv first.
 */
function leadingSubcommandIndex(argv: string[]): number {
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--") return -1;
		if (!arg.startsWith("-")) return isSubcommand(arg) ? index : -1;
		if (flagConsumesValue(arg, argv[index + 1])) index += 1;
	}
	return -1;
}

/** Whether `arg` names a flag from the launch surface (bare or `--flag=value`). */
function isLaunchGlobalFlag(arg: string): boolean {
	const eq = arg.indexOf("=");
	const name = arg.startsWith("--") && eq !== -1 ? arg.slice(0, eq) : arg;
	return (
		STRING_VALUE_FLAGS.has(name) ||
		OPTIONAL_VALUE_FLAGS.has(name) ||
		VALUELESS_FLAGS.has(name) ||
		EXTENSION_SHADOWABLE_STRING_FLAGS.has(name)
	);
}

/**
 * Drop recognized launch-global flags (and any value they consume) from the
 * leading segment before a hoisted non-launch subcommand. `--cwd` and friends
 * belong to the launch surface and mean nothing to a subcommand like `update`,
 * whose strict parser would otherwise reject them with a cryptic
 * `node:util.parseArgs` error (#8891). Tokens the launch tables don't recognize
 * are kept, so a subcommand's own leading flags still reach it.
 */
function stripLaunchGlobalFlags(leading: readonly string[]): string[] {
	const kept: string[] = [];
	for (let index = 0; index < leading.length; index += 1) {
		const arg = leading[index];
		if (isLaunchGlobalFlag(arg)) {
			if (flagConsumesValue(arg, leading[index + 1])) index += 1;
			continue;
		}
		kept.push(arg);
	}
	return kept;
}

/**
 * Decide what the CLI runner should do with raw argv: reject bare reserved
 * management words, pass help/version through untouched, route a recognized
 * subcommand (even behind leading global flags like `--approval-mode=yolo`) to
 * that command, and forward everything else to `launch` (#2970). Leading
 * launch-global flags are forwarded to launch-shaped commands but stripped for
 * other subcommands that cannot parse them (#8891).
 */
export function resolveCliArgv(argv: string[]): ResolvedCliArgv {
	const first = argv[0];
	if (first === "--help" || first === "-h" || first === "--version" || first === "-v" || first === "help") {
		return { argv };
	}
	// A registered verb dispatches *before* the reserved-word hint is consulted.
	// The hint exists to explain a word core cannot route; once an extension
	// supplies a real handler for that word, the honest answer is to run it, and
	// the hint would otherwise turn a working command back into an error.
	if (isSubcommand(first)) return { argv };
	const reservedMessage = reservedTopLevelWordMessage(argv);
	if (reservedMessage) return { error: reservedMessage };
	// A subcommand can hide behind leading global option flags
	// (`omp --approval-mode=yolo acp`). `run` dispatches strictly on argv[0], so
	// hoist the subcommand to the front. Launch-shaped commands share the launch
	// flag surface, so their leading flags are forwarded and applied; every other
	// subcommand parses only its own flags, so launch-global flags placed before
	// it (`omp --cwd <dir> update`) are stripped rather than forwarded into a
	// crash (#8891). Genuine launch prompts (no trailing subcommand) are untouched.
	const subIndex = leadingSubcommandIndex(argv);
	if (subIndex >= 0) {
		const sub = argv[subIndex];
		const leading = argv.slice(0, subIndex);
		const trailing = argv.slice(subIndex + 1);
		const forwardedLeading = LAUNCH_FLAG_COMMANDS[sub] === true ? leading : stripLaunchGlobalFlags(leading);
		return { argv: [sub, ...forwardedLeading, ...trailing] };
	}
	return { argv: ["launch", ...argv] };
}
