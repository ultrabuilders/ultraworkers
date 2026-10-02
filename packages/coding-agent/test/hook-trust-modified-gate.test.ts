/**
 * A hook that was approved and then had its file edited must stop loading.
 *
 * The mechanism is `hooks/trust.ts`: a hash is recorded the first time a hook is
 * seen, and `extensions/loader.ts:947` refuses to admit a hook whose current
 * content no longer matches. That gate ships in the product and had **no test** —
 * `grep -rln 'hookTrustStatus' packages/coding-agent/test/` matched three files,
 * all of them unrelated (git commit conventions, `gh`, URL protocol). The
 * observable contract the bead describes was therefore unguarded: a refactor
 * could delete `=== "modified"` and every suite would stay green while edited
 * code kept running at the privilege the user approved for different code.
 *
 * ## Why this drives the loader, not `hookTrustStatus`
 *
 * Testing the exported function directly proves nothing: it stays green if
 * someone deletes the call site that consults it. This exercises
 * `discoverExtensionPaths` — the real function containing the gate — and asserts
 * on **whether the hook's path was admitted**, which is the thing a user
 * observes. `discoverExtensionPaths` returns the discovery list without importing
 * it, so admission is observable without standing up a module graph.
 *
 * ## The positive control is the load-bearing part
 *
 * `expect(paths).not.toContain(hook)` is satisfiable by a harness that never
 * discovered the hook at all — an empty list, a wrong directory, a discovery
 * cache warm from an earlier file. So the first case proves the hook IS found on
 * first sight, and the third proves the gate is per-hook rather than a blanket
 * wipe of every hook. Without both, the negative assertion is unfalsifiable.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { invalidateAllCaches } from "@oh-my-pi/pi-coding-agent/capability";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { discoverExtensionPaths } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { TempDir, __resetDirsFromEnvForTests, setAgentDir } from "@oh-my-pi/pi-utils";
import { approveHooks } from "./helpers/approve-hook";

describe("hook trust: a hook edited after approval stops loading", () => {
	let tempDir: TempDir;
	let cwd: string;
	let editedHook: string;
	let untouchedHook: string;
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	/** The discovery list the gate filters, read through the real loader. */
	async function discover(): Promise<string[]> {
		invalidateAllCaches();
		return await discoverExtensionPaths([], cwd, undefined, { ambient: true });
	}

	/** A `pre` hook at the project level. `.claude` is in `PROJECT_CONFIG_BASES`
	 * and is deliberately pinned, so the config-dir rename cannot move it. */
	function writeHook(name: string, body: string): string {
		const dir = path.join(cwd, ".claude", "hooks", "pre");
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, `${name}.ts`);
		fs.writeFileSync(file, body, "utf-8");
		return file;
	}

	beforeEach(async () => {
		// In-memory so recording a hash never writes the developer's real config.
		await Settings.init({ inMemory: true });
		tempDir = TempDir.createSync("@pi-hook-trust-");
		cwd = tempDir.absolute();
		// Point user-scope discovery at the temp dir too. Without this the scan
		// returns the developer's real `~/.omp/agent` entries, so the suite would
		// be asserting against whatever happens to be installed on the machine.
		// `setAgentDir` rather than the bare env var: the resolver caches its
		// paths, so the variable alone is read too late to have any effect.
		setAgentDir(path.join(cwd, "agent"));
		editedHook = writeHook("guard", "export default () => {};\n// first sight\n");
		untouchedHook = writeHook("sentinel", "export default () => {};\n// never edited\n");
	});

	afterEach(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		tempDir?.removeSync();
	});

	it("CONTROL: both approved hooks are discovered, so the gate is reachable", async () => {
		await approveHooks(cwd, [editedHook, untouchedHook]);
		const paths = await discover();

		// Both are approved first: an unapproved hook does not load at all (GAP-D3 (a)),
		// so without the approval this would be measuring an empty list and proving
		// nothing about the gate.
		expect(paths).toContain(editedHook);
		expect(paths).toContain(untouchedHook);
	});

	it("stops admitting a hook whose file changed after its hash was recorded", async () => {
		await approveHooks(cwd, [editedHook, untouchedHook]);

		// The edit a user would make after approving: same hook, different code.
		fs.writeFileSync(editedHook, "export default () => {};\n// edited after approval\n", "utf-8");

		const paths = await discover();

		expect(paths).not.toContain(editedHook);
	});

	it("CONTROL: the gate is per-hook — an unedited sibling still loads", async () => {
		await approveHooks(cwd, [editedHook, untouchedHook]);

		fs.writeFileSync(editedHook, "export default () => {};\n// edited after approval\n", "utf-8");

		const paths = await discover();

		// Without this, a gate that blocked every hook would satisfy the case above.
		expect(paths).toContain(untouchedHook);
	});
});
