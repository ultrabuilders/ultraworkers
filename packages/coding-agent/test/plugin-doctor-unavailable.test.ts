/**
 * The patch ledger has to reach the user who runs the doctor.
 *
 * `doctor-checks.ts` held the ledger check in a registry that no production path
 * imported, so `ultraworkers plugin doctor` never ran it: the check existed, was correct,
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

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-doctor-ledger-"));

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

/**
 * The `Summary: ...` line, parsed back into its named counts.
 *
 * The label is captured whole, so a bucket named with two words (`not checked`)
 * is read rather than half-parsed and dropped. A parser that only understood
 * single-word labels would silently omit that bucket from the total — making the
 * partition look correct while excluding the very line it exists to account for.
 */
function summaryCounts(lines: string[]): Record<string, number> {
	const summary = lines.find(line => line.startsWith("Summary:"));
	expect(summary).toBeDefined();
	const counts: Record<string, number> = {};
	for (const match of summary!.matchAll(/(\d+) ([a-z]+(?: [a-z]+)*)/g)) counts[match[2]!] = Number(match[1]);
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
		// Scoped to the plugin block: the summary read below is that block's, so
		// the lines it must account for are that block's too.
		const printed = blockLines(lines, "Plugin Health Check").filter(line => /^\S+\s+\S+:/.test(line.trim())).length;
		expect(printed).toBeGreaterThan(1);
		const counts = summaryCounts(lines);
		const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
		expect(total).toBe(printed);
	});
});

/**
 * The lines belonging to ONE report block, so a count and the lines it accounts
 * for are measured over the same scope.
 *
 * The doctor prints two blocks — plugin health, then environment health — and
 * only the first carries a `Summary:`. Counting check lines across the whole
 * output while reading the first summary compares a numerator and a denominator
 * from different sets, which goes red the moment a second collector exists
 * without saying anything about the partition.
 *
 * This narrows the SCOPE, not the strength: both blocks are formatted by the
 * same `formatDoctorResults`, so asserting the partition over one block still
 * exercises the exact bucketing arithmetic the other block goes through.
 */
function blockLines(lines: string[], heading: string): string[] {
	const start = lines.findIndex(line => line.trim() === heading);
	expect(start).toBeGreaterThanOrEqual(0);
	const rest = lines.slice(start + 1);
	const nextHeading = rest.findIndex(line => /^\S.*Check$/.test(line.trim()));
	return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

describe("the summary buckets partition the report", () => {
	// The rows below hand the renderer a fixed set of outcomes rather than a real
	// project's, because the interesting shapes are the ones a clean checkout never
	// produces. The renderer itself is still the real one — only its data source is
	// supplied, so the arithmetic under test is the shipped arithmetic.
	async function render(outcomes: CheckOutcome[]): Promise<string[]> {
		const lines: string[] = [];
		spyOn(console, "log").mockImplementation((...args: unknown[]) => {
			lines.push(args.map(String).join(" "));
		});
		const exits: number[] = [];
		spyOn(process, "exit").mockImplementation(((code?: number) => {
			exits.push(code ?? 0);
		}) as never);
		await handleDoctor({ doctor: async () => outcomes } as unknown as PluginManager, {});
		expect(exits).toEqual([]);
		return lines;
	}

	/** Lines printed in the plugin block, each of which must land in exactly one bucket. */
	function printedCheckLines(lines: string[]): string[] {
		const printed = blockLines(lines, "Plugin Health Check").filter(line => /^\S+\s+\S+:/.test(line.trim()));
		expect(printed.length).toBeGreaterThan(0);
		return printed;
	}

	test("a repaired check is counted once, as fixed, not also as ok", async () => {
		// `doctor --fix` emits exactly this pair: an orphaned plugin restored from
		// its pinned source is `status: "ok"` AND `fixed: true`. Counting it as both
		// named more checks than were printed, so the summary was wrong precisely
		// when a run had actually repaired something and a user was reading it.
		const lines = await render([
			{ name: "repaired", status: "ok", message: "restored from its pinned source", fixed: true },
			{ name: "healthy", status: "ok", message: "all good" },
		]);
		const counts = summaryCounts(lines);
		expect(counts.fixed).toBe(1);
		expect(counts.ok).toBe(1);
		expect(lines.filter(line => line.includes("repaired:")).length).toBe(1);
		expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBe(printedCheckLines(lines).length);
	});

	test("an unavailable check alongside a repaired one still sums to the lines printed", async () => {
		// Both non-`ok` buckets at once. The two defects are independent — one
		// dropped an unmeasurable line entirely, the other counted a repaired one
		// twice — so a gate covering only one of them would stay green through the
		// other.
		const lines = await render([
			{ name: "patch_ledger", status: "unavailable", message: "no patches/ — not checked" },
			{ name: "repaired", status: "ok", message: "restored", fixed: true },
			{ name: "warned", status: "warning", message: "not found" },
		]);
		const counts = summaryCounts(lines);
		expect(counts["not checked"]).toBe(1);
		expect(counts.fixed).toBe(1);
		expect(counts.warnings).toBe(1);
		expect(counts.ok ?? 0).toBe(0);
		expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBe(printedCheckLines(lines).length);
	});
});
