#!/usr/bin/env bun

/**
 * The contract this defends: **a gate positioned after a failing gate still runs, and still
 * gets a verdict.**
 *
 * That is not a restatement of what the code does. It is the failure this runner was written
 * to remove: the ratchet was the eighth `&&` link of `check:ts`, behind two gates that are red
 * on this tree, so on every real run it never executed — while the commit that added it
 * described it as wired. A gate that never runs and a gate that passes are indistinguishable
 * from the outside, and only a run where an earlier gate FAILS can tell them apart. A test
 * with all-green fixtures therefore cannot defend this contract at all, which is why the
 * red-first case is the primary one here and not an afterthought.
 *
 * The second case defends the same property from the other side: a passing aggregate still
 * names every gate. An aggregate that printed only "OK" on success would let a reader who
 * never saw the failure case believe nothing ran.
 */

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const RUNNER = path.resolve(import.meta.dir, "ci-check-full.ts");

/**
 * A fixture repository whose `package.json` defines the given gates, each of which prints its
 * own name and exits with the given code. The marker is what proves execution: a gate that is
 * skipped prints nothing at all, so its absence from the output is the failure this catches.
 */
async function fixtureRepo(gates: readonly { name: string; code: number }[]): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ci-check-full-"));
	const scripts: Record<string, string> = {};
	for (const gate of gates) {
		scripts[gate.name] = `echo "RAN ${gate.name}"; exit ${gate.code}`;
	}
	// GATES is hard-wired to the real script names, so the fixture has to answer to those.
	await Bun.write(
		path.join(dir, "package.json"),
		`${JSON.stringify({ name: "ci-check-full-fixture", private: true, scripts }, null, 2)}\n`,
	);
	return dir;
}

/** Run the aggregate in `dir`, capturing the child's own exit code — never a pipe's. */
async function runAggregate(dir: string): Promise<{ code: number; out: string }> {
	const child = Bun.spawn(["bun", RUNNER], { cwd: dir, stdout: "pipe", stderr: "pipe" });
	const [out, err, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { code, out: `${out}${err}` };
}

/** The real gate names, so the fixture is a repository this runner can actually drive. */
const REAL_GATES = ["check:ts", "check:disposition-ratchet"] as const;

describe("ci:check:full — no gate is occluded by an earlier failure", () => {
	test("runs and reports the gate that sits after the failing one", async () => {
		const dir = await fixtureRepo([
			{ name: REAL_GATES[0], code: 1 },
			{ name: REAL_GATES[1], code: 0 },
		]);
		try {
			const { code, out } = await runAggregate(dir);

			// The first gate failed, so an `&&` chain would have stopped here. If the second
			// gate's marker is absent, the chain semantics are back and this runner is a
			// differently-spelled `&&`.
			expect(out).toContain(`RAN ${REAL_GATES[1]}`);
			expect(out).toContain(`PASS  ${REAL_GATES[1]}`);
			expect(out).toContain(`FAIL  ${REAL_GATES[0]}`);
			expect(code).toBe(1);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	test("a fully passing aggregate still names every gate it ran", async () => {
		const dir = await fixtureRepo([
			{ name: REAL_GATES[0], code: 0 },
			{ name: REAL_GATES[1], code: 0 },
		]);
		try {
			const { code, out } = await runAggregate(dir);

			expect(code).toBe(0);
			// Silence on success is the same shape of problem as silence on failure: a reader
			// who sees only "OK" cannot tell a clean run from a run that measured nothing.
			expect(out).toContain(`PASS  ${REAL_GATES[0]}`);
			expect(out).toContain(`PASS  ${REAL_GATES[1]}`);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	test("a failing gate after a passing one still fails the aggregate", async () => {
		const dir = await fixtureRepo([
			{ name: REAL_GATES[0], code: 0 },
			{ name: REAL_GATES[1], code: 1 },
		]);
		try {
			const { code, out } = await runAggregate(dir);

			// The inverse order, because "the first failure decides" is a different rule from
			// "any failure decides", and only one of them is what an aggregate has to do.
			expect(out).toContain(`RAN ${REAL_GATES[1]}`);
			expect(code).toBe(1);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});
