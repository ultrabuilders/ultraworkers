import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { BASELINE_PATH_FOR_TEST, NO_CUT_MODULES, classify, overlapOf, readBaseline } from "./split-grp-c";

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
