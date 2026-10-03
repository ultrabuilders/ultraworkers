#!/usr/bin/env node
/**
 * Entry points are cost contracts.
 *
 * A package's `exports` map is the only place that says which modules are public, and one stray
 * `export *` can silently make a narrow entry drag an entire barrel: importing a 1-file pure
 * function through a barrel costs ~37 MB of evaluated module graph, and nothing fails until someone
 * measures a process. This walks the value-import graph of every declared entry point and enforces a
 * budget per entry, so that regression fails at commit time instead.
 *
 * Only value imports count. `import type` / `export type` are erased before Node sees them.
 *
 * SCOPE — external dependencies are deliberately out of the graph. `resolveSpec`
 * returns `null` for a `node:` specifier and for any package not in `WORKSPACE`, so a
 * third-party import adds nothing to a graph. That is the tool's point (it budgets
 * OUR barrels, not npm's), but it has a consequence worth knowing before trusting a
 * control: adding `import { statSync } from "node:fs"` to a budgeted entry does NOT move
 * its number, so a probe built that way proves nothing. To check the gate bites, add a
 * WORKSPACE value import — that moves 5 -> 11 on `worker-selectors.ts` and exits 1.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Workspace package name -> its source root, so cross-package imports are followed.
 *
 * Adapted from `pi`'s `scripts/check-entry-graphs.mjs`, which keys this map on
 * `@earendil-works/*`. Copying that map verbatim here would resolve nothing: every
 * specifier would fall through to "external dependency", every graph would be one
 * file, and the gate would report "Entry point graphs are within budget" while
 * measuring nothing at all.
 */
const WORKSPACE = {
	"@ultraworkers/chord": "packages/chord/src",
	"@oh-my-pi/collab-web": "packages/collab-web/src",
	"@oh-my-pi/omptype": "packages/omptype/src",
	"@oh-my-pi/pi-agent-core": "packages/agent/src",
	"@oh-my-pi/pi-ai": "packages/ai/src",
	"@oh-my-pi/pi-catalog": "packages/catalog/src",
	"@oh-my-pi/pi-client": "packages/client/src",
	"@oh-my-pi/pi-codemode": "packages/codemode/src",
	"@oh-my-pi/pi-coding-agent": "packages/coding-agent/src",
	"@oh-my-pi/pi-durable": "packages/durable/src",
	"@oh-my-pi/pi-evals": "packages/evals/src",
	"@oh-my-pi/pi-metaharness": "packages/metaharness/src",
	"@ultraworkers/pi-mnemopi": "packages/mnemopi/src",
	"@oh-my-pi/pi-protocol": "packages/protocol/src",
	"@oh-my-pi/pi-server": "packages/server/src",
	"@oh-my-pi/pi-telemetry": "packages/telemetry/src",
	"@oh-my-pi/pi-tui": "packages/tui/src",
	"@oh-my-pi/pi-utils": "packages/utils/src",
	"@oh-my-pi/pi-wire": "packages/wire/src",
	"@oh-my-pi/omp-stats": "packages/stats/src",
	"@ultraworkers/snapcompact": "packages/snapcompact/src",
	"@oh-my-pi/typescript-edit-benchmark": "packages/typescript-edit-benchmark/src",
};

/**
 * Budgets are deliberate. `.` and `./node` are batteries-included entries and stay unbounded; every
 * narrow entry states the graph it is allowed to reach.
 *
 * A budget key is either an `exports` key of the package (as in `pi`) or a
 * package-relative source path ending in `.ts`. The second form exists because the
 * entry points this gate most needs to bound — `cli.ts` and the worker selector table —
 * are NOT declared in `package.json`'s `exports`; they are reached through the `./cli/*`
 * wildcard alongside 58 other files, which would budget them as a blur instead of naming
 * what each one costs.
 *
 * WORKERS RE-ENTER `cli.ts`. Per AGENTS.md every worker spawn re-executes this single
 * entry module, so the `cli.ts` graph is paid by every worker selector, not only by the
 * CLI. That is why it is the entry worth bounding.
 */
/**
 * Ratchet, not oracle. These numbers were measured on this tree and are the ceiling from
 * here forward: the gate fails when an entry's graph GROWS, which is the regression this
 * tool exists to catch. They are NOT the bead's authoritative baseline — GAP-M1B-1 step 3
 * requires capturing that after M1 merges and after the first port wave, and doing it
 * before then would lock in a pre-M1 number.
 *
 * Re-pinning is a decision and has to be written as one. A baseline that moves to whatever
 * the tool last printed is not a ratchet, it is a mirror — it can never fail. So every
 * re-pin below names what grew and why the growth is intended; a re-pin that cannot say so
 * is the case to argue about, not the case to apply.
 *
 * **One added leaf under `@oh-my-pi/pi-utils` moves all three entries at once.** Every entry
 * here reaches the utils barrel (`cli.ts` directly, `worker-selectors.ts` through
 * `worker-host.ts` → `dirs.ts`), so a new module in that graph is `+1` in all three
 * simultaneously. That is the signature of a shared-leaf addition, and it is how 24/5/284
 * became 25/6/285 in one commit — see the `brand.ts` note under `cli.ts` below. Recognising the
 * signature is what keeps a re-pin from being mistaken for three unrelated regressions.
 *
 * **Thresholds already tried for the `brand.ts` +1, so nobody re-measures them.** Both were
 * measured, not argued, and both are impossible rather than merely undesirable:
 *
 * - *Hoist it out of the graph* — impossible by construction. `brand.ts` has **zero imports**,
 *   so there is nothing above it to cut. The only remaining lever is dropping the
 *   `export * from "./brand"` in `dirs.ts`, which reaches the 152 files that read `APP_NAME`
 *   and undoes the browser-bundle isolation the extraction exists to provide.
 * - *Make the utils barrel import lazy* — measured **delta 0** on both `cli.ts` and
 *   `stream.ts`. Treating `@oh-my-pi/pi-utils` as a dynamic import removes **no** files,
 *   because `brand.ts` arrives by another path. It is not a style question; it cannot work.
 */
const BUDGETS = {
	"packages/coding-agent": {
		// Measured 24, re-pinned to 25 by `f6c4fb9e79`. cli.ts has only 6 static value
		// imports and loads the command registry, help, and stats through
		// `await import(...)`, so this graph is already small. The entry that is NOT small
		// is `packages/ai/src/stream.ts`, budgeted below.
		//
		// The +1 is `packages/utils/src/brand.ts`, a zero-import leaf holding `APP_NAME`.
		// That extraction is the point of the module: a browser bundle must be able to read
		// the product name without resolving where state lives, which means without
		// `node:fs`/`node:os`. `dirs.ts` re-exports it, so every utils consumer reaches it.
		// Hoisting it back out would undo the fix the commit made, so the ceiling moves.
		"src/cli.ts": { maxFiles: 25 },
		// Same +1, same cause, for the same reason — it reaches the barrel through
		// `worker-host.ts`. Bumped in the same commit as `cli.ts` and `stream.ts` because it
		// was one shared leaf, not three separate growths.
		"src/cli/worker-selectors.ts": { maxFiles: 6 },
	},
	"packages/ai": {
		// 284, and the number came from this gate rather than from a hand: add the entry
		// with a deliberately-wrong budget, let the gate print `reaches N files, budget 1`,
		// then pin N. A budget copied from someone's PR is a budget that PR chose.
		//
		// This entry is here because the two above could not see GAP-M1B-5. That change moved
		// eight provider transports behind a lazy `await import()` in registry/transports.ts,
		// but neither `cli.ts` nor the worker selector table reaches `stream.ts` — cli.ts
		// touches the `ai` package only through a dynamic import — so the optimisation moved
		// no number the gate could see, and nothing would have caught it regrowing. 52 of the
		// 284 are still provider transports.
		//
		// It previously carried a note claiming the package had "zero dynamic imports" and
		// measured 341 modules / 60 transports. Two of those described the pre-GAP-M1B-5 tree
		// and no longer hold: the graph is 284 / 52, from this gate's own count. The third
		// never held either — before this gate existed, `packages/ai/src` already carried 22
		// dynamic imports across 4 files, every one of them under `registry/hooks/`. So the
		// package's only lazy mechanism was already the hook registries, and already gathered
		// in one directory; `registry/transports.ts` landing beside them is not a coincidence.
		// 341 is dropped outright, because nobody has reproduced it and a number with no
		// source reads like it has one.
		// 284, re-pinned to 285 by the same `f6c4fb9e79` that moved the two entries above:
		// `stream.ts` reaches the utils barrel too, so `brand.ts` was its +1 as well. 52 of
		// the 285 are still provider transports.
		"src/stream.ts": { maxFiles: 285 },
	},
};

const SPEC = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)([^;]*?\sfrom\s*)?["']([^"']+)["']/g;

/**
 * `resolveSpec` answers `null` for a `node:` specifier and for anything not in
 * `WORKSPACE`. Those two are different facts that used to arrive as the same
 * answer: a third-party dependency genuinely is out of graph, but so is one of
 * OUR packages whose name never made it into `WORKSPACE`. The gate could not tell
 * them apart, so dropping a package from the map shrank every graph and it still
 * reported "within budget" — a gate that measures less and says the same thing.
 *
 * The marker is what separates them: a bare specifier naming a directory that
 * exists under `packages/` is ours, so a miss there is a gate bug, not a boundary.
 */
const FORGOTTEN = Symbol("workspace-package-not-in-WORKSPACE");

function resolveSpec(spec, fromFile) {
	if (spec.startsWith("node:")) return null;
	if (spec.startsWith(".")) {
		const base = resolve(dirname(fromFile), spec);
		for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
			if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
		}
		return null;
	}
	for (const [name, src] of Object.entries(WORKSPACE)) {
		if (spec === name) return resolve(ROOT, src, "index.ts");
		if (!spec.startsWith(`${name}/`)) continue;
		const tail = spec.slice(name.length + 1);
		for (const candidate of [`${tail}.ts`, `${tail}/index.ts`, tail]) {
			const file = resolve(ROOT, src, candidate);
			if (existsSync(file) && statSync(file).isFile()) return file;
		}
	}
	// Not in WORKSPACE. If the specifier names one of OUR packages, the map is stale
	// and this graph is about to be measured short — say so rather than under-report.
	if (OUR_PACKAGES.has(specifierPackage(spec))) return FORGOTTEN;
	return null; // external dependency: genuinely not part of the workspace graph
}

/**
 * Our packages that have a source tree to walk, read from the manifests rather
 * than from the directory layout — `@oh-my-pi/pi-tui` lives in `packages/tui`, so
 * `packages/<name>` is not a thing and a check written that way silently matches
 * nothing.
 *
 * A package with no `src/` is a leaf in exactly the sense a third-party
 * dependency is: `pi-natives` ships compiled native bindings and has no TypeScript
 * to follow. Excluding those is correct, and including them would report a
 * workspace miss for a package that was never in the graph to begin with.
 */
const OUR_PACKAGES = new Set(
	readdirSync(resolve(ROOT, "packages"), { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => {
			const dir = resolve(ROOT, "packages", dirent.name);
			if (!existsSync(resolve(dir, "src"))) return undefined;
			try {
				return JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8")).name;
			} catch {
				return undefined;
			}
		})
		.filter(name => typeof name === "string"),
);

/** The package name a bare specifier starts with, or undefined if it is not a bare specifier. */
function specifierPackage(spec) {
	if (spec.startsWith(".") || spec.startsWith("node:")) return undefined;
	const parts = spec.split("/");
	return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function walk(entryFile) {
	const seen = new Set();
	const forgotten = new Set();
	const queue = [entryFile];
	while (queue.length > 0) {
		const file = queue.pop();
		if (seen.has(file) || file.endsWith(".json")) continue;
		seen.add(file);
		for (const match of readFileSync(file, "utf8").matchAll(SPEC)) {
			const target = resolveSpec(match[2], file);
			if (target === FORGOTTEN) {
				forgotten.add(match[2]);
				continue;
			}
			if (target) queue.push(target);
		}
	}
	return { seen, forgotten };
}

/** `./dist/harness/context.js` in the exports map is `src/harness/context.ts` on disk. */
function sourceFor(pkgDir, distPath) {
	const rel = distPath.replace(/^\.\/dist\//, "").replace(/\.js$/, ".ts");
	const file = resolve(ROOT, pkgDir, "src", rel);
	return existsSync(file) ? file : undefined;
}

/** The graph as repo-relative paths, plus any of our own packages the walk could not resolve. */
function measure(source) {
	const { seen, forgotten } = walk(source);
	return { graph: [...seen].map(file => relative(ROOT, file)), forgotten };
}

function expand(pkgDir, entry, target) {
	if (!entry.includes("*")) return [[entry, target]];
	const dir = resolve(ROOT, pkgDir, "src", dirname(target.replace(/^\.\/dist\//, "")));
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter(name => name.endsWith(".ts"))
		.map(name => [entry.replace("*", name.replace(/\.ts$/, "")), target.replace("*", name.replace(/\.ts$/, ""))]);
}

/**
 * Green output names its numbers too.
 *
 * The red line already had to — a violation naming no figures sends the reader back to re-run the
 * tool to find out what moved. The green line needed the same and did not have it, which matters
 * more here than on an ordinary gate: these budgets are a ratchet sitting exactly on today's
 * measurement, so every entry has **zero headroom**, and "within budget" cannot say so. A reader
 * who cannot see the margin has no way to tell a healthy ratchet from one that is about to fire on
 * the next unrelated import.
 *
 * An under-measured graph is never recorded: its headroom would be arithmetic over a graph already
 * reported as short, and it would print a number that looks more authoritative than it is.
 */
const measured = [];
function report(label, count, budget) {
	measured.push(`  ${label}: ${count} files, budget ${budget}, headroom ${budget - count}`);
}

let failures = 0;
for (const [pkgDir, budgets] of Object.entries(BUDGETS)) {
	const manifest = JSON.parse(readFileSync(resolve(ROOT, pkgDir, "package.json"), "utf8"));
	for (const [entry, budget] of Object.entries(budgets)) {
		// A `.ts` key names a source file directly; anything else is an `exports` key.
		if (entry.endsWith(".ts")) {
			const source = resolve(ROOT, pkgDir, entry);
			if (!existsSync(source)) {
				console.error(`${pkgDir} budget names ${entry}, which does not exist`);
				failures += 1;
				continue;
			}
			const { graph, forgotten } = measure(source);
			if (forgotten.size > 0) {
				console.error(
					`${pkgDir} ${entry} imports workspace packages missing from WORKSPACE, so its graph ` +
						`is UNDER-MEASURED: ${[...forgotten].join(", ")}`,
				);
				failures += 1;
			}
			if (forgotten.size === 0) report(`${pkgDir} ${entry}`, graph.length, budget.maxFiles);
			if (graph.length > budget.maxFiles) {
				console.error(
					`${pkgDir} ${entry} reaches ${graph.length} files, budget ${budget.maxFiles}\n` +
						graph.map(file => `    ${file}`).join("\n"),
				);
				failures += 1;
			}
			for (const pattern of budget.forbid ?? []) {
				const hit = graph.filter(file => file.includes(pattern));
				if (hit.length > 0) {
					console.error(`${pkgDir} ${entry} must not reach ${pattern}:\n${hit.map(f => `    ${f}`).join("\n")}`);
					failures += 1;
				}
			}
			continue;
		}
		const declared = manifest.exports?.[entry];
		if (!declared) {
			console.error(`${pkgDir} declares no export "${entry}" but a budget exists for it`);
			failures += 1;
			continue;
		}
		const target = typeof declared === "string" ? declared : declared.import;
		for (const [name, distPath] of expand(pkgDir, entry, target)) {
			const source = sourceFor(pkgDir, distPath);
			if (!source) {
				console.error(`${pkgDir} export "${name}" points at ${distPath}, which has no source file`);
				failures += 1;
				continue;
			}
			const { graph, forgotten } = measure(source);
			if (forgotten.size > 0) {
				console.error(
					`${pkgDir} ${entry} imports workspace packages missing from WORKSPACE, so its graph ` +
						`is UNDER-MEASURED: ${[...forgotten].join(", ")}`,
				);
				failures += 1;
			}
			if (forgotten.size === 0) report(`${pkgDir} export "${name}"`, graph.length, budget.maxFiles);
			if (graph.length > budget.maxFiles) {
				console.error(
					`${pkgDir} export "${name}" reaches ${graph.length} files, budget ${budget.maxFiles}\n` +
						graph.map(file => `    ${file}`).join("\n"),
				);
				failures += 1;
			}
			for (const pattern of budget.forbid ?? []) {
				const hit = graph.filter(file => file.includes(pattern));
				if (hit.length > 0) {
					console.error(
						`${pkgDir} export "${name}" must not reach ${pattern}:\n${hit.map(f => `    ${f}`).join("\n")}`,
					);
					failures += 1;
				}
			}
		}
	}
}

if (failures > 0) {
	console.error(`\n${failures} entry-point budget violation(s).`);
	process.exit(1);
}
if (measured.length > 0) console.log(measured.join("\n"));
console.log("Entry point graphs are within budget.");
