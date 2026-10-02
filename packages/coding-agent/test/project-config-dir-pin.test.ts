/**
 * The project-scoped config directory is PINNED; the home-scoped one is not.
 *
 * Two code paths used to answer "where is this project's config directory?"
 * independently: discovery's `SOURCE_PATHS.native.projectDir` and the OMFG
 * controller's project-level rule path, the latter spelled out by hand as
 * `join(cwd, CONFIG_DIR_NAME, "rules", …)`. Both read the HOME-scoped constant,
 * which happens to be `".omp"` today and is exactly the one the rename milestone
 * intends to flip to `".ultraworkers"`. When that flip lands, a project rule
 * lookup would silently start resolving `<repo>/.ultraworkers/rules/x.md` and
 * orphan every `.omp/rules/*.md` already committed to a user's repository.
 *
 * The controller now goes through the `getProjectAgentDir()` accessor instead of
 * repeating the join, so `PROJECT_AGENT_DIR_NAME` has exactly one reader left
 * and the hand-rolled copy is unrepresentable rather than merely correct today.
 * These rows defend the constant and the discovery table that still names it.
 *
 * **What these rows cannot do, stated plainly so nobody over-trusts them:**
 * `CONFIG_DIR_NAME` and `PROJECT_AGENT_DIR_NAME` are both `".omp"` right now, so
 * no assertion on a resulting path can tell a correct binding from one that still
 * points at the home constant. What the rows do defend is the class that IS
 * observable today: the project directory following the home-side rename, and the
 * two readers drifting apart. The structural guarantee is the constant's own
 * docblock in `packages/utils/src/dirs.ts`, which says why it is not derived from
 * `CONFIG_DIR_NAME` — a comment is not a test, and this file is not pretending
 * otherwise.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { SOURCE_PATHS } from "@oh-my-pi/pi-coding-agent/discovery/helpers";
import { getConfigWriteRootName, getProjectAgentDir, PROJECT_AGENT_DIR_NAME } from "@oh-my-pi/pi-utils";

describe("the project-scoped config directory", () => {
	test("is not the home-scoped write root, which the rename is already moving", () => {
		// The regression this whole work item exists to prevent. The home write root
		// is already `".ultraworkers"` — the migration half of the rename has landed,
		// and only the project-side pin is holding. If a project-scoped reader ever
		// starts resolving the home name again, this is the row that catches it.
		expect(PROJECT_AGENT_DIR_NAME).not.toBe(getConfigWriteRootName());
		expect(SOURCE_PATHS.native.projectDir).not.toBe(getConfigWriteRootName());
	});

	test("resolves the same directory through every reader that depends on it", () => {
		// The drift contract. `getProjectAgentDir()` is the accessor every caller
		// reaches for; `SOURCE_PATHS.native.projectDir` is the table discovery walks.
		// When those disagree, a plugin installed in one location is invisible to
		// the other, and nothing else in the suite notices.
		const fromAccessor = path.basename(getProjectAgentDir("/repo"));
		expect(SOURCE_PATHS.native.projectDir).toBe(fromAccessor);
		expect(SOURCE_PATHS.native.projectDir).toBe(PROJECT_AGENT_DIR_NAME);
	});

	test("is a per-project directory, not a second home root", () => {
		// The distinction that makes the pin necessary at all: this one lives inside
		// the user's repository and is committed to git, so renaming it rewrites
		// their working tree rather than moving machine-local state.
		expect(getProjectAgentDir("/repo")).toBe(path.join("/repo", PROJECT_AGENT_DIR_NAME));
		expect(path.isAbsolute(getProjectAgentDir("/repo"))).toBe(true);
		expect(getConfigWriteRootName()).not.toBe(PROJECT_AGENT_DIR_NAME);
	});
});

const tempHomes: string[] = [];

afterEach(async () => {
	for (const dir of tempHomes.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

/**
 * Ask a process with an EMPTY home where each config level resolves to.
 *
 * The two levels are supposed to answer differently: the user level follows the
 * home rename, the project level is pinned. On a machine carrying pre-migration
 * state they are the same string, so this row would pass against the defect it
 * exists to catch. An empty home is the only condition that tells them apart.
 *
 * A subprocess, because `os.homedir()` is bound at process start — assigning
 * `process.env.HOME` mid-test changes nothing, and the row would go green while
 * quietly measuring the developer's own machine instead of the fixture.
 */
async function resolveBothLevels(cwd: string): Promise<{ user: string; project: string; userName: string }> {
	const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "omp-pin-home-")));
	tempHomes.push(home);

	const script = [
		'import { getConfigAgentDirName } from "@oh-my-pi/pi-utils";',
		'import { getConfigDirs } from "@oh-my-pi/pi-coding-agent/config";',
		"const cwd = " + JSON.stringify(cwd) + ";",
		'const first = (o) => getConfigDirs("probe", o)[0]?.path ?? "";',
		"process.stdout.write(JSON.stringify({",
		"\tuser: first({ cwd, user: true, project: false }),",
		"\tproject: first({ cwd, user: false, project: true }),",
		"\tuserName: getConfigAgentDirName(),",
		"}));",
	].join("\n");

	const proc = Bun.spawn(["bun", "-e", script], {
		cwd: process.cwd(),
		env: { ...process.env, HOME: home, XDG_CONFIG_HOME: "", XDG_DATA_HOME: "" },
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	if ((await proc.exited) !== 0) throw new Error("probe failed: " + stderr);
	return JSON.parse(stdout) as { user: string; project: string; userName: string };
}

describe("the two config levels, resolved on a machine that has neither directory", () => {
	test("the user level follows the home rename while the project level stays pinned", async () => {
		const cwd = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "omp-pin-cwd-")));
		tempHomes.push(cwd);

		const resolved = await resolveBothLevels(cwd);

		// Precondition: the two levels must actually differ here, or the row below
		// proves nothing. Asserted rather than assumed, for the same reason.
		expect(resolved.userName).not.toBe(PROJECT_AGENT_DIR_NAME);

		// The user level is allowed to move — it is machine-local state.
		expect(resolved.user).toContain(path.join(resolved.userName, "probe"));
		// The project level is not: this directory is in the user's repository.
		expect(resolved.project).toBe(path.join(cwd, PROJECT_AGENT_DIR_NAME, "probe"));
	});
});
