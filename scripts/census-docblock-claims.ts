#!/usr/bin/env bun
/**
 * Census: comment lines that assert an enforcement policy.
 *
 * WHY THIS IS A SCRIPT AND NOT A NUMBER IN A BEAD
 *
 * The first pass at this census recorded `8408 lines / 1364 files` (raw) and
 * `240 / 162` (narrowed). Neither figure reproduced. Four RAW variants and two
 * NARROW variants were measured: RAW ranged 9187–12570 depending only on word
 * boundaries and case, and NARROW was 360 without a prefilter and 220 with one.
 * A count that cannot be regenerated is prose wearing a number's clothes, so
 * the count lives here, every figure is printed next to the pattern that
 * produced it, and no headline figure is emitted at all.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not grade the claims. `never`/`must`/`gate` are polysemous: "the
 * gate" here is at least an async gate, a release gate, a rate gate and a CI
 * gate, and only the last is an enforcement gate. That distinction needs
 * reading, not a wider regex. What is machine-checkable is reported; what is
 * not is named as not-measured.
 *
 * USAGE
 *
 *   bun scripts/census-docblock-claims.ts [--list]
 *   bun scripts/census-docblock-claims.ts --variant=raw|narrow
 *   bun scripts/census-docblock-claims.ts --list   # + write matched lines to /tmp
 *
 * The default prints both passes, the prefilter bias between them, whether the
 * named controls are visible to the patterns that claim to find them, and
 * whether those control citations still read as recorded.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const PACKAGES = path.join(ROOT, "packages");

/** Enforcement-adjacent vocabulary, regardless of what actually enforces it. */
const RAW_TERMS = ["never", "must", "cannot", "always", "reject", "enforce", "guarantee", "by design"];
/** Claims that assert a *policy* rather than describe an intent. */
const NARROW_TERMS = ["enforced", "enforces", "guarantee", "by design", "the gate", "nothing enforces"];

/**
 * Claims read by hand. These are the controls.
 *
 * A pattern that cannot see a control it claims to have verified is not
 * measuring the population it says it measures, so the census prints each
 * control's visibility per variant and refuses to be quoted when one is
 * invisible. `expect` is the substring the cited line must still contain: if a
 * ref rots, the check names the ref instead of passing silently.
 */
const CONTROLS: readonly { ref: string; expect: string; verdict: "confirmed" | "false-positive" }[] = [
	{
		ref: "packages/coding-agent/src/tools/index.ts:888",
		expect: "deviceOnlyWrite",
		verdict: "confirmed",
	},
	{
		ref: "packages/coding-agent/src/modes/interactive-mode.ts:5483",
		expect: "Guarantees",
		verdict: "confirmed",
	},
	{
		ref: "packages/coding-agent/src/tools/fetch.ts:674",
		expect: "low-quality gate",
		verdict: "false-positive",
	},
	{
		ref: "packages/coding-agent/src/modes/controllers/command-controller.ts:1368",
		expect: "acquiring the gate",
		verdict: "false-positive",
	},
];

interface SourceFile {
	readonly file: string;
	readonly lines: readonly string[];
}

interface Hit {
	readonly file: string;
	readonly line: number;
	readonly text: string;
}

function buildMatcher(terms: readonly string[], wordBounded: boolean, ignoreCase: boolean): RegExp {
	const body = terms
		.map(term =>
			term.includes(" ") ? term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : wordBounded ? `\\b${term}\\b` : term,
		)
		.join("|");
	return new RegExp(body, ignoreCase ? "i" : "");
}

/**
 * `test/` is skipped so a comment in a test does not count as a product claim,
 * and the whole corpus is read once: every variant below is then measured over
 * the identical bytes, so a difference between two rows is a difference between
 * two patterns and nothing else.
 */
async function readCorpus(dir: string, into: SourceFile[] = []): Promise<SourceFile[]> {
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === "test") continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await readCorpus(full, into);
		} else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
			const body = await fs.readFile(full, "utf8");
			into.push({ file: path.relative(ROOT, full), lines: body.split("\n") });
		}
	}
	return into;
}

function measure(corpus: readonly SourceFile[], matcher: RegExp): { lines: number; files: number; hits: Hit[] } {
	const hits: Hit[] = [];
	let hitFiles = 0;
	for (const { file, lines } of corpus) {
		let inThisFile = 0;
		for (const [i, text] of lines.entries()) {
			if (!matcher.test(text)) continue;
			inThisFile++;
			hits.push({ file, line: i + 1, text: text.trim() });
		}
		if (inThisFile > 0) hitFiles++;
	}
	return { lines: hits.length, files: hitFiles, hits };
}

/** The exact line a control cites, so a rotted ref is reported rather than assumed. */
async function citedLine(ref: string): Promise<string | null> {
	const cut = ref.lastIndexOf(":");
	const body = await fs.readFile(path.join(ROOT, ref.slice(0, cut)), "utf8").catch(() => null);
	if (body === null) return null;
	return body.split("\n")[Number(ref.slice(cut + 1)) - 1]?.trim() ?? null;
}

const argv = process.argv.slice(2);
const only = argv.find(a => a.startsWith("--variant="))?.split("=")[1];
const corpus = await readCorpus(PACKAGES);

const RAW_VARIANTS = [
	{ label: "substring, case-sensitive", m: buildMatcher(RAW_TERMS, false, false) },
	{ label: "\\b-bounded, case-sensitive", m: buildMatcher(RAW_TERMS, true, false) },
	{ label: "substring, case-insensitive", m: buildMatcher(RAW_TERMS, false, true) },
	{ label: "\\b-bounded, case-insensitive", m: buildMatcher(RAW_TERMS, true, true) },
];
const NARROW_VARIANTS = [
	{ label: "case-sensitive", m: buildMatcher(NARROW_TERMS, false, false) },
	{ label: "case-insensitive", m: buildMatcher(NARROW_TERMS, false, true) },
];

const rows: string[] = [];
const say = (s = "") => rows.push(s);

say("scope        : packages/**/*.ts, test/ and node_modules excluded");
say(`files scanned: ${corpus.length}`);
say(`RAW regex    : ${buildMatcher(RAW_TERMS, false, false).source}`);
say(`NARROW regex : ${buildMatcher(NARROW_TERMS, false, false).source}`);
say();
say("Every count is printed beside the pattern that produced it. The variants");
say("disagree, so a single headline figure would be the error this script exists");
say("to prevent. All variants read the same bytes, so a row-to-row difference is");
say("a difference between patterns, not between corpora.");
say();

if (only !== "narrow") {
	say("RAW — enforcement-adjacent vocabulary");
	for (const v of RAW_VARIANTS) {
		const { lines, files } = measure(corpus, v.m);
		say(`  ${v.label.padEnd(32)} ${String(lines).padStart(6)} lines / ${String(files).padStart(5)} files`);
	}
	say();
}
if (only !== "raw") {
	say("NARROW — claims that assert a policy");
	for (const v of NARROW_VARIANTS) {
		const { lines, files } = measure(corpus, v.m);
		say(`  ${v.label.padEnd(32)} ${String(lines).padStart(6)} lines / ${String(files).padStart(5)} files`);
	}
	say();
}

// Prefilter bias: a NARROW∧RAW pass is smaller than NARROW alone. The cause is
// MEASURED here rather than asserted — the obvious explanation (a keyword
// capitalised at the start of a sentence is invisible to a case-sensitive RAW)
// turns out to account for almost none of it, and the real cause is a gap in
// the RAW vocabulary. Guessing here would repeat the defect this script exists
// to catch: a plausible mechanism written next to a real number.
if (only !== "raw") {
	const rawCs = buildMatcher(RAW_TERMS, false, false);
	const rawCi = buildMatcher(RAW_TERMS, false, true);
	const { hits } = measure(corpus, buildMatcher(NARROW_TERMS, false, false));
	const dropped = hits.filter(hit => !rawCs.test(hit.text));
	const pct = hits.length === 0 ? 0 : Math.round((dropped.length / hits.length) * 100);

	say("PREFILTER BIAS (NARROW ∧ RAW against NARROW alone, both case-sensitive)");
	say(`  narrowed alone      : ${hits.length}`);
	say(`  after RAW prefilter : ${hits.length - dropped.length}`);
	say(`  dropped by prefilter: ${dropped.length} (${pct}% of the narrowed set)`);
	say();

	say("  why each dropped line dropped — attributed to the NARROW term that matched it:");
	const byTerm = new Map<string, number>();
	for (const d of dropped) {
		const term = NARROW_TERMS.find(t => d.text.toLowerCase().includes(t.toLowerCase())) ?? "(no single term)";
		byTerm.set(term, (byTerm.get(term) ?? 0) + 1);
	}
	for (const [term, n] of [...byTerm].sort((a, b) => b[1] - a[1])) {
		say(`    ${String(n).padStart(4)}  via "${term}"`);
	}
	say();

	const recoverable = dropped.filter(d => rawCi.test(d.text)).length;
	const explainPct = dropped.length === 0 ? 0 : Math.round((recoverable / dropped.length) * 100);
	say("  hypothesis under test: capitalisation (a case-INsensitive RAW recovers the drops)");
	say(`    recoverable by a case-insensitive RAW : ${recoverable} / ${dropped.length}  (${explainPct}%)`);
	say(`    dropped lines with no RAW term in ANY case: ${dropped.length - recoverable}`);
	say(`    verdict: capitalisation explains ${explainPct}% — `);
	say(`    the cause is that "${byTerm.size === 1 ? [...byTerm.keys()][0] : "some NARROW terms"}" `);
	say("    is absent from the RAW vocabulary, so the prefilter silently acts as a");
	say("    semantic filter for a reason unrelated to the one it was built for.");
	say("    That is why the narrowed count and the prefiltered count are not two");
	say("    measurements of one population, and neither may be quoted as the other.");
	say();
}

// Control visibility: the decisive check, and the reason the census is a script.
if (only !== "raw") {
	say("CONTROL VISIBILITY — a pattern that cannot see its own control measures nothing");
	for (const v of NARROW_VARIANTS) {
		const { hits } = measure(corpus, v.m);
		const refs = new Set(hits.map(hit => `${hit.file}:${hit.line}`));
		for (const c of CONTROLS) {
			say(
				`  ${v.label.padEnd(18)} ${c.verdict.padEnd(15)} ${path.basename(c.ref).padEnd(24)} ${refs.has(c.ref) ? "visible" : "INVISIBLE"}`,
			);
		}
	}
	say();
	say("  INVISIBLE under the variant chosen for a census means that census is not");
	say("  covering its own evidence, and its counts must not be quoted.");
	say();
}

say("STALE CONTROLS — a ref whose line no longer contains what it is cited for");
let stale = 0;
for (const c of CONTROLS) {
	const text = await citedLine(c.ref);
	if (text === null) {
		stale++;
		say(`  GONE      ${c.ref}`);
	} else if (!text.includes(c.expect)) {
		stale++;
		say(`  DRIFTED   ${c.ref}  expected "${c.expect}", reads "${text.slice(0, 60)}"`);
	}
}
if (stale === 0) say(`  none — all ${CONTROLS.length} refs still contain their cited term`);
say();

say("NOT MEASURED, DELIBERATELY");
say("  How many claims are false. `the gate` alone matches async, release, rate");
say("  and CI gates; only the last is an enforcement gate. That needs reading, so");
say("  this script reports the keyword population and refuses to grade it.");

process.stdout.write(`${rows.join("\n")}\n`);

if (argv.includes("--list")) {
	const { hits } = measure(corpus, NARROW_VARIANTS[NARROW_VARIANTS.length - 1].m);
	await Bun.write(
		"/tmp/census-docblock-claims.txt",
		`${hits.map(hit => `${hit.file}:${hit.line}  ${hit.text}`).join("\n")}\n`,
	);
	process.stdout.write(
		`\n[--list] ${hits.length} case-insensitive NARROW lines written to /tmp/census-docblock-claims.txt\n`,
	);
}
