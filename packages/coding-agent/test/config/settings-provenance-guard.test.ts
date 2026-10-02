import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { Settings, type RawSettings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { writeGlobalSetting } from "@oh-my-pi/pi-coding-agent/config/shadowing";
import { AgentStorage } from "@oh-my-pi/pi-coding-agent/session/agent-storage";
import { TempDir } from "@oh-my-pi/pi-utils";
import { YAML } from "bun";
import { cfgToolsApproval } from "@oh-my-pi/pi-coding-agent/tools/settings";

import { beginSettingsTest, restoreSettingsTestState, type SettingsTestState } from "../helpers/settings-test-state";

let state: SettingsTestState | undefined;
let tempDir: TempDir;
let agentDir: string;
let cwd: string;
let overlayPath: string;

beforeEach(() => {
	state = beginSettingsTest();
	tempDir = TempDir.createSync("@ultraworkers-settings-provenance-");
	agentDir = tempDir.join("agent");
	cwd = tempDir.join("project");
	overlayPath = tempDir.join("overlay.yml");
	for (const dir of [agentDir, cwd]) fs.mkdirSync(dir, { recursive: true });
});

afterEach(() => {
	restoreSettingsTestState(state);
	state = undefined;
	AgentStorage.close();
	// SQLite keeps agent.db open until GC finalizes its statements; Windows cannot delete an open file.
	Bun.gc(true);
	tempDir.removeSync();
});

const configPath = () => path.join(agentDir, "config.yml");

/**
 * The value the guard restored, read off disk rather than from the return value.
 *
 * The bead's contract is that a `reverted` write leaves the file as it was. Asserting the
 * returned `status` alone would let a guard that reports `reverted` and writes nothing pass,
 * which is the failure this file exists to catch — so every assertion below that expects a
 * rollback reads the file.
 */
const readConfig = async (): Promise<RawSettings> => YAML.parse(await Bun.file(configPath()).text()) as RawSettings;

async function load(config: RawSettings, overlay: RawSettings): Promise<Settings> {
	await Bun.write(configPath(), YAML.stringify(config));
	await Bun.write(overlayPath, YAML.stringify(overlay));
	return Settings.loadIsolated({ agentDir, cwd, configFiles: [overlayPath] });
}

describe("global writes are refused when a higher layer supplies the effective value", () => {
	it("reverts the saved value and names the layer that shadows it", async () => {
		// The observable regression: a user edits `tools.approval` in the settings panel, is
		// told it saved, and it never takes effect because a --config overlay already sets it.
		// Both facts are asserted — the outcome AND the file — because the return value alone
		// can be produced by a guard that only reports.
		const settings = await load({}, { tools: { approval: { bash: "deny" } } });

		const outcome = writeGlobalSetting(cfgToolsApproval, settings, { bash: "allow" }, "revert");

		expect(outcome.status).toBe("shadowed");
		if (outcome.status !== "shadowed") throw new Error("unreachable");
		expect(outcome.source).toBe("overlay");
		expect(outcome.written).toBe("reverted");
		// The overlay value is still what is in force, and the global write is gone from disk.
		expect(cfgToolsApproval.get(settings)).toEqual({ bash: "deny" });
		await settings.flush();
		expect(await readConfig()).toEqual({});
	});

	it("keeps the saved value when the policy is `keep`, and still reports the shadowing", async () => {
		// The other calling surface — `ultraworkers config set` from a shell — may be configuring a
		// different checkout where the shadowing layer does not exist. Discarding the edit
		// there destroys something the user meant to keep, so this policy stands the write.
		// If detection regressed, this would report `applied` and the user would be told the
		// value is in force when it is not.
		const settings = await load({}, { tools: { approval: { bash: "deny" } } });

		const outcome = writeGlobalSetting(cfgToolsApproval, settings, { bash: "allow" }, "keep");

		expect(outcome.status).toBe("shadowed");
		if (outcome.status !== "shadowed") throw new Error("unreachable");
		expect(outcome.written).toBe("kept");
		expect(cfgToolsApproval.get(settings)).toEqual({ bash: "deny" });
		await settings.flush();
		expect(await readConfig()).toEqual({ tools: { approval: { bash: "allow" } } });
	});

	it("applies the write when a higher layer holds that very same value", async () => {
		// The boundary most likely to slip. The overlay says `deny` and the user writes `deny`:
		// the effective value is unchanged either way, so this is NOT shadowing. Treating it as
		// shadowing would tell a user their identical value was refused, and on `revert` would
		// delete a setting that matches what is already in force.
		const settings = await load({}, { tools: { approval: { bash: "deny" } } });

		const outcome = writeGlobalSetting(cfgToolsApproval, settings, { bash: "deny" }, "revert");

		expect(outcome.status).toBe("applied");
		await settings.flush();
		expect(await readConfig()).toEqual({ tools: { approval: { bash: "deny" } } });
	});

	it("applies the write when no layer shadows it — the guard must not block by default", async () => {
		// The negative case, and the reason it is not padding: a guard that refuses every write
		// is indistinguishable from a working one unless something proves writes still land.
		// This is the test that goes red if the check is widened into a blanket refusal — which
		// would brick every settings write for every user, the failure mode the plan names as
		// the worst outcome of this work.
		const settings = await load({ tools: { approval: { bash: "deny" } } }, {});

		const outcome = writeGlobalSetting(cfgToolsApproval, settings, { read: "prompt" }, "revert");

		expect(outcome.status).toBe("applied");
		// `set` is the whole-record path, so the prior `bash` entry is replaced rather than
		// merged — `setEntry` is what merges (see settings-entry-writes.test.ts). Asserting a
		// merge here would encode a contract this setting does not have.
		expect(cfgToolsApproval.get(settings)).toEqual({ read: "prompt" });
		await settings.flush();
		expect(await readConfig()).toEqual({ tools: { approval: { read: "prompt" } } });
	});

	it("restores the previous value rather than unsetting it when one existed", async () => {
		// `revert` puts back exactly what was there. An absent value is unset rather than
		// written as `null` — a different thing to find in a config file later — so the two
		// cases are asserted separately rather than through one helper.
		const settings = await load(
			{ tools: { approval: { bash: "deny" } } },
			{ tools: { approval: { read: "allow" } } },
		);

		const outcome = writeGlobalSetting(cfgToolsApproval, settings, { bash: "allow" }, "revert");

		expect(outcome.status).toBe("shadowed");
		// The prior global value survives; the file is not left holding `null` or the new value.
		await settings.flush();
		expect(await readConfig()).toEqual({ tools: { approval: { bash: "deny" } } });
	});
});
