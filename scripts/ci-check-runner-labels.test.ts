import { describe, expect, it } from "bun:test";
import {
	checkRunnerLabels,
	declaredSelfHostedLabels,
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
