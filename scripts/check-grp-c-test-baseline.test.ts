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

/** One fixed sha: the gate reads HEAD before and after the suite and must see them match. */
const STILL_HEAD = "0".repeat(40);

/**
 * A `git` on PATH that answers `rev-parse HEAD` with `shas[n]`, clamping to the last
 * entry once exhausted. Anything other than `rev-parse` is delegated to the real git,
 * so a stray call cannot be silently swallowed by the fake.
 *
 * Exists because this directory is not a repository: the real `git rev-parse HEAD`
 * exits 128, the gate reads that as "cannot say", and every case below would take the
 * VOID branch and assert about a verdict it never reached. The gate's own rule is that
 * an unreadable git is not a still tree, so the tests have to supply a readable one.
 */
async function installGitShim(dir: string, shas: readonly string[]): Promise<string> {
	const bin = path.join(dir, "gitbin");
	await fs.mkdir(bin, { recursive: true });
	const realGit = (await Bun.$`command -v git`.quiet().nothrow()).text().trim();
	if (!realGit) throw new Error("cannot resolve the real git to delegate to; the shim would swallow it");
	// The list lives in a file rather than in the script. Interpolating it as a
	// shell string does not work: `join("\n")` inside double quotes is a literal
	// backslash-n to `sh`, so the list collapsed to one line, `total` became 1, and
	// every call returned the first entry — a shim that cannot express a moved HEAD.
	// That failure is invisible from the gate's side, because a shim that always
	// answers the same sha is indistinguishable from a tree that never moved.
	const list = path.join(dir, "git-shas");
	await Bun.write(list, `${shas.join("\n")}\n`);
	await Bun.write(
		path.join(bin, "git"),
		`#!/bin/sh
case "$*" in
*rev-parse*) ;;
*) exec ${realGit} "$@" ;;
esac
n=0
if [ -f "${dir}/git-calls" ]; then n="$(cat "${dir}/git-calls")"; fi
n=$((n + 1))
printf '%s' "$n" > "${dir}/git-calls"
total="$(wc -l < "${list}" | tr -d " ")"
i=$((n - 1))
if [ "$i" -ge "$total" ]; then i=$((total - 1)); fi
sed -n "$((i + 1))p" "${list}"
`,
	);
	await fs.chmod(path.join(bin, "git"), 0o755);
	return bin;
}

const runGateWith = async (dir: string, gate: string, gitBin: string) =>
	ptree.exec([process.execPath, gate], {
		cwd: dir,
		allowNonZero: true,
		env: { ...Bun.env, NO_COLOR: "1", PATH: `${gitBin}:${Bun.env.PATH ?? ""}` },
	});

/**
 * Run the gate with the fake git first on PATH.
 *
 * `shas` is what successive `rev-parse HEAD` calls will report; it defaults to a head
 * that never moves, which is the precondition every other case in this file assumes.
 */
const runGate = async (dir: string, gate: string, shas: readonly string[] = [STILL_HEAD]) =>
	runGateWith(dir, gate, await installGitShim(dir, shas));

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
		using dir = TempDir.createSync("uw-grp-c-baseline-discrepant-");
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
		// This run is killed before the runner prints any tally, so the error count
		// is unread and must say so. Printing it as `0` is not a cosmetic slip: the
		// reconciliation subtracts this value, so an unread tally rendered as zero
		// shifts the arithmetic and can invert the verdict between under- and
		// over-counted — and the wrong answer then arrives looking settled.
		expect(result.stderr).toContain("? error");
		expect(result.stderr).not.toMatch(/\b0 error\b/);
		// The precise harm: a list this run cannot vouch for must not be allowed
		// to reach the "all present in the baseline" verdict.
		expect(result.stdout).not.toContain("all present in the baseline");
	}, 60_000);
	test("a suite that cannot load is not a clean suite", async () => {
		using dir = TempDir.createSync("uw-grp-c-baseline-broken-");
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
		using dir = TempDir.createSync("uw-grp-c-baseline-clean-");
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
		using dir = TempDir.createSync("uw-grp-c-baseline-new-");
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
		using dir = TempDir.createSync("uw-grp-c-baseline-tolerated-");
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
		using dir = TempDir.createSync("uw-grp-c-baseline-flaky-");
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
		using dir = TempDir.createSync("uw-grp-c-baseline-confirmed-");
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
		using dir = TempDir.createSync("uw-grp-c-baseline-thirdrun-");
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
		using dir = TempDir.createSync("uw-grp-c-baseline-unnamed-");
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

	test("two unnamed failures in different files get different identities", async () => {
		using dir = TempDir.createSync("uw-grp-c-baseline-unnamed-two-");
		// The single-file case above cannot catch this: with one unnamed failure
		// there is exactly one site, so scanning the whole log returns the right
		// answer for the wrong reason. Two files are what separate "picked the only
		// site" from "picked the site belonging to this failure".
		//
		// The failure this catches is not only lossy but false. Scanning from the
		// top of the log gave EVERY unnamed failure the first site in the log, so
		// these two collapsed into one identity and the second was written into the
		// baseline under the first file's name — an entry no later run could ever
		// reproduce, which reads as a permanent regression rather than a bug.
		for (const file of ["alpha", "beta"]) {
			await Bun.write(
				path.join(dir.absolute(), `${file}.test.ts`),
				`import { test, expect } from "bun:test";\ntest("", () => { expect(1).toBe(2); });\n`,
			);
		}
		const gate = await installGate(dir.absolute(), "./");

		const first = await runGate(dir.absolute(), gate);
		expect(first.exitCode).toBe(1);

		// Two distinct names, and each must name ITS OWN file. The old code
		// produced one name mentioning `alpha` twice.
		const learned = [...first.stderr.matchAll(/\+ (unnamed @ \S+)/g)].map(m => m[1]!);
		expect(new Set(learned).size).toBe(2);
		expect(learned.filter(name => name.includes("alpha")).length).toBe(1);
		expect(learned.filter(name => name.includes("beta")).length).toBe(1);

		// And the direction that matters in CI: both must be tolerated once the
		// baseline knows them. If either name moved, the gate is red forever on a
		// reason nobody can fix.
		await Bun.write(
			path.join(dir.absolute(), "r0-grp-c-test-baseline.json"),
			`${JSON.stringify({ ...BASELINE, failures: learned }, null, 2)}\n`,
		);
		const second = await runGate(dir.absolute(), gate);
		expect(second.exitCode).toBe(0);
		expect(second.stdout).toContain("2 failure(s) present in the baseline");
	}, 60_000);
});

/**
 * A verdict has to belong to one commit.
 *
 * This gate is a differential against a fixed captured list, so it is only sound while
 * the corpus is the one that was captured. A test ADDED after the capture and then
 * failed reads as a regression — red — with nobody having broken anything. On a shared
 * tree that is not a corner case, it is the normal case: the suite runs for minutes and
 * peers commit inside that window. The run then describes a tree that exists at no
 * commit, and its red would belong to no commit at all.
 */
describe("R0 GRP-C baseline gate: the run must belong to one commit", () => {
	test("a head that holds still still reaches its verdict", async () => {
		// Not decorative: this is the control that makes the VOID assertion below mean
		// something. A shim that answered nothing at all would also produce VOID, from
		// `liveHead` returning null rather than from a changed head — the same verdict
		// for a completely different reason, and the test would pass for the wrong one.
		using dir = TempDir.createSync("uw-grp-c-baseline-still-");
		await Bun.write(
			path.join(dir.absolute(), "clean.test.ts"),
			'import { test, expect } from "bun:test";\ntest("passes", () => { expect(1).toBe(1); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		const result = await runGate(dir.absolute(), gate, [STILL_HEAD]);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("grp-c baseline gate: green");
		expect(result.stderr).not.toContain("VOID");
	}, 60_000);

	test("a run that spans a commit is void, and says so", async () => {
		// The suite is a clean one, so without the guard this gate is green — which is
		// exactly why the case needs the guard to be load-bearing: a void run that fell
		// through to the normal verdict would report "no new failures" for a corpus that
		// was never the captured one.
		using dir = TempDir.createSync("uw-grp-c-baseline-void-");
		await Bun.write(
			path.join(dir.absolute(), "clean.test.ts"),
			'import { test, expect } from "bun:test";\ntest("passes", () => { expect(1).toBe(1); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		const gitBin = await installGitShim(dir.absolute(), ["1".repeat(40), "2".repeat(40)]);
		const ask = () => ptree.exec([path.join(gitBin, "git"), "rev-parse", "HEAD"], { cwd: dir.absolute() });
		// Assert the shim can actually move the head. A shim that always answers the
		// same sha leaves the gate green — indistinguishable, from the gate's side,
		// from a tree that never moved — and the VOID assertion below would then be
		// passing for a harness that cannot express the thing it is meant to test.
		expect((await ask()).stdout.toString().trim()).toBe("1".repeat(40));
		expect((await ask()).stdout.toString().trim()).toBe("2".repeat(40));
		// Those two probes consumed the sequence; the gate's own two reads start over.
		await fs.rm(path.join(dir.absolute(), "git-calls"), { force: true });

		const result = await runGateWith(dir.absolute(), gate, gitBin);
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("VOID");
		// It must not reach the verdict the run has no standing to make.
		expect(result.stdout).not.toContain("grp-c baseline gate: green");
	}, 60_000);

	test("a void run still reports what it measured, so 'unmeasurable' and 'measured, N new' differ", async () => {
		// WHY THIS ROW — the failure mode a reader hits without it.
		//
		// VOID is the right verdict on a tree that moves. But the run HAD already
		// measured: `current` is populated before the tree-still check, and the void
		// branch used to discard it and exit. So a caller reading only the gate's
		// output saw the identical "VOID" for two states that demand opposite
		// responses:
		//
		//   - an idle tree, where VOID means "re-run when quiet" (benign), and
		//   - a tree where a peer just landed two failing tests, where VOID is
		//     hiding a regression the reader must act on now.
		//
		// Nothing in the output distinguished them, which is what makes "accept VOID
		// as a valid outcome" unsafe as a policy: it silently merges "could not
		// measure" into "nothing to see".
		//
		// WHAT THIS ASSERTS — that the count survives the abstention. It does NOT
		// assert the gate became lenient: exit is still 1 and no verdict is claimed,
		// because the corpus changed. The count is labelled unconfirmed precisely
		// because the confirm re-run is skipped on this path.
		using dir = TempDir.createSync("uw-grp-c-baseline-void-count-");
		await Bun.write(
			path.join(dir.absolute(), "failing.test.ts"),
			'import { test, expect } from "bun:test";\ntest("a brand new regression", () => { expect(1).toBe(2); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		const gitBin = await installGitShim(dir.absolute(), ["1".repeat(40), "2".repeat(40)]);
		const result = await runGateWith(dir.absolute(), gate, gitBin);

		// Still VOID, still non-zero: the abstention is unchanged, and this row is
		// what stops a future edit from trading the verdict away to get the count.
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("VOID");
		expect(result.stdout).not.toContain("grp-c baseline gate: green");

		// The measurement that the void branch used to throw away.
		expect(result.stderr).toContain("Unconfirmed new failure(s) in this run: 1");
		// Named, so a reader can go look at WHICH test rather than only how many.
		expect(result.stderr).toContain("a brand new regression");
		// Labelled unconfirmed — a count presented as confirmed would be a
		// regression verdict this run has no standing to deliver.
		expect(result.stderr).toContain("not reproduced");
	}, 60_000);

	test("a void run over a clean suite reports zero, so an idle tree is still distinguishable", async () => {
		// The control for the row above, and the reason the count is worth printing.
		// Without it, "N new" could be satisfied by a gate that always prints the
		// suite's failure count regardless of what the baseline says — and the row
		// above would pass while measuring nothing about the baseline at all.
		//
		// Here the suite is clean AND the baseline is the shipped empty one, so the
		// correct report is 0. A gate that reported the raw failure count, or that
		// reported every baseline entry as new, would say something else.
		using dir = TempDir.createSync("uw-grp-c-baseline-void-clean-");
		await Bun.write(
			path.join(dir.absolute(), "clean.test.ts"),
			'import { test, expect } from "bun:test";\ntest("passes", () => { expect(1).toBe(1); });\n',
		);
		const gate = await installGate(dir.absolute(), "./");

		const gitBin = await installGitShim(dir.absolute(), ["1".repeat(40), "2".repeat(40)]);
		const result = await runGateWith(dir.absolute(), gate, gitBin);

		expect(result.exitCode).toBe(1);
		expect(result.stderr).toContain("VOID");
		expect(result.stderr).toContain("Unconfirmed new failure(s) in this run: 0");
		// Zero is a real result, so no per-test lines are printed — and, more to the
		// point, no failure is invented to fill the section.
		expect(result.stderr).not.toContain("~ passes");
	}, 60_000);
});
