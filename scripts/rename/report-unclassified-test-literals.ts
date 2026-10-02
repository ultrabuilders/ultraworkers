/**
 * Report-only: old-brand literals in test sources that `ci-rename-test-literals.ts`
 * cannot see.
 *
 * ## Why this exists
 *
 * That gate matches a hand-written list of six needles — `{ label: '".omp"', ... }`,
 * `{ label: '"omp"', ... }`, `__omp_worker_`, `_omp/`, `omp-export-theme`,
 * `"oh-my-pi"`. An enumerated allowlist encodes the literals someone already thought
 * of. A rename sweep *manufactures new ones*: the storage key `omp-stats-theme`
 * added by 81eb208410 is invisible to all six, so the gate reported
 * "0 without a disposition row" over a file that contains one.
 *
 * With an acceptance criterion of "0 unaccounted", a matcher that sees nothing
 * satisfies it trivially — the gate cannot distinguish a clean tree from a blind
 * one. The same shape has now appeared in three gates (`FROZEN`, `PINNED`, and
 * this list).
 *
 * ## Why this does not gate yet
 *
 * Because the missed set is large and mostly *not* actionable: most of it is
 * legitimately frozen published surface (`@oh-my-pi/omp-stats` is an npm package
 * name with a real `bin`). Adding needles today would turn hundreds of rows red
 * over things nobody asked to change. So this prints the distribution and exits 0;
 * deciding which classes become needles is a separate, deliberate step.
 *
 * The output is grouped by token *shape* rather than listed per occurrence,
 * because 2649 rows is not something anyone adjudicates — the classes are.
 *
 * Run: `bun scripts/rename/report-unclassified-test-literals.ts`
 */
import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");
const GATE = path.join(REPO_ROOT, "scripts/ci-rename-test-literals.ts");

/**
 * Read the gate's needles instead of restating them.
 *
 * A second copy of the list is a second thing to drift — the same defect this
 * report exists to find. Both quote styles are matched: the gate declares two
 * needles single-quoted and three double-quoted, so a double-quote-only parse
 * silently drops half the list and understates the blind spot.
 */
async function readGateNeedles(): Promise<string[]> {
	const source = await Bun.file(GATE).text();
	const block = source.match(/const PATTERNS[^=]*=\s*\[([\s\S]*?)\];/);
	if (!block[1]) throw new Error(`PATTERNS block not found in ${path.relative(REPO_ROOT, GATE)}`);
	const needles = [...block[1].matchAll(/needle:\s*(['"])(.*?)\1/g)].map(match => match[2] ?? "");
	// Control: every declared needle must survive the parse, or the "missed"
	// column below is computed against a shorter list than the gate really uses.
	const declared = (block[1].match(/label:/g) ?? []).length;
	if (needles.length !== declared) {
		throw new Error(`parsed ${needles.length} needles but the block declares ${declared} — refusing to report`);
	}
	return needles;
}

/**
 * Deliberately broader than any needle: `omp` not flanked by an alphanumeric.
 *
 * `_` is deliberately allowed to flank so `_omp/` and `__omp_worker_` fall inside
 * it; `compaction` stays out because `c` is alphanumeric.
 */
const DETECT = /(?<![A-Za-z0-9])omp(?![A-Za-z0-9])/g;

/** The whole token around a hit, so shapes group instead of listing every occurrence. */
const TOKEN = /[A-Za-z0-9@._/-]*omp[A-Za-z0-9@._/-]*/g;

interface Shape {
	readonly shape: string;
	readonly hits: number;
	readonly files: Set<string>;
	readonly example: string;
}

const needles = await readGateNeedles();
const shapes = new Map<string, Shape>();
let seenHits = 0;
const seenFiles = new Set<string>();

const glob = new Bun.Glob("packages/*/test/**/*.ts");
for await (const relPath of glob.scan({ cwd: REPO_ROOT, dot: true })) {
	const text = await Bun.file(path.join(REPO_ROOT, relPath)).text();
	const lines = text.split("\n");
	for (const [index, line] of lines.entries()) {
		DETECT.lastIndex = 0;
		for (const hit of line.matchAll(DETECT)) {
			if (needles.some(needle => needle.length > 0 && line.includes(needle))) {
				seenHits += 1;
				seenFiles.add(relPath);
				continue;
			}
			TOKEN.lastIndex = hit.index ?? 0;
			const token = TOKEN.exec(line)?.[0] ?? "omp";
			const shape = token.replace(/[A-Za-z0-9]{2,}/g, m => (m === "omp" ? m : "·"));
			const entry = shapes.get(shape) ?? { shape, hits: 0, files: new Set<string>(), example: "" };
			entry.hits += 1;
			entry.files.add(relPath);
			if (!entry.example) entry.example = `${relPath}:${index + 1}`;
			shapes.set(shape, entry);
		}
	}
}

const ordered = [...shapes.values()].sort((a, b) => b.hits - a.hits);
const missedHits = ordered.reduce((sum, s) => sum + s.hits, 0);
const missedFiles = new Set(ordered.flatMap(s => [...s.files])).size;

console.log(`needles read from the gate (${needles.length}): ${JSON.stringify(needles)}\n`);
console.log(`seen by a needle        ${seenHits} hits in ${seenFiles.size} files`);
console.log(`MISSED by every needle ${missedHits} hits in ${missedFiles} files\n`);
console.log(`missed, grouped by token shape (· = a word run):\n`);
for (const s of ordered) {
	console.log(`  ${String(s.hits).padStart(5)}  ${String(s.files.size).padStart(4)} files  ${s.shape}`);
	console.log(`         e.g. ${s.example}`);
}

// Report-only by design: this is a visibility tool, and turning it into a gate
// before the shapes above are adjudicated would fail CI over surface nobody
// asked to rename.
process.exit(0);
