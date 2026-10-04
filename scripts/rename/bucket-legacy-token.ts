/**
 * DRAFT — W13 measurement. Reports; does not gate. Exits 0.
 *
 * `check-docs-rename.ts` answers "how many legacy tokens are left?". This answers the
 * question that number hides: **whose decision is each one?**
 *
 * Rule A's acceptance criterion is a 25-line allow-list. That budget can only be judged
 * once the 869 in-scope occurrences are split by the bead that owns them, because an
 * allow-list wide enough to hold occurrences belonging to *other* milestones is a gate
 * that has stopped gating. Measured on the tree at the time of writing:
 *
 *   IN SCOPE  113 files / 869 occurrences      EXCLUDED  293 files / 14399 occurrences
 *
 *     config-dir   (W6)        340 occ    68 files
 *     prose noun   (W13)       327 occ    75 files
 *     on-disk name (W9)        134 occ    39 files
 *     wire/header  (W9)         44 occ     9 files
 *     command-pos  (W13)        13 occ     3 files
 *     protocol     (W9/W12)     11 occ     5 files
 *
 * W13's own share is 340; 529 belong to W6/W7/W9. Hence: Rule A gates `command-pos`
 * only (13 occurrences, comfortably inside 25 lines), and the other buckets move to the
 * gate that owns them.
 *
 * HOW THE BUCKETS ARE ASSIGNED — and the two ways this was got wrong first
 * ------------------------------------------------------------------------
 * Each occurrence is counted into exactly ONE bucket — but that is a consequence of WHERE
 * THE WINDOW IS TAKEN, not a property of the rules. The window is anchored to the first
 * token on a line and shared by every token on that line, so the first matching rule is
 * effectively decided once per line and inherited by each of its tokens. Read the table as
 * "a line's tokens were judged together", not "each token was judged on its own merits".
 * An earlier version tested every rule per file and added the counts, which double-counted
 * any occurrence two rules could both claim and reported a total of **-60** for a corpus of
 * 869. A bucket table whose parts do not sum to its whole is not a measurement.
 *
 * `command-pos` is deliberately NOT anchored to the start of a line. Real command tokens
 * sit mid-line inside backticks — `see \`omp stats\`` — so an anchored rule reported **1**
 * occurrence where an unanchored one reports 13. Anchoring looked like a finding; it was
 * a broken classifier. If you see "only one command left", that is the classifier, not
 * the repository.
 *
 * Run: `bun run scripts/rename/bucket-legacy-token.ts [root]`
 */
import * as path from "node:path";
import { isExcluded } from "./check-docs-rename";
import { readGateArgsOrExit } from "./args";
import { isInsideNestedRepository, nestedRepoCache } from "./scan-scope";

/** The legacy token, same shape `check-docs-rename.ts` scans with. */
const LEGACY_TOKEN = /\bomp\b/g;

/**
 * Buckets are keyed by the milestone that owns the decision, not by how the token reads.
 * Order is significant: `npm-scope` before `config-dir`, because `@omp/` would otherwise be
 * swallowed by the looser config-dir rule.
 */
const BUCKETS: [string, RegExp][] = [
	["npm-scope    (W7)", /@omp\//],
	["config-dir   (W6)", /\.omp(?:\/|["'\s,)])|\.omp$|omp\/(?:config|logs|sessions|wt|cache)/],
	["protocol     (W9/W12)", /omp:\/\//],
	["wire/header  (W9)", /omp\.sh|X-Title/],
	["on-disk name (W9)", /[\w./-]*[./_-]omp[\w./-]*/],
	// Unanchored on purpose — see the header note. Accepts `omp <sub>` mid-line in backticks.
	// The lookbehind keeps it off identifiers (`@omp/`, `npm-omp`), and `(?!')` keeps a
	// possessive off the command branch so `stats`/`setup`/`search` are not excluded.
	["command-pos  (W13)", /(?<![\w./@~-])omp(?=\s+(?!')[a-z]|--)/],
];

const UNBUCKETED = "UNBUCKETED (prose noun)";

export interface Bucket {
	readonly name: string;
	readonly occurrences: number;
	readonly files: number;
}

/**
 * Classify a context window by the rules above. First matching rule wins.
 *
 * The parameter is a WINDOW, not an occurrence — see the note at the call site in
 * `bucketLegacyTokens`. A window is shared by every token on its line, so "first match
 * wins" is decided once per line and then applied to each of that line's tokens.
 *
 * Exported so a test can pin the verdict of a single string. Until this was exported the
 * classifier had no unit seam: `bucketLegacyTokens` returns aggregate counts only, so the
 * one fixture that carries both known defects could only be asserted through its sum — and
 * the sum held with both defects intact.
 */
export function classify(context: string): string {
	for (const [name, pattern] of BUCKETS) {
		if (pattern.test(context)) return name;
	}
	return UNBUCKETED;
}

export interface BucketReport {
	readonly inScopeOccurrences: number;
	readonly inScopeFiles: number;
	readonly excludedOccurrences: number;
	readonly excludedFiles: number;
	readonly buckets: Bucket[];
}

/** Bucket every legacy occurrence in scope by decision owner. */
export async function bucketLegacyTokens(root: string): Promise<BucketReport> {
	const glob = new Bun.Glob("**/*.md");
	const occurrences: Record<string, number> = {};
	const filesByBucket: Record<string, Set<string>> = {};
	const excludedFiles = new Set<string>();
	let inScopeOccurrences = 0;
	let inScopeFiles = 0;
	let excludedOccurrences = 0;
	const nestedRepos = nestedRepoCache();

	for await (const relPath of glob.scan({ cwd: root, dot: true })) {
		if (isInsideNestedRepository(root, relPath, nestedRepos)) continue;
		const text = await Bun.file(path.join(root, relPath)).text();
		let sawInScope = false;
		for (const line of text.split("\n")) {
			for (const _match of line.matchAll(LEGACY_TOKEN)) {
				if (isExcluded(relPath)) {
					excludedOccurrences++;
					excludedFiles.add(relPath);
					continue;
				}
				const at = line.search(LEGACY_TOKEN);
				// ONE WINDOW PER LINE, NOT PER OCCURRENCE. `at` is the FIRST token on the
				// line, and every occurrence on that line is then judged against the same
				// window. So a single backticked command promotes every token on its line
				// into `command-pos` — including config paths and ordinary prose that share
				// it. On the corpus that produced this classifier, one line of browser-relay
				// prose contributed 5 occurrences and another 3.
				//
				// Do not read the bucket table as "each occurrence was classified on its own
				// merits". It is not, and it never was: per-occurrence assignment is a
				// consequence of where the window is taken, not a property of the design.
				const context = line.slice(Math.max(0, at - 60), at + LEGACY_TOKEN.source.length + 60);
				const bucket = classify(context);
				occurrences[bucket] = (occurrences[bucket] ?? 0) + 1;
				(filesByBucket[bucket] ??= new Set()).add(relPath);
				inScopeOccurrences++;
				sawInScope = true;
			}
		}
		if (sawInScope) inScopeFiles++;
	}

	const buckets = Object.entries(occurrences)
		.map(([name, count]) => ({ name, occurrences: count, files: filesByBucket[name]!.size }))
		.sort((a, b) => b.occurrences - a.occurrences);

	const sum = buckets.reduce((total, bucket) => total + bucket.occurrences, 0);
	if (sum !== inScopeOccurrences) {
		// The parts must reconstruct the whole; if they do not, the classifier double-counted.
		throw new Error(`bucket sum ${sum} != in-scope occurrences ${inScopeOccurrences}`);
	}

	return {
		inScopeOccurrences,
		inScopeFiles,
		excludedOccurrences,
		excludedFiles: excludedFiles.size,
		buckets,
	};
}

if (import.meta.main) {
	// One optional positional path, no flags — see `args.ts` for why an unrecognised
	// argument is refused instead of being used as the path.
	const root = readGateArgsOrExit(process.argv.slice(2), { positionals: 1 })[0] ?? process.cwd();
	const report = await bucketLegacyTokens(root);
	process.stdout.write(
		`REPORT in-scope ${report.inScopeFiles} files, ${report.inScopeOccurrences} occurrences\n` +
			`REPORT excluded ${report.excludedFiles} files, ${report.excludedOccurrences} occurrences\n`,
	);
	for (const bucket of report.buckets) {
		process.stdout.write(`REPORT ${bucket.name} ${bucket.occurrences} occ ${bucket.files} files\n`);
	}
	const w13 = report.buckets
		.filter(bucket => bucket.name.includes("W13") || bucket.name === UNBUCKETED)
		.reduce((total, bucket) => total + bucket.occurrences, 0);
	process.stdout.write(
		`REPORT W13 share ${w13}  other milestones ${report.inScopeOccurrences - w13}\n` +
			`REPORT draft — reporting only, exit 0; not wired into any gate\n`,
	);
}
