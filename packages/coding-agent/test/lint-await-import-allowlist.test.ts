import { describe, expect, it } from "bun:test";
import * as path from "node:path";
import {
	AwaitImportParseError,
	EXEMPTIONS,
	findAwaitImports,
	isExempt,
	runGate,
	trackedTypeScriptFiles,
} from "../../../scripts/check-await-import";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");

/**
 * Contract: an `await import()` outside a stated exemption fails the gate.
 *
 * This file deliberately holds **no rules of its own**. An earlier version of it carried a
 * second, independent taxonomy — `RULES`, `ALLOWED_SITES`, a `git grep` scanner — beside the
 * one in `scripts/check-await-import.ts`. The two disagreed the moment both existed: the
 * script reported 0 unexempted sites, the test reported 101. Both were green-looking
 * measurements of one rule, and only one of them could decide what ships.
 *
 * The disagreement was not a bug in either scanner; it was the test holding a **third-of-
 * the-taxonomy draft** (three rules, eight paths) that was never finished, while the script
 * held the measured one (eight groups, each traced to a mechanism). So the taxonomy lives in
 * one place, and this file tests that place.
 */
describe("the await-import gate", () => {
	it("reports no dynamic import outside an exemption", async () => {
		const report = await runGate(repoRoot);
		// Printed because a one-sided check is worse than none: with only a count you cannot
		// tell "the tree is clean" from "the scan found nothing to look at".
		console.error(
			`[await-import] scanned=${report.total} exempt=${report.exempt} computed=${report.computed} ` +
				`unexempted=${report.reported.length}`,
		);
		expect(report.reported).toEqual([]);
	});

	it("actually scanned the tree, so the check above is not vacuous", async () => {
		const report = await runGate(repoRoot);
		// A scan that measured nothing passes the first test for the wrong reason. These
		// bound the run: the tree has hundreds of sites, and a non-trivial share of them are
		// computed — meaning the distinction the gate draws is exercised, not dormant.
		expect(report.total).toBeGreaterThan(100);
		expect(report.computed).toBeGreaterThan(0);
		expect(report.exempt).toBeGreaterThan(0);
	});

	it("fails on a new dynamic import no exemption covers", async () => {
		// Injected rather than written to a real file: this tree is shared, and a test that
		// edits a stranger's source and restores it is one crash from leaving it modified.
		const report = await runGate(repoRoot, {
			"packages/coding-agent/src/__injected-await-import-probe.ts":
				'export async function load() {\n\treturn await import("./never-written");\n}\n',
		});
		expect(report.reported).toHaveLength(1);
		expect(report.reported[0].file).toBe("packages/coding-agent/src/__injected-await-import-probe.ts");
		expect(report.reported[0].computed).toBe(false);
		expect(report.reported[0].specifier).toBe("./never-written");
	});

	it("stays green for an injected file an exemption does cover", async () => {
		// The negative direction of the pair above. Without it, a gate that reported every
		// site in the tree would pass the "goes red" test and still be wrong.
		const report = await runGate(repoRoot, {
			"packages/coding-agent/src/cli/stats-cli.ts":
				'export async function load() {\n\treturn await import("@oh-my-pi/omp-stats");\n}\n',
		});
		expect(report.reported).toEqual([]);
	});

	it("gives every exemption group a stated reason and at least one path", () => {
		for (const [name, group] of Object.entries(EXEMPTIONS)) {
			expect(group.why.length, `${name} has no reason`).toBeGreaterThan(0);
			expect(group.patterns.length, `${name} has no path`).toBeGreaterThan(0);
		}
	});

	it("leaves no exemption pattern that no real file matches", async () => {
		// An allow-list entry that exempts nothing still reads as permission, and nothing else
		// removes it: rename a directory, and the pattern silently matches zero files forever.
		// Measured against the real tracked tree rather than a fixture, because the failure
		// this catches is precisely a pattern that has drifted from the tree it described.
		const tracked = new Set(await trackedTypeScriptFiles(repoRoot));
		const stale: string[] = [];
		for (const [name, group] of Object.entries(EXEMPTIONS)) {
			for (const pattern of group.patterns) {
				if (![...tracked].some(file => new Bun.Glob(pattern).match(file))) stale.push(`${name}: ${pattern}`);
			}
		}
		expect(stale).toEqual([]);
	});

	it("exempts no file under two groups at once", async () => {
		// Two reasons for one site is a smell: one of them is carrying a file it does not
		// describe, and removing it later would silently drop a real exemption.
		const tracked = await trackedTypeScriptFiles(repoRoot);
		const overlapping: string[] = [];
		for (const file of tracked) {
			const covering = Object.entries(EXEMPTIONS).filter(([, group]) =>
				group.patterns.some(pattern => new Bun.Glob(pattern).match(file)),
			);
			if (covering.length > 1) overlapping.push(`${file}: ${covering.map(([name]) => name).join(", ")}`);
		}
		expect(overlapping).toEqual([]);
	});

	it("reads a docblock mention as no import at all", () => {
		// Three occurrences in this tree are prose inside comments. A gate that flagged them
		// would push people toward inline disables to silence it, which is how a rule stops
		// meaning anything — so this is a contract about the gate, not about the prose.
		const prose = [
			"/**",
			' * A JSDoc example reading `var fs = await import("node:fs/promises")` is docs.',
			" */",
			"export function documented() {}",
		].join("\n");
		expect(findAwaitImports("doc.ts", prose)).toEqual([]);
	});

	it("tells a literal specifier from a computed one", () => {
		const literal = findAwaitImports("a.ts", 'const m = await import("./sidecar");');
		const computed = findAwaitImports("a.ts", "const m = await import(target);");
		// The `${}` must stay inert: it is source under test, not a value this file computes.
		// oxlint-disable-next-line no-template-curly-in-string
		const interpolated = findAwaitImports("a.ts", "const m = await import(`./x/${name}`);");
		expect(literal[0].computed).toBe(false);
		expect(literal[0].specifier).toBe("./sidecar");
		expect(computed[0].computed).toBe(true);
		expect(interpolated[0].computed).toBe(true);
		expect(interpolated[0].specifier).toBe("template with interpolation");
	});

	it("fails on a file it cannot parse rather than skipping it", async () => {
		// The failure this prevents is silent: a scan that dropped an unparseable file still
		// prints a table, and a table that looks complete is indistinguishable from one that
		// is. Throwing is what makes the caller see it.
		//
		// The fixture must contain the token the pre-filter looks for. A file with no
		// `import(` in it is skipped before it is ever parsed — correctly, and the reason this
		// fixture is not simply "malformed text".
		await expect(
			runGate(repoRoot, {
				"packages/coding-agent/src/__injected-broken.ts":
					'export async function broken() {\n\treturn await import("./x")\n}\nfunction ( {\n',
			}),
		).rejects.toThrow(AwaitImportParseError);
	});

	it("matches an exemption by path, so a moved file stops being exempt", () => {
		expect(isExempt("packages/coding-agent/src/cli.ts", EXEMPTIONS)).toBe(true);
		expect(isExempt("packages/coding-agent/src/modes/not-in-any-group.ts", EXEMPTIONS)).toBe(false);
	});
});
