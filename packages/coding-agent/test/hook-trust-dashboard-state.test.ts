/**
 * The dashboard must say why a hook stopped running.
 *
 * `loader.ts` refuses to import a hook whose file changed after its content was
 * recorded, and `hook-trust-modified-gate.test.ts` proves the refusal. That
 * test alone left the failure invisible: the dashboard builds its rows straight
 * from `loadCapability`, which never consults the trust record, so an edited
 * hook rendered as **active with a green tick** while the loader was dropping it
 * on the floor. The user had no way to tell a blocked hook from a running one —
 * which is the half of the bead contract the gate test does not cover.
 *
 * ## Why these rows are the observation
 *
 * The assertion is on `loadAllExtensions`' own output, not on `isHookModified`.
 * Testing the helper directly would stay green if someone deleted the call site
 * — the failure this file exists to catch is precisely that the call site was
 * missing in the first place.
 *
 * ## The control is load-bearing
 *
 * `expect(edited.state).toBe("modified")` is satisfied by a list that never
 * found either hook. The first case therefore asserts both hooks are present
 * and `active` before the edit, which also pins the causality: the *only*
 * difference between the two passes is the write to the hook's file.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { invalidateAllCaches } from "@oh-my-pi/pi-coding-agent/capability";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { loadAllExtensions } from "@oh-my-pi/pi-coding-agent/modes/components/extensions/state-manager";
import type { Extension } from "@oh-my-pi/pi-tui/overlays/extensions/types";
import { TempDir, __resetDirsFromEnvForTests, setAgentDir } from "@oh-my-pi/pi-utils";
import { approveHooks } from "./helpers/approve-hook";

describe("hook trust: the dashboard reports a hook the loader will not import", () => {
	let tempDir: TempDir;
	let cwd: string;
	let editedHook: string;
	let untouchedHook: string;
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	/** A `pre` hook at the project level. `.claude` is in `PROJECT_CONFIG_BASES`
	 *  and is deliberately pinned, so the config-dir rename cannot move it. */
	function writeHook(name: string, body: string): string {
		const dir = path.join(cwd, ".claude", "hooks", "pre");
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, `${name}.ts`);
		fs.writeFileSync(file, body, "utf-8");
		return file;
	}

	/** The two hook rows the dashboard renders, or `undefined` when absent.
	 *  Keyed by path: a hook's `name` carries its `.ts` extension, and matching
	 *  on the filename stem would silently miss every row. */
	async function hookRows(): Promise<{ edited?: Extension; untouched?: Extension }> {
		invalidateAllCaches();
		const all = await loadAllExtensions(cwd, []);
		const byPath = new Map(all.filter(row => row.kind === "hook").map(row => [row.path, row]));
		return { edited: byPath.get(editedHook), untouched: byPath.get(untouchedHook) };
	}

	beforeEach(async () => {
		// In-memory so recording a hash never writes the developer's real config.
		await Settings.init({ inMemory: true });
		tempDir = TempDir.createSync("@ultraworkers-hook-dashboard-");
		cwd = tempDir.absolute();
		// `setAgentDir` rather than the bare env var: the resolver caches its
		// paths, so the variable alone is read too late to have any effect.
		setAgentDir(path.join(cwd, "agent"));
		editedHook = writeHook("guard", "export default () => {};\n// first sight\n");
		untouchedHook = writeHook("sentinel", "export default () => {};\n// never edited\n");
		// Approved first: an unapproved hook does not load (GAP-D3 (a)), so the
		// hashes the dashboard later compares have to be pinned deliberately
		// against, so go through the real recording path rather than writing the
		// record directly — otherwise the fixture would test a state production
		// never reaches.
		//
		// This call was the migration 1e7add6114 left half-done: it added the
		// `approveHooks` import and rewrote this comment to describe approving, but
		// the statement below still read `discoverExtensionPaths`, whose only job had
		// been the implicit first-sight recording that commit removed. So both hooks
		// stayed unapproved, and because the dashboard builds rows straight from
		// `loadCapability` — which never consults the trust record — that was invisible
		// until the edit: nothing recorded means nothing can read as `modified`.
		await approveHooks(cwd, [editedHook, untouchedHook]);
	});

	afterEach(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		tempDir?.removeSync();
	});

	it("CONTROL: both hooks are listed and active before anything is edited", async () => {
		const { edited, untouched } = await hookRows();

		expect(edited).toBeDefined();
		expect(untouched).toBeDefined();
		expect(edited!.state).toBe("active");
		expect(untouched!.state).toBe("active");
	});

	it("marks an edited hook as modified and leaves its untouched sibling active", async () => {
		fs.writeFileSync(editedHook, "export default () => {};\n// edited after approval\n", "utf-8");

		const { edited, untouched } = await hookRows();

		// The signal the gate alone could not give: the row says why it is not
		// running, instead of showing a tick next to code that never loaded.
		expect(edited?.state).toBe("modified");
		expect(edited?.disabledReason).toBe("hook-modified");
		// Per-hook, not a blanket — a sibling that was not touched stays active.
		expect(untouched?.state).toBe("active");
	});
});
