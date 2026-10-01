/**
 * `Giai đoạn 0` of the R0 reorganisation: measure fan-in, and gate against a baseline.
 *
 * All three `r0-grp-*` beads depend on a number they have no way to produce. Their tables
 * carry an `importers` column, their criterion 2 says *"số trong bảng được đo lại trước,
 * không dùng số của ảnh chụp"*, and their criterion 3 requires a baseline gate that exists
 * *before* the first merge. None of the three owned building this, so nothing measured
 * anything — and the column they carry turns out not to be reproducible at all.
 *
 * ## What fan-in means here, exactly
 *
 * **Fan-in of a module = the number of distinct files outside that module's directory
 * which import it or anything beneath it.** Not import statements, not edges through
 * barrels. That definition is chosen because it is the only one that predicts merge cost:
 * merging `stream/` into a neighbour means editing each file that names it, once. Counting
 * statements inflates by however many imports a file happens to write; counting internal
 * edges counts work a merge does not touch.
 *
 * The split is deliberate and reported separately, because the two halves move oppositely.
 * `externalImporters` rising means *more* files depend on the module and it is *harder* to
 * move — the regression the gate must catch. `internalEdges` is self-referential by
 * definition and would make the gate fire on edits inside the module.
 *
 * ## Why the historical column could not be reproduced
 *
 * Measured at the commit the tables cite (`bf3a2f6`) as well as at HEAD, under three
 * definitions — distinct files scoped to `coding-agent/src`, import occurrences scoped the
 * same way, and distinct files repo-wide. `dap` matched at 5, but `subprocess` was claimed
 * at 25 against 20 measured, and `config` at 949 against 226 files that even import it — a
 * figure no definition of "importers" can produce, since it exceeds the file count. No
 * single definition fits across rows, which is what hand-collection looks like. Both
 * measurements of the cited commit agree with HEAD on this subtree, so the gap is not drift.
 *
 * So this script does not try to reproduce those numbers, and the baseline it writes is the
 * first measurement of record rather than a reconciliation of an earlier one.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

const PREFIX = "[fan-in]";
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "coverage", ".turbo"]);

/** One resolved import: a file, and the specifier it wrote. */
export interface ImportEdge {
	readonly from: string;
	readonly specifier: string;
}

/** Fan-in of one top-level module directory, plus the shape of the tree it owns. */
export interface ModuleFanIn {
	readonly module: string;
	/** Distinct files outside the directory importing it or anything beneath it. */
	readonly externalImporters: number;
	/** Import edges originating inside the directory — self-referential by definition. */
	readonly internalEdges: number;
	readonly files: number;
	readonly lines: number;
}

/** One module's fan-in regressed above its baseline; the gate fails on these. */
export interface FanInRegression {
	readonly module: string;
	readonly baseline: number;
	readonly current: number;
}

/**
 * Resolve a relative specifier to the top-level module directory under `moduleRoot` it
 * names, or `undefined` when it points outside — a cross-package import is another
 * package's merge cost, not this module's, and a package specifier names no local module.
 *
 * A specifier naming the directory itself (`../stream`), a barrel inside it (`./index`),
 * and a file inside it (`../stream/reader`) all name the same module, because all three
 * break at the same merge.
 */
export function resolveModule(specifier: string, from: string, moduleRoot: string): string | undefined {
	if (!specifier.startsWith(".")) return undefined;
	// A query/hash suffix is a cache-buster or asset query, not part of the path.
	const bare = specifier.split(/[?#]/)[0];
	if (bare === "") return undefined;
	const relative = path.relative(moduleRoot, path.resolve(path.dirname(from), bare));
	if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
	const [module] = relative.split(path.sep);
	return module?.replace(/\.(ts|tsx|mts)$/, "");
}

/**
 * Fan-in for every module directory under `moduleRoot`.
 *
 * The module a file belongs to is the first segment of its path under `moduleRoot`.
 * Deriving the module index from `fileLines` keys — which are file paths, not module
 * names — is the mistake this shape exists to prevent: seeding it that way keys every
 * module by an absolute path, so every later lookup misses and every module reports zero
 * importers, which reads exactly like a clean measurement.
 */
export function computeFanIn(
	edges: readonly ImportEdge[],
	fileLines: ReadonlyMap<string, number>,
	moduleRoot: string,
): ModuleFanIn[] {
	const moduleOf = (file: string): string => path.relative(moduleRoot, file).split(path.sep)[0];

	const names = new Set<string>();
	const shape = new Map<string, { files: number; lines: number }>();
	for (const [file, lines] of fileLines) {
		const name = moduleOf(file);
		names.add(name);
		const entry = shape.get(name) ?? { files: 0, lines: 0 };
		entry.files += 1;
		entry.lines += lines;
		shape.set(name, entry);
	}

	const external = new Map<string, Set<string>>();
	const internal = new Map<string, number>();
	for (const name of names) {
		external.set(name, new Set());
		internal.set(name, 0);
	}

	for (const edge of edges) {
		const module = resolveModule(edge.specifier, edge.from, moduleRoot);
		// A specifier naming a directory that holds no sources is not a module of this
		// tree and has no fan-in to report.
		if (module === undefined || !names.has(module)) continue;
		if (moduleOf(edge.from) === module) {
			internal.set(module, (internal.get(module) ?? 0) + 1);
		} else {
			external.get(module)?.add(edge.from);
		}
	}

	return [...names]
		.map(name => {
			const entry = shape.get(name) ?? { files: 0, lines: 0 };
			return {
				module: name,
				externalImporters: external.get(name)?.size ?? 0,
				internalEdges: internal.get(name) ?? 0,
				files: entry.files,
				lines: entry.lines,
			};
		})
		.sort((a, b) => b.externalImporters - a.externalImporters || a.module.localeCompare(b.module));
}

/**
 * Modules whose fan-in rose above the baseline.
 *
 * A rise is the regression worth failing on: more files now name this module, so moving it
 * costs more than the last capture said. A *fall* is progress — it is closer to movable —
 * and failing on progress is how a gate gets switched off. A module the baseline never
 * recorded is not a regression either: there is nothing to have risen above, and new
 * directories arrive with every reorganisation.
 */
export function findRegressions(
	current: readonly ModuleFanIn[],
	baseline: ReadonlyMap<string, number>,
): FanInRegression[] {
	const regressions: FanInRegression[] = [];
	for (const entry of current) {
		const was = baseline.get(entry.module);
		if (was === undefined) continue;
		if (entry.externalImporters > was) {
			regressions.push({ module: entry.module, baseline: was, current: entry.externalImporters });
		}
	}
	return regressions.sort((a, b) => b.current - b.baseline - (a.current - a.baseline));
}

/**
 * Relative import specifiers in one file's source.
 *
 * `Bun.Transpiler.scanImports` reads import statements, `export … from` re-exports and
 * dynamic `import()` in one call, and needs no language server — which matters because the
 * AST alternative builds a whole TypeScript program and here competes for CPU with every
 * other typecheck in the workspace.
 *
 * It does not report *type-position* `import("…")`, which erases at runtime but is a real
 * compile-time dependency and so a real edit when a directory moves. Those are picked up by
 * the pattern below. It is a regex rather than a second parser because the set it must
 * cover is small and structurally fixed; non-relative hits it may pick up out of string
 * literals are rejected downstream by `resolveModule`, which requires a `./` or `../`.
 */
export function specifiersIn(source: string, loader: "ts" | "tsx"): readonly string[] {
	// A leading shebang is not JavaScript and the transpiler rejects it outright — which
	// takes the whole file's imports down with it. `src/cli.ts` opens with
	// `#!/usr/bin/env bun` and is one of the largest importers in the tree, so leaving it
	// unmeasured would under-report fan-in for most of the modules it names.
	const scannable = source.startsWith("#!") ? source.slice(source.indexOf("\n") + 1) : source;
	const found = new Set(new Bun.Transpiler({ loader }).scanImports(scannable).map(entry => entry.path));
	for (const match of scannable.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
		if (match[1]) found.add(match[1]);
	}
	return [...found];
}

async function collectSourceFiles(directory: string, found: string[] = []): Promise<string[]> {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			if (!IGNORED_DIRECTORIES.has(entry.name)) await collectSourceFiles(full, found);
		} else if (/\.(ts|tsx|mts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
			found.push(path.resolve(full));
		}
	}
	return found;
}

interface Scan {
	readonly edges: ImportEdge[];
	readonly fileLines: Map<string, number>;
}

/**
 * Read every source file once, for its line count and its import specifiers.
 *
 * A file that fails to parse is fatal rather than skipped. Skipping it would drop the
 * importers it contributes, and a scan that quietly measured 1354 of 1355 files prints a
 * table that is indistinguishable from a complete one.
 */
async function scanTree(files: readonly string[]): Promise<Scan> {
	const edges: ImportEdge[] = [];
	const fileLines = new Map<string, number>();
	const unparsed: string[] = [];
	for (const file of files) {
		const source = await Bun.file(file).text();
		try {
			for (const specifier of specifiersIn(source, file.endsWith(".tsx") ? "tsx" : "ts")) {
				edges.push({ from: file, specifier });
			}
		} catch {
			unparsed.push(file);
		}
		fileLines.set(file, source === "" ? 0 : source.split("\n").length);
	}
	if (unparsed.length > 0) {
		throw new Error(
			`${unparsed.length} file(s) failed to parse, so their importers would go unmeasured: ${unparsed
				.slice(0, 5)
				.join(", ")}${unparsed.length > 5 ? ", …" : ""}`,
		);
	}
	return { edges, fileLines };
}

/** Tracked files under `packages/` — the mandatory invariant counts *tracked* files. */
async function trackedPackageFileCount(repoRoot: string): Promise<number> {
	// `stdin: "ignore"` is load-bearing, and this uses `Bun.spawn` rather than Bun Shell
	// for it because the Shell has no equivalent on this runtime. Bun Shell hands the child
	// this process's stdin; in a context where that never reaches EOF — a CI step with no
	// tty, a task-runner invocation — the shell waits on a pipe `git ls-files` has no
	// intention of reading, and the gate hangs instead of reporting. Measured here: the
	// same command returned instantly detached and hung past 120s in the foreground.
	const proc = Bun.spawn(["git", "ls-files", "packages/"], {
		cwd: repoRoot,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "ignore",
	});
	const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
	if (code !== 0) return -1;
	return out.split("\n").filter(Boolean).length;
}

interface Baseline {
	readonly capturedAt: string;
	readonly definition: string;
	readonly packageFileCount: number;
	readonly modules: Record<string, number>;
}

function baselinePath(repoRoot: string): string {
	return path.join(repoRoot, "scripts/fan-in-baseline.json");
}

function renderTable(modules: readonly ModuleFanIn[]): string {
	const header = ["module", "importers", "internal", "files", "lines"];
	const rows = modules.map(entry => [
		entry.module,
		String(entry.externalImporters),
		String(entry.internalEdges),
		String(entry.files),
		String(entry.lines),
	]);
	const widths = header.map((cell, column) => Math.max(cell.length, ...rows.map(row => row[column].length)));
	const line = (cells: readonly string[]): string => cells.map((cell, i) => cell.padEnd(widths[i])).join("  ");
	return [line(header), line(widths.map(width => "-".repeat(width))), ...rows.map(line)].join("\n");
}

async function readBaseline(repoRoot: string): Promise<Baseline | undefined> {
	try {
		return (await Bun.file(baselinePath(repoRoot)).json()) as Baseline;
	} catch {
		return undefined;
	}
}

async function main(): Promise<void> {
	const repoRoot = process.cwd();
	const moduleRoot = path.join(repoRoot, "packages/coding-agent/src");
	const check = process.argv.includes("--check");

	const files = await collectSourceFiles(moduleRoot);
	const [scan, packageFileCount] = await Promise.all([scanTree(files), trackedPackageFileCount(repoRoot)]);
	const modules = computeFanIn(scan.edges, scan.fileLines, moduleRoot);

	// The scanned-file count is load-bearing: a walk that found nothing prints an empty
	// table, which reads exactly like "every module has zero importers".
	console.error(`${PREFIX} ${modules.length} modules, ${files.length} files, ${scan.edges.length} import edges`);

	if (!check) {
		const baseline: Baseline = {
			capturedAt: new Date().toISOString().slice(0, 10),
			definition: "distinct files outside the module directory importing it or anything beneath it",
			packageFileCount,
			modules: Object.fromEntries(modules.map(entry => [entry.module, entry.externalImporters])),
		};
		await Bun.write(baselinePath(repoRoot), `${JSON.stringify(baseline, null, "\t")}\n`);
		console.error(`${PREFIX} wrote ${path.relative(repoRoot, baselinePath(repoRoot))}`);
		console.log(renderTable(modules));
		return;
	}

	const baseline = await readBaseline(repoRoot);
	if (baseline === undefined) {
		console.error(
			`${PREFIX} FAIL no baseline — run \`bun run measure:fan-in\` and commit scripts/fan-in-baseline.json`,
		);
		process.exit(1);
	}
	const regressions = findRegressions(modules, new Map(Object.entries(baseline.modules)));
	const fileDropped = packageFileCount >= 0 && baseline.packageFileCount > packageFileCount;
	if (regressions.length === 0 && !fileDropped) return;

	for (const regression of regressions) {
		console.error(`${PREFIX} FAIL ${regression.module} fan-in ${regression.baseline} -> ${regression.current}`);
	}
	if (fileDropped) {
		console.error(
			`${PREFIX} FAIL tracked files under packages/ fell ${baseline.packageFileCount} -> ${packageFileCount}; the R0 invariant forbids deletion`,
		);
	}
	console.error(`${PREFIX} ${regressions.length + Number(fileDropped)} regressions vs ${baseline.capturedAt}`);
	process.exit(1);
}

// Imported for its pure helpers by `measure-fan-in.test.ts`, so the measurement only runs
// when this file is the entry point. A test importing the module must not kick off a
// full-tree scan as a side effect of loading it.
if (import.meta.main) await main();
