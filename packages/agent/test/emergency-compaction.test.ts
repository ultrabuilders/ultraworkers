import { describe, expect, it } from "bun:test";
import {
	type CompactionSettings,
	type EmergencyCompactionSample,
	firstExceededEmergencyLimit,
	resolveEmergencyCompactionLimits,
	shouldCompact,
} from "@oh-my-pi/pi-agent-core/compaction/compaction";

// Contract: a resource floor can trigger compaction even when the token threshold
// says "no".
//
// Every floor here is a NON-token metric — resident heap, serialized context
// bytes, message count, transcript size. Token-based compaction cannot see any of
// them: a session can sit comfortably under its token threshold while holding
// hundreds of MiB of heap. That gap is why the floors exist.
//
// The part that must not regress: with no floor crossed, and no sample supplied,
// the decision is exactly what it was before. These are floors, not a new default.

const KEEP = 20_000;
const SETTINGS: CompactionSettings = { enabled: true, strategy: "context-full", keepRecentTokens: KEEP };
const settings = (over: Partial<CompactionSettings>): CompactionSettings => ({ ...SETTINGS, ...over });

/** A sample comfortably under every floor — the "nothing is wrong" baseline. */
function healthy(overrides: Partial<EmergencyCompactionSample> = {}): EmergencyCompactionSample {
	return { heapUsedBytes: 8 * 1024 * 1024, providerBytes: 1024, messageCount: 10, imageBytes: 0, ...overrides };
}

describe("resolveEmergencyCompactionLimits", () => {
	it("keeps the heap floor when total memory reads as nothing usable", () => {
		// The hard condition. A floor disabled by a broken `totalmem()` is worse than
		// no floor at all, because the reason for the floor is that the token
		// threshold was not going to fire.
		for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			const limits = resolveEmergencyCompactionLimits(bad);
			expect({ total: bad, heapFloorPresent: limits.heapUsedBytes > 0 }).toEqual({
				total: bad,
				heapFloorPresent: true,
			});
		}
	});

	it("scales the heap floor down on a small machine and caps it on a large one", () => {
		expect(resolveEmergencyCompactionLimits(1024 ** 3).heapUsedBytes).toBe(512 * 1024 * 1024);
		expect(resolveEmergencyCompactionLimits(256 * 1024 ** 3).heapUsedBytes).toBe(1536 * 1024 * 1024);
	});
});

describe("firstExceededEmergencyLimit", () => {
	it("returns nothing when the sample is under every floor", () => {
		expect(firstExceededEmergencyLimit(healthy())).toBeUndefined();
	});

	it("names the floor that was crossed, in urgency order", () => {
		// Ordering is the contract: a sample past several floors must report the one
		// that means the most, so the log line says something actionable.
		const limits = resolveEmergencyCompactionLimits();
		const all = healthy({
			heapUsedBytes: limits.heapUsedBytes,
			providerBytes: limits.providerBytes,
			messageCount: limits.messageCount,
		});
		expect(firstExceededEmergencyLimit(all)).toBe("heap");
		expect(
			firstExceededEmergencyLimit(
				healthy({ providerBytes: limits.providerBytes, messageCount: limits.messageCount }),
			),
		).toBe("providerBytes");
		expect(firstExceededEmergencyLimit(healthy({ messageCount: limits.messageCount }))).toBe("messageCount");
	});

	it("counts only the transcript size when the backend knows it", () => {
		// A backend that cannot report transcript size must not be treated as having
		// a zero-byte transcript, or every call would look like it crossed the floor.
		const limits = resolveEmergencyCompactionLimits();
		expect(firstExceededEmergencyLimit(healthy({ transcriptFileBytes: 0 }))).toBeUndefined();
		expect(firstExceededEmergencyLimit(healthy({ transcriptFileBytes: limits.transcriptFileBytes! }))).toBe(
			"transcriptFile",
		);
	});

	it("sums retained bytes across both caches before judging the floor", () => {
		const limits = resolveEmergencyCompactionLimits();
		const half = Math.floor(limits.retainedMemoryBytes! / 2) + 1;
		expect(firstExceededEmergencyLimit(healthy({ materializedResidentBytes: half }))).toBeUndefined();
		expect(
			firstExceededEmergencyLimit(healthy({ materializedResidentBytes: half, tuiCachedRenderBytes: half })),
		).toBe("retainedMemory");
	});
});

describe("shouldCompact", () => {
	it("compacts on a resource floor even when the token threshold says no", () => {
		// The whole point. A million tokens on a ten-million window is comfortably
		// under the threshold; the heap floor is what actually matters here.
		const limits = resolveEmergencyCompactionLimits();
		expect(shouldCompact(1_000_000, 10_000_000, SETTINGS, healthy())).toBe(false);
		expect(shouldCompact(1_000_000, 10_000_000, SETTINGS, healthy({ heapUsedBytes: limits.heapUsedBytes }))).toBe(
			true,
		);
	});

	it("behaves exactly as before when no sample is supplied", () => {
		// Byte-for-byte the pre-existing contract: three callers pass three arguments
		// and get the answer they always got. A resource floor must never quietly
		// become a new default threshold.
		expect(shouldCompact(900_000, 1_000_000, SETTINGS)).toBe(true);
		expect(shouldCompact(100_000, 1_000_000, SETTINGS)).toBe(false);
		expect(shouldCompact(100_000, 1_000_000, settings({ enabled: false }))).toBe(false);
		expect(shouldCompact(100_000, 0, SETTINGS)).toBe(false);
	});

	it("still respects the user's opt-out before consulting a floor", () => {
		// `strategy: "off"` is the user saying never. A floor is a safety net, not a
		// licence to override an explicit setting.
		const limits = resolveEmergencyCompactionLimits();
		const exploded = healthy({ heapUsedBytes: limits.heapUsedBytes });
		expect(shouldCompact(1, 1_000_000, settings({ strategy: "off" }), exploded)).toBe(false);
		expect(shouldCompact(1, 1_000_000, settings({ enabled: false }), exploded)).toBe(false);
	});
});
