/**
 * W13 Rule A — GATE. Every `.md` file that still carries the legacy display
 * token must either be on the legacy allow-list or have been changed by the
 * sweep.
 *
 * This was a DRAFT that only reported. It is now a gate: it prints `FAIL ruleA
 * <path>` per violation and exits non-zero, and it is wired into `check:ts`.
 * The gap it closes is the one that let the draft be "green" over 869
 * occurrences in 113 files — a scanner that reports is not a scanner anyone has
 * to answer to.
 *
 * WHY PATH EXCLUSION AND NOT JUST A BIGGER ALLOW-LIST
 * ----------------------------------------------------
 * Measured with `git grep -lI -e '\bomp\b' -- '*.md'`: 416 files. The naive
 * allow-list budget in the bead is 25 lines. Those two numbers cannot both
 * hold, because ~250 of the 416 are `.lavish*` work logs — a corpus with no
 * reader and no end, not documentation. An allow-list wide enough to hold them
 * is a gate that has stopped gating: it stays green no matter what anyone does.
 *
 * So the corpus is excluded BY PATH in the rule itself, which is the mechanism
 * the bead's acceptance criterion 6 describes. That choice also covers the two
 * runtime assets the bead requires be kept WITH a reason —
 * `packages/coding-agent/src/prompts/internal-urls/omp.md` is imported by
 * `omp-protocol.ts:10`, and `.omp/**` is runtime prompt corpus — since both
 * are excluded here by `EXCLUDED_PACKAGE_PATHS` and `EXCLUDED_PREFIXES`. They
 * are NOT in the allow-list, because an allow-list line means "a human looked at
 * this and accepted the legacy token", and nobody accepted these: they are not
 * documentation at all.
 *
 * NOTE `\b` IN BRE
 * ----------------
 * The pattern must NOT be passed with `-E`. In BRE `\b` is a word boundary; in
 * POSIX ERE it is a backspace character, and the pattern silently matches
 * nothing. This class of "the tool says the corpus is empty and it is really
 * not" failure looks exactly like a clean scan.
 *
 * NOT YET DECIDED (does not block the gate)
 * ------------------------------------------
 * The `.lavish` tree is excluded here as the working assumption, pending one
 * line from the owner: are 251 committed work-log files in scope for the rename
 * sweep? The gate is correct for the documentation surface either way — if the
 * answer is yes, the exclusion is wrong and the sweep has to touch them, which
 * surfaces as new failures rather than as a silently-passing check.
 */
import * as path from "node:path";

/** Path prefixes excluded from the rule, not from the allow-list. */
const EXCLUDED_PREFIXES = [".lavish-wip/", ".lavish/", ".omp/"];

/** Root-level plan documents: history, not shipped documentation. */
const EXCLUDED_ROOT = /^(?:[A-Z0-9_]*EXECUTION_PLAN\.md|PACKAGE_REORGANIZATION_PLAN\.md|COMPREHENSIVE_PLAN.*\.md)$/;

/**
 * Released changelogs are immutable per AGENTS.md, so they are excluded here
 * rather than pinned one-by-one in an allow-list that has a 25-line budget.
 */
const EXCLUDED_FILES = /(?:^|\/)CHANGELOG\.md$/;

/**
 * Markdown under a package's `src/` is RUNTIME PROMPT CORPUS, not
 * documentation: `import discoveryPrompt from "./prompts/discovery.md" with
 * { type: "text" }` puts it straight into a system prompt. Renaming a token
 * there changes what the model is told — a documentation sweep must never do
 * that. Markdown under `test/` is fixture text, owned by whoever writes the
 * test. Neither is in scope for a rename sweep, and a recursive markdown glob
 * puts both in scope by accident.
 */
const EXCLUDED_PACKAGE_PATHS = /^packages\/[^/]+\/(?:src|test|bench)\//;

/** The legacy token. Word-bounded on both sides — see the `-E` note above. */
const LEGACY_TOKEN = /\bomp\b/g;

export function isExcluded(relPath: string): boolean {
	if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) return true;
	if (EXCLUDED_ROOT.test(relPath)) return true;
	if (EXCLUDED_PACKAGE_PATHS.test(relPath)) return true;
	return EXCLUDED_FILES.test(relPath);
}

export interface RuleAViolation {
	readonly path: string;
	readonly occurrences: number;
}

/**
 * Repo-relative path of the allow-list. A line in it means a human accepted the
 * legacy token in that file; a violation not on it is a failure.
 */
const ALLOWLIST_PATH = "scripts/rename/docs-legacy-allowlist.txt";

/** One accepted path, with the occurrence count it was accepted at. */
export interface AllowlistEntry {
	readonly path: string;
	/**
	 * Occurrences accepted when the line was written, or `undefined` for a bare
	 * path (accepted at any count).
	 */
	readonly budget?: number;
}

/**
 * Read the allow-list. A MISSING file is an empty list, not a pass: the first
 * run of a gate has no allow-list yet, and treating "no allow-list" as "no
 * violations" would make the gate green precisely when it has nothing to say.
 *
 * Syntax: `path` or `path<TAB>N`. A bare path is accepted at any count; the
 * `<TAB>N` form pins the count so a file on the list cannot quietly regrow.
 * Inline `#` comments are NOT supported on a path line — a trailing comment
 * would become part of the path and silently stop matching, which fails open.
 * Reasons go on their own `#` line above the path.
 */
export async function loadAllowlist(root: string): Promise<AllowlistEntry[]> {
	const file = Bun.file(path.join(root, ALLOWLIST_PATH));
	if (!(await file.exists())) return [];
	const entries: AllowlistEntry[] = [];
	for (const line of (await file.text()).split("\n")) {
		const trimmed = line.trim();
		if (trimmed === "" || trimmed.startsWith("#")) continue;
		const tab = trimmed.indexOf("\t");
		if (tab === -1) {
			entries.push({ path: trimmed });
			continue;
		}
		const budget = Number(trimmed.slice(tab + 1).trim());
		entries.push(Number.isFinite(budget) ? { path: trimmed.slice(0, tab), budget } : { path: trimmed });
	}
	return entries;
}

/** Count legacy-token occurrences per markdown file, minus the excluded paths. */
export async function scanRuleA(root: string): Promise<RuleAViolation[]> {
	const glob = new Bun.Glob("**/*.md");
	const violations: RuleAViolation[] = [];
	for await (const relPath of glob.scan({ cwd: root, dot: true })) {
		if (isExcluded(relPath)) continue;
		const text = await Bun.file(path.join(root, relPath)).text();
		const matches = text.match(LEGACY_TOKEN);
		if (matches && matches.length > 0) violations.push({ path: relPath, occurrences: matches.length });
	}
	return violations.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Violations the gate fails on: anything not accepted, plus any accepted file
 * that has grown past the count it was accepted at.
 *
 * The allow-list is subtracted HERE rather than inside `scanRuleA`, so the scan
 * still reports the true corpus size. A gate that hides allowed files from its
 * own scan cannot tell "allowed" from "gone", and criterion 6 in the bead
 * depends on that distinction: it compares the allow-list length against the
 * number of files that still match.
 *
 * The budget is the part a bare allow-list cannot do. Measured: injecting one
 * more `omp` into an allow-listed file left the gate at exit 0, because the path
 * matched and nothing counted. An allow-list that silences a file forever is
 * how a rename sweep stops converging while still reading green.
 */
export function ungatedViolations(
	violations: readonly RuleAViolation[],
	allowlist: readonly AllowlistEntry[],
): RuleAViolation[] {
	const accepted = new Map(allowlist.map(entry => [entry.path, entry.budget]));
	return violations.filter(violation => {
		if (!accepted.has(violation.path)) return true;
		const budget = accepted.get(violation.path);
		return budget !== undefined && violation.occurrences > budget;
	});
}

/** Paths on the allow-list that no longer match anything — the sweep finished them. */
export function staleAllowlistEntries(
	violations: readonly RuleAViolation[],
	allowlist: readonly AllowlistEntry[],
): string[] {
	const seen = new Set(violations.map(violation => violation.path));
	return allowlist.map(entry => entry.path).filter(entry => !seen.has(entry));
}

if (import.meta.main) {
	const root = process.argv[2] ?? process.cwd();
	const violations = await scanRuleA(root);
	const allowlist = await loadAllowlist(root);
	const blocking = ungatedViolations(violations, allowlist);
	const stale = staleAllowlistEntries(violations, allowlist);
	const occurrences = violations.reduce((sum, v) => sum + v.occurrences, 0);
	for (const violation of blocking) {
		process.stdout.write(`FAIL ruleA ${violation.occurrences} ${violation.path}\n`);
	}
	for (const entry of stale) {
		process.stdout.write(`WARN ruleA stale ${entry} — on the allow-list but no longer matches; drop the line\n`);
	}
	process.stdout.write(
		`REPORT ruleA ${violations.length} files, ${occurrences} occurrences; ` +
			`${blocking.length} not on the allow-list, ${stale.length} stale (${ALLOWLIST_PATH})\n`,
	);
	if (blocking.length > 0) {
		process.stdout.write(
			`FAIL ruleA ${blocking.length} file(s) carry the legacy display token without an accepted reason. ` +
				`Rename them, or add the path to ${ALLOWLIST_PATH} WITH a comment saying why.\n`,
		);
		process.exit(1);
	}
}
