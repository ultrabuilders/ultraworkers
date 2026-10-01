import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { MarketplaceManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace";

/**
 * `restorePlugin` is `installPlugin` with one extra rule: the source must be
 * pinned to a commit. That distinction is the entire bead, and it is the kind of
 * distinction a refactor erases silently — one dropped `restore: true` and a
 * branch re-fetched under a user's back becomes indistinguishable from a correct
 * restore, with no error on either side.
 *
 * So these tests fix the boundary from both sides. The refusal is easy to assert;
 * what actually protects users is the second half — that a mutable source is
 * still perfectly installable when the user asked for it. A gate that refuses
 * everything would pass a refusal-only suite and strand every plugin in use.
 */

const FIXTURE_DIR = path.resolve(import.meta.dir, "fixtures/valid-marketplace");

describe("restoring a plugin is pinned; installing one is not", () => {
	let tmpDir: string;
	let manager: MarketplaceManager;

	beforeEach(async () => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-restore-pin-"));
		manager = new MarketplaceManager({
			marketplacesRegistryPath: path.join(tmpDir, "marketplaces.json"),
			installedRegistryPath: path.join(tmpDir, "installed_plugins.json"),
			projectInstalledRegistryPath: path.join(tmpDir, "project", "installed_plugins.json"),
			marketplacesCacheDir: path.join(tmpDir, "cache", "marketplaces"),
			pluginsCacheDir: path.join(tmpDir, "cache", "plugins"),
		});
		await manager.addMarketplace(FIXTURE_DIR);
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("refuses to restore from a source that is not pinned to a commit", async () => {
		// The fixture's plugin is a relative path, which resolves to whatever is on
		// disk now. Restoring it would put today's bytes where a reviewed commit
		// used to be, with nothing in the output to say so.
		await expect(manager.restorePlugin("hello-plugin", "test-marketplace")).rejects.toThrow(/hello-plugin/);
	});

	it("still installs that same unpinned source, because the user asked for it", async () => {
		// The mandatory negative case. `omp plugin install <tag>` is a supported
		// state and must keep working; only *restoring* is refused. If this ever
		// fails, the gate has stopped being a gate and become a ban.
		const entry = await manager.installPlugin("hello-plugin", "test-marketplace");

		expect(entry.installPath).toContain("hello-plugin");
	});

	it("refuses the restore before anything is written, so a failed doctor sweep leaves no half-state", async () => {
		// The refusal has to happen at the gate, ahead of the download. A gate that
		// ran after the clone would have created the very cache directory the user
		// is trying to be restored into.
		await expect(manager.restorePlugin("hello-plugin", "test-marketplace")).rejects.toThrow(/not pinned/);
		expect(fs.existsSync(path.join(tmpDir, "cache", "plugins", "hello-plugin"))).toBe(false);
	});
});
