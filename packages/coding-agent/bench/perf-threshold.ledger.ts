/**
 * Perf threshold / evidence ledger.
 *
 * Copied from the reference implementation in `gajae-ref`
 * (`packages/coding-agent/bench/perf-threshold.ledger.ts`, 97 lines) and
 * adapted to omp's benchmark set.
 *
 * Threshold changes are explicit, evidence-backed records. Wall-clock and RSS
 * thresholds START advisory (report-only, never fail default CI) until variance
 * is characterised; promotion to an enforced hard gate requires a clean
 * before/after benchmark evidence record AND human approval.
 */
import type { EvidenceClass } from "./perf-corpus-schema";

export interface PerfThresholdBenchmarkEvidence {
	suite: string;
	command: string;
	/** Comparable before/after sample, e.g. baseline vs candidate p95. */
	beforeAfter: { metric: string; before: number; after: number; unit: string };
	status: "passed" | "pending";
}

export interface PerfThresholdHumanApprovalEvidence {
	approved: boolean;
	source: string;
	reference: string;
}

export interface PerfThresholdEvidence {
	name: string;
	/** Which evidence class the threshold gates. */
	metricClass: EvidenceClass;
	/** Advisory thresholds report-only; enforced thresholds fail CI. */
	advisoryOrEnforced: "advisory" | "enforced";
	fixtureId: string;
	command: string;
	benchmarkEvidence?: PerfThresholdBenchmarkEvidence;
	humanApprovalEvidence?: PerfThresholdHumanApprovalEvidence;
	rationale: string;
	varianceCharacterized: boolean;
}

/**
 * Applied perf thresholds. Initially advisory-only: CI variance for
 * wall-clock/RSS metrics has not been characterised, so nothing is promoted to
 * an enforced hard gate. New advisory thresholds may be added freely; enforced
 * thresholds must carry benchmark + human approval evidence and
 * `varianceCharacterized: true`.
 */
export const APPLIED_PERF_THRESHOLDS: readonly PerfThresholdEvidence[] = [
	{
		name: "bench.count-lines.wallclock.advisory",
		metricClass: "wall-clock-proxy",
		advisoryOrEnforced: "advisory",
		fixtureId: "count-lines",
		command: "bun packages/coding-agent/bench/count-lines.bench.ts",
		rationale:
			"Report countTextLines scan cost as advisory; not enforced until CI variance across machines/arch is characterised.",
		varianceCharacterized: false,
	},
	{
		name: "bench.transcript-compose.wallclock.advisory",
		metricClass: "wall-clock-proxy",
		advisoryOrEnforced: "advisory",
		fixtureId: "transcript-compose",
		command: "bun packages/coding-agent/bench/transcript-compose.bench.ts",
		rationale:
			"Report transcript compose cost as advisory; grows with session depth, so a fixed bound would encode a fixture rather than a budget.",
		varianceCharacterized: false,
	},
	{
		name: "bench.subagent-hud-paint.cpu.advisory",
		metricClass: "process-cpu-usage",
		advisoryOrEnforced: "advisory",
		fixtureId: "subagent-hud-paint",
		command: "bun packages/coding-agent/bench/subagent-hud-paint.bench.ts",
		rationale:
			"Report per-paint CPU cost as advisory; sub-microsecond medians are dominated by scheduler noise on shared CI runners.",
		varianceCharacterized: false,
	},
] as const;

/** Thresholds proposed but held until live before/after variance evidence exists. */
export const HELD_PERF_THRESHOLDS: readonly { candidate: string; reason: string; requiresEvidenceVia: string }[] = [
	{
		candidate: "bench.streaming-throughput.wallclock.enforced",
		reason:
			"HELD: hard-gating streaming reveal wall-clock risks flakiness from scheduler/GC noise; needs characterised CI variance + ledger approval before enforcement.",
		requiresEvidenceVia: "bench variance run + human approval",
	},
] as const;

/**
 * Whether one record may sit behind a hard gate, and why not when it may not.
 *
 * The evidence check is the whole function. A record that only consults its own
 * `advisoryOrEnforced` field is the classic regression here: the flag says
 * "hard", CI goes red from that commit onward, and the only way forward is to
 * delete the threshold — the exact outcome this ledger exists to prevent.
 */
export function evaluatePromotion(threshold: PerfThresholdEvidence): { hardEligible: boolean; reason: string } {
	if (threshold.advisoryOrEnforced !== "enforced") {
		return { hardEligible: false, reason: "advisory thresholds never gate CI" };
	}
	const { benchmarkEvidence } = threshold;
	const missing: string[] = [];
	if (!threshold.varianceCharacterized) missing.push("varianceCharacterized: true");
	if (!benchmarkEvidence || benchmarkEvidence.status !== "passed") {
		missing.push("passed benchmarkEvidence with a before/after sample");
	}
	if (!threshold.humanApprovalEvidence?.approved) missing.push("human approval evidence");
	if (missing.length > 0) {
		return { hardEligible: false, reason: `missing ${missing.join(", ")}` };
	}

	// `status: "passed"` is the author's claim; the sample is the fact. For a
	// time-like metric, "after" larger than "before" is a regression, and a gate
	// promoted on one would enshrine the regression as the budget. Ratio metrics
	// are excluded: there, larger is the improvement.
	//
	// The assertion is the empty `missing` above: it can only be empty if the
	// benchmark evidence was present and passed. Stated here rather than as a
	// second guard, because a guard that cannot fire is a branch with no test.
	const sample = benchmarkEvidence!.beforeAfter;
	if (TIME_LIKE_UNITS.has(sample.unit) && sample.after > sample.before) {
		return {
			hardEligible: false,
			reason: `regressed: ${sample.metric} went ${sample.before} → ${sample.after} ${sample.unit}`,
		};
	}
	return { hardEligible: true, reason: "variance characterised, benchmark passed, human approved" };
}

/** Validate ledger invariants. Returns the list of violations (empty == valid). */
export function validatePerfThresholdLedger(
	applied: readonly PerfThresholdEvidence[] = APPLIED_PERF_THRESHOLDS,
): string[] {
	const errors: string[] = [];
	const seen = new Set<string>();
	for (const t of applied) {
		if (seen.has(t.name)) errors.push(`duplicate threshold name: ${t.name}`);
		seen.add(t.name);
		const { hardEligible, reason } = evaluatePromotion(t);
		if (t.advisoryOrEnforced === "enforced" && !hardEligible) {
			errors.push(`enforced threshold ${t.name} is not promotable: ${reason}`);
		}
	}
	return errors;
}

export type LedgerMode = "advisory" | "hard";

/** Units where a larger number is worse, so a rising sample is a regression. */
const TIME_LIKE_UNITS: ReadonlySet<string> = new Set(["ms", "ms/op", "us/op"]);

export interface LedgerReport {
	exitCode: number;
	report: string;
}

/**
 * Render the ledger for a CI job and decide its exit code.
 *
 * Advisory is the default and is not a placeholder: a threshold without
 * evidence reports and merges. Hard mode fails the job for the same ledger, so
 * the mode is the only thing that turns a measurement into a gate — and the
 * report says which thresholds drove the exit before it states the code.
 */
export function reportPerfThresholdLedger(
	applied: readonly PerfThresholdEvidence[] = APPLIED_PERF_THRESHOLDS,
	mode: LedgerMode = "advisory",
): LedgerReport {
	const lines: string[] = [];
	const promotable: PerfThresholdEvidence[] = [];
	const underEvidenced: PerfThresholdEvidence[] = [];

	for (const t of applied) {
		const { hardEligible, reason } = evaluatePromotion(t);
		if (hardEligible) promotable.push(t);
		else underEvidenced.push(t);
		lines.push(
			`${t.name} | ${t.advisoryOrEnforced} | ${t.metricClass} | ${mode} | eligible(hard: ${hardEligible ? "yes" : "no"}) | ${reason}`,
		);
	}

	// Counts precede the exit code on purpose: when a hard-mode job goes red,
	// the log already names the group responsible.
	lines.push(`advisory: ${underEvidenced.length} thresholds without sufficient evidence`);
	lines.push(`hard: ${promotable.length} thresholds with sufficient evidence`);

	const blocking = mode === "hard" ? underEvidenced : [];
	const exitCode = blocking.length > 0 ? 1 : 0;
	lines.push(`exit=${exitCode}`);

	return { exitCode, report: lines.join("\n") };
}
