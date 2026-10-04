/**
 * Configuration constants for the workflow engine.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw) `src/config.ts`, 55 lines,
 * with the adaptations below. Each is forced by this host, and each is recorded rather than
 * quietly folded in.
 *
 * ## What was dropped, and why
 *
 * `AGENTS_DIR` (".pi/agents") is NOT here. It names the directory `agent-registry.ts` reads, and
 * that module is a recorded cut: the reference's `AgentDefinition` / `resolveAgentType` have no
 * equivalent here. Porting the constant would leave a path with no reader, and a path with no
 * reader is the kind of thing a later agent trusts exists.
 *
 * ## Why the `.pi` spellings survive below
 *
 * Three constants still say `.pi` and two say `.ultraworkers`. The split is not an oversight:
 * the `.pi` ones name where the PREVIOUS version wrote, which is what a migration reads from.
 * Repointing them at today's directory would make a migration look for files the new version
 * already wrote, and find its own output.
 *
 * ## Why this file OWNS `WORKFLOW_HOME_RELATIVE_DIR`
 *
 * `./engine/paths` used to declare it locally and its own docblock promised these two constants
 * would "fold back into an import" once the config surface landed. That fold is one-directional
 * and this file is the top of it: if `paths` imported from here while here imported
 * `WORKFLOW_HOME_RELATIVE_DIR` back from `paths`, the two modules would form a cycle and the
 * legacy-path constants would be `undefined` for whichever module the runtime reached first.
 * So the constant lives here and `paths` reads it from here.
 */

/** New state lives here, relative to the user's home. Owned here; `./engine/paths` reads it. */
export const WORKFLOW_HOME_RELATIVE_DIR = ".ultraworkers/workflows";

/** Maximum number of agents allowed per workflow run. */
export const MAX_AGENTS_PER_RUN = 1000;

/** Default timeout for a single agent in milliseconds. null means no hard timeout. */
export const DEFAULT_AGENT_TIMEOUT_MS = null;

/** Maximum concurrent agents. */
export const MAX_CONCURRENCY = 16;

/** Maximum automatic retry attempts after a recoverable agent failure. */
export const MAX_AGENT_RETRIES = 3;

/** Default token budget if none specified. */
export const DEFAULT_TOKEN_BUDGET = null;

/**
 * Legacy project-relative directory for persisted workflow run state.
 *
 * Read-only, by a migration. New writes use `workflowProjectPaths()` from `./engine/paths`.
 */
export const WORKFLOW_RUNS_DIR = ".pi/workflows/runs";

/** Legacy project-relative directory for saved workflow commands. Read-only, by a migration. */
export const WORKFLOW_SAVED_DIR = ".pi/workflows/saved";

/** User-level saved workflows directory, home-relative. */
export const USER_WORKFLOW_SAVED_DIR = `${WORKFLOW_HOME_RELATIVE_DIR}/saved`;

/** User-level model tiers config file, relative to the home directory. */
export const MODEL_TIERS_FILE = `${WORKFLOW_HOME_RELATIVE_DIR}/model-tiers.json`;

/** User-level workflow extension settings file, relative to the home directory. */
export const WORKFLOW_SETTINGS_FILE = `${WORKFLOW_HOME_RELATIVE_DIR}/settings.json`;

/** Default keyword that arms workflows mode from interactive input. */
export const DEFAULT_KEYWORD_TRIGGER_WORD = "workflow";

/**
 * Normalize a user-configured keyword trigger word.
 *
 * Copied from `src/config.ts`, verbatim. The three rejections each close a different hole, so
 * none is decoration: a non-string is not a keyword; an empty or whitespace-only string would
 * arm on every keystroke boundary that happens to be empty; and a leading `/` or embedded space
 * would never match the way an operator expects a trigger word to match.
 */
export function normalizeKeywordTriggerWord(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const word = value.trim();
	if (!word || word.startsWith("/") || /\s/.test(word)) return undefined;
	return word;
}