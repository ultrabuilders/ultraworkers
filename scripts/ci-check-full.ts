#!/usr/bin/env bun

/**
 * `ci:check:full` — the aggregate CI runs, and the reason it is not just `check:ts`.
 *
 * WHY THIS EXISTS RATHER THAN AN `&&`.
 *
 * `check:ts` is a chain of `&&`. A chain reports the FIRST failure and then stops, so every
 * gate positioned after a red one does not execute on that run — silently, with no line in
 * the output saying it was skipped. That is the right behaviour for a chain you read top to
 * bottom, and the wrong behaviour for a ratchet, whose whole job is to state the number it is
 * holding.
 *
 * The ratchet was in fact wired as the eighth link of `check:ts`, behind `check:tools` and
 * `check:test-rename-literals`, both of which are red on this tree. It would never have run.
 * Its own commit message said so; the wiring said the opposite. A link that never executes is
 * worse than no link, because it reads as coverage that nobody has to reason about.
 *
 * So: every gate here runs, whatever the ones before it did, and this runner prints a verdict
 * for all of them. The aggregate's exit code is still non-zero if any gate failed — running
 * them all must not soften the result, only widen what the result is about.
 *
 * WHAT THIS DOES NOT DO
 *
 * It does not reorder, replace or soften `check:ts`. That chain is unchanged and remains the
 * authority on the type/lint/rename gates. This runner only decides which gates run and makes
 * sure none of them is silent.
 */

/** One gate the aggregate runs, named the way it is invoked so the verdict cites it exactly. */
export interface Gate {
	readonly name: string;
	/** The `package.json` script to run. Resolved in the repo root. */
	readonly script: string;
}

/**
 * Exported so a test can repoint it. The runner takes its lanes from here rather than from a
 * literal inside `main`, which is what lets a test drive a first-fails-second-still-runs case
 * without making the real gates red.
 */
export const GATES: readonly Gate[] = [
	{ name: "check:ts", script: "check:ts" },
	{ name: "check:disposition-ratchet", script: "check:disposition-ratchet" },
];

/** What one gate did. `exitCode` is the child's own, captured — never inferred from output. */
export interface GateVerdict {
	readonly name: string;
	readonly exitCode: number;
}

/**
 * Fold the verdicts into the aggregate's answer.
 *
 * Pure, so the rule "a failure anywhere fails the aggregate, and every gate is still named"
 * is asserted directly rather than inferred from a subprocess. `lines` lists EVERY gate in the
 * order it ran, including the ones that passed — a verdict table that omitted the passes could
 * not be told apart from one that silently skipped them, which is the exact confusion this
 * runner exists to remove.
 */
export function summarize(verdicts: readonly GateVerdict[]): { ok: boolean; lines: string[] } {
	const lines = verdicts.map(v => `  ${v.exitCode === 0 ? "PASS" : "FAIL"}  ${v.name} (exit ${v.exitCode})`);
	const ok = verdicts.every(v => v.exitCode === 0);
	return { ok, lines };
}

async function main(): Promise<number> {
	// `process.cwd()`, not the script's own directory: `bun run` executes scripts from the
	// directory the caller was in, and reading the root the same way is what lets a test drive
	// this runner against a fixture repository instead of only against the real one.
	const root = process.cwd();
	const verdicts: GateVerdict[] = [];

	for (const gate of GATES) {
		// stdio inherited, so each gate's own output lands in the log where a reader expects it
		// rather than being summarised away to a verdict line.
		const child = Bun.spawn(["bun", "run", gate.script], {
			cwd: root,
			stdout: "inherit",
			stderr: "inherit",
		});
		verdicts.push({ name: gate.name, exitCode: await child.exited });
		// No early return: a red gate must not stop the ones after it, or this runner would
		// reproduce the `&&` behaviour it was written to avoid.
	}

	const { ok, lines } = summarize(verdicts);
	console.log(
		`\n[ci:check:full] ${verdicts.length} gates ran, ${verdicts.filter(v => v.exitCode !== 0).length} failed`,
	);
	for (const line of lines) console.log(line);
	console.log(
		ok
			? "[ci:check:full] OK — every gate ran and every gate passed."
			: "[ci:check:full] FAIL — the gate(s) named above ran and failed. A gate after a red one is still reported.",
	);

	return ok ? 0 : 1;
}

if (import.meta.main) process.exitCode = await main();
