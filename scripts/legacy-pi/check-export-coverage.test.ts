/**
 * The coverage gate's own logic — the part that decides what counts as covered.
 *
 * The gate's value is entirely in its denominator being honest. If the parser
 * counted erased `interface`/`type` names as value exports, the covered ratio
 * would report pi as far less reachable than it is, and the number would drift
 * for reasons that have nothing to do with the shim. If a trailing `// comment`
 * on an export specifier became an export name, the same thing happens in the
 * other direction: phantom coverage the gate would then defend forever.
 *
 * So these rows pin the two miscounts that make the number meaningless, and the
 * one branch that decides pass/fail.
 */
import { describe, expect, it } from "bun:test";
import {
	findRegressions,
	formatReport,
	parsePiValueExports,
	stripComments,
	type CoverageBaseline,
} from "./check-export-coverage";

describe("parsePiValueExports", () => {
	it("counts a class or function as a value an extension can fail to import", () => {
		// These are the names a runtime `import` actually resolves. A missing one
		// produces `Export named 'X' not found` — the failure the gate exists for.
		const names = parsePiValueExports(
			["export class ModelRuntime {}", "export function createEventBus() {}", "export const DEFAULT_X = 1;"].join(
				"\n",
			),
		);

		expect(names).toEqual(["DEFAULT_X", "ModelRuntime", "createEventBus"]);
	});

	it("excludes interface and type declarations, which erase before the module runs", () => {
		// An erased declaration can never fail an `import`, so counting it would
		// put a permanently-unreachable name in the denominator and make the ratio
		// look like a shim defect when nothing is wrong.
		const names = parsePiValueExports(
			[
				"export interface SessionInfo { id: string }",
				'export type PrintMode = "tty" | "pipe";',
				"export function runPrintMode() {}",
			].join("\n"),
		);

		expect(names).toEqual(["runPrintMode"]);
	});

	it("treats a name exported both as a type and a value as a value", () => {
		// pi does this deliberately in several places. The value form is what an
		// extension's `import` resolves against, so the value form must win.
		const names = parsePiValueExports(
			['export { SharedThing as SharedThing } from "./m.ts";', 'export type { SharedThing } from "./m.ts";'].join(
				"\n",
			),
		);

		expect(names).toEqual(["SharedThing"]);
	});

	it("resolves an aliased re-export to the name importers actually use", () => {
		// The specifier an extension writes is the alias, not the source symbol.
		// Resolving to the source name would look up a name nothing imports.
		const names = parsePiValueExports(
			['export { withFileMutationQueue as withFileMutationQueue } from "./q.ts";'].join("\n"),
		);

		expect(names).toEqual(["withFileMutationQueue"]);
	});
});

describe("stripComments", () => {
	it("drops a trailing line comment so it cannot become an export name", () => {
		// A trailing `// Tool factories` on a specifier is exactly how the first
		// version of this parser produced a symbol named after a sentence, and
		// that phantom then sat in the baseline as coverage nothing could lose.
		const stripped = stripComments(
			'export { createReadTool, createWriteTool // Tool factories\n} from "./tools.ts";',
		);

		expect(stripped).not.toContain("Tool factories");
	});

	it("keeps a `//` inside a string literal, which is not a comment", () => {
		// Stripping this would corrupt a specifier that legitimately contains a
		// slash pair, silently dropping a real export from the denominator.
		const stripped = stripComments('export const URL_PREFIX = "https://example.test/";');

		expect(stripped).toContain("https://example.test/");
	});
});

describe("findRegressions", () => {
	it("names only the covered exports the shim stopped exposing", () => {
		const shim = new Set(["keptOne", "keptTwo"]);

		// The baseline's `knownMissing` names are absent BY DESIGN and must never
		// appear here — reporting them would make the gate permanently red for a
		// gap it already accounts for.
		expect(findRegressions(["keptOne", "keptTwo", "vanished"], shim)).toEqual(["vanished"]);
	});

	it("reports nothing when the shim still exposes everything it did", () => {
		expect(findRegressions(["a", "b"], new Set(["a", "b", "c"]))).toEqual([]);
	});
});

describe("formatReport", () => {
	const baseline: CoverageBaseline = {
		covered: ["alpha", "beta"],
		knownMissing: ["gamma"],
		piValueExports: 3,
		shimRuntimeExports: 40,
	};

	it("prints the covered count and the missing list, so the number is a measurement", () => {
		// The bead this gate answers asked for a number in the report rather than a
		// bare pass: "17/20" has to stay a quantity someone can watch, and a
		// shrinking denominator is the regression this shape makes visible.
		const report = formatReport(baseline, []);

		expect(report).toContain("covered:             2/3");
		expect(report).toContain("gamma");
		expect(report).not.toContain("REGRESSION");
	});

	it("names the lost export and the import failure it causes", () => {
		// "Something regressed" is not actionable across six developers. The symbol
		// and the error an extension will hit are what makes the red gate usable.
		const report = formatReport(baseline, ["beta"]);

		expect(report).toContain("REGRESSION");
		expect(report).toContain("beta");
		expect(report).toContain("Export named");
	});
});
