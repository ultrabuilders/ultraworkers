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
 * at 25 against 20 measured, and `config` at 949 against 166 external importer files at the
 * captured baseline. No single definition fits across rows, which is what hand-collection
 * looks like. Both measurements of the cited commit agree with HEAD on this subtree, so the
 * gap is not drift.
 *
 * The `config` row is where this is visible. An earlier version of this header justified it
 * with "949 exceeds the file count", and that was wrong in both halves: `coding-agent/src`
 * holds 1372 tracked `.ts` files, so 949 does not exceed it, and the 226 it quoted alongside
 * reproduced under no definition tried (275 scoped, 1116 repo-wide, 614 counting every file
 * type). A justification that cannot be re-derived is worse than none — it reads as evidence
 * and stops anyone checking. The claim above rests on the rows disagreeing with each other,
 * which is checkable, rather than on a bound that was not.
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
 * cover is small and structurally fixed.
 *
 * **The measurement is approximate in both directions, and that is worth knowing before
 * quoting a number from it.** It can undercount — any import form `scanImports` does not
 * model is simply absent, and nothing counts it. It can also overcount, because the pattern
 * cannot tell a type-position `import("…")` from the same text sitting in a string:
 * `eval/js/shared/local-module-loader.ts` holds `"./a"` and `"./b"` as path placeholders, and
 * those are read as dependencies of the `eval` module. Non-relative hits it picks up out of
 * such text (`node:fs/promises`, `@oh-my-pi/pi-ai`, `/$bunfs/...`) are rejected downstream by
 * `resolveModule`, which requires a `./` or `../`, so most of that noise costs nothing.
 *
 * The baseline and the check read the tree through these same rules, so a *comparison*
 * against it stays sound — the overcount is constant while the placeholder stays constant.
 * An absolute count should be read as "close to", never as exact.
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
	// Fail CLOSED. This used to return -1, and the caller read that as "count
	// unknown, skip the deletion check" — the one failure mode a deletion guard
	// must never have. With git broken the count is unknown, and "unknown" was
	// being reported as "nothing was deleted". A gate that cannot see is not a
	// gate that passes; throwing makes CI red instead of silently dropping the R0
	// invariant for the length of whatever broke git.
	if (code !== 0)
		throw new Error(`${PREFIX} git ls-files failed (exit ${code}); cannot verify the deletion invariant`);
	return out.split("\n").filter(Boolean).length;
}

interface Baseline {
	readonly capturedAt: string;
	readonly definition: string;
	readonly packageFileCount: number;
	readonly modules: Record<string, number>;
	/**
	 * `Bun.hash` over every other field, in the order they are written.
	 *
	 * This is a tamper MARKER, not a signature: the threat is someone loosening a
	 * threshold by editing this file and forgetting, not an adversary who can
	 * recompute a hash. The ratchet already refuses a weakening on the `--update`
	 * path, but `--check` only compared two numbers — so a hand-edited baseline
	 * stayed green forever, which is the one thing a ratchet exists to prevent.
	 *
	 * The other option is comparing against the blob at a recorded commit. That is
	 * NOT circular — `git show HEAD:scripts/fan-in-baseline.json` needs no sha
	 * recorded in the file — and it was the better choice on paper, because the
	 * seal then cannot be recomputed by anyone editing the file. Rejected for two
	 * concrete reasons instead: it makes a legitimate `--update` commit read as a
	 * hand edit until it is merged, so the first PR to run it would need the file
	 * skipped, and it puts git in the path of a check that otherwise runs from a
	 * plain checkout.
	 */
	readonly contentHash?: string;
}

/** A baseline with no seal — the shape {@link sealBaseline} hashes. */
type UnsealedBaseline = Omit<Baseline, "contentHash">;

/**
 * The exact string the seal covers: every field except the seal itself.
 *
 * The object is REBUILT here in a fixed key order rather than stringified from
 * whatever order the file happens to use, so the seal does not depend on how the
 * JSON is laid out. Measured: reordering the file's keys leaves the seal
 * identical. An earlier version of this comment claimed the opposite and was
 * wrong — a key-sorting formatter would have reddened the baseline with a
 * "hand edit" message for a change that changed nothing.
 */
function sealInput(baseline: UnsealedBaseline): string {
	return JSON.stringify({
		capturedAt: baseline.capturedAt,
		definition: baseline.definition,
		packageFileCount: baseline.packageFileCount,
		modules: baseline.modules,
	});
}

export function sealBaseline(baseline: UnsealedBaseline): Baseline {
	return { ...baseline, contentHash: Bun.hash(sealInput(baseline)).toString() };
}

/**
 * Whether a baseline still matches its own seal.
 *
 * `undefined` is not a pass: a baseline with no seal predates this check, and
 * treating that as valid would leave every existing file unverified.
 */
export function isSealedIntact(baseline: Baseline): boolean {
	if (typeof baseline.contentHash !== "string") return false;
	return Bun.hash(sealInput(baseline)).toString() === baseline.contentHash;
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

/** A baseline move that would make the gate accept more than it accepted before. */
export interface Weakening {
	readonly detail: string;
}

/**
 * Changes to the baseline that weaken the gate rather than record progress.
 *
 * The two numbers pull in opposite directions, which is why one flag cannot
 * guard both. Each module's count is a CEILING: decomposition should drive it
 * down, so a rise means something new reached into that module. `packageFileCount`
 * is a FLOOR: R0 forbids deletion, so a drop means files vanished. Progress is
 * ceiling down and floor up; anything else is the gate being loosened.
 *
 * A module that disappeared entirely is not listed. Absence is already
 * unrecorded-and-never-failed by `findRegressions`, and inventing a
 * regression for a module nobody imports any more would punish deletion of dead
 * code — the opposite of what this programme is for.
 */
export function findWeakening(current: Baseline, next: Baseline): Weakening[] {
	const weakened: Weakening[] = [];
	for (const [module, was] of Object.entries(current.modules)) {
		const now = next.modules[module];
		if (now === undefined) continue;
		if (now > was) weakened.push({ detail: `${module} ceiling ${was} -> ${now}` });
	}
	if (next.packageFileCount < current.packageFileCount) {
		weakened.push({
			detail: `tracked files floor ${current.packageFileCount} -> ${next.packageFileCount}`,
		});
	}
	return weakened;
}

async function main(): Promise<void> {
	const repoRoot = process.cwd();
	const moduleRoot = path.join(repoRoot, "packages/coding-agent/src");
	const check = process.argv.includes("--check");
	const update = process.argv.includes("--update");
	const acceptRegression = process.argv.includes("--accept-regression");

	const files = await collectSourceFiles(moduleRoot);
	const [scan, packageFileCount] = await Promise.all([scanTree(files), trackedPackageFileCount(repoRoot)]);
	const modules = computeFanIn(scan.edges, scan.fileLines, moduleRoot);

	// The scanned-file count is load-bearing: a walk that found nothing prints an empty
	// table, which reads exactly like "every module has zero importers".
	console.error(`${PREFIX} ${modules.length} modules, ${files.length} files, ${scan.edges.length} import edges`);

	// Measuring is not committing. The bare command used to overwrite the baseline
	// with whatever the tree happened to contain, which made
	// `bun run measure:fan-in && git commit` a complete way to switch the gate off:
	// the threshold moved to match the code, so the next run had nothing to report,
	// and the deletion floor travelled with it. `bun run measure:fan-in:check` in CI
	// compares against that same file, so it agreed with whatever it was handed.
	// Only `--update` writes, and below that only when the move is not a weakening.
	if (update) {
		if (process.env.CI) {
			console.error(
				`${PREFIX} FAIL --update is refused in CI. The baseline is a commitment made by a person, not a value CI may rewrite. Push the change from a checkout instead.`,
			);
			process.exit(1);
		}
		const next: Baseline = {
			capturedAt: new Date().toISOString().slice(0, 10),
			definition: "distinct files outside the module directory importing it or anything beneath it",
			packageFileCount,
			modules: Object.fromEntries(modules.map(entry => [entry.module, entry.externalImporters])),
		};
		const current = await readBaseline(repoRoot);
		const weakened = current === undefined ? [] : findWeakening(current, next);
		if (weakened.length > 0 && !acceptRegression) {
			for (const entry of weakened) console.error(`${PREFIX} FAIL update would weaken the gate: ${entry.detail}`);
			console.error(
				`${PREFIX} A ceiling may only fall and a floor may only rise. If this weakening is deliberate, re-run with --accept-regression and say why in the commit.`,
			);
			process.exit(1);
		}
		const sealed = sealBaseline(next);
		await Bun.write(baselinePath(repoRoot), `${JSON.stringify(sealed, null, "\t")}\n`);
		console.error(`${PREFIX} wrote ${path.relative(repoRoot, baselinePath(repoRoot))}`);
		console.log(renderTable(modules));
		return;
	}

	console.log(renderTable(modules));
	if (!check) {
		console.error(`${PREFIX} measured only — ${path.relative(repoRoot, baselinePath(repoRoot))} was not touched`);
	}

	if (!check) return;

	const baseline = await readBaseline(repoRoot);
	if (baseline === undefined) {
		console.error(
			`${PREFIX} FAIL no baseline — run \`bun run measure:fan-in:update\` and commit scripts/fan-in-baseline.json`,
		);
		process.exit(1);
	}
	// Verified before the numbers are compared. A hand-edited baseline would
	// otherwise be judged against itself: loosen a ceiling and --check agrees,
	// because the file it reads is the file that was edited. The seal is the only
	// thing here that is not under the same edit.
	if (!isSealedIntact(baseline)) {
		console.error(
			`${PREFIX} FAIL ${path.relative(repoRoot, baselinePath(repoRoot))} does not match its own contentHash.`,
		);
		console.error(
			`${PREFIX} That is a hand edit, not a measurement. Re-run \`bun run measure:fan-in:update\` and commit the result, so the loosening is a reviewed diff.`,
		);
		process.exit(1);
	}

	const regressions = findRegressions(modules, new Map(Object.entries(baseline.modules)));
	const fileDropped = baseline.packageFileCount > packageFileCount;
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
