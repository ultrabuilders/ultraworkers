import { describe, expect, it } from "bun:test";
import {
	DEFAULT_SPAWN_THRESHOLD,
	evaluateSpawnGate,
	findMissingPlanFields,
} from "@oh-my-pi/pi-coding-agent/task/spawn-gate";

// Contract: a fan-out large enough to be worth planning must carry a receipt, and
// the rejection must NAME the fields that are missing.
//
// The naming is the load-bearing half. The model is the only party that can fix
// this, and a message saying "incomplete plan" costs a round trip per omitted
// field, while naming all of them costs one.
//
// This gate is about PLANNING, not throughput — `parallel.ts` and `workpool.ts`
// cap how many run at once. Those are two different layers and this must not be
// confused with them.

const COMPLETE = { goal: "ship it", steps: "do the thing", verification: "tests pass" };

describe("evaluateSpawnGate", () => {
	it("does not require a receipt at or below the threshold", () => {
		// The no-op guarantee. An added skill must not change the shape of ordinary
		// calls, so below the threshold the receipt is not even asked for.
		for (const count of [0, 1, DEFAULT_SPAWN_THRESHOLD]) {
			const receipt = evaluateSpawnGate(count);
			expect({ count, ok: receipt.ok, missing: receipt.missing }).toEqual({ count, ok: true, missing: [] });
		}
	});

	it("rejects a fan-out over the threshold with no plan at all", () => {
		const receipt = evaluateSpawnGate(DEFAULT_SPAWN_THRESHOLD + 1);
		expect(receipt.ok).toBe(false);
		expect(receipt.missing).toEqual(["goal", "steps", "verification"]);
	});

	it("names every missing field, not merely that the plan is incomplete", () => {
		const receipt = evaluateSpawnGate(DEFAULT_SPAWN_THRESHOLD + 1, { goal: "g" } as Record<string, unknown>);
		expect(receipt.ok).toBe(false);
		expect(receipt.missing).toEqual(["steps", "verification"]);
		// The same names, in the same order, the caller puts in the error — so the
		// message and the predicate can never disagree.
		expect(findMissingPlanFields({ goal: "g" } as Record<string, unknown>)).toEqual(receipt.missing);
	});

	it("accepts a complete plan over the threshold", () => {
		const receipt = evaluateSpawnGate(DEFAULT_SPAWN_THRESHOLD + 1, COMPLETE);
		expect(receipt.ok).toBe(true);
		expect(receipt.missing).toEqual([]);
	});

	it("treats a blank field as absent", () => {
		// Otherwise a plan of three empty strings satisfies the gate and buys nothing.
		expect(evaluateSpawnGate(DEFAULT_SPAWN_THRESHOLD + 1, { ...COMPLETE, steps: "   " }).ok).toBe(false);
	});

	it("treats the threshold as a parameter, not a baked-in number", () => {
		// The threshold is a judgement of magnitude that wants measuring on a tree
		// that actually runs large fan-outs — this one runs four. Pinning that the
		// number is a PARAMETER means re-measuring it later is a constant change,
		// not a refactor, and stops the default from quietly becoming load-bearing.
		const plan = { goal: "g", steps: "s", verification: "v" };
		expect(evaluateSpawnGate(9, undefined, 12).ok).toBe(true); // 9 <= 12: no receipt needed at all
		expect(evaluateSpawnGate(9, plan, 12).ok).toBe(true);
		expect(evaluateSpawnGate(13, undefined, 12).ok).toBe(false); // above a higher bar
		expect(evaluateSpawnGate(13, plan, 12).ok).toBe(true);
	});
});
