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
 * ## The constants moved to ../config — the fold this file's docblock promised
 *
 * The three path constants were declared here with a note that they would "fold back into an
 * import" when the config surface landed. That has happened, so they are imported now and this
 * file holds only the layout maths. The dependency runs config -> paths and never back: `config`
 * owns `WORKFLOW_HOME_RELATIVE_DIR`, so importing the other two here cannot form a cycle.
 *
 * `WORKFLOW_RUNS_DIR` / `WORKFLOW_SAVED_DIR` keep their `.pi` spelling on purpose — they name
 * where the PREVIOUS version wrote, which is what a migration reads from. Repointing them at
 * today's directory would make a migration look for files the new version already put them in,
 * and find its own output.
 */
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { WORKFLOW_HOME_RELATIVE_DIR, WORKFLOW_RUNS_DIR, WORKFLOW_SAVED_DIR } from "../config";

export { WORKFLOW_HOME_RELATIVE_DIR };

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
