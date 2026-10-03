/**
 * Storage memory and disk footprint, per backend, per scale.
 *
 * Run from packages/durable:
 *   bun --conditions=source test/storage-memory.ts
 *
 * Each (backend, scale) pair is measured in its OWN process. That is the whole design and it is
 * not incidental: `baseline` is a heap reading taken before any store exists, so the same
 * process cannot measure two runs without the first one's garbage inflating the second's
 * baseline. The driver therefore spawns a worker per pair and reads one JSON line back.
 *
 * `pi` runs this file under `node --expose-gc`. The Bun equivalents used here were each checked
 * rather than assumed:
 *   - `bun --expose-gc` does define `globalThis.gc`.
 *   - `bun:sqlite` exports `Database`, not `DatabaseSync`, and spells the flag `readonly`.
 *     `node:sqlite`'s `readOnly` is rejected with "Misspelled option" — so this is a rename,
 *     not a passthrough.
 *   - Bun runs `.ts` directly, so the worker's `--experimental-strip-types` is dropped.
 */
import { Database } from "bun:sqlite";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { BACKGROUND_CONTEXT } from "@oh-my-pi/chord/context";
import {
	seedStorageBenchmark,
	storageBenchmarkPrimaryRecordCount,
	STORAGE_MEMORY_SCALES,
	STORAGE_READ_BENCHMARKS,
	type StorageBenchmarkScale,
} from "@ultraworkers/pi-durable/testing";
import { openNodeJsonlStorage } from "../src/storage/jsonl/node";
import { MemoryStorage } from "../src/storage/memory";
import { openNodeSqliteStorage } from "../src/storage/sqlite/node";
import type { Storage } from "../src/types";

const STORAGE_BENCHMARK_BACKENDS = ["memory", "sqlite", "jsonl"] as const;
type StorageBenchmarkBackend = (typeof STORAGE_BENCHMARK_BACKENDS)[number];

type MemorySnapshot = {
	readonly heapUsed: number;
	readonly rss: number;
	readonly external: number;
};

type DiskFootprint =
	| {
			readonly kind: "sqlite";
			readonly mainBytes: number;
			readonly auxiliaryBytes: number;
			readonly fileCount: number;
			readonly pageCount: number;
			readonly freelistCount: number;
	  }
	| {
			readonly kind: "jsonl";
			readonly mainBytes: number;
			readonly auxiliaryBytes: number;
			readonly fileCount: number;
			readonly documentFiles: number;
			readonly taskFiles: number;
	  };

type StorageMemoryResult = {
	readonly backend: StorageBenchmarkBackend;
	readonly scale: string;
	readonly recordCount: number;
	readonly baseline: MemorySnapshot;
	readonly postSeed: MemorySnapshot;
	readonly postRead: MemorySnapshot;
	readonly disk?: DiskFootprint;
};

function collectGarbage(): void {
	if (globalThis.gc === undefined) throw new Error("Storage memory measurement requires `bun --expose-gc`");
	for (let index = 0; index < 3; index++) globalThis.gc();
}

function snapshot(): MemorySnapshot {
	const usage = process.memoryUsage();
	return { heapUsed: usage.heapUsed, rss: usage.rss, external: usage.external };
}

async function fileSize(filePath: string): Promise<number> {
	try {
		return (await stat(filePath)).size;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
		throw error;
	}
}

function sqliteMetrics(filePath: string): Extract<DiskFootprint, { readonly kind: "sqlite" }> {
	const database = new Database(filePath, { readonly: true });
	try {
		const pageCount = database.prepare("SELECT page_count AS value FROM pragma_page_count()").get() as {
			readonly value: number;
		};
		const freelistCount = database.prepare("SELECT freelist_count AS value FROM pragma_freelist_count()").get() as {
			readonly value: number;
		};
		return {
			kind: "sqlite",
			mainBytes: 0,
			auxiliaryBytes: 0,
			fileCount: 0,
			pageCount: pageCount.value,
			freelistCount: freelistCount.value,
		};
	} finally {
		database.close();
	}
}

async function jsonlMetrics(directory: string): Promise<Extract<DiskFootprint, { readonly kind: "jsonl" }>> {
	const entries = await readdir(directory, { withFileTypes: true });
	let mainBytes = 0;
	let auxiliaryBytes = 0;
	let fileCount = 0;
	let documentFiles = 0;
	let taskFiles = 0;
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const bytes = await fileSize(path.join(directory, entry.name));
		fileCount++;
		if (entry.name === "main.jsonl") mainBytes += bytes;
		else auxiliaryBytes += bytes;
		if (entry.name.startsWith("doc-") && entry.name.endsWith(".jsonl")) documentFiles++;
		if (entry.name.startsWith("task-") && entry.name.endsWith(".jsonl")) taskFiles++;
	}
	return { kind: "jsonl", mainBytes, auxiliaryBytes, fileCount, documentFiles, taskFiles };
}

async function runWorker(backend: StorageBenchmarkBackend, scale: StorageBenchmarkScale): Promise<void> {
	let storage: Storage;
	let directory: string | undefined;
	let storagePath: string | undefined;
	if (backend === "memory") {
		storage = new MemoryStorage();
	} else {
		directory = await mkdtemp(path.join(tmpdir(), `pi-durable-${backend}-memory-`));
		storagePath = path.join(directory, backend === "sqlite" ? "storage.sqlite" : "storage");
		storage =
			backend === "sqlite"
				? await openNodeSqliteStorage(storagePath)
				: await openNodeJsonlStorage(storagePath, BACKGROUND_CONTEXT);
	}

	try {
		collectGarbage();
		const baseline = snapshot();
		const dataset = await seedStorageBenchmark(storage, scale);
		collectGarbage();
		const postSeed = snapshot();
		let checksum = 0;
		for (const scenario of STORAGE_READ_BENCHMARKS) {
			const result = await scenario.run(storage, dataset);
			if (result !== scenario.expected(dataset)) throw new Error(`Invalid benchmark result: ${scenario.name}`);
			checksum += result;
		}
		// Repeat so the heap reading reflects a warm store rather than the first pass's garbage.
		for (let round = 1; round < 10; round++) {
			for (const scenario of STORAGE_READ_BENCHMARKS) checksum += await scenario.run(storage, dataset);
		}
		if (!Number.isFinite(checksum)) throw new Error("Storage memory read checksum is invalid");
		collectGarbage();
		const postRead = snapshot();
		let disk: DiskFootprint | undefined;
		if (storagePath !== undefined && backend === "sqlite") {
			disk = {
				...sqliteMetrics(storagePath),
				mainBytes: await fileSize(storagePath),
				auxiliaryBytes: (await fileSize(`${storagePath}-wal`)) + (await fileSize(`${storagePath}-shm`)),
				fileCount: 3,
			};
		} else if (storagePath !== undefined) {
			disk = await jsonlMetrics(storagePath);
		}
		const recordCount = storageBenchmarkPrimaryRecordCount(scale);
		console.log(JSON.stringify({ backend, scale: scale.name, recordCount, baseline, postSeed, postRead, disk }));
	} finally {
		await storage.close(BACKGROUND_CONTEXT);
		if (directory !== undefined) await rm(directory, { recursive: true, force: true });
	}
}

function delta(after: MemorySnapshot, before: MemorySnapshot, field: keyof MemorySnapshot): number {
	return after[field] - before[field];
}

function mebibytes(bytes: number): string {
	return (bytes / 1024 / 1024).toFixed(2);
}

async function runWorkerProcess(backend: StorageBenchmarkBackend, scale: StorageBenchmarkScale): Promise<string> {
	const child = Bun.spawn([process.execPath, "--expose-gc", import.meta.path, "--worker", backend, scale.name], {
		cwd: path.resolve(import.meta.dir, ".."),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exitCode !== 0) throw new Error(`storage-memory worker failed (${exitCode}):\n${stderr}`);
	return stdout;
}

async function runDriver(): Promise<void> {
	const results: StorageMemoryResult[] = [];
	for (const backend of STORAGE_BENCHMARK_BACKENDS) {
		for (const scale of STORAGE_MEMORY_SCALES) {
			results.push(JSON.parse(await runWorkerProcess(backend, scale)) as StorageMemoryResult);
		}
	}

	console.log("Storage footprint after deterministic synthetic workloads; values are process deltas, not limits.");
	console.table(
		results.map(result => ({
			backend: result.backend,
			scale: result.scale,
			"heap after seed MiB": mebibytes(delta(result.postSeed, result.baseline, "heapUsed")),
			"RSS after seed MiB": mebibytes(delta(result.postSeed, result.baseline, "rss")),
			"external after seed MiB": mebibytes(delta(result.postSeed, result.baseline, "external")),
			"heap after reads MiB": mebibytes(delta(result.postRead, result.postSeed, "heapUsed")),
			"JS heap bytes/primary record": Math.round(
				delta(result.postSeed, result.baseline, "heapUsed") / result.recordCount,
			),
			"disk main MiB": result.disk === undefined ? "-" : mebibytes(result.disk.mainBytes),
			"disk auxiliary MiB": result.disk === undefined ? "-" : mebibytes(result.disk.auxiliaryBytes),
			"disk total MiB":
				result.disk === undefined ? "-" : mebibytes(result.disk.mainBytes + result.disk.auxiliaryBytes),
			"disk files": result.disk?.fileCount ?? "-",
			"disk detail":
				result.disk === undefined
					? "-"
					: result.disk.kind === "sqlite"
						? `pages/free ${result.disk.pageCount}/${result.disk.freelistCount}`
						: `documents/tasks ${result.disk.documentFiles}/${result.disk.taskFiles}`,
		})),
	);
}

const [mode, backendName, scaleName] = process.argv.slice(2);
if (mode === "--worker") {
	const backend = STORAGE_BENCHMARK_BACKENDS.find(candidate => candidate === backendName);
	if (backend === undefined) throw new Error(`Unknown storage benchmark backend: ${backendName}`);
	const scale = STORAGE_MEMORY_SCALES.find(candidate => candidate.name === scaleName);
	if (scale === undefined) throw new Error(`Unknown storage benchmark scale: ${scaleName}`);
	await runWorker(backend, scale);
} else {
	await runDriver();
}
