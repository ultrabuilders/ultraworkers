#!/usr/bin/env bun

/**
 * A ratchet over one number from the disposition gate: `stale-row`.
 *
 * WHY ONLY THAT NUMBER. Three were measured as candidates on the same table:
 *
 *   total failures   708   over the decision table — a peer filling the table in
 *                            RAISES it. Ratcheting it goes red because someone
 *                            did their job.
 *   corpus size      769   over the source tree — a peer adding one test file
 *                            carrying `".omp"` raised it from 768 within the hour.
 *   stale-row          9   rises when a `keep-*` row's file loses the literal it
 *                            freezes, OR when that file is deleted outright. The
 *                            first is damage. The second is often a peer removing an
 *                            obsolete file, which is legitimate — so the remedy this
 *                            prints is "delete the row with a reason", not "revert".
 *
 * That second case is stated rather than smoothed over because it is the one way a
 * valid action can turn this red. It is acceptable: the fix is a one-line table edit
 * that records why the contract is gone, which is a decision someone has to make
 * anyway. A ratchet that never goes red is not a ratchet; one that goes red for the
 * wrong reason is. This one goes red only when a decision was skipped.
 *
 * So the baseline has to be measured over something the change cannot shift. That
 * is the whole test of a ratchet baseline: not "did I measure it twice" but
 * "what legitimate action makes this number go up". Measured 2026-10-02, and the
 * 768→769 move is why the corpus size was rejected rather than merely deferred.
 *
 * `missing-row` IS a ceiling, not a floor: it counts rows still MISSING, so going
 * down is progress. It is reported here and never blocks. Folding it into a total
 * with `stale-row` would make the total rise the moment the gate's own bugs are
 * fixed — a ratchet that goes red because the bug was fixed trains people to
 * ignore it.
 *
 * THE BASELINE RECORDS WHAT IT WAS MEASURED AGAINST — TWICE, because one record is
 * not enough. The table's digest catches "the table was edited". It cannot catch
 * "the RULE changed": altering what `stale-row` means inside `check-disposition.ts`
 * leaves `disposition.tsv` byte-identical, so the digest still matches, nothing is
 * reported, the ceiling stays 9 while measuring something else, and the run prints
 * GREEN. That is silence that looks like a pass, so `RULES_VERSION` is recorded
 * beside the table digest for exactly that hole. Both REPORT drift; neither blocks,
 * because the table is legitimately being filled in.
 *
 * This is a RUNNER, not the gate. It calls `checkPre` and reads its result; it
 * does not re-implement any rule, so the two cannot drift.
 */

import * as path from "node:path";
import {
	checkPost,
	checkPre,
	countRename,
	findUnreconciledPinned,
	parseTable,
	RULES_VERSION,
} from "./check-disposition";
import { readGateArgsOrExit } from "./args";

/**
 * The ceiling. Not the count of correct rows — the count of rows whose file has
 * stopped carrying the literal the row freezes.
 *
 * **Was 9; re-measured as 0 when the rule stopped reporting rows it cannot
 * witness.** The 9 were not nine decisions someone forgot to make. Every one was
 * a `keep-wire`/`keep-prose` row over a file that had never carried the brand
 * token the shared expression counts, so it read 0 while the third-party value the
 * row freezes — `facebook/react`, the `x-exa-source` header, an OAuth
 * `client_name` — was verifiably still in force. Renaming could never fix them,
 * and the remedy the old rule printed ("delete the row with a reason") would
 * have deleted the evidence that the contract survived.
 *
 * A note on this paragraph, since it is the same trap: the first draft of it
 * spelled the brand token out, and `hitPaths` counts a standalone occurrence of
 * that token — so describing the rule made this file qualify as the kind of file
 * the rule audits, and `missing-row` rose by one for no reason but this comment.
 * The token is named in `check-disposition.ts`, which the rule already counts;
 * it is not repeated here.
 *
 * So the 9 measured a set the rule could not distinguish, not a backlog. Holding
 * the old number here after the rule changed would leave a green gate reporting a
 * quantity it no longer computes, which is worse than the miscount it replaced:
 * 0 is the strictest ratchet available, and it now goes red on the first row that
 * genuinely stops carrying its own literal.
 */
export const STALE_ROW_BASELINE = 0;

/**
 * The digest of `disposition.tsv` when the baseline above was measured. Reported
 * on every run so a drift is attributable; a mismatch is information, not a
 * failure, because peers are still filling the table.
 */
export const BASELINE_TABLE_DIGEST = "ffe1ed638390250b9459dc8d2cd682d7";

/**
 * The rules the ceiling was measured against, as a literal.
 *
 * The table digest alone is not enough, and the gap is not hypothetical: a change
 * to `check-disposition.ts` that alters what `stale-row` MEANS leaves the table
 * byte-identical, so the digest still matches, no drift is printed, the ceiling
 * stays 9 — now wrong — and the run still prints GREEN. The rules version is what
 * catches that; the table digest only catches "the table was edited".
 *
 * **A literal, deliberately not `RULES_VERSION`.** This was `= RULES_VERSION`, and
 * that made the comparison at the drift check a variable against itself: it could
 * not fail, so the guard its own docblock describes above did not exist. Measured
 * before this line changed — bumping `RULES_VERSION` to `2099-01-01.99` left the
 * run printing `ceiling set against 2099-01-01.99`, i.e. GREEN, against a ceiling
 * that had been measured under different rules. A pinned value is the value at the
 * moment of measuring; importing it yields the value at the moment of running, and
 * those are the moment the guard exists to tell apart.
 *
 * Bumping `RULES_VERSION` in `check-disposition.ts` therefore now needs this
 * literal bumped with it, in the same commit — that is the intended friction.
 */
export const BASELINE_RULES_VERSION = "2026-10-03.1";

const TABLE_PATH = "scripts/rename/disposition.tsv";

export interface RatchetVerdict {
	readonly staleRow: number;
	readonly baseline: number;
	readonly ok: boolean;
	/** Reported, never blocking — it counts rows still missing, so it must fall. */
	readonly missingRow: number;
	/**
	 * Also a ceiling, and for the same structural reason. The rule fires when a row's
	 * declared `hits` disagrees with the file, so correcting a row REMOVES the
	 * violation: it falls as the table is filled in. Reported with that label because
	 * an unlabelled 71 reads as a threshold, and a threshold that moves down on
	 * purpose is the one thing nobody should mistake for a ceiling to defend.
	 */
	readonly literalImbalance: number;
	/**
	 * The same ceiling shape again, and the rule that was previously invisible here: it is
	 * emitted by `checkPre`, but nothing in this file counted it, so a row whose declared
	 * `hits` disagreed with its file could sit red in the table and CI stayed green.
	 *
	 * Reported, not gated — the live count is peers' in-flight sweep, and gating it would
	 * redden CI for everyone mid-sweep. Gated once the sweep settles; see `epic-q8f0`.
	 */
	readonly hitsImbalance: number;
	/**
	 * A ceiling in OCCURRENCES, not in rows — the unit that matters here is the pinned
	 * occurrence no row accounts for, because that is what the sweep would leave behind.
	 *
	 * Not a violation and never one: each of these needs a human disposition (a
	 * `rename` row to consume it, or a pinned `keep` row to justify it), and failing
	 * them now would redden CI for 31 paths over work nobody has decided yet. It lives
	 * here rather than only in `check-disposition`'s output because a number printed on
	 * one run is not a ceiling — nobody re-reads yesterday's stdout. This one is on
	 * every run and reads against the previous one. Gated once the sweep settles.
	 */
	readonly unreconciledPinned: number;
	/** The same population counted by path, so a jump is attributable to a file. */
	readonly unreconciledPaths: number;
	/**
	 * GATED, unlike every metric above it, and the difference is the point. A sweep
	 * never changes which plan documents exist, so this count has no legitimate
	 * non-zero reading. Its siblings are reported-then-gated-later because peers
	 * were mid-sweep; a dead keep_refs id has no such excuse, and leaving it ungated
	 * would ship the rule into the very blind spot hitsImbalance was just removed
	 * from. Must be 0.
	 */
	readonly danglingKeepRef: number;
}

/** One `rename` row whose declared `hits` disagrees with the file. */
export interface RenameHitsDrift {
	readonly path: string;
	readonly declared: number;
	readonly actual: number;
}

/**
 * `rename` rows whose declared `hits` the file contradicts, in table order.
 *
 * Reads each file once and counts with the gate's own `countRename`, so a row is
 * never judged against a different matcher than the one that will fire on it.
 * A file that cannot be read is skipped rather than counted as drift: an unreadable
 * file is already the `stale-row` gate's business, and reporting it here as a lie
 * would name the wrong cause.
 */
export async function measureRenameHitsDrift(
	root: string,
	rows: readonly { readonly path: string; readonly hits: number; readonly disposition: string }[],
): Promise<readonly RenameHitsDrift[]> {
	const drift: RenameHitsDrift[] = [];
	for (const row of rows) {
		if (row.disposition !== "rename") continue;
		const handle = Bun.file(path.join(root, row.path));
		if (!(await handle.exists())) continue;
		const actual = countRename(await handle.text());
		if (actual !== row.hits) drift.push({ path: row.path, declared: row.hits, actual });
	}
	return drift;
}

/**
 * Apply the ratchet to a gate result. Pure: it takes violations, not a tree, so a
 * test can drive every branch without touching the repository.
 *
 * Neither parameter after `violations` is defaulted, and that is the contract rather
 * than an omission. `unreconciledPinned` is a ceiling that must FALL, so `0` is the one
 * value that reads as healthy — a default of `{ occurrences: 0, paths: 0 }` let any
 * caller that forgot the argument print `unreconciled-pinned = 0 (… over 0 path(s) that
 * no row accounts for)`, a clean reading produced by not measuring. Requiring both
 * arguments makes "I did not check" a compile error instead of a passing line.
 */
export function checkRatchet(
	violations: readonly { readonly rule: string }[],
	baseline: number,
	unreconciled: { readonly occurrences: number; readonly paths: number },
): RatchetVerdict {
	const count = (rule: string) => violations.filter(v => v.rule === rule).length;
	const staleRow = count("stale-row");
	const danglingKeepRef = count("dangling-keep-ref");
	return {
		staleRow,
		baseline,
		ok: staleRow <= baseline && danglingKeepRef === 0,
		missingRow: count("missing-row"),
		literalImbalance: count("literal-hits-imbalance"),
		hitsImbalance: count("hits-imbalance"),
		unreconciledPinned: unreconciled.occurrences,
		unreconciledPaths: unreconciled.paths,
		danglingKeepRef,
	};
}

/**
 * MD5, not a truncated sha256. The baseline digest was recorded with `md5sum` before
 * this file existed, and a comparison between two digests of different lengths can
 * never succeed — the drift line would fire on every run and the mismatch would read
 * as "the table changed" when the truth is "these two were never comparable".
 *
 * That exact bug shipped for as long as it took a peer to read the file, because
 * nothing asserted the output was comparable with the constant. It is pinned now.
 */
export function digest(text: string): string {
	const hasher = new Bun.CryptoHasher("md5");
	hasher.update(text);
	return hasher.digest("hex");
}

async function main(): Promise<number> {
	const root = process.cwd();
	const tableText = await Bun.file(path.join(root, TABLE_PATH)).text();
	const { rows, problems } = parseTable(tableText);
	if (problems.length > 0) {
		// A table the parser rejects has no rows to count, so every number below
		// would be 0 — and 0 is under any baseline. Report the real problem instead
		// of a green run over a table that was never read.
		console.error(`[ratchet] ${TABLE_PATH} did not parse:`);
		for (const problem of problems) console.error(`  ${problem}`);
		return 2;
	}

	const unreconciled = await findUnreconciledPinned(root, rows);
	const verdict = checkRatchet(await checkPre(root, rows), STALE_ROW_BASELINE, {
		occurrences: unreconciled.reduce((sum, u) => sum + u.occurrences, 0),
		paths: unreconciled.length,
	});
	// REPORTED, never gated, and deliberately not part of `checkRatchet`: that
	// function is pure over violations, and threading this in would mean a
	// defaulted argument — the exact shape whose zero reads as healthy when the
	// caller simply forgot to measure. See `measureRenameHitsDrift`.
	//
	// `checkPost` reads `row.hits` for exactly one disposition — `keep-shrank`, via
	// `keep-*-shrank`. On a `rename` row the column is never read: the violation is
	// raised from the FILE (`if (renameRemaining > 0)`), not from the number. So a
	// `rename` row can declare any `hits` and cost nothing, which is what this
	// counts. `hits-imbalance` does not cover it either — that compares a path's
	// rows SUM against the file's count, and a set of rows can satisfy the sum
	// while every row still lies.
	//
	// Ungated while the drift is real: gating it now would redden CI for a number
	// nobody has fixed yet, and since `check:ts` is an `&&` chain it would hide
	// every link after it. A gate earns its red by being able to go green first.
	const drift = await measureRenameHitsDrift(root, rows);
	// `check-disposition.ts` runs `--stage=pre` by DEFAULT (`:825`), and `checkPost` is
	// the ONLY source of `rename-incomplete` and `keep-shrank`. Nothing in CI invokes
	// that script at all — `check:disposition-ratchet` is the only disposition entry in
	// `package.json`, and it calls `checkPre` alone. So running the gate by hand and
	// reading its exit code reports the renames as DONE when `checkPost` never ran:
	// that exact mistake closed `epic-m5.3` on 2026-10-03 with "0 rename-incomplete".
	// Measured here instead, ungated, for the same reason as `drift` above.
	const postViolations = await checkPost(root, rows);
	const countPost = (rule: string) => postViolations.filter(v => v.rule === rule).length;
	const printed = digest(tableText);
	const tableDrift = printed === BASELINE_TABLE_DIGEST ? "" : "  ← table edited since the ceiling was set";
	const rulesDrift =
		RULES_VERSION === BASELINE_RULES_VERSION
			? ""
			: "  ← RULES CHANGED: this ceiling may be measuring a different thing";

	console.log(
		`[ratchet] metric    : stale-row (a row whose file no longer carries its own literal)\n` +
			`[ratchet] measured  : ${verdict.staleRow}\n` +
			`[ratchet] ceiling   : ${verdict.baseline}\n` +
			`[ratchet] table     : ${TABLE_PATH} · ${rows.length} rows · md5:${printed}\n` +
			`[ratchet] ceiling set against md5:${BASELINE_TABLE_DIGEST}${tableDrift}\n` +
			`[ratchet] rules     : ${RULES_VERSION} (ceiling set against ${BASELINE_RULES_VERSION})${rulesDrift}\n` +
			`[ratchet] gated, must be 0:\n` +
			`[ratchet]   dangling-keep-ref      = ${verdict.danglingKeepRef}   (a keep_refs id no plan document introduces)\n` +
			`[ratchet] reported, not gated — all seven are CEILINGS, they must fall:\n` +
			`[ratchet]   missing-row             = ${verdict.missingRow}   (rows still not covered)\n` +
			`[ratchet]   literal-hits-imbalance  = ${verdict.literalImbalance}   (rows whose declared hits ≠ the file's)\n` +
			`[ratchet]   hits-imbalance          = ${verdict.hitsImbalance}   (a path's rows sum ≠ the file's count)\n` +
			`[ratchet]   rename-hits-drift       = ${drift.length}   (rename rows whose declared hits ≠ countRename; no gate reads this column)\n` +
			`[ratchet]   rename-incomplete      = ${countPost("rename-incomplete")}   (post-stage: rename rows with occurrences left; check-disposition.ts defaults to --stage=pre, so this is otherwise never run)\n` +
			`[ratchet]   keep-shrank            = ${countPost("keep-shrank")}   (post-stage: keep-* row lost occurrences; same blind spot)\n` +
			`[ratchet]   unreconciled-pinned     = ${verdict.unreconciledPinned}   (pinned occurrences over ${verdict.unreconciledPaths} path(s) that no row accounts for)`,
	);

	if (!verdict.ok) {
		console.error(
			`\n[ratchet] FAIL  ${verdict.danglingKeepRef > 0 ? `dangling-keep-ref is ${verdict.danglingKeepRef}` : `stale-row is ${verdict.staleRow}, over the ceiling of ${verdict.baseline}`}.\n` +
				// The body must diagnose the cause that actually fired. A stale-row failure
				// and a dangling-ref failure have opposite remedies, and one body naming
				// only the first sends the reader to restore a literal that is present.
				(verdict.danglingKeepRef > 0
					? `Each one is a keep_refs naming a plan id no MILESTONE_*_EXECUTION_PLAN.md\n` +
						`introduces, so the row points at nothing this repo can resolve. Point it at a\n` +
						`plan id that does exist, or drop the bare id — the gate reads a definition\n` +
						`site (a \`W<n>.\` heading), not a mention, and will not follow one into\n` +
						`another id. Namespaced refs (W11:*, a57q:*) are not this shape and are\n` +
						`counted as not checkable instead.`
					: `Each one is a file that stopped carrying the literal a keep-* row still freezes —\n` +
						`a signed-off wire contract or on-disk path that quietly disappeared. That is the\n` +
						`opposite of what the row authorised. Restore the literal, or delete the row with a\n` +
						`reason saying the contract is gone.`),
		);
		return 1;
	}
	return 0;
}

if (import.meta.main) {
	// Takes no arguments; see `args.ts` for why an unread argument is refused rather
	// than ignored. Reported, never blocking — the exit code still comes from main().
	readGateArgsOrExit(process.argv.slice(2));
	process.exitCode = await main();
}
