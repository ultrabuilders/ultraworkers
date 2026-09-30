#!/usr/bin/env node
/**
 * Run the three dependency/packaging invariants, each under Node.
 *
 * `bunfig.toml` sets `[run] bun = true`, so `bun run <script>` executes the
 * script body with Bun. That is right for this repo's own TypeScript — but
 * `check-runtime-deps.mjs` drives `typescript/unstable/sync`, which reaches for
 * `child.stdout._handle.fd` and therefore only works on a real Node stream. Run
 * under Bun it dies with `stdout._handle.fd` being undefined, which would fail
 * `check:ts` for a reason that has nothing to do with the code being checked.
 *
 * Spawning Node here is therefore a runtime requirement, not a preference: this
 * file is the seam that keeps the gates runnable from `bun run check:ts`
 * without loosening the repo-wide Bun setting that everything else depends on.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { resolveNode } from "./resolve-node.mjs";

const gates = [
	["check-pinned-deps.mjs", "external dependencies must use exact versions"],
	["check-runtime-deps.mjs", "public package runtime imports must be declared"],
	["check-lockfile-commit.mjs", "staged lockfile changes must be reviewed"],
];

// `process.execPath` is Bun when this file runs under `bun run` — spawning it
// would reproduce the exact failure this script exists to avoid. Nor is PATH
// trustworthy: `bun run` prepends a shim directory whose `node` is a symlink to
// the bun binary, so a path that looks like Node may be Bun in disguise.
// `resolveNode` probes candidates rather than trusting the first hit, and
// throws when none is real — a gate that cannot run must say so rather than
// silently falling back to Bun.
let nodePath;
try {
	nodePath = resolveNode();
} catch (error) {
	process.stderr.write(`${error.message}\n`);
	process.exit(1);
}

/**
 * Each gate runs in its own `node` process, one after another, and this runner
 * stops at the first red one.
 *
 * The gates are separate processes on purpose, not an in-process loop: each one
 * exits non-zero to signal a policy violation, and an in-process call could only
 * report that through a thrown error or a returned code this file would then
 * have to re-derive. Running them as real processes keeps the exit code the
 * gate itself chose.
 */
for (const [script, description] of gates) {
	const path = fileURLToPath(new URL(script, import.meta.url));
	const result = spawnSync(nodePath, [path], {
		encoding: "utf8",
		// Under `bun run`, this process's own stdio are Bun's; a child that
		// inherits them gets a stream with no `_handle`, which is what breaks
		// typescript/unstable/sync inside check-runtime-deps. Capturing and
		// re-emitting keeps the child's output byte-identical either way.
		stdio: ["inherit", "pipe", "pipe"],
	});
	if (result.error) {
		process.stderr.write(`failed to run ${script}: ${result.error.message}\n`);
		process.exit(1);
	}
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	if (result.status !== 0) {
		process.stderr.write(`\n${description} — gate failed (${script})\n`);
		process.exit(result.status ?? 1);
	}
}
