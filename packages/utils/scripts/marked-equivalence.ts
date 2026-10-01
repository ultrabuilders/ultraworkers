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

async function compare(label: string, input: string, a: MarkedModule, b: MarkedModule, out: Mismatch[]): Promise<void> {
	const tokensA = JSON.stringify([...a.Lexer.lexInline(input)]);
	const tokensB = JSON.stringify([...b.Lexer.lexInline(input)]);
	if (tokensA !== tokensB) {
		out.push({ label, kind: "tokens", preview: preview(input), a: tokensA.slice(0, 240), b: tokensB.slice(0, 240) });
	}
	// `parse` is typed `string | Promise<string>` — it only becomes a promise in async
	// mode, which this harness does not use. Awaiting is honest about that; casting
	// would hide the union and break the moment someone turns async on.
	const htmlA = await new a.Marked().parse(input);
	const htmlB = await new b.Marked().parse(input);
	if (htmlA !== htmlB) {
		out.push({ label, kind: "html", preview: preview(input), a: htmlA.slice(0, 240), b: htmlB.slice(0, 240) });
	}
}

function preview(input: string): string {
	const flat = input.replace(/\n/g, "\\n");
	return JSON.stringify(flat.length > 70 ? `${flat.slice(0, 70)}…` : flat);
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
	// "0 differences out of 0 inputs" and "0 differences out of 28 000 inputs" look
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
	for (const { label, text } of repoFiles) await compare(label, text, a, b, mismatches);
	for (const [i, input] of adversarial.entries()) await compare(`adversarial[${i}]`, input, a, b, mismatches);

	const compared = repoFiles.length + adversarial.length;
	console.log("corpus");
	console.log(`  markdown files from the repo : ${repoFiles.length}  (git ls-files '*.md')`);
	console.log(`  generated adversarial cases  : ${adversarial.length}`);
	console.log(`  inputs compared              : ${compared}`);
	console.log("  compared per input           : lexInline token stream, and Marked().parse() HTML");
	console.log("  thresholds                   : none — byte equality only, no timing\n");

	if (mismatches.length === 0) {
		console.log(`IDENTICAL across ${compared} inputs (${compared * 2} comparisons: tokens + HTML)`);
		return 0;
	}

	console.log(`MISMATCHES: ${mismatches.length} across ${compared} inputs\n`);
	for (const m of mismatches.slice(0, 20)) {
		console.log(`  [${m.kind}] ${m.label}  ${m.preview}`);
		console.log(`      A: ${m.a}`);
		console.log(`      B: ${m.b}`);
	}
	if (mismatches.length > 20) console.log(`\n  … and ${mismatches.length - 20} more`);
	return 1;
}

process.exit(await main());
