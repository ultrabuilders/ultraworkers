/**
 * W8b — GATE. The rename decision table is only worth something if it can be
 * falsified, so this gate re-derives every number in it from the tree.
 *
 * WHAT THIS GATES
 * ---------------
 * `scripts/rename/disposition.tsv` records, per (path, disposition), how many
 * occurrences of the pinned expression belong to each decision class. The invariant
 * that makes it more than a list of opinions:
 *
 *     for every path, the sum of `hits` across its rows == that file's real
 *     occurrence count of the pinned expression.
 *
 * Without that, a missed `rename` is invisible: the file has a `keep-*` row, the
 * gate sees a row for that path, and the leftover occurrence rides along under a
 * decision that was never made about it. Splitting `hits` per CLASS rather than per
 * file is what closes that hole — so this gate recomputes each class separately and
 * reports them apart.
 *
 * WHY TWO STAGES
 * --------------
 *   --stage=pre   the table must be COMPLETE and REVIEWABLE: every hit file has
 *                 rows, rows balance, no empty reason, keep-* names its owner.
 *   --stage=post  the renames must be DONE: each `rename` row has 0 occurrences
 *                 left, each `keep-*` row still has exactly the count recorded.
 *
 * One stage cannot express both. Before the sweep a `rename` row legitimately still
 * has occurrences; after it, 0 is the only legal value. Running only one of them
 * means half the table is never checked at the moment it matters.
 *
 * WHY THE PICKED EXPRESSION, AND THE 51% THAT IS PROSE
 * ---------------------------------------------------
 * The pinned expression is the one the bead ghim, byte for byte:
 *
 *     (^|[^a-zA-Z0-9_./-])omp([^a-zA-Z0-9_.-]|$)
 *
 * It is a LOCATOR, not a judgement. It matches comments and doc strings exactly as
 * happily as it matches code, and on the tree at the time of writing that is most of
 * the corpus:
 *
 *     2054 occurrences — 1047 in comment prose, 1007 in code
 *     704 files     — 318 with >=1 code occurrence, 386 comment-only
 *
 * So a `rename` row is not automatically a code edit. Renaming inside a comment is
 * W13's job (the documentation sweep), not this table's, and whether the table needs
 * a `prose` disposition at all is an open owner decision — recorded in the bead, not
 * silently resolved here. Until it is made, `keep-prose` is NOT in the vocabulary and
 * a comment-only file has no lawful row to carry, which `--stage=pre` reports as a
 * missing row rather than inventing a class for it.
 *
 * WHY NOT A TEST
 * --------------
 * AGENTS.md bans source-grep *tests*: a test asserting on an implementation file's
 * text breaks on harmless refactors. The pure helpers below are covered by
 * `check-disposition.test.ts` against fixtures.
 *
 * WHAT RUNS IT — re-measured 2026-10-02, because this paragraph has now been wrong twice
 * ------------------------------------------------------------------------------
 * This gate is NOT a link in `check:ts`, and must not become one. `check:ts` is a `&&`
 * chain that stops at the first red link, and `check:test-rename-literals` sits at
 * position 7 and is red on this tree — so anything chained after it never executes. A
 * gate in that position is a gate that does not run, which is worse than an unwired
 * one because it looks enforced. (That is not hypothetical: the ratchet was first
 * chained at position 8 and would never have fired.)
 *
 * What DOES run it, and runs it even when `check:ts` is red:
 *
 *   scripts/rename/check-disposition-ratchet.ts   -> package.json `check:disposition-ratchet`
 *   -> `GATES` in scripts/ci-check-full.ts -> `ci:check:full`
 *
 * Measured, not asserted: `bun run ci:check:full` reports
 * `PASS check:disposition-ratchet (exit 0)` on a run where `check:ts` exited 1. The
 * ratchet re-implements no rule — it calls `checkPre` AND `checkPost` — so it cannot
 * drift from here. (`checkPost` is what makes `rename-incomplete` and `keep-shrank`
 * observable at all, since this file defaults to `--stage=pre`.)
 *
 * It is a RATCHET, not this gate in full, and that is deliberate. This gate reports
 * every way the table is incomplete, and the table is legitimately incomplete, so
 * running it as a gate would make CI red for work that is going correctly. The ratchet
 * pins the one number that may only rise when a frozen literal is deleted; everything
 * else it reports as a ceiling that must fall.
 *
 * Running this file directly reports the whole picture, now split by rule so a reader
 * can see which number is which without counting `FAIL` lines:
 *
 *   disposition(pre): missing-row = 628
 *   disposition(pre): literal-hits-imbalance = 0
 *   disposition(pre): stale-row = 9
 */

import * as path from "node:path";
import { readGateArgsOrExit } from "./args";
import { isInsideNestedRepository, nestedRepoCache } from "./scan-scope";

/**
 * The pinned expression. Byte-identical to the bead's, so the table and this gate
 * can never drift onto different definitions of "a hit".
 *
 * The leading class excludes `.` and `/` so `pi-omp` or `sub/omp` do not match. An
 * earlier version of this docblock claimed that `"./omp/"` therefore "matches on its
 * trailing edge" — it never did, for the same leading `/`. The example was wrong and
 * the asymmetry it described is only the one below.
 *
 * The trailing class used to exclude `.` and `-` as well, which made this expression
 * blind to `starts_with("omp.")` and `format!("omp-oauth-test-{u}")`. That is not a
 * cosmetic gap: `--stage=post` accepts a row when the count reaches zero, so renaming
 * only the occurrences a table row names turned the row green with the token still in
 * the file — measured on `mktemp.rs`, whose row claimed `hits=1` while lines 665-666
 * assert on `starts_with("omp.")` and `"omp.".len()`.
 *
 * The obvious repair — dropping `.`/`-` from the trailing class — is wrong, because
 * `omp.sh` is the homepage wire value (`APP_URL` in `packages/utils/src/dirs.ts`) and
 * appears in 1093 places across 215 `.ts` files as install, join and stream URLs. So
 * the exclusion is narrowed rather than removed: `.` and `-` now terminate a hit unless
 * they open `sh`, which keeps `omp.sh`, `https://omp.sh/install` and `wss://my.omp.sh/…`
 * out while counting `omp.` and `omp-oauth-test-`. `omp.shs` is not the domain and is
 * counted, so the lookahead is bounded by `(?![a-zA-Z0-9])` rather than open-ended.
 *
 * `_` stays excluded on the LEADING edge, and that is load-bearing: `__omp_worker_*` is
 * the `keep-worker-selector` class, counted by its own literal, and the leading class is
 * what keeps every worker selector out — allowing `_` there makes each one a pinned hit,
 * measured at one per file across 1467 files. The trailing edge does NOT exclude `_` as of
 * 2026-10-03 (`epic-cpws`), so a bare `omp_worker_*` written without the leading underscores
 * IS counted; only the `__`-prefixed form the host actually dispatches on is protected, and
 * it is protected by the leading edge alone.
 *
 * `/` is excluded on neither edge as of 2026-10-03 (`epic-skwz`). It used to sit in the
 * LEADING class, which made every occurrence preceded by a path separator invisible: a
 * locator that cannot see `@oh-my-pi/omp-stats` or `packages/omp/x.ts` cannot count a row
 * covering one, so those sites could never be given a disposition at all. Measured on the
 * tracked corpus: 120 sites across 65 files became countable, 911 → 1031.
 *
 * The trailing edge admits `_` and the literal is case-blind, as of 2026-10-03
 * (`epic-cpws`, delegated decision — see the bead for the recorded reasoning). Two
 * blind spots closed together, because both were the same defect: a contract the tree
 * honours and the gate cannot see reads as a file that is finished.
 *
 * `_` on the trailing edge: `omp_capabilities` scored 0, and `--stage=post` accepts a row
 * once its count reaches 0, so a file whose occurrences are all snake_case env names
 * reported itself clean with the token still in it.
 *
 * The `i` flag: `OMP_AUTH_BROKER_URL` and `OMP-CAPABILITIES` scored 0. `PINNED`'s only
 * case-SENSITIVE element is the literal `omp` itself — both character classes already
 * admit either case — so widening the literal's case is a strict superset, and every
 * uppercase occurrence was invisible to all six classes at once.
 *
 * What the flag deliberately does NOT reach, and this is the load-bearing control rather
 * than an omission: the LEADING class still excludes `_`, so `PI_OMP_X` stays 0. Widening
 * that edge instead would sweep the entire `@oh-my-pi` namespace into scope and invalidate
 * every figure recorded in the ledger.
 *
 * Only the LEADING edge changed as far as `.` and `-` go, so `.omp/` is still not matched
 * and `omp-like` still is — both are separate axes, not this one.
 */
const PINNED = /(^|[^a-zA-Z0-9_-])omp(?![\.\-]sh(?![a-zA-Z0-9]))([^a-zA-Z0-9]|$)/i;

/** Repo-relative path of the table. */
const TABLE_PATH = "scripts/rename/disposition.tsv";

/**
 * The closed vocabulary. A row whose `disposition` is not here is a failure, not a
 * new class — the set is closed precisely so that adding a class is a reviewed act
 * rather than something a sweep does by accident.
 */
export const DISPOSITIONS = [
	"rename",
	"keep-wire",
	"keep-worker-selector",
	"keep-path",
	"keep-filename",
	"keep-prose",
] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

/**
 * Classes that name an owner, and so must say which one. A `keep-*` row without
 * `keep_refs` is an approval nobody signed — the failure this whole table exists to
 * prevent, so it is enforced rather than documented.
 */
export function requiresKeepRefs(disposition: string): boolean {
	return disposition.startsWith("keep-");
}

/**
 * A `keep_refs` value shaped like a plan id this gate can resolve: `W9`.
 *
 * The `N`-family ids (`N3`–`N7`) are the shape this deliberately does NOT match.
 * They are bare plan ids too, but no plan document introduces them, so there is
 * nothing to resolve against; matching them would make a definitional gap look
 * like the same kind of thing as a dead name. Namespaced forms
 * (`W11:project-root-.omp`, `a57q:rs-glob`) name a contract or a bead, not a plan
 * node. All three excluded shapes are counted by `countUnverifiableKeepRefs`.
 */
const BARE_PLAN_ID = /^(W\d+)$/;

/** `## W9. Attribution usage ...` — the only shape that INTRODUCES a plan id. */
const PLAN_ID_HEADING = /^#{1,6}\s+(W\d+)\./;

/**
 * The plan node a `keep_refs` value names, or `null` when it names none.
 *
 * A bare `W9` names a node. `W11:project-root-.omp` names a contract INSIDE node
 * W11 — and the owner was just as checkable as the bare form, because
 * `BARE_PLAN_ID` is anchored: the namespaced shape never matched it, so all 338
 * `W11:` rows sat outside the one rule that can catch a dead owner. A gate that
 * cannot see them is not a gate that passed them.
 *
 * `a57q:rs-glob` names a BEAD and `internal-path-reference` names a contract
 * coined in the table itself. Neither prefix is a plan node, so both return
 * `null` and stay unenforced — deliberately. Widening the check to "any colon
 * would do" would make `a57q:*` dangling the moment `PLAN_ID_HEADING` failed to
 * introduce it, turning 24 correctly-attributed rows into red.
 *
 * What this does NOT do is make the contract NAME checkable. `W11` resolving
 * says the owner exists; it says nothing about whether `project-root-.omp` is a
 * name anything else can resolve. Those 338 rows therefore stay in
 * `countUnverifiableKeepRefs` — the owner became enforceable, the coined name
 * did not, and the report must not claim otherwise.
 */
export function planNodeOf(ref: string): string | null {
	const trimmed = ref.trim();
	const bare = BARE_PLAN_ID.exec(trimmed);
	if (bare) return bare[1]!;
	const colon = trimmed.indexOf(":");
	if (colon <= 0) return null;
	const prefix = trimmed.slice(0, colon);
	return BARE_PLAN_ID.test(prefix) ? prefix : null;
}

/**
 * Plan ids that have a real definition site, loaded from the root
 * `MILESTONE_*_EXECUTION_PLAN.md`.
 *
 * LOADED, not searched. A bare string search finds `W9` inside `_W11`, inside a
 * file name, or inside a sentence — and would then call a node "defined" that
 * nothing ever introduced. Only a heading introduces one, so only a heading counts.
 * That distinction is the whole gate: the alternative is a check that reports
 * "defined" for a token merely mentioned, which is the `trim() !== ""` gate again
 * wearing a resolver's clothes.
 *
 * The set is deliberately restricted to the `W` family. `N3`–`N7` appear in the
 * plans only as prose mentions (`### GATE B — N11`) and are never introduced, so
 * they have nothing to resolve against and are counted as unverified instead —
 * see `countUnverifiableKeepRefs`, which reports them on every run so the blind
 * spot cannot be mistaken for coverage.
 */
export async function loadDefinedPlanIds(root: string): Promise<ReadonlySet<string>> {
	const ids = new Set<string>();
	for (const text of await readPlanDocuments(root)) collectPlanIds(text, ids);
	return ids;
}

/**
 * Every plan document's text, read once per call.
 *
 * Shared by `loadDefinedPlanIds` and `findCoinedRefs` because they need the same
 * bytes for different reasons — the id set and the definition corpus. Reading them
 * separately reads the same megabytes twice, which is measurable on a gate that
 * already runs on every `check:ts`.
 */
async function readPlanDocuments(root: string): Promise<readonly string[]> {
	const docs: string[] = [];
	for await (const rel of new Bun.Glob("MILESTONE_*_EXECUTION_PLAN.md").scan({ cwd: root })) {
		docs.push(await Bun.file(path.join(root, rel)).text());
	}
	return docs;
}

/** Add every plan id this document's headings introduce. Prose mentions do not count. */
function collectPlanIds(text: string, ids: Set<string>): void {
	for (const line of text.split("\n")) {
		const heading = PLAN_ID_HEADING.exec(line);
		if (heading) ids.add(heading[1]!);
	}
}

/**
 * A `keep_refs` contract name that no plan document writes down.
 *
 * `W11:project-root-.omp` resolves an OWNER (`W11`) and then names a CONTRACT inside
 * it. Resolving the owner is not resolving the ref. At this tree all 15 such names
 * appear in no `MILESTONE_*_EXECUTION_PLAN.md` — not verbatim, and not by stem
 * either. They were coined in `disposition.tsv` itself.
 *
 * This is the half `planNodeOf` deliberately does not cover, and its own docblock
 * says so: making the owner enforceable says nothing about whether the contract
 * NAME is a name anything else can resolve. Left there, the two rules partition the
 * failure cleanly — an unresolvable owner is `dangling-keep-ref`'s, an unresolvable
 * name is this one's — and neither double-counts the other.
 *
 * What this must NOT do is define the 15 names. Writing them into a plan to turn
 * this count green would invent 15 contracts, and the 338 rows would then rest on
 * the invention. That is fixing the number instead of the fact.
 */
export interface CoinedRef {
	readonly path: string;
	/** 1-based line in the TSV, for error messages. */
	readonly line: number;
	readonly ref: string;
	/** The plan node the ref resolves to. Defined, or this rule does not fire. */
	readonly owner: string;
	/** The part after the first `:`, which is what has no definition site. */
	readonly contract: string;
}

/**
 * Refs whose owner resolves but whose contract name is written in no plan document.
 *
 * Owner resolution is delegated to `planNodeOf` rather than re-parsed here: a second
 * parser for the same ref shape would be free to drift from the one `dangling-keep-ref`
 * enforces, and the day it did, this rule would report owners that rule never checked.
 *
 * The corpus is read ONCE and concatenated — the plan set is fixed, so re-reading it
 * per row would make this rule's cost scale with the table instead of the repository.
 * Matching is a plain `includes`, deliberately LOOSER than `PLAN_ID_HEADING`: a contract
 * defined in a table row, a prose sentence or a heading's tail is still defined.
 * Tightening this to a heading would report names that do exist, and a reader would
 * have to `grep` to discover the gate is wrong. One wrong line costs more trust than
 * three missing lines — the report's job is to be checkable, not to be complete.
 *
 * That looseness is why the search runs once per DISTINCT name, not once per row: the
 * corpus is megabytes and 338 rows carry only 15 distinct contracts, so a per-row scan
 * re-reads the same megabytes 22 times over. Measured interleaved against a build with
 * this rule removed, the naive per-row form cost ~1.1s — enough to push an existing
 * 5s-budget ratchet test over on a loaded machine, which is a cost a report-only rule
 * has no business imposing. Reading the plan documents once for BOTH the id set and the
 * corpus, and scanning per distinct name, brings that to ~0.05s — inside run-to-run
 * variance on this machine, i.e. not measurable.
 */
export async function findCoinedRefs(root: string, rows: readonly Row[]): Promise<readonly CoinedRef[]> {
	// Resolve every row first, so the corpus is searched once per NAME rather than
	// once per row: 338 rows carry 15 distinct contracts, so a per-row scan re-reads
	// the same megabytes 22 times over.
	const candidates: { row: Row; ref: string; owner: string; contract: string }[] = [];
	const docs = await readPlanDocuments(root);
	const defined = new Set<string>();
	for (const text of docs) collectPlanIds(text, defined);
	for (const row of rows) {
		const ref = row.keepRefs.trim();
		const owner = planNodeOf(ref);
		if (owner === null) continue;
		// A bare `W9` resolves an owner but names no contract, so there is nothing
		// left to look up. An `a57q:` ref names a BEAD, and `planNodeOf` returns null.
		const colon = ref.indexOf(":");
		if (colon <= 0) continue;
		// Skipped rather than counted: an undefined owner is `dangling-keep-ref`'s
		// failure, and two rules answering one failure produce a number no single
		// remedy can move.
		if (!defined.has(owner)) continue;
		candidates.push({ row, ref, owner, contract: ref.slice(colon + 1) });
	}
	if (candidates.length === 0) return [];

	const corpus = docs.join("");
	const missing = new Set<string>();
	for (const name of new Set(candidates.map(c => c.contract))) {
		if (!corpus.includes(name)) missing.add(name);
	}
	return candidates
		.filter(c => missing.has(c.contract))
		.map(c => ({ path: c.row.path, line: c.row.line, ref: c.ref, owner: c.owner, contract: c.contract }));
}

/**
 * An export entry that publishes `src/` by wildcard: a subpath key containing `*`,
 * pointing at a wildcard target under `./src/`.
 *
 * The wildcard SPANS `/`. That is not a detail of this regex, it is how `exports`
 * resolves: `{ "exports": { "./*": "./src/*.ts" } }` serves `pkg/deep/nested/leaf`
 * from `src/deep/nested/leaf.ts`. Verified against Node's own resolver, and stated
 * in this repo at `packages/coding-agent/scripts/legacy-pi-virtual-module.ts`:
 *
 *   // Recursive on purpose: Node matches `*` in an `exports` pattern across `/`
 *
 * An earlier version of this rule anchored on the single-segment shape `./*.js` and
 * concluded from the missing `**` that `src/a/b.ts` was not published and so was
 * safe to rename. That inference was backwards, and it was the dangerous kind of
 * wrong: it did not merely under-report, it certified a class of files as safe. It
 * under-reported by exactly the depth-1 subset (16 of 194).
 */
const PUBLISHING_EXPORT_KEY = /^\.\/[^"]*\*[^"]*$/;
const PUBLISHING_EXPORT_TARGET = /^\.\/src\/[^"]*\*[^"]*$/;

/**
 * `packages/<pkg>/src/<rest>.<ext>` — any depth under `src/`.
 *
 * Depth is deliberately unrestricted: `*` matches across `/`, so a nested file is
 * published by exactly the same entry that publishes a top-level one.
 */
const PUBLISHED_MODULE = /^packages\/([^/]+)\/src\/(.+)\.(ts|tsx|mjs|js)$/;

/**
 * An `exports` glob, where `*` spans `/`, anchored at both ends.
 *
 * Built by splitting on `*` rather than by a character class, because the wildcard
 * has to be able to consume a `/` for a nested path to match. Escaping each
 * literal segment is what keeps a `.` in `./src/` from matching any character.
 */
function exportGlob(glob: string): RegExp {
	const body = glob
		.split("*")
		.map(segment => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
		.join("(.*)");
	return new RegExp(`^${body}$`);
}

/**
 * The specifier a consumer writes, for a key and a file's path under `src/`.
 *
 * `./*.js` against `overlays/model-hub` yields `overlays/model-hub.js` — the `.js`
 * comes from the KEY, not the filename, so a rule that appends it from the file
 * extension would name a specifier that does not resolve. Returns null rather than
 * a guess when the key's directory does not prefix the file.
 *
 * The result is round-tripped through `exportGlob` before it is returned, so a
 * specifier that does not actually match the key it came from is never reported.
 */
function resolveSpecifier(key: string, rest: string): string | null {
	const star = key.indexOf("*");
	if (star < 0) return null;
	const prefix = key.slice(0, star);
	const suffix = key.slice(star + 1);
	const dir = prefix.slice(prefix.lastIndexOf("/") + 1);
	if (!rest.startsWith(dir)) return null;
	const spec = `./${dir}${rest.slice(dir.length)}${suffix}`;
	return exportGlob(key).test(spec) ? spec.slice(2) : null;
}

export interface PublishedRenameRow {
	readonly path: string;
	/** 1-based line in the TSV, for error messages. */
	readonly line: number;
	/** The `packages/` directory name. */
	readonly dir: string;
	/** The package's real published name, which is not always its directory name. */
	readonly packageName: string;
	/** The specifier a consumer writes today. Renaming the file breaks exactly this. */
	readonly specifier: string;
}

export interface PublishedRenameSurvey {
	readonly rows: readonly PublishedRenameRow[];
	/** Directories whose package.json publishes `src/*` as public modules. */
	readonly publishing: ReadonlySet<string>;
	readonly renameRowsTotal: number;
	/** Rename rows in a publishing package that no wildcard export entry publishes. */
	readonly notPublishedInSamePackage: number;
	/** Rename rows in packages that publish nothing by wildcard, including private ones. */
	readonly outsidePublishingPackage: number;
	/**
	 * Rename rows naming a file that is not on disk.
	 *
	 * Excluded rather than reported, and counted rather than dropped, so the
	 * partition still reconciles. A row pointing at a deleted file describes
	 * something that does not exist: there is no specifier to break and no
	 * consumer to break it for, so attaching a verdict to it would be a claim
	 * about a file nobody can open. Same reasoning as the generated-artifact rows:
	 * a file regenerated on every build has no stable answer either.
	 */
	readonly fileMissingOnDisk: number;
	/**
	 * Whether the four buckets sum to the rename total.
	 *
	 * Reported so a reader can tell a partitioned population from a number that
	 * merely looks plausible: if these ever stop summing, one of the buckets is
	 * silently swallowing rows and the headline count is measuring a subset while
	 * reading like the whole.
	 */
	readonly reconciles: boolean;
}

/**
 * `rename` rows whose target file is a PUBLIC module of its package.
 *
 * A `rename` row is an instruction to change a token in a file. When that file's
 * name is a published specifier, the same instruction is a BREAKING CHANGE to every
 * consumer outside this repo — issued by a table nobody reads as an API surface.
 * The table cannot express that distinction today, so it is reported instead.
 *
 * REPORTED, never gated, and deliberately not a ceiling. Gating it now would redden
 * CI over rows nobody has triaged yet, and `check:ts` is an `&&` chain — the same trap
 * `checkPost` fell into. The number is a decision input, not a verdict.
 *
 * `private: true` packages are excluded: a private package publishes to nobody, so
 * renaming inside it breaks no consumer. Including them would inflate the count with
 * changes that are provably safe.
 *
 * A row naming a file that is not on disk is excluded into its own counted bucket:
 * the row's premise is a file, and without the file there is no specifier and no
 * consumer to break.
 */
export async function findPublishedFileRenames(root: string, rows: readonly Row[]): Promise<PublishedRenameSurvey> {
	/** A wildcard export entry, with the conditions (`types`, `import`) already unwrapped. */
	interface Publishing {
		readonly name: string;
		readonly entries: readonly { readonly key: string; readonly target: string }[];
	}

	/** Collect every string target under an export value, at any condition depth. */
	function targetsOf(value: unknown, into: string[]): void {
		if (typeof value === "string") {
			into.push(value);
			return;
		}
		if (value !== null && typeof value === "object") {
			for (const nested of Object.values(value)) targetsOf(nested, into);
		}
	}

	const publishing = new Map<string, Publishing>(); // dir -> publishing evidence
	for await (const rel of new Bun.Glob("packages/*/package.json").scan({ cwd: root })) {
		const dir = rel.slice("packages/".length, rel.length - "/package.json".length);
		const handle = Bun.file(path.join(root, rel));
		let manifest: { name?: string; private?: boolean; exports?: Record<string, unknown> };
		try {
			manifest = await handle.json();
		} catch {
			continue; // unreadable manifest is not evidence that nothing is published
		}
		if (manifest.private) continue; // publishes to nobody, so it breaks no consumer
		const entries: { key: string; target: string }[] = [];
		for (const [key, val] of Object.entries(manifest.exports ?? {})) {
			if (!PUBLISHING_EXPORT_KEY.test(key)) continue;
			const targets: string[] = [];
			targetsOf(val, targets);
			for (const target of targets) {
				if (PUBLISHING_EXPORT_TARGET.test(target)) entries.push({ key, target });
			}
		}
		if (entries.length > 0) publishing.set(dir, { name: manifest.name ?? dir, entries });
	}

	const found: PublishedRenameRow[] = [];
	let renameRowsTotal = 0;
	let notPublishedInSamePackage = 0;
	let outsidePublishingPackage = 0;
	let fileMissingOnDisk = 0;
	for (const row of rows) {
		if (row.disposition !== "rename") continue;
		renameRowsTotal++;
		const module = PUBLISHED_MODULE.exec(row.path);
		if (!module) {
			if (publishing.has(row.path.split("/")[1] ?? "")) notPublishedInSamePackage++;
			else outsidePublishingPackage++;
			continue;
		}
		const publishingForDir = publishing.get(module[1]!);
		if (publishingForDir === undefined) {
			outsidePublishingPackage++; // no manifest publishes this package by wildcard
			continue;
		}
		// The row's claim is about a FILE. If the file is not there, the claim is
		// about nothing, so it gets its own bucket instead of a verdict.
		if (!(await Bun.file(path.join(root, row.path)).exists())) {
			fileMissingOnDisk++;
			continue;
		}
		const fileRel = `./src/${module[2]}.${module[3]}`;
		let specifier: string | null = null;
		for (const entry of publishingForDir.entries) {
			if (!exportGlob(entry.target).test(fileRel)) continue;
			const resolved = resolveSpecifier(entry.key, module[2]!);
			if (resolved !== null) {
				specifier = `${publishingForDir.name}/${resolved}`;
				break;
			}
		}
		if (specifier === null) {
			notPublishedInSamePackage++; // inside a publishing package, but no entry publishes it
			continue;
		}
		found.push({
			path: row.path,
			line: row.line,
			dir: module[1]!,
			packageName: publishingForDir.name,
			specifier,
		});
	}

	return {
		rows: found,
		publishing: new Set(publishing.keys()),
		renameRowsTotal,
		notPublishedInSamePackage,
		outsidePublishingPackage,
		fileMissingOnDisk,
		reconciles:
			found.length + notPublishedInSamePackage + outsidePublishingPackage + fileMissingOnDisk === renameRowsTotal,
	};
}

/**
 * `keep_refs` values this gate does NOT validate, by kind.
 *
 * Reported rather than enforced, because failing them would be failing refs the
 * gate cannot judge: `N3`–`N7` have no definition site, and the `W11:*` contract
 * vocabulary is coined in the table itself and written down nowhere. Printing the
 * count on every run is what keeps an unchecked ref from reading as a checked one.
 *
 * `byKind` exists because the total alone answers nothing. `333 (W11:*, a57q:*,
 * bare-non-W)` reads as one undifferentiated mass; `333 (W11:*=310, a57q:*=21,
 * bare-non-W=2)` says the problem is almost entirely the coined-vocabulary family
 * and the other two are rounding. A single number cannot tell a reader whether they
 * are looking at one large cause or several small ones, and "unverifiable" as a
 * verdict on the column is exactly the claim that decomposition exists to prevent.
 */
export function countUnverifiableKeepRefs(rows: readonly Row[]): {
	count: number;
	kinds: readonly string[];
	/** Family -> how many refs of that family, most numerous first. */
	byKind: readonly (readonly [string, number])[];
	/**
	 * Distinct unverifiable ref -> how many rows carry it, most used first.
	 *
	 * `byKind` answers "which family is the problem". This answers "which names are the
	 * problem", which is the question a vocabulary decision actually needs: defining a
	 * contract is per-name work, and a reader given only `W11:*=304` cannot tell whether
	 * that is four contracts or four hundred. The count per name is also the leverage —
	 * the top name is where a definition buys the most coverage, and the tail is where
	 * a rename is cheaper than a definition.
	 */
	byName: readonly (readonly [string, number])[];
} {
	const perKind = new Map<string, number>();
	const perName = new Map<string, number>();
	let count = 0;
	for (const row of rows) {
		const ref = row.keepRefs.trim();
		if (ref === "" || BARE_PLAN_ID.test(ref)) continue;
		count++;
		const kind = ref.includes(":") ? `${ref.slice(0, ref.indexOf(":"))}:*` : "bare-non-W";
		perKind.set(kind, (perKind.get(kind) ?? 0) + 1);
		perName.set(ref, (perName.get(ref) ?? 0) + 1);
	}
	// Descending by count, then by name so two equal entries cannot swap places
	// between runs and make an unchanged table look like it moved.
	const byCountThenName = (a: readonly [string, number], b: readonly [string, number]) =>
		b[1] - a[1] || a[0].localeCompare(b[0]);
	const byKind = [...perKind.entries()].sort(byCountThenName);
	const byName = [...perName.entries()].sort(byCountThenName);
	return { count, kinds: byKind.map(([kind]) => kind).sort(), byKind, byName };
}

/**
 * Per-class occurrence expressions.
 *
 * `rename` is the pinned expression minus the classes already claimed by a `keep-*`
 * row for the same file. That subtraction is why this is computed per (path, class)
 * and not once globally: the same token is a wire contract in one file and prose in
 * the next, and a global figure would hide both.
 *
 * `keep-worker-selector` and `keep-path` are LITERAL, not ERE — the bead says so
 * explicitly. They name one fixed string each, so an ERE would be both slower and
 * vaguer than the substring it is standing in for.
 *
 * `keep-filename` is the third kind: a SHAPE rather than a fixed string. `keep-path`
 * can only hold the quoted `".omp"`, so a live artifact filename like
 * `"omp-plugins.lock.json"` had no row that could count it — `keep-path` does not
 * match, it is code rather than prose so `keep-prose` lies about it, and it names an
 * installed file so `rename` would break it. The gap is `epic-6ttm` in its sharpest
 * form. The shape is deliberately narrow — a quoted, `omp-`-prefixed name carrying a
 * real extension — so it cannot swallow the prose rows it now sits beside.
 */
export interface ClassMatcher {
	readonly literal?: string;
	readonly pinned?: boolean;
	readonly filename?: boolean;
}

/**
 * A quoted `omp-`-prefixed filename: `"omp-plugins.lock.json"`.
 *
 * Requiring the extension is what keeps this a filename class. Without it the
 * expression would also match `"omp://"`, `"omp-work"` and every prose quote, which
 * are exactly the classes this one exists to stay clear of.
 *
 * It must also stay DISJOINT from PINNED, or an occurrence counts twice and any
 * subtraction removes it from both sides at once — the "measured wrong in both
 * directions" failure `countRename`'s own docblock warns about. `"omp-worker.json"`
 * matches this expression AND the pinned one, in 34 files at this commit; measured
 * with `countClass`, which is what 0c reported. `keep-path` avoids this because
 * `".omp"` is invisible to PINNED, so the property to preserve is the same: a
 * literal class that the pinned expression cannot also see.
 */
const OMP_FILENAME = /"(omp-[A-Za-z0-9._-]+\.[A-Za-z0-9]+)"/g;

export function classMatcher(disposition: Disposition): ClassMatcher {
	switch (disposition) {
		case "keep-worker-selector":
			return { literal: "__omp_worker_" };
		case "keep-path":
			return { literal: '".omp"' };
		case "keep-filename":
			return { filename: true };
		case "rename":
		case "keep-wire":
		case "keep-prose":
			return { pinned: true };
	}
}

/** Count a class's occurrences in one file's text. */
export function countClass(text: string, disposition: Disposition): number {
	const matcher = classMatcher(disposition);
	// NOT disjoint from PINNED, and deliberately so — see OMP_FILENAME. Every quoted
	// "omp-..." token has a quote before it, which PINNED's leading class admits, so
	// any filename this matches is also pinned-visible. Subtracting the intersection
	// here would zero out every real occurrence (dirs.ts:891 included) and make the
	// class unwritable again.
	if (matcher.filename === true) return (text.match(new RegExp(OMP_FILENAME.source, "g")) ?? []).length;
	if (matcher.pinned !== true) return text.split(matcher.literal as string).length - 1;
	// Flags are carried across rather than retyped, and `source` does not include them.
	// Rebuilding as `new RegExp(PINNED.source, "g")` drops the case-blind flag and measures
	// a narrower token than every other site in this file — the census would then disagree
	// with `hitPaths` and with itself.
	const pinned = text.match(new RegExp(PINNED.source, `${PINNED.flags}g`)) ?? [];
	// `PINNED` was widened on 2026-10-03 to admit a leading `.`, so `~/.omp/…` counts
	// at all — it returned 0 before, and `--stage=post` accepts a row once the count
	// reaches zero, so a file whose occurrences are all dotfile paths read as finished
	// with the token still in it.
	//
	// That widening also made the quoted `keep-path` literal `".omp"` pinned-visible,
	// so the two classes would both claim it. `rename` subtracts exactly that literal,
	// and nothing else: the docblock below records two failed attempts to subtract
	// more broadly, and this is neither — it removes a literal's own occurrences from
	// the pinned total rather than removing pinned occurrences on another class's
	// behalf. `keep-path` itself counts by its literal and is unaffected.
	if (disposition !== "rename") return pinned.length;
	return pinned.length - (text.split(classMatcher("keep-path").literal as string).length - 1);
}

/**
 * `rename` occurrences for a file.
 *
 * The parameter is retained so callers can pass their keep classes, but NOTHING is
 * subtracted. Both subtraction attempts were measured wrong, in opposite directions:
 *
 * 1. Subtracting every `keep-*` class. `keep-wire` shares the pinned expression, so
 *    `const ORIGINATOR = "omp"` went to 0 and `rename-incomplete` was unreachable.
 * 2. Subtracting only the LITERAL classes. Those are disjoint from the pinned set —
 *    `__omp_worker_x` has a pinned count of 0 — so subtracting them removes an
 *    occurrence that was never theirs:
 *
 *        const a = "omp"; const b = "__omp_worker_x";
 *        pinned = 1, worker-selector = 1, countRename = 0   // the "omp" vanished
 *
 * The pinned count is therefore the rename count outright. A file holding both a
 * wire contract and a rename candidate simply has a `keep-wire` row whose `hits` is
 * a human-signed number; balancing checks that number against the file.
 *
 * Balancing, though, is the ONLY stage that checks it, and it checks the SUM —
 * see the `keep-shrank` note in `checkPost` for why a pinned `keep-*` row's own
 * `hits` is not verifiable on its own. Neither needs the rename total adjusted.
 */
export function countRename(text: string, _keepDispositions: readonly Disposition[] = []): number {
	return countClass(text, "rename");
}

/**
 * `PINNED` widened by one flag each, for the case-blind report below.
 *
 * Built from `PINNED.source` AND `PINNED.flags` rather than transcribed. Transcribing
 * the flags is the failure this pairing exists to prevent, and it is silent: dropping
 * the flag off a derived copy leaves every number internally consistent while measuring
 * a different token. `PINNED.flags` is therefore read from the original at construction
 * time, so widening `PINNED` itself carries through to both copies with no edit here.
 *
 * `PINNED_CASE_BLIND` is the superset — the same expression, case-blind.
 * `PINNED_STICKY` is the original, pinned to a position, so a match found by the wide
 * expression can be asked "would the real one have matched HERE?" without re-scanning.
 *
 * Flags are ADDED rather than appended. `PINNED` carries `i` itself as of 2026-10-03
 * (`epic-cpws`), so appending would build `"ii"` and throw at module load; more to the
 * point, an append makes this file's correctness depend on a flag `PINNED` does not
 * currently have, so the day the flag lands this throws instead of going quiet. Adding
 * is idempotent, and an idempotent widening is the only version whose result means
 * something after the fix it was written to detect.
 */
function withFlag(flags: string, flag: string): string {
	// Per-character, not substring: `includes("gi")` against `"i"` is false, so a
	// substring test appends the pair verbatim and builds `"igi"`, which the RegExp
	// constructor rejects at runtime rather than at load. Testing one character at a
	// time is what makes the helper idempotent for any combination a caller passes.
	for (const char of flag) if (!flags.includes(char)) flags += char;
	return flags;
}
const PINNED_CASE_BLIND = new RegExp(PINNED.source, withFlag(PINNED.flags, "i"));
const PINNED_STICKY = new RegExp(PINNED.source, withFlag(PINNED.flags, "y"));

/** One path holding occurrences that a case-blind `PINNED` sees and the real one cannot. */
export interface PinnedCaseBlind {
	path: string;
	blind: number;
	samples: readonly string[];
}

/**
 * Occurrences in `text` that `PINNED` is structurally unable to count.
 *
 * The subtraction is exact rather than approximate, and it is what makes the number
 * meaningful: `PINNED`'s only case-sensitive element is the literal `omp` itself. Both
 * of its character classes are already case-symmetric (`[^a-zA-Z0-9_-]` admits either
 * case alike), so widening only the literal's case produces a strict superset of what
 * `PINNED` already sees. Every case-blind match is therefore classified by one test —
 * is the matched literal spelled `omp`, or not — with no overlap left to reason about.
 *
 * Read the result as REACH, not as a verdict. A blind occurrence is a token the gate
 * cannot see, which says nothing about whether it is a wire contract or prose; a
 * majority of the uppercase population is ordinary prose (`OMP-owned`, `OMP-native`).
 * Deciding what any of them ARE is a table question, and this reports only that they
 * are currently being looked at through a matcher that skips them.
 */
export function countPinnedCaseBlind(text: string, pinned: RegExp = PINNED): { blind: number; samples: string[] } {
	// Fresh instances per call, carrying BOTH their own flags: `lastIndex` is mutable
	// state on the object, and rebuilding from `.source` alone would drop the flags that
	// `source` does not carry — a rebuild that reads `"gi"` off the constant rather than
	// inheriting it is the difference between this function working and returning zero
	// on a repository full of blind spots.
	//
	// Derived from the `pinned` argument rather than from the module constants, so the
	// report can be asked about a DIFFERENT base expression without a second code path.
	// Production passes the default; a caller that widens the base must see the report
	// fall silent, and routing both through here is what makes that true rather than
	// merely intended.
	// `matcher` MUST be global. A non-global `exec` ignores `lastIndex` and restarts at
	// 0 every call, so a text that matches at all never terminates this loop — the scan
	// hangs silently with no output rather than failing, which is the harder of the two
	// to notice. `sticky` below deliberately is not global; it is repositioned by hand.
	const matcher = new RegExp(pinned.source, withFlag(pinned.flags, "gi"));
	const sticky = new RegExp(pinned.source, withFlag(pinned.flags, "y"));
	const samples: string[] = [];
	let blind = 0;
	for (let m = matcher.exec(text); m !== null; m = matcher.exec(text)) {
		// Sticky, so this asks the real question — "would PINNED match at THIS offset?"
		// — rather than the cheaper-looking one of comparing the matched text against a
		// literal spelling. Those two disagree the moment PINNED changes, and the
		// comparison is the one that cannot notice: widening PINNED with the case flag
		// would leave a spelling test still counting the very occurrences PINNED had
		// just learned to see. Asking PINNED itself makes the report go quiet exactly
		// when — and only when — the blind spot is genuinely closed.
		sticky.lastIndex = m.index;
		if (sticky.test(text)) continue;
		blind++;
		// `m[1]` is the leading class, one character wide unless the match sits at the
		// very start of the file, where the `^` alternative contributes the empty string.
		const literalAt = m.index + (m[1] ?? "").length;
		if (samples.length < CASE_BLIND_SAMPLES) samples.push(text.slice(literalAt, literalAt + 3));
	}
	return { blind, samples };
}

/**
 * Every scanned path holding occurrences `PINNED` cannot count.
 *
 * Scoped with `hitPaths`, the same corpus every other stage walks, so the blind set is
 * a subset of the pinned set's world rather than a second, differently-scoped census.
 */
export async function findPinnedCaseBlind(root: string): Promise<readonly PinnedCaseBlind[]> {
	const found: PinnedCaseBlind[] = [];
	for (const relPath of await hitPaths(root)) {
		let text: string;
		try {
			text = await Bun.file(path.join(root, relPath)).text();
		} catch {
			continue; // unreadable here is unreadable for every other stage too
		}
		const { blind, samples } = countPinnedCaseBlind(text);
		if (blind > 0) found.push({ path: relPath, blind, samples });
	}
	return found;
}

/** True when the line is prose: a comment opener introduces the whole line. */
export function isCommentLine(line: string): boolean {
	const trimmed = line.trimStart();
	return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

export interface Row {
	readonly scope: string;
	readonly path: string;
	readonly hits: number;
	readonly disposition: Disposition;
	readonly reason: string;
	readonly keepRefs: string;
	/**
	 * The `RULES_VERSION` its `hits` was measured under, or `""` when the row
	 * predates the column.
	 *
	 * `hits` is a claim about the file, and a claim is only as good as the rule that
	 * produced it. Measured 2026-10-03: `PINNED` has been widened twice since the
	 * table was filled, and `countRename` gained a subtraction, so rows written under
	 * the old rules drifted by +104 and +32 on two files while the code itself moved
	 * −3 and −1. Nothing reported it — `RULES_VERSION` guards the RATCHET's ceiling,
	 * which is a different contract from row-to-rule. This column is that contract.
	 *
	 * Optional on purpose: `""` means "not stated", which is NOT the same as "wrong".
	 * Treating a missing value as drift would redden every existing row at once, and a
	 * gate that floods is a gate that gets switched off rather than fixed.
	 */
	readonly rules: string;
	/** 1-based line in the TSV, for error messages. */
	readonly line: number;
}

export interface ParseResult {
	readonly rows: readonly Row[];
	readonly problems: readonly string[];
}

const HEADER = "scope\tpath\thits\tdisposition\treason\tkeep_refs";
/**
 * The same header with the optional `rules` column.
 *
 * BOTH headers parse. A table written before the column existed still has the
 * six-cell header, and rejecting it would fail every row at once — the gate would
 * report one problem per file for a change that changed no decision. The column is
 * additive: `rules` says which rule version produced a row's `hits`, and a table
 * that has not adopted it yet says nothing false by its silence.
 */
const HEADER_WITH_RULES = `${HEADER}\trules`;

/**
 * Parse the TSV.
 *
 * No quoting and no comment lines, by design: the bead forbids both so the parser
 * has nothing to skip. A parser that can skip a line is a parser that can silently
 * skip a decision, and every explanation belongs in the `reason` column or the
 * README where a reader will look for it.
 */
export function parseTable(text: string): ParseResult {
	const rows: Row[] = [];
	const problems: string[] = [];
	const lines = text.split("\n");

	const hasRulesColumn = lines[0] === HEADER_WITH_RULES;
	if (lines[0] !== HEADER && !hasRulesColumn) {
		problems.push(`line 1: header must be exactly ${JSON.stringify(HEADER)} or ${JSON.stringify(HEADER_WITH_RULES)}`);
		return { rows, problems };
	}

	for (const [index, raw] of lines.entries()) {
		const line = index + 1;
		if (line === 1) continue;
		if (raw.trim() === "") continue;

		const cells = raw.split("\t");
		// Six cells always; a seventh only where the header declares the column. A
		// row that omits it is a row that has not stated its rule version, which is
		// `""` and is reported as unstated rather than as drift.
		const allowed = hasRulesColumn ? [6, 7] : [6];
		if (!allowed.includes(cells.length)) {
			problems.push(`line ${line}: expected ${allowed.join(" or ")} tab-separated cells, got ${cells.length}`);
			continue;
		}
		const [scope, filePath, hitsRaw, disposition, reason, keepRefs, rules = ""] = cells as [
			string,
			string,
			string,
			string,
			string,
			string,
			string?,
		];

		if (!(DISPOSITIONS as readonly string[]).includes(disposition)) {
			problems.push(`line ${line}: disposition ${JSON.stringify(disposition)} is outside the vocabulary`);
			continue;
		}
		const hits = Number(hitsRaw);
		if (!Number.isInteger(hits) || hits < 0) {
			problems.push(`line ${line}: hits must be a non-negative integer, got ${JSON.stringify(hitsRaw)}`);
			continue;
		}
		rows.push({
			scope,
			path: filePath,
			hits,
			disposition: disposition as Disposition,
			reason,
			keepRefs,
			rules,
			line,
		});
	}
	return { rows, problems };
}

/**
 * Path prefixes excluded from the rule, not from the allow-list.
 *
 * `node_modules/` is here because the scan below is a FILESYSTEM walk, not an
 * index read, and a filesystem walk does not consult `.gitignore` —
 * `check-docs-rename.ts` records the same reason and measures it (1516 markdown
 * files walked against 972 in the repository).
 *
 * Build output belongs here for a sharper version of that reason. Widening the
 * walk to `.js`/`.mjs` reached four files this repository does not ship, all
 * gitignored: `packages/collab-web/dist/rmyk4s85.js`,
 * `packages/stats/dist/client/index.js`, and the two built bundles under
 * `python/robomp/{src/static,web/dist}`. Two of those names are content hashes
 * that a rebuild changes, so a `missing-row` naming one is a violation nobody can
 * legitimately allow-list AND a verdict that differs between a fresh clone and a
 * machine that has run a build.
 *
 * Adding a new build-output root means adding it here. That is a real cost: a
 * root forgotten here reappears as a `missing-row` on whoever builds next, which
 * is the failure this list exists to prevent, so it fails loudly rather than
 * silently narrowing the gate.
 *
 * `.claude/` is a different exclusion and needs its own reason, because
 * `isInsideNestedRepository` already covers the case this list used to be the
 * only defence against. Two shapes were probed against this gate's own
 * `hitPaths`, both under `.claude/worktrees/`:
 *
 *   probe A — with a `.git` FILE, the shape `EnterWorktree` writes
 *     → reported 0 times. The nested-repository guard catches it.
 *   probe B — the same path with no `.git`, i.e. an ordinary dot-directory
 *     → reported as `missing-row`. The guard does not, and nothing else did.
 *
 * So the guard and this list cover disjoint cases and both are needed. What
 * makes `.claude/` safe to exclude here is measured, not assumed:
 * `git ls-files -- .claude` returns **0 files**, so excluding it costs no
 * coverage at all — unlike `.omp/`, which holds 16 tracked files and must stay
 * in scope for this gate.
 *
 * The local-only half of this is worth stating: `.claude/worktrees/` is hidden
 * by `.git/info/exclude`, which is never committed. A clean CI clone has
 * neither the directory nor the exclusion, so this line is free there and load-
 * bearing on a developer machine — the same walk reading a different corpus in
 * the two places is the drift this gate must not have.
 */
const EXCLUDED_PREFIXES = [
	"node_modules/",
	".git/",
	".claude/",
	"python/robomp/src/static/",
	"python/robomp/web/dist/",
];

/**
 * Build output: any path with a `dist`, `target`, `.venv` or `__pycache__` segment,
 * matching the per-package dist rule.
 *
 * `.venv` is the same lesson as `target/`, one ecosystem over, and it is here for
 * the same reason rather than as a separate preference. Adding `.py` to the glob
 * puts a whole Python environment inside the walk: this repository has two
 * (`python/omp-rpc/.venv`, `python/robomp/.venv`), and a virtualenv is a
 * directory of third-party sources that `pip install` rewrites at will. Free for
 * the reason the others are — `git ls-files` finds **0** `.py` files under any
 * `.venv`, so no file of this repository's index is lost.
 *
 * The hazard was probed rather than assumed, and in the order that makes the
 * probe mean something: the FIRST probe reported 0 planted files inside a
 * `.venv`, which was worth nothing because `.py` was not yet in the glob — a
 * zero from a chain that never ran the test. Re-probed after the extension was
 * live, with the identical file planted outside any `.venv` as the control that
 * can be non-zero.
 */
function isBuildOutput(relPath: string): boolean {
	return relPath
		.split("/")
		.some(segment => segment === "dist" || segment === "target" || segment === ".venv" || segment === "__pycache__");
}

/**
 * Every source path carrying at least one occurrence of the pinned expression.
 *
 * `.js` and `.mjs` are inside the gate because the rename has to hold on every
 * file the repository ships, not only the ones TypeScript compiles: a `.js` file
 * under a package's `src` tree, or under `packages/natives/native/`, reaches
 * production at runtime exactly like a `.ts` beside it, and leaving it outside
 * made `missing-row` report a domain it was not measuring.
 *
 * `.rs` is the same argument one language over, and it is not a small correction:
 * before this, `crates/` was not merely undecided, it was **unmeasured** — 17
 * files carrying 35 occurrences produced no row and no signal at any stage,
 * which is a gap in the gate's ground rather than a backlog in its answers.
 * That number is measured the way this gate measures — the same pinned
 * expression, over the same filesystem walk `hitPaths` itself performs, not a
 * `git grep` line count (that reports 34, because `-c` counts matching LINES and
 * one line holds two occurrences).
 *
 * `.tsx` and `.sh` joined it for the same reason, and the same blindness applied
 * to each: the table could not name a decision made in a shell script, so the
 * decision had no row and the sweep could not see it. Inventory taken with the
 * same walk and the same expression — 4 `.tsx` files / 5 occurrences, 4 `.sh` /
 * 12 — 8 files, 17 occurrences that previously produced no signal at all.
 *
 * `.py` joined last, and it is the extension where the sweep had the most to
 * lose by guessing: its ground is `python/robomp/`, a separate product with its
 * own container entrypoint, system accounts and per-slot users, plus two
 * benchmark harnesses that resolve the binary off `PATH`. Measured the same
 * way — 15 files, 79 occurrences, none of which had a row before.
 *
 * Four of those files turn on `epic-4yhd`, which is still an OPEN owner
 * decision: `metaharness/agent/omp_local.py:267` returns the command name
 * invoked inside a container, `robomp/src/sandbox.py:549,588` create a directory
 * named for the pre-rebrand product, and both benchmark scripts resolve a binary
 * off `PATH`. Those are filed `keep-wire` — the direction that sweeps NOTHING.
 * That is a holding position, not a verdict: it keeps the decision with the
 * owner instead of letting whichever agent wrote the row first decide it.
 *
 * Adding `.rs` also forced a `target/` exclusion, and the two are one change
 * rather than two preferences: `.rs` is the first extension here that Rust build
 * output is written in. Cargo emits generated `.rs` into `OUT_DIR` — 30 of them
 * under this repository's `target/` right now, from `ref-cast`, `serde` and
 * `bigdecimal` — and those are regenerated whenever a dependency changes
 * version. Without the exclusion the gate would report a `missing-row` on a file
 * no row can name, and whether it fires would depend on which crates a given
 * machine happens to have built: a red that appears on one contributor's box and
 * not another's is the same defect a nested checkout already caused here.
 * Probed, not assumed — a planted `.rs` under `target/` was reported before this
 * line and is not after it, while the identical file outside `target/` still is.
 *
 * The exclusion is free for the reason `.claude/` is: `git ls-files` finds **0**
 * files under any `target/`, so it removes no coverage of this repository's own
 * index. It is matched by SEGMENT at every level rather than as a root prefix,
 * because cargo may place a workspace target directory below the root.
 */
export async function hitPaths(root: string): Promise<readonly string[]> {
	const glob = new Bun.Glob("**/*.{ts,tsx,js,mjs,rs,py,sh}");
	const found: string[] = [];
	const nestedRepos = nestedRepoCache();
	for await (const relPath of glob.scan({ cwd: root, dot: true })) {
		if (EXCLUDED_PREFIXES.some(prefix => relPath.startsWith(prefix))) continue;
		if (isBuildOutput(relPath)) continue;
		if (isInsideNestedRepository(root, relPath, nestedRepos)) continue;
		const text = await Bun.file(path.join(root, relPath)).text();
		// Carries `PINNED.flags` for the same reason the counter above does: without the
		// case-blind flag this list of paths and the counts reported against it describe
		// two different corpora, and a file whose only occurrences are uppercase is absent
		// from one and present in the other.
		if (new RegExp(PINNED.source, PINNED.flags).test(text)) found.push(relPath);
	}
	return found.sort();
}

/**
 * Which set of rules this file implements.
 *
 * A ratchet over one of those rules records what it measured AND what it measured
 * against. Recording only the table's digest is not enough, and the hole is
 * specific: `59 changes the meaning of stale-row inside this file` leaves
 * `disposition.tsv` byte-identical, so the table digest still matches, no drift is
 * reported, the ceiling stays 9 — now silently wrong — and the run still prints
 * GREEN. Silence that looks like a pass is the worst failure a gate has.
 *
 * Bump this when a rule's MEANING changes: a class added to or removed from
 * `classMatcher`, a row that used to be reported under one name now reported under
 * another, a check that stops firing or starts firing on new input. Rewording a
 * comment, reformatting, or changing how a violation is WORDED does not need a
 * bump — a digest of this file would demand one for those, which is a false alarm,
 * and a ratchet that cries wolf is ignored.
 *
 * Read by `check-disposition-ratchet.ts`, which reports drift and never blocks on it.
 */
export const RULES_VERSION = "2026-10-03.2";

interface Violation {
	readonly rule: string;
	readonly detail: string;
}

/**
 * Tally violations by rule name, most frequent first.
 *
 * The single `N failures over M rows` line this replaces could not be acted on: a
 * reader cannot tell 9 stale rows from 90, and the baseline of 9 existed only as 9
 * scattered `FAIL stale-row` lines. A ceiling nobody can see is not a ceiling.
 */
export function tallyByRule(
	violations: readonly { readonly rule: string }[],
	problems: readonly string[] = [],
): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();
	for (const violation of violations) {
		counts.set(violation.rule, (counts.get(violation.rule) ?? 0) + 1);
	}
	if (problems.length > 0) counts.set("parse", problems.length);
	return new Map([...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/**
 * Stage `pre`: the table is complete, balanced, and reviewable.
 *
 * Two-way reconciliation is the point. Reporting only "rows with no file" would let a
 * sweep delete its own evidence; reporting only "files with no row" would let stale
 * rows accumulate. Both directions fail.
 */
export async function checkPre(root: string, rows: readonly Row[]): Promise<readonly Violation[]> {
	return (await checkPreWithCoverage(root, rows)).violations;
}

/**
 * How much of the table the `stale-row` rule actually reached.
 *
 * `examined` is the count of paths where the rule reached its own content-based
 * decision — it found the file, and the group carried at least one
 * literal-counted row, so `countClass` had something to count. A path that fails
 * either test is skipped by a `continue` and is NOT examined; it is also not
 * reported, which is what makes a zero here unreadable on its own.
 *
 * A path whose file is GONE is a deliberate exception: it is reported as
 * `stale-row` without needing a counter, so it counts as examined too — the rule
 * reached a verdict about it.
 *
 * Measured 2026-10-03 at `403cd0e2dc`: 1 examined of 644. The rule's own comment
 * records that it is "structurally blind" to live-but-miscounted rows; this
 * number is that blindness made countable, per run.
 */
export interface PreCoverage {
	readonly staleRow: { readonly examined: number; readonly of: number };
}

/**
 * `checkPre` plus the coverage its silence hides.
 *
 * `checkPre` keeps its signature and stays the thing every other caller uses
 * (`check-disposition-ratchet.ts` calls it directly) — this exists so the
 * summary can print what the rule skipped, without changing what any consumer
 * receives.
 */
export async function checkPreWithCoverage(
	root: string,
	rows: readonly Row[],
): Promise<{ violations: readonly Violation[]; coverage: PreCoverage }> {
	const violations: Violation[] = [];
	let staleRowExamined = 0;
	const paths = await hitPaths(root);
	const byPath = new Map<string, Row[]>();
	for (const row of rows) {
		const list = byPath.get(row.path);
		if (list) list.push(row);
		else byPath.set(row.path, [row]);
	}

	// Every hit file must be covered.
	for (const filePath of paths) {
		if (!byPath.has(filePath)) violations.push({ rule: "missing-row", detail: filePath });
	}
	// Every row must still describe something its own class can count.
	//
	// "Not in `paths`" is NOT that test. `paths` holds files with a PINNED hit, and
	// `keep-path` / `keep-worker-selector` are counted by LITERAL and are documented
	// as disjoint from the pinned expression — so their files legitimately have no
	// pinned hit at all. Measured 2026-10-02: that rule flagged 54 rows, every one of
	// them a live `keep-path` row over a file carrying `".omp"`, and the README states
	// the opposite ("its file may have no pinned hits at all"). A row is stale when the
	// file no longer carries what its class counts, or when the file is gone.
	//
	// The converse is the half that used to go unstated, and it is what made this rule
	// look sufficient: the `continue` below skips EVERY path in `paths`, so `stale-row`
	// never examines a file that still has a pinned hit. It therefore cannot see a row
	// that declares the wrong number over such a file — not a row that is stale, but one
	// that is live and miscounted. That population belongs to `hits-imbalance`, and this
	// rule is structurally blind to it rather than merely late to it.
	for (const [filePath, group] of byPath) {
		if (paths.includes(filePath)) continue;
		const handle = Bun.file(path.join(root, filePath));
		if (await handle.exists()) {
			// Only a class counted BY ITS OWN LITERAL can witness its own row here.
			// `keep-wire` / `keep-prose` / `rename` share one expression across every
			// row, so "does this file carry an `omp` token" is a property of the FILE,
			// not of the contract the row freezes. Measured 2026-10-02: nine rows were
			// reported stale, every one over a file that never contained an `omp` token
			// at all, because what they freeze is a third-party value (`facebook/react`,
			// the `x-exa-source` header, an OAuth `client_name`) that was never a brand
			// token. Seven of those contracts were verifiably still in force, so
			// completing the rename could never fix them — the remedy this rule used to
			// print ("delete the row with a reason") would have deleted the evidence
			// that the contract survived.
			//
			// A file that is GONE still reports, for every class: that needs no
			// counter, and a row pointing at nothing is wrong whoever wrote it.
			const literalRows = group.filter(row => classMatcher(row.disposition).literal !== undefined);
			if (literalRows.length === 0) continue;
			// Past this line the rule has opened the file and has a literal-counted row
			// to test it against, so it reaches a verdict either way — that is what
			// "examined" counts, and it is counted BEFORE the verdict is applied so a
			// row that turns out still-valid is not silently excluded from coverage.
			staleRowExamined++;
			const text = await handle.text();
			const stillCarriesIt = literalRows.some(row => countClass(text, row.disposition) > 0);
			if (stillCarriesIt) continue;
		} else {
			// GONE: reported for every class without needing a counter, and still a
			// verdict this rule reached on its own.
			staleRowExamined++;
		}
		violations.push({ rule: "stale-row", detail: filePath });
	}
	// Resolved once per run: the plan documents are a fixed set of files, and
	// re-reading them per row would make this gate's cost scale with the table.
	const definedPlanIds = await loadDefinedPlanIds(root);
	// Per-row reviewability.
	for (const row of rows) {
		if (row.reason.trim() === "") violations.push({ rule: "empty-reason", detail: `${row.path} (line ${row.line})` });
		// A row that STATES which rule version produced its `hits`, and states a
		// version this build no longer runs, is a row whose number was measured by
		// something else. `""` is unstated and is deliberately silent: the column is
		// optional, and reporting every un-migrated row would be a flood rather than a
		// finding. This fires only on a claim that is checkably out of date.
		if (row.rules !== "" && row.rules !== RULES_VERSION) {
			violations.push({
				rule: "rules-drift",
				detail: `${row.path} (line ${row.line}): hits measured under ${row.rules}, this build runs ${RULES_VERSION}`,
			});
		}
		if (requiresKeepRefs(row.disposition) && row.keepRefs.trim() === "") {
			violations.push({ rule: "missing-keep-refs", detail: `${row.path} (line ${row.line})` });
		}
		// A `keep_refs` value that names a plan node — bare `W<n>`, or the `W<n>:` prefix
		// of a namespaced one — either resolves to an id something introduced or it names
		// nothing at all. Before this rule the gate could not tell those apart:
		// `keep_refs` was checked only for being non-empty, which proves a signature
		// exists but not whose it is. The namespaced half was invisible to it as well,
		// because `BARE_PLAN_ID` is anchored and never matched `W11:anything` — so the
		// rule reported 0 for 338 rows it had not looked at.
		const node = planNodeOf(row.keepRefs);
		if (node !== null && !definedPlanIds.has(node)) {
			violations.push({ rule: "dangling-keep-ref", detail: `${row.path} (line ${row.line}) -> ${node}` });
		}
	}
	for (const [filePath, group] of byPath) {
		// A row pointing at a file that no longer exists is already reported as
		// `stale-row` above, and reading it here would throw ENOENT and take the whole
		// gate down instead of reporting the one row that is wrong.
		const handle = Bun.file(path.join(root, filePath));
		if (!(await handle.exists())) continue;
		const text = await handle.text();
		// Literal-counted classes are checked per row, against their OWN literal.
		// The group-sum invariant below cannot reach them: it compares against the
		// pinned count, which is 0 for a `".omp"`-only file, so a `keep-path` row
		// declaring `hits = 0` balanced perfectly while the file held 45 occurrences.
		// Measured 2026-10-02 across 45 rows, all declaring 0, all carrying `".omp"`.
		for (const row of group) {
			const matcher = classMatcher(row.disposition);
			if (matcher.literal === undefined) continue;
			const actual = countClass(text, row.disposition);
			if (row.hits !== actual) {
				violations.push({
					rule: "literal-hits-imbalance",
					detail: `${filePath} (line ${row.line}): ${row.disposition} declares ${row.hits}, file has ${actual} of ${matcher.literal}`,
				});
			}
		}
		// The load-bearing invariant for the pinned-counted classes, which share one
		// expression and can only be checked as a sum.
		const pinnedRows = group.filter(row => classMatcher(row.disposition).literal === undefined);
		if (pinnedRows.length === 0) continue;
		const keeps = pinnedRows.filter(row => row.disposition !== "rename").map(row => row.disposition);
		const declared = pinnedRows.reduce((total, row) => total + row.hits, 0);
		// The whole file's pinned occurrences: each keep class plus what is left for
		// `rename`. Comparing this to the declared sum is what makes a partially
		// decided file impossible to pass.
		const actual = countRename(text, keeps);
		if (declared !== actual) {
			violations.push({
				rule: "hits-imbalance",
				detail: `${filePath}: rows sum to ${declared}, file has ${actual}`,
			});
		}
	}
	// `of` is every path the table says something about — the denominator that makes
	// `examined` legible. Counting rows instead would double-count a path holding
	// several rows and understate the rule's blind spot.
	return { violations, coverage: { staleRow: { examined: staleRowExamined, of: byPath.size } } };
}

/**
 * Stage `post`: the sweep is done.
 *
 * `rename` rows must be at 0 — a leftover means someone renamed the file's other
 * occurrences and missed this class.
 *
 * `keep-*` rows are checked per row, and what that means DIFFERS BY CLASS, which is
 * why the split below is not uniform:
 *
 * - LITERAL classes (`keep-path`, `keep-worker-selector`) are genuinely per row.
 *   `countClass` returns that literal's own count, so a row declaring 3 fires
 *   `keep-shrank` when one of its 3 goes — verified by deleting one `".omp"` from a
 *   file that still held other pinned prose.
 * - PINNED classes (`rename`, `keep-wire`, `keep-prose`) are **not**. Those three are
 *   one arm of `classMatcher`, so `countClass` returns the same number for each: the
 *   FILE-WIDE pinned total. `keep-shrank` is therefore comparing the whole file's
 *   count against ONE row's `hits`, and it stays green when an occurrence leaves while
 *   the total still clears that row's number. Measured: a real file with 8 pinned
 *   occurrences, one deleted, leaves 7 — green here, while `checkPre`'s `hits-imbalance`
 *   catches it on the sum.
 *
 * So the honest statement is: **for a pinned `keep-*` row, shrinkage is verified by
 * the sum in `checkPre`, not per row here.** The per-row check that exists for these
 * classes is the literal one above. Nothing about the table's data is wrong — the two
 * files carrying both a `keep-wire` and a `keep-prose` row declare splits verified
 * occurrence by occurrence (1+7, and 6+2). A split recorded in this table is a
 * **human judgement**; the gate can confirm the pair sums to the file, and cannot
 * confirm the split between them. (epic-qoit findings B and C.)
 */
export async function checkPost(root: string, rows: readonly Row[]): Promise<readonly Violation[]> {
	const violations: Violation[] = [];
	const byPath = new Map<string, Row[]>();
	for (const row of rows) {
		const list = byPath.get(row.path);
		if (list) list.push(row);
		else byPath.set(row.path, [row]);
	}
	for (const [filePath, group] of byPath) {
		// Same reason as in `checkPre`: a row for a file that is gone must not throw.
		// `stale-row` is `--stage=pre`'s job to report; this stage only reads what exists.
		const handle = Bun.file(path.join(root, filePath));
		if (!(await handle.exists())) continue;
		const text = await handle.text();
		const keeps = group.filter(row => row.disposition !== "rename").map(row => row.disposition);
		const renameRemaining = countRename(text, keeps);
		for (const row of group) {
			if (row.disposition === "rename") {
				if (renameRemaining > 0) {
					violations.push({ rule: "rename-incomplete", detail: `${filePath}: ${renameRemaining} left` });
				}
				continue;
			}
			const remaining = countClass(text, row.disposition);
			if (remaining < row.hits) {
				violations.push({
					rule: "keep-shrank",
					detail: `${filePath} (${row.disposition}): ${remaining} left, ${row.hits} recorded`,
				});
			}
		}
	}
	return violations;
}

/** One path carrying pinned occurrences that nothing in the table accounts for. */
export interface UnreconciledPath {
	readonly path: string;
	readonly occurrences: number;
}

/**
 * Pinned occurrences no row accounts for, because every row for the path is
 * literal-counted.
 *
 * `hits-imbalance` is the one check that reconciles a file's pinned count, and it
 * compares a SUM — so it is skipped outright when the path has no pinned-counted row
 * (`checkPre`). Three rules each close over that gap without seeing it:
 *
 * - `missing-row` needs a path with NO row at all. These paths have one.
 * - `checkPost`'s `rename-incomplete` needs a `rename` row. These have none.
 * - `hits-imbalance` needs a pinned row. Their rows are `keep-path` /
 *   `keep-worker-selector`, counted by their own literal.
 *
 * So a `keep-path` row over a file that also carries bare `omp` tokens reconciles
 * nothing: the `".omp"` literal it declares and the pinned occurrences beside it are
 * different counts, and only the first is ever checked. Measured 2026-10-03:
 * 31 paths, 85 occurrences, `pre` clean over 823 rows and `post` naming none of them.
 *
 * Reported rather than failed, because each one needs a human disposition — either a
 * `rename` row to consume the occurrences or a pinned keep row to justify them — and
 * inventing rows to make the gate pass is exactly what this table exists to prevent.
 */
export async function findUnreconciledPinned(root: string, rows: readonly Row[]): Promise<readonly UnreconciledPath[]> {
	const byPath = new Map<string, Row[]>();
	for (const row of rows) {
		const list = byPath.get(row.path);
		if (list) list.push(row);
		else byPath.set(row.path, [row]);
	}
	const unreconciled: UnreconciledPath[] = [];
	for (const [filePath, group] of byPath) {
		if (group.some(row => classMatcher(row.disposition).literal === undefined)) continue;
		const handle = Bun.file(path.join(root, filePath));
		if (!(await handle.exists())) continue;
		const occurrences = countRename(await handle.text());
		if (occurrences > 0) unreconciled.push({ path: filePath, occurrences });
	}
	return unreconciled.sort((a, b) => b.occurrences - a.occurrences || a.path.localeCompare(b.path));
}

/** How many of a per-run list are named outright; the tail is counted, never dropped. */
const NAMED = 8;

/** Per-path sample cap for the case-blind report. See `countPinnedCaseBlind`. */
const CASE_BLIND_SAMPLES = 3;

async function main(): Promise<void> {
	// Every unrecognised argument is refused rather than defaulted past. `--gate0`
	// is documented in MILESTONE_5_EXECUTION_PLAN.md as W8b's Gate 0, but nothing
	// here ever read it, so it fell through to the `pre` default below and the gate
	// returned the whole pre-sweep's verdict while looking like it had been asked a
	// narrower question. StartsWith, not `indexOf`, still matters: indexOf compares
	// whole elements, so `--stage=sideways` would not match the prefix.
	readGateArgsOrExit(process.argv.slice(2), { flags: ["--stage="] });
	const stageArg = process.argv.find(arg => arg.startsWith("--stage="));
	const stage = stageArg === undefined ? "pre" : stageArg.slice("--stage=".length);
	if (stage !== "pre" && stage !== "post") {
		console.error(`unknown stage ${JSON.stringify(stage)}; expected --stage=pre or --stage=post`);
		process.exit(2);
	}

	const root = process.cwd();
	const file = Bun.file(path.join(root, TABLE_PATH));
	if (!(await file.exists())) {
		// A MISSING table is a failure, not a pass. Treating "no table" as "no
		// violations" makes the gate green precisely when it has nothing to say.
		console.log(`FAIL no-table ${TABLE_PATH} does not exist`);
		process.exit(1);
	}

	const { rows, problems } = parseTable(await file.text());
	const pre = stage === "pre" ? await checkPreWithCoverage(root, rows) : null;
	const violations = pre ? pre.violations : await checkPost(root, rows);

	for (const problem of problems) console.log(`FAIL parse ${problem}`);
	for (const violation of violations) console.log(`FAIL ${violation.rule} ${violation.detail}`);
	// One line per rule, not one lumped total. A reader has to be able to tell
	// `stale-row = 9` from `= 90` without counting `FAIL` lines by hand, because the
	// 9 is a ratchet ceiling and a ceiling nobody can see is not a ceiling.
	const tally = tallyByRule(violations, problems);
	if (tally.size === 0) console.log(`disposition(${stage}): clean over ${rows.length} rows`);
	else {
		for (const [rule, count] of tally) console.log(`disposition(${stage}): ${rule} = ${count}`);
		console.log(`disposition(${stage}): ${violations.length + problems.length} failures over ${rows.length} rows`);
	}
	// The rule whose absence reads as a pass.
	//
	// `tallyByRule` walks rules that HAVE violations, so a rule that found nothing
	// prints NO line at all — not a line reading 0. Measured 2026-10-03: `stale-row`
	// reported zero violations, so the summary said nothing about it, and a reader
	// seeing `hits-imbalance = N` and `missing-row = N` could reasonably conclude the
	// rule did not exist, had passed, or had never been run. All three are wrong: it
	// ran, and its own comment records that it is structurally blind to the one
	// population that matters most.
	//
	// Silence and a clean result are indistinguishable here, so the number is printed
	// unconditionally with the denominator that makes it mean something. Both figures
	// are computed per run; neither is a constant, because a constant here would
	// freeze the exact number this exists to keep honest.
	//
	// The wording deliberately avoids naming any other rule. `args.test.ts` asserts a
	// refused flag prints no `missing-row`, so putting that word here would make an
	// unrelated argument test red for a reason no reader could reconstruct.
	if (pre) {
		const { examined, of } = pre.coverage.staleRow;
		console.log(
			`disposition(${stage}): stale-row = ${tally.get("stale-row") ?? 0}` +
				`  (examined ${examined} of ${of} paths — structurally blind to the rest)`,
		);
	}
	// Reported, not enforced. These refs have no definition site to resolve
	// against (see countUnverifiableKeepRefs), so failing them would be failing
	// something this gate cannot judge. Printing them on every run keeps the gate
	// honest about its own reach, instead of letting a clean run be read as
	// full coverage — which is the failure this rule was written to close.
	const unverifiable = countUnverifiableKeepRefs(rows);
	if (unverifiable.count > 0) {
		const withRefs = rows.filter(row => row.keepRefs.trim() !== "").length;
		console.log(
			`disposition(${stage}): keep-refs-not-checkable = ${unverifiable.count}/${withRefs} carrying a ref ` +
				`(${unverifiable.byKind.map(([kind, n]) => `${kind}=${n}`).join(", ")}) — no definition site to resolve against`,
		);
		// The per-name list, so "which contracts exist only because of a .ts" is answered
		// by running the gate rather than by re-deriving it. Capped because this is
		// per-run output on every stage; the tail is named as a count rather than dropped
		// silently, so a truncated list cannot read as a complete one.
		const named = unverifiable.byName.slice(0, NAMED);
		for (const [ref, n] of named) {
			console.log(`disposition(${stage}):   unverifiable ref ${n} row(s): ${ref}`);
		}
		const rest = unverifiable.byName.slice(NAMED);
		if (rest.length > 0) {
			const restRows = rest.reduce((sum, [, n]) => sum + n, 0);
			console.log(
				`disposition(${stage}):   …and ${rest.length} more distinct ref(s) over ${restRows} row(s), not listed`,
			);
		}
	}

	// The gate's other honest limit: occurrences it was never asked to reconcile. Printed
	// on every run for the same reason as the ref line above — a clean run that reads as
	// full coverage is the failure both reports exist to close.
	const unreconciled = await findUnreconciledPinned(root, rows);
	if (unreconciled.length > 0) {
		const total = unreconciled.reduce((sum, u) => sum + u.occurrences, 0);
		console.log(
			`disposition(${stage}): pinned-not-reconciled = ${unreconciled.length} path(s) / ${total} occurrence(s) ` +
				`that no row accounts for (every row is literal-counted, so the group sum is skipped)`,
		);
		for (const u of unreconciled.slice(0, NAMED)) {
			console.log(`disposition(${stage}):   ${u.occurrences} occurrence(s): ${u.path}`);
		}
		const rest = unreconciled.slice(NAMED);
		if (rest.length > 0) {
			const restRows = rest.reduce((sum, u) => sum + u.occurrences, 0);
			console.log(
				`disposition(${stage}):   …and ${rest.length} more path(s) over ${restRows} occurrence(s), not listed`,
			);
		}
	}

	// The gate's last honest limit, and the only one about its own matcher rather than
	// about the table. `PINNED` spells its literal in lowercase and carries no case flag,
	// so an occurrence written `OMP-…` is invisible to EVERY class — `rename`,
	// `keep-wire` and `keep-prose` all share `{pinned: true}` and would each report zero
	// for a file holding nothing but those. A file in that state reads as finished while
	// the token is still in it, which is under-reporting rather than a missing row, so no
	// table edit can close it.
	//
	// Reported, not enforced, for the same reason as the two limits above: deciding
	// whether any given occurrence is a contract is a judgement about intent, and a gate
	// that failed them would be failing something it cannot decide. The wording says
	// "cannot count" rather than "is a contract" for the same reason — the uppercase
	// population is mostly ordinary prose (`OMP-owned`, `OMP-native`), so a reader must
	// not take this line as a work list.
	//
	// Widening `PINNED` itself is the owner's call and is deliberately NOT made here:
	// it would change what every existing row means, in every stage, at once.
	const caseBlind = await findPinnedCaseBlind(root);
	if (caseBlind.length > 0) {
		const blindTotal = caseBlind.reduce((sum, b) => sum + b.blind, 0);
		console.log(
			`disposition(${stage}): pinned-case-blind = ${caseBlind.length} path(s) / ${blindTotal} occurrence(s) ` +
				`a case-blind matcher sees and PINNED cannot (reach, not verdict — most are prose)`,
		);
		for (const b of caseBlind.slice(0, NAMED)) {
			console.log(`disposition(${stage}):   ${b.blind} occurrence(s): ${b.path} — ${b.samples.join(", ")}`);
		}
		const rest = caseBlind.slice(NAMED);
		if (rest.length > 0) {
			const restRows = rest.reduce((sum, b) => sum + b.blind, 0);
			console.log(
				`disposition(${stage}):   …and ${rest.length} more path(s) over ${restRows} occurrence(s), not listed`,
			);
		}
	}

	console.log(`disposition(${stage}): rules ${RULES_VERSION}`);
	if (violations.length > 0 || problems.length > 0) process.exit(1);
}

if (import.meta.main) await main();
