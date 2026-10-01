/**
 * DRAFT — W13 Rule A. Reports; does not gate. Not wired into `check:ts`.
 *
 * Rule A: every `.md` file that still carries the legacy display token must
 * either be on the legacy allow-list or get changed by the sweep. This is the
 * half of W13 that can be written before the sweep itself runs; the other two
 * rules are not written here because their shape depends on decisions that are
 * still open (see `docs` note below).
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
 * the bead's acceptance criterion 6 describes. What remains is the real work:
 * 138 files, of which 92 are `docs/**` — documentation users actually read.
 *
 * NOTE `\b` IN BRE
 * ----------------
 * The pattern must NOT be passed with `-E`. In BRE `\b` is a word boundary; in
 * POSIX ERE it is a backspace character, and the pattern silently matches
 * nothing. This class of "the tool says the corpus is empty and it is really
 * not" failure looks exactly like a clean scan.
 *
 * NOT YET DECIDED (blocking a real gate)
 * ---------------------------------------
 * The `.lavish` tree is excluded here as the working assumption, pending one
 * line from the owner: are 251 committed work-log files in scope for the rename
 * sweep? If
 * the answer is yes, this exclusion is wrong and the sweep has to touch them.
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

/** The legacy token. Word-bounded on both sides — see the `-E` note above. */
const LEGACY_TOKEN = /\bomp\b/g;

export function isExcluded(relPath: string): boolean {
	if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) return true;
	if (EXCLUDED_ROOT.test(relPath)) return true;
	return EXCLUDED_FILES.test(relPath);
}

export interface RuleAViolation {
	readonly path: string;
	readonly occurrences: number;
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

if (import.meta.main) {
	const root = process.argv[2] ?? process.cwd();
	const violations = await scanRuleA(root);
	const occurrences = violations.reduce((sum, v) => sum + v.occurrences, 0);
	for (const violation of violations) {
		process.stdout.write(`REPORT ruleA ${violation.occurrences} ${violation.path}\n`);
	}
	process.stdout.write(`REPORT ruleA total ${violations.length} files, ${occurrences} occurrences\n`);
	process.stdout.write(
		`REPORT ruleA draft — reporting only, exit 0; the 25-line allow-list budget is unmet until the sweep runs\n`,
	);
}
