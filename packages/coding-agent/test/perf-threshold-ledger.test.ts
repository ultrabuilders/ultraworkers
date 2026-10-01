import { afterAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { BENCH_INDEX, EXPECTED_BENCH_NAMES, readBenchRoster } from "../bench/bench-registry";
import type { BenchUnit } from "../bench/perf-corpus-schema";
import {
	APPLIED_PERF_THRESHOLDS,
	type PerfThresholdEvidence,
	evaluatePromotion,
	reportPerfThresholdLedger,
	validatePerfThresholdLedger,
} from "../bench/perf-threshold.ledger";

const tempDirs: string[] = [];

afterAll(() => {
	for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

/** A record that asks to be enforced while carrying the evidence to justify it. */
function promotable(overrides: Partial<PerfThresholdEvidence> = {}): PerfThresholdEvidence {
	return {
		name: "bench.example.enforced",
		metricClass: "wall-clock-proxy",
		advisoryOrEnforced: "enforced",
		fixtureId: "example",
		command: "bun packages/coding-agent/bench/example.bench.ts",
		rationale: "test fixture",
		varianceCharacterized: true,
		benchmarkEvidence: {
			suite: "example",
			command: "bun example",
			beforeAfter: { metric: "p95", before: 10, after: 8, unit: "ms" },
			status: "passed",
		},
		humanApprovalEvidence: { approved: true, source: "review", reference: "#1" },
		...overrides,
	};
}

describe("evaluatePromotion", () => {
	it("refuses a record that claims enforcement but carries no evidence", () => {
		// The regression this guards is a condition that reads only
		// `advisoryOrEnforced === "enforced"`. It passes for this record, CI goes
		// red on every later commit, and the only remedy is deleting the
		// threshold — which is the outcome the ledger exists to prevent.
		const bare = promotable({
			benchmarkEvidence: undefined,
			humanApprovalEvidence: undefined,
			varianceCharacterized: false,
		});

		const verdict = evaluatePromotion(bare);

		expect(verdict.hardEligible).toBe(false);
		expect(verdict.reason).toContain("varianceCharacterized");
		expect(verdict.reason).toContain("benchmarkEvidence");
		expect(verdict.reason).toContain("human approval");
	});

	it("promotes a record carrying an evidence class and a clean before/after pair", () => {
		const verdict = evaluatePromotion(promotable());

		expect(verdict.hardEligible).toBe(true);
		expect(verdict.reason).toContain("human approved");
	});

	it("refuses when the benchmark evidence is still pending", () => {
		const pending = promotable({
			benchmarkEvidence: {
				suite: "example",
				command: "bun example",
				beforeAfter: { metric: "p95", before: 10, after: 8, unit: "ms" },
				status: "pending",
			},
		});

		expect(evaluatePromotion(pending).hardEligible).toBe(false);
	});

	it("refuses when the before/after sample shows a regression", () => {
		// Evidence that exists but points the wrong way is not evidence for a
		// gate. `status: "passed"` is the author's claim; the sample is the fact.
		const regressed = promotable({
			benchmarkEvidence: {
				suite: "example",
				command: "bun example",
				beforeAfter: { metric: "p95", before: 10, after: 25, unit: "ms" },
				status: "passed",
			},
		});

		expect(evaluatePromotion(regressed).hardEligible).toBe(false);
		expect(evaluatePromotion(regressed).reason).toContain("regressed");
	});

	it("keeps an advisory record off the hard path whatever evidence it carries", () => {
		const advisory = promotable({ advisoryOrEnforced: "advisory" });

		expect(evaluatePromotion(advisory).hardEligible).toBe(false);
		expect(evaluatePromotion(advisory).reason).toContain("advisory");
	});
});

describe("reportPerfThresholdLedger", () => {
	const mixed: PerfThresholdEvidence[] = [
		{
			name: "bench.under-evidenced.enforced",
			metricClass: "wall-clock-proxy",
			advisoryOrEnforced: "enforced",
			fixtureId: "under-evidenced",
			command: "bun under-evidenced",
			rationale: "asked for a gate without earning one",
			varianceCharacterized: false,
		},
		promotable({ name: "bench.well-evidenced.enforced" }),
	];

	it("merges by default: an under-evidenced threshold reports instead of failing", () => {
		// The negative contract at the centre of the item. A ledger that turned
		// advisory into hard "to make CI strict" blocks other people's PRs over a
		// threshold nobody chose, and the job is still green in advisory mode —
		// so a test that only checks "the job ran" never sees it.
		const { exitCode, report } = reportPerfThresholdLedger(mixed);

		expect(exitCode).toBe(0);
		expect(report).toContain("bench.under-evidenced.enforced");
		expect(report).toContain("exit=0");
	});

	it("fails the same ledger in hard mode", () => {
		const { exitCode, report } = reportPerfThresholdLedger(mixed, "hard");

		expect(exitCode).toBe(1);
		expect(report).toContain("exit=1");
	});

	it("reports both counts before the exit code, so a red log names the group", () => {
		const { report } = reportPerfThresholdLedger(mixed, "hard");

		const counts = report.indexOf("hard: 1 thresholds with sufficient evidence");
		const exit = report.indexOf("exit=");
		expect(counts).toBeGreaterThan(-1);
		expect(counts).toBeLessThan(exit);
		expect(report).toContain("advisory: 1 thresholds without sufficient evidence");
	});

	it("keeps the shipped ledger valid and entirely advisory", () => {
		expect(validatePerfThresholdLedger()).toEqual([]);
		expect(APPLIED_PERF_THRESHOLDS.every(t => t.advisoryOrEnforced === "advisory")).toBe(true);
	});
});

describe("bench index", () => {
	const BENCH_DIR = path.resolve(import.meta.dir, "../bench");
	const ALLOWED_UNITS: readonly BenchUnit[] = ["ms", "ms/op", "us/op", "ratio"];

	it("indexes every .bench.ts in the directory, by name and unit", () => {
		// Adding a ledger must not cost a measurement. The bench files export
		// nothing — they run on import — so the directory listing is the
		// independent fact the registry is checked against, not the registry
		// restating itself.
		const onDisk = fs
			.readdirSync(BENCH_DIR)
			.filter(name => name.endsWith(".bench.ts"))
			.map(name => name.replace(/\.bench\.ts$/, ""))
			.sort();
		const indexed = BENCH_INDEX.map(e => e.name).sort();

		expect(indexed).toEqual(onDisk);
		expect(indexed).toEqual([...EXPECTED_BENCH_NAMES].sort());
		expect(onDisk).toHaveLength(14);
	});

	it("gives every entry a non-empty name and a unit from the allowed set", () => {
		for (const entry of BENCH_INDEX) {
			expect(entry.name.length).toBeGreaterThan(0);
			expect(ALLOWED_UNITS).toContain(entry.unit);
			expect(entry.command).toContain(`${entry.name}.bench.ts`);
		}
	});

	it("has no duplicate bench names", () => {
		const names = BENCH_INDEX.map(e => e.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it("names a measurement that is gone, and one that was never registered", async () => {
		// The report prints `loaded n/14`, so the only thing standing between that
		// line and a lie is that the denominator comes from disk and the
		// differences are named. A registry that counted itself could not.
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-bench-roster-"));
		tempDirs.push(dir);
		await Bun.write(path.join(dir, "session-branch.bench.ts"), "// bench\n");
		// A directory holding a bench's name: the script cannot be run, so the
		// measurement is gone even though the name is still there.
		fs.mkdirSync(path.join(dir, "count-lines.bench.ts"));
		await Bun.write(path.join(dir, "brand-new.bench.ts"), "// bench\n");

		const roster = await readBenchRoster(dir);

		expect(roster.present.map(e => e.name)).toEqual(["session-branch"]);
		expect(roster.missing).toContain("count-lines");
		expect(roster.missing).not.toContain("session-branch");
		expect(roster.unlisted).toEqual(["brand-new"]);
	});

	it("denominates the per-op benches in the unit those benches print", async () => {
		// `ALLOWED_UNITS` membership is a closed-vocabulary check: it cannot tell
		// `ms` from `us/op`, both of which are allowed. So the unit is grounded
		// against the two scripts that report a per-operation figure, run here
		// rather than read — a bench whose unit is wrong by 1000x still satisfies
		// every other test in this file, and the error then lands in a threshold
		// that compares a 4.4us cost against a 4.4ms budget.
		const perOp = BENCH_INDEX.filter(e => e.name === "session-branch" || e.name === "persist-truncate");
		expect(perOp.map(e => e.unit)).toEqual(["us/op", "us/op"]);

		for (const entry of perOp) {
			// `command` is a shell-style string, not a path — split it rather than
			// hand-assembling an argv that could drift from what the registry says.
			const [runner, script] = entry.command.split(" ");
			const proc = Bun.spawnSync([runner ?? "bun", script ?? entry.name], {
				cwd: path.resolve(import.meta.dir, "../../.."),
			});
			const out = proc.stdout.toString();
			// The bench's own stderr rides along: a spawn that fails for an
			// environmental reason is otherwise indistinguishable from one that
			// failed because the script broke.
			expect(`${entry.name} (${proc.stderr.toString().trim()})`).toBe(`${entry.name} ()`);
			expect(proc.exitCode).toBe(0);
			expect(out).toContain("us/op");
			// The total is milliseconds and the per-op figure is not, so a registry
			// reading the other number is reading a different scale.
			expect(out).toMatch(/ms total \([\d.]+us\/op\)/);
		}
	});
});

describe("validatePerfThresholdLedger", () => {
	it("refuses a ledger that claims enforcement it has not earned", () => {
		// Without this the validator is only ever called on a ledger that is
		// already clean, so a validator that returned [] unconditionally would
		// pass every test in the file.
		const errors = validatePerfThresholdLedger([
			promotable({ name: "bench.dupe.enforced" }),
			promotable({
				name: "bench.dupe.enforced",
				benchmarkEvidence: undefined,
				humanApprovalEvidence: undefined,
				varianceCharacterized: false,
			}),
		]);

		expect(errors).toHaveLength(2);
		expect(errors.some(e => e.includes("duplicate threshold name"))).toBe(true);
		expect(errors.some(e => e.includes("is not promotable"))).toBe(true);
	});
});

describe("a ratio metric is not a time metric", () => {
	it("promotes a sample where the ratio went up, because that is the improvement", () => {
		// `llm-assembly` and `speculative-eval-integration` report speedups, where
		// larger is better. Folding ratio into the time-like set would refuse
		// every genuine improvement and block the promotion that should land.
		const faster = promotable({
			benchmarkEvidence: {
				suite: "llm-assembly",
				command: "bun packages/coding-agent/bench/llm-assembly.bench.ts",
				beforeAfter: { metric: "convert_grow_speedup", before: 1.2, after: 1.8, unit: "ratio" },
				status: "passed",
			},
		});

		const decision = evaluatePromotion(faster);

		expect(decision.hardEligible).toBe(true);
		// The same shape in milliseconds is the opposite verdict, which is what
		// makes the unit load-bearing rather than decoration.
		const slower: PerfThresholdEvidence = {
			...faster,
			benchmarkEvidence: {
				...faster.benchmarkEvidence!,
				beforeAfter: { ...faster.benchmarkEvidence!.beforeAfter, unit: "ms" },
			},
		};
		expect(evaluatePromotion(slower).hardEligible).toBe(false);
	});
});
