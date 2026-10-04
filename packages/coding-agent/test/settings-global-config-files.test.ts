/**
 * Contract: a `--config` overlay reaches every settings instance, including the
 * callers that pass no overlay of their own.
 *
 * About twenty verbs under `src/cli/` initialize settings with their own `cwd` and
 * nothing else. `ultraworkers --config <path> <verb>` reaches none of them through
 * `SettingsOptions`, because `resolveCliArgv` strips leading global flags from the
 * argv a subcommand parses — forwarding them instead would crash every verb that
 * declares no `--config` of its own (#8891). So the overlay is recorded once by the
 * runner (`setGlobalConfigFiles`) and read by every instance the constructor builds.
 *
 * The row that matters is the first one: a caller that passes NOTHING still gets the
 * overlay. The precedence row pins the order, because "later overlay wins" is what
 * makes the merge safe to extend — a runner that recorded these files in the wrong
 * slot would let an environment variable silently beat an explicit command-line flag.
 */
import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";
import { lookup } from "@oh-my-pi/pi-coding-agent/config/registry";
import { resetSettingsForTest, setGlobalConfigFiles, Settings } from "@oh-my-pi/pi-coding-agent/config/settings";

/** An overlay that sets one real, registered setting to a value nothing else uses. */
function overlay(dir: string, name: string, value: string): string {
	const p = path.join(dir, name);
	fs.writeFileSync(p, `theme:\n  dark: ${value}\n`);
	return p;
}

const readDark = (settings: Settings): unknown => lookup("theme.dark")!.get(settings);

afterEach(() => {
	// Both are process-wide by design, so both are restored. Leaving an overlay set
	// would silently change the settings of every later test in this file's process.
	setGlobalConfigFiles([]);
	process.env.PI_CONFIG_FILES = "";
	resetSettingsForTest();
});

describe("a global --config overlay reaches every settings instance", () => {
	it("applies to a caller that passed no configFiles at all", async () => {
		using dir = TempDir.createSync("@ultraworkers-settings-overlay-");
		using agentDir = TempDir.createSync("@ultraworkers-settings-agent-");
		setGlobalConfigFiles([overlay(dir.path(), "a.yml", "from-global-flag")]);

		// No `configFiles` in the options — which is exactly how the ~20 call sites
		// under `src/cli/` invoke this, and the case that was broken before.
		const settings = await Settings.init({ cwd: dir.path(), agentDir: agentDir.path(), inMemory: true });

		expect(readDark(settings)).toBe("from-global-flag");
	});

	// The negative half: the ambient value is set by the runner, not by a leftover.
	// Without this, a suite that ran the rows above first would pass the first row
	// even if the merge were removed.
	it("reports the plain default when no overlay was recorded", async () => {
		using dir = TempDir.createSync("@ultraworkers-settings-overlay-");
		using agentDir = TempDir.createSync("@ultraworkers-settings-agent-");

		const settings = await Settings.init({ cwd: dir.path(), agentDir: agentDir.path(), inMemory: true });

		expect(readDark(settings)).not.toBe("from-global-flag");
	});

	// Precedence. `docs/config-usage.md` loads `PI_CONFIG_FILES` before the `--config`
	// files and lets later files override earlier ones, so the recorded global overlay
	// must beat the environment variable — otherwise an inherited `PI_CONFIG_FILES`
	// would silently outrank a flag the user typed on this very command line.
	it("lets a recorded overlay win over PI_CONFIG_FILES, and a caller's own win over both", async () => {
		using dir = TempDir.createSync("@ultraworkers-settings-overlay-");
		using agentDir = TempDir.createSync("@ultraworkers-settings-agent-");
		const envOverlay = overlay(dir.path(), "env.yml", "from-environment");
		const globalOverlay = overlay(dir.path(), "global.yml", "from-global-flag");
		const ownOverlay = overlay(dir.path(), "own.yml", "from-caller-option");

		process.env.PI_CONFIG_FILES = envOverlay;
		setGlobalConfigFiles([globalOverlay]);
		const settings = await Settings.init({
			cwd: dir.path(),
			agentDir: agentDir.path(),
			inMemory: true,
			configFiles: [ownOverlay],
		});

		expect(readDark(settings)).toBe("from-caller-option");

		// And the middle of the order, isolated: drop the caller's own overlay and the
		// recorded flag must be what wins over the environment.
		//
		// The channel is re-armed after the reset rather than carried across it. It used
		// to be carried across — `resetSettingsForTest` cleared the instance cache but
		// left `globalConfigFiles`, so this second `init` inherited the overlay by
		// accident and passed for the wrong reason. Re-recording is what a second
		// `runCli` does anyway (the runner calls `setGlobalConfigFiles` per invocation),
		// so the state under test is the state production reaches.
		resetSettingsForTest();
		setGlobalConfigFiles([globalOverlay]);
		const withoutOwn = await Settings.init({ cwd: dir.path(), agentDir: agentDir.path(), inMemory: true });
		expect(readDark(withoutOwn)).toBe("from-global-flag");
	});

	// The reset has to cover the recorded overlays too, not only the instance cache.
	// `globalConfigFiles` is module state of the same kind as `globalInstance`: leave
	// it behind and every later `Settings.init` in the process — including the next
	// `runCli` of an in-process runner or an SDK embedding — inherits an overlay the
	// caller never passed. The cache is cleared, so the second `init` below really
	// does rebuild from the constructor; if the overlay channel leaked, that rebuild
	// is exactly where the stale value would reappear.
	it("drops the recorded overlays on reset, not just the cached instance", async () => {
		using dir = TempDir.createSync("@ultraworkers-settings-overlay-");
		using agentDir = TempDir.createSync("@ultraworkers-settings-agent-");
		setGlobalConfigFiles([overlay(dir.path(), "a.yml", "from-global-flag")]);

		const first = await Settings.init({ cwd: dir.path(), agentDir: agentDir.path(), inMemory: true });
		expect(readDark(first)).toBe("from-global-flag");

		// Nothing re-arms the channel between the two calls — no `setGlobalConfigFiles`,
		// and `process.env.PI_CONFIG_FILES` is empty — so any value that survives here
		// survived the reset.
		resetSettingsForTest();
		const second = await Settings.init({ cwd: dir.path(), agentDir: agentDir.path(), inMemory: true });

		expect(readDark(second)).not.toBe("from-global-flag");
	});
});
