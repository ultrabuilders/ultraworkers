import { getProjectDir, logger } from "@oh-my-pi/pi-utils";

type MarketplaceAutoUpdateMode = "off" | "notify" | "auto";

interface MarketplaceAutoUpdateOptions {
	autoUpdate: MarketplaceAutoUpdateMode;
	resolveActiveProjectRegistryPath: (cwd: string) => Promise<string | null>;
	clearPluginRootsCache: () => void;
}

export function scheduleMarketplaceAutoUpdate(options: MarketplaceAutoUpdateOptions): void {
	if (options.autoUpdate === "off") {
		return;
	}

	void runMarketplaceAutoUpdate(options);
}

async function runMarketplaceAutoUpdate(options: MarketplaceAutoUpdateOptions): Promise<void> {
	try {
		// Startup perf: marketplace manager pulls scraper/fetch/cache code; keep it out of the initial TUI graph.
		const {
			MarketplaceManager,
			getInstalledPluginsRegistryPath,
			getMarketplacesCacheDir,
			getMarketplacesRegistryPath,
			getPluginsCacheDir,
		} = await import("./marketplace");
		const mgr = new MarketplaceManager({
			marketplacesRegistryPath: getMarketplacesRegistryPath(),
			installedRegistryPath: getInstalledPluginsRegistryPath(),
			projectInstalledRegistryPath: (await options.resolveActiveProjectRegistryPath(getProjectDir())) ?? undefined,
			marketplacesCacheDir: getMarketplacesCacheDir(),
			pluginsCacheDir: getPluginsCacheDir(),
			clearPluginRootsCache: options.clearPluginRootsCache,
		});
		await mgr.refreshStaleMarketplaces();

		// Reported before the update check, because a delisting produces no
		// update: `checkForUpdates` skips a plugin the catalog no longer lists, so
		// "will never update again" and "up to date" looked the same. An early
		// return on an empty update list would then swallow it.
		const { delisted, unversioned } = await mgr.findDelistedPlugins();
		if (delisted.length > 0) {
			// Wording matters here. The common reason a publisher pulls a plugin is a
			// security problem, and "will not be updated again" reads like a footnote
			// on that. Say what the user is actually left running, and that the
			// reason is not something we know.
			const names = delisted.map(d => `${d.pluginId} (${d.scope})`).join(", ");
			logger.warn(
				`SECURITY: ${delisted.length} installed plugin(s) were removed from their marketplace and will receive no further updates, including security fixes. You are still running the last published build. The reason for removal is not published, so assume the worst: ${names}`,
			);
		}
		if (unversioned.length > 0) {
			// Not a withdrawal — a broken catalog. The plugin looks current, which is
			// what makes this the quieter of the two.
			const names = unversioned.map(d => `${d.pluginId} (${d.scope})`).join(", ");
			logger.warn(
				`${unversioned.length} installed plugin(s) are listed without a version, so the marketplace cannot offer them an update: ${names}`,
			);
		}

		const updates = await mgr.checkForUpdates();
		if (updates.length === 0) return;
		if (options.autoUpdate === "auto") {
			await mgr.upgradeAllPlugins();
			logger.debug(`Auto-upgraded ${updates.length} marketplace plugin(s)`);
		} else {
			logger.debug(`${updates.length} marketplace plugin update(s) available — /marketplace upgrade`);
		}
	} catch {
		// Silently ignore — network failure, corrupt data, offline.
	}
}
