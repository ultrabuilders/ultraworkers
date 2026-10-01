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
	entry("persist-truncate", "ms"),
	entry("session-branch", "ms"),
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
