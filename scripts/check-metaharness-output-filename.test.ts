/**
 * The metaharness transcript-filename gate must go red when the producer and the
 * consumer disagree, and must go red — not green — when it can no longer see either
 * side. Both properties are asserted by making the gate actually fail, because the
 * failure this gate exists for is silent by construction: `probeTrialCost` returns
 * `null` on a missing file and both call sites fold that into `?? 0`, so a half-rename
 * costs realtime money and token counts while the rest of the suite stays green.
 *
 * The gate runs as a subprocess against a real directory tree rather than being
 * exercised through its internals: it resolves both source paths relative to the
 * working directory, so the only honest way to ask "would this have caught the real
 * rename" is to give it a tree shaped like the repository. The files are the real
 * ones, copied — a fixture that merely agreed with the gate would prove nothing.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";
import { findPairProblem, PRODUCER_PATH, CONSUMER_PATH } from "./check-metaharness-output-filename";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const GATE = path.join(import.meta.dir, "check-metaharness-output-filename.ts");

/** A tree containing the real producer and consumer, optionally with the producer renamed. */
async function seedTree(dir: string, renameProducerTo?: string): Promise<void> {
	for (const rel of [PRODUCER_PATH, CONSUMER_PATH]) {
		const dest = path.join(dir, rel);
		let source = await Bun.file(path.join(REPO_ROOT, rel)).text();
		if (rel === PRODUCER_PATH && renameProducerTo !== undefined) {
			source = source.replace(/_OUTPUT_FILENAME\s*=\s*"[^"]+"/, `_OUTPUT_FILENAME = "${renameProducerTo}"`);
		}
		await Bun.write(dest, source);
	}
}

/** Run the gate with `dir` as its working directory; resolve with its exit code and output. */
async function runGate(dir: string): Promise<{ code: number; out: string }> {
	const proc = Bun.spawn([process.execPath, GATE], { cwd: dir, stdout: "pipe", stderr: "pipe" });
	const [out, err, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { code, out: out + err };
}

describe("check-metaharness-output-filename", () => {
	test("the shipped tree is consistent", async () => {
		using dir = TempDir.createSync("metaharness-pair-ok");
		await seedTree(dir.path());
		const { code, out } = await runGate(dir.path());
		expect(out).toContain("omp.txt");
		expect(code).toBe(0);
	});

	// The control. A gate that only ever reports success cannot be distinguished from
	// a gate that never looks, so the half-rename this rule warns about is performed
	// on a copy and the gate is required to reject it.
	test("renaming only the producer is rejected", async () => {
		using dir = TempDir.createSync("metaharness-pair-drift");
		await seedTree(dir.path(), "ultraworkers.txt");
		const { code, out } = await runGate(dir.path());
		expect(code).toBe(1);
		expect(out).toContain("drifted");
	});

	test("renaming only the consumer is rejected", async () => {
		using dir = TempDir.createSync("metaharness-pair-drift-consumer");
		await seedTree(dir.path());
		const consumer = await Bun.file(path.join(dir.path(), CONSUMER_PATH)).text();
		await Bun.write(
			path.join(dir.path(), CONSUMER_PATH),
			consumer.replaceAll('"agent", "omp.txt"', '"agent", "ultraworkers.txt"'),
		);
		const { code } = await runGate(dir.path());
		expect(code).toBe(1);
	});

	// A pattern that stops matching returns nothing. Treating that as "no problem" would
	// turn the gate green on exactly the restructure it exists to survive.
	test("a producer whose assignment is renamed away fails instead of passing", async () => {
		using dir = TempDir.createSync("metaharness-pair-blind-producer");
		await seedTree(dir.path());
		const producer = await Bun.file(path.join(dir.path(), PRODUCER_PATH)).text();
		await Bun.write(
			path.join(dir.path(), PRODUCER_PATH),
			producer.replace(/_OUTPUT_FILENAME\s*=\s*"[^"]+"/, "_OUTPUT_FILENAME = Path(__file__).name"),
		);
		const { code, out } = await runGate(dir.path());
		expect(code).toBe(1);
		expect(out).toContain("can no longer see the producer");
	});

	test("a consumer with no probe site left fails instead of passing", async () => {
		using dir = TempDir.createSync("metaharness-pair-blind-consumer");
		await seedTree(dir.path());
		const consumer = await Bun.file(path.join(dir.path(), CONSUMER_PATH)).text();
		await Bun.write(path.join(dir.path(), CONSUMER_PATH), consumer.replaceAll('"agent", "omp.txt"', '"agent", name'));
		const { code, out } = await runGate(dir.path());
		expect(code).toBe(1);
		expect(out).toContain("can no longer see the consumer");
	});

	// The comparison itself, independent of the filesystem: a wider consumer set that
	// still agrees is not drift, so adding a third probe of the same file stays green.
	test("agreement is judged per name, not per site count", () => {
		const producer = '_OUTPUT_FILENAME = "omp.txt"\n';
		const twoSites = 'path.join(dir, "agent", "omp.txt");\npath.join(dir, "agent", "omp.txt");\n';
		expect(findPairProblem(producer, twoSites)).toBeNull();
		expect(findPairProblem(producer, `${twoSites}path.join(dir, "agent", "omp.txt");\n`)).toBeNull();
		expect(findPairProblem(producer, `${twoSites}path.join(dir, "agent", "other.txt");\n`)?.kind).toBe("mismatch");
	});
});
