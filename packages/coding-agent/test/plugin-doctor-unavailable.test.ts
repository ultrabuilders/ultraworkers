/**
 * The patch ledger has to reach the user who runs the doctor.
 *
 * `doctor-checks.ts` held the ledger check in a registry that no production path
 * imported, so `omp plugin doctor` never ran it: the check existed, was correct,
 * was tested, and reported nothing. This file defends the two contracts that
 * closure broke, at the surface that actually prints.
 *
 * 1. The outcome is IN the report at all — `unavailable` included, on its own line.
 * 2. The summary ACCOUNTS for it. This is the defect worth a gate: with
 *    `unavailable` folded into the error/warning/ok buckets, the counts summed to
 *    fewer lines than were printed, so a run in which a check never executed looked
 *    like complete coverage. Nothing was red, because every line rendered and every
 *    count was arithmetically correct — just over the wrong denominator.
 */
import { afterEach, describe, expect, spyOn, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { handleDoctor } from "@oh-my-pi/pi-coding-agent/cli/plugin-cli";
import { PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/manager";
import { isUnavailable, type CheckOutcome } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/types";
import { initTheme } from "@oh-my-pi/pi-tui/theme";

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "omp-doctor-ledger-"));

// The renderer reads `theme.status.*` for its icons; the CLI initialises this at
// startup and nothing else does.
initTheme();

afterEach(async () => {
	vi.restoreAllMocks();
	await fs.rm(scratch, { recursive: true, force: true });
});

/**
 * Run the real renderer and collect everything it printed.
 *
 * The manager is pointed at `scratch`, which has no `patches/` directory. That is
 * what makes the premise genuinely missing — the repo checkout always has one, so
 * a test driven against it could only ever watch the ledger pass.
 */
async function renderedLines(): Promise<string[]> {
	const lines: string[] = [];
	spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	});
	// `process.exit` is only reached when errors exist; a ledger that reports
	// `unavailable` must not be turned into one, so this stub also asserts that.
	const exits: number[] = [];
	spyOn(process, "exit").mockImplementation(((code?: number) => {
		exits.push(code ?? 0);
	}) as never);
	await handleDoctor(new PluginManager(scratch), {});
	expect(exits).toEqual([]);
	return lines;
}

/** The `Summary: ...` line, parsed back into its named counts. */
function summaryCounts(lines: string[]): Record<string, number> {
	const summary = lines.find(line => line.startsWith("Summary:"));
	expect(summary).toBeDefined();
	const counts: Record<string, number> = {};
	for (const match of summary!.matchAll(/(\d+) ([a-z]+)/g)) counts[match[2]!] = Number(match[1]);
	return counts;
}

describe("the doctor reports a ledger it could not check", () => {
	test("the patch ledger appears in the doctor's own output", async () => {
		// The registry that used to hold this check was never imported by the
		// shipped doctor, so this check existed only in tests.
		const lines = await renderedLines();
		expect(lines.some(line => line.includes("patch_ledger"))).toBe(true);
	});

	test("an unmeasurable ledger is counted as unchecked, not as ok", async () => {
		// THE defect. Reported as ok, a check that never ran is indistinguishable
		// from one that ran and passed — which is the entire reason `unavailable`
		// exists as its own value rather than being inferred from "not an error".
		const outcomes: CheckOutcome[] = await new PluginManager(scratch).doctor();
		const ledger = outcomes.find(o => o.name === "patch_ledger");
		expect(ledger).toBeDefined();
		// A scratch cwd has no patches/ directory, so the premise is genuinely
		// missing here — this is the real answer, not a stubbed one.
		expect(isUnavailable(ledger!)).toBe(true);
	});

	test("the summary counts every check it printed", async () => {
		const lines = await renderedLines();
		// Matched structurally — icon, then `name:` — rather than against a list of
		// glyphs, so adding a status cannot silently stop being counted here.
		const printed = lines.filter(line => /^\S+\s+\S+:/.test(line.trim())).length;
		expect(printed).toBeGreaterThan(1);
		const counts = summaryCounts(lines);
		const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
		expect(total).toBe(printed);
	});
});
