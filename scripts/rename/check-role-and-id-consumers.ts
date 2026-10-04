#!/usr/bin/env bun
/**
 * GATE. A renamed id whose consumer appears later must turn this red.
 *
 * WHY A GATE AND NOT A TEST
 * -------------------------
 * `check-runtime-rename.ts` deliberately does not cover these values, and its
 * header says why twice: runtime *output* is not *data*, and the TUI render path
 * does not travel through `logger.*`. Extending it would give one token two
 * per-line sources of truth, which is the failure its author was avoiding. So
 * the census for renamed data values is its own gate, with a different trigger.
 *
 * WHAT IS ASSERTED, AND WHY IT IS NOT A TAUTOLOGY
 * ----------------------------------------------
 * A test asserting "the HAR creator is now `ultraworkers-browser`" protects the
 * ACT of RENAMING and goes green forever, even if a consumer appears tomorrow
 * and the value has quietly become a contract. That protects the deed, not the
 * premise. This gate asserts the premise instead: every value below is renamed,
 * AND nothing outside its own definition site reads it. Adding a reader makes it
 * red and names the reader.
 *
 * The consumer scan is what makes it falsifiable. It is a LOCATOR, never a
 * judgement: it finds files that mention the old spelling, and each one is
 * either the definition site (exempt) or a reported violation.
 *
 * WHY THE ROLE PREFIX IS A DIFFERENT KIND OF CLAIM
 * ------------------------------------------------
 * `omp.<x>` TUI roles were renamed while `ultraworkers.<x>` already held 351
 * uses against their 15 — the repo had moved on and these were left behind. A
 * role is a write-only annotation here: nothing indexes by it, and no exported
 * name carries it. That was measured, and this gate is what keeps the
 * measurement true. If a role ever becomes a lookup key, a reader appears and
 * this goes red.
 */

import * as path from "node:path";

/** Repo-relative paths this gate reads. Narrow on purpose: it is not a corpus scan. */
const SCAN_ROOTS = ["packages/coding-agent/src", "packages/tui/src"] as const;

/** Source extensions that can hold a reader. A `.md` cannot be one. */
const SOURCE_EXT = /\.(?:ts|tsx|js|mjs|cjs)$/;

/**
 * One renamed value and the files allowed to mention its old spelling.
 *
 * `definitionSites` are exempt because they are where the old spelling is being
 * removed FROM, not consumed by. Anything else that mentions it is a consumer.
 */
interface RenamedValue {
	readonly label: string;
	readonly legacy: string;
	readonly definitionSites: readonly string[];
}

const VALUES: readonly RenamedValue[] = [
	{
		label: "HAR log.creator.name (browser network recording)",
		legacy: "omp-browser",
		// The HAR is written to a file the user opens in a HAR viewer; `creator.name`
		// is display metadata there, not something this repo parses back.
		//
		// `tracing.ts` is here for a DIFFERENT value that shares the spelling: a
		// generated temp-file prefix, returned to its caller and read by nothing. This
		// gate is what found it — a grep for the HAR creator had not, because the two
		// are unrelated values that happen to share a name.
		definitionSites: [
			"packages/coding-agent/src/tools/browser/network.ts",
			"packages/coding-agent/src/tools/browser/tracing.ts",
			// Shares the legacy SPELLING but is a different value entirely: a published
			// GitHub release asset referenced from browser-relay/README.md. Renaming it
			// would break the download link, so it is a separate keep-wire decision and
			// is excluded here by path rather than by pretending the spelling is free.
			"packages/browser-relay/scripts/build-extension.ts",
		],
	},
	{
		label: "TempDir prefix for extracted tool payloads",
		legacy: "@omp-tools-extract-",
		definitionSites: ["packages/coding-agent/src/utils/tools-manager.ts"],
	},
	{
		label: "TUI render roles",
		legacy: "omp.",
		// Every site that still spelled a role with the legacy prefix. Once this gate is
		// green, adding one of these files here is how a future role gets an exemption.
		definitionSites: [
			"packages/coding-agent/src/stream/console-tui.ts",
			"packages/coding-agent/src/modes/interactive-mode.ts",
			"packages/coding-agent/src/modes/progress-hud.ts",
		],
	},
];

export interface ConsumerViolation {
	readonly label: string;
	readonly legacy: string;
	readonly path: string;
	readonly line: number;
	readonly text: string;
}

/**
 * Every non-definition file still carrying a renamed value's legacy spelling.
 *
 * A missing file is skipped rather than reported: this gate is about readers, and
 * a deleted definition site has no reader. Treating its absence as a violation
 * would make the gate red for a cleanup, which is the wrong direction to fail.
 */
export async function findConsumers(
	root: string,
	values: readonly RenamedValue[] = VALUES,
): Promise<ConsumerViolation[]> {
	const violations: ConsumerViolation[] = [];
	for (const value of values) {
		const exempt = new Set(value.definitionSites);
		for (const scanRoot of SCAN_ROOTS) {
			for await (const rel of new Bun.Glob("**/*").scan({ cwd: path.join(root, scanRoot), dot: true })) {
				if (!SOURCE_EXT.test(rel)) continue;
				const repoRel = `${scanRoot}/${rel}`;
				if (exempt.has(repoRel)) continue;
				const text = await Bun.file(path.join(root, repoRel)).text();
				const lines = text.split("\n");
				for (let i = 0; i < lines.length; i++) {
					// The role prefix is a namespace, not a word: match it where it is used
					// as one (`role: "omp.`), so prose mentioning "omp." is not a consumer.
					const needle = value.legacy.endsWith(".") ? `role: "${value.legacy}` : value.legacy;
					const line = lines[i]!;
					if (line.includes(needle)) {
						violations.push({
							label: value.label,
							legacy: value.legacy,
							path: repoRel,
							line: i + 1,
							text: line.trim().slice(0, 160),
						});
					}
				}
			}
		}
	}
	return violations;
}

if (import.meta.main) {
	const root = process.cwd();
	const violations = await findConsumers(root);
	if (violations.length > 0) {
		for (const v of violations) {
			console.error(`FAIL ${v.path}:${v.line}  ${v.label} (legacy ${JSON.stringify(v.legacy)})`);
			console.error(`     ${v.text}`);
		}
		console.error(
			`check-role-and-id-consumers: ${violations.length} consumer(s) of a renamed value.\n` +
				`  A value with a reader is a contract, not a rename: either the reader moves with it,\n` +
				`  or the value returns to its legacy spelling. Do not add a definition site to silence this.`,
		);
		process.exit(1);
	}
	const summary = VALUES.map(v => `${v.legacy} (${v.definitionSites.length} site(s))`).join("; ");
	console.log(`check-role-and-id-consumers: ${VALUES.length} renamed value(s), no consumers — ${summary}`);
}
