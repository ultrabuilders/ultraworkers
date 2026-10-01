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
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ptree, TempDir } from "@oh-my-pi/pi-utils";

const GATE = path.join(import.meta.dir, "check-grp-c-test-baseline.ts");

/**
 * The gate parses failures with this repo's own extractor rather than a private
 * regex, because that extractor reconciles the `(fail)` lines against bun's tally.
 * Copying the gate alone would therefore leave it importing a module that is not
 * there, and all four tests would go red for a missing file — a harness failure
 * wearing the costume of a gate failure. Both modules travel together, as they do
 * in the repo.
 */
const EXTRACTOR = path.join(import.meta.dir, "ci-failure-extract.ts");

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
	await Bun.write(path.join(dir, path.basename(EXTRACTOR)), await Bun.file(EXTRACTOR).text());
	await Bun.write(path.join(dir, "r0-grp-c-test-baseline.json"), `${JSON.stringify(BASELINE, null, 2)}\n`);
	return target;
}

const runGate = (dir: string, gate: string) =>
	ptree.exec([process.execPath, gate], { cwd: dir, allowNonZero: true, env: { ...Bun.env, NO_COLOR: "1" } });

/**
 * Runs the gate against a run it cannot reconcile: named `(fail)` lines with no
 * `<n> fail` summary to check them against.
 *
 * That is the shape of a silently truncated measurement, and it is the one case
 * the reference implementation let through — its own header calls it "the one
 * that looks most like a complete list". A gate that decided "no new failures"
 * from such a list would report a partial observation as a clean suite.
 *
 * Produced for real rather than stubbed: a test that calls `process.exit` kills
 * the runner before it prints the summary, which is what a crashed or externally
 * killed suite does. My first fixture used a `beforeEach` throw instead, and the
 * test's own control caught it — bun tallies that as an `error`, which the
 * extractor already subtracts, so the run reconciled fine and proved nothing.
 */
async function installUnreconcilableSuite(dir: string): Promise<void> {
	await Bun.write(
		path.join(dir, "tally.test.ts"),
		'import { test, expect } from "bun:test";\n' +
			'test("gets a name", () => { expect(1).toBe(2); });\n' +
			'test("dies before the summary prints", () => { process.exit(1); });\n',
	);
}

describe("R0 GRP-C test-baseline gate", () => {
	test("a failure list it cannot reconcile is not a clean list", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-discrepant-");
		await installUnreconcilableSuite(dir.absolute());
		const gate = await installGate(dir.absolute(), "./");

		// Control: the fixture really does produce a run with names and NO summary.
		// Without this the assertions below could pass via a different branch.
		const raw = await ptree.exec(["bun", "test", "./"], { cwd: dir.absolute(), allowNonZero: true });
		const out = `${raw.stdout}${raw.stderr}`;
		expect(out.split("\n").filter(line => line.startsWith("(fail)")).length).toBeGreaterThan(0);
		expect(/^\s*\d+\s+fail\b/m.test(out)).toBe(false);

		const result = await runGate(dir.absolute(), gate);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("could not be reconciled");
		// The precise harm: a list this run cannot vouch for must not be allowed
		// to reach the "all present in the baseline" verdict.
		expect(result.stdout).not.toContain("all present in the baseline");
	}, 60_000);
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

	test("a failure absent from the baseline goes red, and names itself", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-new-");
		await Bun.write(
			path.join(dir.absolute(), "regressed.test.ts"),
			'import { test, expect } from "bun:test";\ntest("a regression the baseline never tolerated", () => { expect(1).toBe(2); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		// The primary contract, and the one the other two tests do not reach: they
		// only ever prove what happens to failures the baseline KNOWS about. If the
		// `(fail)` parse silently found nothing, those two still pass — the clean run
		// reports zero failures, and the tolerated run finds no *new* ones. Only a
		// genuine parse that lands on a name the baseline lacks proves the gate can
		// see a regression at all, which is the entire reason it exists.
		const red = await runGate(dir.absolute(), gate);
		expect(red.exitCode).toBe(1);
		expect(red.stderr).toContain("NEW failure(s) not in the baseline");
		expect(red.stderr).toContain("a regression the baseline never tolerated");
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
		// The count reported must be the one the baseline actually accounts for.
		// This line used to read "1 failure(s), all present in the baseline" from
		// `current.size`, which is every failure in the run — so once the re-run
		// forgives a name it claimed numbers the baseline does not contain. A real
		// run printed `719 failure(s), all present` against a 716-entry baseline.
		expect(tolerated.stdout).toContain("1 failure(s) present in the baseline");
	}, 60_000);

	test("a failure that does not reproduce on re-run is load, not a regression", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-flaky-");
		// Fails on the first run of the process and passes on the second, which is
		// what a load-dependent failure looks like from the gate's side — and is
		// produced deterministically here by a counter file, so the test asserts
		// the branch rather than waiting for the machine to be busy.
		await Bun.write(
			path.join(dir.absolute(), "flaky.test.ts"),
			'import { test, expect } from "bun:test";\n' +
				'import * as fs from "node:fs";\n' +
				`const MARK = ${JSON.stringify(path.join(dir.absolute(), ".gate-runs"))};\n` +
				'const runs = fs.existsSync(MARK) ? Number(fs.readFileSync(MARK, "utf8")) : 0;\n' +
				"fs.writeFileSync(MARK, String(runs + 1));\n" +
				// Fails on the gate's first internal run and passes on its second.
				// Keyed on a counter this fixture owns, NOT on a one-shot marker: a
				// marker is consumed by whatever ran first, and my own pre-check
				// consumed it — the gate's first pass then came back green and the
				// branch under test was never entered.
				'test("passes only on the second run", () => {\n' +
				"  if (runs === 0) expect(1).toBe(2);\n" +
				"});\n",
		);
		const gate = await installGate(dir.absolute(), "./");

		// Control: the fixture really is red-then-green, so the gate's green verdict
		// below cannot be explained by a test that simply never fails.
		const first = await ptree.exec(["bun", "test", "./"], { cwd: dir.absolute(), allowNonZero: true });
		expect(`${first.stdout}${first.stderr}`).toContain("(fail) passes only on the second run");
		await fs.rm(path.join(dir.absolute(), ".gate-runs"), { force: true }); // rewind for the gate's own runs

		const result = await runGate(dir.absolute(), gate);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("did not reproduce on re-run");
		expect(result.stdout).toContain("No third attempt");
	}, 60_000);

	test("a failure that reproduces on re-run is still red", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-confirmed-");
		// Deterministically failing, so it fails on the second run as well. This is
		// the direction that must NOT be forgiven: it is the whole reason the
		// re-run stops after one attempt. A gate that kept retrying until green
		// would pass any regression flaky enough, which makes it measure a
		// probability rather than a fact.
		await Bun.write(
			path.join(dir.absolute(), "solid.test.ts"),
			'import { test, expect } from "bun:test";\ntest("fails every single run", () => { expect(1).toBe(2); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		const result = await runGate(dir.absolute(), gate);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("NEW failure(s) not in the baseline");
		expect(result.stderr).toContain("fails every single run");
		// Confirmed, so it must NOT also appear in the load bucket — a name cannot
		// be both a regression and forgiven noise.
		expect(result.stderr).not.toContain("~ fails every single run");
	}, 60_000);

	test("two failures are red even though a third run would be green", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-thirdrun-");
		// The failure a LOOPING gate would forgive: red, red, then green. This is
		// the whole reason the re-run stops after one attempt, so it is the case
		// that decides whether that limit is a contract or a comment.
		//
		// My first fixture here failed on every run, which pins nothing: no number
		// of retries can hide a test that never passes, so the mutant that retries
		// until green survived it. This one is green on the third run, which is
		// exactly what that mutant needs.
		await Bun.write(
			path.join(dir.absolute(), "thrice.test.ts"),
			'import { test, expect } from "bun:test";\n' +
				'import * as fs from "node:fs";\n' +
				`const MARK = ${JSON.stringify(path.join(dir.absolute(), ".runs"))};\n` +
				'const runs = fs.existsSync(MARK) ? Number(fs.readFileSync(MARK, "utf8")) : 0;\n' +
				"fs.writeFileSync(MARK, String(runs + 1));\n" +
				'test("red twice then green", () => {\n' +
				"  if (runs < 2) expect(1).toBe(2);\n" +
				"});\n",
		);
		const gate = await installGate(dir.absolute(), "./");

		const result = await runGate(dir.absolute(), gate);
		// Fails on both of the gate's runs, so it is red — and the gate must have
		// stopped there rather than buying a third run that would have been green.
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("red twice then green");

		// Proof it stopped, from the fixture rather than from the gate's own words:
		// the counter file records how many times the suite ran. Two runs means the
		// gate declined the third. My first assertion here looked for a "No third
		// attempt" string on stderr, but that line only prints on the GREEN path —
		// the gate was right and my assertion was wrong, the same inversion the
		// first fixture in this file produced.
		expect(await Bun.file(path.join(dir.absolute(), ".runs")).text()).toBe("2");
	}, 60_000);

	test("an unnamed failure keeps one identity across runs", async () => {
		using dir = TempDir.createSync("omp-grp-c-baseline-unnamed-");
		// `test("")` makes bun print `(fail)  [0.19ms]`, so a duration-stripping
		// parse takes the DURATION as the name. Measured on identical code: run A
		// produced the identity `[0.11ms]` and run B `[0.87ms]` — so such a test
		// never matches its own baseline entry and is reported as a new failure on
		// every run forever. A gate that is permanently red for a reason nobody can
		// fix is a gate that gets switched off.
		await Bun.write(
			path.join(dir.absolute(), "anon.test.ts"),
			'import { test, expect } from "bun:test";\ntest("", () => { expect(1).toBe(2); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		// First run: the identity the gate chooses, and it must be a location rather
		// than a duration.
		const first = await runGate(dir.absolute(), gate);
		expect(first.exitCode).toBe(1);
		expect(first.stderr).toMatch(/\+ unnamed @ \S+anon\.test\.ts/);
		expect(first.stderr).not.toMatch(/\+ unnamed @ \[\d/);

		// Second run with that identity in the baseline: it must now be TOLERATED.
		// This is the direction that matters — if the identity moved, the gate goes
		// red again here and would have been red on every run in CI.
		const learned = /\+ (unnamed @ \S+)/.exec(first.stderr)?.[1];
		expect(learned).toBeDefined();
		await Bun.write(
			path.join(dir.absolute(), "r0-grp-c-test-baseline.json"),
			`${JSON.stringify({ ...BASELINE, failures: [learned!] }, null, 2)}\n`,
		);
		const second = await runGate(dir.absolute(), gate);
		expect(second.exitCode).toBe(0);
		expect(second.stdout).toContain("1 failure(s) present in the baseline");
	}, 60_000);
});
