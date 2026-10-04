import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import * as path from "node:path";
import {
	fastWorkspacePackages,
	localOnlyWorkspacePackages,
	nativeAndIntegrationPackages,
	selectAffected,
} from "../../../scripts/ci-test-ts";

/**
 * `selectAffected` decides what `bun run test` runs from a diff.
 *
 * Every way it can fail to name the affected tests used to end in the same place:
 * two smoke commands that check the CLI boots. That is the worst possible failure
 * for a selector — a CI job that ran a real thing, reported green, and ran none of
 * the tests. The three ways in were an empty diff (a clean checkout, the most
 * ordinary state there is), a diff that maps nowhere, and a Rust change.
 *
 * The contract asserted here is the fail-closed one: if the selector cannot name
 * the affected chunks, it returns *all* of them. Smoke belongs to a diff that
 * mapped into a small group, never to "I don't know".
 *
 * What a consumer observes on regression is the failure mode named in each test —
 * a red suite that never ran, or a Rust commit that never compiled.
 */
describe("selectAffected", () => {
	const tsChunk = { label: "packages/utils", cwd: "packages/utils", command: ["bun", "test"] };
	const otherChunk = { label: "packages/catalog", cwd: "packages/catalog", command: ["bun", "test"] };
	// Verbatim from `rustTestCommand()` — the argv that used to be read as a list
	// of test file names, because neither entry ends in a flag or equals "test".
	const rustChunk = { label: "rust", cwd: ".", command: ["bun", "scripts/run-rs-task.ts", "test:rs"] };
	const all = [tsChunk, otherChunk, rustChunk];

	it("runs the whole suite on a clean checkout, not two smoke commands", () => {
		// The regression: an empty diff is not "nothing is affected", it is "this
		// selector knows nothing". Returning the smoke pair here meant every green
		// run on an untouched tree had executed zero tests.
		expect(selectAffected(all, []).map(c => c.label)).toEqual(["packages/utils", "packages/catalog", "rust"]);
	});

	it("runs the whole suite when the diff cannot be computed at all", () => {
		// `undefined` is what a failed diff reports. Same reasoning: unknown must
		// not read as "nothing to do".
		expect(selectAffected(all, undefined)).toHaveLength(all.length);
	});

	it("runs the whole suite when a changed file maps to no chunk", () => {
		// A new top-level file with no owning package. The old fallback answered
		// this with smoke; the honest answer is "run everything".
		//
		// Deliberately built without the repo-root chunk: one of those matches
		// every diff by design (see the repo-root test below), and including it
		// here would make this assertion pass for the wrong reason.
		const packages = [tsChunk, otherChunk];

		expect(selectAffected(packages, ["README.md"]).map(c => c.label)).toEqual(["packages/utils", "packages/catalog"]);
	});

	it("still narrows to the one affected package when the diff does resolve", () => {
		// The negative control for the three above: fail-closed must not have
		// degraded into "always run everything", or the selector does no work.
		const packages = [tsChunk, otherChunk];

		expect(selectAffected(packages, ["packages/utils/src/logger.ts"]).map(c => c.label)).toEqual(["packages/utils"]);
	});

	it("runs the Rust suite for a Rust change instead of mistaking the runner script for a test file", () => {
		// `["bun","scripts/run-rs-task.ts","test:rs"]` names no test files, so the
		// chunk runs its whole suite and any change affects it. Read as a file list
		// it reacted only to a file literally named `scripts/run-rs-task.ts`, so a
		// commit touching a single `.rs` file ran no Rust at all.
		const selected = selectAffected(all, ["crates/pi-natives/src/lib.rs"]);

		expect(selected.map(c => c.label)).toContain("rust");
	});

	it("treats bunfig.toml as repo-wide", () => {
		// It carries `[run] bun = true`, which is exactly what
		// `run-node-invariants.mjs` generates in order to side-step it. A change
		// here alters how every test in the repo executes.
		expect(selectAffected(all, ["bunfig.toml"])).toHaveLength(all.length);
	});

	it("treats the formatter config as repo-wide", () => {
		expect(selectAffected(all, [".oxfmtrc.json"])).toHaveLength(all.length);
	});

	it("treats its own edits as repo-wide, because it is what performs the mapping", () => {
		// `--dry-run` reported this file as "(no test covers this)" — a selector
		// that could not see a change to itself. Any edit to the selection logic
		// must therefore run the suite it was about to narrow.
		expect(selectAffected(all, ["scripts/ci-test-ts.ts"])).toHaveLength(all.length);
	});

	it("keeps reacting to the repo-wide files it already handled", () => {
		// Guards the fix against being written as a replacement list rather than an
		// addition: dropping any of these re-opens a hole that was already closed.
		for (const file of ["package.json", "tsconfig.json", "bun.lock"]) {
			expect(selectAffected(all, [file])).toHaveLength(all.length);
		}
	});

	it("selects a repo-root chunk for every diff, because such a task skips itself when it has no work", () => {
		// Why the fail-closed fallback is rarely reached in practice, and why these
		// chunks must not be narrowed away: `run-rs-task.ts` decides for itself
		// whether Rust changed, so a chunk rooted at `.` is correct to answer "yes"
		// to every diff. Narrowing it would be the bug, not the fix.
		expect(selectAffected(all, ["README.md"]).map(c => c.label)).toEqual(["rust"]);
	});

	it("recognises a chunk by its test files whether they are .ts or .mjs", () => {
		// The packaging gates run as `node --test` over `.test.mjs`, the rest as
		// `bun test` over `.test.ts`. A file filter that only knew one extension
		// would drop the other's chunk into whole-package mode and over-select.
		const nodeChunk = {
			label: "packaging gates (node:test)",
			cwd: ".",
			command: ["node", "--test", "scripts/check-runtime-deps.test.mjs"],
		};
		const commands = [nodeChunk];

		expect(selectAffected(commands, ["scripts/check-runtime-deps.test.mjs"]).map(c => c.label)).toEqual([
			"packaging gates (node:test)",
		]);
		expect(selectAffected(commands, ["scripts/other.test.mjs"])).toHaveLength(commands.length);
	});
});

/**
 * A workspace package with no CI bucket is a suite that runs locally and never in
 * CI — the failure mode that is invisible precisely because it never goes red.
 * Three packages sat in this state while the ones that *were* registered passed
 * every run, which is what let it look healthy.
 *
 * The contract is coverage of the package list, not of any particular package:
 * adding `packages/evals`, `packages/stats` and `packages/metaharness` to a CI
 * bucket is invisible in review, because a bucket is a bare string in a file
 * nobody reads. This asserts the other direction — every directory with a
 * `package.json` is named somewhere — which fails the moment a package is added
 * and registered nowhere.
 */
describe("every workspace package is claimed by a CI bucket", () => {
	const repoRoot = path.resolve(import.meta.dir, "../../..");

	// Coding-agent is routed by its own bucket planner rather than by a package
	// list, so it has no entry to be missing from. Everything else must be named.
	const routedSeparately = new Set(["packages/coding-agent"]);

	const onDisk = readdirSync(path.join(repoRoot, "packages"), { withFileTypes: true })
		.filter(entry => entry.isDirectory())
		.map(entry => `packages/${entry.name}`)
		.filter(pkg => existsSync(path.join(repoRoot, pkg, "package.json")));

	const registered = new Set([
		...fastWorkspacePackages,
		...nativeAndIntegrationPackages,
		...localOnlyWorkspacePackages,
	]);

	// Same definition `collectTestsUnder` uses, so this gate and the collector
	// cannot disagree about what counts as a test.
	function countTests(pkg: string): number {
		let total = 0;
		const walk = (dir: string): void => {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				if (entry.isDirectory()) walk(path.join(dir, entry.name));
				else if (entry.isFile() && entry.name.endsWith(".test.ts")) total++;
			}
		};
		walk(path.join(repoRoot, pkg));
		return total;
	}

	it("names every package that has tests, so a new one cannot be added and forgotten", () => {
		// "Has tests" is the gate, not "exists": `packages/wire` and
		// `packages/browser-relay` carry no `*.test.ts`, so a bucket naming them
		// would spawn a chunk that runs nothing and reports green. An empty package
		// legitimately needs no bucket; a package whose tests never run does.
		const missing = onDisk.filter(pkg => !registered.has(pkg) && !routedSeparately.has(pkg) && countTests(pkg) > 0);

		// Reported as the list itself rather than a count: the reader needs the
		// names to act on, and a bare "expected 0, got 3" would not say which.
		expect(missing).toEqual([]);
	});

	it("points every registered package at a directory that exists", () => {
		// The other direction, and it fails the same way: a bucket naming a
		// directory that was renamed or removed runs nothing, and reports green
		// because `bun test` in a missing directory is not obviously a failure.
		const dangling = [...registered].filter(pkg => !existsSync(path.join(repoRoot, pkg)));

		expect(dangling).toEqual([]);
	});

	it("registers a package in exactly one bucket, so CI does not run its suite twice", () => {
		const seen = new Map<string, string[]>();
		for (const [bucket, packages] of [
			["fast", fastWorkspacePackages],
			["native", nativeAndIntegrationPackages],
			["local", localOnlyWorkspacePackages],
		] as const) {
			for (const pkg of packages) seen.set(pkg, [...(seen.get(pkg) ?? []), bucket]);
		}

		expect([...seen].filter(([, buckets]) => buckets.length > 1).map(([pkg]) => pkg)).toEqual([]);
	});
});
