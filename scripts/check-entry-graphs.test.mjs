import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { resolveNode } from "./resolve-node.mjs";

const script = fileURLToPath(new URL("./check-entry-graphs.mjs", import.meta.url));

// `bun test` runs under Bun, and this gate spawns a real child process, so it
// needs the Node binary rather than `process.execPath`.
const nodePath = resolveNode();

/**
 * Run the gate with one constant rewritten, against the REAL repository graph.
 *
 * A mutated copy is used rather than a synthetic workspace because the gate
 * derives ROOT from its own location, so it can only ever measure this tree —
 * which is what makes these tests worth having: they prove the gate bites on
 * the graph it will actually be asked to police, not on a fixture shaped to
 * agree with it. The copy is written beside the original so ROOT is unchanged,
 * and removed whether the run passes or throws.
 */
function runMutated(t, edits) {
	const probe = join(fileURLToPath(new URL(".", import.meta.url)), `.entry-graph-probe-${process.pid}-${t.name}.mjs`);
	copyFileSync(script, probe);
	t.after(() => rmSync(probe, { force: true }));
	let source = readFileSync(probe, "utf8");
	for (const edit of edits) {
		// `Array.isArray`, not `typeof === "string"`: an array pair IS an object, and
		// destructuring `.find` off one yields Array.prototype.find, which reads as a
		// missing anchor rather than as the type error it is.
		const { find, to } = Array.isArray(edit) ? { find: edit[0], to: edit[1] } : edit;
		assert.equal(typeof find, "string", `probe edit has no anchor: ${JSON.stringify(edit)}`);
		assert.ok(source.includes(find), `probe anchor is missing from the gate: ${find}`);
		// `to` may be a function, for an edit whose extent is only knowable from the
		// source itself — an anchor that merely ADDS a line is not the same edit as
		// one that REMOVES a block, and only the second empties the map.
		source = typeof to === "function" ? to(source) : source.replace(find, to);
	}
	writeFileSync(probe, source);
	return spawnSync(nodePath, [probe], { encoding: "utf8" });
}

const CLI_BUDGET = '"src/cli.ts": { maxFiles: 24 }';

// A gate that is always green is not a gate: nothing fails, so nobody asks why
// the number stopped moving. Both directions are asserted, because an inverted
// comparison is green for the same reason a missing one is.
test("fails when an entry's graph exceeds its budget, and names the numbers", t => {
	const result = runMutated(t, [[CLI_BUDGET, '"src/cli.ts": { maxFiles: 3 }']]);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /reaches 24 files, budget 3/);
	// The number has to be in the report: a red line naming no figures leaves the
	// reader to re-run the tool to find out what moved.
	assert.match(result.stderr, /src[\\/]cli\.ts/);
});

test("passes when the budget is above the measured graph", t => {
	const result = runMutated(t, [[CLI_BUDGET, '"src/cli.ts": { maxFiles: 9999 }']]);
	assert.equal(result.status, 0, result.stderr);
});

// The failure this exists to prevent: the workspace map keyed on the wrong scope
// resolves nothing, every graph collapses to the entry file, and the gate reports
// success having measured nothing. Green and measuring are different claims.
test("fails when a workspace package the graph reaches is missing from WORKSPACE", t => {
	const result = runMutated(t, [{ find: '\t"@oh-my-pi/pi-utils": "packages/utils/src",\n', to: "" }]);
	assert.equal(result.status, 1, "a package the graph imports dropped out of the map and the gate still passed");
	assert.match(result.stderr, /UNDER-MEASURED/);
	assert.match(result.stderr, /@oh-my-pi\/pi-utils/);
});

test("fails when the whole workspace map resolves nothing", t => {
	// Remove the map's entries outright. Inserting a comment at the same anchor
	// would leave every entry in place and this row would pass for the wrong
	// reason — the mutation lands either way, which is exactly why the extent is
	// computed from the source rather than written as a literal replacement.
	const result = runMutated(t, [
		{
			find: "const WORKSPACE = {",
			to: src => {
				const start = src.indexOf("const WORKSPACE = {");
				const end = src.indexOf("\n};", start);
				return `${src.slice(0, start)}const WORKSPACE = {${src.slice(end)}`;
			},
		},
	]);
	assert.equal(result.status, 1, "the gate reported success while measuring nothing");
	assert.match(result.stderr, /UNDER-MEASURED/);
});

// A package with no `src/` ships compiled output and has no graph to walk, so it
// is a leaf in the same sense a third-party dependency is. Excluding those is
// correct; the miss-report must not fire for one, or it cries wolf on a leaf.
test("does not report a miss for our own package that has no source tree", t => {
	const result = runMutated(t, [
		["const OUR_PACKAGES = new Set(", "const OUR_PACKAGES = new Set(\n\t'@oh-my-pi/pi-natives',"],
	]);
	assert.equal(result.status, 0, result.stderr);
});

// A budget naming a path that is not there is a stale budget, not a passing one.
// Without this the entry is simply never walked and the gate has no opinion.
test("fails when a budget names an entry that does not exist", t => {
	const result = runMutated(t, [
		['"src/cli/worker-selectors.ts": { maxFiles: 5 }', '"src/cli/no-such-entry.ts": { maxFiles: 5 }'],
	]);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /does not exist/);
});

// The control every other row here is a perturbation of: unmutated, the gate
// must be green on this tree. Without it, a gate stuck red satisfies the tests
// above and tells nobody anything.
test("passes on this tree with its own budgets", () => {
	const result = spawnSync(nodePath, [script], { encoding: "utf8" });
	assert.equal(result.status, 0, result.stderr);
});
