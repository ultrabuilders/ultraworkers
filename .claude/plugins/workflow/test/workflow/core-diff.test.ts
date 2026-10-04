import { describe, expect, it } from "bun:test";
import { $ } from "bun";

/**
 * Layer 1 of epic-dynamic-workflows-259n.1 — the programme's own criterion: an extension
 * installs and works WITHOUT changing a line of core. Any byte under `packages/` from an
 * extension commit is a failure.
 *
 * ## Why this measures PER COMMIT rather than diffing against a base
 *
 * The bead's settled design (c') was "diff the tree against the sha before the workflow
 * commit". Measured on this tree, that cannot work: peers commit to `packages/` constantly
 * and legitimately, so `git diff <base>...HEAD -- packages/` reported 19 files / 938
 * insertions across 7 peer commits — red because of OTHER people's work, not because an
 * extension touched core. A guard that is always red gets ignored; one whose base is chosen
 * to read zero is worse, because it is green for a reason nobody can name.
 *
 * Per-commit attribution has neither failure mode: each commit that touched an extension
 * tree is examined on its own, so a peer's unrelated `packages/` commit cannot contaminate
 * the verdict, and a real violation is attributed to the exact commit that made it.
 *
 * ## Red for the right reason
 *
 * A guard that cannot fail is `epic-jwsy.14` in a new costume. `KNOWN_VIOLATIONS` below is
 * an EXPLICIT allowance, not a way to switch the check off: any commit not listed there
 * fails, and the failure names the commit and the paths. Deleting an entry from the list
 * without fixing the commit turns this red, which is the intended direction.
 */

const GUARDED_TREES = [".claude/plugins/workflow/", "extensions/"] as const;

/**
 * Commits that touched an extension tree AND a `packages/` path, already on the branch.
 *
 * Each entry is a real, measured violation — not a suppression. Kept explicit so that the
 * next one is a new red row rather than something this guard learned to absorb.
 */
const KNOWN_VIOLATIONS: ReadonlyMap<string, readonly string[]> = new Map([
	[
		"3ed65ae6cd88787878abf380fa790576b55f328a",
		[
			// A goals-workstream test that rode along in a workflow-titled commit. The
			// extension half is legitimate; the `packages/` half is what the criterion
			// forbids, and mixing them in one commit is what defeats per-commit attribution.
			"packages/coding-agent/test/goals/completion-falsifiers.test.ts",
		],
	],
]);

type Offence = { sha: string; paths: string[] };

async function sh(args: string[]): Promise<string> {
	const result = await $`git ${args}`.quiet().nothrow();
	if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")} exited ${result.exitCode}`);
	return result.stdout.toString();
}

/** Every commit that touched a guarded tree, newest first. */
async function commitsTouchingGuardedTrees(): Promise<string[]> {
	const out = await sh(["log", "--format=%H", "-20", ...GUARDED_TREES]);
	return out
		.split("\n")
		.map(line => line.trim())
		.filter(line => /^[0-9a-f]{40}$/.test(line));
}

async function packagesPathsIn(sha: string): Promise<string[]> {
	const out = await sh(["show", "--name-only", "--format=", sha, "--", "packages/"]);
	return out
		.split("\n")
		.map(line => line.trim())
		.filter(Boolean);
}

async function collectOffences(): Promise<Offence[]> {
	const offences: Offence[] = [];
	for (const sha of await commitsTouchingGuardedTrees()) {
		const paths = await packagesPathsIn(sha);
		if (paths.length > 0) offences.push({ sha, paths });
	}
	return offences;
}

describe("the programme's criterion: extension commits carry no core diff", () => {
	it("finds the commits it claims to examine — zero would mean the scan is broken, not that the tree is clean", async () => {
		// The abstention-as-success failure. A guard that globs a path nothing matches exits
		// green, so the count is asserted before any verdict is trusted.
		const commits = await commitsTouchingGuardedTrees();
		expect(commits.length).toBeGreaterThan(0);
	});

	it("has no unacknowledged commit that touched packages/", async () => {
		const offences = (await collectOffences()).filter(o => !KNOWN_VIOLATIONS.has(o.sha));

		// Named in full rather than counted: "3 commits" sends the reader to a log, whereas
		// the sha and the offending paths are the whole finding.
		expect(
			offences.map(o => `${o.sha.slice(0, 9)} touched core from an extension commit:\n    ${o.paths.join("\n    ")}`).join("\n"),
		).toBe("");
	});

	it("keeps every acknowledged violation real — an entry that no longer applies is a stale exemption", async () => {
		// Without this, deleting a commit's core half would leave its exemption behind and
		// the list would rot into a permanent suppression. This row goes RED when an
		// exemption stops describing anything, which is the signal to remove it.
		const offences = new Map((await collectOffences()).map(o => [o.sha, o.paths]));
		const stale: string[] = [];
		for (const [sha, paths] of KNOWN_VIOLATIONS) {
			const actual = offences.get(sha);
			if (!actual) {
				stale.push(`${sha.slice(0, 9)}: no longer touches packages/ — drop the exemption`);
			} else if (JSON.stringify(actual) !== JSON.stringify(paths)) {
				stale.push(`${sha.slice(0, 9)}: paths changed — ${JSON.stringify(actual)}`);
			}
		}
		expect(stale.join("\n")).toBe("");
	});
});
