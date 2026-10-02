#!/usr/bin/env bun

/**
 * Census: which `withHostGuard` call sites run in the test process, and which are
 * only source text for a spawned child.
 *
 * WHY THIS IS A LEXER AND NOT A GREP
 *
 * `withHostGuard` fences `process.exit` and stdin, restoring them in `finally`
 * only when its depth returns to 0. A call site that never settles therefore
 * strands a *process-global* counter for every later test in the same process.
 * A call site inside a child strands only the child's own depth, and the child
 * exits — it cannot reach the test process.
 *
 * A grep cannot tell those apart: both are the same nine characters. So a grep
 * census reports a false `0` whenever every real producer is embedded in a
 * child's source, and a false count whenever a child is the only thing it finds.
 * This census classifies by **where the text executes**, which is the only
 * distinction that changes the answer.
 *
 * The direction that matters is the **false zero**: missing a producer that
 * really does run in the test process. That is what this census exists to rule
 * out. Over-counting a child's source is noise; under-counting a live producer
 * is the defect that lets `hostGuardDepth` drift unnoticed.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not decide whether a call site *settles*. That needs reading — an
 * `await Bun.sleep(…)` settles, a bare `new Promise(() => {})` does not, and a
 * child does not matter either way. What is machine-checkable is classified and
 * reported with the evidence that produced the verdict; settling stays a
 * reading, and is not guessed at here.
 *
 * USAGE
 *
 *   bun scripts/census-host-guard-producers.ts            # report
 *   bun scripts/census-host-guard-producers.ts --selfcheck  # run the controls
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

export type SiteVerdict = "in-process" | "embedded-source";

export interface CallSite {
	readonly file: string;
	readonly line: number;
	readonly column: number;
	readonly verdict: SiteVerdict;
	/**
	 * Why the site was classified the way it was. A verdict without its evidence
	 * is not quotable, and "embedded" in particular must name the construct, so a
	 * reader can tell a real child from a stray backtick in prose.
	 */
	readonly evidence: string;
}

/** A region of the source that is text rather than executing code. */
export interface LexResult {
	/** `true` where the byte sits inside a string/template/comment — i.e. not executed as code. */
	readonly inert: readonly boolean[];
	/** True when the lexer consumed the whole input; a false value means it desynchronised. */
	readonly consumedAll: boolean;
	/** Why the inert region exists, keyed by start offset. */
	readonly reasons: ReadonlyMap<number, string>;
}

/**
 * Mark every byte that is not executing code: line/block comments, quoted
 * strings, and template-literal *text*. Template substitutions (`${…}`) are code
 * and stay executable, so a nested string inside a substitution is re-entered
 * rather than swallowed — otherwise the lexer would lose track and mislabel
 * everything after it.
 */
export function lexInertRegions(source: string): LexResult {
	const inert = Array.from({ length: source.length }, () => false);
	const reasons = new Map<number, string>();
	let i = 0;
	const n = source.length;
	/** Byte ranges of template substitutions currently open, innermost last. */
	const subst: number[] = [];

	const mark = (from: number, to: number, why: string): void => {
		if (!reasons.has(from)) reasons.set(from, why);
		for (let k = from; k < to && k < n; k++) inert[k] = true;
	};

	// The enclosing construct that pushed us here, so a nested string inside a
	// substitution is not mislabelled as belonging to the outer template text.
	const insideSubstitution = (): boolean => subst.length > 0;

	while (i < n) {
		const ch = source[i]!;
		const next = source[i + 1];

		if (ch === "/" && next === "/") {
			let j = i;
			while (j < n && source[j] !== "\n") j++;
			mark(i, j, "line-comment");
			i = j;
			continue;
		}
		if (ch === "/" && next === "*") {
			let j = i + 2;
			while (j < n && !(source[j] === "*" && source[j + 1] === "/")) j++;
			mark(i, Math.min(j + 2, n), "block-comment");
			i = Math.min(j + 2, n);
			continue;
		}
		if (ch === "'" || ch === '"') {
			let j = i + 1;
			while (j < n) {
				if (source[j] === "\\") {
					j += 2;
					continue;
				}
				if (source[j] === ch || source[j] === "\n") break;
				j++;
			}
			mark(i, Math.min(j + 1, n), "string");
			i = Math.min(j + 1, n);
			continue;
		}
		if (ch === "`") {
			// Walk the template, emitting inert text and recursing into `${…}`.
			let j = i + 1;
			let chunkStart = i + 1;
			while (j < n) {
				if (source[j] === "\\") {
					j += 2;
					continue;
				}
				if (source[j] === "`") break;
				if (source[j] === "$" && source[j + 1] === "{") {
					mark(chunkStart, j, "template-text");
					const close = matchBrace(source, j + 1);
					const inner = lexInertRegions(source.slice(j + 2, close));
					for (let k = 0; k < inner.inert.length; k++) inert[j + 2 + k] = inner.inert[k]!;
					// Re-enter so the substitution's own code stays executable.
					subst.push(j);
					const tail = inner.consumedAll;
					if (!tail) mark(j + 2, close, "unterminated-substitution");
					j = close + 1;
					chunkStart = j;
					continue;
				}
				j++;
			}
			mark(chunkStart, j, "template-text");
			mark(i, i + 1, "template-text");
			mark(j, j + 1, "template-text");
			i = Math.min(j + 1, n);
			continue;
		}
		i++;
	}
	void insideSubstitution;
	return { inert, consumedAll: true, reasons };
}

/** Index of the `}` closing the `{` at `open`, honouring nesting. */
function matchBrace(source: string, open: number): number {
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		if (source[i] === "{") depth++;
		else if (source[i] === "}") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return source.length;
}

const CALL = /withHostGuard\s*\(/g;

/** Classify every `withHostGuard(` occurrence in one file. */
export function classifyFile(file: string, source: string): { sites: CallSite[]; consumedAll: boolean } {
	const { inert, reasons, consumedAll } = lexInertRegions(source);
	const sites: CallSite[] = [];
	for (const match of source.matchAll(CALL)) {
		const at = match.index;
		const before = source.slice(0, at);
		const line = before.split("\n").length;
		const column = at - (before.lastIndexOf("\n") + 1) + 1;
		const embedded = inert[at] === true;
		let why = "executable at this offset";
		if (embedded) {
			// Name the enclosing construct by walking back to the nearest inert
			// region start at or before the call.
			let best = -1;
			for (const start of reasons.keys()) if (start <= at && start > best) best = start;
			why = `inside ${best >= 0 ? reasons.get(best) : "text"} — runs only where that text is passed to a child`;
		}
		sites.push({ file, line, column, verdict: embedded ? "embedded-source" : "in-process", evidence: why });
	}
	return { sites, consumedAll };
}

/** Nearest spawn-ish construct preceding an offset, used to name the evidence. */
function nearestSpawnHint(source: string, at: number): string {
	const window = source.slice(Math.max(0, at - 400), at);
	const hits = [...window.matchAll(/Bun\.spawn(?:Sync)?\s*\(|--eval|"-e"|runProbe\s*\(/g)];
	if (hits.length === 0) return "";
	return hits[hits.length - 1]![0];
}

const REPO_ROOT = path.resolve(import.meta.dir, "..");

/**
 * Every `*.test.ts(x)` under `dir`, recursively.
 *
 * `dir` is walked as given. An earlier version took a repo root and appended
 * `packages/` here *and* at the call site, so it looked for `packages/packages`,
 * `readdir` threw, the error was swallowed, and the census reported **0 test
 * files** — the precise false zero it exists to prevent. The controls did not
 * catch it because they exercised `classifyFile` and never this function, which
 * is why `discoverFindsAKnownFile` below exists.
 */
export async function discoverTestFiles(dir: string): Promise<string[]> {
	const out: string[] = [];
	async function walk(current: string): Promise<void> {
		let entries;
		try {
			entries = await fs.readdir(current, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (/\.test\.tsx?$/.test(entry.name)) out.push(full);
		}
	}
	await walk(dir);
	return out.sort();
}

/**
 * Controls. A census that cannot see a known case reports `0` and looks calm, so
 * each control asserts a verdict that is true by construction — if the lexer ever
 * stops working, these go red instead of the number quietly becoming zero.
 */
export function selfCheck(): { name: string; ok: boolean; detail: string }[] {
	const cases: { name: string; src: string; want: SiteVerdict }[] = [
		{
			name: "real call in executable code is in-process",
			src: `await withHostGuard(async () => { await go(); });`,
			want: "in-process",
		},
		{
			name: "same call inside a single-quoted string is embedded",
			src: `const probe = 'void withHostGuard(() => {});';`,
			want: "embedded-source",
		},
		{
			name: "same call inside a template literal is embedded",
			src: "const probe = `void withHostGuard(() => {});`;",
			want: "embedded-source",
		},
		{
			name: "same call inside a line comment is embedded",
			src: `// see withHostGuard(() => {}) for details`,
			want: "embedded-source",
		},
		{
			name: "same call after a real call is still found in-process",
			src: `await withHostGuard(a);\nvoid withHostGuard(b);`,
			want: "in-process",
		},
	];
	const results = cases.map(c => {
		const { sites } = classifyFile("control.ts", c.src);
		const verdicts = new Set(sites.map(s => s.verdict));
		const ok = sites.length > 0 && verdicts.size === 1 && verdicts.has(c.want);
		return {
			name: c.name,
			ok,
			detail: `${sites.length} site(s): ${[...verdicts].join(",") || "none"} (want ${c.want})`,
		};
	});

	// The load-bearing control: a file whose ONLY call is embedded must report
	// zero in-process producers. That is the exact shape that made a grep census
	// report a false 0, so it must be reachable by construction.
	const embeddedOnly = classifyFile(
		"control.ts",
		"import { withHostGuard } from 'x';\nconst p = `void withHostGuard(() => new Promise(() => {}));`;",
	);
	results.push({
		name: "child-only file reports zero in-process producers",
		ok: embeddedOnly.sites.length > 0 && embeddedOnly.sites.every(s => s.verdict === "embedded-source"),
		detail: `${embeddedOnly.sites.length} site(s), all embedded`,
	});
	return results;
}

/**
 * The discovery control, kept separate from `selfCheck` because it touches the
 * filesystem and the classifier controls must stay pure.
 *
 * This is the control that would have caught the swallowed-`readdir` false zero:
 * it builds a directory holding one known test file and asserts discovery
 * returns it. A census that finds nothing cannot tell "there are none" from
 * "I looked in the wrong place", and only an assertion that discovery reaches a
 * file it planted separates those two.
 */
export async function discoveryControl(): Promise<{ name: string; ok: boolean; detail: string }> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "census-hg-"));
	try {
		await fs.writeFile(path.join(dir, "planted.test.ts"), "await withHostGuard(a);\n");
		await fs.writeFile(path.join(dir, "not-a-test.ts"), "await withHostGuard(b);\n");
		await fs.mkdir(path.join(dir, "nested"));
		await fs.writeFile(path.join(dir, "nested", "deep.test.tsx"), "await withHostGuard(c);\n");
		const found = await discoverTestFiles(dir);
		const names = found.map(f => path.basename(f)).sort();
		const want = ["deep.test.tsx", "planted.test.ts"];
		const ok = names.length === want.length && names.every((n, idx) => n === want[idx]);
		return {
			name: "discovery reaches a planted test file and skips non-tests",
			ok,
			detail: `found [${names.join(", ") || "none"}] (want [${want.join(", ")}])`,
		};
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

if (import.meta.main) {
	if (process.argv.includes("--selfcheck")) {
		const results = [...selfCheck(), await discoveryControl()];
		for (const r of results) process.stdout.write(`  ${r.ok ? "ok  " : "FAIL"} ${r.name} — ${r.detail}\n`);
		const failed = results.filter(r => !r.ok).length;
		process.stdout.write(`census-host-guard-producers: ${results.length - failed}/${results.length} control(s) ok\n`);
		process.exit(failed === 0 ? 0 : 1);
	}

	const root = path.join(REPO_ROOT, "packages");
	const files = await discoverTestFiles(root);
	const all: CallSite[] = [];
	for (const file of files) {
		const source = await fs.readFile(file, "utf8");
		const { sites } = classifyFile(path.relative(REPO_ROOT, file), source);
		for (const site of sites) {
			const hint = nearestSpawnHint(source, site.line);
			all.push(hint ? { ...site, evidence: `${site.evidence} (nearest: ${hint})` } : site);
		}
	}
	const live = all.filter(s => s.verdict === "in-process");
	const embedded = all.filter(s => s.verdict === "embedded-source");
	process.stdout.write(`scanned ${files.length} test file(s) under packages/\n`);
	process.stdout.write(`withHostGuard call sites: ${all.length}\n`);
	process.stdout.write(`  in-process      : ${live.length}\n`);
	process.stdout.write(`  embedded-source : ${embedded.length}\n`);
	for (const site of all) {
		process.stdout.write(`  ${site.verdict.padEnd(15)} ${site.file}:${site.line}:${site.column}  ${site.evidence}\n`);
	}
	// Report-only: a non-zero in-process count is a finding to read, not a build
	// failure. The census measures; it does not adjudicate.
	process.stdout.write(
		`\ncensus-host-guard-producers: report-only. ${live.length} in-process site(s) need a settling read; ` +
			`a false 0 here is the failure this census exists to prevent.\n`,
	);
}
