/**
 * W14 — GATE. Legacy brand token in RUNTIME OUTPUT under `packages/<pkg>/src/`.
 *
 * W13's `check-docs-rename.ts` covers markdown and deliberately excludes
 * `packages/<pkg>/src/` as prompt corpus. That exclusion leaves this surface
 * unguarded, and it is the surface a user actually reads: `console.*` lines
 * that tell them to run a command this binary no longer publishes.
 *
 * WHY THIS IS A SEPARATE GATE AND NOT A WIDER W13
 * ------------------------------------------------
 * The two corpora have opposite failure modes. Prose can be allow-listed by
 * path after a human reads the sentence. Runtime output cannot be swept by a
 * regex: the token's meaning depends on whether it names something that still
 * exists. `omp git` in a help string is stale prose, but the same token inside
 * `hindsight`'s default bank id is a *data* identity, and one inside a
 * `console.log` that prints a value the code computed is not prose at all. A
 * regex cannot tell those apart, so this gate takes an ALLOW-LIST OF EXACT
 * (path, line, reason) entries — never a pattern — and a human signs for each.
 *
 * MEASURED BASELINE — 13 sites, not 8
 * ------------------------------------
 * A first pass using `console.(log|error|warn)("[^"]*\bomp\b` reported 8. That
 * pattern is wrong in three independent ways, and each one hid real sites:
 *
 *   1. It only matches a bare `"` first argument, so `console.log(chalk.dim(…))`
 *      and `console.log(\`…\`)` were missed — 5 of the 13.
 *   2. It anchors on the first argument, so a `console.error` whose token comes
 *      after an interpolated value was missed.
 *   3. It required the token inside the string's first quoted run, so a message
 *      assembled from a variable was missed entirely.
 *
 * The gate below matches on the WHOLE call expression and lets the allow-list
 * decide meaning. Measured at commit `7787b068be`: 13 sites in 4 files. A
 * narrower scan is not a stricter scan, it is a wrong one.
 *
 * WHY NOT A TEST
 * --------------
 * This is a corpus scanner wired into `check:ts`, like W13. It is not a unit
 * test, and AGENTS.md bans source-grep *tests* — a test that reads an
 * implementation file and asserts on its text breaks on harmless refactors.
 * The logic worth testing is the pure parts (`isExcluded`, `ungatedViolations`),
 * which live in `check-runtime-rename.test.ts` and are driven by fixtures.
 */

import * as path from "node:path";
import { readGateArgsOrExit } from "./args";

/** Path prefixes excluded from the rule, not from the allow-list. */
const EXCLUDED_PREFIXES = [".lavish-wip/", ".lavish/", ".omp/"];

/**
 * Runtime prompt corpus: markdown under a package's `src/` is imported into a
 * system prompt, so a rename sweep must never touch it. Same reason, same
 * exclusion, as W13.
 */
const EXCLUDED_MD = /^packages\/[^/]+\/src\/.*\.md$/;

/** Benches and fixtures are not shipped output. */
const EXCLUDED_PATH = /^packages\/[^/]+\/(?:bench|test|test-fixtures)\//;

/**
 * The legacy token, word-bounded. This is a LOCATOR, not a judgement: it decides
 * where to point a human, never whether a site is acceptable. Acceptability is
 * the allow-list's job, one reviewed entry at a time.
 */
const LEGACY_TOKEN = /\bomp\b/;

/**
 * Marks a line as carrying runtime output, wherever in the call the token sits —
 * bare, chalk-wrapped, or interpolated into a template literal.
 *
 * A FIRST cut of this matched a whole call expression, `[^;]*?`, to avoid
 * reporting a file that legitimately stores the legacy token. That under-reported
 * by 2 of 13 and is the exact failure this file's header is about: the bound
 * excluded `;`, and the two messages it lost END INSIDE A STRING WITH A
 * SEMICOLON — "…when the browser prelude needs it;" and "…nothing to do.". A
 * narrower scan is not a stricter scan, it is a wrong one.
 *
 * So the call is not bounded at all. A line qualifies when it invokes a runtime
 * writer AND carries the token; a migration list that merely stores the token
 * does neither, and a multi-line call still qualifies on the line holding the
 * writer. Reported per LINE either way, so the allow-list stays reviewable.
 *
 * The writer set is `logger.*`, not `console.*`. AGENTS.md ("Logging and CLI
 * Output") BANS `console.log/error/warn` in any code that may run while the
 * TUI, RPC, SDK, workers or background runtimes are active, and requires
 * `logger.*` from `@oh-my-pi/pi-utils` instead. So the previous trigger could
 * not fire on compliant code at all: measured across this corpus it reported
 * `0 ungated of 0 sites` and exited green while watching an empty domain. A
 * gate that reports green for a domain it does not observe is the failure this
 * file exists to prevent, one level up from the token itself.
 *
 * This stays a RUNTIME-output gate and deliberately does not widen to data
 * values — `serverName: "omp"`, `ORIGINATOR_CODEX: "omp"`, `Symbol("omp.…")`.
 * Those are measured at 141 and 22 sites respectively, and they are not output;
 * the census for them is `check-disposition.ts`'s 241-row table, which
 * accounts for each occurrence against a reviewed reason. Folding them in here
 * would give the same token a second, per-line source of truth.
 *
 * IT ALSO DOES NOT COVER THE TUI RENDER PATH, and that is a decision rather than
 * an oversight. `packages/tui` does call `logger.*` (21 files), so the trigger
 * reaches it — but user-visible TUI text does not travel that way. It lands
 * through the component writers (`push` 3242, `render` 395, `addChild` 358,
 * `write` 75 call sites across `packages/tui/src`), none of which this trigger
 * can see; all three sites this gate holds live in `coding-agent`.
 *
 * Adding those writers here is not merely expensive, it is structurally wrong
 * for THIS gate: the allow-list is per `(path, line)` with a human signing each
 * one, and any trigger over `packages/tui/src` exposes a ceiling of 571 token
 * lines across 171 files (measured here; a trigger also requires the writer, so
 * that is the ceiling, not the count). That is a flood, not a signal — and a
 * flood is how a gate stops being read. The measured cost is the reason; if
 * display text needs a census, it needs a census whose unit is the string a
 * user sees, not one keyed to a call expression, and that is a different gate
 * rather than a wider one.
 */
const RUNTIME_WRITER = /\blogger\.(?:log|error|warn|debug|info)\(/;

export function isExcluded(relPath: string): boolean {
	if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) return true;
	if (EXCLUDED_MD.test(relPath)) return true;
	return EXCLUDED_PATH.test(relPath);
}

export interface RuntimeViolation {
	readonly path: string;
	readonly line: number;
	readonly text: string;
}

/** Repo-relative path of the allow-list. */
const ALLOWLIST_PATH = "scripts/rename/runtime-legacy-allowlist.txt";

/**
 * One accepted site. `path:line` is the identity — an allow-list line means "a
 * human read THIS line and accepted THIS token", so the same file appearing at a
 * new line is a NEW violation rather than inheriting the old approval.
 */
export interface AllowlistEntry {
	readonly path: string;
	readonly line: number;
}

/**
 * Read the allow-list. A MISSING file is an empty list, not a pass: treating
 * "no allow-list" as "no violations" makes the gate green precisely when it has
 * nothing to say.
 *
 * Syntax: `path:line`. Inline `#` comments are NOT supported on an entry line —
 * a trailing comment would become part of the line number and silently stop
 * matching, which fails open. Reasons go on their own `#` line above.
 */
export async function loadAllowlist(root: string): Promise<AllowlistEntry[]> {
	const file = Bun.file(path.join(root, ALLOWLIST_PATH));
	if (!(await file.exists())) return [];
	const entries: AllowlistEntry[] = [];
	for (const raw of (await file.text()).split("\n")) {
		const trimmed = raw.trim();
		if (trimmed === "" || trimmed.startsWith("#")) continue;
		const at = trimmed.lastIndexOf(":");
		if (at === -1) continue;
		const line = Number(trimmed.slice(at + 1).trim());
		if (Number.isInteger(line)) entries.push({ path: trimmed.slice(0, at), line });
	}
	return entries;
}

/**
 * Every runtime-writer call in the shipped surface that carries the legacy token.
 *
 * Reported per LINE, not per file, for the same reason the allow-list is keyed
 * by line: the token's meaning is a property of the sentence, and a file can
 * hold both a stale one and a correct one.
 */
export async function scanRuntime(root: string): Promise<RuntimeViolation[]> {
	const glob = new Bun.Glob("packages/*/src/**/*.ts");
	const violations: RuntimeViolation[] = [];
	for await (const relPath of glob.scan({ cwd: root, dot: true })) {
		if (isExcluded(relPath)) continue;
		const lines = (await Bun.file(path.join(root, relPath)).text()).split("\n");
		for (const [index, line] of lines.entries()) {
			if (!LEGACY_TOKEN.test(line)) continue;
			if (!RUNTIME_WRITER.test(line)) continue;
			violations.push({ path: relPath, line: index + 1, text: line.trim() });
		}
	}
	return violations.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

/** Violations the gate fails on: anything not accepted at that exact line. */
export function ungatedViolations(
	violations: readonly RuntimeViolation[],
	allowlist: readonly AllowlistEntry[],
): RuntimeViolation[] {
	const accepted = new Set(allowlist.map(entry => `${entry.path}:${entry.line}`));
	return violations.filter(violation => !accepted.has(`${violation.path}:${violation.line}`));
}

/**
 * Allow-list entries that no longer match a site — the sweep finished them, so
 * the approval can be retired rather than silently outliving its line.
 */
export function staleAllowlistEntries(
	violations: readonly RuntimeViolation[],
	allowlist: readonly AllowlistEntry[],
): string[] {
	const live = new Set(violations.map(violation => `${violation.path}:${violation.line}`));
	return allowlist
		.filter(entry => !live.has(`${entry.path}:${entry.line}`))
		.map(entry => `${entry.path}:${entry.line}`);
}

async function main(): Promise<void> {
	const root = process.cwd();
	const [violations, allowlist] = await Promise.all([scanRuntime(root), loadAllowlist(root)]);
	const failures = ungatedViolations(violations, allowlist);
	const stale = staleAllowlistEntries(violations, allowlist);

	for (const violation of failures) {
		console.log(`FAIL runtime ${violation.path}:${violation.line} ${violation.text}`);
	}
	for (const entry of stale) {
		console.log(`STALE allowlist ${entry}`);
	}
	console.log(
		`runtime-rename: ${failures.length} ungated of ${violations.length} sites, ${stale.length} stale allow-list entries`,
	);
	if (failures.length > 0 || stale.length > 0) process.exit(1);
}

if (import.meta.main) {
	// This gate reads no arguments at all, so any argument is a mistake — refusing it
	// is the difference between "you asked a question I cannot see" and a green run.
	readGateArgsOrExit(process.argv.slice(2));
	await main();
}
