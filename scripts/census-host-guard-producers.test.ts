/**
 * The census exists to rule out one failure: a **false zero** — reporting no
 * in-process `withHostGuard` producer when one is really there, because every
 * real call site is source text for a spawned child and a grep counted them
 * anyway.
 *
 * So the load-bearing assertions here are the two directions of that number:
 * an embedded call must not be counted, and a live one must be. Either
 * mutation alone flips the census's headline, and the second one is the
 * dangerous one — a census that finds nothing looks exactly like a census
 * looking in the wrong place.
 */

import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { classifyFile, discoverTestFiles, lexInertRegions, selfCheck } from "./census-host-guard-producers";

const verdicts = (src: string): string[] => classifyFile("t.ts", src).sites.map(s => s.verdict);

describe("census-host-guard-producers", () => {
	it("does not count a call embedded in a child's source as an in-process producer", () => {
		// The false-zero direction. A grep sees these nine characters and reports a
		// producer; they run only inside the spawned child, so counting them would
		// send a reader to a file that cannot strand the test process.
		const src = [
			"import { withHostGuard } from 'x';",
			"const probe = `",
			"await withHostGuard(async () => { await Bun.sleep(10_000); });",
			"`;",
			"Bun.spawn({ cmd: [process.execPath, '--eval', probe] });",
		].join("\n");
		expect(classifyFile("t.ts", src).sites).toHaveLength(1);
		expect(verdicts(src)).toEqual(["embedded-source"]);
	});

	it("counts a live call in executable code, so a real producer cannot vanish", () => {
		// The other direction, and the one that matters more: if this ever reports
		// zero, `hostGuardDepth` can drift in the suite and nothing would notice.
		const src = "it('t', async () => { await withHostGuard(async () => { await go(); }); });";
		expect(verdicts(src)).toEqual(["in-process"]);
	});

	it("keeps classifying after a string, so an early literal cannot mask a later live call", () => {
		// Guards the "stop at the first string" mutant. The embedded call comes
		// first precisely so a scanner that stops early reports only it.
		const src = ["const note = `withHostGuard(x)`;", "await withHostGuard(y);"].join("\n");
		expect(verdicts(src)).toEqual(["embedded-source", "in-process"]);
	});

	it("separates the two verdicts within one file", () => {
		// The real shape in the tree: a probe's embedded guard and the test's own
		// guard live in the same file, so a per-file answer is not enough.
		const src = [
			"it('probe', () => runProbe(`await withHostGuard(a);`));",
			"it('live', async () => { await withHostGuard(b); });",
		].join("\n");
		expect(verdicts(src)).toEqual(["embedded-source", "in-process"]);
	});

	it("treats code inside a template substitution as executable, not as template text", () => {
		// `${…}` is code. Marking the whole template inert would hide a live guard
		// written there — the false zero again, reached a different way.
		const src = "const n = 1; const s = `count ${await withHostGuard(a)} done`;";
		expect(verdicts(src)).toEqual(["in-process"]);
	});

	it("finds a call site that follows a comment containing the same call", () => {
		// The comment quotes a real call, so it is a site-shaped match in inert
		// text; the live one after it must still be found. A scanner that stopped
		// at the comment would report one embedded site and hide the live one.
		const src = ["// see withHostGuard(quoted) for details", "await withHostGuard(real);"].join("\n");
		expect(verdicts(src)).toEqual(["embedded-source", "in-process"]);
	});

	it("reaches a planted test file and does not descend into node_modules", async () => {
		// The discovery control that the original version lacked. It walked
		// `packages/packages`, `readdir` threw, the error was swallowed, and the
		// census reported "scanned 0 test file(s)" — a confident zero from a
		// directory that does not exist. A census must be able to tell "there are
		// none" from "I looked in the wrong place", and only an assertion that
		// discovery reaches a file it planted does that.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "census-hg-test-"));
		try {
			await fs.mkdir(path.join(dir, "node_modules"));
			await fs.writeFile(path.join(dir, "planted.test.ts"), "await withHostGuard(a);");
			await fs.writeFile(path.join(dir, "helper.ts"), "await withHostGuard(b);");
			await fs.writeFile(path.join(dir, "node_modules", "skipped.test.ts"), "await withHostGuard(c);");
			const found = (await discoverTestFiles(dir)).map(f => path.basename(f));
			expect(found).toEqual(["planted.test.ts"]);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("runs every built-in control green, so the census cannot be read while blind", () => {
		// A census whose own controls are red still prints a plausible count. This
		// asserts the controls pass rather than printing them, so the failure names
		// a control instead of a number nobody would question.
		const results = selfCheck();
		expect(results.filter(r => !r.ok).map(r => `${r.name}: ${r.detail}`)).toEqual([]);
		expect(results.length).toBeGreaterThan(0);
	});

	it("marks a comment as inert without swallowing the code after it", () => {
		const src = "/* withHostGuard(a) */ await withHostGuard(b);";
		const { inert } = lexInertRegions(src);
		expect(inert[src.indexOf("(a)")]).toBe(true);
		expect(inert[src.indexOf("(b)")]).toBe(false);
	});
});
