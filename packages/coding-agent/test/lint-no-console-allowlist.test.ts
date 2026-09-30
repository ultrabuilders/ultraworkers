import { afterEach, describe, expect, it } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");

// Contract: `eslint/no-console` is a real gate, and every path exempted from it has
// a reason someone can read.
//
// `AGENTS.md` bans `console.*` in library code because a stray write corrupts the
// TUI, the RPC framing, or the SDK stream. That was a paragraph of prose, and
// `packages/ai/src/providers/cursor.ts` sat on the provider wire path with a
// `console.error` that nothing had blocked. A rule nobody runs is an intention.
//
// This file exists because a list in `.oxlintrc.json` cannot answer "why is this
// file allowed?". It can, though, be made to: a path is only exempt if it appears
// here next to a stated reason. So a NEW cli entrypoint cannot become exempt by
// someone copying a glob — it goes red until they say why it is one.

/**
 * Why each group of paths may use `console.*`.
 *
 * Every pattern configured in `.oxlintrc.json` must appear in exactly one group
 * here, and every pattern here must appear in the config. Adding an exemption
 * without a reason, or a reason without an exemption, is the failure this catches.
 */
const REASONS: Record<string, { why: string; patterns: string[] }> = {
	/** The exception `AGENTS.md` already grants. */
	entrypoints: {
		why: "A CLI entrypoint exits without entering the TUI, so it may write to the terminal. This is the documented exception, not a loophole.",
		patterns: [
			"packages/*/src/cli/**",
			"packages/*/src/commands/**",
			"packages/metaharness/src/tb/cli.ts",
			"packages/stats/src/index.ts",
		],
	},
	/** Never shipped, never run under a user's session. */
	development: {
		why: "Tests, benchmarks, examples and build scripts are not part of a running session, so their output cannot corrupt a TUI, an RPC stream or an SDK consumer.",
		patterns: [
			"**/test/**",
			"**/bench/**",
			"**/scripts/**",
			"**/examples/**",
			"packages/*/build.ts",
			"packages/typescript-edit-benchmark/**",
		],
	},
	/** stdout or stderr IS the product's output channel here. */
	commandOutput: {
		why: "These write the command's own output, so a logger would move it somewhere the user cannot see it. `omp compress f.md > out.md` needs stdout; `omp --model` prints why it is exiting 1; the blob broker's banner is the readiness channel; `mnemopi diagnose` emits a JSON report whose exit code is the result.",
		patterns: [
			"packages/coding-agent/src/compress/**",
			"packages/coding-agent/src/config/model-resolver.ts",
			"packages/coding-agent/src/blob-broker/server.ts",
			"packages/mnemopi/src/diagnose.ts",
		],
	},
	browser: {
		why: "Browser-targeted code bundles for the browser, where `@oh-my-pi/pi-utils` cannot be imported at all — it reaches `bun:ffi` through `stderr-guard`, and `bun build --target browser` fails on it. A browser guest has no filesystem for the logger to write to either, so devtools is the only sink that exists.",
		patterns: ["packages/collab-web/src/**"],
	},
	sink: {
		why: "This IS the sink. `logger` writes to `~/.omp/logs` by way of `console.error`, so banning console here would make the logger unable to log.",
		patterns: ["packages/utils/src/logger.ts"],
	},
};

interface OxlintOverrides {
	overrides?: { files?: string[]; rules?: Record<string, string> }[];
	rules?: Record<string, unknown>;
}

async function readOxlintConfig(): Promise<OxlintOverrides> {
	const configPath = path.join(repoRoot, ".oxlintrc.json");
	// JSON5, not JSON: oxlint reads this file as JSONC, and it carries comments —
	// including the one explaining why the allow-list uses `overrides` rather than
	// `ignorePatterns`. A strict parser here would fail on exactly the prose that
	// matters most, which is a good way to get it deleted.
	return Bun.JSON5.parse(await Bun.file(configPath).text()) as OxlintOverrides;
}

function configuredNoConsolePatterns(config: OxlintOverrides): string[] {
	return (config.overrides ?? []).filter(o => o.rules?.["eslint/no-console"] === "off").flatMap(o => o.files ?? []);
}

describe("the no-console allow-list", () => {
	it("turns the rule on at the root, where nothing can quietly scope it away", async () => {
		const config = await readOxlintConfig();
		// Without this the whole file is theatre: an allow-list for a rule that is
		// not enabled protects nothing.
		expect(config.rules?.["eslint/no-console"]).toBe("error");
	});

	it("requires a stated reason for every exempt path", async () => {
		const configured = configuredNoConsolePatterns(await readOxlintConfig());
		const reasons = Object.values(REASONS).flatMap(r => r.patterns);

		// Printed together because a one-sided list is worse than none: with only
		// `configured` you cannot tell a missing reason from a renamed pattern, and
		// with only `reasons` you cannot tell which side moved.
		console.error("[lint:allowlist] configured=%o reasons=%o", configured, reasons);

		const undeclared = configured.filter(p => !reasons.includes(p));
		expect(undeclared).toEqual([]);
	});

	it("has no reason left over for a path that is no longer exempt", async () => {
		const configured = configuredNoConsolePatterns(await readOxlintConfig());
		const reasons = Object.values(REASONS).flatMap(r => r.patterns);
		// The other direction. A stale reason is not harmless: it reads as permission,
		// so the next person widens the glob on the strength of it.
		expect(reasons.filter(p => !configured.includes(p))).toEqual([]);
	});

	it("exempts nothing twice, which would let a reason be removed from one group only", async () => {
		const seen = new Map<string, string>();
		for (const [group, { patterns }] of Object.entries(REASONS)) {
			for (const p of patterns) {
				const prior = seen.get(p);
				expect({ pattern: p, in: group, alreadyIn: prior ?? null }).toEqual({
					pattern: p,
					in: group,
					alreadyIn: null,
				});
				seen.set(p, group);
			}
		}
	});
});

/**
 * Run oxlint on paths inside the real tree and return its exit code and output.
 *
 * A subprocess, not the API: oxlint's programmatic surface is not a stable
 * contract, while its exit code is exactly the thing CI branches on. And the paths
 * must live in the repo, because `overrides`/`ignorePatterns` do not apply to a
 * file outside the tree — a temp file in `/tmp` would report a result that is wrong
 * in both directions and prove nothing.
 */
async function lintInTree(paths: string[]): Promise<{ code: number; output: string }> {
	const bin = path.join(repoRoot, "node_modules/.bin/oxlint");
	const proc = Bun.spawn([bin, ...paths], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const code = await proc.exited;
	return { code, output: `${stdout}${stderr}` };
}

describe("the no-console gate itself", () => {
	// Written into the repo, deleted in `finally`. The one thing that cannot be
	// faked is the gate failing on a file it should reject.
	const scratch: string[] = [];

	function scratchFile(relative: string, body: string): string {
		const abs = path.join(repoRoot, relative);
		writeFileSync(abs, body);
		scratch.push(abs);
		return abs;
	}

	afterEach(() => {
		for (const abs of scratch.splice(0)) rmSync(abs, { force: true });
	});

	it("rejects a library file that writes to the terminal", async () => {
		// The disqualifying check. A rule that cannot go red is not a rule, so this
		// is written into a real library path and lint is run as a child process.
		const file = scratchFile(
			"packages/tui/src/__no_console_probe__.ts",
			'export function probe(): void {\n\tconsole.log("probe");\n}\n',
		);
		console.error("[lint:red] file=%s line=%s", file, 'console.log("probe")');

		const { code, output } = await lintInTree([file]);
		// Printed before asserting: a red lint gate that swallows its reason is a
		// gate the next person removes.
		console.error("[lint:red] exit=%d out=%s", code, output);

		expect(code).not.toBe(0);
		expect(output).toContain("no-console");
	});

	it("still allows a CLI entrypoint that writes to the terminal", async () => {
		// The reverse direction, and the reason condition 2 is not optional: the
		// easiest way to make this gate green is to delete the rule, and without
		// this the deletion would be invisible.
		const file = scratchFile(
			"packages/coding-agent/src/cli/__no_console_probe__.ts",
			'export function probe(): void {\n\tconsole.log("probe");\n}\n',
		);
		console.error("[lint:entrypoint] path=%s", file);

		const { code, output } = await lintInTree([file]);
		console.error("[lint:entrypoint] exit=%d out=%s", code, output);

		expect(code).toBe(0);
	});

	it("reads a console mention in a comment as nothing at all", async () => {
		// The boundary that decides whether the rule is honest. `tab-bar.ts` has
		// `console.log` inside a JSDoc example, and a rule that flagged it would be
		// pushing people toward inline disables to make the gate shut up.
		const { code, output } = await lintInTree(["packages/tui/src/components/tab-bar.ts"]);
		console.error("[lint:tui] path=%s exit=%d kind=%s", "tab-bar.ts", code, "comment");

		expect(code).toBe(0);
		expect(output).not.toContain("no-console");
	});
});
