#!/usr/bin/env bun

/**
 * Runs every member of a `check:` chain and reports each one, instead of
 * short-circuiting on the first failure.
 *
 * WHY THIS EXISTS. `check:ts` was a 16-member `&&` chain whose FIRST member is
 * `oxfmt --check`. That makes two different states report identically:
 *
 *   - the tree is broken somewhere, and
 *   - a peer is mid-write on two files that differ in whitespace.
 *
 * Both print `exit 1`. In the second case the other fifteen gates **never
 * ran**, so the reader is told a gate failed when what actually happened is
 * that almost nothing was measured. The asymmetry runs the wrong way: a real
 * defect at member 9 is hidden by a formatting nit at member 1, and a reader
 * who trusts the summary goes looking for a defect that does not exist.
 *
 * The measurement is the defect. A gate that cannot report what it covered is
 * not evidence about the tree, whatever its exit code says.
 *
 * WHAT IT DOES NOT CHANGE. The exit code is still non-zero if any member
 * failed, so CI still blocks. Ordering is preserved — cheap gates first, so a
 * syntax error surfaces before the slow baseline gate runs. Only the
 * short-circuit is gone.
 *
 * Usage:
 *   bun scripts/check-chain.ts
 */

import { $ } from "bun";

/**
 * The members, in the order they must run. Kept as data so the summary can be
 * tested without spawning anything.
 */
/**
 * The one member that is not a named script: a workspace filter rather than a
 * `package.json` entry. It is named here so MEMBERS stays a single ordered
 * list — the whole point is that a reader can diff it against the `&&` string
 * it replaces, and a list with a hole in it invites exactly that diff to be
 * skipped.
 */
export const TYPECHECK = "check:types (packages/*)";

export const MEMBERS = [
	"check:tools",
	"check:ts:tools",
	"check:file-counts",
	"check:invariants",
	"check:docs-rename",
	"check:runtime-rename",
	"check:runner-labels",
	"check:metaharness-output-filename",
	"check:test-rename-literals",
	"check:bench-reporting",
	"check:entry-graphs",
	"check:census",
	"check:await-import",
	"measure:fan-in:check",
	// Position matters: the typecheck is what surfaces syntax errors, so it runs
	// BEFORE the slow baseline gate, exactly as the `&&` chain ordered it. Moving
	// it last would mean a syntax error surfaces after the slowest gate rather
	// than before it — a reordering, not a de-short-circuit.
	TYPECHECK,
	"check:test-baseline",
] as const;

export type MemberName = (typeof MEMBERS)[number];

/** The raw command for the one member that is not a `package.json` script. */
export const TYPECHECK_COMMAND = "bun run --filter './packages/*' --sequential --if-present check:types";

export interface MemberResult {
	readonly member: string;
	/** `null` when the member does not exist here — there is no code to report. */
	readonly code: number | null;
	readonly skipped: boolean;
}

export interface ChainVerdict {
	readonly ran: number;
	readonly skipped: number;
	readonly failed: readonly string[];
	/** Non-zero when anything failed — the only thing CI reads. */
	readonly exitCode: number;
}

/**
 * Pure: turns member results into the verdict. Separated from execution so the
 * contract can be tested without spawning a single process.
 */
export function summarize(results: readonly MemberResult[]): ChainVerdict {
	const ran = results.filter(r => !r.skipped).length;
	const skipped = results.filter(r => r.skipped).length;
	const failed = results.filter(r => !r.skipped && r.code !== 0).map(r => r.member);
	return { ran, skipped, failed, exitCode: failed.length > 0 ? 1 : 0 };
}

/**
 * Runs one member. `null` means "not present on this checkout", which is a skip
 * and not a pass — see `summarize`. Injected so tests never spawn.
 */
export type Executor = (member: string) => Promise<number | null>;

/**
 * Pure with respect to the executor: runs every member in order and returns a
 * result for each, with no early exit. This is the contract the whole script
 * exists to provide, so it is separated from the CLI shell and from spawning —
 * a test that cannot reach it would be asserting the absence of the defect
 * rather than the presence of the fix.
 */
export async function runChain(
	members: readonly string[],
	execute: Executor,
	onResult?: (result: MemberResult) => void,
): Promise<MemberResult[]> {
	const results: MemberResult[] = [];
	for (const member of members) {
		// No `break`, and no `if (code !== 0) return` — that omission IS the fix.
		const code = await execute(member);
		const result: MemberResult = { member, code, skipped: code === null };
		results.push(result);
		onResult?.(result);
	}
	return results;
}

/**
 * Named scripts in the root package.json. Cached because `defaultExecutor` asks
 * once per member, and the answer cannot change mid-run.
 */
let scriptNamesCache: Promise<Set<string>> | undefined;

function scriptNames(): Promise<Set<string>> {
	scriptNamesCache ??= Bun.file(new URL("../package.json", import.meta.url))
		.json()
		.then((pkg: { scripts?: Record<string, unknown> }) => new Set(Object.keys(pkg.scripts ?? {})));
	return scriptNamesCache;
}

async function defaultExecutor(member: string): Promise<number | null> {
	if (member === TYPECHECK) {
		return (await $`${TYPECHECK_COMMAND}`.quiet().nothrow()).exitCode;
	}
	// `bun run <absent>` exits 1 with "Script not found", which would be reported
	// as a gate failure — a check that does not exist here is not a broken tree,
	// and calling it one sends the reader after a defect that isn't there.
	if (!(await scriptNames()).has(member)) return null;
	return (await $`bun run ${member}`.quiet().nothrow()).exitCode;
}

function printResult(r: MemberResult): void {
	if (r.skipped) {
		console.log(`  SKIP  ${r.member}  (no such script)`);
		return;
	}
	console.log(`  ${r.code === 0 ? "PASS" : "FAIL"}  ${r.member}`);
}

function printSummary(verdict: ChainVerdict): void {
	console.log("");
	if (verdict.failed.length === 0) {
		console.log(`chain: ${verdict.ran} ran, 0 failed${verdict.skipped ? `, ${verdict.skipped} skipped` : ""}`);
		return;
	}
	console.log(`chain: ${verdict.ran} ran, ${verdict.failed.length} FAILED -> ${verdict.failed.join(", ")}`);
	if (verdict.skipped) console.log(`chain: ${verdict.skipped} skipped`);
	console.log("");
	console.log("Every member ran. A FAIL above is that gate's own verdict, not a stand-in");
	console.log("for the ones after it — which is the whole difference from the && chain.");
}

async function main(): Promise<number> {
	console.log(`running ${MEMBERS.length} gates, none short-circuited\n`);

	// Report as we go: a long chain that prints nothing until the end reads as
	// hung, and the baseline gate genuinely is slow.
	const results = await runChain(MEMBERS, defaultExecutor, printResult);

	const verdict = summarize(results);
	printSummary(verdict);
	return verdict.exitCode;
}

if (import.meta.main) {
	process.exit(await main());
}
