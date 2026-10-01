import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { $ } from "bun";
import {
	MarketplaceManager,
	readInstalledPluginsRegistry,
} from "@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace";
import type { PluginSource } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace";

/**
 * `omp plugin upgrade` must not move a source the user pinned.
 *
 * The failure this prevents is quiet and one-sided: the user writes `#main` in a
 * marketplace source, `omp plugin upgrade` re-resolves it, and the running plugin
 * changes to whatever `main` points at today. Nothing errors, nothing is logged,
 * and the user's stated constraint — "this is the one I picked" — is simply gone.
 *
 * The pin is deliberately any ref, not only a 40-hex sha. pi's package manager
 * draws the same line (`pinned = Boolean(args.ref)`, auto-update gated on
 * `!pinned`), and a user who typed `#main` said so. Requiring a sha here would
 * leave the common case unprotected while looking rigorous.
 *
 * The sources point at a real local git repository rather than a GitHub URL, via
 * the `url` source kind — the one variant whose URL is cloned verbatim instead of
 * being rewritten to `https://github.com/<url>.git`. A github source cannot be
 * exercised here at all, since the clone leaves the machine, and a stubbed
 * resolver would not prove the gate sits ahead of the fetch.
 *
 * Both directions are asserted. A gate that refused every upgrade would pass a
 * refusal-only suite, and `omp plugin upgrade` would appear broken.
 */

describe("upgrading a source the user pinned", () => {
	let tmpDir: string;
	let repoUrl: string;
	let repoSha: string;

	/**
	 * A pin, spelled the way the source spells it. `ref` and `sha` are not
	 * interchangeable: the resolver passes `ref` to `git clone --branch` and `sha`
	 * to a post-clone `git checkout`, so a sha written into `ref` fails at install
	 * and never reaches the gate.
	 */
	type PinFields = { ref?: string; sha?: string };

	/**
	 * A real git repo holding the plugin, so the clone stays on this machine.
	 *
	 * Returns the tag and the commit sha alongside the path because the pin gate
	 * reads the ref back out of the *installed* entry — so a fixture naming a ref
	 * that does not exist would fail at install, before the gate is ever reached,
	 * and the test would pass or fail for a reason that has nothing to do with it.
	 */
	async function initRepo(): Promise<void> {
		const repo = fs.mkdtempSync(path.join(tmpDir, "repo-"));
		fs.writeFileSync(path.join(repo, "package.json"), JSON.stringify({ name: "pinned-plugin", version: "1.0.0" }));
		await $`git init -q -b main`.cwd(repo).quiet();
		await $`git add -A`.cwd(repo).quiet();
		await $`git -c user.email=t@e -c user.name=t commit -q -m init`.cwd(repo).quiet();
		await $`git tag v1.0.0`.cwd(repo).quiet();
		repoUrl = repo;
		repoSha = (await $`git rev-parse HEAD`.cwd(repo).text()).trim();
	}

	function buildMarketplace(source: PluginSource, version: string): string {
		const root = fs.mkdtempSync(path.join(tmpDir, "mkt-"));
		fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
		fs.writeFileSync(
			path.join(root, ".claude-plugin", "marketplace.json"),
			JSON.stringify({
				name: "pin-marketplace",
				owner: { name: "Test Author" },
				plugins: [{ name: "pinned-plugin", source, version }],
			}),
		);
		return root;
	}

	function makeManager(): MarketplaceManager {
		return new MarketplaceManager({
			marketplacesRegistryPath: path.join(tmpDir, "marketplaces.json"),
			installedRegistryPath: path.join(tmpDir, "installed_plugins.json"),
			projectInstalledRegistryPath: path.join(tmpDir, "project", "installed_plugins.json"),
			marketplacesCacheDir: path.join(tmpDir, "cache", "marketplaces"),
			pluginsCacheDir: path.join(tmpDir, "cache", "plugins"),
		});
	}

	/**
	 * Install once so there is something to upgrade, then publish a new version and
	 * re-fetch the marketplace, which is the sequence a user actually performs: the
	 * publisher releases, `omp plugin update <marketplace>` picks it up, and only
	 * then can `omp plugin upgrade` have anything to move to.
	 *
	 * Editing the cached catalog directly would be shorter but would test a state no
	 * user can reach — `addMarketplace` copies the catalog into the cache, so a
	 * rewrite of the source directory alone is invisible to the upgrade.
	 */
	async function installThenBump(pin: PinFields | undefined): Promise<MarketplaceManager> {
		const source: PluginSource = {
			source: "url",
			url: repoUrl,
			...pin,
		};
		const root = buildMarketplace(source, "1.0.0");
		const manager = makeManager();
		await manager.addMarketplace(root);
		await manager.installPlugin("pinned-plugin", "pin-marketplace");

		// Republish at 2.0.0, then let the manager notice.
		const catalogPath = path.join(root, ".claude-plugin", "marketplace.json");
		const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
		catalog.plugins[0].version = "2.0.0";
		fs.writeFileSync(catalogPath, JSON.stringify(catalog));
		await manager.updateMarketplace("pin-marketplace");
		return manager;
	}

	beforeEach(async () => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-upgrade-pin-"));
		await initRepo();
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("refuses a source pinned to a branch, and says how to override it", async () => {
		// `#main` is the case the gate exists for: a ref the user typed, which will
		// resolve to something else tomorrow. The message has to name the ref and
		// the escape, or the command just looks broken.
		const manager = await installThenBump({ ref: "main" });

		await expect(manager.upgradePlugin("pinned-plugin@pin-marketplace")).rejects.toThrow(/main/);
		await expect(manager.upgradePlugin("pinned-plugin@pin-marketplace")).rejects.toThrow(/--force/);
	});

	it("refuses a source pinned to a tag", async () => {
		const manager = await installThenBump({ ref: "v1.0.0" });

		await expect(manager.upgradePlugin("pinned-plugin@pin-marketplace")).rejects.toThrow(/v1\.0\.0/);
	});

	it("refuses a source pinned to a commit sha", async () => {
		const manager = await installThenBump({ sha: repoSha });

		await expect(manager.upgradePlugin("pinned-plugin@pin-marketplace")).rejects.toThrow(/pinned/);
	});

	it("leaves the installed entry untouched when it refuses, so a refused upgrade costs nothing", async () => {
		// The three refusals above prove the message. This proves the ordering, which
		// is the part that can be got wrong silently: a gate placed after `cachePlugin`
		// still throws that exact message, having already overwritten the cache the
		// user was running. The message would be right and the plugin would be gone.
		//
		// So this asserts on the registry, not on stderr.
		const manager = await installThenBump({ ref: "main" });

		await expect(manager.upgradePlugin("pinned-plugin@pin-marketplace")).rejects.toThrow(/pinned/);

		const registry = await readInstalledPluginsRegistry(path.join(tmpDir, "installed_plugins.json"));
		expect(
			Object.values(registry.plugins)
				.flat()
				.map(p => p.version),
		).toEqual(["1.0.0"]);
	});

	it("refuses on the default no-scope path too, not only behind --scope", async () => {
		// `omp plugin upgrade <id>` with no --scope is the invocation most people
		// type, and it routes through a different method. That method did not carry
		// the pin rule, so the same command refused with --scope and quietly moved
		// the plugin without it — a gate holding on one branch and not the other is
		// worse than no gate, because the refusal reads as proof it works.
		const manager = await installThenBump({ ref: "main" });

		await expect(manager.upgradePluginAcrossScopes("pinned-plugin@pin-marketplace")).rejects.toThrow(/pinned/);

		const registry = await readInstalledPluginsRegistry(path.join(tmpDir, "installed_plugins.json"));
		expect(
			Object.values(registry.plugins)
				.flat()
				.map(p => p.version),
		).toEqual(["1.0.0"]);
	});

	it("upgrades an unpinned source, so the command still does its job", async () => {
		// The negative control. Without a ref in the source there is nothing the
		// user pinned, and refusing here would make `omp plugin upgrade` useless.
		const manager = await installThenBump(undefined);

		const entry = await manager.upgradePlugin("pinned-plugin@pin-marketplace");

		expect(entry.version).toBe("2.0.0");
	});

	it("lets an explicit --force move a pinned source", async () => {
		// The escape hatch has to actually escape, or the gate is a dead end and the
		// only way forward is editing the marketplace by hand.
		const manager = await installThenBump({ ref: "main" });

		const entry = await manager.upgradePlugin("pinned-plugin@pin-marketplace", undefined, { force: true });

		expect(entry.version).toBe("2.0.0");
	});
});
