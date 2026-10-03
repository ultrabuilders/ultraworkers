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
import { isEnoent } from "@oh-my-pi/pi-utils";
import { readGateArgsOrExit } from "./args";
import { isInsideNestedRepository, nestedRepoCache } from "./scan-scope";

/**
 * Path prefixes excluded from the rule, not from the allow-list.
 *
 * `node_modules/` is here because the scan below is a FILESYSTEM walk
 * (`Bun.Glob` with `dot: true`), not an index read, and a filesystem walk does
 * not consult `.gitignore`. Measured on this tree: the walk saw 1516 markdown
 * files where the repository actually has 972 — the 544-file difference was
 * entirely installed dependencies.
 *
 * That is not a style preference, it is a correctness problem. The corpus was
 * "whatever is installed", which varies with lockfile resolution and per-platform
 * optional deps, so the same commit could reach two verdicts on two machines —
 * and a violation would name a file nobody can legitimately allow-list, because
 * it is not this repository's. 278 of those 544 files already contained the
 * letter sequence inside longer words (`pr-omp-t`); none were word-bounded yet,
 * so the gate was green by a one-dependency margin.
 *
 * Excluding the directory does not change what the report counts: the 669
 * outstanding occurrences were always measured over the intended corpus, and
 * `node_modules` was never part of it. It only stops a third party's README
 * from being able to move the number.
 *
 * `.claude/` joins them for the reason measured in epic-wh2q: it holds **0
 * tracked files** (`git ls-files -- .claude` is empty), so excluding it costs no
 * coverage, while the tree walk reaches into it unconditionally. `EnterWorktree`
 * writes checkouts under `.claude/worktrees/`, and a directory there without a
 * `.git` entry is not a nested repository, so the nested-repository guard does
 * not catch it — probed both ways against `check-disposition`'s `hitPaths`, and
 * only the dot-directory shape was reported.
 *
 * This list is not the union of every dot-directory: `.omp/` and the `.lavish`
 * pair are excluded here for their own, different reasons (runtime prompt corpus
 * and work logs) and `.claude/` is excluded because it is not repository content
 * at all. Conflating those three would make the next exclusion unreviewable.
 */
const EXCLUDED_PREFIXES = [".lavish-wip/", ".lavish/", ".omp/", ".claude/", "node_modules/"];

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

/**
 * Build output, excluded for the same reason as `node_modules/` above: the scan
 * is a filesystem walk, so gitignored files reach the corpus, and a build
 * artefact is not documentation a human accepted or should review.
 *
 * The pattern mirrors `.gitignore:7-10` rather than guessing a shape — a bare
 * `dist` entry in EXCLUDED_PREFIXES would only match a repo-root one, since
 * that list is matched with `startsWith`. Scoped to the package prefix, so a
 * real top-level `docs` tree would still be scanned.
 *
 * Concretely: a build wrote a CHANGELOG under the coding-agent dist tree
 * carrying 198 legacy tokens, and the build hash in the filename means the
 * corpus differs per build — the same commit reaching two verdicts on two
 * machines, which is the correctness problem the `node_modules/` note describes.
 */
const EXCLUDED_BUILD_OUTPUT = /^packages\/[^/]+\/dist(?:-chrome|-firefox)?\//;

/** The legacy token. Word-bounded on both sides — see the `-E` note above. */
const LEGACY_TOKEN = /\bomp\b/g;

export function isExcluded(relPath: string): boolean {
	if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) return true;
	if (EXCLUDED_ROOT.test(relPath)) return true;
	if (EXCLUDED_PACKAGE_PATHS.test(relPath)) return true;
	if (EXCLUDED_BUILD_OUTPUT.test(relPath)) return true;
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
	/**
	 * The `#` comment block immediately above this path, joined.
	 *
	 * This field existed as a promise in the header before it existed as code: the
	 * file's own documentation said each entry was recorded "with the reason it is
	 * still outstanding", and the gate's failure message told a contributor to add
	 * a path "WITH a comment saying why" — while the parser discarded every `#`
	 * line. A documented reason that cannot be read is not a reason, and an
	 * allow-list of unreasoned paths is a list nobody can audit.
	 */
	readonly reason?: string;
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
 * Reasons go on their own `#` line above the path, and are now attached to it.
 */
export async function loadAllowlist(root: string): Promise<AllowlistEntry[]> {
	const file = Bun.file(path.join(root, ALLOWLIST_PATH));
	if (!(await file.exists())) return [];
	const entries: AllowlistEntry[] = [];
	let pending: string[] = [];
	for (const line of (await file.text()).split("\n")) {
		const trimmed = line.trim();
		if (trimmed === "") continue;
		if (trimmed.startsWith("#")) {
			// Accumulate the comment block; it belongs to the NEXT path line.
			//
			// `# ---` ends the run and discards anything pending, so the file's own
			// header block is never attached as the "reason" for the first real
			// entry. Without that separator the header's own words about the FORMAT
			// would be recorded as the justification for a specific path, which is
			// worse than having no reason: it looks audited and is not.
			if (trimmed === "# ---") {
				pending = [];
				continue;
			}
			pending.push(trimmed.replace(/^#\s?/, ""));
			continue;
		}
		const tab = trimmed.indexOf("\t");
		const reason = pending.length > 0 ? pending.join(" ") : undefined;
		pending = [];
		if (tab === -1) {
			entries.push({ path: trimmed, reason });
			continue;
		}
		const budget = Number(trimmed.slice(tab + 1).trim());
		entries.push(
			Number.isFinite(budget) ? { path: trimmed.slice(0, tab), budget, reason } : { path: trimmed, reason },
		);
	}
	return entries;
}

/**
 * Read one markdown file, distinguishing "definitely gone" from every other
 * read failure.
 *
 * Measured 2026-10-04: this scan walks the FILESYSTEM (see the `node_modules/`
 * note on `EXCLUDED_PREFIXES`), so it competes with anything else writing in the
 * tree. A peer's browser recording created and removed a scratch directory
 * mid-walk, the read threw `ENOENT`, and the gate died before printing a single
 * verdict — exit 1 with ZERO `FAIL ruleA` lines. That is the worst shape a gate
 * has: a reader sees a non-zero exit, concludes a documentation violation, and
 * goes hunting for a problem that does not exist. The re-run was clean.
 *
 * The classification matches `check-disposition.ts`'s `hitPaths`, which hit this
 * first: only ENOENT/ENOTDIR is a peer moving a file out from under the walk.
 * EACCES, EISDIR and EMFILE say the path is unreadable, which is a different
 * fault and is rethrown rather than folded into the same bucket — skipping those
 * would drop a file from the corpus and lower the count with no signal.
 */
export type MarkdownRead =
	| { readonly ok: true; readonly text: string }
	| { readonly ok: false; readonly vanished: true };

export async function readMarkdown(full: string): Promise<MarkdownRead> {
	try {
		return { ok: true, text: await Bun.file(full).text() };
	} catch (err) {
		if (isEnoent(err)) return { ok: false, vanished: true };
		throw err;
	}
}

/** The scan's result, plus the paths that were gone by the time they were read. */
export interface ScanResult {
	readonly violations: readonly RuleAViolation[];
	/**
	 * Paths the walk yielded and the read could not find. Reported rather than
	 * dropped: the count in the summary is otherwise silently short, and "the
	 * number was measured while the tree moved" is the one thing a reader of a
	 * filesystem-walk gate needs to know.
	 */
	readonly vanished: readonly string[];
}

/** Count legacy-token occurrences per markdown file, minus the excluded paths. */
export async function scanRuleAResult(root: string): Promise<ScanResult> {
	const glob = new Bun.Glob("**/*.md");
	const violations: RuleAViolation[] = [];
	const vanished: string[] = [];
	const nestedRepos = nestedRepoCache();
	for await (const relPath of glob.scan({ cwd: root, dot: true })) {
		if (isInsideNestedRepository(root, relPath, nestedRepos)) continue;
		if (isExcluded(relPath)) continue;
		const read = await readMarkdown(path.join(root, relPath));
		if (!read.ok) {
			vanished.push(relPath);
			continue;
		}
		const matches = read.text.match(LEGACY_TOKEN);
		if (matches && matches.length > 0) violations.push({ path: relPath, occurrences: matches.length });
	}
	return { violations: violations.sort((a, b) => a.path.localeCompare(b.path)), vanished };
}

/**
 * The violations alone, for callers that do not report on the scan's timing.
 * `scanRuleAResult` is the shape the CLI uses; this keeps the narrower contract
 * the existing callers and tests are written against.
 */
export async function scanRuleA(root: string): Promise<RuleAViolation[]> {
	return [...(await scanRuleAResult(root)).violations];
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
 * more `ultraworkers` into an allow-listed file left the gate at exit 0, because the path
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

/**
 * The gate reports two different things and conflating them is how it came to
 * read as a done signal: `blocking` is what FAILED the gate, while everything
 * the allow-list accepted is still carrying the legacy token in a file nobody
 * has classified yet. A run with zero blocking is "no regression", not "the
 * sweep is done", and the line has to say which it is — otherwise the count is
 * on screen but reads as a verdict about the allow-list rather than as
 * outstanding work.
 *
 * The wording is "awaiting classification", not "unswept": `\bomp\b` matches
 * `.omp/` inside a path reference, and the bead keeps those verbatim, so many
 * accepted occurrences will legitimately end up kept rather than rewritten.
 */
export function formatRuleAReport(
	violations: readonly RuleAViolation[],
	allowlist: readonly AllowlistEntry[],
	blocking: readonly RuleAViolation[],
	stale: readonly string[],
	vanished: readonly string[] = [],
): string {
	const accepted = violations.length - blocking.length;
	const acceptedOccurrences = violations
		.filter(violation => blocking.indexOf(violation) < 0)
		.reduce((sum, violation) => sum + violation.occurrences, 0);
	const outstanding =
		`${acceptedOccurrences} occurrence(s) in ${accepted} file(s) still carry the legacy token ` +
		`awaiting classification or sweep`;
	// Said on the same line as the counts it qualifies. A separate warning line is
	// scrolled past; the counts are the thing a reader acts on, so the caveat has
	// to travel with them or it never reaches anyone.
	const raced =
		vanished.length > 0
			? `; ${vanished.length} path(s) VANISHED mid-scan, counts exclude them: ` +
				`${vanished.slice(0, 3).join(", ")}${vanished.length > 3 ? ", …" : ""}`
			: "";
	return (
		`REPORT ruleA ${outstanding}; ${blocking.length} file(s) unapproved, ${stale.length} stale line(s) ` +
		`in ${ALLOWLIST_PATH} (${allowlist.length} line(s))${raced}\n`
	);
}

if (import.meta.main) {
	// One positional path, no flags. A `--flag` used to be taken as the path and
	// surfaced as an ENOENT crash against a filename that never existed; refusing it
	// names the mistake instead of blaming the filesystem.
	const root = readGateArgsOrExit(process.argv.slice(2), { positionals: 1 })[0] ?? process.cwd();
	const { violations, vanished } = await scanRuleAResult(root);
	const allowlist = await loadAllowlist(root);
	const blocking = ungatedViolations(violations, allowlist);
	const stale = staleAllowlistEntries(violations, allowlist);
	for (const violation of blocking) {
		process.stdout.write(`FAIL ruleA ${violation.occurrences} ${violation.path}\n`);
	}
	for (const entry of stale) {
		process.stdout.write(`WARN ruleA stale ${entry} — on the allow-list but no longer matches; drop the line\n`);
	}
	process.stdout.write(formatRuleAReport(violations, allowlist, blocking, stale, vanished));
	if (blocking.length > 0) {
		process.stdout.write(
			`FAIL ruleA ${blocking.length} file(s) carry the legacy display token without an accepted reason. ` +
				`Rename them, or add the path to ${ALLOWLIST_PATH} WITH a comment saying why.\n`,
		);
		process.exit(1);
	}
}
