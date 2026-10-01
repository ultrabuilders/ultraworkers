#!/usr/bin/env bun
/**
 * Failure breakdown for the coding-agent suite, attributed PER FILE.
 *
 * WHY BATCHED: `bun test packages/coding-agent/test/` as ONE invocation
 * segfaults on this machine — `panic(main thread): Segmentation fault at
 * address 0x5`, exit 133, after 51 lines and ZERO test results. That is the
 * runner dying, not a result. A control run (`acp-agent.test.ts` alone) proves
 * the toolchain and the natives addon are fine, so it is specific to the
 * 1653-file invocation. 40-file batches complete cleanly.
 *
 * WHY THE HEADER PARSER, AND WHY IT MATTERS: an earlier version of this script
 * keyed its output by BATCH and carried the per-file table only in the operator's
 * head — so the artifact it wrote could not reproduce the number it was built to
 * produce. That is the same shape as a docblock citing a test file that does not
 * exist: the report looks finished and cannot be re-derived.
 *
 * Bun prints `<path>.test.ts:` on its own line before each file's result block,
 * so attribution is a matter of tracking the most recent header. A `(fail)` line
 * is charged to that header. Lines with no header above them go to
 * `UNATTRIBUTED` rather than being guessed at, so the output cannot overstate
 * its own precision.
 *
 * Usage: bun scripts/jhz5-breakdown.ts <outDir> [batchSize]
 */
import { spawnSync } from "node:child_process";
import * as path from "node:path";

const outDir = process.argv[2] ?? "/tmp/jhz5";
const batchSize = Number(process.argv[3] ?? 40);

const FILE_HEADER = /^[A-Za-z0-9_./-]+\.test\.ts:$/;
const RESULT_LINE = /^\((pass|fail)\)\s*(.*?)\s*\[\d/;

const glob = new Bun.Glob("packages/coding-agent/test/**/*.test.ts");
const files: string[] = [];
for await (const f of glob.scan({ cwd: process.cwd(), dot: true })) files.push(f);
files.sort();

console.log(`files: ${files.length}  batch: ${batchSize}`);

interface Failure {
	readonly batch: number;
	readonly file: string;
	readonly name: string;
}

const failures: Failure[] = [];
const unattributed: Failure[] = [];
const crashedBatches: number[] = [];

for (let i = 0; i < files.length; i += batchSize) {
	const batch = files.slice(i, i + batchSize);
	const logPath = path.join(outDir, `batch-${String(i).padStart(4, "0")}.log`);
	const res = spawnSync("bun", ["test", ...batch], {
		encoding: "utf8",
		maxBuffer: 512 * 1024 * 1024,
	});
	const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
	await Bun.write(logPath, out);

	if (res.status === null || res.status === 133 || /has crashed/.test(out)) {
		crashedBatches.push(i);
		console.log(`  CRASH batch ${i} (status=${res.status}) — see ${logPath}`);
		continue;
	}

	let current: string | null = null;
	for (const line of out.split("\n")) {
		if (FILE_HEADER.test(line)) {
			current = line.slice(0, -1);
			continue;
		}
		const m = RESULT_LINE.exec(line);
		if (!m || m[1] !== "fail") continue;
		const entry: Failure = { batch: i, file: current ?? "UNATTRIBUTED", name: m[2] };
		if (current === null) unattributed.push(entry);
		else failures.push(entry);
	}
	console.log(`  batch ${String(i).padStart(4, "0")}: done`);
}

/** Failing tests per file, sorted by count then name. */
const byFile = new Map<string, string[]>();
for (const f of failures) {
	const list = byFile.get(f.file) ?? [];
	list.push(f.name);
	byFile.set(f.file, list);
}
const perFile = [...byFile.entries()]
	.map(([file, names]) => ({ file, count: names.length, tests: names.sort() }))
	.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

/** Leading describe-block per failing test, which is the useful grouping. */
const byGroup = new Map<string, number>();
for (const f of failures) {
	const group = f.name.split(" > ")[0];
	byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
}
const groups = [...byGroup.entries()]
	.map(([name, count]) => ({ name, count }))
	.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const summary = {
	sha: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
	filesScanned: files.length,
	batchSize,
	batchesRun: Math.ceil(files.length / batchSize),
	crashedBatches,
	totalFailing: failures.length + unattributed.length,
	attributedFailing: failures.length,
	unattributedFailing: unattributed.length,
	filesWithFailures: perFile.length,
	byGroup: groups,
	byFile: perFile,
	unattributed: unattributed.map(f => f.name),
};

await Bun.write(path.join(outDir, "breakdown.json"), JSON.stringify(summary, null, 2));

console.log(`\nsha ${summary.sha}`);
console.log(`files scanned : ${summary.filesScanned} in ${summary.batchesRun} batches`);
console.log(`crashed batches: ${crashedBatches.length}`);
console.log(
	`total failing  : ${summary.totalFailing} (attributed ${summary.attributedFailing}, unattributed ${summary.unattributedFailing})`,
);
console.log(`files with failures: ${summary.filesWithFailures}\n`);
for (const g of groups) console.log(`  ${String(g.count).padStart(3)}  ${g.name}`);
if (unattributed.length) {
	console.log(`\nUNATTRIBUTED (no file header above them) — ${unattributed.length}:`);
	for (const n of unattributed.slice(0, 10)) console.log(`  - ${n.name}`);
}
