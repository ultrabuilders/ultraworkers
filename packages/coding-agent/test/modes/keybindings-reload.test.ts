/**
 * The control for `bindKeybindingsToConfigReload`.
 *
 * ## What a consumer observes if this regresses
 *
 * A user edits `~/.omp/keybindings.yml` to move a key, and the key does not move.
 * The watcher still fires, the config pass still applies, and nothing reports an
 * error — which is why this asserts the *manager's* resolved keys, not that a
 * handler ran. "The handler was called" and "the user's keybinding changed" are
 * different claims, and only the second one is the contract.
 *
 * ## Why the negative direction is asserted too
 *
 * A handler that reloaded on *every* config pass would pass the positive case
 * above. The second test is what separates a real gate from that: an unrelated
 * `config.yml` edit must leave the resolved keys untouched. Without it, widening
 * the trigger to "any reload" is a silent regression this file would not catch.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import { notifyConfigReloadApplied } from "@oh-my-pi/pi-coding-agent/config/reload-observer";
import { bindKeybindingsToConfigReload } from "@oh-my-pi/pi-coding-agent/modes/keybindings-reload";

const agentDirs: string[] = [];

/** `app.interrupt` ships as `escape`, so any other value is unambiguously the user's. */
const DEFAULT_INTERRUPT = "escape";
const REMAPPED_INTERRUPT = "ctrl+g";

async function makeAgentDir(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "isq-keybindings-"));
	agentDirs.push(dir);
	return dir;
}

async function writeInterrupt(agentDir: string, key: string): Promise<string> {
	const file = path.join(agentDir, "keybindings.yml");
	await Bun.write(file, `app.interrupt: ${key}\n`);
	return file;
}

afterEach(async () => {
	await Promise.all(agentDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("bindKeybindingsToConfigReload", () => {
	test("a keybindings edit re-reads the manager's resolved keys", async () => {
		const agentDir = await makeAgentDir();
		const manager = KeybindingsManager.create(agentDir);
		expect(manager.getKeys("app.interrupt")).toEqual([DEFAULT_INTERRUPT]);

		const stop = bindKeybindingsToConfigReload(manager);
		try {
			const edited = await writeInterrupt(agentDir, REMAPPED_INTERRUPT);
			await notifyConfigReloadApplied({ sources: [edited] });
			expect(manager.getKeys("app.interrupt")).toEqual([REMAPPED_INTERRUPT]);
		} finally {
			stop();
		}
	});

	test("an unrelated config edit leaves the resolved keys untouched", async () => {
		const agentDir = await makeAgentDir();
		await writeInterrupt(agentDir, REMAPPED_INTERRUPT);
		const manager = KeybindingsManager.create(agentDir);
		expect(manager.getKeys("app.interrupt")).toEqual([REMAPPED_INTERRUPT]);

		const stop = bindKeybindingsToConfigReload(manager);
		try {
			await notifyConfigReloadApplied({ sources: [path.join(agentDir, "config.yml")] });
			expect(manager.getKeys("app.interrupt")).toEqual([REMAPPED_INTERRUPT]);

			// Edit the file anyway, so a re-read would be visible if one happened.
			await writeInterrupt(agentDir, DEFAULT_INTERRUPT);
			await notifyConfigReloadApplied({ sources: [path.join(agentDir, "config.yml")] });
			expect(manager.getKeys("app.interrupt")).toEqual([REMAPPED_INTERRUPT]);
		} finally {
			stop();
		}
	});

	test("unregistering stops the re-read", async () => {
		const agentDir = await makeAgentDir();
		const manager = KeybindingsManager.create(agentDir);
		const stop = bindKeybindingsToConfigReload(manager);
		stop();

		const edited = await writeInterrupt(agentDir, REMAPPED_INTERRUPT);
		await notifyConfigReloadApplied({ sources: [edited] });
		expect(manager.getKeys("app.interrupt")).toEqual([DEFAULT_INTERRUPT]);
	});
});
