#!/usr/bin/env bun
/**
 * GATE — a benchmark may not assert a saving it has not established.
 *
 * WHY THIS EXISTS
 * ---------------
 * `epic-go12`: `session-tree-nav.bench.ts` printed
 *
 *     Saved -0.1210ms/navigation (-213.6% reduction per navigate)
 *
 * when the arm it called "AFTER" was 3.1x SLOWER. `savedMs` was negative and
 * the literals `Saved` and `reduction` were unconditional, so the only thing
 * separating "we saved 213%" from "we lost 213%" was a minus sign sitting
 * next to a word claiming the opposite. The two numbers above the summary
 * said the opposite of the summary. Nothing warned: a benchmark is supposed
 * to be the thing you trust when a number looks wrong.
 *
 * It was fixed twice (`76de762c6f`, `797cf942ea`) and NEITHER fix carried a
 * test or a gate, which is why the corpus was clean on arrival and why a
 * third author had every opportunity to reintroduce it. This is the missing
 * half.
 *
 * WHAT COUNTS AS A DEFECT
 * -----------------------
 * A directional literal in prose — `Saved`, `saved`, `reduction`, `faster` —
 * inside a string that is PRINTED. Prose asserts a direction; a bare number
 * does not.
 *
 * A ratio metric (`speedup: 0.80x`) is deliberately NOT flagged. A ratio
 * carries its own sign: 0.80x reads as "slower" to anyone literate, so it
 * cannot report a loss as a win. Nine such sites exist today and all are fine.
 * The 213% bug was not a ratio — it was a *sentence* asserting a saving around
 * a value that had gone negative, and that is the class this gate names.
 *
 * MEASURED BASELINE — 51 files, 0 sites
 * -------------------------------------
 * Every `.ts` under each package's `bench/` directory, not just `*.bench.ts`.
 * The narrower glob was an unexamined guess that covered 29 of 51 files, and
 * the 22 it missed included bench infrastructure (`bench-registry.ts`,
 * `candidates/*.ts`, `_harness.ts`) that prints like anything else. Widening
 * leaves the baseline at zero, so the omission was free to close — which is
 * the only reason the number below is worth quoting.
 *
 * `count-lines`, `proxy-partial-json`, `llm-assembly` and `mnemopi/native-vectors`
 * print `speedup:` ratios and are correctly absent for the reason above.
 *
 * A zero here is a MEASUREMENT, and the gate prints it on every run precisely
 * so a reader can tell "scanned 51, found none" from "found nothing because it
 * scanned nothing". It is proven able to go red against the historical line
 * rather than trusted to.
 *
 * WHAT COUNTS AS PRINTING, AND WHAT DOES NOT
 * -------------------------------------------
 * `console.*` and `process.stdout/stderr.write` — the sinks whose argument a
 * person reads. `Bun.write` is deliberately excluded: measured, its only three
 * uses under `bench/` write fixtures (a `note.txt` payload, request bodies),
 * not output, so including it would match file plumbing rather than prose.
 * Recorded here because "we looked and left it out" and "we never checked"
 * must not read the same to the next person.
 *
 * WHY NOT A TEST
 * --------------
 * A corpus scanner wired into `check:ts`, like W13 `check-docs-rename.ts` and
 * W14 `check-runtime-rename.ts`. It is not a unit test, and AGENTS.md bans
 * source-grep *tests*: a test asserting on file text breaks on harmless
 * refactors. Like those gates it allow-lists exact `(path, line, reason)`
 * entries — never a pattern — so a human signs for each exemption.
 */
import * as path from "node:path";
import { Glob } from "bun";

const REPO_ROOT = path.resolve(import.meta.dir, "..");

/**
 * Directional literals that assert an outcome in prose rather than report a
 * number. Each one is a word that is simply false when the value beside it is
 * negative.
 *
 * Case-insensitive, and that is load-bearing rather than tidy. A first pass
 * listed `Saved|saved` by hand and left the other two lowercase-only, which
 * looks deliberate and is not: measured, `SAVED`, `REDUCTION`, `FASTER`,
 * `Faster` and `Reduction` all escaped it while `Saved` did not. A gate is
 * allowed to be narrow only when the narrowness is a decision; here it was an
 * oversight that happened to be invisible on a corpus of zero.
 */
const DIRECTIONAL = /\b(saved|reduction|faster)\b/i;

/** Calls whose string argument reaches a human. */
const PRINTING = /(console\.(log|warn|error|info)|process\.(stdout|stderr)\.write)\s*\(/;

/**
 * Exact exemptions, each signed for by a human. Empty today: the corpus is
 * clean, and an exemption added "temporarily" is how this gate dies.
 */
const ALLOW_LIST: ReadonlyArray<{ path: string; line: number; reason: string }> = [];

/**
 * Blank out comments so prose *about* the bug is not mistaken for the bug.
 *
 * A block comment survives line boundaries, so this tracks state rather than
 * testing each line alone — the fix for `session-tree-nav.bench.ts` discusses
 * the word "Saved" in a comment, and scanning code without this flags the
 * explanation of the defect as the defect.
 */
function stripComments(source: string): string[] {
	const out: string[] = [];
	let inBlock = false;
	for (const line of source.split("\n")) {
		let result = "";
		let i = 0;
		while (i < line.length) {
			if (inBlock) {
				const close = line.indexOf("*/", i);
				if (close === -1) {
					i = line.length;
					continue;
				}
				inBlock = false;
				i = close + 2;
				continue;
			}
			if (line.startsWith("//", i)) break;
			if (line.startsWith("/*", i)) {
				inBlock = true;
				i += 2;
				continue;
			}
			result += line[i];
			i += 1;
		}
		out.push(result);
	}
	return out;
}

interface Site {
	readonly path: string;
	readonly line: number;
	readonly text: string;
}

// Every `.ts` under `bench/`, not just `*.bench.ts`: bench infrastructure
// (`bench-registry.ts`, `candidates/*.ts`) prints too, and a gate that quietly
// scans 29 of the 51 files in its domain is measuring less while reporting the
// same. Measured before and after the widening — the site count is 0 either way.
const glob = new Glob("packages/*/bench/**/*.ts");
const sites: Site[] = [];
let scanned = 0;

for await (const relative of glob.scan({ cwd: REPO_ROOT, absolute: false })) {
	scanned += 1;
	const source = await Bun.file(path.join(REPO_ROOT, relative)).text();
	const lines = stripComments(source);
	for (let index = 0; index < lines.length; index += 1) {
		const code = lines[index] ?? "";
		if (!DIRECTIONAL.test(code) || !PRINTING.test(code)) continue;
		const exempt = ALLOW_LIST.find(entry => entry.path === relative && entry.line === index + 1);
		if (exempt) continue;
		sites.push({ path: relative, line: index + 1, text: code.trim() });
	}
}

// The count is printed unconditionally. A gate that reports nothing on the
// clean path is indistinguishable from one that scanned nothing at all.
console.log(`bench-reporting: scanned ${scanned} benches, ${sites.length} site(s)`);

if (sites.length === 0) {
	console.log("No printed directional literals in bench output.");
	process.exit(0);
}

console.error("\nA benchmark may not print prose that asserts a saving it has not established.");
console.error("The value beside these words can go negative, and then the sentence is false:\n");
for (const site of sites) {
	console.error(`  ${site.path}:${site.line}`);
	console.error(`    ${site.text}`);
}
console.error(
	"\nEither report the direction from the sign of the number (as session-tree-nav now does),\n" +
		"print a bare ratio so the number carries its own sign, or add an exact (path, line, reason)\n" +
		"entry to ALLOW_LIST in this file and have a human sign for it.",
);
process.exit(1);
