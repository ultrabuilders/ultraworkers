/**
 * Print the perf threshold ledger and exit with its verdict.
 *
 * Advisory by default: the job measures and reports, and a threshold without
 * evidence merges rather than blocking. `--hard` opts into gating, which is the
 * only thing that turns a measurement into a red build.
 *
 * The environment header is not decoration. Wall-clock and RSS thresholds are
 * not comparable across two machines, so a number without the machine that
 * produced it is not evidence of anything.
 */
import * as os from "node:os";
import * as path from "node:path";
import {
	APPLIED_PERF_THRESHOLDS,
	type LedgerMode,
	reportPerfThresholdLedger,
} from "../packages/coding-agent/bench/perf-threshold.ledger";
import { BENCH_INDEX, readBenchRoster } from "../packages/coding-agent/bench/bench-registry";

const BENCH_DIR = path.resolve(import.meta.dir, "../packages/coding-agent/bench");

/**
 * The machine and the corpus, not just the numbers.
 *
 * The roster is read from disk rather than counted from the registry: a report
 * that derived its own denominator would print 14/14 with a measurement
 * deleted, which is the sentence this ledger exists to make unsayable. A
 * missing name is printed on its own line so a reader does not have to diff two
 * lists to find out which one went away.
 */
async function header(): Promise<string[]> {
	const cpus = os.cpus();
	const roster = await readBenchRoster(BENCH_DIR);
	return [
		`commit: ${process.env.GITHUB_SHA ?? "local"}`,
		`bun: ${Bun.version}`,
		`platform: ${process.platform} ${process.arch}`,
		`os: ${os.type()} ${os.release()}`,
		`cpu: ${cpus[0]?.model ?? "unknown"} x${cpus.length}`,
		`mode: ${process.env.PERF_LEDGER_MODE ?? "advisory"}`,
		`bench: loaded ${roster.present.length}/${BENCH_INDEX.length} bench`,
		...roster.missing.map(name => `bench missing: ${name} is registered but not on disk`),
		...roster.unlisted.map(name => `bench unlisted: ${name} is on disk with no registry entry`),
	];
}

const mode: LedgerMode = process.argv.includes("--hard") ? "hard" : "advisory";
const { exitCode, report } = reportPerfThresholdLedger(APPLIED_PERF_THRESHOLDS, mode);

// console.* is correct here: this is a standalone CLI that prints a report and
// sets an exit code, and never runs alongside a TUI or RPC protocol.
console.log((await header()).join("\n"));
console.log(report);

process.exit(exitCode);
