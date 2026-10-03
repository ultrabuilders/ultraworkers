import { afterEach, describe, expect, test } from "bun:test";
import * as path from "node:path";
import { ptree, TempDir } from "@oh-my-pi/pi-utils";
import { PROBE_PREFIX } from "@oh-my-pi/pi-utils/probe";
import {
	chunkRunsTests,
	countProbeEntries,
	formatChunkManifest,
	formatDiscardedProbeWarning,
	selectAffected,
	selectShard,
} from "./ci-test-ts";

describe("test runner watchdog", () => {
	// Parent fake timers cannot drive the real watchdog inside the isolated runner process.
	test("kills a stalled chunk, reports failure, and continues the queue", async () => {
		using dir = TempDir.createSync("uw-test-runner-watchdog-");
		const started = dir.join("started");
		const completed = dir.join("completed");
		const continued = dir.join("continued");
		const stalledCommand = [
			process.execPath,
			"-e",
			`await Bun.write(${JSON.stringify(started)}, "started"); await Bun.sleep(60_000); await Bun.write(${JSON.stringify(completed)}, "completed");`,
		];
		const nextCommand = [process.execPath, "-e", `await Bun.write(${JSON.stringify(continued)}, "continued");`];
		const commands = [
			{ label: "stalled chunk", cwd: ".", command: stalledCommand },
			{ label: "following chunk", cwd: ".", command: nextCommand },
		];
		const result = await ptree.exec(
			[
				process.execPath,
				"-e",
				`import { runTestCommandsInParallel } from ${JSON.stringify(import.meta.resolve("./ci-test-ts.ts"))}; await runTestCommandsInParallel(${JSON.stringify(commands)}, 1);`,
			],
			{
				env: { ...Bun.env, ULTRAWORKERS_TEST_CHUNK_TIMEOUT: "1", NO_COLOR: "1" },
				timeout: 10_000,
				detached: true,
				allowNonZero: true,
			},
		);

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toContain("[watchdog]");
		expect(await Bun.file(started).exists()).toBe(true);
		expect(await Bun.file(completed).exists()).toBe(false);
		expect(await Bun.file(continued).text()).toBe("continued");
	}, 15_000);
});

describe("ULTRAWORKERS_TEST_SHARD", () => {
	test("shards partition every chunk exactly once, balanced to within one", () => {
		const chunks = Array.from({ length: 79 }, (_, i) => i);
		const shards = [1, 2, 3].map(i => selectShard(chunks, `${i}/3`));
		expect(shards.flat().sort((a, b) => a - b)).toEqual(chunks);
		const sizes = shards.map(s => s.length);
		expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
		expect(selectShard(chunks, "1/1")).toEqual(chunks);
		expect(selectShard(chunks, undefined)).toEqual(chunks);
	});

	test("rejects malformed specs instead of running an empty or partial shard", () => {
		for (const spec of ["0/2", "3/2", "1/0", "2", "a/b", "1/2/3"]) {
			expect(() => selectShard([1, 2, 3], spec)).toThrow("Invalid ULTRAWORKERS_TEST_SHARD");
		}
	});

	test("rejects a shard that selects no chunks", () => {
		expect(() => selectShard([1], "2/2")).toThrow("selects no chunks");
		expect(() => selectShard([], "1/1")).toThrow("selects no chunks");
	});
});

// The selector's env comes from the process, so these run the real entrypoint
// the way CI does: same argv, same `ULTRAWORKERS_TEST_SHARD`, same `--dry-run` that
// prints the chunk set instead of running it. A helper called with arguments
// would never touch the env path CI depends on.
const repoRoot = new URL("../", import.meta.url).pathname;

interface RunnerResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

// The commands the runner says it will run, in order. Parsed from the
// dry-run's `$ <argv>` lines — the exact set CI would execute.
function plannedCommands(stdout: string): string[] {
	return stdout
		.split("\n")
		.filter(line => line.startsWith("$ "))
		.map(line => line.slice(2).trim());
}

async function runRunner(mode: string, env: Record<string, string | undefined>): Promise<RunnerResult> {
	// The two selector inputs are cleared by default so the ambient shell
	// cannot leak a diff into a case that means "no diff": an inherited value
	// would make the runner narrow, and the assertion would be measuring the
	// caller's environment instead of the path under test.
	const childEnv: Record<string, string | undefined> = {
		...Bun.env,
		// Absent by default: an empty value is a *different* input to the
		// selector (a caller that had a base and found it blank), so the two
		// "no diff" shapes have to be set deliberately, not by omission.
		ULTRAWORKERS_TEST_AFFECTED: undefined,
		ULTRAWORKERS_TEST_DIFF_BASE: undefined,
		ULTRAWORKERS_TEST_CONCURRENCY: "",
		NO_COLOR: "1",
		...env,
	};
	const result = await ptree.exec([process.execPath, "scripts/ci-test-ts.ts", mode, "--dry-run"], {
		cwd: repoRoot,
		env: childEnv,
		timeout: 120_000,
		allowNonZero: true,
		stderr: "full",
	});
	// `exitCode` is `number | null`, and null means the child died on a signal
	// rather than exiting. Coercing it to 0 or -1 would let a killed runner read
	// as a clean pass in every `toBe(0)` below, so the anomaly is raised instead:
	// these tests assert on the exit status, and there is no status to assert.
	if (result.exitCode === null) {
		throw new Error(`ci-test-ts runner was killed by a signal.\n${result.stderr}`);
	}
	return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

// The chunks the runner chose, with the pool-width suffix stripped: the
// selection is what these tests assert, not the budget it runs them at.
function plannedChunks(stdout: string): string[] {
	return plannedCommands(stdout).map(cmd => cmd.replace(/ --parallel=\d+/, ""));
}

describe("ci-test-ts diff selection through the runner", () => {
	const savedAffected = Bun.env.ULTRAWORKERS_TEST_AFFECTED;
	const savedBase = Bun.env.ULTRAWORKERS_TEST_DIFF_BASE;

	afterEach(() => {
		if (savedAffected === undefined) delete Bun.env.ULTRAWORKERS_TEST_AFFECTED;
		else Bun.env.ULTRAWORKERS_TEST_AFFECTED = savedAffected;
		if (savedBase === undefined) delete Bun.env.ULTRAWORKERS_TEST_DIFF_BASE;
		else Bun.env.ULTRAWORKERS_TEST_DIFF_BASE = savedBase;
	});

	// A PR that only edits markdown selects no chunk. The job must still run
	// something named — a docs-only PR reporting green is indistinguishable
	// from a job that ran no tests at all.
	//
	// The fallback is EVERY chunk, not a smoke set. `selectAffected` fails
	// closed (fb77734ae8): when no changed file maps to a chunk it returns the
	// whole list rather than a subset, because running two `--version` probes
	// and reporting that as the test result is a smaller lie than running
	// everything and reporting the truth. This test used to assert the smoke
	// set; the branch it named no longer exists, so it now asserts the contract
	// that branch was standing in for.
	test("a diff that touches no test runs every chunk rather than nothing", async () => {
		const result = await runRunner("coding-agent-runtime", {
			ULTRAWORKERS_TEST_AFFECTED: "docs/readme.md\nAGENTS.md",
		});
		expect(result.exitCode).toBe(0);
		// Both files are reported as mapping to nothing, so the fallback is a
		// decision rather than an accident of the diff.
		expect(result.stdout).toContain("docs/readme.md -> (no test covers this)");
		expect(result.stdout).toContain("AGENTS.md -> (no test covers this)");
		expect(result.stdout).toContain("mode=diff");

		// Fail closed: everything the mode offers, so the selected count equals the
		// chunk count rather than a hand-picked subset.
		const shards = result.stdout.match(/of (\d+) chunks -> (\d+) selected/);
		expect(shards).not.toBeNull();
		expect(shards?.[2]).toBe(shards?.[1]);

		// And the thing that matters: real test commands, not just a version probe.
		const planned = plannedCommands(result.stdout);
		expect(planned.length).toBeGreaterThan(0);
		expect(planned.some(cmd => cmd.includes("bun test"))).toBe(true);
	}, 130_000);

	// The three shards of one diff partition the shard's chunks. Asserting the
	// union covers every chunk and the sets are pairwise disjoint catches both
	// directions of a silent regression — a chunk running twice, and a chunk
	// that never runs at all.
	//
	// "Exactly once" no longer holds under the fail-closed selector: a shard that
	// does not own the changed file falls back to its WHOLE shard rather than to
	// smoke, so a chunk can legitimately appear in more than one shard. What must
	// still hold is the half that matters — the owning shard narrows to the
	// changed file, and no shard reports having run nothing.
	test("the shard owning the changed file narrows, and no shard runs nothing", async () => {
		const affected = "packages/coding-agent/test/extension-stale-context.test.ts";
		const full = await runRunner("coding-agent-runtime", { ULTRAWORKERS_TEST_AFFECTED: affected });
		expect(full.exitCode).toBe(0);
		const expected = plannedCommands(full.stdout).filter(cmd => cmd.includes("extension-stale-context"));
		expect(expected.length).toBe(1);

		const shards = await Promise.all(
			["1/3", "2/3", "3/3"].map(shard =>
				runRunner("coding-agent-runtime", { ULTRAWORKERS_TEST_SHARD: shard, ULTRAWORKERS_TEST_AFFECTED: affected }),
			),
		);
		for (const shard of shards) {
			expect(shard.exitCode).toBe(0);
		}
		// Exactly one shard owns the changed file, and on that shard the
		// selection is that file's chunk — the narrowing that saves the work.
		const owning = shards.filter(shard =>
			plannedCommands(shard.stdout).some(cmd => cmd.includes("extension-stale-context")),
		);
		expect(owning.length).toBe(1);
		expect(plannedCommands(owning[0].stdout).filter(cmd => cmd.includes("extension-stale-context"))).toEqual(
			expected,
		);
		// The shards that do not own it fall back to everything they were given,
		// so each reports real work. A shard running nothing is the failure this
		// whole assertion exists to prevent.
		for (const shard of shards.filter(s => !owning.includes(s))) {
			expect(plannedCommands(shard.stdout).length).toBeGreaterThan(0);
		}
	}, 400_000);

	// Diff selection narrows; it never widens. With no diff *input at all* the
	// runner falls back to the working tree, which is the local path — so this
	// asserts the CI-shaped no-diff instead: a blank base, exactly what a push to
	// main sends. Turning the new path off must return today's behaviour exactly,
	// because a seam that cannot be turned off breaks current users.
	test("with no diff supplied the runner still runs every chunk", async () => {
		const withDiff = await runRunner("workspace", { ULTRAWORKERS_TEST_AFFECTED: "packages/utils/src/index.ts" });
		const withoutDiff = await runRunner("workspace", { ULTRAWORKERS_TEST_DIFF_BASE: "" });
		expect(withoutDiff.exitCode).toBe(0);
		expect(withoutDiff.stdout).toContain("mode=shard-only");
		expect(plannedChunks(withoutDiff.stdout).length).toBeGreaterThan(plannedChunks(withDiff.stdout).length);
	}, 130_000);

	// A push to main sets the base to an empty string, because there is no PR
	// to diff against. CI's checkout is clean, so falling through to the
	// working tree there reads "nothing changed" and narrows a push to the
	// suites that happened to be touched locally. Main must run everything.
	test("a blank diff base runs every chunk instead of reading the clean CI checkout", async () => {
		const pushedToMain = await runRunner("workspace", { ULTRAWORKERS_TEST_DIFF_BASE: "" });
		expect(pushedToMain.exitCode).toBe(0);
		expect(pushedToMain.stdout).toContain("no diff available");
		expect(pushedToMain.stdout).toContain("mode=shard-only");
		// The empty affected list is the "caller supplied nothing" shape, so the
		// two must agree chunk-for-chunk: both run everything.
		expect(plannedChunks(pushedToMain.stdout)).toEqual(
			plannedChunks((await runRunner("workspace", { ULTRAWORKERS_TEST_AFFECTED: "" })).stdout),
		);
	}, 130_000);

	// A base the runner cannot fetch must degrade to a full run, never to a
	// narrow one. This is the difference between a green job that ran
	// everything and a green job that ran nothing.
	test("an unfetchable diff base warns and runs every chunk", async () => {
		const result = await runRunner("workspace", {
			ULTRAWORKERS_TEST_DIFF_BASE: "0000000000000000000000000000000000000000",
		});
		expect(result.exitCode).toBe(0);
		expect(result.stderr).toContain("failed to fetch diff base");
		expect(result.stdout).toContain("mode=shard-only");
	}, 130_000);

	// The gate has to fire at the CI layer, not only under a unit test, or a
	// misconfigured matrix shard is invisible until it merges.
	//
	// The shard index is DERIVED, never written down. It used to be the literal
	// "9/9", which was a stand-in for "past the end" and quietly stopped being one:
	// each package added to a CI bucket raises the chunk count, and once it passed
	// 9, `9/9` became a real shard that runs and passes. The row then failed while
	// asserting that a valid shard fails — and the obvious repair, loosening the
	// assertion until it went green, would have deleted the protection the row
	// exists to provide.
	//
	// So the count comes from the runner's own report, and the spec is derived to sit
	// exactly one past the end. Adding a package moves the row with the tree
	// instead of silently changing what it means.
	//
	// Two shapes look equivalent and are not, and both were measured before this
	// row was written:
	//
	//   - `(n+1)/n` is rejected as `Invalid` before selection. That guard exists,
	//     but a CI matrix with one shard too many still hands the runner a
	//     syntactically VALID spec, so testing `Invalid` proves nothing about the
	//     failure this row is for.
	//   - `n/n` is a perfectly good shard — it selects the last chunk.
	//   - `n/(n+1)` still selects chunk 0, so it passes.
	//   - `(n+1)/(n+1)` is the only one that clears the range check and then finds
	//     nothing, which is the `selects no chunks` guard.
	//
	// The mode matters too: `workspace` with no diff runs every chunk and never
	// shards (measured `selected=1 mode=shard-only`), so the derived spec would
	// never be consulted. `coding-agent-runtime` with a diff that touches no test
	// does shard, and reports its count on the same line.
	test("a shard past the chunk count still fails the job", async () => {
		const planned = await runRunner("coding-agent-runtime", { ULTRAWORKERS_TEST_AFFECTED: "docs/readme.md" });
		const reported = planned.stdout.match(/of (\d+) chunks -> \d+ selected/);
		expect(reported?.[1], `runner did not report a chunk count:\n${planned.stdout}`).toBeDefined();
		const chunkCount = Number(reported?.[1]);
		expect(chunkCount).toBeGreaterThan(0);

		const result = await runRunner("coding-agent-runtime", {
			ULTRAWORKERS_TEST_AFFECTED: "docs/readme.md",
			ULTRAWORKERS_TEST_SHARD: `${chunkCount + 1}/${chunkCount + 1}`,
		});
		expect(result.exitCode).not.toBe(0);
		expect(result.stdout + result.stderr).toContain("selects no chunks");
	}, 260_000);

	// The row above proves the gate FIRES. This one proves the gate is still
	// THERE: remove the `selects no chunks` throw and the row must go red, rather
	// than passing because a bad shard quietly ran an empty selection. Asserting
	// "the guard exists" by reading the source is a source grep; this observes it.
	test("the last valid shard still runs, so the row above is not passing on a blanket failure", async () => {
		const planned = await runRunner("coding-agent-runtime", { ULTRAWORKERS_TEST_AFFECTED: "docs/readme.md" });
		const chunkCount = Number(planned.stdout.match(/of (\d+) chunks -> \d+ selected/)?.[1]);
		expect(chunkCount).toBeGreaterThan(0);

		// In range: must run. If everything failed, the row above would pass for
		// the wrong reason and the gate would look proven while permitting any spec.
		const result = await runRunner("coding-agent-runtime", {
			ULTRAWORKERS_TEST_AFFECTED: "docs/readme.md",
			ULTRAWORKERS_TEST_SHARD: `1/${chunkCount}`,
		});
		expect(result.exitCode).toBe(0);
		expect(result.stdout).not.toContain("selects no chunks");
	}, 260_000);

	test("a malformed shard spec still fails the job", async () => {
		const result = await runRunner("workspace", { ULTRAWORKERS_TEST_SHARD: "0/2" });
		expect(result.exitCode).not.toBe(0);
		expect(result.stdout + result.stderr).toContain("Invalid ULTRAWORKERS_TEST_SHARD");
	}, 130_000);
});

describe("selectAffected", () => {
	const chunk = (label: string, cwd: string, files: string[]) => ({
		label,
		cwd,
		command: ["bun", "test", ...files],
	});

	test("selects the chunk owning a changed test file and not its siblings", () => {
		const commands = [
			chunk("pkg (chunk 1/2)", "packages/demo", ["test/a.test.ts", "test/b.test.ts"]),
			chunk("pkg (chunk 2/2)", "packages/demo", ["test/c.test.ts", "test/d.test.ts"]),
		];
		const selected = selectAffected(commands, ["packages/demo/test/c.test.ts"]);
		expect(selected.map(c => c.label)).toEqual(["pkg (chunk 2/2)"]);
	});

	// The negative contract: no diff means "run everything", which is what
	// local runs and any caller that cannot compute one rely on.
	test("an absent diff keeps every chunk", () => {
		const commands = [chunk("pkg", "packages/demo", ["test/a.test.ts"])];
		expect(selectAffected(commands, undefined)).toEqual(commands);
	});

	test("a repo-wide file such as the lockfile runs every chunk", () => {
		const commands = [
			chunk("demo", "packages/demo", ["test/a.test.ts"]),
			chunk("other", "packages/other", ["test/b.test.ts"]),
		];
		expect(selectAffected(commands, ["bun.lock"])).toEqual(commands);
	});

	// A package-level chunk runs its whole package, so any file under that
	// package selects it — unlike a chunk that names its own files.
	test("a whole-package chunk reacts to any file in its package", () => {
		const commands = [chunk("demo pkg", "packages/demo", []), chunk("other pkg", "packages/other", [])];
		expect(selectAffected(commands, ["packages/demo/src/index.ts"]).map(c => c.label)).toEqual(["demo pkg"]);
	});
});

// A quiet run prints one line per chunk and names no file on a passing chunk, so
// "my test is not in the log" and "my test passed" look identical. These defend the
// record that makes the two distinguishable.
describe("formatChunkManifest", () => {
	const chunk = (label: string, ...files: string[]) => ({
		label,
		cwd: "packages/coding-agent",
		command: ["bun", "test", ...files],
	});

	test("names every file of every chunk, so an unrun file is never silently absent", () => {
		const manifest = formatChunkManifest([
			chunk("chunk 1/2", "test/a.test.ts", "test/b.test.ts"),
			chunk("chunk 2/2", "test/c.test.ts"),
		]);
		for (const file of ["test/a.test.ts", "test/b.test.ts", "test/c.test.ts"]) {
			expect(manifest).toContain(file);
		}
		// Each chunk is headed by its own label, so a file is attributable to the chunk
		// that would have run it — not just present somewhere in a flat list.
		expect(manifest).toContain("chunk 1/2");
		expect(manifest).toContain("chunk 2/2");
	});

	test("reads the file list off the argv, so a label that disagrees is visible", () => {
		// The label claims four files and the argv names two. The manifest is read from the
		// argv, so the mismatch is countable here rather than being a number in a label
		// nobody can check against the run.
		const manifest = formatChunkManifest([chunk("claims 4 files", "test/a.test.ts", "test/b.test.ts")]);
		const names = manifest.split("\n").filter(line => line.startsWith("  ") && line.endsWith(".test.ts"));
		expect(names).toHaveLength(2);
	});

	test("marks a chunk that names no test file instead of printing an empty block", () => {
		// A silently empty block is indistinguishable from a chunk whose files were all
		// dropped; saying so is the difference between a record and a blank.
		const manifest = formatChunkManifest([chunk("rs chunk", "scripts/run-rs-task.ts", "test:rs")]);
		expect(manifest).toContain("(no test files in argv)");
	});
});

/**
 * The manifest, read the way a person hunting a flake actually reads it.
 *
 * The tests above call {@link formatChunkManifest} and prove it prints the right string.
 * That is not the claim in dispute. The claim is that the **real runner calls it at the
 * right moment**, and the gap between those two is exactly where this gate could have been
 * decorative: a correct formatter nothing ever calls produces no manifest, and "the log
 * had nothing" then reads as "the file passed" for the whole run.
 *
 * So this runs the real entry, on real files, in a child process — a child because a
 * failing chunk sets `process.exitCode`, which in-process would turn the test run itself
 * red and tell us nothing about the runner.
 */
describe("chunk manifest through the real runner", () => {
	test("names a file whose chunk died at import, and still fails that chunk", async () => {
		using dir = TempDir.createSync("uw-test-manifest-e2e-");
		// Two files in one chunk, which is the shape that makes the hole visible: the broken
		// one dies loading, so its name is the only one the replayed output mentions, and the
		// green one is passed over in silence.
		await Bun.write(
			dir.join("green.test.ts"),
			'import { expect, test } from "bun:test";\ntest("green file passes", () => {\n\texpect(1 + 1).toBe(2);\n});\n',
		);
		// `absent` is **used**, and that is load-bearing rather than incidental. An unused
		// static import of a module that does not exist does not break a bun test file: the
		// bundler elides the whole import before resolution, so the file loads and its test
		// passes. Measured at HEAD=4ce046c0cd — `bun test` on a fixture importing
		// "./module-that-was-never-written" and never mentioning it reported "2 pass, 0 fail".
		// Written the obvious way, this fixture cannot fail and proves nothing. Using the
		// binding keeps the import live, so resolution runs and the chunk dies loading.
		await Bun.write(
			dir.join("broken.test.ts"),
			'import { absent } from "./module-that-was-never-written";\nimport { expect, test } from "bun:test";\ntest("never reached", () => {\n\texpect(absent).toBeDefined();\n});\n',
		);

		const repoRoot = path.join(import.meta.dir, "..");
		// `cwd` is resolved against the repo root by the runner, so a temp dir outside the
		// tree is reachable as a relative escape — no repo files touched, which is the only
		// way this is safe to run on a shared checkout.
		const commands = [
			{
				label: "e2e chunk",
				cwd: path.relative(repoRoot, dir.absolute()),
				command: ["bun", "test", "--only-failures", "green.test.ts", "broken.test.ts"],
				parallel: 1,
			},
		];
		const result = await ptree.exec(
			[
				process.execPath,
				"-e",
				`import { runTestCommandsInParallel } from ${JSON.stringify(import.meta.resolve("./ci-test-ts.ts"))}; await runTestCommandsInParallel(${JSON.stringify(commands)}, 1);`,
			],
			{ env: { ...Bun.env, NO_COLOR: "1" }, timeout: 120_000, detached: true, allowNonZero: true },
		);

		// The reader's only route to the manifest is the line the runner prints, so that
		// line is part of the contract. This throw **is** the control for the mutation a4
		// asked for: delete the manifest write and this is where the test goes red, with the
		// child's own output quoted so the failure says what did happen instead.
		const manifestPath = /chunk manifest: (\S+)/.exec(result.stdout)?.[1];
		if (manifestPath === undefined) {
			throw new Error(`runner never reported a manifest path. exit=${result.exitCode}\n${result.stdout}`);
		}

		const manifest = await Bun.file(manifestPath).text();
		// Both files — the one that ran and the one that never got to run a test. The second
		// assertion is the load-bearing one: a manifest built from output rather than argv
		// would name the broken file (it is the only one printed) and silently lose this one.
		expect(manifest).toContain("green.test.ts");
		expect(manifest).toContain("broken.test.ts");

		// Recording a broken chunk is not the same as failing on it. Without this the test
		// would pass against a runner that wrote a perfect manifest and exited 0.
		expect(result.exitCode).toBe(1);
	}, 150_000);
});

/**
 * A probe that ran inside a passing chunk, and the report that it did.
 *
 * The failure this defends against is a silence that reads as a result: quiet mode
 * withholds a passing chunk's whole output, so an instrument placed there leaves
 * nothing behind — and nothing behind is exactly what an instrument which never fired
 * also leaves behind.
 *
 * Every assertion below is proven non-vacuous by mutation; the mutations and their
 * outputs are recorded in the commit that introduced this block.
 */
describe("discarded probe reporting", () => {
	const probeSource = (body: string) =>
		[
			'import { expect, test } from "bun:test";',
			`import { probe } from ${JSON.stringify(import.meta.resolve("../packages/utils/src/probe.ts"))};`,
			'test("probe fires", () => {',
			`\t${body}`,
			"\texpect(1).toBe(1);",
			"});",
			"",
		].join("\n");

	/** Run the real runner over `files` in a temp dir, and hand back what it printed. */
	async function runRealRunner(dir: TempDir, files: string[]) {
		const repoRoot = path.join(import.meta.dir, "..");
		const commands = [
			{
				label: "probe chunk",
				cwd: path.relative(repoRoot, dir.absolute()),
				command: ["bun", "test", "--only-failures", ...files],
				parallel: 1,
			},
		];
		return await ptree.exec(
			[
				process.execPath,
				"-e",
				`import { runTestCommandsInParallel } from ${JSON.stringify(import.meta.resolve("./ci-test-ts.ts"))}; await runTestCommandsInParallel(${JSON.stringify(commands)}, 1);`,
			],
			{ env: { ...Bun.env, NO_COLOR: "1" }, timeout: 120_000, detached: true, allowNonZero: true },
		);
	}

	test("counts tagged lines, and does not count the tag quoted inside another line", () => {
		expect(countProbeEntries("")).toBe(0);
		expect(countProbeEntries(`${PROBE_PREFIX} one\n${PROBE_PREFIX} two\n`)).toBe(2);
		expect(countProbeEntries("1 pass\n0 fail\n")).toBe(0);
		// A bare substring search would count this and report a probe that never ran.
		expect(countProbeEntries(`error: failed near ${PROBE_PREFIX} in the fixture`)).toBe(0);
	});

	test("says nothing when nothing was discarded, so a normal run stays clean", () => {
		expect(formatDiscardedProbeWarning(0, 0, false)).toBe("");
		expect(formatDiscardedProbeWarning(0, 3, true)).toBe("");
	});

	test("reports the count and the way out, and still reports when muted", () => {
		const loud = formatDiscardedProbeWarning(3, 2, false);
		expect(loud).toContain("3 probe entries");
		expect(loud).toContain("2 passing chunks");
		expect(loud).toContain("--full");
		// Muting the alarm must not mute the fact. A configuration that printed nothing at
		// all would be a quieter way to rebuild the hole this exists to close.
		const muted = formatDiscardedProbeWarning(3, 2, true);
		expect(muted).toContain("3 probe entries");
		expect(muted).toContain("ULTRAWORKERS_TEST_QUIET_DISCARD_WARN=0");
		expect(formatDiscardedProbeWarning(1, 1, false)).toContain("1 probe entry from 1 passing chunk");
	});

	test("tells a chunk that runs tests from one that only looks like it", () => {
		// The whole-package chunk names no files and still runs hundreds; warning on it
		// would fire on ordinary diff-scoped runs. The Rust chunk starts with `bun` and
		// runs a script — that is the shape with zero tests behind a green exit.
		expect(chunkRunsTests({ label: "pkg", cwd: "packages/x", command: ["bun", "test"] })).toBe(true);
		expect(chunkRunsTests({ label: "pkg", cwd: "packages/x", command: ["bun", "test", "a.test.ts"] })).toBe(true);
		expect(chunkRunsTests({ label: "gates", cwd: ".", command: ["node", "--test", "a.test.mjs"] })).toBe(true);
		expect(chunkRunsTests({ label: "rs", cwd: ".", command: ["bun", "scripts/run-rs-task.ts", "test:rs"] })).toBe(
			false,
		);
		expect(chunkRunsTests({ label: "rs", cwd: ".", command: ["cargo", "nextest", "run"] })).toBe(false);
	});

	test("reports a probe that ran in a passing chunk, over the real runner", async () => {
		using dir = TempDir.createSync("ultraworkers-probe-warn-");
		await Bun.write(dir.join("probed.test.ts"), probeSource('probe("fired-once");'));
		const result = await runRealRunner(dir, ["probed.test.ts"]);
		// The chunk passed — that is the precondition for the silence this reports.
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("1 probe entry from 1 passing chunk");
		expect(result.stdout).toContain("--full");
	}, 150_000);

	test("stays silent when a passing chunk fired no probe", async () => {
		// The false-positive guard, and the reason the count is keyed on a tag rather than
		// on "this chunk produced output": a passing chunk always produces output, so that
		// key would warn on every run and be read as noise within a week.
		using dir = TempDir.createSync("ultraworkers-probe-quiet-");
		await Bun.write(
			dir.join("plain.test.ts"),
			'import { expect, test } from "bun:test";\ntest("no probe", () => {\n\texpect(1).toBe(1);\n});\n',
		);
		const result = await runRealRunner(dir, ["plain.test.ts"]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).not.toContain("probe entry");
	}, 150_000);
});
