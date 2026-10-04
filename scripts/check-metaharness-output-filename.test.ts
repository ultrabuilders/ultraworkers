/**
 * The metaharness transcript-filename gate must go red when a producer and the
 * consumer disagree, and must go red — not green — when it can no longer see either
 * side. Both properties are asserted by making the gate actually fail, because the
 * failure this gate exists for is silent by construction: `probeTrialCost` returns
 * `null` on a missing file and both call sites fold that into `?? 0`, so a half-rename
 * costs realtime money and token counts while the rest of the suite stays green.
 *
 * THE CASE THAT MADE THIS A TWO-PRODUCER GATE
 * --------------------------------------------
 * The first version read one producer (`omp_local.py`) and compared it against one
 * literal in the consumer — so the comparison was `x == x` and could not fail for the
 * second agent. `pi_upstream.py` had already been writing `pi.txt`, meaning `--agent pi`
 * trials read a file nobody writes. That is the drift below, in the middle: it is the
 * one that was live, and the gate that shipped over it was green.
 *
 * The gate runs as a subprocess against a real directory tree rather than being
 * exercised through its internals: it resolves every source path relative to the
 * working directory, so the only honest way to ask "would this have caught the real
 * rename" is to give it a tree shaped like the repository. The files are the real
 * ones, copied — a fixture that merely agreed with the gate would prove nothing.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";
import {
	CONSUMER_PATHS,
	findPairProblem,
	mappedAgents,
	PRODUCER_PATHS,
	producedFilename,
} from "./check-metaharness-output-filename";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const GATE = path.join(import.meta.dir, "check-metaharness-output-filename.ts");

/**
 * A tree containing the real producers and consumers.
 *
 * `renames` maps a repo-relative path to the filename its `_OUTPUT_FILENAME` (or
 * hardcoded consumer literal) should carry. Omitting a path copies it unchanged.
 */
async function seedTree(dir: string, renames: Record<string, string> = {}): Promise<void> {
	const rels = [...Object.values(PRODUCER_PATHS), ...CONSUMER_PATHS];
	for (const rel of rels) {
		let source = await Bun.file(path.join(REPO_ROOT, rel)).text();
		const renamed = renames[rel];
		if (renamed !== undefined) {
			source = source
				.replace(/_OUTPUT_FILENAME\s*=\s*"[^"]+"/, `_OUTPUT_FILENAME = "${renamed}"`)
				.replace(/path\.join\(dir,\s*"agent",\s*"[^"]+"\)/g, `path.join(dir, "agent", "${renamed}")`);
		}
		await Bun.write(path.join(dir, rel), source);
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
	return { code, out: `${out}${err}` };
}

describe("check-metaharness-output-filename", () => {
	test("passes on the real tree, and names BOTH producers", async () => {
		const dir = TempDir.createSync();
		try {
			await seedTree(dir.path());
			const { code, out } = await runGate(dir.path());
			expect(out).toContain("omp.txt");
			// The second producer is the one a single-producer gate cannot see. If this
			// stops being reported, the gate has gone blind to half the pair again.
			expect(out).toContain("pi.txt");
			expect(code).toBe(0);
		} finally {
			dir.remove();
		}
	});

	test("goes red when the SECOND producer renames alone — the drift that shipped green", async () => {
		const dir = TempDir.createSync();
		try {
			await seedTree(dir.path(), { [PRODUCER_PATHS.pi!]: "renamed.txt" });
			const { code, out } = await runGate(dir.path());
			expect(code).not.toBe(0);
			expect(out).toContain("drift");
		} finally {
			dir.remove();
		}
	});

	test("goes red when the FIRST producer renames alone", async () => {
		const dir = TempDir.createSync();
		try {
			await seedTree(dir.path(), { [PRODUCER_PATHS.omp!]: "renamed.txt" });
			const { code, out } = await runGate(dir.path());
			expect(code).not.toBe(0);
			expect(out).toContain("drift");
		} finally {
			dir.remove();
		}
	});

	// A gate that treats "cannot see the producer" as "nothing wrong" goes green exactly
	// when it stops measuring. Each of these deletes one thing the comparison needs.
	test("goes red when a producer no longer binds _OUTPUT_FILENAME", async () => {
		const dir = TempDir.createSync();
		try {
			await seedTree(dir.path());
			// Strip the binding from ONE producer and leave every other file in place --
			// a missing file would ENOENT, which is a crash, not the judgement under test.
			await Bun.write(path.join(dir.path(), PRODUCER_PATHS.pi!), "import os\n");
			const { code, out } = await runGate(dir.path());
			expect(code).not.toBe(0);
			expect(out).toContain("can no longer see the producer");
		} finally {
			dir.remove();
		}
	});

	test("goes red when the consumer's agent table disappears", async () => {
		const dir = TempDir.createSync();
		try {
			await seedTree(dir.path());
			for (const rel of CONSUMER_PATHS) {
				const p = path.join(dir.path(), rel);
				const text = await Bun.file(p).text();
				await Bun.write(p, text.replace(/AGENT_TRANSCRIPT_FILENAME[^=]*=\s*\{[^}]*\}/, "const UNRELATED = 1"));
			}
			const { code, out } = await runGate(dir.path());
			expect(code).not.toBe(0);
			expect(out).toContain("can no longer see the consumer");
		} finally {
			dir.remove();
		}
	});

	// An agent in the table with no producer reads a file that is never written — the
	// same silent zero, reached by a different route.
	test("goes red when the consumer maps an agent with no producer", async () => {
		const dir = TempDir.createSync();
		try {
			await seedTree(dir.path());
			const p = path.join(dir.path(), CONSUMER_PATHS[0]!);
			const text = await Bun.file(p).text();
			await Bun.write(
				p,
				text.replace(
					/AGENT_TRANSCRIPT_FILENAME[^=]*=\s*\{/,
					'AGENT_TRANSCRIPT_FILENAME: Record<string, string> = { ghost: "ghost.txt", ',
				),
			);
			const { code, out } = await runGate(dir.path());
			expect(code).not.toBe(0);
			expect(out).toContain("ghost");
		} finally {
			dir.remove();
		}
	});

	// The internals, tested directly so the failure above is attributable rather than
	// only observable through the subprocess.
	describe("findPairProblem", () => {
		const producers = {
			omp: '_OUTPUT_FILENAME = "omp.txt"',
			pi: '_OUTPUT_FILENAME = "pi.txt"',
		};
		const goodConsumer = `const AGENT_TRANSCRIPT_FILENAME: Record<string, string> = { omp: "omp.txt", pi: "pi.txt" };\npath.join(dir, "agent", "omp.txt")`;

		test("returns null when both producers agree with the table", () => {
			expect(findPairProblem(producers, [goodConsumer])).toBeNull();
		});

		test("flags a producer whose literal the consumer does not probe", () => {
			const problem = findPairProblem({ ...producers, pi: '_OUTPUT_FILENAME = "other.txt"' }, [goodConsumer]);
			expect(problem?.kind).toBe("mismatch");
		});

		test("flags an unreadable producer rather than counting it as clean", () => {
			expect(findPairProblem({ ...producers, pi: "x = 1" }, [goodConsumer])?.kind).toBe("producer-not-found");
		});

		test("flags a missing consumer table rather than counting it as clean", () => {
			expect(findPairProblem(producers, ["const NOTHING = 1"])?.kind).toBe("consumer-not-found");
		});
	});

	test("mappedAgents returns the agent -> filename pairs, and null when the table is gone", () => {
		expect([...(mappedAgents(`AGENT_TRANSCRIPT_FILENAME = { omp: "a", pi: "b" };`) ?? [])]).toEqual([
			["omp", "a"],
			["pi", "b"],
		]);
		// An empty table is a table, not a missing one: it must read as empty, because a
		// producer mapped nowhere is the unmapped-agent failure, not a blind gate.
		expect(mappedAgents(`AGENT_TRANSCRIPT_FILENAME = { };`)?.size).toBe(0);
		expect(mappedAgents("no table here")).toBeNull();
	});

	test("producedFilename still refuses to invent a name from an absent binding", () => {
		expect(producedFilename('_OUTPUT_FILENAME = "x.txt"')).toBe("x.txt");
		expect(producedFilename("nothing")).toBeNull();
	});
});
