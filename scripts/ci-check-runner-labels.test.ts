import { describe, expect, it } from "bun:test";
import {
	checkRunnerLabels,
	declaredSelfHostedLabels,
	documentedScaleSetNames,
	expressionLabels,
	isGitHubHosted,
	resolveLabels,
} from "./ci-check-runner-labels";

/**
 * The failure this gate exists for is invisible in CI.
 *
 * A job whose `runs-on:` names a label no runner registers is not rejected — it queues until
 * the 6-hour limit. CI stays green, the PR is not blocked, and the only symptom is a job that
 * never ran. So there is no running-the-real-gate way to observe the bug this defends; every
 * case here drives `checkRunnerLabels` with source text instead.
 *
 * That makes the last case load-bearing. A scanner that reports every quoted string in an
 * expression, or that reports nothing, both leave the tree green — the first by drowning the
 * real signal in phantoms, the second by never finding anything. The cases below are chosen
 * so that deleting the guard turns a specific one red.
 */

const ACTIONLINT_DECLARING_OMP_KATA = `
# actionlint only knows GitHub-hosted labels; register the self-hosted ARC
# runner scale set so \`runs-on: omp-kata\` lints clean.
self-hosted-runner:
   labels:
      - omp-kata
`;

function workflow(runsOn: string): string {
	return `name: ci\non: push\njobs:\n   build:\n      runs-on: ${runsOn}\n      steps:\n         - run: echo hi\n`;
}

describe("runs-on labels resolve to a runner", () => {
	it("passes a workflow on a GitHub-hosted image", () => {
		const result = checkRunnerLabels(
			[{ file: "w.yml", text: workflow("ubuntu-22.04") }],
			ACTIONLINT_DECLARING_OMP_KATA,
		);

		expect(result.offenders).toEqual([]);
		// The count is asserted so a scanner that silently checked nothing cannot pass here.
		expect(result.checked).toBe(1);
	});

	it("accepts a new GitHub-hosted image without amending the gate", () => {
		// GitHub ships new image versions continuously. A gate that enumerated them would be
		// amended with each release and then disabled, so the prefixes are what it matches on.
		expect(isGitHubHosted("ubuntu-26.04")).toBe(true);
		expect(isGitHubHosted("windows-13-arm")).toBe(true);
		expect(isGitHubHosted("macos-15")).toBe(true);
		expect(isGitHubHosted("self-hosted")).toBe(true);
	});

	it("accepts a self-hosted label the repo declares", () => {
		const result = checkRunnerLabels([{ file: "w.yml", text: workflow("omp-kata") }], ACTIONLINT_DECLARING_OMP_KATA);

		expect(result.offenders).toEqual([]);
		expect(result.checked).toBe(1);
	});

	it("rejects a self-hosted label the repo does not declare", () => {
		// The rename accident this defends: the label was de-branded in the workflow and
		// nothing complained, because the job would simply never be picked up again.
		const result = checkRunnerLabels([{ file: "w.yml", text: workflow("omp-katta") }], ACTIONLINT_DECLARING_OMP_KATA);

		expect(result.offenders.map(use => use.label)).toEqual(["omp-katta"]);
		expect(result.offenders[0]?.file).toBe("w.yml");
		// The line is what makes the failure actionable; without it the message names a file
		// of several hundred lines and nothing else.
		expect(result.offenders[0]?.line).toBeGreaterThan(0);
	});

	it("reads labels out of a branch-selecting expression", () => {
		// How 10 of this repo's jobs actually choose a runner. Ignoring expressions would
		// skip most of the file, which is the whole reason the gate is not a grep for `omp`.
		const source = workflow("${{ github.event_name == 'pull_request' && 'ubuntu-22.04' || 'omp-kata' }}");

		expect(resolveLabels("${{ github.event_name == 'pull_request' && 'ubuntu-22.04' || 'omp-kata' }}")).toEqual([
			"ubuntu-22.04",
			"omp-kata",
		]);
		// Both resolve, so this workflow is clean — and it is clean for the right reason.
		expect(checkRunnerLabels([{ file: "w.yml", text: source }], ACTIONLINT_DECLARING_OMP_KATA).offenders).toEqual([]);
	});

	it("does not read a comparison operand as a runner label", () => {
		// Regression. `'pull_request'` is the event name under test, never a runner. Reporting
		// it produced ten phantom offenders on a clean tree, which is the failure mode where a
		// gate fires on everything and so distinguishes nothing.
		expect(expressionLabels("github.event_name == 'pull_request' && 'ubuntu-22.04' || 'omp-kata'")).toEqual([
			"ubuntu-22.04",
			"omp-kata",
		]);
		expect(expressionLabels("github.event_name != 'pull_request' && 'omp-kata'")).toEqual(["omp-kata"]);
		// An undeclared label in the result position is still caught through the same path.
		const source = workflow("${{ github.event_name == 'pull_request' && 'ubuntu-22.04' || 'omp-katta' }}");
		expect(
			checkRunnerLabels([{ file: "w.yml", text: source }], ACTIONLINT_DECLARING_OMP_KATA).offenders.map(
				u => u.label,
			),
		).toEqual(["omp-katta"]);
	});

	it("leaves a matrix reference alone instead of reporting it as a label", () => {
		// `matrix.os` is not a label and cannot be resolved statically. Reporting it would put
		// a false offender in every matrix job's way.
		expect(resolveLabels("${{ matrix.os }}")).toEqual([]);
	});

	it("reads the declaration from actionlint.yaml, not from the comment above it", () => {
		// The comment in the real file names `omp-kata` too. A grep for the label would find the
		// comment and pass on a file that declares nothing, which is why this is parsed.
		const commentOnly = "# register omp-kata so runs-on: omp-kata lints clean\nself-hosted-runner:\n   labels: []\n";

		expect(declaredSelfHostedLabels(commentOnly).has("omp-kata")).toBe(false);
		expect(
			checkRunnerLabels([{ file: "w.yml", text: workflow("omp-kata") }], commentOnly).offenders.map(u => u.label),
		).toEqual(["omp-kata"]);
	});

	it("treats an absent actionlint.yaml as declaring nothing", () => {
		expect(declaredSelfHostedLabels("")).toEqual(new Set());
	});

	it("leaves an unparseable workflow to actionlint", () => {
		// This gate must not blame itself for a syntax error it never got to reason about;
		// actionlint owns that, and a second opinion here would double-report.
		const result = checkRunnerLabels(
			[{ file: "w.yml", text: "jobs:\n  - [unclosed\n" }],
			ACTIONLINT_DECLARING_OMP_KATA,
		);

		expect(result.checked).toBe(0);
		expect(result.offenders).toEqual([]);
	});
});

/**
 * The deployed runner group is configured outside this repository, so the ARC doc and
 * `actionlint.yaml` are the only two in-repo statements of what the runner answers to. Nothing
 * connects them, so a rename applied to one drifts from the other silently — and a drifted label
 * is the queue-forever case above, reached by a different route.
 */
const ARC_DOC_DECLARING_OMP_KATA = [
	"# setup",
	"",
	"```yaml",
	"runnerScaleSetName: omp-kata",
	"minRunners: 0",
	"```",
	"",
	"Field by field:",
	"",
	"- **`runnerScaleSetName: omp-kata`** - the runner label. This is the string that",
	"  goes in a workflow's `runs-on:`.",
	"",
	"Set it per repo:",
	"",
	"  helm upgrade \\",
	"    --set runnerScaleSetName=<other-repo>-kata \\",
	"#runnerScaleSetName: commented-out-stale-name",
	"runnerScaleSetName: annotated-value  # trailing note, not a bare assignment",
	"```",
].join("\n");

describe("the ARC doc and the repo's declaration name the same runner", () => {
	it("finds the declaration and ignores every other mention of the key", () => {
		// The doc mentions `runnerScaleSetName` four ways. Only one is an assignment; reading
		// the others would gate on prose — red whenever a sentence is reworded — and the
		// `--set key=<other-repo>-kata` example would be taken for a real label named
		// `<other-repo>-kata`, which is a placeholder, not a runner.
		expect(documentedScaleSetNames(ARC_DOC_DECLARING_OMP_KATA)).toEqual(["omp-kata"]);
	});

	it("is quiet when the doc and the declaration agree", () => {
		const result = checkRunnerLabels([], ACTIONLINT_DECLARING_OMP_KATA, ARC_DOC_DECLARING_OMP_KATA);

		expect(result.drift).toEqual([]);
	});

	it("reports drift when the doc names a group the repo does not declare", () => {
		// The rename applied to the doc but not to actionlint.yaml: every workflow still asks for
		// `omp-kata`, the cluster now answers to something else, and no gate in the repo said so.
		const renamed = ARC_DOC_DECLARING_OMP_KATA.replace(
			"runnerScaleSetName: omp-kata",
			"runnerScaleSetName: ultraworkers-kata",
		);

		const result = checkRunnerLabels([], ACTIONLINT_DECLARING_OMP_KATA, renamed);

		expect(result.drift.map(entry => entry.name)).toEqual(["ultraworkers-kata"]);
		expect(result.drift[0]?.line).toBeGreaterThan(0);
	});

	it("skips the cross-check when there is no ARC doc", () => {
		// A repository without ARC infrastructure has nothing to cross-check, and that must read
		// as clean rather than as a missing file.
		expect(checkRunnerLabels([], ACTIONLINT_DECLARING_OMP_KATA).drift).toEqual([]);
	});

	it("reports a declared label the ARC doc never documents as a deployed scale set", () => {
		// The drift check only ran ARC-doc → declaration. Declaring a fabricated label and then
		// using it satisfied both existing checks — it is declared (so not an offender), and the
		// doc's real name is still declared (so no drift) — while no runner answers to it. This is
		// the one failure the gate exists to prevent, arriving through the front door.
		const actionlint = `${ACTIONLINT_DECLARING_OMP_KATA}      - ghost-label\n`;

		const result = checkRunnerLabels(
			[{ file: "w.yml", text: workflow("ghost-label") }],
			actionlint,
			ARC_DOC_DECLARING_OMP_KATA,
		);

		expect(result.undocumented.map(entry => entry.label)).toEqual(["ghost-label"]);
		expect(result.undocumented[0]?.file).toBe("w.yml");
		// The label is declared, so it must NOT also be reported as an unknown label — that would
		// be the same finding counted twice, once under each heading.
		expect(result.offenders).toEqual([]);
		expect(result.drift).toEqual([]);
	});

	it("stays quiet when the label in use is the one the ARC doc documents", () => {
		// The ordinary case, and the one that must not regress into a false positive: `omp-kata`
		// is declared *and* documented, so nothing is reported.
		const result = checkRunnerLabels(
			[{ file: "w.yml", text: workflow("omp-kata") }],
			ACTIONLINT_DECLARING_OMP_KATA,
			ARC_DOC_DECLARING_OMP_KATA,
		);

		expect(result.undocumented).toEqual([]);
		expect(result.offenders).toEqual([]);
		expect(result.drift).toEqual([]);
	});

	it("reports each undocumented label once, however many jobs use it", () => {
		// Ten of this repo's jobs select the runner through one ternary, so a per-use report would
		// name the same dead label ten times and bury anything else.
		const jobs = [1, 2, 3]
			.map(n => `   job${n}:\n      runs-on: ghost-label\n      steps:\n         - run: echo hi`)
			.join("\n");
		const actionlint = `${ACTIONLINT_DECLARING_OMP_KATA}      - ghost-label\n`;

		const result = checkRunnerLabels(
			[{ file: "w.yml", text: `name: ci\njobs:\n${jobs}\n` }],
			actionlint,
			ARC_DOC_DECLARING_OMP_KATA,
		);

		expect(result.undocumented.map(entry => entry.label)).toEqual(["ghost-label"]);
	});

	it("does not report a label the ARC doc documents even if the linting file lists others", () => {
		// Declaring a label that is never used is not a defect — `actionlint.yaml` may legitimately
		// name more than the ARC doc enumerates. Only a label a workflow actually asks for can
		// strand a job, so only those are reported.
		const actionlint = `${ACTIONLINT_DECLARING_OMP_KATA}      - unused-label\n`;

		const result = checkRunnerLabels(
			[{ file: "w.yml", text: workflow("omp-kata") }],
			actionlint,
			ARC_DOC_DECLARING_OMP_KATA,
		);

		expect(result.undocumented).toEqual([]);
	});

	it("stays quiet when the ARC doc names no scale set at all", () => {
		// A doc with no `runnerScaleSetName:` assignment carries no truth to compare against. A
		// check that fails when its input is absent would report every declared label as phantom.
		const actionlint = `${ACTIONLINT_DECLARING_OMP_KATA}      - ghost-label\n`;

		const result = checkRunnerLabels(
			[{ file: "w.yml", text: workflow("ghost-label") }],
			actionlint,
			"# nothing declares a scale set here\n",
		);

		expect(result.undocumented).toEqual([]);
	});
});
