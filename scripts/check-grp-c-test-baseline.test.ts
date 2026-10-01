/**
 * The R0 GRP-C test-baseline gate must distinguish "the suite is clean" from
 * "the suite never ran", and must keep tolerating the failures it was given.
 *
 * The first is the dangerous one. `collectFailures` learns the failing test names
 * by parsing `(fail)` lines, and a suite that cannot load never prints one —
 * `bun test` reports it as `error:` and exits non-zero. The gate therefore saw an
 * empty failure set, called the run clean, and then announced every baseline
 * entry as healed and told the reader to delete them. Measured before the fix,
 * on a suite whose only test has a bad import: `bun test` exited 1 reporting
 * `1 fail / 1 error`, and the gate printed `green`, exited 0, and recommended
 * dropping both baseline entries. That is fail-open and destructive at once.
 *
 * The gate is run as a subprocess against a temporary suite rather than
 * exercised through its internals. `SUITE` is a module constant pointing at
 * `packages/coding-agent/test/`, far too slow to run here, so the script is
 * copied with that one line repointed — and the repoint is asserted, because a
 * silent no-op would leave the test asserting nothing while still going green.
 */
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { ptree, TempDir } from "@oh-my-pi/pi-utils";

const GATE = path.join(import.meta.dir, "check-grp-c-test-baseline.ts");

const BASELINE = {
	capturedAt: "2026-10-02",
	head: "test",
	note: "fixture",
	// No file prefix: `bun test` emits `(fail) <test name>` and nothing else. My first
	// draft wrote `known > …` here, which is how the runner *displays* a failure in its
	// summary but not how it appears on the line the gate parses — so the gate correctly
	// called it a new failure and the test was wrong, not the gate.
	failures: ["a failure the baseline already tolerates"],
};

/** Copy the gate into `dir`, pointing SUITE at `suite`. Asserts the repoint landed. */
async function installGate(dir: string, suite: string): Promise<string> {
	const source = await Bun.file(GATE).text();
	const anchored = 'const SUITE = "packages/coding-agent/test/";';
	expect(source.split(anchored)).toHaveLength(2); // exactly one — a rename must fail loudly here
	const target = path.join(dir, "check-grp-c-test-baseline.ts");
	await Bun.write(target, source.replace(anchored, `const SUITE = "${suite}";`));
	await Bun.write(path.join(dir, "r0-grp-c-test-baseline.json"), `${JSON.stringify(BASELINE, null, 2)}\n`);
	return target;
}

const runGate = (dir: string, gate: string) =>
	ptree.exec([process.execPath, gate], { cwd: dir, allowNonZero: true, env: { ...Bun.env, NO_COLOR: "1" } });

describe("R0 GRP-C test-baseline gate", () => {
	test("a suite that cannot load is not a clean suite", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-broken-");
		await Bun.write(
			path.join(dir.absolute(), "broken.test.ts"),
			'import { nope } from "./does-not-exist";\nconsole.log(nope);\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		// The suite genuinely fails — assert that first, so a green gate below
		// cannot be explained by the fixture quietly turning into a passing suite.
		const raw = await ptree.exec(["bun", "test", "./"], { cwd: dir.absolute(), allowNonZero: true });
		expect(raw.exitCode).not.toBe(0);

		const result = await runGate(dir.absolute(), gate);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("did not run to completion");
		// The specific harm being prevented: telling the reader their real,
		// still-failing baseline entries are healed and may be deleted.
		expect(result.stdout).not.toContain("now pass");
	}, 60_000);

	test("a clean suite is green, and a known failure stays tolerated", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-clean-");
		await Bun.write(
			path.join(dir.absolute(), "fine.test.ts"),
			'import { test, expect } from "bun:test";\ntest("passes", () => { expect(1).toBe(1); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		// A genuinely clean run: exit 0, and the tolerated failure is reported as
		// healed rather than treated as a new failure. Growth in the other
		// direction is the contract the gate exists to keep.
		const clean = await runGate(dir.absolute(), gate);
		expect(clean.exitCode).toBe(0);
		expect(clean.stdout).toContain("now pass");
	}, 60_000);

	test("a failure that is in the baseline does not go red", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-tolerated-");
		await Bun.write(
			path.join(dir.absolute(), "known.test.ts"),
			'import { test, expect } from "bun:test";\ntest("a failure the baseline already tolerates", () => { expect(1).toBe(2); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		// The whole reason a baseline exists: the suite is red at HEAD, and a
		// merge step may not make it redder. It must not go red here.
		const tolerated = await runGate(dir.absolute(), gate);
		expect(tolerated.exitCode).toBe(0);
		expect(tolerated.stdout).toContain("all present in the baseline");
	}, 60_000);
});
