/**
 * Byte-equivalence harness for the inline lexer.
 *
 * Why this exists: four sessions rebuilt the same ad-hoc comparison on 2026-10-02, and
 * one of them measured a *patched* tree and used the result to dismiss the very
 * quadratic the patch fixed. The comparison is only meaningful when both sides run in
 * the same process against the same corpus — running two processes and diffing after
 * the fact is what let that happen.
 *
 * Usage:
 *   bun run scripts/marked-equivalence.ts <ref-a> [ref-b]
 *
 * With one ref, that ref is compared against the working tree (so uncommitted changes
 * count as the "b" side). With two, they are compared against each other. Both sides
 * are loaded into this one process.
 *
 * This reports byte equivalence of tokens and of rendered HTML, and nothing else. It
 * deliberately asserts no timing: work-shape claims need a counter, not a clock, and
 * on a loaded machine a millisecond threshold is noise with a pass/fail attached.
 *
 * Two levels of comparison run, and the report prints both counts. Every input goes
 * through `Marked().parse()`; smaller ones additionally go through `lexInline()` as a
 * whole document. See MAX_WHOLE_DOCUMENT_INLINE_CHARS for why the second one is capped.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type * as MarkedApi from "../src/marked";

type MarkedModule = typeof MarkedApi;

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");
const MARKED_PATH = "packages/utils/src/marked/core.ts";

/** One dynamic `import()` in this file, and it is load-bearing.
 *
 * The whole point is to load a *specific git revision* of a module, chosen at
 * runtime. A static top-level import binds one path at build time, so it cannot
 * express "this ref, and that ref, side by side". The type side stays static via the
 * `MarkedApi` import above; only the value load is dynamic.
 */
async function loadMarked(filePath: string): Promise<MarkedModule> {
	return (await import(pathToFileUrl(filePath))) as MarkedModule;
}

function pathToFileUrl(filePath: string): string {
	return `file://${filePath}`;
}

function git(args: string[]): string {
	const proc = Bun.spawnSync(["git", "-C", REPO_ROOT, ...args]);
	if (proc.exitCode !== 0) {
		throw new Error(`git ${args.join(" ")} failed (${proc.exitCode}): ${proc.stderr.toString().trim()}`);
	}
	return proc.stdout.toString();
}

/** Materialise one revision's lexer into a temp file and import it.
 *
 * The argument may also be a path to a `.ts` file, which is how you point the harness
 * at an experiment you have not committed yet — and how the harness gets a positive
 * control, since every revision in this file's history turned out to be byte-equivalent
 * on the corpus, so "IDENTICAL" against real refs proves nothing on its own.
 */
async function loadRef(ref: string): Promise<MarkedModule> {
	if (ref.endsWith(".ts")) {
		const resolved = path.isAbsolute(ref) ? ref : path.join(REPO_ROOT, ref);
		return loadMarked(resolved);
	}
	let source: string;
	try {
		source = git(["show", `${ref}:${MARKED_PATH}`]);
	} catch {
		throw new Error(`cannot read ${MARKED_PATH} at ref "${ref}" — is it a commit-ish that contains the file?`);
	}
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "marked-equiv-"));
	const file = path.join(dir, "core.ts");
	// core.ts has no imports of its own, so a single file is the whole module and it
	// can be imported from outside the package without dragging the tree along.
	await fs.writeFile(file, source);
	return loadMarked(file);
}

async function loadWorkingTree(): Promise<MarkedModule> {
	return loadMarked(path.join(REPO_ROOT, MARKED_PATH));
}

/**
 * Adversarial cases, generated rather than hand-listed so a boundary cannot be
 * missed by forgetting to type it. Each group targets one mechanism that was found
 * to be quadratic or boundary-sensitive in the inline lexer.
 */
function buildAdversarialCases(): string[] {
	const cases: string[] = [];
	const push = (s: string) => {
		cases.push(s);
	};

	// Hard breaks: run width on both sides of the {2,} boundary, with a backslash
	// form, and with newlines before and after so the leftmost match has to be found.
	for (const w of [0, 1, 2, 3, 4, 5, 8, 17, 40]) {
		const spaces = " ".repeat(w);
		push(`a${spaces}\nb`);
		push(`a${spaces}\n\nb`);
		push(`\n${spaces}\nb`);
		push(`a${spaces}\n${spaces}\n`);
		push(`x${spaces}\n`);
		push(`a${" ".repeat(w)}\\\n`);
		push(`${spaces}`);
		push(`${spaces}\ntail`);
	}

	// Backtick runs: pure runs at fence boundaries, runs that close, runs next to text.
	for (const w of [1, 2, 3, 4, 5, 6, 7, 8, 16, 17, 32, 33, 64, 65]) {
		const run = "`".repeat(w);
		push(run);
		push(`a${run}`);
		push(`${run}b`);
		push(`${run}${run}`);
		for (const k of [1, 2, 3, 4, 8]) push(`${run}c${"`".repeat(k)}`);
	}
	for (const s of [
		"`a`",
		"`a` and `b`",
		"``a`b``",
		"a `b` c",
		"```js\nx\n```",
		"`unclosed",
		"\\`x\\`",
		"*`a`*",
		"[`a`](u)",
	]) {
		push(s);
	}

	// Bare links and email: the branch that had a greedy `+` in front of a required `@`.
	for (const local of ["a", "_", "a_b", "_a_b_", "a.b", "a+b", "-", "a".repeat(40), "_".repeat(40)]) {
		for (const domain of ["b.co", "b", "b.", "_b.co", "b-c.co"]) {
			push(`${local}@${domain}`);
			push(`see ${local}@${domain} and http://x.co/a_b`);
		}
	}
	for (const s of [
		"@a.co",
		"a@",
		"a@b",
		"x@@a.co",
		"@@a@b.co",
		"www.x.com/p",
		"https://e.com/a_b_c",
		"a_b",
		"a.b+c@co.io",
	]) {
		push(s);
	}

	// Emphasis, autolink, escape, strikethrough — the other inline branches.
	for (const w of [1, 2, 3, 4, 8, 17]) {
		push("*".repeat(w));
		push("_".repeat(w));
		push(`${"*".repeat(w)}a${"*".repeat(w)}`);
		push(`${"_".repeat(w)}a${"_".repeat(w)}`);
		push(`<${"<".repeat(w)}`);
		push(`<https://e.com/${"<".repeat(w)}>`);
	}
	for (const s of [
		"~~a~~",
		"~".repeat(8),
		"\\*not em\\*",
		"a\\",
		"<a@b.co>",
		"***a***",
		"___a___",
		"a**b**c",
		"[a](b 'c')",
		"![i](u)",
	]) {
		push(s);
	}

	return [...new Set(cases)];
}

/** Every Markdown file git tracks, read from the working tree. */
async function loadRepoMarkdown(): Promise<Array<{ label: string; text: string }>> {
	const files = git(["ls-files", "*.md"])
		.split("\n")
		.filter(Boolean)
		.filter(f => !f.includes("node_modules/"));
	const out: Array<{ label: string; text: string }> = [];
	for (const f of files) {
		out.push({ label: f, text: await fs.readFile(path.join(REPO_ROOT, f), "utf8") });
	}
	return out;
}

interface Mismatch {
	label: string;
	kind: "tokens" | "html";
	preview: string;
	a: string;
	b: string;
}

/**
 * Markdown above this size is still compared through `Marked().parse()` in full, but not fed
 * through `lexInline()` as one giant inline string. `parse()` is the path consumers take: it
 * walks the document block by block, so each inline chunk is line-sized. Handing the whole
 * document to `lexInline()` instead treats block syntax as inline text, which no consumer does,
 * and on this repository's corpus it is ruinous — the largest document is 3.95 MB, and on the
 * pre-fix lexer `parse()` renders all of it in ~8 s while `lexInline()` needs ~27 s for the first
 * 400 kB and is still super-linear (2x the input costs 3.65x). That is not a slower test of the
 * same contract; it is a different, more expensive one.
 *
 * Every file is still compared. This only decides whether a *second*, non-consumer comparison is
 * run on top of the real one, and the report below prints both counts so the number of
 * comparisons can never be read as "both, always".
 */
const MAX_WHOLE_DOCUMENT_INLINE_CHARS = 64 * 1024;

async function compare(
	label: string,
	input: string,
	a: MarkedModule,
	b: MarkedModule,
	out: Mismatch[],
	wholeDocumentInline: boolean,
): Promise<number> {
	let comparisons = 0;
	if (wholeDocumentInline) {
		comparisons++;
		const tokensA = JSON.stringify([...a.Lexer.lexInline(input)]);
		const tokensB = JSON.stringify([...b.Lexer.lexInline(input)]);
		if (tokensA !== tokensB) {
			out.push({
				label,
				kind: "tokens",
				preview: preview(input),
				a: tokensA,
				b: tokensB,
			});
		}
	}
	// `parse` is typed `string | Promise<string>` — it only becomes a promise in async
	// mode, which this harness does not use. Awaiting is honest about that; casting
	// would hide the union and break the moment someone turns async on.
	comparisons++;
	const htmlA = await new a.Marked().parse(input);
	const htmlB = await new b.Marked().parse(input);
	if (htmlA !== htmlB) {
		out.push({ label, kind: "html", preview: preview(input), a: htmlA, b: htmlB });
	}
	return comparisons;
}

function preview(input: string): string {
	const flat = input.replace(/\n/g, "\\n");
	return JSON.stringify(flat.length > 70 ? `${flat.slice(0, 70)}…` : flat);
}

/**
 * Where two renderings actually diverge, with context around that point.
 *
 * A fixed head of each side is close to useless here: on a real document the first
 * difference can sit tens of thousands of characters in, so two visibly identical
 * 240-character previews would be printed for a genuine behavioural change and the
 * report would look like the tool had found nothing.
 */
function divergence(a: string, b: string): string {
	const n = Math.min(a.length, b.length);
	let i = 0;
	while (i < n && a[i] === b[i]) i++;
	const from = Math.max(0, i - 60);
	const window = 160;
	return (
		`first difference at char ${i} of ${a.length} vs ${b.length}\n` +
		`      A: …${a.slice(from, from + window)}…\n` +
		`      B: …${b.slice(from, from + window)}…`
	);
}

async function main(): Promise<number> {
	const [refA, refB] = process.argv.slice(2);
	if (!refA) {
		console.error("usage: bun run scripts/marked-equivalence.ts <ref-a> [ref-b]");
		return 2;
	}

	console.log(`A = ${refA}`);
	console.log(`B = ${refB ?? "working tree"}`);
	console.log("both revisions are imported into this single process\n");

	const a = await loadRef(refA);
	const b = refB ? await loadRef(refB) : await loadWorkingTree();

	const repoFiles = await loadRepoMarkdown();
	const adversarial = buildAdversarialCases();

	// A corpus that came back empty is a broken run, not a clean bill of health:
	// "0 differences out of 0 inputs" and "0 differences out of 1 300 inputs" look
	// identical on one line, and the first one is worthless.
	if (repoFiles.length === 0) {
		console.error("FAIL: no tracked .md files were read — the corpus is empty, so nothing was compared.");
		return 2;
	}
	if (adversarial.length === 0) {
		console.error("FAIL: the adversarial set is empty — generation is broken, so nothing was compared.");
		return 2;
	}

	const mismatches: Mismatch[] = [];
	let comparisons = 0;
	let inlineCompared = 0;
	let inlineSkipped = 0;
	for (const { label, text } of repoFiles) {
		const wholeDoc = text.length <= MAX_WHOLE_DOCUMENT_INLINE_CHARS;
		if (wholeDoc) inlineCompared++;
		else inlineSkipped++;
		comparisons += await compare(label, text, a, b, mismatches, wholeDoc);
	}
	for (const [i, input] of adversarial.entries()) {
		comparisons += await compare(`adversarial[${i}]`, input, a, b, mismatches, true);
	}

	const inputs = repoFiles.length + adversarial.length;
	console.log("corpus");
	console.log(`  markdown files from the repo : ${repoFiles.length}  (git ls-files '*.md')`);
	console.log(`  generated adversarial cases  : ${adversarial.length}`);
	console.log(`  inputs compared              : ${inputs}`);
	console.log("  every input                  : Marked().parse() HTML, byte for byte");
	console.log(
		`  plus whole-doc lexInline     : ${inlineCompared + adversarial.length} of them — ${inlineSkipped} markdown files over ${MAX_WHOLE_DOCUMENT_INLINE_CHARS} chars skip this second comparison (still fully compared via parse())`,
	);
	console.log(`  total comparisons run        : ${comparisons}`);
	console.log("  thresholds                   : none — byte equality only, no timing\n");

	if (mismatches.length === 0) {
		console.log(`IDENTICAL across ${inputs} inputs (${comparisons} comparisons)`);
		return 0;
	}

	console.log(`MISMATCHES: ${mismatches.length} across ${inputs} inputs\n`);
	for (const m of mismatches.slice(0, 20)) {
		console.log(`  [${m.kind}] ${m.label}  ${m.preview}`);
		console.log(`      ${divergence(m.a, m.b)}`);
	}
	if (mismatches.length > 20) console.log(`\n  … and ${mismatches.length - 20} more`);
	return 1;
}

process.exit(await main());
