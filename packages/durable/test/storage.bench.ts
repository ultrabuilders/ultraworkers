/**
 * Storage benchmarks: read, write, and reopen-and-first-read, across all three backends.
 *
 * Run with `bun test --test-only --test-name-pattern '' test/storage.bench.ts`, or directly:
 *   bun --conditions=source test/storage.bench.ts
 *
 * `pi` drives this file with `bench`/`describe`/`afterAll` from `vitest`. `bun:test` exports
 * none of those three (`bench` was checked, not assumed — it is genuinely absent from `bun:test`
 * in Bun 1.4.2), so the harness is the ~30 lines below. It keeps vitest's option shape, which is
 * what the call sites below are written against: `time` is a wall-clock budget in ms and
 * `iterations` a count, and a run uses whichever is positive. Every scenario here sets one or
 * the other, never both, which is why honouring `iterations` alone would have been enough —
 * honouring both costs three lines and removes the assumption.
 *
 * The correctness loop this file also runs is NOT redundant with `storage-benchmark.test.ts`:
 * that test asserts the fixture module against itself, in isolation, and never constructs a
 * backend. This file is what proves the three backends answer the same declared result, which is
 * the claim the timings are only meaningful on top of.
 */
import { copyFile, cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strictEqual } from "node:assert/strict";
import { BACKGROUND_CONTEXT } from "@oh-my-pi/chord/context";
import {
	seedStorageBenchmark,
	seedStorageWriteBenchmark,
	STORAGE_READ_BENCHMARKS,
	STORAGE_WRITE_BENCHMARKS,
} from "@ultraworkers/pi-durable/testing";
import { openNodeJsonlStorage } from "../src/storage/jsonl/node";
import { MemoryStorage } from "../src/storage/memory";
import { openNodeSqliteStorage } from "../src/storage/sqlite/node";
import type { EntryId, Storage } from "../src/types";

type BenchOptions = {
	readonly time: number;
	readonly iterations: number;
	readonly warmupTime: number;
	readonly warmupIterations: number;
};

type BenchFn = () => Promise<void>;

const results: { readonly group: string; readonly name: string; readonly opsPerSecond: number }[] = [];

/**
 * vitest's `bench(name, fn, options)`, reduced to what this file uses.
 *
 * Warmup runs first and is not measured — without it the first iteration pays for JIT and page
 * faults, and the three backends would be ranked by which one warmed up worst rather than by
 * which one is slower.
 */
async function bench(group: string, name: string, fn: BenchFn, options: BenchOptions): Promise<void> {
	for (let index = 0; index < options.warmupIterations; index++) await fn();
	const startedAt = Bun.nanoseconds();
	let iterations = 0;
	do {
		await fn();
		iterations++;
	} while (options.time > 0 ? (Bun.nanoseconds() - startedAt) / 1e6 < options.time : iterations < options.iterations);
	const elapsedSeconds = (Bun.nanoseconds() - startedAt) / 1e9;
	results.push({ group, name, opsPerSecond: elapsedSeconds > 0 ? iterations / elapsedSeconds : 0 });
}

const STORAGE_BENCHMARK_BACKENDS = ["memory", "sqlite", "jsonl"] as const;
type StorageBenchmarkBackend = (typeof STORAGE_BENCHMARK_BACKENDS)[number];

const READ_OPTIONS: BenchOptions = { time: 300, iterations: 10, warmupTime: 75, warmupIterations: 3 };
const WRITE_OPTIONS: BenchOptions = { time: 0, iterations: 20, warmupTime: 0, warmupIterations: 5 };
const REOPEN_OPTIONS: BenchOptions = { time: 0, iterations: 20, warmupTime: 0, warmupIterations: 3 };

type Fixture = {
	readonly backend: StorageBenchmarkBackend;
	readonly storage: Storage;
};

const fixtures: Fixture[] = [];
const directories: string[] = [];

async function createFixture(backend: StorageBenchmarkBackend): Promise<Fixture> {
	if (backend === "memory") {
		const fixture = { backend, storage: new MemoryStorage() } satisfies Fixture;
		fixtures.push(fixture);
		return fixture;
	}
	const directory = await mkdtemp(join(tmpdir(), "pi-durable-benchmark-"));
	directories.push(directory);
	if (backend === "sqlite") {
		const fixture = {
			backend,
			storage: await openNodeSqliteStorage(join(directory, "storage.sqlite")),
		} satisfies Fixture;
		fixtures.push(fixture);
		return fixture;
	}
	const fixture = {
		backend,
		storage: await openNodeJsonlStorage(join(directory, "storage"), BACKGROUND_CONTEXT),
	} satisfies Fixture;
	fixtures.push(fixture);
	return fixture;
}

// --- reads: every backend must answer the scenario's declared result before it is timed ---
const readFixtures = await Promise.all(STORAGE_BENCHMARK_BACKENDS.map(createFixture));
const readDatasets = await Promise.all(readFixtures.map(({ storage }) => seedStorageBenchmark(storage)));
for (let index = 0; index < readFixtures.length; index++) {
	for (const scenario of STORAGE_READ_BENCHMARKS) {
		strictEqual(
			await scenario.run(readFixtures[index]!.storage, readDatasets[index]!),
			scenario.expected(readDatasets[index]!),
		);
	}
}
for (const scenario of STORAGE_READ_BENCHMARKS) {
	for (const fixture of readFixtures) {
		const dataset = readDatasets[readFixtures.indexOf(fixture)]!;
		await bench(
			scenario.name,
			fixture.backend,
			async () => {
				await scenario.run(fixture.storage, dataset);
			},
			READ_OPTIONS,
		);
	}
}

// --- writes: each iteration consumes a fresh store, so a pool is drained instead of reused ---
async function createWriteFixture(backend: StorageBenchmarkBackend): Promise<Fixture> {
	const fixture = await createFixture(backend);
	await seedStorageWriteBenchmark(fixture.storage);
	return fixture;
}

const writePools = new Map<string, Fixture[]>();
for (const scenario of STORAGE_WRITE_BENCHMARKS) {
	for (const backend of STORAGE_BENCHMARK_BACKENDS) {
		const validation = await createWriteFixture(backend);
		strictEqual(await scenario.run(validation.storage), scenario.expected);
		writePools.set(
			`${scenario.name}:${backend}`,
			await Promise.all(
				Array.from({ length: WRITE_OPTIONS.iterations + WRITE_OPTIONS.warmupIterations }, () =>
					createWriteFixture(backend),
				),
			),
		);
	}
	for (const backend of STORAGE_BENCHMARK_BACKENDS) {
		const pool = writePools.get(`${scenario.name}:${backend}`)!;
		await bench(
			scenario.name,
			backend,
			async () => {
				const fixture = pool.shift();
				if (fixture === undefined) throw new Error("Write benchmark fixture pool was exhausted");
				await scenario.run(fixture.storage);
			},
			WRITE_OPTIONS,
		);
	}
}

// --- reopen: open a fresh copy of a seeded store and read the first entry ---
type PersistentBackend = Exclude<StorageBenchmarkBackend, "memory">;
type ReopenFixture = {
	readonly backend: PersistentBackend;
	readonly path: string;
	readonly firstEntryId: EntryId;
	readonly samples: string[];
};

async function openPersistentStorage(backend: PersistentBackend, path: string): Promise<Storage> {
	return backend === "sqlite" ? openNodeSqliteStorage(path) : openNodeJsonlStorage(path, BACKGROUND_CONTEXT);
}

async function copyPersistentStorage(backend: PersistentBackend, source: string, destination: string): Promise<void> {
	if (backend === "sqlite") await copyFile(source, destination);
	else await cp(source, destination, { recursive: true });
}

const reopenFixtures: ReopenFixture[] = [];
for (const backend of STORAGE_BENCHMARK_BACKENDS) {
	if (backend === "memory") continue;
	const seedDirectory = await mkdtemp(join(tmpdir(), `pi-durable-${backend}-reopen-benchmark-`));
	directories.push(seedDirectory);
	const seedPath = join(seedDirectory, backend === "sqlite" ? "storage.sqlite" : "storage");
	const seed = await openPersistentStorage(backend, seedPath);
	const dataset = await seedStorageBenchmark(seed);
	await seed.close(BACKGROUND_CONTEXT);
	reopenFixtures.push({
		backend,
		path: seedPath,
		firstEntryId: dataset.firstEntryId,
		samples: await Promise.all(
			Array.from({ length: REOPEN_OPTIONS.iterations + REOPEN_OPTIONS.warmupIterations }, async () => {
				const directory = await mkdtemp(join(tmpdir(), `pi-durable-${backend}-reopen-sample-`));
				directories.push(directory);
				const path = join(directory, backend === "sqlite" ? "storage.sqlite" : "storage");
				await copyPersistentStorage(backend, seedPath, path);
				return path;
			}),
		),
	});
}

const reopenedStorages: Storage[] = [];
async function reopenAndRead(
	backend: PersistentBackend,
	path: string,
	firstEntryId: EntryId,
): Promise<{ readonly id: number; readonly storage: Storage }> {
	const storage = await openPersistentStorage(backend, path);
	const id = (await storage.entry(firstEntryId, BACKGROUND_CONTEXT))?.entry.id ?? -1;
	return { id, storage };
}

for (const fixture of reopenFixtures) {
	const validation = await reopenAndRead(fixture.backend, fixture.path, fixture.firstEntryId);
	strictEqual(validation.id, fixture.firstEntryId);
	await validation.storage.close(BACKGROUND_CONTEXT);
}
for (const fixture of reopenFixtures) {
	await bench(
		"reopen and first exact read",
		fixture.backend,
		async () => {
			const path = fixture.samples.shift();
			if (path === undefined) throw new Error("Reopen benchmark fixture pool was exhausted");
			reopenedStorages.push((await reopenAndRead(fixture.backend, path, fixture.firstEntryId)).storage);
		},
		REOPEN_OPTIONS,
	);
}

const width = Math.max(...results.map(result => result.name.length));
let group = "";
for (const result of results) {
	if (result.group !== group) {
		group = result.group;
		console.log(`\n${group}`);
	}
	console.log(`  ${result.name.padEnd(width)}  ${result.opsPerSecond.toFixed(0).padStart(10)} ops/sec`);
}

for (const storage of reopenedStorages) await storage.close(BACKGROUND_CONTEXT);
for (const fixture of fixtures) await fixture.storage.close(BACKGROUND_CONTEXT);
for (const directory of directories) await rm(directory, { recursive: true, force: true });
