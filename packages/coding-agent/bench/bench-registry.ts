/**
 * Registry of the benchmark scripts in this directory.
 *
 * The 14 `.bench.ts` files are top-level scripts: each one runs on import,
 * prints, and exports nothing. They are the measurement surface and are left
 * untouched. This registry is the index over them — name plus the unit each
 * script actually reports — so a ledger entry can point at a real measurement
 * and so a dropped bench file fails a test instead of quietly shrinking the
 * report to 13.
 *
 * Units are transcribed from each script's own output, not assigned by category.
 */
import * as fs from "node:fs/promises";
import type { BenchUnit } from "./perf-corpus-schema";

export interface BenchEntry {
	/** Basename without the `.bench.ts` suffix. */
	readonly name: string;
	/** What this script's numbers are denominated in, read off its output. */
	readonly unit: BenchUnit;
	/** The command that runs it. */
	readonly command: string;
}

function entry(name: string, unit: BenchUnit): BenchEntry {
	return { name, unit, command: `bun packages/coding-agent/bench/${name}.bench.ts` };
}

/** Every `.bench.ts` in this directory, in directory order. */
export const BENCH_INDEX: readonly BenchEntry[] = [
	entry("count-lines", "ms/op"),
	entry("direnv-prefetch", "ms/op"),
	entry("edit-lsp-writethrough", "ms"),
	entry("llm-assembly", "ratio"),
	entry("persist-truncate", "us/op"),
	entry("session-branch", "us/op"),
	entry("session-tree-nav", "ms/op"),
	entry("speculative-eval-integration", "ratio"),
	entry("speculative-shadow-planning", "ms/op"),
	entry("streaming-throughput", "ms/op"),
	entry("subagent-hud-paint", "us/op"),
	entry("thinking-retention", "ms"),
	entry("tool-args-reveal", "ms/op"),
	entry("transcript-compose", "ms"),
];

/**
 * The committed roster of benchmarks.
 *
 * A test asserts the registry's names equal this set exactly, in both
 * directions. Adding a bench means adding it here in the same change — that is
 * the point. A registry that grows on its own is how a measurement disappears
 * from the report without anyone deciding to drop it.
 */
export const EXPECTED_BENCH_NAMES: readonly string[] = [
	"count-lines",
	"direnv-prefetch",
	"edit-lsp-writethrough",
	"llm-assembly",
	"persist-truncate",
	"session-branch",
	"session-tree-nav",
	"speculative-eval-integration",
	"speculative-shadow-planning",
	"streaming-throughput",
	"subagent-hud-paint",
	"thinking-retention",
	"tool-args-reveal",
	"transcript-compose",
];

const SUFFIX = ".bench.ts";

export interface BenchRoster {
	/** Registry entries with a script behind them. */
	readonly present: readonly BenchEntry[];
	/** Registered here, absent from `dir` — a measurement that cannot be run. */
	readonly missing: readonly string[];
	/** A script in `dir` with no registry entry, so its unit is unknown. */
	readonly unlisted: readonly string[];
}

/**
 * Read the directory and compare it with the registry, both ways.
 *
 * A report that printed `loaded ${BENCH_INDEX.length}/${BENCH_INDEX.length}`
 * would say 14/14 with a file deleted, which is the one sentence this whole
 * ledger exists to make impossible. The two sides are read independently so
 * both a deletion and an unclassified addition are named.
 */
export async function readBenchRoster(dir: string): Promise<BenchRoster> {
	const dirents = await fs.readdir(dir, { withFileTypes: true });
	const onDisk = new Map<string, boolean>();
	for (const dirent of dirents) {
		if (!dirent.name.endsWith(SUFFIX)) continue;
		onDisk.set(dirent.name.slice(0, -SUFFIX.length), dirent.isFile());
	}

	const registry = new Map(BENCH_INDEX.map(item => [item.name, item]));
	const present: BenchEntry[] = [];
	const unlisted: string[] = [];
	for (const name of [...onDisk.keys()].sort()) {
		// Only a runnable file is a measurement. Skipping the rest here rather
		// than after the fact keeps a name from appearing in `present` and
		// `missing` at once, which would make `loaded n/14` disagree with itself.
		if (onDisk.get(name) !== true) continue;
		const known = registry.get(name);
		if (known) present.push(known);
		else unlisted.push(name);
	}
	// A directory that took a bench's name is missing, not present: it cannot be
	// run, so reporting it as loaded would be the same false sentence.
	const missing = BENCH_INDEX.filter(item => onDisk.get(item.name) !== true).map(item => item.name);
	return { present, missing, unlisted };
}
