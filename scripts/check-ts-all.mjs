#!/usr/bin/env node

/**
 * Run every step of `check:ts` and report each one, so a red step 1 cannot hide
 * the ten behind it.
 *
 * WHY THIS EXISTS. `check:ts` is eleven steps joined by `&&`. Step 1 is
 * `check:tools`, and one file with a line-wrap the formatter disagreed with
 * stopped the chain there, so steps 2-11 never ran: no `check:types` across
 * packages, no fan-in ratchet, no test-baseline. Measured 2026-10-02, the
 * 12 `pi-durable` type errors were reported as "fixed" because a
 * `grep -c "error TS"` over that run returned 0 — they were behind a step that
 * had never executed.
 *
 * The failure is not that the gate went red. It went red loudly and on schedule,
 * which is what a working gate looks like. Ten verification surfaces were
 * dormant and nothing in the output said so.
 *
 * WHY THIS IS A SEPARATE SCRIPT AND NOT A CHANGE TO `check:ts`. `check:ts`
 * red means "one thing is broken". Aggregating would make it mean "ten things
 * are broken", which changes what every contributor's local loop and CI mean
 * for a diagnostic. `check:ts` keeps its semantics; this is what you run when
 * `check:ts` is red and you want to know what is underneath.
 *
 * Read-only with respect to the repo: it runs the steps and aggregates their
 * exit codes. It changes no file and no config.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import * as path from "node:path";

const REPO_ROOT = process.cwd();
const ONLY = process.argv[2] ?? null;

/**
 * Split a script body on `&&` at depth 0, outside quotes.
 *
 * Depth and quote tracking are the point: a `&&` inside a quoted string or a
 * subshell is not a chain boundary, and splitting on it would invent steps that
 * do not exist — reporting a denominator that was never there.
 */
function splitSteps(script) {
	const steps = [];
	let current = "";
	let quote = null;
	let depth = 0;
	for (let i = 0; i < script.length; i += 1) {
		const ch = script[i];
		if (quote) {
			current += ch;
			if (ch === quote) quote = null;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			quote = ch;
			current += ch;
			continue;
		}
		if (ch === "(") depth += 1;
		if (ch === ")") depth -= 1;
		if (depth === 0 && ch === "&" && script[i + 1] === "&") {
			steps.push(current.trim());
			current = "";
			i += 1;
			continue;
		}
		current += ch;
	}
	if (current.trim()) steps.push(current.trim());
	return steps.filter(Boolean);
}

function loadSteps() {
	const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
	const script = pkg.scripts?.["check:ts"];
	if (typeof script !== "string") {
		throw new Error('package.json has no "check:ts" script');
	}
	const steps = splitSteps(script);
	if (steps.length < 2) {
		throw new Error(`check:ts parsed to ${steps.length} step(s); expected a && chain`);
	}
	return steps;
}

/**
 * Run one step through `bun run` when it names a package script, and through the
 * shell otherwise. Every step in the current chain is of the form
 * `bun run <name>` or `bun run --filter ... <name>`, so the shell path is the
 * general fallback rather than the common one.
 */
function runStep(step) {
	const asScript = /^bun run ([A-Za-z0-9:_-]+)\s*$/.exec(step);
	if (asScript) {
		const res = spawnSync("bun", ["run", asScript[1]], {
			cwd: REPO_ROOT,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
		return { code: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
	}
	const res = spawnSync("bash", ["-lc", step], {
		cwd: REPO_ROOT,
		encoding: "utf8",
		maxBuffer: 256 * 1024 * 1024,
	});
	return { code: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function main() {
	const steps = loadSteps();
	const results = [];

	for (const [index, step] of steps.entries()) {
		const number = index + 1;
		if (ONLY && String(number) !== ONLY) {
			results.push({ number, step, code: null, skipped: true });
			continue;
		}
		process.stderr.write(`\n=== check:ts step ${number}/${steps.length}: ${step}\n`);
		const started = Date.now();
		const { code } = runStep(step);
		const seconds = ((Date.now() - started) / 1000).toFixed(1);
		const verdict = code === 0 ? "PASS" : "FAIL";
		process.stderr.write(`--- step ${number} ${verdict} (exit ${code}, ${seconds}s)\n`);
		results.push({ number, step, code, seconds });
	}

	const ran = results.filter(r => !r.skipped);
	const failed = ran.filter(r => r.code !== 0);
	const passed = ran.filter(r => r.code === 0);

	console.log("");
	for (const r of results) {
		const verdict = r.skipped ? "SKIP" : r.code === 0 ? "PASS" : `FAIL(${r.code})`;
		console.log(`${verdict.padEnd(9)} step ${String(r.number).padStart(2)}  ${r.step}`);
	}
	console.log(
		`\n${passed.length} passed, ${failed.length} failed, ` +
			`${results.length - ran.length} skipped, of ${steps.length} steps.`,
	);
	if (failed.length > 0) {
		console.log(
			"\nEvery step ran, so this is the whole picture rather than the first failure.\n" +
				"`check:ts` stops at step 1 by design; this run is the diagnostic.",
		);
	}
	// Exit non-zero when any step failed, so this is usable in CI as a superset.
	process.exitCode = failed.length > 0 ? 1 : 0;
}

try {
	main();
} catch (err) {
	console.error(`[check:ts:all] ${err instanceof Error ? err.message : String(err)}`);
	process.exitCode = 2;
}