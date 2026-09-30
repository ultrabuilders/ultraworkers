import { spawnSync } from "node:child_process";
import * as path from "node:path";

/**
 * A candidate is real Node only if it reports a Node version. Bun's stand-in
 * answers `--version` with a non-zero status and a repl error, so the version
 * probe — not the path — is what decides.
 */
function isRealNode(candidate) {
	const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
	return probe.status === 0 && /^v\d+\./.test(probe.stdout.trim());
}

/**
 * Every `node`-named executable reachable from PATH, in PATH order.
 *
 * Not `which node`: that reports only the FIRST match, and under `bun run` the
 * first match is Bun's shim — the real Node further down PATH would never be
 * examined. Walking the directories ourselves is also what makes this portable:
 * `which` is a shell builtin on some systems and absent on others, and Windows
 * spells it `where` and the executable `node.exe`, neither of which a hardcoded
 * `which` call handles.
 */
function nodeCandidatesOnPath() {
	const executableNames = process.platform === "win32" ? ["node.exe", "node.cmd", "node"] : ["node"];
	const candidates = [];
	for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
		if (!directory) continue;
		for (const name of executableNames) {
			candidates.push(path.join(directory, name));
		}
	}
	return candidates;
}

/**
 * Locate a Node binary that can actually run this repo's packaging gates.
 *
 * Two traps make both obvious approaches wrong, which is why this lives in one
 * place instead of inline at four call sites:
 *
 * 1. `process.execPath` is Bun whenever the caller is Bun — and `bunfig.toml`
 *    sets `[run] bun = true`, so `bun run <script>` executes the script body
 *    under Bun too, not just direct `bun <file>` invocation.
 * 2. Under `bun run`, PATH gains a temp shim directory whose `node` is a
 *    **symlink to the bun binary**, and it sorts first. Spawning it fails for a
 *    reason that has nothing to do with the code being checked. Every candidate
 *    is therefore probed before it is trusted, and PATH order is not evidence.
 *
 * When nothing qualifies this throws rather than falling back to Bun: a gate
 * that cannot run must say so instead of quietly passing.
 */
export function resolveNode() {
	const candidates = nodeCandidatesOnPath();
	for (const candidate of candidates) {
		if (isRealNode(candidate)) return candidate;
	}
	throw new Error(
		`no Node on PATH.\n` +
			`searched ${candidates.length} path entries under ${process.platform}; none reported a Node version (Bun's "node" shim does not).\n` +
			"check-runtime-deps drives typescript/unstable/sync, which only works on a real Node child-process stream.",
	);
}