/**
 * Perf corpus schema and evidence taxonomy.
 *
 * Successor to static hotspot ranking: perf prioritisation keeps wall-clock,
 * process-CPU, and profiler self-time evidence as SEPARATE classes. A hotspot
 * may only be labelled CPU-self-time confirmed when profiler self-time evidence
 * exists.
 *
 * Copied from the reference implementation in `gajae-ref`
 * (`packages/coding-agent/bench/perf-corpus-schema.ts`); only the parts the
 * threshold ledger consumes are kept.
 */

/** Evidence classes. These must never be conflated. */
export type EvidenceClass =
	| "wall-clock-proxy"
	| "process-cpu-usage"
	| "profiler-self-time"
	| "rss-memory"
	| "byte-parity"
	| "ledger-approved-threshold";

/**
 * Units a benchmark in `bench/` may report.
 *
 * Narrow on purpose: a registry entry that cannot name its unit is a number
 * nobody can compare across runs, so the allowlist is closed and adding a unit
 * is a deliberate act rather than a typo that silently widens the set.
 */
export type BenchUnit = "ms" | "ms/op" | "us/op" | "ratio";
