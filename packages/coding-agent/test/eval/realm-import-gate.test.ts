/**
 * What `eval`'s JS realm actually promises about module access.
 *
 * ## This is not a sandbox, and these tests do not assert one
 *
 * The realm rewrites every dynamic `import(...)` callee to
 * `(typeof __omp_import__ === "function" ? __omp_import__ : (s, o) => import(s, o))`
 * (`eval/js/shared/rewrite-imports.ts`), which reads like a way around the realm's own
 * module loader. It is not a hole, because there is no boundary to get around:
 *
 * - `runtime.ts:662` is the load-bearing part. `__omp_import__` asks the module loader to
 *   resolve the specifier, and anything that is not one of the realm's own local modules
 *   is handed to the **host's** dynamic `import` (`runtime.ts:667`). So `node:fs/promises`
 *   resolves because the realm passes it to Node, on purpose. (There is also a builtin
 *   passthrough at `local-module-loader.ts:370`, and it is *not* what guarantees this:
 *   removing that branch leaves every row below green, because the host import still
 *   resolves the specifier.)
 * - The tool hands the model the filesystem directly. `src/prompts/tools/eval.md`
 *   advertises `Bun.file`, `Bun.write`, `Bun.$`, plus first-class `read(path)` and
 *   `write(path, content)` helpers.
 * - Every doc that touches the subject says so outright: `docs/extensions.md:41`
 *   ("in-process, not a sandboxed format"), `docs/extension-loading.md:273`,
 *   `docs/approval-mode.md:87`.
 * - And it is a dated decision, not an oversight. `m8-w4-097` records decision 1 —
 *   "is a sandbox something this product needs?" — as **deferred on 2026-09-29**;
 *   `m8-w8-100` keeps the realm-based "grant by not granting" mechanism open and marks
 *   `W1` (`FileSystemSandboxPolicy`) deferred.
 *
 * So a test that writes a file outside the cwd and asserts its bytes never come back is
 * asserting a boundary the contract never made. It fails, and failing correctly — the
 * read succeeds, as designed. The failure is in the premise, which came from the shape
 * of the symptom: a file outside the cwd looks like an escape until you check whether
 * the realm ever promised a filesystem boundary. It did not.
 *
 * ## What these tests hold instead
 *
 * The realm's real module contract, which is worth holding because it *is* load-bearing
 * and nobody would notice it rot: builtins resolve, `initialCwd` scopes local resolution,
 * and a cell that rebinds an injected global keeps that binding in the next cell.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { JsRuntime, type RuntimeHooks } from "@oh-my-pi/pi-coding-agent/eval/js/shared/runtime";
import type { JsDisplayOutput } from "@oh-my-pi/pi-coding-agent/eval/js/shared/types";
import { removeSyncWithRetries } from "@oh-my-pi/pi-utils";

/** A harness: one runtime, and every channel its output could arrive through. */
interface Cell {
	run(source: string): Promise<string>;
	dispose(): void;
}

function makeRuntime(initialCwd: string, sessionId: string): Cell {
	const texts: string[] = [];
	const displays: JsDisplayOutput[] = [];
	const hooks: RuntimeHooks = {
		onText: chunk => {
			texts.push(chunk);
		},
		onDisplay: (output: JsDisplayOutput) => {
			displays.push(output);
		},
		callTool: async () => undefined,
	};
	const runtime = new JsRuntime({ initialCwd, sessionId });
	return {
		async run(source: string): Promise<string> {
			texts.length = 0;
			displays.length = 0;
			await runtime.run(source, undefined, hooks);
			// Every channel, so a row cannot pass because one of them was missed.
			return [...texts, ...displays.map(d => JSON.stringify(d))].join("");
		},
		dispose: () => runtime.dispose(),
	};
}

const temps: string[] = [];

beforeAll(() => {
	for (const name of ["a", "b"]) {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), `omp-realm-${name}-`));
		temps.push(dir);
		// Same specifier, different bytes: the marker is what says which cwd won.
		fs.writeFileSync(path.join(dir, "mod.mjs"), `export const marker = 'FROM_${name.toUpperCase()}';\n`);
	}
});

afterAll(() => {
	for (const dir of temps) removeSyncWithRetries(dir);
});

describe("eval JS realm module resolution", () => {
	it("resolves a builtin specifier, and hands back a usable module", async () => {
		const cell = makeRuntime(process.cwd(), "realm-builtin");
		try {
			const out = await cell.run(
				`const fsMod = await import("node:fs/promises");
				 console.log(typeof fsMod.readFile, typeof fsMod.writeFile);`,
			);
			// Not a length check. These two named exports are what makes the realm's
			// deliberate hand-off to the host import useful rather than merely
			// permitted, and a future "hardening" that quietly turns this into a denial
			// is exactly the regression worth catching — it would break the tool prompt
			// that advertises Bun.file and the read()/write() helpers. Removing the
			// builtin passthrough in `local-module-loader.ts` does NOT make this row
			// red; blocking the hand-off in `__omp_import__` does.
			expect(out).toContain("function function");
		} finally {
			cell.dispose();
		}
	});

	it("scopes a relative specifier to initialCwd, and fails loudly when it is absent", async () => {
		const dirA = temps[0];
		const dirB = temps[1];
		const source = `const m = await import("./mod.mjs"); console.log(m.marker);`;

		const a = makeRuntime(dirA, "realm-cwd-a");
		const b = makeRuntime(dirB, "realm-cwd-b");
		try {
			// One specifier, two cwds, two answers. This is the row that makes the
			// builtin row above non-trivial: if `initialCwd` stopped scoping local
			// resolution, both would return the same module and this would still pass,
			// so the third cell is what pins the failure side.
			expect(await a.run(source)).toContain("FROM_A");
			expect(await b.run(source)).toContain("FROM_B");

			// A cwd with no such module surfaces an error instead of quietly resolving
			// to something else. Silently succeeding here is the failure that would let
			// a wrong-directory resolution pass unnoticed.
			const missing = makeRuntime(os.tmpdir(), "realm-cwd-missing");
			try {
				await expect(missing.run(source)).rejects.toThrow();
			} finally {
				missing.dispose();
			}
		} finally {
			a.dispose();
			b.dispose();
		}
	});

	it("keeps an injected global rebound by one cell in the next cell", async () => {
		const cell = makeRuntime(process.cwd(), "realm-rebind");
		try {
			expect(await cell.run(`console.log(typeof display);`)).toContain("function");

			// The rebinding `shared/runtime.ts` documents for `#recordGlobals`: without
			// re-capturing owned globals after each run, the next activation restores
			// the install-time value and silently clobbers what the cell assigned. The
			// symptom is not an error — it is a binding quietly reverting, which is why
			// it needs a test rather than a code read.
			await cell.run(`var display = 42;`);

			const after = await cell.run(`console.log(typeof display, display);`);
			expect(after).toContain("number 42");
		} finally {
			cell.dispose();
		}
	});
});
