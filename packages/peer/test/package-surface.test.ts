/**
 * Every module this package ships must be reachable from its barrel.
 *
 * `epic-jwsy.13` — the gap that prompted this: `src/presence/` was committed with a
 * full liveness implementation, and `src/index.ts` never re-exported it. Nothing
 * broke, no type error fired, and `presence.test.ts` stayed green — because it
 * imports `../src/presence/liveness` **directly**, so it proved the module works
 * while proving nothing about whether a consumer can obtain it.
 *
 * Two package.json paths were checked before calling this unreachable, and both
 * close: the root `exports` entry points at `src/index.ts`, which omitted the
 * directory, and the `./*` wildcard maps to `./src/*.ts`, so
 * `@ultraworkers/peer/presence` resolves to `src/presence.ts` — a file that does
 * not exist, because it is a directory. The module had exactly one reachable
 * route and that route was not built.
 *
 * So the assertion is structural rather than a symbol list: every directory under
 * `src/` that ships an `index.ts` must contribute its exports to the barrel. A
 * symbol list would be wrong here — `presence` is being rewritten underneath us,
 * and pinning names would make this test fail on a rename that changed nothing an
 * importer can see.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

import * as barrel from "../src/index";

const SRC = path.join(import.meta.dir, "../src");

/** Directories under `src/` that present themselves as a module via an `index.ts`. */
function moduleDirectories(): string[] {
	return fs
		.readdirSync(SRC, { withFileTypes: true })
		.filter(entry => entry.isDirectory() && fs.existsSync(path.join(SRC, entry.name, "index.ts")))
		.map(entry => entry.name)
		.sort();
}

describe("the package barrel reaches every module the package ships", () => {
	it("re-exports at least one binding from each module directory", async () => {
		const dirs = moduleDirectories();
		// A directory list of zero would make the loop below vacuously pass, which is
		// the shape of a gate that reads green because it ran against nothing.
		expect(dirs.length).toBeGreaterThan(0);

		const bare: string[] = [];
		for (const dir of dirs) {
			const own = (await import(`../src/${dir}/index.ts`)) as Record<string, unknown>;
			const provided = Object.keys(own);
			expect({ dir, exports: provided.length > 0 }).toEqual({ dir, exports: true });

			// Type-only exports vanish at runtime, so a module can legitimately add
			// bindings without widening the barrel. That case is indistinguishable
			// from the bug here, so it is recorded rather than asserted on: the
			// per-module row above is the part that must hold.
			for (const name of provided) {
				if (!(name in barrel)) bare.push(`${dir}/${name}`);
			}
		}
		expect(bare).toEqual([]);
	});

	it("exposes the liveness probe, which the barrel had been hiding", () => {
		// Named rather than folded into the loop: this is the exact regression, and
		// the loop above only proves it structurally. If `src/presence` is ever
		// renamed wholesale this row names the replacement to update, rather than
		// failing with a bare `["presence/probePid"]`.
		expect(typeof (barrel as Record<string, unknown>).probePid).toBe("function");
	});
});
