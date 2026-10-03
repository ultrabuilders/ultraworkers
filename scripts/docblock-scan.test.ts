/**
 * The gate that reads what the code SAYS rather than what it DOES.
 *
 * The measurements that shaped it are in the script's docblock; the two that decide
 * every assertion below are:
 *
 *   - the escaped-slash glob fragment — the exact shape I shipped twice — PARSES
 *     under the bundler, so a build-based gate reports it healthy;
 *   - a bare comment-close followed by prose on the same line ALSO parses.
 *
 * So every positive case here is one a build-based gate would report as healthy, and
 * that is the property worth defending. A test that only proved "the gate fires"
 * would pass just as happily against a gate that fired on everything.
 *
 * A NOTE ON WRITING THIS FILE, since it is the hazard it tests. The marker sequence
 * that opens and closes a block comment must never appear literally inside a
 * comment here — it closes the comment it is sitting in, and the prose after it
 * becomes code that fails to parse, taking the whole file with it. Every fixture
 * below therefore builds its markers from string pieces.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { findDefects, isEscapedSlash } from "./docblock-scan";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

/** Run the gate over a snippet and report what it found. */
const scan = (source: string): string[] => findDefects("fixture.ts", source).map(d => d.kind);

describe("a docblock destroyed while the file still parses", () => {
	it("catches a truncated docblock whose prose follows the close on the same line", () => {
		// This is the shape d9 labelled bad3: the control put a variable declaration
		// after the close, and the docblock vanished with no error anywhere. The
		// build accepts it. Every fixture below is built from strings rather than
		// written inline, because writing the marker sequence in a comment here would
		// close the comment this test lives in — the very defect being tested.
		const open = "/**";
		const close = " * " + "*" + "/";
		const source = [
			open,
			" * Explains the thing.",
			close + " The rest of the sentence survives",
			"export const w = 4;",
			"",
		].join("\n");
		expect(scan(source)).toContain("truncated-docblock");
	});

	it("catches a docblock that opens and never closes", () => {
		expect(scan("/**\n * Unterminated.\nexport const w = 4;\n")).toContain("unterminated-comment");
	});

	it("leaves a correctly-closed docblock alone, however long it is", () => {
		// The direction that matters most. d9's first matcher flagged every closed
		// docblock in the tree — 1974 of them — which is a gate that alarms everywhere
		// and therefore says nothing.
		const source = [
			"/**",
			" * A long, well-formed docblock.",
			" *",
			" * Several lines of it.",
			" */",
			"export const w = 4;",
			"",
		].join("\n");
		expect(scan(source)).toEqual([]);
	});

	it("leaves a line comment alone, even one containing comment markers", () => {
		const source = ["// see /* this */ and 4 > 2", "export const w = 4;", ""].join("\n");
		expect(scan(source)).toEqual([]);
	});
});

describe("the one distinction the matcher has to get right", () => {
	it("does not fire on the shape the build accepts: an escaped slash", () => {
		// The glob fragment, assembled from pieces below so this comment does not
		// carry the sequence itself: the exact form I hit twice. In a regex literal
		// the backslash before the slash is an escape; in a docblock there is no
		// escape. Same characters, two parsers. A rule that flagged this would fire
		// on every regex in the tree.
		const escapedGlob = "(?:.*" + "\\/)?";
		const source = [
			"const globToRegExp = (pattern: string) => {",
			`  return pattern.replace("${escapedGlob}", "");`,
			"};",
			"",
		].join("\n");
		expect(scan(source)).toEqual([]);
	});

	it("still fires on the unescaped form, so excluding the escaped one is not blanket amnesty", () => {
		// The control for the row above. Excluding `\/` must not have disabled the
		// check it was excluding a false positive from.
		const source = [
			"/**",
			" * A glob, written **/ inside prose.",
			" * This close is the first one.",
			" */",
			"export const w = 4;",
			"",
		].join("\n");
		const found = scan(source);
		expect(found.length).toBeGreaterThan(0);
	});

	it("counts the backslash run, so a literal backslash before the close is a real close", () => {
		// Odd backslashes escape the slash; even ones do not. Getting this backwards
		// makes `\\/` a false negative — a docblock that looks unterminated.
		expect(isEscapedSlash("\\*/", 1)).toBe(true);
		expect(isEscapedSlash("\\\\*/", 2)).toBe(false);
	});
});

describe("the tree-wide scan this gate does NOT ship", () => {
	it("reports a defect on a file that is not defective, and misses 430 lines of real code", () => {
		// THIS IS THE FINDING, NOT A TEST OF THE GATE. It is why there is no
		// tree-wide rule here, and it is recorded because the failure is
		// seductive: the matcher looked plausible, and a reviewer reading only
		// the fixtures would have shipped it.
		//
		// Measured on `packages/coding-agent/src/tools/glob.ts`, which compiles and
		// is well formed: the scan reported an unterminated comment at line 504,
		// and found no comment at all across lines 72-503 — 430 lines of ordinary
		// source full of docblocks.
		//
		// THE MEASUREMENT ITSELF, against the real file. This is asserted rather
		// than described because it is reproducible: run the scan on that path and
		// this is what it reports.
		//
		// Note what is NOT claimed here: two attempts to explain the mechanism
		// (a division opening a false regex; a template's `${}` nesting) were both
		// written into this test and both FAILED to reproduce the finding. They
		// were guesses about a scanner I had not instrumented. They are retracted
		// rather than left to look like an explanation, and the root cause is
		// still unestablished — which is itself the reason not to ship the scan.
		const globSrc = path.join(repoRoot, "packages/coding-agent/src/tools/glob.ts");
		if (!fs.existsSync(globSrc)) return; // the file moved; nothing to falsify
		const found = findDefects("glob.ts", fs.readFileSync(globSrc, "utf8"));
		expect(found.map(d => `${d.line} ${d.kind}`)).toContain("504 unterminated-comment");
	});
});
