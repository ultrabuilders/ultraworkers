import { describe, expect, it } from "bun:test";
import {
	seedStorageBenchmark,
	seedStorageWriteBenchmark,
	STORAGE_READ_BENCHMARKS,
	STORAGE_WRITE_BENCHMARKS,
} from "@oh-my-pi/pi-durable/testing";
import { MemoryStorage } from "../src/storage/memory";

/**
 * Covers `src/testing/storage-benchmark.ts`, which was ported with no test exercising it.
 *
 * The module is the fixture half of `pi`'s `storage.bench.ts`: it seeds a store and declares
 * one `run`/`expected` pair per read path and per write path. The benchmark runner itself is
 * not ported — it needs a timing library this tree does not depend on — so nothing else in
 * the repo calls any of this, and a seeding or indexing mistake here would stay invisible until
 * someone added the runner and read wrong numbers off it.
 *
 * So the contract asserted is the oracle pair itself: every benchmark, run against a freshly
 * seeded `MemoryStorage`, must return exactly what its own `expected` says. That is the same
 * check the runner performs per iteration, and it is what makes the declared expectations
 * trustworthy rather than decorative — a benchmark whose `expected` drifted from what the
 * storage actually returns would silently turn the benchmark into a measurement of nothing.
 *
 * These are correctness assertions on a shared fixture, not timing assertions: nothing here
 * measures duration, so the suite stays fast and non-flaky.
 */
describe("storage benchmark fixtures", () => {
	for (const benchmark of STORAGE_READ_BENCHMARKS) {
		it(`seeds a store where "${benchmark.name}" returns its declared result`, async () => {
			const storage = new MemoryStorage();
			const dataset = await seedStorageBenchmark(storage);
			expect(await benchmark.run(storage, dataset)).toBe(benchmark.expected(dataset));
		});
	}

	for (const benchmark of STORAGE_WRITE_BENCHMARKS) {
		it(`seeds a store where "${benchmark.name}" writes its declared count`, async () => {
			const storage = new MemoryStorage();
			await seedStorageWriteBenchmark(storage);
			expect(await benchmark.run(storage)).toBe(benchmark.expected);
		});
	}

	it("gives every read benchmark its own declared name, so no two rows are the same check", async () => {
		// Deliberately NOT a distinctness check on the RESULT. Three pairs legitimately return
		// the same number because they exercise different paths at the same cardinality:
		// `entry page scan (100)` and `fork-depth history scan (100)` both take 100,
		// `document replay tail (128)` and `ancient historical read before newer base` both
		// yield 128, and the two head lookups both resolve to entry 2. Equal results do not
		// mean one path stood in for another — the name is what identifies the row, and the
		// per-row test above runs each one's own `run`.
		//
		// What must hold is that the names are distinct, because the runner reports by name: a
		// duplicate would merge two rows in the output and hide one from the results entirely.
		const names = STORAGE_READ_BENCHMARKS.map(benchmark => benchmark.name);
		expect(new Set(names).size).toBe(names.length);
		expect(names.every(name => name.length > 0)).toBe(true);
	});
});
