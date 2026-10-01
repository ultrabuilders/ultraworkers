#!/usr/bin/env bun
/**
 * R0 GRP-C — GATE. The file-count invariant: this reorganization may MOVE files
 * but must never LOSE them.
 *
 * WHY THIS IS THE ONLY GATE THAT CATCHES LOSS
 * -------------------------------------------
 * Everything else in group C is about types and imports: `check:ts` catches a
 * broken type, the test baseline catches a new failure, the export map catches a
 * removed entry point. None of them notices a directory that was `git mv`-ed and
 * then quietly deleted — a moved-then-removed path resolves nowhere, so no
 * importer breaks, because the importers went with it.
 *
 * So the check is arithmetic, not structural: `git ls-files` is a manifest, and a
 * manifest that shrinks is the signal. It is deliberately insensitive to *where*
 * files live, which is the whole point — this bead exists to move directories,
 * and a gate that pinned paths would red on every legitimate move.
 *
 * THREE COUNTERS, NOT ONE
 * -----------------------
 * `prompts/` is not one directory. It is a name repeated across ~29 directories
 * in different packages, so a single fixed path misses most of it. It is counted
 * at any depth. `tools/puppeteer/` is counted separately because it is a known
 * corpus of standing prompts that a sweep is most likely to drop by accident.
 *
 * IT MUST BE RED BOTH WAYS
 * ------------------------
 * 1. Any counter lower than the baseline → red. That is the contract.
 * 2. Baseline missing or a counter absent from it → red, NOT green. A gate that
 *    treats "nothing to compare against" as "nothing lost" would pass on exactly
 *    the run that lost the most.
 *
 * Raising a counter is allowed and needs no edit here: growth is the point of
 * adding files. Only a DROP is a failure.
 */

import * as path from "node:path";

const BASELINE = path.join(import.meta.dir, "r0-grp-c-file-counts.json");

interface Counter {
	/** git pathspec, relative to the repo root. No trailing slash: `git ls-files`
	 *  matches FILES, and a trailing slash makes the pathspec match a directory,
	 *  which silently yields zero — an empty gate that is green forever. */
	paths: string;
	label: string;
}

const COUNTERS: Counter[] = [
	{ label: "packages (all)", paths: "packages/" },
	{ label: "prompts (any depth)", paths: "packages/**/prompts/**" },
	{ label: "tools/puppeteer", paths: "packages/**/tools/puppeteer/**" },
];

type Counts = Record<string, number>;

async function measure(counter: Counter): Promise<number> {
	const proc = Bun.spawn(["git", "ls-files", counter.paths], { stdout: "pipe", stderr: "pipe" });
	const out = await new Response(proc.stdout as ReadableStream<Uint8Array>).text();
	await proc.exited;
	return out.split("\n").filter(line => line !== "").length;
}

const current: Counts = {};
for (const counter of COUNTERS) current[counter.label] = await measure(counter);

let baseline: { head: string; counts: Counts } | null = null;
try {
	baseline = (await Bun.file(BASELINE).json()) as { head: string; counts: Counts };
} catch {
	baseline = null;
}

if (!baseline) {
	console.error(`file-count invariant gate: NO BASELINE at ${BASELINE}`);
	for (const [label, count] of Object.entries(current)) console.error(`  ${label}: ${count}`);
	console.error('\nA missing baseline cannot mean "nothing lost" — it is the state after the loss.');
	process.exit(1);
}

let failed = false;
for (const counter of COUNTERS) {
	const now = current[counter.label]!;
	const before = baseline.counts[counter.label];
	if (before === undefined) {
		console.error(`file-count invariant gate: "${counter.label}" is absent from the baseline.`);
		failed = true;
		continue;
	}
	if (now < before) {
		console.error(`file-count invariant gate: ${counter.label} LOST ${before - now} file(s): ${before} → ${now}`);
		failed = true;
	}
}

if (failed) {
	console.error(`\nMoving files is allowed; losing them is not. Baseline: ${BASELINE} (HEAD ${baseline.head})`);
	console.error("If the loss was intentional, raise the baseline in the same commit that removed the files.");
	process.exit(1);
}

const summary = COUNTERS.map(c => `${c.label} ${current[c.label]}`).join(" · ");
console.log(`file-count invariant gate: green — ${summary} (baseline HEAD ${baseline.head})`);
