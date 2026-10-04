/**
 * Benchmark: session-tree navigation context build (perf/sessiontree-dedupe-context-build)
 *
 * Measures the O(N) walk performed by buildSessionContext during navigateTree.
 * Demonstrates the dedupe win: one walk vs two walks per navigation.
 *
 * Run: bun packages/coding-agent/bench/session-tree-nav.bench.ts
 */

import type { SessionEntry } from "../src/session/session-entries";
import { buildSessionContext } from "../src/session/session-context";

// ─── Synthetic session ───────────────────────────────────────────────────────

const MSG_COUNT = 100;
const CODE_BLOCKS_PER_MSG = 5;

function makeId(i: number): string {
	return `entry-${i.toString().padStart(6, "0")}`;
}

function makeCodeBlock(idx: number): string {
	return `\`\`\`typescript\nconst x${idx} = ${idx};\nconsole.log(x${idx});\n\`\`\``;
}

function buildEntries(): SessionEntry[] {
	const entries: SessionEntry[] = [];
	const now = new Date();

	for (let i = 0; i < MSG_COUNT; i++) {
		const id = makeId(i);
		const parentId = i === 0 ? null : makeId(i - 1);
		const timestamp = new Date(now.getTime() + i * 1000).toISOString();
		// The entry's own `timestamp` is an ISO string; the message inside it carries
		// unix milliseconds. Same instant, two clocks — reusing one for both was the
		// type error this file had been hiding behind its broken import.
		const messageTimestamp = now.getTime() + i * 1000;

		const codeBlocks = Array.from({ length: CODE_BLOCKS_PER_MSG }, (_, k) =>
			makeCodeBlock(i * CODE_BLOCKS_PER_MSG + k),
		).join("\n\n");

		if (i % 2 === 0) {
			// User message
			entries.push({
				type: "message",
				id,
				parentId,
				timestamp,
				message: {
					role: "user",
					content: `User message ${i}: please analyze this code.\n\n${codeBlocks}`,
					timestamp: messageTimestamp,
				},
			} satisfies SessionEntry);
		} else {
			// Assistant message
			entries.push({
				type: "message",
				id,
				parentId,
				timestamp,
				message: {
					role: "assistant",
					api: "anthropic-messages",
					provider: "anthropic",
					model: "bench-model",
					content: [{ type: "text" as const, text: `Assistant reply ${i}:\n\n${codeBlocks}` }],
					usage: {
						input: 1,
						output: 1,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 2,
						cost: { total: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
					},
					stopReason: "stop",
					timestamp: messageTimestamp,
				},
			} satisfies SessionEntry);
		}
	}

	return entries;
}

// ─── Bench helpers ────────────────────────────────────────────────────────────

const WARMUP = 20;
const ITERATIONS = 200;
const TRIALS = 9;

/**
 * Both arms are normalised to a **single `buildSessionContext()` call**.
 *
 * This bench used to compare one call per iteration against two, which is twice
 * the work against half of it — so the "optimised" arm looked ~3x slower and the
 * summary line reported the dedupe fix as a 213% *reduction*. The number was
 * never a measurement of the dedupe; it was a measurement of the arithmetic.
 *
 * `min` is the headline statistic because a loaded machine can only ever make a
 * run slower, never faster: the fastest observed run is the one closest to the
 * code's own cost. The median and max are printed too, so a run whose spread is
 * wide says so instead of hiding it behind a single figure.
 */
function timePerCall(fn: () => void, callsPerIteration: number): number {
	for (let i = 0; i < WARMUP; i++) fn();
	const start = Bun.nanoseconds();
	for (let i = 0; i < ITERATIONS; i++) fn();
	return (Bun.nanoseconds() - start) / 1e6 / ITERATIONS / callsPerIteration;
}

function stats(samples: number[]): { min: number; med: number; max: number } {
	const sorted = [...samples].sort((a, b) => a - b);
	return { min: sorted[0]!, med: sorted[Math.floor(sorted.length / 2)]!, max: sorted.at(-1)! };
}

function report(label: string, s: { min: number; med: number; max: number }): void {
	const width = 16;
	console.log(
		`  ${label.padEnd(width)} min=${s.min.toFixed(4)}ms  med=${s.med.toFixed(4)}ms  max=${s.max.toFixed(4)}ms  (spread ${(s.max / s.min).toFixed(1)}x)`,
	);
}

// ─── Run ──────────────────────────────────────────────────────────────────────

const entries = buildEntries();
const leafId = makeId(MSG_COUNT - 1);

console.log(
	`\nBenchmark: session-tree-nav (${MSG_COUNT} messages, ${CODE_BLOCKS_PER_MSG} code blocks each, ${ITERATIONS} iterations x ${TRIALS} trials)\n`,
);
console.log("  Per buildSessionContext() call:\n");

const before: number[] = [];
const after: number[] = [];
for (let trial = 0; trial < TRIALS; trial++) {
	// Baseline: two O(N) walks (old behaviour — navigateTree + renderInitialMessages each called buildSessionContext)
	before.push(
		timePerCall(() => {
			buildSessionContext(entries, leafId);
			buildSessionContext(entries, leafId);
		}, 2),
	);
	// Optimized: one O(N) walk (new behaviour — navigateTree returns context, renderInitialMessages reuses it)
	after.push(
		timePerCall(() => {
			buildSessionContext(entries, leafId);
		}, 1),
	);
}

const b = stats(before);
const a = stats(after);
report("two walks  [BEFORE]", b);
report("one walk   [AFTER ]", a);

// The direction is stated, not assumed. A signed difference printed under the
// word "Saved" reads as a win even when it is a loss.
//
// And when the difference is smaller than the run-to-run spread, no direction is
// reported at all. Three consecutive runs on an idle-ish machine gave
// "1.5% more expensive", "16.1% cheaper" and "7.0% cheaper" for the same code —
// so a bare percentage here is a coin flip wearing a decimal point.
const deltaMs = b.min - a.min;
const noiseBand = b.max - b.min;
const pct = (deltaMs / b.min) * 100;
console.log();
if (Math.abs(deltaMs) < noiseBand) {
	console.log(
		`  Per call, the two arms are indistinguishable: the ${Math.abs(pct).toFixed(1)}% gap is smaller than the ${noiseBand.toFixed(4)}ms run-to-run spread of the BEFORE arm.`,
	);
} else {
	const direction = deltaMs > 0 ? "cheaper per call" : "more expensive per call";
	console.log(
		`  Per call, the AFTER arm is ${Math.abs(pct).toFixed(1)}% ${direction} (gap exceeds the run-to-run spread).`,
	);
}
console.log("  The dedupe halves the number of calls per navigation (2 -> 1), which is its actual effect.\n");
