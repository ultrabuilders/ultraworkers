/**
 * Approve a hook the way a user approving it would: pin its current contents
 * against its trust key.
 *
 * The loader used to do this implicitly — first sight recorded the hash and
 * admitted the hook — so tests could lean on a plain `discover()` call to set
 * themselves up. GAP-D3 (a) removed that: a hook nobody approved does not load,
 * so the approval has to be explicit and the tests have to say they are making
 * one. That is the point of the change, and rewriting these call sites rather
 * than weakening the gate is what keeps it.
 *
 * The key is read from the discovered hook rather than built by hand. Measured:
 * a project hook's key is `pre:<file>:<file>` — `tool` and `name` are both the
 * filename — so a hand-written key approves something the loader never asks
 * about, and the test then fails for a reason unrelated to what it is testing.
 */
import * as fs from "node:fs";
import { invalidateAllCaches, loadCapability } from "@oh-my-pi/pi-coding-agent/capability";
import { hookCapability, type Hook } from "@oh-my-pi/pi-coding-agent/capability/hook";
import { recordHookHash } from "@oh-my-pi/pi-coding-agent/config/hook-settings";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { hookContentHash, hookTrustKey } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/trust";
import { setAgentDir } from "@oh-my-pi/pi-utils";

/**
 * Find `file` among the discovered hooks.
 *
 * Compared through `realpath` because the two sides disagree on macOS: a test
 * that builds its fixture under `fs.realpath` holds `/private/var/...` while
 * discovery reports `/var/...`, and a plain string compare then finds nothing
 * and reports "discovery did not return the hook" — a harness failure wearing a
 * product symptom.
 */
function findHook(hooks: { all: Hook[] }, file: string): Hook | undefined {
	const want = fs.realpathSync(file);
	return hooks.all.find(h => {
		try {
			return fs.realpathSync(h.path) === want;
		} catch {
			return h.path === file;
		}
	});
}

/** Pin `file`'s current contents under its own trust key. */
export async function approveHook(cwd: string, file: string): Promise<void> {
	const hash = await hookContentHash({ path: file } as Hook);
	if (hash === undefined) throw new Error(`approveHook: could not read ${file}`);
	invalidateAllCaches();
	const hooks = await loadCapability<Hook>(hookCapability.id, { cwd });
	const hook = findHook(hooks, file);
	if (!hook) throw new Error(`approveHook: discovery did not return ${file}, so its trust key is unknown`);
	recordHookHash(hookTrustKey(hook), hash);
}

/** Approve several hooks in one call, for the per-sibling cases. */
export async function approveHooks(cwd: string, files: readonly string[]): Promise<void> {
	for (const file of files) await approveHook(cwd, file);
}

/**
 * Pin `file` in the on-disk config for `agentDir`, for tests that load hooks in
 * a child process.
 *
 * The in-process approver cannot serve those: they assert across a process
 * boundary, so the record has to be in the config file the child reads, not in
 * the memory of the parent. That is also the only approver that proves the
 * record survives a restart, which is the property the cross-process cases
 * exist to check.
 */
export async function approveHookOnDisk(agentDir: string, file: string): Promise<void> {
	const hash = await hookContentHash({ path: file } as Hook);
	if (hash === undefined) throw new Error(`approveHookOnDisk: could not read ${file}`);
	// The agent dir, not `cwd`, is what puts `<agentDir>/hooks/pre/` on the scan
	// path -- the child process these tests assert against finds its hooks through
	// `PI_CODING_AGENT_DIR`, so discovery here has to agree or it finds nothing.
	setAgentDir(agentDir);
	invalidateAllCaches();
	const hooks = await loadCapability<Hook>(hookCapability.id, { cwd: agentDir, agentDir });
	const hook = findHook(hooks, file);
	if (!hook) throw new Error(`approveHookOnDisk: discovery did not return ${file}`);
	const scope = await Settings.loadIsolated({ cwd: agentDir, agentDir });
	recordHookHash(hookTrustKey(hook), hash, scope);
	await scope.flush();
}
