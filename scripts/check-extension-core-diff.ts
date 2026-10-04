#!/usr/bin/env bun
/**
 * GATE — layer 1 of the extension-seam guard: an extension may not cost a core change.
 *
 * WHY THIS EXISTS
 * ---------------
 * AGENTS.md sets one criterion for this programme: "an extension written **outside this repo**
 * installs and registers a tool + slash command + config key + lifecycle hook + TUI panel
 * **without changing a single line of core**." Every milestone exists to move that sentence
 * from aspirational to true, and this is the sentence written down as something that runs.
 *
 * It is layer 1 of three, and it is the only one that needs no runtime. The other two —
 * that the five seams are actually REACHED, and that they produce observable behaviour —
 * live in the seam test. This layer is here because it is the cheap one, and because it must
 * go red **at the bead that breaks it** rather than at the end of the epic.
 *
 * The failure this shape is copied from: `epic-jwsy.11` shipped a correct, tested, never-reached
 * peer fence, and `epic-jwsy.14` shipped a baseline gate that abstained (VOID) and exited 0, so
 * a CI badge read "pass" while no verdict was ever reached. Both are "green because nothing
 * reaches it". So the rule this file is written to is the one those two broke: **a gate that
 * cannot measure must not report success.** See `resolveBase` for what happens instead.
 *
 * WHAT COUNTS
 * -----------
 * Any changed path under `packages/`, verbatim from the bead:
 *
 *     git diff <base>...HEAD -- packages/ | grep -q . && exit 1
 *
 * `crates/` is deliberately NOT included, and that is a decision rather than an oversight.
 * The bead's criterion is `packages/`; widening it is a judgement call about whether
 * `crates/pi-natives` counts as "core" for this programme, and that call belongs to the
 * programme, not to a gate. If it is made, it is one line here plus a test row.
 *
 * COMMITTED WORK ONLY
 * -------------------
 * The unit of judgement is the commit, so the working tree is not consulted. This matters on a
 * shared tree: several agents work here at once, so `git status -- packages/` is routinely
 * non-empty from work that has nothing to do with this programme, and folding it in would make
 * the gate permanently red for everyone and therefore ignored. Uncommitted core edits are still
 * caught — by the next commit, which is when they become a claim about the codebase.
 */
import { $ } from "bun";
import * as path from "node:path";

/** The core tree, verbatim from the bead's layer-1 criterion. */
export const CORE_PREFIX = "packages/";

/**
 * Env vars that name the commit to measure from, in priority order.
 *
 * `ULTRAWORKERS_TEST_DIFF_BASE` is the repo's existing convention: `ci-test-ts.ts` reads it
 * (and CI sets it to `github.event.pull_request.base.sha` on every TS test job). Reusing the
 * name rather than inventing one is deliberate — a second spelling of the same idea is how the
 * two-lists-that-drift problem this repo already paid for happens again.
 */
const BASE_ENV_VARS = ["ULTRAWORKERS_SEAM_BASE", "ULTRAWORKERS_TEST_DIFF_BASE"] as const;

/**
 * The core paths among a list of changed paths.
 *
 * Exported and pure so the self-test can assert the predicate without standing up a repository —
 * but the self-test also builds a real repo, because the git plumbing around it is exactly the
 * part a mock would not cover.
 *
 * Both spellings of the prefix are accepted on purpose: git prints POSIX separators, but a
 * caller that assembled the list on Windows has `packages\coding-agent`. A gate that only
 * understood one of them would read a real core change as clean on the other platform, which is
 * the failure mode this whole file exists to prevent.
 */
export function coreDiffPaths(changed: readonly string[]): string[] {
	return changed.filter(entry => {
		const normalized = entry.replaceAll("\\", "/");
		return normalized === CORE_PREFIX.slice(0, -1) || normalized.startsWith(CORE_PREFIX);
	});
}

/** Where a measurement came from, for the line the gate prints when it is clean. */
export type BaseSource = "env" | "merge-base" | "unresolvable";

export interface ResolvedBase {
	readonly base: string | undefined;
	readonly source: BaseSource;
}

/**
 * Find the commit to diff from, or report that we cannot.
 *
 * The failure modes are deliberately not collapsed into "no base ⇒ clean":
 *
 * - a blank env var means the caller computed no base (a push to `main` sets it empty), which
 *   is not a reason to distrust the merge-base fallback, so the fallback still runs;
 * - a merge-base that cannot be computed — a clone with no `origin`, a detached tree — means
 *   the gate genuinely cannot tell a clean tree from a dirty one. Returning "clean" there is
 *   the abstention-as-success bug in its purest form, so this returns `unresolvable` and the
 *   caller exits NON-ZERO. A gate that cannot run must be loud, not green.
 */
export async function resolveBase(repoRoot: string): Promise<ResolvedBase> {
	for (const name of BASE_ENV_VARS) {
		const value = Bun.env[name]?.trim();
		if (value) return { base: value, source: "env" };
	}
	const merged = await $`git merge-base origin/main HEAD`.cwd(repoRoot).quiet().nothrow();
	const base = merged.exitCode === 0 ? merged.text().trim() : "";
	return base ? { base, source: "merge-base" } : { base: undefined, source: "unresolvable" };
}

/** Changed paths under the core tree since `base`, or `undefined` if git would not say. */
async function changedPathsSince(repoRoot: string, base: string): Promise<string[] | undefined> {
	const diff = await $`git diff --name-only ${base}...HEAD`.cwd(repoRoot).quiet().nothrow();
	if (diff.exitCode !== 0) return undefined;
	return diff
		.text()
		.split("\n")
		.map(line => line.trim())
		.filter(Boolean);
}

export async function runGate(repoRoot: string): Promise<number> {
	const { base, source } = await resolveBase(repoRoot);

	if (base === undefined) {
		console.error("extension-core-diff: CANNOT MEASURE — no base commit to diff from.");
		console.error(`  Tried ${BASE_ENV_VARS.join(" and ")}, then \`git merge-base origin/main HEAD\`.`);
		console.error("  This is reported as a FAILURE on purpose. A guard that cannot reach its");
		console.error("  subject and exits 0 is the shape of epic-jwsy.14, and a green badge over an");
		console.error("  unmeasured tree is worse than a red one: it is read as evidence.");
		return 1;
	}

	const changed = await changedPathsSince(repoRoot, base);
	if (changed === undefined) {
		console.error(`extension-core-diff: CANNOT MEASURE — \`git diff ${base}...HEAD\` failed.`);
		return 1;
	}

	const core = coreDiffPaths(changed);
	if (core.length > 0) {
		console.error(`extension-core-diff: FAIL — ${core.length} core path(s) changed since ${base} (${source}).`);
		console.error("\nAn extension may not cost a line of core. The criterion is verbatim:");
		console.error("  an extension written outside this repo registers its surfaces without");
		console.error("  changing a single line of core.\n");
		for (const file of core) console.error(`  ${file}`);
		console.error("\nIf this change is genuinely core work that must land, it does not belong");
		console.error("behind this gate — it belongs in a change of its own, with its own review.");
		return 1;
	}

	console.log(
		`extension-core-diff: PASS — 0 core paths since ${base} (${source}); ${changed.length} path(s) changed overall.`,
	);
	return 0;
}

if (import.meta.main) process.exit(await runGate(path.resolve(import.meta.dir, "..")));
