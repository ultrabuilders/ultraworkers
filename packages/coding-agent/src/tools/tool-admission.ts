import { cfgIdaAvailable } from "../ida/install";
import { isIrcEnabled } from "../irc/messaging";
import { cfgAutolearnEnabled } from "../autolearn/settings";
import { cfgBashEnabled } from "../exec/settings";
import { cfgCompactionExperimentalContextManagement } from "../session/context-settings";
import { cfgExternalThinking } from "../session/settings";
import { cfgGoalEnabled } from "../goals/settings";
import { cfgLspEnabled } from "../lsp/settings";
import { cfgMemoryBackend } from "../memory-backend/settings";
import { cfgTaskMaxRecursionDepth } from "../task/settings";
import { canSpawnAtDepth } from "../task/types";
import type { GoalModeState } from "../goals";
import type { ModelRegistry } from "../config/model-registry";
import type { Settings } from "../config/settings";
import type { BuiltinToolName, HiddenToolName } from "./builtin-names";
import { isFindEnabled } from "./jfind";
import {
	cfgAskEnabled,
	cfgAstEditEnabled,
	cfgAstGrepEnabled,
	cfgAsyncEnabled,
	cfgCheckpointEnabled,
	cfgDebugEnabled,
	cfgGithubEnabled,
	cfgGlobEnabled,
	cfgGrepEnabled,
	cfgLaunchEnabled,
	cfgSecurityEnabled,
	cfgTodoEnabled,
	cfgWebSearchEnabled,
} from "./settings";

/**
 * Which built-in tools a session may construct, as data rather than as a ladder
 * of `if (name === …)`.
 *
 * The ladder it replaces was a 25-branch chain inside one closure, and that shape
 * fails in a specific way: adding a tool means finding the right place in a
 * chain, and a tool that belongs in NO branch is silently admitted by the
 * fallthrough. Here a new name in `BUILTIN_TOOL_NAMES` is a type error until
 * someone writes down whether it is admitted — the decision becomes an entry,
 * not a slot.
 *
 * Rules are pure over `ToolAdmissionContext`. Nothing here reaches for a session
 * beyond the members declared below, so the table can be read (and tested)
 * without constructing a session.
 */

/**
 * The session members admission rules may read.
 *
 * Structural rather than `ToolSession` on purpose: this module is imported BY
 * `tools/index.ts`, so naming that type here would make the dependency circular
 * even though the import would be erased. Declaring the members keeps the
 * direction honest and fails to compile the moment a rule needs more.
 */
export interface ToolAdmissionSession {
	readonly settings: Settings;
	readonly modelRegistry?: ModelRegistry;
	readonly taskDepth?: number;
	readonly prewalkArmed?: boolean;
	readonly enableIrc?: boolean;
	getGoalModeState?(): GoalModeState | undefined;
}

export interface ToolAdmissionContext {
	readonly session: ToolAdmissionSession;
	/** Session-level narrowing: an explicit list wins over the default set. */
	readonly restrictToolNames: boolean;
	/**
	 * The requested list, or undefined when the default set applies.
	 *
	 * Held by reference, never snapshotted: callers push into it after building
	 * the context (the `yield` auto-include does exactly that), and the rules
	 * only ever test it for identity, so a copy would answer a different
	 * question than the one the auto-include is asking.
	 */
	readonly requestedTools: string[] | undefined;
	readonly includeYield: boolean;
	readonly enableLsp: boolean;
	readonly goalEnabled: boolean;
	readonly externalThinkingActive: boolean;
	readonly allowEval: boolean;
}

export type ToolAdmissionRule = (context: ToolAdmissionContext) => boolean;

/** Depth-gated tools: a child agent gets them only when it named them itself. */
const requestedAtAnyDepth = (context: ToolAdmissionContext): boolean =>
	(context.session.taskDepth ?? 0) === 0 || context.requestedTools !== undefined;

const MEMORY_BACKENDS_WITH_TOOLS = ["hindsight", "mnemopi"];

/**
 * Every built-in and hidden tool, keyed by name.
 *
 * `satisfies` against the full name union is the load-bearing part: adding a tool
 * to `BUILTIN_TOOL_NAMES` without deciding its admission is a compile error, not
 * a runtime surprise.
 */
const ADMISSION_RULES = {
	// Never in the default set. Explicitly activatable while goal.enabled and no
	// goal record exists yet — /guided-goal enables it so the agent can finish the
	// interview with `goal create`, which turns goal mode on. Once a goal record
	// exists, only an enabled goal keeps the tool: a completed (exiting) or paused
	// goal must stop advertising it on the next rebuild.
	goal: context => {
		if (!context.goalEnabled || context.restrictToolNames) return false;
		const goalState = context.session.getGoalModeState?.();
		return goalState === undefined || goalState.enabled === true || goalState.goal.status === "dropped";
	},

	lsp: context => context.enableLsp && cfgLspEnabled.get(context.session.settings),
	bash: context => cfgBashEnabled.get(context.session.settings),
	eval: context => context.allowEval,
	debug: context => cfgDebugEnabled.get(context.session.settings),
	ida: context => cfgIdaAvailable.get(context.session.settings),
	// A child that pre-walked is mid-interview: yielding would strand it.
	todo: context =>
		(!context.includeYield || context.session.prewalkArmed === true) && cfgTodoEnabled.get(context.session.settings),
	glob: context => cfgGlobEnabled.get(context.session.settings),
	grep: context => cfgGrepEnabled.get(context.session.settings),
	find: context => isFindEnabled(context.session as Parameters<typeof isFindEnabled>[0]),
	github: context => cfgGithubEnabled.get(context.session.settings),
	ast_grep: context => cfgAstGrepEnabled.get(context.session.settings),
	ast_edit: context => cfgAstEditEnabled.get(context.session.settings),
	web_search: context => cfgWebSearchEnabled.get(context.session.settings),
	security_scan: context => cfgSecurityEnabled.get(context.session.settings),
	think: context => context.externalThinkingActive,
	ask: context => cfgAskEnabled.get(context.session.settings),
	context_notes: context => cfgCompactionExperimentalContextManagement.get(context.session.settings),
	new_context: context => cfgCompactionExperimentalContextManagement.get(context.session.settings),
	checkpoint: context => cfgCheckpointEnabled.get(context.session.settings) && requestedAtAnyDepth(context),
	rewind: context => cfgCheckpointEnabled.get(context.session.settings) && requestedAtAnyDepth(context),
	wait: context =>
		cfgAsyncEnabled.get(context.session.settings) ||
		(context.session.enableIrc !== false && isIrcEnabled(context.session.settings, context.session.taskDepth ?? 0)) ||
		cfgLaunchEnabled.get(context.session.settings),
	retain: context => MEMORY_BACKENDS_WITH_TOOLS.includes(cfgMemoryBackend.get(context.session.settings)),
	recall: context => MEMORY_BACKENDS_WITH_TOOLS.includes(cfgMemoryBackend.get(context.session.settings)),
	reflect: context => MEMORY_BACKENDS_WITH_TOOLS.includes(cfgMemoryBackend.get(context.session.settings)),
	memory_edit: context => cfgMemoryBackend.get(context.session.settings) === "mnemopi",
	manage_skill: context => cfgAutolearnEnabled.get(context.session.settings) && requestedAtAnyDepth(context),
	learn: context =>
		cfgAutolearnEnabled.get(context.session.settings) &&
		requestedAtAnyDepth(context) &&
		[...MEMORY_BACKENDS_WITH_TOOLS, "local"].includes(cfgMemoryBackend.get(context.session.settings)),
	task: context =>
		canSpawnAtDepth(cfgTaskMaxRecursionDepth.get(context.session.settings), context.session.taskDepth ?? 0),

	// Unconditional built-ins. Listed explicitly rather than falling through,
	// so "always admitted" is a claim on the record that a later settings gate can
	// contradict, instead of the absence of a branch.
	read: () => true,
	edit: () => true,
	write: () => true,

	// Hidden tools: reach the model only when something above asked for them.
	yield: () => true,
} satisfies Record<BuiltinToolName | HiddenToolName, ToolAdmissionRule>;

/**
 * The rules, as a Map rather than the object above.
 *
 * A plain object literal answers `ADMISSION_RULES["toString"]` with
 * `Object.prototype.toString`, which is truthy — so a tool name reaching this
 * table as `"toString"` or `"__proto__"` would be ADMITTED by an inherited
 * member rather than by a decision. `Map.get` has no prototype, so an unknown
 * name falls through to the `?? true` default instead.
 */
export const TOOL_ADMISSION: ReadonlyMap<string, ToolAdmissionRule> = new Map(Object.entries(ADMISSION_RULES));

/**
 * Whether `name` may be constructed. Unknown names are admitted.
 *
 * Registration is open (`registerBuiltinTool`), so a runtime-registered tool has
 * no entry here by construction; refusing unknown names would make that seam
 * dead. The built-in names are covered by the `satisfies` above instead.
 */
export function isToolAdmitted(name: string, context: ToolAdmissionContext): boolean {
	return TOOL_ADMISSION.get(name)?.(context) ?? true;
}
