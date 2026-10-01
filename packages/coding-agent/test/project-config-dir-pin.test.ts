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
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { SOURCE_PATHS } from "@oh-my-pi/pi-coding-agent/discovery/helpers";
import {
	getConfigWriteRootName,
	getProjectAgentDir,
	PROJECT_AGENT_DIR_NAME,
} from "@oh-my-pi/pi-utils";

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
