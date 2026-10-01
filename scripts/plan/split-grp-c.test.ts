import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import {
	BASELINE_PATH_FOR_TEST,
	NO_CUT_MODULES,
	OUT_OF_SCOPE_ROWS,
	classify,
	overlapOf,
	readBaseline,
	renderReport,
} from "./split-grp-c";

const BASELINE = path.resolve(import.meta.dir, "../../scripts/fan-in-baseline.json");

/** Build measured rows without touching the real baseline. */
const rows = (...pairs: [string, number][]) => pairs.map(([module, importers]) => ({ module, importers }));

describe("Group C candidate list", () => {
	it("keeps the candidate list and the no-cut list disjoint", () => {
		// The defect being fixed: the plan presents one list that mixes "cuttable with a
		// seam" and "must not be cut", so a reader cannot act on either without first
		// finding §4. If a module could land in both buckets, the split has silently
		// reverted to the thing it replaced — and it would still print a clean table.
		const split = classify(rows(["task", 45], ["config", 949], ["tools", 124]));
		const candidates = split.candidates.map(v => v.module);
		const noCut = split.noCut.map(v => v.module);
		expect(candidates.filter(name => noCut.includes(name))).toEqual([]);
	});

	it("reports a module in the band but ruled no-cut as a finding, not as a candidate", () => {
		// `tools` measures 124 — inside 41-150 — and the plan argues against cutting it.
		// Both facts are true. Dropping either one is the failure: listing it as a
		// candidate ignores the architectural argument, and hiding it under the band
		// hides a real disagreement between the numeric criterion and that argument.
		const split = classify(rows(["tools", 124]));
		expect(split.candidates).toEqual([]);
		expect(split.noCut.map(v => v.module)).toEqual(["tools"]);
		expect(split.noCut[0]?.inBand).toBe(true);
		expect(split.noCut[0]?.reason).not.toMatch(/outside 41-150/);
	});

	it("excludes a module outside the band even when the plan never ruled on it", () => {
		// The band is the group's own definition. A module nobody argued about still does
		// not become Group C by default.
		const split = classify(rows(["launch", 39]));
		expect(split.candidates).toEqual([]);
		expect(split.outOfBand.map(v => v.module)).toEqual(["launch"]);
	});

	it("includes the band edges themselves", () => {
		// Off-by-one either way changes membership at exactly 41 and 150, so both edges
		// are pinned rather than assumed.
		expect(classify(rows(["a", 41])).candidates.map(v => v.module)).toEqual(["a"]);
		expect(classify(rows(["b", 150])).candidates.map(v => v.module)).toEqual(["b"]);
		expect(classify(rows(["c", 40])).candidates).toEqual([]);
		expect(classify(rows(["d", 151])).candidates).toEqual([]);
	});

	it("assigns every measured module exactly one verdict", () => {
		// A module counted in two buckets, or in none, makes the totals lie — the same
		// class of error as a bucket table whose parts do not sum to its whole.
		const split = classify(rows(["task", 45], ["tools", 124], ["launch", 39], ["config", 949]));
		const all = [...split.candidates, ...split.noCut, ...split.outOfBand];
		expect(all.length).toBe(4);
		expect(new Set(all.map(v => v.module)).size).toBe(4);
	});

	it("reads the real baseline and agrees with the group it defines", async () => {
		// Ties the classifier to the actual artifact. The plan's own Group C numbers
		// (eval 126, capability 136, web 66, async 50, edit 49) no longer hold, which is
		// why this list is computed: nine of those eleven fell below the band.
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const measured = readBaseline(baseline);
		expect(measured.length).toBeGreaterThan(0);

		const split = classify(measured);
		for (const name of ["eval", "web", "async", "edit", "internal-urls", "registry", "mcp"]) {
			const row = measured.find(m => m.module === name);
			expect(row, `${name} missing from baseline`).toBeDefined();
			expect(row!.importers, `${name} was assumed to be in the band`).toBeLessThan(41);
		}
		// Every candidate must be inside the band and absent from the no-cut list.
		for (const candidate of split.candidates) {
			expect(candidate.importers).toBeGreaterThanOrEqual(41);
			expect(candidate.importers).toBeLessThanOrEqual(150);
			expect(NO_CUT_MODULES.has(candidate.module)).toBe(false);
		}
	});

	it("keeps every no-cut module reachable in the real baseline", async () => {
		// A no-cut entry naming a module that no longer exists is a rule about nothing.
		// `modes-ui` is a deliberate example: it is not a `coding-agent/src` top-level
		// module, so this row is what catches a typo in the other direction.
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const present = new Set(Object.keys(baseline.modules));
		for (const name of NO_CUT_MODULES) {
			if (name === "modes-ui") continue;
			expect(present.has(name), `no-cut entry "${name}" names a module not in the baseline`).toBe(true);
		}
	});

	it("exposes the baseline path used by the report", () => {
		expect(BASELINE_PATH_FOR_TEST).toBe(BASELINE);
	});
});
describe("Group C report", () => {
	it("surfaces every module that is in the band yet ruled no-cut", async () => {
		// Added because mutation testing showed this output can vanish without turning
		// anything red: zeroing the overlap still passed 8/8, because every other row
		// constrains `classify` rather than the report that prints it. The disagreement
		// between the numeric criterion and the architectural argument is the whole reason
		// this group needs the owner, so losing it costs the report its only finding.
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const split = classify(readBaseline(baseline));
		const overlap = overlapOf(split);

		expect(overlap.length).toBeGreaterThan(0);
		for (const verdict of overlap) {
			expect(verdict.inBand).toBe(true);
			expect(verdict.decision).toBe("no-cut");
			expect(NO_CUT_MODULES.has(verdict.module)).toBe(true);
			expect(verdict.reason.length).toBeGreaterThan(0);
		}
		// Each overlap entry must be absent from the candidate list — otherwise the same
		// module is recommended and ruled against at once.
		const candidates = split.candidates.map(v => v.module);
		expect(overlap.map(v => v.module).filter(name => candidates.includes(name))).toEqual([]);
	});

	it("reports nothing as overlap that is outside the band", async () => {
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const split = classify(readBaseline(baseline));
		for (const verdict of overlapOf(split)) {
			expect(verdict.importers).toBeGreaterThanOrEqual(41);
			expect(verdict.importers).toBeLessThanOrEqual(150);
		}
	});
});

describe("Group C report rendering", () => {
	it("prints every row classify produced", async () => {
		// The generalisation of the mutation that survived. Hand-mutating "hide the
		// overlap" found the gap once; this row makes it structural — rendering is a pure
		// function, so a row that exists in the split but not in the text is a failing
		// assertion rather than something to be caught by hand next time.
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const split = classify(readBaseline(baseline));
		const report = renderReport(split, "test");

		for (const group of [split.candidates, split.noCut, split.merge, overlapOf(split)]) {
			for (const verdict of group) {
				expect(report, `${verdict.module} classified but never printed`).toContain(verdict.module);
			}
		}
		// The overlap names must also appear in the summary line, so a row cannot be
		// listed and yet absent from the headline conclusion.
		for (const verdict of overlapOf(split)) {
			expect(report.split("\n").at(-1)!.includes(verdict.module) || report).toContain(verdict.module);
		}
	});

	it("states the overlap count and names every overlapping module", async () => {
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const split = classify(readBaseline(baseline));
		const report = renderReport(split, "test");
		const overlap = overlapOf(split);
		expect(report).toContain(`NO-CUT — ${split.noCut.length} (of which ${overlap.length} inside the band)`);
		const headline = report.split("OVERLAP: ")[1]?.split("\n")[0] ?? "";
		for (const verdict of overlap) expect(headline).toContain(verdict.module);
	});

	it("names the rejections it cannot see, rather than omitting them", async () => {
		// The plan's §3 `tui/src` rejections and §3.3 merge group are outside
		// `measure-fan-in.ts`'s scope. A rejection that is invisible here must not read as
		// one that never happened.
		const report = renderReport(classify([]), "test");
		expect(report).toContain("RULED OUT BUT OUTSIDE THIS MEASUREMENT");
		for (const row of OUT_OF_SCOPE_ROWS) expect(report).toContain(row.split(" (§")[0]!.split(",")[0]!);
	});

	it("routes §7 no-counterpart modules to merge rather than dropping them", async () => {
		// `merge` is a valid outcome the bead asks to be recorded. If these fell through to
		// `out-of-band` on their importer count, the §7 reasoning would vanish silently.
		const split = classify(rows(["commit", 8], ["dap", 2], ["judgment", 10]));
		expect(split.merge.map(v => v.module).sort()).toEqual(["commit", "dap", "judgment"]);
		expect(split.candidates).toEqual([]);
	});

	it("reports an empty corpus without pretending it measured something", () => {
		const report = renderReport(classify([]), "test");
		expect(report).toContain("CANDIDATES (in band, not ruled on by the plan) — 0");
		expect(report).toContain("NO-CUT — 0 (of which 0 inside the band)");
		expect(report).toContain("OVERLAP: none");
	});
});

describe("Group C separation cannot be undone by disabling the rulings", () => {
	// Mutation "set NO_CUT lookup to undefined" left every other row green, because the
	// rendering test only proves printed rows MATCH classified rows — which stays true
	// when every module is classified as a candidate. That is the defect this bead exists
	// to prevent, so it needs a row that does not depend on the ruling being applied
	// consistently: the plan's no-cut set must actually change the outcome.
	it("keeps plan-ruled modules out of the candidate list, asserted against the real corpus", async () => {
		// This row asserts concrete module names rather than deriving them from
		// NO_CUT_MODULES. Deriving them made it circular: disabling the lookup inside
		// classify left the exported set intact, so the test still saw the rulings and
		// passed while classify had stopped applying them — the exact defect this bead
		// exists to prevent, surviving the mutation.
		//
		// The names below are pinned on purpose. If one of these is ever cut out or renamed,
		// this fails and the ruling has to be revisited deliberately.
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const split = classify(readBaseline(baseline));
		const candidates = split.candidates.map(v => v.module);
		const rejected = [...split.noCut, ...split.merge].map(v => v.module);

		for (const name of ["tools", "utils", "session", "cli", "capability", "config", "registry", "eval"]) {
			expect(rejected, `${name} is ruled no-cut but was classified a candidate`).toContain(name);
			expect(candidates).not.toContain(name);
		}
		for (const name of ["commit", "dap", "stream", "cleanse", "judgment"]) {
			expect(rejected, `${name} is ruled merge/no-cut but was classified a candidate`).toContain(name);
			expect(candidates).not.toContain(name);
		}
		// And the rulings must carry a reason specific enough to act on.
		for (const verdict of [...split.noCut, ...split.merge]) {
			expect(verdict.reason.length, `${verdict.module} has no usable reason`).toBeGreaterThan(10);
		}
	});

	it("keeps the §7 merge group out of the candidate list", async () => {
		const baseline = (await Bun.file(BASELINE).json()) as { modules: Record<string, number> };
		const measured = readBaseline(baseline);
		const split = classify(measured);
		// §7's whole claim is that cutting these does not serve the programme's goal.
		for (const name of ["commit", "commands", "dap", "stream", "security", "cleanse"]) {
			if (!measured.some(m => m.module === name)) continue;
			expect(split.candidates.map(v => v.module)).not.toContain(name);
			// The module is measured, so it must have been classified. `?.decision`
			// used to swallow that: an unclassified module arrived here as
			// `undefined` and was compared against the decision list rather than
			// reported as the miss it is. The sentinel cannot occur in the data, so
			// if it shows up in a failure it names the real problem — and it
			// narrows the type, which a bare `toBeDefined()` does not.
			const decision = split.merge.concat(split.noCut).find(v => v.module === name)?.decision;
			expect(["merge", "no-cut"]).toContain(decision ?? "<not classified>");
		}
	});
});
