import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import { readGateArgs } from "./args";

/**
 * The contract: a gate refuses a command line it does not understand, instead of
 * running a default and returning that verdict as if it had been asked.
 *
 * The consumer-observable failure this defends against: someone runs
 * `check-disposition.ts --gat0`, believes they gated something narrow, and gets the
 * full pre-sweep's verdict under a plausible exit code. Nothing in the output says
 * the question was never received — that is what makes it worth a gate.
 *
 * The shapes below are deliberately varied rather than all copies of the flag this
 * was found with. A fix that special-cases one string leaves `--gat0`, `--gate` and
 * `--stage` (no `=`) falling through exactly as before, so each shape is its own
 * case and the family is what is under test.
 */
describe("readGateArgs refuses what it does not understand", () => {
	const stage = { flags: ["--stage="] } as const;

	it.each([
		["--gat0", "a near-miss of a real flag"],
		["--gate", "a truncated real flag"],
		["--gate0", "the flag the plan documented"],
		["--help", "a conventional flag that is not implemented"],
		["--stage", "the real flag without its =value"],
		["--Stage=pre", "the real flag with the wrong case"],
		["-x", "a short flag"],
	])("refuses %s (%s) rather than defaulting", arg => {
		expect(readGateArgs([arg], stage)).toEqual({
			ok: false,
			message: expect.stringContaining("unknown flag") as unknown as string,
		});
	});

	it("names what it does accept, so the refusal is actionable", () => {
		const read = readGateArgs(["--gat0"], stage);
		expect(read.ok).toBe(false);
		// A gate that takes a path must say so, or the reader concludes there is no
		// way to point it at a tree — which is false for the positional gates.
		expect(readGateArgs(["--gat0"], { positionals: 1 })).toEqual({
			ok: false,
			message: expect.stringContaining("a path argument") as unknown as string,
		});
	});

	it("still accepts the flag it declares, and its value", () => {
		expect(readGateArgs(["--stage=pre"], stage)).toEqual({
			ok: true,
			positionals: [],
		});
		expect(readGateArgs([], stage)).toEqual({ ok: true, positionals: [] });
	});

	it("refuses a bare argument at a gate that takes none", () => {
		expect(readGateArgs(["."], stage)).toEqual({
			ok: false,
			message: expect.stringContaining("unexpected argument") as unknown as string,
		});
	});

	it("fills positionals up to its limit and refuses the one past it", () => {
		expect(readGateArgs(["."], { positionals: 1 })).toEqual({
			ok: true,
			positionals: ["."],
		});
		expect(readGateArgs(["a", "b"], { positionals: 1 })).toEqual({
			ok: false,
			message: expect.stringContaining("unexpected argument") as unknown as string,
		});
	});
});

/**
 * The helper is only worth having if a gate actually consults it. These spawn the
 * real script so that deleting the `readGateArgsOrExit` call from `main()` turns
 * them red — a unit test of the helper alone stays green through that deletion.
 */
describe("the gate refuses an unknown flag at the process boundary", () => {
	const script = path.join(import.meta.dir, "check-disposition.ts");

	const run = (args: string[]) => Bun.spawnSync(["bun", script, ...args], { stdout: "pipe", stderr: "pipe" });

	it("exits 2 on an unknown flag instead of answering the pre-sweep", () => {
		const proc = run(["--gat0"]);
		expect(proc.exitCode).toBe(2);
		expect(proc.stderr.toString()).toContain("unknown flag");
	});

	it("exits 2 on the flag the plan documents, which used to run the whole sweep", () => {
		const proc = run(["--gate0"]);
		expect(proc.exitCode).toBe(2);
		// The distinguishing evidence: before the fix this exited 1 after printing a
		// pre-sweep tally. Now it refuses before doing any work.
		expect(proc.stdout.toString()).not.toContain("missing-row");
		expect(proc.stdout.toString()).not.toContain("disposition(pre)");
	});

	it("reaches the gate itself when given the flag it declares", () => {
		// Same exit code as the refusal, but for a completely different reason: the
		// argv was accepted and the sweep ran and found violations. Distinguishing
		// them by output, not by exit code, is what makes "the flag was read" real.
		const proc = run(["--stage=pre"]);
		expect(proc.stderr.toString()).not.toContain("unknown flag");
		expect(proc.stdout.toString()).toContain("disposition(pre)");
	});
});
