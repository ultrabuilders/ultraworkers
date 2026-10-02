/**
 * Gate: the `@earendil-works/pi-coding-agent` surface must not shrink.
 *
 * ## The failure this prevents
 *
 * An extension written outside this repository imports `pi` symbols by name:
 *
 * ```ts
 * import { withFileMutationQueue, createReadTool } from "@earendil-works/pi-coding-agent";
 * ```
 *
 * `legacy-pi-compat.ts` resolves that specifier to
 * `extensibility/legacy-pi-coding-agent-shim.ts`. If a symbol leaves the shim —
 * a deleted `export *`, a renamed interface, a star-export whose module was
 * moved — Bun fails the extension at LOAD time with
 * `Export named 'withFileMutationQueue' not found`. The extension never runs, and
 * the error names a third-party package for a defect that lives here. Nothing
 * else in the suite catches it: `check:ts` stays green with the export deleted,
 * because the shim is only ever type-checked against itself.
 *
 * That is why this gate measures the shim's RUNTIME export keys rather than
 * re-reading its source. A star-export is invisible to a text match and visible
 * to `Object.keys(await import(shim))`, which is exactly the view an extension
 * gets.
 *
 * ## Why only value exports are compared
 *
 * pi's `index.ts` declares 457 names, but 301 of them are `interface`/`type` —
 * erased before the module ever runs. Comparing those against `Object.keys()`
 * reports every type as missing, which is a number that cannot go down and
 * means nothing. pi's value exports are the ones a runtime `import` can fail
 * on, so those are the set the gate tracks.
 *
 * ## Why the reference side is a committed snapshot
 *
 * pi lives in a sibling clone that CI does not have. A gate that reads it would
 * skip when the clone is absent — a fail-open gate, which reports green for a
 * reason that has nothing to do with the code. So `covered` in the baseline is
 * the measured set, committed; `--update` re-measures it from a local clone and
 * is the only thing that needs the sibling present.
 *
 * ## Reproducing the number
 *
 * `pi value exports: 156` was NOT hand-counted. It is reproducible from a
 * checkout of pi at the same revision:
 *
 * ```bash
 * bun scripts/legacy-pi/check-export-coverage.ts --update \
 *   ../pi-ref/packages/coding-agent/src/index.ts
 * ```
 *
 * Two inputs decide it, and both are named so a differing number is diagnosable
 * rather than mysterious:
 *
 * 1. **pi's revision.** The sibling clone is not pinned by this repo. A pi
 *    version bump moves the denominator — which is exactly when the baseline
 *    MUST be re-sealed, so a number that changed after a pi bump is the gate
 *    working, not the gate breaking.
 * 2. **The parser.** `parsePiValueExports` below IS the definition of "value
 *    export". Changing it legitimately changes the number, which is why its own
 *    tests exist.
 *
 * ## Who re-seals it, and when
 *
 * Whoever bumps pi's version, in that same change. Run the `--update` command
 * above, then move every name the run placed in `unknown` down into
 * `internal-to-pi` or `extension-surface` before committing. `measure()` puts
 * new gaps in `unknown` deliberately, so a re-seal that skipped that review
 * shows up in the report as a long `undecided:` line rather than passing quietly.
 *
 * ## What the gate does NOT promise
 *
 * It does not check that the shim matches pi, only that it does not SHRINK. The
 * 51 known gaps are pi internals (`runPrintMode`, `getDocsPath`, TUI components)
 * that an extension has no reason to import; closing them would mean porting
 * pi's CLI internals, which is a capability decision and not a rename one. The
 * gap list lives in the report so a shrinking denominator stays visible.
 */
import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../..");
const SHIM_PATH = path.join(REPO_ROOT, "packages/coding-agent/src/extensibility/legacy-pi-coding-agent-shim.ts");
const BASELINE_PATH = path.join(import.meta.dir, "export-coverage.baseline.json");

/**
 * Why a pi value export is absent from the shim.
 *
 * An unlabelled list of gaps is a snapshot nobody can check. `internal-to-pi`
 * is a decision ("no extension imports this"); `extension-surface` is a
 * concession ("one probably does, and we have not ported it"); `unknown` is the
 * honest admission that the decision has not been made. Keeping `unknown` small
 * and VISIBLE is the point — it is the work queue, and a gap list that hides
 * its own uncertainty cannot be reviewed.
 */
export type MissingClass = "internal-to-pi" | "extension-surface" | "unknown";

export interface CoverageBaseline {
	/** Names pi's package root exposes as VALUES that the shim re-exports. */
	readonly covered: readonly string[];
	/** Names pi exposes as values the shim does not, bucketed by why. */
	readonly knownMissing: Readonly<Record<MissingClass, readonly string[]>>;
	/** How many value exports pi's package root declares, for the report. */
	readonly piValueExports: number;
	/** How many names the shim exposes at runtime, for the report. */
	readonly shimRuntimeExports: number;
}

/**
 * Strip comments before parsing. A trailing `// Tool factories` on an export
 * specifier otherwise becomes an export name, and a commented-out export list
 * becomes coverage the gate believes is real.
 */
export function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Names pi's package root exports as VALUES.
 *
 * `export { a, type B }` splits on the inline `type` marker as well as the
 * block-level one; a name exported both ways counts as a value, because a
 * runtime `import` of it has to resolve.
 */
export function parsePiValueExports(source: string): string[] {
	const src = stripComments(source);
	const values = new Set<string>();

	// A type-only name is skipped rather than routed to a second set: the result is
	// `values` alone, and a name exported both ways must survive whichever order
	// the two declarations appear in. Skipping never removes what a value form
	// already added.
	const add = (name: string, isType: boolean): void => {
		const clean = name.replace(/^type\s+/, "").trim();
		if (!clean || isType) return;
		values.add(clean);
	};

	for (const match of src.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s*from/g)) {
		const blockIsType = Boolean(match[1]);
		for (const raw of (match[2] ?? "").split(",")) {
			const part = (raw ?? "").trim();
			if (!part) continue;
			const alias = part.match(/\bas\s+([A-Za-z0-9_$]+)$/);
			add(alias ? alias[1]! : part, blockIsType || /^type\s/.test(part));
		}
	}
	for (const match of src.matchAll(
		/export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const|let|var|enum)\s+([A-Za-z0-9_$]+)/g,
	)) {
		add(match[1]!, false);
	}
	for (const match of src.matchAll(/export\s+(?:declare\s+)?(?:interface|type)\s+([A-Za-z0-9_$]+)/g)) {
		add(match[1]!, true);
	}

	return [...values].sort();
}

/** Every export name the shim actually hands to a runtime `import`. */
export async function readShimExports(shimPath: string = SHIM_PATH): Promise<Set<string>> {
	const shim = (await import(shimPath)) as Record<string, unknown>;
	return new Set(Object.keys(shim));
}

/** Exports the shim no longer exposes that the baseline says it must. */
export function findRegressions(covered: readonly string[], shimExports: ReadonlySet<string>): string[] {
	return covered.filter(name => !shimExports.has(name)).sort();
}

export async function loadBaseline(baselinePath: string = BASELINE_PATH): Promise<CoverageBaseline> {
	return (await Bun.file(baselinePath).json()) as CoverageBaseline;
}

/**
 * Re-measure both sides from a local pi clone. The only path that needs one.
 *
 * Every new gap lands in `unknown`, deliberately. Classifying a gap is a
 * judgement about whether an out-of-repo extension imports it, and a script
 * cannot make that judgement — so regenerating without reviewing leaves the
 * whole gap list in the bucket the report prints loudest. A re-seal that
 * skipped the review is therefore visible rather than silent.
 */
export async function measure(piIndexPath: string): Promise<CoverageBaseline> {
	const piValueExports = parsePiValueExports(await Bun.file(piIndexPath).text());
	const shimExports = await readShimExports();
	const covered = piValueExports.filter(name => shimExports.has(name));
	return {
		covered,
		knownMissing: {
			"internal-to-pi": [],
			"extension-surface": [],
			unknown: piValueExports.filter(name => !shimExports.has(name)),
		},
		piValueExports: piValueExports.length,
		shimRuntimeExports: shimExports.size,
	};
}

export function formatReport(baseline: CoverageBaseline, regressions: readonly string[]): string {
	const missing = baseline.knownMissing;
	const total =
		baseline.covered.length +
		missing["internal-to-pi"].length +
		missing["extension-surface"].length +
		missing.unknown.length;
	const lines = [
		`pi value exports:    ${baseline.piValueExports}`,
		`shim runtime exports: ${baseline.shimRuntimeExports}`,
		`covered:             ${baseline.covered.length}/${total}`,
		`known missing:       ${missing["internal-to-pi"].length + missing["extension-surface"].length + missing.unknown.length}`,
		`  internal-to-pi:    ${missing["internal-to-pi"].length}`,
		`  extension-surface: ${missing["extension-surface"].length}`,
		`  unknown:           ${missing.unknown.length}`,
	];
	// `unknown` is printed by name on purpose: it is the bucket a reviewer is
	// meant to empty, and a count alone does not say WHICH gap is undecided.
	if (missing.unknown.length > 0) lines.push(`  undecided: ${missing.unknown.join(" ")}`);
	if (missing["extension-surface"].length > 0) lines.push(`  surface: ${missing["extension-surface"].join(" ")}`);
	if (regressions.length > 0) {
		lines.push("", `REGRESSION — the shim no longer exports ${regressions.length}:`);
		for (const name of regressions) lines.push(`  ${name}`);
		lines.push(
			"",
			"An extension importing one of these now dies at load with",
			"`Export named '<name>' not found`. Restore the export or re-run --update.",
		);
	}
	return lines.join("\n");
}

async function main(): Promise<void> {
	const updateIndex = process.argv.indexOf("--update");
	if (updateIndex !== -1) {
		const piIndexPath = process.argv[updateIndex + 1];
		if (!piIndexPath) {
			console.error("--update requires the path to pi-ref's packages/coding-agent/src/index.ts");
			process.exit(2);
		}
		const measured = await measure(piIndexPath);
		await Bun.write(BASELINE_PATH, `${JSON.stringify(measured, null, "\t")}\n`);
		console.log(formatReport(measured, []));
		console.log(`\nwrote ${BASELINE_PATH}`);
		return;
	}

	const baseline = await loadBaseline();
	const regressions = findRegressions(baseline.covered, await readShimExports());
	console.log(formatReport(baseline, regressions));
	if (regressions.length > 0) process.exit(1);
}

if (import.meta.main) await main();
