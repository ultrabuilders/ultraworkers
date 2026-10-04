/**
 * Contract: `plugin doctor` reports an extension module that did not load.
 *
 * Install already refuses a plugin whose declared extension entry is missing
 * (`MarketplaceManager#validateInstalledExtensions` throws on a null
 * `resolvedPath`, and loads what it can to surface factory failures). What
 * nothing does is re-check afterwards. A plugin that passed install and later
 * lost its entry file — a partial upgrade, a pruned `node_modules`, a lockfile
 * that kept the entry while the tree did not — is reported by `plugin list` and
 * `plugin doctor` as healthy, and its tool, command and hook are simply absent.
 * That is the failure `doctor.ts` names in its own docblock: "a dead seam
 * wearing a live one: nothing throws, and the only symptom is a tool that
 * silently never appears" — and until now only `seam:themes-resolve` could
 * report one.
 *
 * The first describe covers the REPORT: what the check does with a set of load
 * errors, driven through an injected snapshot. The second covers the PRODUCER:
 * `runDoctorChecks()` with no snapshot, so `liveSnapshot()` actually reads the
 * plugin registry and stats the declared entries. Injecting a snapshot reaches
 * only the renderer, and a renderer tested alone cannot fail for a producer that
 * stopped reading the filesystem — the tests would go green while the check
 * reported "ok" about a tree it never looked at.
 */
import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { getProjectDir, setProjectDir, TempDir } from "@oh-my-pi/pi-utils";
import * as pluginLoader from "@oh-my-pi/pi-coding-agent/extensibility/plugins/loader";
import type { ScopedInstalledPlugin } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/loader";
import type { DoctorSnapshot } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";
import { runDoctorChecks } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/doctor";

/**
 * A snapshot that is otherwise identical; only the extension load errors vary.
 * Omitting the field models the partial snapshots callers that predate this
 * check pass, so the "not observed" case is reachable too.
 */
function snapshotWith(extensionLoadErrors?: Array<{ path: string; error: string }>): DoctorSnapshot {
	return {
		themes: [],
		resolveTheme: () => undefined,
		builtinTools: [],
		...(extensionLoadErrors === undefined ? {} : { extensionLoadErrors }),
	};
}

const find = (checks: Awaited<ReturnType<typeof runDoctorChecks>>, name: string) => checks.find(c => c.name === name);

/**
 * A plugin whose manifest declares an extension entry, backed by a real
 * directory. Whether the entry resolves is decided by the real filesystem —
 * `resolvePluginManifestEntries` stats `path.join(plugin.path, entry)` — so the
 * producer rows below are decided by the disk rather than by a fixture shaped
 * to match the assertion.
 */
function pluginDeclaring(entry: string, dir: string): ScopedInstalledPlugin {
	return {
		name: "hello-extension",
		version: "1.0.0",
		path: dir,
		manifest: { version: "1.0.0", extensions: [entry] },
		enabledFeatures: null,
		enabled: true,
		// Which root supplied this plugin. Carried because that is what the loader
		// returns, and a fixture shaped like something narrower would let a producer
		// that reads `scope` go untested.
		scope: "project",
	};
}

describe("doctor renders the extension load errors it is given", () => {
	it("errors and names each module that did not load", async () => {
		const checks = await runDoctorChecks(
			snapshotWith([
				{ path: "/plugins/hello-extension/index.ts", error: "Failed to load extension: boom" },
				{ path: "/plugins/other/index.ts", error: "Extension does not export a valid factory function" },
			]),
		);
		const found = find(checks, "seam:extensions-load");
		expect(found).toBeDefined();
		expect(found!.status).toBe("error");
		// Actionable on its own: the user must be able to tell WHICH plugin broke
		// and WHY, not just that something did.
		expect(found!.message).toContain("hello-extension");
		expect(found!.message).toContain("does not export a valid factory function");
	});

	// The negative contract. A doctor whose failure branch reports "ok" when the
	// load produced no errors is the all-clear this check exists to earn — and a
	// healthy profile must not gain a red row for having nothing wrong with it.
	it("reports ok, and counts, when every module loaded", async () => {
		const checks = await runDoctorChecks(snapshotWith([]));
		const found = find(checks, "seam:extensions-load");
		expect(found).toBeDefined();
		expect(found!.status).toBe("ok");
	});

	// A partial snapshot is not evidence of health. Omitting the field means the
	// caller never observed the load, so claiming "ok" would be an all-clear
	// manufactured from the absence of a field — the same all-clear that made a
	// dead plugin indistinguishable from a live one.
	it("says nothing when the caller did not observe a load", async () => {
		const checks = await runDoctorChecks(snapshotWith(undefined));
		expect(find(checks, "seam:extensions-load")).toBeUndefined();
	});
});

describe("doctor finds the extension failures itself", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	// The producer row. `getEnabledPlugins` is stubbed, but nothing downstream is:
	// the manifest entry is resolved by the real `statSync`, so the file's presence
	// on disk is what decides the row. This is the case the whole check exists for,
	// and it is the one an injected snapshot cannot reach.
	it("turns a declared entry that is not on disk into an error naming the plugin", async () => {
		using tempDir = TempDir.createSync("@ultraworkers-doctor-ext-");
		vi.spyOn(pluginLoader, "getEnabledPlugins").mockResolvedValue([pluginDeclaring("index.ts", tempDir.path())]);

		const found = find(await runDoctorChecks(), "seam:extensions-load");

		expect(found).toBeDefined();
		expect(found!.status).toBe("error");
		// Named, because a row that only said "something is broken" sends the user
		// hunting through every installed plugin instead of the one that died.
		expect(found!.message).toContain("hello-extension");
	});

	// The other direction on the same real filesystem: an entry that IS there must
	// not be reported. Without this, a producer that returned the same error
	// unconditionally would satisfy the row above.
	it("stays ok when the declared entry is present", async () => {
		using tempDir = TempDir.createSync("@ultraworkers-doctor-ext-");
		fs.writeFileSync(path.join(tempDir.path(), "index.ts"), "export default () => ({});\n");
		vi.spyOn(pluginLoader, "getEnabledPlugins").mockResolvedValue([pluginDeclaring("index.ts", tempDir.path())]);

		const found = find(await runDoctorChecks(), "seam:extensions-load");

		expect(found).toBeDefined();
		expect(found!.status).toBe("ok");
	});

	// The `catch` this file's docblock spends a paragraph defending: reading the
	// registry can fail on a half-written install, and a diagnostic that swallows
	// that reports "no problems" — the exact all-clear the check exists to remove.
	it("records a registry that could not be read instead of reporting nothing wrong", async () => {
		vi.spyOn(pluginLoader, "getEnabledPlugins").mockRejectedValue(new Error("lockfile half-written"));

		const found = find(await runDoctorChecks(), "seam:extensions-load");

		expect(found).toBeDefined();
		expect(found!.status).toBe("error");
		expect(found!.message).toContain("<plugin registry>");
	});

	// Which tree the check reads. `--cwd` and the auto-chdir away from $HOME both
	// call `setProjectDir` and neither calls `process.chdir`, so `process.cwd()` is
	// the directory the user launched FROM while `getProjectDir()` is the one they
	// pointed the run AT. Reading the former makes doctor report the untouched tree
	// healthy while the tree under inspection is the broken one — and it is silent,
	// because the check found nothing wrong with the wrong directory.
	//
	// The temp dir is asserted to differ from `process.cwd()` first: if it did not,
	// the two candidates would be indistinguishable and this row would pass for the
	// wrong reason.
	it("reads the resolved project dir, not the directory the process launched from", async () => {
		using tempDir = TempDir.createSync("@ultraworkers-doctor-cwd-");
		const target = tempDir.path();
		const original = getProjectDir();
		setProjectDir(target);
		try {
			expect(target).not.toBe(process.cwd());
			const spy = vi.spyOn(pluginLoader, "getEnabledPlugins").mockResolvedValue([]);

			await runDoctorChecks();

			expect(spy).toHaveBeenCalledWith(target);
		} finally {
			setProjectDir(original);
		}
	});
});
