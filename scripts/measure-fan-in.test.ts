/**
 * The `Giai đoạn 0` gate the three `r0-grp-*` beads depend on and none owned.
 *
 * What a consumer observes if this breaks: a directory reorganisation proceeds without
 * the thing that made it safe. A merge that quietly raised a module's fan-in doubles the
 * number of files it has to touch and the estimate it was approved on is wrong; a gate
 * that cannot see that rise reports the tree as clean, which is indistinguishable from
 * having no gate at all.
 */
import { describe, expect, it, test } from "bun:test";
import * as path from "node:path";
import {
	computeFanIn,
	findRegressions,
	findWeakening,
	isSealedIntact,
	sealBaseline,
	type ImportEdge,
	resolveModule,
	specifiersIn,
} from "./measure-fan-in";

const ROOT = "/repo/packages/coding-agent/src";

const edge = (from: string, specifier: string): ImportEdge => ({ from: `${ROOT}/${from}`, specifier });

describe("resolveModule", () => {
	it("collapses a directory, its barrel and a file inside it to one module", () => {
		// These three specifiers break at the same merge, so pricing them separately
		// would triple-count one directory's cost and rank candidates wrongly.
		const target = resolveModule("../stream", `${ROOT}/modes/chat.ts`, ROOT);
		const barrel = resolveModule("./index", `${ROOT}/stream/reader.ts`, ROOT);
		const member = resolveModule("../stream/reader", `${ROOT}/modes/chat.ts`, ROOT);

		expect(target).toBe("stream");
		expect(barrel).toBe("stream");
		expect(member).toBe("stream");
	});

	it("names no module for a package specifier or for a path outside the tree", () => {
		// Both would otherwise be attributed to whatever the first path segment happened
		// to be, inflating a module's fan-in with imports it cannot influence.
		expect(resolveModule("@oh-my-pi/pi-tui", `${ROOT}/modes/chat.ts`, ROOT)).toBeUndefined();
		expect(resolveModule("../../tui/src/x", `${ROOT}/modes/chat.ts`, ROOT)).toBeUndefined();
		// A query suffix is a cache-buster, not part of the path.
		expect(resolveModule("../stream/reader.ts?raw", `${ROOT}/modes/chat.ts`, ROOT)).toBe("stream");
	});
});

describe("computeFanIn", () => {
	const files = new Map([
		[`${ROOT}/stream/reader.ts`, 40],
		[`${ROOT}/stream/index.ts`, 5],
		[`${ROOT}/modes/chat.ts`, 80],
		[`${ROOT}/modes/toolbar.ts`, 30],
	]);

	it("counts importers outside the directory, and does not count its own", () => {
		const measured = computeFanIn(
			[
				edge("modes/chat.ts", "../stream"),
				edge("modes/chat.ts", "../stream/reader"), // same file, second import
				edge("modes/toolbar.ts", "../stream/index"),
				edge("stream/reader.ts", "./index"), // internal to stream
			],
			files,
			ROOT,
		);

		const stream = measured.find(entry => entry.module === "stream");
		// chat.ts and toolbar.ts — chat.ts appears once despite two specifiers.
		expect(stream?.externalImporters).toBe(2);
		// reader.ts reaching its own barrel is real work a flatten would touch, but it is
		// self-referential: counting it as fan-in would price the module as depended upon
		// by itself, and would make the gate fire on edits inside the module.
		expect(stream?.internalEdges).toBe(1);
		expect(stream?.files).toBe(2);
		expect(stream?.lines).toBe(45);
	});

	it("reports zero rather than omitting a module nothing imports", () => {
		// An absent module reads as "not measured"; a zero reads as "measured, nothing
		// depends on it", which is the difference between safe to move and unknown.
		const measured = computeFanIn([], files, ROOT);
		const stream = measured.find(entry => entry.module === "stream");

		expect(stream).toBeDefined();
		expect(stream?.externalImporters).toBe(0);
	});
});

describe("specifiersIn", () => {
	it("reads a shebang'd entry point, and does not double-count a dynamic import", () => {
		// `src/cli.ts` opens with `#!/usr/bin/env bun`, which the transpiler rejects. One
		// unparsed file takes down every import it declares — and cli.ts is one of the
		// largest importers in the tree, so the loss is not local to it.
		const specifiers = specifiersIn(
			["#!/usr/bin/env bun", 'import { run } from "./run";', 'const lazy = import("../lazy");'].join("\n"),
			"ts",
		);

		expect([...specifiers].sort()).toEqual(["../lazy", "./run"]);
	});

	it("also reports the type-position import the transpiler erases", () => {
		// `import("…")` in a type position leaves no runtime edge, but it is a real
		// compile-time dependency and a real edit when a directory moves.
		expect(specifiersIn('type E = import("../session/auth-storage").Session;', "ts")).toContain(
			"../session/auth-storage",
		);
	});
});

describe("findRegressions", () => {
	const entry = (module: string, externalImporters: number) => ({
		module,
		externalImporters,
		internalEdges: 0,
		files: 1,
		lines: 1,
	});

	it("fails on a rise and passes on a fall, because only one of them is bad news", () => {
		const baseline = new Map([
			["stream", 4],
			["commit", 9],
		]);

		// stream gained an importer: more files name it, so moving it costs more than
		// the approved estimate said. This is the case the gate exists for.
		const regressions = findRegressions([entry("stream", 5), entry("commit", 6)], baseline);

		expect(regressions).toHaveLength(1);
		expect(regressions[0]).toEqual({ module: "stream", baseline: 4, current: 5 });

		// commit lost importers: it is closer to movable, and failing on progress would
		// get this gate switched off within the week.
		expect(findRegressions([entry("stream", 4), entry("commit", 9)], baseline)).toEqual([]);
		expect(findRegressions([entry("stream", 3), entry("commit", 0)], baseline)).toEqual([]);
	});

	it("does not freeze the gate on a module the baseline never recorded", () => {
		// New directories appear with every reorganisation. A high count for a module
		// with no baseline entry is not a regression — there is nothing to have risen
		// above — and treating it as one would make the gate fail on any addition.
		expect(findRegressions([entry("brand-new", 900)], new Map([["stream", 4]]))).toEqual([]);
	});
});

describe("findWeakening", () => {
	// The contract this defends: the measurement must not be able to buy itself
	// a pass. A gate that owns its own threshold is not a gate — running it and
	// committing the result moves the bar to wherever the code already is, so the
	// next run has nothing to report. Measured on this tree: a bare
	// `bun run measure:fan-in` had silently carried `packageFileCount` from 6778
	// to 6793, erasing that much deletion headroom with nothing but a dirty file.
	const baseline = {
		capturedAt: "2026-10-01",
		definition: "d",
		packageFileCount: 6778,
		modules: { stream: 4, commit: 9, tools: 120 },
	};

	it("names a ceiling that moved up and a floor that moved down", () => {
		// stream gained an importer (ceiling up) and files were deleted (floor down):
		// the two ways an update can make the gate accept more than it accepted.
		const weakened = findWeakening(baseline, {
			...baseline,
			packageFileCount: 6700,
			modules: { stream: 5, commit: 9, tools: 120 },
		});

		expect(weakened.map(w => w.detail)).toEqual(["stream ceiling 4 -> 5", "tracked files floor 6778 -> 6700"]);
	});

	it("allows progress: ceilings down, floor up, and new modules", () => {
		// Everything moving the right way at once. An added module has no recorded
		// ceiling yet, so it is not a weakening — otherwise the first module to
		// appear after a decomposition would be unrecordable.
		expect(
			findWeakening(baseline, {
				...baseline,
				packageFileCount: 6800,
				modules: { stream: 3, commit: 4, tools: 118, widgets: 0 },
			}),
		).toEqual([]);
	});

	it("does not punish a module that stopped existing", () => {
		// `findRegressions` already treats an unrecorded module as never-failing;
		// inventing a regression for one that vanished would make deleting dead code
		// the only thing this gate blocks.
		expect(findWeakening(baseline, { ...baseline, modules: { stream: 4, tools: 120 } })).toEqual([]);
	});
});

describe("baseline seal", () => {
	const base = {
		capturedAt: "2026-10-01",
		definition: "d",
		packageFileCount: 6778,
		modules: { stream: 4, commit: 9 },
	};

	it("accepts a baseline that still matches its own hash", () => {
		expect(isSealedIntact(sealBaseline(base))).toBe(true);
	});

	it("refuses a baseline with no seal at all", () => {
		// `undefined` must not read as valid, or every file written before this
		// check existed would be unverified — which is the state the check was
		// added to fix. Measured: an unsealed committed baseline makes --check red.
		expect(isSealedIntact(base)).toBe(false);
		expect(isSealedIntact({ ...sealBaseline(base), contentHash: undefined })).toBe(false);
	});

	it("catches a hand-LOOSENED ceiling, which is the hole the seal exists for", () => {
		// The ratchet refuses a weakening on the --update path, but --check only ever
		// compared two numbers. Editing the file to raise a ceiling made the gate
		// agree with the edit, because the file it read was the file that changed.
		const loosened = sealBaseline(base);
		const tampered = { ...loosened, modules: { ...loosened.modules, stream: 99 } };
		expect(isSealedIntact(tampered)).toBe(false);
	});

	it("catches a hand-LOWERED floor, which erases deletion headroom", () => {
		const tampered = { ...sealBaseline(base), packageFileCount: 100 };
		expect(isSealedIntact(tampered)).toBe(false);
	});

	it("does not depend on how the JSON is laid out", () => {
		// `sealInput` rebuilds a fixed-order object, so a key-sorting formatter
		// cannot redden the baseline. Measured, because an earlier comment here
		// asserted the opposite and was wrong.
		const sealed = sealBaseline(base);
		const reordered = {
			modules: sealed.modules,
			packageFileCount: sealed.packageFileCount,
			definition: sealed.definition,
			capturedAt: sealed.capturedAt,
			contentHash: sealed.contentHash,
		};
		expect(isSealedIntact(reordered)).toBe(true);
	});

	it("is a marker against carelessness, not a signature — state the limit", () => {
		// Measured, and recorded so nobody mistakes it for more than it is: anyone
		// who edits the baseline can recompute the hash and --check goes green
		// again. What it buys is that the loosening is a *reviewed diff* rather
		// than a silent one, because --update is the only thing that writes the
		// file and its own guard refuses the same edit.
		const resigned = sealBaseline({ ...base, modules: { ...base.modules, stream: 99 } });
		expect(isSealedIntact(resigned)).toBe(true);
	});
});

describe("--check enforces the seal", () => {
	// The unit rows above call `isSealedIntact` directly, which leaves the wiring
	// unpinned: disabling the call inside `--check` left all of them green, and a
	// hand-loosened baseline then sailed through with exit 0. So this runs the real
	// command against a tampered baseline.
	//
	// It edits a tracked file, which is why it restores in a `finally` — the same
	// discipline as gen-patch-ledger.test.ts. A test that leaves the tree
	// different is worse than no test.
	const baseline = path.join(import.meta.dir, "fan-in-baseline.json");

	test("a hand-edited baseline fails the real command, naming the seal", async () => {
		const original = await Bun.file(baseline).text();
		try {
			const parsed = JSON.parse(original) as { modules: Record<string, number> };
			parsed.modules.stream = 999;
			await Bun.write(baseline, `${JSON.stringify(parsed, null, "\t")}\n`);

			const proc = Bun.spawn(["bun", path.join(import.meta.dir, "measure-fan-in.ts"), "--check"], {
				cwd: path.join(import.meta.dir, ".."),
				stdout: "pipe",
				stderr: "pipe",
				stdin: "ignore",
			});
			const [stderr, exitCode] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);

			expect(exitCode).toBe(1);
			// Named as a hand edit, not as a fan-in regression. The distinction is
			// the whole point: a regression is a real finding to fix, whereas this is
			// the gate refusing to be edited into agreeing with itself.
			expect(stderr).toContain("does not match its own contentHash");
			expect(stderr).toContain("hand edit, not a measurement");
		} finally {
			await Bun.write(baseline, original);
		}
	}, 60_000);

	test("the untouched baseline passes the same command", async () => {
		const proc = Bun.spawn(["bun", path.join(import.meta.dir, "measure-fan-in.ts"), "--check"], {
			cwd: path.join(import.meta.dir, ".."),
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
		const [stderr, exitCode] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);

		expect(stderr).not.toContain("contentHash");
		expect(exitCode).toBe(0);
	}, 60_000);
});
