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
import {
	APPLIED_PERF_THRESHOLDS,
	type LedgerMode,
	reportPerfThresholdLedger,
} from "../packages/coding-agent/bench/perf-threshold.ledger";
import { BENCH_INDEX } from "../packages/coding-agent/bench/bench-registry";

function header(): string[] {
	const cpus = os.cpus();
	return [
		`commit: ${process.env.GITHUB_SHA ?? "local"}`,
		`bun: ${Bun.version}`,
		`platform: ${process.platform} ${process.arch}`,
		`os: ${os.type()} ${os.release()}`,
		`cpu: ${cpus[0]?.model ?? "unknown"} x${cpus.length}`,
		`mode: ${process.env.PERF_LEDGER_MODE ?? "advisory"}`,
		`bench: loaded ${BENCH_INDEX.length}/${BENCH_INDEX.length} bench`,
	];
}

const mode: LedgerMode = process.argv.includes("--hard") ? "hard" : "advisory";
const { exitCode, report } = reportPerfThresholdLedger(APPLIED_PERF_THRESHOLDS, mode);

// console.* is correct here: this is a standalone CLI that prints a report and
// sets an exit code, and never runs alongside a TUI or RPC protocol.
console.log(header().join("\n"));
console.log(report);

process.exit(exitCode);
