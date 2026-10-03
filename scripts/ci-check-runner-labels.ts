#!/usr/bin/env bun
/**
 * Every `runs-on:` label a workflow uses must be a label a runner will actually answer to.
 *
 * ## Why this is a gate and not a lint
 *
 * A wrong `runs-on:` label does not fail the way a typo fails. The runner scale set that
 * serves this repo is `omp-kata` (`infra/docs/04-arc-and-caching.md`), deployed with
 * `minRunners: 0`. A job naming a label no runner registers is not rejected at submission —
 * it is **queued forever**, because there is simply nothing that will ever pick it up. So the
 * usual signals are all silent: CI is not red, the PR is not blocked, and the only evidence is
 * a job that ran until it hit the 6-hour limit.
 *
 * The rename sweep cannot cover this either. `check-disposition.ts` globs a set of script
 * extensions that stops at `py` and `sh` — no `yml`, no `yaml` — so a workflow file can be
 * renamed wholesale without a single gate noticing. That is the hole `disposition.tsv` rows
 * do not close: a row protects a string inside a file, not the label a runner registers.
 *
 * ## What it checks
 *
 * A label is acceptable when it is either
 *   - a GitHub-hosted label this gate knows (`ubuntu-*`, `windows-*`, `macos-*`), or
 *   - declared in `.github/actionlint.yaml` under `self-hosted-runner.labels`.
 *
 * The second list is the repo's own declaration of which self-hosted labels exist, so the
 * check is closed over the repository: renaming the label in a workflow without adding it
 * there is caught here, and `actionlint` lints the same file clean either way.
 *
 * Expressions are skipped, not parsed: `runs-on: ${{ … }}` is a runtime value whose labels are
 * chosen by the branch, and every string literal inside one is checked separately below.
 */

import * as path from "node:path";

/** Files whose `runs-on:` is meaningful. Composite actions declare it per-step, not per-job. */
const WORKFLOW_GLOB = ".github/workflows/*.{yml,yaml}";
const ACTIONLINT_PATH = ".github/actionlint.yaml";

/**
 * GitHub-hosted runner labels. Matched by prefix because GitHub ships new images on new
 * version strings continuously (`ubuntu-24.04` today, `ubuntu-26.04` tomorrow) and a gate
 * that had to be amended for each one would rot into being disabled.
 */
const GITHUB_HOSTED_PREFIXES = ["ubuntu-", "windows-", "macos-"];

/** Labels GitHub defines that are not OS images. */
const GITHUB_HOSTED_EXACT = new Set(["self-hosted"]);

interface RunnerLabelUse {
	readonly label: string;
	readonly file: string;
	/** 1-based line, so the failure names a place a human can jump to. */
	readonly line: number;
}

/**
 * Yield every string literal appearing in a `runs-on:` value.
 *
 * A `runs-on:` is either a bare label, a sequence of labels, or an expression that picks
 * between them. All three forms are common here, and the third hides labels that are still
 * real — `github.event_name == 'pull_request' && 'ubuntu-22.04' || 'omp-kata'` is how 10 of
 * this repo's jobs select a runner, so ignoring expressions would skip most of the file.
 */
export function literalLabels(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(entry => literalLabels(entry));
	return [];
}

/**
 * Pull the string literals out of a `${{ … }}` expression.
 *
 * This is deliberately a lexical scan for quoted runs, not an evaluator: an expression is
 * arbitrary user code and cannot be resolved at lint time. What matters is that a literal
 * which names a runner still gets checked, so `… || 'omp-kata'` is caught while
 * `matrix.os` is left alone.
 *
 * Not every quoted run is a label. In this repo's common form
 *
 *     github.event_name == 'pull_request' && 'ubuntu-22.04' || 'omp-kata'
 *
 * `'pull_request'` is the thing being compared, and the branch selector, not a runner. Treating
 * it as a label made the gate report ten phantom offenders on a clean tree — a scanner that
 * fires on everything has stopped discriminating, so operands of a comparison are dropped and
 * only the ternary's result positions are read as labels.
 */
export function expressionLabels(value: string): string[] {
	const labels: string[] = [];
	const pattern = /'([^']+)'|"([^"]+)"/g;
	for (const match of value.matchAll(pattern)) {
		const label = match[1] ?? match[2];
		if (label === undefined) continue;
		const before = value.slice(0, match.index).trimEnd();
		// `== 'x'` / `!= 'x'` compare against the literal; `x` is a value under test.
		if (/[=!]==?$/.test(before)) continue;
		labels.push(label);
	}
	return labels;
}

/** Resolve one `runs-on:` value to the labels it can name. */
export function resolveLabels(value: unknown): string[] {
	if (typeof value !== "string") return literalLabels(value);
	if (!value.includes("${{")) return [value];
	return expressionLabels(value);
}

/** True when GitHub itself provides a runner for this label. */
export function isGitHubHosted(label: string): boolean {
	return GITHUB_HOSTED_EXACT.has(label) || GITHUB_HOSTED_PREFIXES.some(prefix => label.startsWith(prefix));
}

/**
 * Self-hosted labels the repo declares, read from `.github/actionlint.yaml`.
 *
 * Parsed rather than grepped: the file is YAML with a nested `self-hosted-runner.labels`
 * sequence, and a regex over its text would also match the comment above it that names the
 * same label — which would make the gate pass on a file that declares nothing.
 */
export function declaredSelfHostedLabels(source: string): Set<string> {
	const parsed: unknown = Bun.YAML.parse(source);
	if (parsed === null || typeof parsed !== "object") return new Set();
	const runner = (parsed as Record<string, unknown>)["self-hosted-runner"];
	if (runner === null || typeof runner !== "object") return new Set();
	const labels = (runner as Record<string, unknown>).labels;
	if (!Array.isArray(labels)) return new Set();
	return new Set(labels.filter((entry): entry is string => typeof entry === "string"));
}

/** Walk the parsed workflow tree and collect every `runs-on:` it declares. */
export function collectRunsOn(parsed: unknown, file: string, lines: readonly string[]): RunnerLabelUse[] {
	const uses: RunnerLabelUse[] = [];
	const record = (raw: unknown): void => {
		for (const label of resolveLabels(raw)) {
			// `line` is resolved by the caller's text scan; recorded as 0 until then.
			uses.push({ label, file, line: 0 });
		}
	};
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) {
			for (const entry of node) visit(entry);
			return;
		}
		if (node === null || typeof node !== "object") return;
		for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
			if (key === "runs-on") record(value);
			else visit(value);
		}
	};
	visit(parsed);
	// Attach real line numbers by finding the label in the source; a label can repeat, and an
	// approximate line still points a human at the right job.
	return uses.map(use => ({ ...use, line: findLine(lines, use.label) }));
}

function findLine(lines: readonly string[], label: string): number {
	const quoted = `runs-on: ${label}`;
	for (const [index, line] of lines.entries()) {
		if (line.includes(quoted)) return index + 1;
	}
	for (const [index, line] of lines.entries()) {
		if (line.includes(label)) return index + 1;
	}
	return 0;
}

export interface CheckResult {
	readonly offenders: readonly RunnerLabelUse[];
	readonly checked: number;
}

/**
 * The check itself, over already-read sources.
 *
 * Split from the IO so a test can drive it with strings — the failure this gate defends is
 * invisible in CI precisely because nothing reads the workflow files, so testing it needs
 * inputs no amount of running the real gate would produce.
 */
export function checkRunnerLabels(sources: readonly { file: string; text: string }[], actionlint: string): CheckResult {
	const declared = declaredSelfHostedLabels(actionlint);
	const offenders: RunnerLabelUse[] = [];
	let checked = 0;
	for (const { file, text } of sources) {
		let parsed: unknown;
		try {
			parsed = Bun.YAML.parse(text);
		} catch {
			// A workflow that does not parse is actionlint's problem, not this gate's. Reporting
			// it here would blame this check for a syntax error it never got to reason about.
			continue;
		}
		for (const use of collectRunsOn(parsed, file, text.split("\n"))) {
			checked += 1;
			if (isGitHubHosted(use.label) || declared.has(use.label)) continue;
			offenders.push(use);
		}
	}
	return { offenders, checked };
}

async function collectSources(root: string): Promise<{ file: string; text: string }[]> {
	const glob = new Bun.Glob(WORKFLOW_GLOB);
	const sources: { file: string; text: string }[] = [];
	for await (const relative of glob.scan({ cwd: root, dot: true })) {
		const file = path.join(root, relative);
		sources.push({ file: relative, text: await Bun.file(file).text() });
	}
	return sources.sort((a, b) => a.file.localeCompare(b.file));
}

async function main(): Promise<void> {
	const root = process.cwd();
	const sources = await collectSources(root);
	const actionlintPath = path.join(root, ACTIONLINT_PATH);
	const actionlint = (await Bun.file(actionlintPath).exists()) ? await Bun.file(actionlintPath).text() : "";

	const { offenders, checked } = checkRunnerLabels(sources, actionlint);

	if (offenders.length === 0) {
		console.log(`runner-labels: ${checked} runs-on label(s) across ${sources.length} workflow(s) — all resolvable`);
		return;
	}
	console.error("runner-labels: a runs-on label names no runner this repo declares.\n");
	for (const use of offenders) {
		console.error(`  ${use.file}:${use.line}  ${use.label}`);
	}
	console.error(
		`\nA job on an unknown label is not rejected — it queues until it times out, so CI stays green\n` +
			`while the job never runs. Add the label to \`${ACTIONLINT_PATH}\` under\n` +
			`\`self-hosted-runner.labels\`, or use a GitHub-hosted one.`,
	);
	process.exit(1);
}

if (import.meta.main) {
	await main();
}
