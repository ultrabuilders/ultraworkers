#!/usr/bin/env bun

/**
 * Fail on an `await import()` that no exemption covers.
 *
 * ## Why this is a script and not an oxlint rule
 *
 * The obvious shape is the `no-console` gate — a rule in `.oxlintrc.json` beside an
 * allow-list test. That shape is unavailable here, and not for a style reason. oxlint
 * 1.85.0 ships no rule for dynamic `import()`: the schema offers
 * `import/no-dynamic-require` (for `require()`) and `typescript/no-dynamic-delete`,
 * and naming the rule this gate wants fails the config outright —
 *
 * ```
 * x Rule 'no-dynamic-import' not found in plugin 'import'
 * ```
 *
 * so writing it there would not make a permissive gate, it would make a gate that
 * cannot start. This is why every other gate in this directory is a script: a rule
 * that does not exist cannot be configured.
 *
 * ## Why it parses instead of scanning
 *
 * The first version of this file stripped comments and strings with a hand-written
 * character scanner and then regexed the result. It reported 67 call sites where a
 * plain grep finds 186, and the gap was a **regex literal**: `/["']/` reads as a
 * quote, the scanner entered string mode, and it never recovered — every call site
 * after the first regex in `main.ts` was silently dropped. That is the worst shape a
 * gate can have: it looks like it is working, and it is quietly not looking.
 *
 * Blanking comments was also the wrong tool. Three occurrences in this tree are prose
 * inside docblocks — a comment that *shows* `await import("node:fs/promises")` while
 * explaining a rebinding is not a call site — and a scanner has to be correct about
 * every lexical form in the language to tell them apart.
 *
 * `@babel/parser` (already a dependency, already used by `eval/js/shared/rewrite-imports.ts`)
 * answers both questions by construction: comments and strings are not expressions, so
 * prose cannot be counted, and a regex literal is not a quote, so it cannot derail the
 * read. The categories below are then facts about the tree rather than facts about a
 * tokenizer.
 *
 * ## What this gate does and does not claim
 *
 * It reports one line per `await import()` outside an exemption and exits 1. It does
 * not judge whether an exemption is *deserved* — that is the reason string's job, and a
 * reason nobody reads is not a reason.
 */

import * as path from "node:path";
import { parse } from "@babel/parser";

/** One exemption group: a stated reason and the path patterns it covers. */
export interface AwaitImportExemption {
	/** Why these paths may defer an import. Read by a human, not parsed. */
	readonly why: string;
	/** Glob patterns, matched against repo-relative POSIX paths. */
	readonly patterns: readonly string[];
}

/**
 * Paths allowed to defer an import, each with the reason it is not a hole.
 *
 * These groups grandfather what is already there. Their job is not to certify 282
 * existing call sites — it is to make a **new** one state which mechanism it belongs
 * to. A pattern with no stated mechanism is the failure this exists to stop, so every
 * entry below names one, and `lint-await-import-allowlist.test.ts` fails when a
 * pattern loses its reason, a reason loses its pattern, or the exempted total moves.
 */
export const EXEMPTIONS: Readonly<Record<string, AwaitImportExemption>> = {
	/** Never shipped, never part of a user's session. */
	notShipped: {
		why: "Tests, scripts, examples and benchmarks are not loaded by a running agent. A test that lazily imports is usually isolating a module graph so the module under test is the only one with it — a static import would merge the two and change what the test proves. Same reasoning as the no-console gate's `development` group.",
		patterns: ["**/test/**", "**/bench/**", "**/scripts/**", "**/examples/**"],
	},
	/** The CLI subcommand table: one `load` row per command. */
	commandTable: {
		why: "`cli-commands.ts` is a dispatch table whose every row is `load: () => import(\"./commands/x\")`. The deferral is the dispatch: a static import would evaluate every subcommand's module — and its provider, browser and MCP graphs — before the user's argv is even parsed. The file's own docblock records that it exists so the table is importable without those side effects.",
		patterns: ["packages/coding-agent/src/cli-commands.ts"],
	},
	/** The two paths AGENTS.md already names as deliberate lazy loads. */
	entryDispatch: {
		why: "AGENTS.md's own exception: worker/command dispatch in `cli.ts` and the per-provider stream transports in `transports.ts`. Both keep a module graph out of the entry point until that worker or provider is actually selected, which is the stated purpose of the exception rather than a loophole in it.",
		patterns: ["packages/coding-agent/src/cli.ts", "packages/ai/src/registry/transports.ts"],
	},
	/** Registries that map a name to a lazily constructed implementation. */
	providerRegistries: {
		why: 'A registry row is a factory — `perplexity: () => import("./providers/perplexity")`. Building the row on first use is what keeps N provider/auth graphs out of the process until one is chosen; importing them all statically would make choosing a provider cost every provider\'s startup. A registry is exactly the shape that cannot be expressed as static imports without inverting it.',
		patterns: [
			"packages/ai/src/registry/hooks/**",
			"packages/coding-agent/src/web/search/provider.ts",
			"packages/catalog/src/provider-models/special.ts",
		],
	},
	/** The specifier is supplied by an extension on disk. There is nothing to write. */
	externalModules: {
		why: "These load a path the user or an extension put on disk: a custom command, a custom tool, a hook, a legacy pi plugin, a marketplace update, a shared script. The specifier is runtime data, so a static import is not merely discouraged — it is unwriteable. Note this is the category AGENTS.md's exception does not name: its text covers a *deliberate lazy load*, and these are not that.",
		patterns: [
			"packages/coding-agent/src/extensibility/**/loader.ts",
			"packages/coding-agent/src/extensibility/plugins/legacy-pi-compat.ts",
			"packages/coding-agent/src/extensibility/plugins/marketplace-auto-update.ts",
			"packages/coding-agent/src/export/custom-share.ts",
		],
	},
	/** The eval sandbox's dynamic import is the feature under test. */
	evalSandbox: {
		why: "`__omp_import__` *is* a dynamic-import primitive: it resolves evaluated code's specifier at runtime through the module loader, which is the whole point of the seam. `local-module-loader.ts` performs that load. Treating these as violations would mean the sandbox cannot do its job.",
		patterns: ["packages/coding-agent/src/eval/js/shared/**"],
	},
	/** Entry-point latency boundaries. */
	startupBoundaries: {
		why: "Each of these defers a graph that is unnecessary until a specific launch shape or a specific user action: `main.ts` and `startup-composer.ts` keep the TUI out of non-TUI launches, `agent-session.ts` keeps the HTML export out until `/export`, and the `cli/stats-cli.ts`, `ttsr-cli.ts` and `launch.ts` rows are per-command. The deferral is the startup budget, and several carry a docblock saying so at the call site.",
		patterns: [
			"packages/coding-agent/src/main.ts",
			"packages/coding-agent/src/modes/startup-composer.ts",
			"packages/coding-agent/src/session/agent-session.ts",
			"packages/coding-agent/src/cli/stats-cli.ts",
			"packages/coding-agent/src/cli/ttsr-cli.ts",
			"packages/coding-agent/src/commands/launch.ts",
			"packages/coding-agent/src/sdk.ts",
			"packages/tui/src/setup/lazy.ts",
		],
	},
	/** Optional and on-demand feature graphs. */
	onDemandFeatures: {
		why: "Feature graphs loaded when the feature is used: a browser, a desktop session, an mnemopi store, the memory-backend the settings select, HTML→markdown for a feed or a PDF, a web scraper, the vterm terminal, `node:inspector` for a profiler or a postmortem, the stats dashboard, and the TUI's debug selector. Each pulls a third-party or heavy graph that would otherwise load on every launch to serve a request most sessions never make.",
		patterns: [
			"packages/coding-agent/src/tools/browser/**",
			"packages/coding-agent/src/tools/computer/**",
			"packages/coding-agent/src/tools/fetch.ts",
			"packages/coding-agent/src/tools/read-pdf.ts",
			"packages/coding-agent/src/web/scrapers/**",
			"packages/coding-agent/src/web/search/providers/public.ts",
			"packages/coding-agent/src/mnemopi/**",
			"packages/coding-agent/src/memory-backend/**",
			"packages/coding-agent/src/debug/profiler.ts",
			"packages/coding-agent/src/modes/controllers/selector-controller.ts",
			"packages/coding-agent/src/modes/controllers/command-controller.ts",
			"packages/coding-agent/src/slash-commands/builtin-collaboration.ts",
			"packages/coding-agent/src/telemetry-export.ts",
			"packages/coding-agent/src/utils/markit.ts",
			"packages/tui/src/tools/terminal-output.ts",
			"packages/utils/src/postmortem.ts",
			"packages/evals/src/report.ts",
			"packages/coding-agent/src/modes/interactive-mode.ts",
		],
	},
};

/** One `await import()` call site, located in the original source. */
export interface AwaitImportSite {
	readonly file: string;
	readonly line: number;
	readonly column: number;
	/**
	 * True when the specifier is not a bare string literal.
	 *
	 * Deliberately one notch stricter than "cannot be a static import": a template with
	 * **no** interpolation (`` import(`./x`) ``) is hoistable but is counted here as
	 * computed, because `staticSpecifier` only accepts `StringLiteral`. The error is in
	 * the safe direction — `computed` is a reporting field, and a site still needs an
	 * exemption either way, so over-counting can never turn a violation into a pass.
	 * Measured at `HEAD=aadc91da99`: **0** such sites exist, and the reported 17 decompose
	 * as 15 non-string arguments + 2 interpolated templates.
	 */
	readonly computed: boolean;
	/** A short rendering of the specifier, for the failure message. */
	readonly specifier: string;
}

/**
 * A parse failure is a gate failure — **for the files this gate parses**.
 *
 * The scope matters, and an earlier version of this line claimed it unconditionally.
 * {@link findAwaitImports} pre-filters on the raw text and never parses a file without
 * an `import(` token, so "never a skip" is true of the files that reach the parser and
 * silent about the rest. Measured at `HEAD=aadc91da99`: **5950 tracked `.ts`, 108
 * containing the token, 5842 never parsed.** An unparseable file with no `import(` in it
 * is therefore not reported — not because a failure was swallowed, but because the gate
 * never opened it.
 *
 * That is the right trade (parsing 5950 files to count 282 call sites is most of a
 * gate's budget spent on files that cannot contain one), but it is only defensible while
 * the sentence says so. The number that would falsify it: a `.ts` file that stops
 * parsing *and* still contains `import(` — that one throws, loudly.
 */
export class AwaitImportParseError extends Error {
	constructor(
		readonly file: string,
		override readonly cause: unknown,
	) {
		super(`${file}: could not be parsed, so its call sites cannot be counted`);
	}
}

/** Babel nodes are plain objects; only the fields this gate reads are relied on. */
interface NodeLike {
	readonly type?: string;
	readonly loc?: { start: { line: number; column: number } } | null;
	readonly callee?: NodeLike;
	readonly arguments?: readonly NodeLike[];
	readonly source?: NodeLike;
	readonly value?: unknown;
	readonly quasis?: readonly NodeLike[];
}

function isNode(value: unknown): value is NodeLike {
	return typeof value === "object" && value !== null && "type" in value;
}

/**
 * Every dynamic `import()` in one file, from the parse tree.
 *
 * A cheap regex pre-filter runs against the raw text first. That is safe in the
 * direction that matters: a real call site always contains the token sequence, so the
 * filter can only skip files that have none. It may also match a comment — which is
 * exactly why the answer comes from the tree and not from the filter.
 */
export function findAwaitImports(file: string, source: string): AwaitImportSite[] {
	if (!/\bawait\s+import\s*\(/.test(source) && !/\bimport\s*\(/.test(source)) return [];

	const ast = parse(source, {
		sourceType: "unambiguous",
		allowReturnOutsideFunction: true,
		errorRecovery: false,
		plugins: ["typescript"],
	});

	const sites: AwaitImportSite[] = [];
	const seen = new Set<object>();
	const stack: NodeLike[] = [ast as unknown as NodeLike];

	while (stack.length > 0) {
		const node = stack.pop();
		if (node === undefined) break;
		// A node reached twice is a cycle in the tree, not a second call site.
		if (seen.has(node)) continue;
		seen.add(node);

		// Two shapes carry a dynamic import: Babel's `CallExpression` with an `Import`
		// callee (argument in `arguments[0]`) and ESTree's `ImportExpression` (argument
		// in `source`). Reading `source` off a `CallExpression` yields `undefined`, which
		// silently marks every site computed — so both are handled explicitly.
		const isDynamicImport =
			(node.type === "CallExpression" && node.callee?.type === "Import") || node.type === "ImportExpression";
		if (isDynamicImport) {
			const argument = node.type === "ImportExpression" ? node.source : node.arguments?.[0];
			const staticSpecifier = argument?.type === "StringLiteral" && typeof argument.value === "string";
			const interpolated = argument?.type === "TemplateLiteral" && (argument.quasis?.length ?? 0) > 1;
			sites.push({
				file,
				line: node.loc?.start.line ?? 0,
				column: (node.loc?.start.column ?? 0) + 1,
				computed: !staticSpecifier,
				specifier: staticSpecifier
					? String(argument?.value)
					: interpolated
						? "template with interpolation"
						: "computed at runtime",
			});
		}

		for (const value of Object.values(node)) {
			if (Array.isArray(value)) {
				for (const item of value) if (isNode(item)) stack.push(item);
			} else if (isNode(value)) {
				stack.push(value);
			}
		}
	}

	return sites.sort((a, b) => a.line - b.line || a.column - b.column);
}

/** Repo-relative POSIX path of every tracked `.ts` file under `packages/`. */
export async function trackedTypeScriptFiles(repoRoot: string): Promise<string[]> {
	const proc = Bun.spawn(["git", "ls-files", "-z", "--", "packages"], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const code = await proc.exited;
	if (code !== 0) throw new Error(`git ls-files failed (${code}): ${stderr}`);
	return stdout.split("\0").filter(file => file.endsWith(".ts"));
}

/** Whether `file` is covered by any pattern in any exemption group. */
export function isExempt(file: string, exemptions: Readonly<Record<string, AwaitImportExemption>>): boolean {
	return Object.values(exemptions).some(group => group.patterns.some(pattern => new Bun.Glob(pattern).match(file)));
}

export interface GateReport {
	readonly total: number;
	readonly exempt: number;
	readonly computed: number;
	readonly reported: readonly AwaitImportSite[];
}

/**
 * Overlay `injected` onto already-read sources, last writer winning.
 *
 * Exported, and used by both {@link collectSources} and the test, so a test that proves
 * the gate goes red on an injected violation merges through the **same** function the
 * gate merges through. A test that spelled the merge out itself would be a second copy
 * of a rule — the failure mode this file's test file is written against.
 */
export function applyInjection(
	sources: ReadonlyMap<string, string>,
	injected?: Readonly<Record<string, string>>,
): Map<string, string> {
	const merged = new Map(sources);
	for (const [file, text] of Object.entries(injected ?? {})) merged.set(file, text);
	return merged;
}

/**
 * Read every tracked source file, and only those files.
 *
 * Bounded concurrency, not sequential: at `HEAD=c4637dcc1c` (dirty 567) reading the
 * 5950 tracked `.ts` files one at a time took **1165ms**, and the same set at a batch
 * of 64 took **185ms** — 6.3x, byte-identical on all 5950 files, which the probe
 * compared rather than assumed. The batch is not a taste call: 5950 concurrent opens
 * would exhaust the descriptor table, and this gate runs in CI where an fd failure
 * reads as a gate that cannot start.
 *
 * Reading is not the gate's job, so nothing here decides anything. {@link evaluateSources}
 * does, and takes the map this returns.
 */
export async function collectSources(
	repoRoot: string,
	injected?: Readonly<Record<string, string>>,
): Promise<Map<string, string>> {
	const files = await trackedTypeScriptFiles(repoRoot);
	const sources = new Map<string, string>();
	const BATCH = 64;
	for (let i = 0; i < files.length; i += BATCH) {
		const slice = files.slice(i, i + BATCH);
		const entries = await Promise.all(
			slice.map(async file => [file, await Bun.file(`${repoRoot}/${file}`).text()] as const),
		);
		for (const [file, text] of entries) sources.set(file, text);
	}
	return applyInjection(sources, injected);
}

/**
 * Decide which call sites no exemption covers. **This is the whole rule.**
 *
 * Split from {@link collectSources} so reading the tree and judging it can be timed,
 * cached and reused apart from each other. The five tests in
 * `lint-await-import-allowlist.test.ts` all need the same 5950 files; when one scan
 * had to serve all five, the file cost ~10s of scanning and its tests timed out under
 * a loaded box. That is a property of the test's structure, not of the gate's verdict.
 */
export function evaluateSources(sources: ReadonlyMap<string, string>): GateReport {
	const reported: AwaitImportSite[] = [];
	let total = 0;
	let exempt = 0;
	let computed = 0;

	for (const [file, text] of sources) {
		let sites: AwaitImportSite[];
		try {
			sites = findAwaitImports(file, text);
		} catch (error) {
			throw new AwaitImportParseError(file, error);
		}
		if (sites.length === 0) continue;
		total += sites.length;
		computed += sites.filter(site => site.computed).length;
		if (isExempt(file, EXEMPTIONS)) {
			exempt += sites.length;
			continue;
		}
		reported.push(...sites);
	}
	return { total, exempt, computed, reported };
}

/**
 * Scan the tree and decide which call sites no exemption covers.
 *
 * `injected` maps a repo-relative path to source text and is merged over what the
 * tree scan finds. It exists so a test can prove the gate goes **red** on a new
 * violation without writing into a real source file — on a shared tree a test that
 * edits a file and restores it is one crash away from leaving a stranger's file
 * modified, and a gate proven red that way is not worth the risk.
 */
export async function runGate(repoRoot: string, injected?: Readonly<Record<string, string>>): Promise<GateReport> {
	return evaluateSources(await collectSources(repoRoot, injected));
}

if (import.meta.main) {
	const repoRoot = path.join(import.meta.dir, "..");

	try {
		const report = await runGate(repoRoot);

		if (report.reported.length === 0) {
			console.log(
				`await-import: ${report.total} call site(s) tree-wide (${report.computed} computed), all covered by ` +
					`${Object.keys(EXEMPTIONS).length} exemption group(s).`,
			);
			process.exit(0);
		}

		console.error(
			`await-import: ${report.reported.length} unexempted call site(s) of ${report.total} total ` +
				`(${report.computed} computed tree-wide):`,
		);
		for (const site of report.reported) {
			console.error(
				`  ${site.file}:${site.line}:${site.column}  [${site.computed ? "computed" : "static"}] ${site.specifier}`,
			);
		}
		console.error(
			"\nAn `await import()` needs a reason, not a silence. Either fold the path into an\n" +
				"exemption group in scripts/check-await-import.ts, or hoist the import to the top\n" +
				"level. A computed specifier cannot be hoisted — say so in the reason.",
		);
		process.exit(1);
	} catch (error) {
		console.error(`await-import: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(2);
	}
}
