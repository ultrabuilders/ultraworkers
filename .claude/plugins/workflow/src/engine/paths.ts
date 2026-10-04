/**
 * Filesystem layout for workflow state.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw)
 * `src/workflow-paths.ts`, all 65 lines, with ONE string changed:
 *
 *     WORKFLOW_HOME_RELATIVE_DIR   ".pi/workflows"  ->  ".ultraworkers/workflows"
 *
 * New writes live under the user's workflow home so projects do not get scattered
 * per-directory state. Project-scoped state is still isolated by a stable cwd-derived
 * namespace.
 *
 * ## Why `legacyRunsDir`/`legacySavedDir` keep the `.pi` spelling
 *
 * That is deliberate and is not an oversight. They name where the PREVIOUS version wrote,
 * which is what a migration reads from — pointing them at today's directory would make the
 * migration look for files where the new version already put them and find its own output.
 * They are the only two strings in this file that still say `.pi`.
 *
 * ## Why the two constants are declared here rather than imported
 *
 * The reference reads `WORKFLOW_RUNS_DIR`/`WORKFLOW_SAVED_DIR` from `./config.js`. That module
 * is not part of this phase's cut (it carries the whole run configuration surface), so the two
 * values are declared locally with the reference's own values, renamed for consistency. When
 * the config surface lands, these two lines are what fold back into an import — they are the
 * only coupling this file has to the rest of the reference.
 */
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

/** New state lives here, relative to the user's home. */
export const WORKFLOW_HOME_RELATIVE_DIR = ".ultraworkers/workflows";

/** The pre-rename per-project locations, kept only so a migration can find them. */
const WORKFLOW_RUNS_DIR = ".pi/workflows/runs";
const WORKFLOW_SAVED_DIR = ".pi/workflows/saved";

export const WORKFLOW_PROJECTS_SUBDIR = "projects";

export interface WorkflowProjectPaths {
	key: string;
	rootDir: string;
	runsDir: string;
	savedDir: string;
	settingsPath: string;
	modelTiersPath: string;
	legacyRunsDir: string;
	legacySavedDir: string;
}

export function workflowHomeDir(): string {
	return join(homedir(), WORKFLOW_HOME_RELATIVE_DIR);
}

export function workflowUserSavedDir(): string {
	return join(workflowHomeDir(), "saved");
}

/**
 * A stable, collision-free directory name for a project.
 *
 * The slug alone is not an identity: `~/work/api` and `~/oss/api` are different projects that
 * sanitize to the same `api`, so one would read the other's runs. The hash of the RESOLVED
 * path is what separates them, and resolving first is load-bearing — `~/work/../work/api` and
 * `~/work/api` are one project and must get one key.
 */
export function workflowProjectKey(cwd: string): string {
	const projectPath = resolve(cwd);
	const slug = sanitizePathSegment(basename(projectPath) || "project");
	const hash = createHash("sha256").update(projectPath).digest("hex").slice(0, 12);
	return `${slug}-${hash}`;
}

export function workflowProjectPaths(cwd: string): WorkflowProjectPaths {
	const key = workflowProjectKey(cwd);
	const rootDir = join(workflowHomeDir(), WORKFLOW_PROJECTS_SUBDIR, key);
	return {
		key,
		rootDir,
		runsDir: join(rootDir, "runs"),
		savedDir: join(rootDir, "saved"),
		settingsPath: join(rootDir, "settings.json"),
		modelTiersPath: join(rootDir, "model-tiers.json"),
		legacyRunsDir: resolve(cwd, WORKFLOW_RUNS_DIR),
		legacySavedDir: resolve(cwd, WORKFLOW_SAVED_DIR),
	};
}

function sanitizePathSegment(value: string): string {
	const sanitized = value
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return sanitized || "project";
}
