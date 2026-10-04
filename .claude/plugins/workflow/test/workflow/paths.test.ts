/**
 * Which directory a run's state lands in.
 *
 * `workflowProjectKey` is not cosmetic plumbing: it is the identity a run's journal, lease and
 * saved scripts are filed under. Two keys that collide put one project's runs where another's
 * resume looks for them, and the failure is silent — a resume that finds a foreign journal
 * either replays the wrong run or reports "nothing to resume" for a run that is mid-flight.
 *
 * So these rows defend the two ways a key can go wrong, both of which are plausible and neither
 * of which is visible in the happy path:
 *
 * - **collision** — the slug alone is not an identity, because `~/work/api` and `~/oss/api` are
 *   different projects that sanitize to the same `api`.
 * - **instability** — the same project reached by two spellings must produce ONE key, or a
 *   process that computed the key before and after a `..` segment writes to two directories.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { workflowHomeDir, workflowProjectKey, workflowProjectPaths } from "../../src/engine/paths";

describe("workflow project paths", () => {
	test("two projects with the same basename do not share a key", () => {
		// WHY: the slug is derived from the basename alone, so without the hash these two are
		// the same string. One project's runs would then be resumed as the other's — a resume
		// reading a foreign journal, which replays the wrong work or claims there is none.
		const work = workflowProjectKey(path.join("/tmp", "work", "api"));
		const oss = workflowProjectKey(path.join("/tmp", "oss", "api"));

		expect(work).not.toBe(oss);
		// The slug half is still the basename, so the directory a human reads stays meaningful.
		expect(work.startsWith("api-")).toBe(true);
		expect(oss.startsWith("api-")).toBe(true);
	});

	test("the same project reached by two spellings gets one key", () => {
		// WHY resolution happens before hashing: `..` segments are a spelling, not a location.
		// If the hash were taken over the raw argument, a caller that expanded a path would
		// silently get a second directory for the same project — and every run filed under the
		// old spelling becomes unreachable to resume.
		const direct = workflowProjectKey("/tmp/work/api");
		const roundabout = workflowProjectKey("/tmp/work/nested/../api");

		expect(roundabout).toBe(direct);
	});

	test("a basename that sanitizes to nothing still yields a usable key", () => {
		// WHY through the public API: the sanitizer is module-private, so the observable contract
		// is what `workflowProjectKey` does with a name it cannot keep. `"!!!"` lowercases and
		// collapses to `""` once the character class and the trim have run. Without the
		// `|| "project"` fallback that empty slug becomes an empty path SEGMENT, and joining it
		// into the projects directory resolves to the parent — putting one project's runs where
		// every other project's live.
		const key = workflowProjectKey(path.join("/tmp", "!!!"));

		expect(key.startsWith("project-")).toBe(true);
		expect(key).not.toBe("-");
	});

	test("run state nests under one root keyed by the project key", () => {
		// WHY this row and not a string check on the home constant: a consumer reads these four
		// paths to find a journal, a lease and a saved script, and what matters is that they
		// share ONE root under the project key. Asserting the constant alone would pass for a
		// layout where the three directories had drifted apart.
		const paths = workflowProjectPaths("/tmp/work/api");

		expect(paths.rootDir).toBe(path.join(workflowHomeDir(), "projects", paths.key));
		expect(paths.runsDir).toBe(path.join(paths.rootDir, "runs"));
		expect(paths.savedDir).toBe(path.join(paths.rootDir, "saved"));
		expect(paths.settingsPath).toBe(path.join(paths.rootDir, "settings.json"));
	});

	test("legacy paths still name the pre-rename location", () => {
		// WHY: these two are the migration's only input. If a rename sweep "helpfully" updated
		// them to the new directory, the migration would look for old runs where the new version
		// writes its own — find its own output, and report every legacy run as missing.
		const paths = workflowProjectPaths("/tmp/work/api");

		expect(paths.legacyRunsDir).toBe(path.resolve("/tmp/work/api", ".pi/workflows/runs"));
		expect(paths.legacySavedDir).toBe(path.resolve("/tmp/work/api", ".pi/workflows/saved"));
	});
});
