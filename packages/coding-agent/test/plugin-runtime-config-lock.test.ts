import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/manager";
import { getPluginsLockfile, TempDir } from "@oh-my-pi/pi-utils";

/**
 * Every mutation of the plugin lockfile is a read-modify-write. Two `ultraworkers`
 * processes — or the settings overlay and a CLI command — can hold a manager
 * each, and both will have memoized the same on-disk config before either
 * writes. If a write serializes the memoized object instead of re-reading
 * under the lock, the second writer silently discards the first writer's change
 * and the user loses a plugin enablement with no error anywhere.
 *
 * That failure is invisible to a single-manager test: one instance's cache and
 * the file are the same object, so the two paths cannot disagree. The
 * two-instance case is the whole point of these tests.
 */
describe("plugin runtime config writes", () => {
	let home: TempDir;
	let lockfile: string;

	beforeEach(async () => {
		home = TempDir.createSync("@pi-plugin-lock-");
		lockfile = getPluginsLockfile(home.path());
		await Bun.write(
			lockfile,
			`${JSON.stringify(
				{
					version: 1,
					plugins: { alpha: { version: "1.0.0", enabled: true, enabledFeatures: null } },
					settings: { alpha: { colour: "red" } },
				},
				null,
				2,
			)}\n`,
		);
	});

	afterEach(() => {
		home.remove();
	});

	const manager = () => new PluginManager(home.path(), home.path());
	const readConfig = async () => await Bun.file(lockfile).json();

	it("keeps both writers' changes when two managers each wrote a stale read", async () => {
		const first = manager();
		const second = manager();

		// Both prime their cache from the same on-disk state, so both are about
		// to write an object that is already out of date.
		await first.getPluginSettings("alpha");
		await second.getPluginSettings("alpha");

		const disabled = await first.setEnabled("alpha", false);
		const shaped = await second.setPluginSetting("alpha", "shape", "round");

		expect(disabled.changed).toBe(true);
		expect(shaped.changed).toBe(true);

		const config = await readConfig();
		// The second writer must not have rolled back the first writer's change.
		expect(config.plugins.alpha.enabled).toBe(false);
		expect(config.settings.alpha.shape).toBe("round");
		// Nor dropped the key it never knew about.
		expect(config.settings.alpha.colour).toBe("red");
	});

	it("reports changed: false and leaves the file alone when the value already matches", async () => {
		const result = await manager().setEnabled("alpha", true);

		expect(result.changed).toBe(false);
		// A no-op must not rewrite the file: rewriting would churn the mtime and
		// make every watcher reload for nothing.
		const before = await Bun.file(lockfile).text();
		await manager().setPluginSetting("alpha", "colour", "red");
		expect(await Bun.file(lockfile).text()).toBe(before);
	});

	it("reports changed: false when deleting a key that is not there", async () => {
		const result = await manager().deletePluginSetting("alpha", "absent");

		expect(result.changed).toBe(false);
		const config = await readConfig();
		expect(config.settings.alpha.colour).toBe("red");
	});

	it("rejects an unknown plugin instead of writing a partial config", async () => {
		const result = manager().setEnabled("does-not-exist", false);

		await expect(result).rejects.toThrow(/not found in runtime config/);
		// The failed call must not have left the file truncated or emptied.
		const config = await readConfig();
		expect(config.plugins.alpha.enabled).toBe(true);
	});

	it("marks every mutation as needing a restart, since none is read back live", async () => {
		const result = await manager().setPluginSetting("alpha", "colour", "blue");

		expect(result.application).toBe("restart-required");
	});
});
