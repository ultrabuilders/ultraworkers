/**
 * The three branches that decide whether a hook loads, in one runnable file.
 *
 * The plan replaces three of its own acceptance gates with a single command
 * because two of them could not fail for the reason they claimed. It named this
 * file, so this is it: one case per branch of the four states, each driving the
 * real discovery path so what is asserted is whether the hook was *admitted*.
 *
 * ## What a regression looks like to a user
 *
 * Make `hookTrustStatus` return a constant and this file goes red while the
 * rest of the suite stays green. A hook someone approved and then had edited
 * keeps running at the privilege the user approved for different code, and a
 * hook nobody ever approved runs too — with the only symptom being a line in a
 * log of a process that had nothing else to say.
 *
 * ## The negative branch is the point
 *
 * Case 1 alone could be satisfied by a harness that discovers nothing. Case 3
 * is the control that makes it falsifiable: the same harness, the same fixture,
 * one approval apart, admits the hook. Without it, "not loaded" proves nothing
 * about why.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { invalidateAllCaches, loadCapability } from "@oh-my-pi/pi-coding-agent/capability";
import { hookCapability } from "@oh-my-pi/pi-coding-agent/capability/hook";
import { recordHookHash } from "@oh-my-pi/pi-coding-agent/config/hook-settings";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { discoverExtensionPaths } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { hookContentHash, hookTrustKey } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/trust";
import { TempDir, __resetDirsFromEnvForTests, setAgentDir } from "@oh-my-pi/pi-utils";
import type { Hook } from "@oh-my-pi/pi-coding-agent/capability/hook";

describe("hook trust state: which hooks the loader admits", () => {
	let tempDir: TempDir;
	let cwd: string;
	let hookPath: string;
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	async function discover(): Promise<string[]> {
		invalidateAllCaches();
		return await discoverExtensionPaths([], cwd, undefined, { ambient: true });
	}

	/**
	 * A `pre` hook at the project level, named per-case.
	 *
	 * The name is unique per case because the trust key is `type:tool:name` with
	 * no path, so two cases sharing a name would share one approval — and case 3
	 * would then be testing case 1's leftovers instead of an approved hook.
	 */
	function writeHook(name: string): string {
		const dir = path.join(cwd, ".claude", "hooks", "pre");
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, `${name}.ts`);
		fs.writeFileSync(file, "export default function() { return null; }\n", "utf-8");
		return file;
	}

	/**
	 * Pin the hook's current contents, the way approving it would.
	 *
	 * The key is read from the discovered hook rather than written out by hand.
	 * Measured: a project hook's real key is `pre:<file>:<file>` — `tool` and
	 * `name` are both the filename — so a hand-written `pre:Bash:<name>` approves
	 * a key the loader never asks about, and case 3 fails for a reason that has
	 * nothing to do with the behaviour under test.
	 */
	async function approve(file: string): Promise<void> {
		const hash = await hookContentHash({ path: file } as Hook);
		if (hash === undefined) throw new Error(`could not hash ${file}`);
		invalidateAllCaches();
		const hooks = await loadCapability<Hook>(hookCapability.id, { cwd });
		const hook = hooks.all.find(h => h.path === file);
		if (!hook) throw new Error(`could not discover ${file} to read its trust key`);
		recordHookHash(hookTrustKey(hook), hash);
	}

	beforeEach(async () => {
		await Settings.init({ inMemory: true });
		tempDir = TempDir.createSync("@omp-hook-state-");
		cwd = tempDir.path();
		hookPath = writeHook("stateprobe");
	});

	afterEach(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		setAgentDir(tempDir.join("agent"));
		invalidateAllCaches();
		tempDir.removeSync();
	});

	it("case 1: `untrusted` blocks — a hook nobody approved does not load", async () => {
		// GAP-D3 (a): block, do not ask. This is the branch the previous behaviour
		// got wrong in the permissive direction: an unapproved hook used to load and
		// record itself, so the first thing that ever ran a given file was the file
		// itself.
		expect(await discover()).not.toContain(hookPath);
	});

	it("case 2: `modified` blocks — an approved hook whose file changed does not load", async () => {
		await approve(hookPath);
		// Rewrite the script after approval: same hook identity, different bytes.
		fs.writeFileSync(hookPath, "export default function() { return 'changed'; }\n", "utf-8");

		expect(await discover()).not.toContain(hookPath);
	});

	it("case 3: `trusted` still loads — the coverage branch that makes case 1 mean something", async () => {
		await approve(hookPath);

		expect(await discover()).toContain(hookPath);
	});

	it("the stable key is what approval is recorded against", async () => {
		// Approval is keyed by `type:tool:name`. If that key ever stopped being the
		// one the loader computes, every approval would silently miss and case 3
		// would be the only thing that noticed.
		const key = hookTrustKey({ type: "pre", tool: "Bash", name: "stateprobe", path: hookPath } as Hook);
		expect(key).toBe("pre:Bash:stateprobe");
	});
});
