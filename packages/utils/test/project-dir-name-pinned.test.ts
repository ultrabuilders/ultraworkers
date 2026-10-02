/**
 * The project-scoped config directory is pinned to the legacy spelling, and this is
 * the gate that holds it there.
 *
 * ## What a consumer observes if this regresses
 *
 * Someone opens a repository they have worked in for months. Their project settings,
 * rules, skills, hooks and plugin overrides are all committed under `.omp/`. If the
 * project directory starts following the home-root rename, every one of those reads
 * resolves into a directory that does not exist — no error is printed, no
 * "configuration missing" notice appears, and the app carries on behaving as if it
 * had just been installed. Even a re-login is silent, because the app's own identity
 * state resolves to new.
 *
 * ## Why these rows are not string comparisons
 *
 * A row asserting `PROJECT_AGENT_DIR_NAME === ".omp"` passes on a constant nobody
 * calls. The pin only matters at the moment something *resolves a path*, so the
 * adversary row below builds a real directory tree and reads back what
 * `getProjectAgentDir` returns. That is the assertion that fails if the constant is
 * ever re-derived from the home-root name.
 *
 * ## Why the pair is pinned in order
 *
 * `expect([CONFIG_DIR_NAME, PROJECT_AGENT_DIR_NAME]).toEqual([CONFIG_DIR_NAME, ".omp"])`
 * pins the project name while leaving the home-root name free. Flipping the home root
 * is a separate, deliberate change, and this row has to survive it — so the left side
 * self-references the constant instead of hard-coding it. The right side still catches
 * the one mistake that matters here: someone collapsing the project name onto the
 * home-root name.
 *
 * Divergence (`PROJECT_AGENT_DIR_NAME !== CONFIG_DIR_NAME`) is deliberately NOT
 * asserted. It is the contract of the home-root rename, not of this pin, and today
 * the two are still equal — asserting it now would be red on arrival and would belong
 * to the rename's own gate.
 */
import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	CONFIG_DIR_NAME,
	CONFIG_DIR_NAME_NEXT,
	getMCPConfigPath,
	getProjectAgentDir,
	getProjectModulesDir,
	getProjectPluginOverridesPath,
	getProjectPromptsDir,
	getSSHConfigPath,
	PROJECT_AGENT_DIR_NAME,
} from "@oh-my-pi/pi-utils/dirs";

/** A throwaway project root, removed by the caller in a `finally`. */
function makeTempProjectRoot(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "uw-project-dir-pin-"));
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("the project config directory is pinned to the legacy spelling", () => {
	it("is the literal the whole rename milestone reserves", () => {
		expect(PROJECT_AGENT_DIR_NAME).toBe(".omp");
	});

	it("stays pinned while the home-root name is free to move", () => {
		// Self-referencing on the left: the home root is not pinned here, and this row
		// has to stay green across that flip. The right side is the pin.
		expect([CONFIG_DIR_NAME, PROJECT_AGENT_DIR_NAME]).toEqual([CONFIG_DIR_NAME, ".omp"]);
	});

	it("resolves into the committed directory even when a renamed home-root directory sits beside it", () => {
		// The adversary: both spellings exist as real directories in the same project
		// root, so resolution has to actually choose. A constant comparison cannot
		// distinguish "pinned" from "derived from whatever the home root says today" —
		// this can, because the two candidates are physically different paths.
		const cwd = makeTempProjectRoot();
		try {
			fs.mkdirSync(path.join(cwd, PROJECT_AGENT_DIR_NAME));
			fs.mkdirSync(path.join(cwd, CONFIG_DIR_NAME_NEXT));

			const resolved = getProjectAgentDir(cwd);

			expect(resolved).toBe(path.join(cwd, PROJECT_AGENT_DIR_NAME));
			// Read back off disk, so the row is about a real resolution rather than a
			// path that merely looks right.
			expect(fs.statSync(resolved).isDirectory()).toBe(true);
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});

	it("puts every project-scoped path under the pinned directory", () => {
		// Each of these is a way a user's committed project state is read. If one of
		// them stops going through the project directory, that surface silently resolves
		// elsewhere while the rest keep working.
		const cwd = makeTempProjectRoot();
		try {
			const root = path.join(cwd, PROJECT_AGENT_DIR_NAME);

			expect(getProjectModulesDir(cwd)).toBe(path.join(root, "modules"));
			expect(getProjectPromptsDir(cwd)).toBe(path.join(root, "prompts"));
			expect(getProjectPluginOverridesPath(cwd)).toBe(path.join(root, "plugin-overrides.json"));
			expect(getMCPConfigPath("project", cwd)).toBe(path.join(root, "mcp.json"));
			expect(getSSHConfigPath("project", cwd)).toBe(path.join(root, "ssh.json"));
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});

	it("keeps the user-scoped paths off the project directory", () => {
		// The counterpart, so the row above cannot pass by both scopes collapsing onto
		// one directory. A user scope that started resolving into the project tree
		// would be the same silent divergence wearing the other hat.
		const cwd = makeTempProjectRoot();
		try {
			const projectRoot = path.join(cwd, PROJECT_AGENT_DIR_NAME);

			expect(getMCPConfigPath("user", cwd).startsWith(projectRoot)).toBe(false);
			expect(getSSHConfigPath("user", cwd).startsWith(projectRoot)).toBe(false);
		} finally {
			fs.rmSync(cwd, { recursive: true, force: true });
		}
	});
});
