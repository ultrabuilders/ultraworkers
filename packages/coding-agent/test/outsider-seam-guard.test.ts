import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	discoverAndLoadExtensions,
	extensionSettingOwner,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { lookup, unregisterOwned } from "@oh-my-pi/pi-coding-agent/config/registry";
import { modeRegistry } from "@oh-my-pi/pi-coding-agent/modes/mode-registry";
import { getAgentDir, getPluginsDir, removeSyncWithRetries, setAgentDir, TempDir } from "@oh-my-pi/pi-utils";

/**
 * `epic-dynamic-workflows-259n.1`, PART 1 — Layer 3 only, and only for the `outsider`
 * fixture. Two things this file deliberately does NOT claim, because claiming them
 * would make it green while protecting nothing — the `epic-jwsy.12` shape.
 *
 * **It does not cover the workflow engine, and the difference is a path, not a
 * caveat.** An earlier version of this line said "`extensions/workflow.ts` does not
 * exist, so nothing here can assert the workflow extension reached a seam" — true,
 * and useless, because `extensions/workflow/` (45 files, tracked at `3a9ada4458`)
 * DOES exist. A reader who saw "does not cover workflow" next to a live
 * `extensions/workflow/` would reasonably conclude the gap was covered elsewhere. It
 * is not: no gate runs that tree's tests. So the honest statement is the positive
 * one — this guard loads ONE fixture, `outsider-extension`, and asserts about that
 * extension only. Whatever else lives under `extensions/` is untouched by it.
 *
 * **It does not prove a panel mounts.** On the frameless context a real `setWidget`
 * THROWS (`runner.ts:540`; `types.ts:384` documents it), so mounting cannot be
 * proven without a real interactive frame — which is what `epic-r0`'s five-seam
 * criterion is still waiting on. The panel row below therefore asserts the
 * SURFACE was obtained, and the one row after it asserts the condition that makes
 * mounting unprovable, so the limit is stated in the test rather than left for a
 * reader to infer from silence. A `toBeGreaterThanOrEqual(0)` here would pass
 * against a fixture that never declared a panel at all.
 *
 * Every assertion reads a REGISTRY after a real discovery run — not that a factory
 * was invoked, and not that a symbol exists in the source. A seam that exists for
 * four surfaces and silently drops the fifth still looks like a working plugin
 * system in every demo.
 */

const FIXTURE_DIR = path.join(import.meta.dir, "fixtures", "outsider-extension");

describe("an out-of-repo extension reaches the seams the programme names", () => {
	let projectDir: TempDir;
	let tempHome = "";
	const originalAgentDir = getAgentDir();
	const xdgVars = ["XDG_DATA_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME"] as const;
	const originalXdg = new Map<string, string | undefined>();
	const settingsOwners: string[] = [];

	function installInto(configDir: string): string {
		const target = path.join(configDir, "extensions", "outsider-extension");
		fs.mkdirSync(target, { recursive: true });
		for (const file of ["index.ts", "package.json"]) {
			fs.copyFileSync(path.join(FIXTURE_DIR, file), path.join(target, file));
		}
		return target;
	}

	async function loadInstalled(cwd: string): Promise<Awaited<ReturnType<typeof discoverAndLoadExtensions>>> {
		const result = await discoverAndLoadExtensions([], cwd);
		for (const extension of result.extensions) settingsOwners.push(extensionSettingOwner(extension));
		return result;
	}

	beforeEach(() => {
		projectDir = TempDir.createSync("@ultraworkers-outsider-guard-");
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "uw-outsider-guard-home-"));
		for (const key of xdgVars) {
			originalXdg.set(key, process.env[key]);
			delete process.env[key];
		}
		spyOn(os, "homedir").mockReturnValue(tempHome);
		setAgentDir(path.join(tempHome, ".omp", "agent"));
		if (!getPluginsDir().startsWith(tempHome + path.sep)) {
			throw new Error(
				`extension isolation failed: getPluginsDir() resolved outside the temp home: ${getPluginsDir()}`,
			);
		}
	});

	afterEach(() => {
		modeRegistry.unregister("outsider");
		modeRegistry.setActivation(undefined);
		for (const owner of settingsOwners.splice(0)) unregisterOwned(owner);
		projectDir.removeSync();
		spyOn(os, "homedir").mockRestore();
		for (const [key, value] of originalXdg) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
		originalXdg.clear();
		setAgentDir(originalAgentDir);
		removeSyncWithRetries(tempHome);
	});

	it("reaches tool, command, hook, setting and mode through a real discovery run", async () => {
		installInto(getAgentDir());
		fs.mkdirSync(path.join(projectDir.path(), ".omp"), { recursive: true });

		const result = await loadInstalled(projectDir.path());

		// A load error here is the failure that matters most: an extension that
		// fails to load takes every other surface down with it, so each later
		// assertion would otherwise report "absent" for a reason that has nothing
		// to do with that seam.
		expect(result.errors).toHaveLength(0);
		const extension = result.extensions.find(e => e.path.includes("outsider-extension"));
		expect(extension).toBeDefined();
		if (!extension) return;

		expect([...extension.tools.keys()]).toContain("outsider_echo");
		expect(extension.commands.has("outsider-ping")).toBe(true);
		// The fixture subscribes `session_start` twice; a loader keeping only the
		// last registration would still show one, so the count is the assertion.
		expect((extension.handlers.get("session_start") ?? []).length).toBe(2);
		expect(lookup("plugins.outsider.greeting")).toBeDefined();
		expect(modeRegistry.has("outsider")).toBe(true);
		modeRegistry.setActivation("outsider");
		expect(modeRegistry.resolvedMode()?.statusLine.label).toBe("Outsider");
		expect(modeRegistry.writePolicy()).toEqual({ denyDelete: true });
	});

	it("reaches the panel surface, and states the condition that stops short of mount", async () => {
		installInto(getAgentDir());
		fs.mkdirSync(path.join(projectDir.path(), ".omp"), { recursive: true });

		const result = await loadInstalled(projectDir.path());
		const extension = result.extensions.find(e => e.path.includes("outsider-extension"));
		expect(extension).toBeDefined();
		if (!extension) return;

		const widgets: string[] = [];
		// `hasUI: false` is the real frameless condition, not a stub value chosen
		// to make the row pass: it is exactly the state under which `setWidget`
		// throws, and the row below asserts it so this file cannot quietly drift
		// into claiming a mount it never performs.
		const ctx = { ui: { hasUI: false, setWidget: (key: string) => widgets.push(key) } };
		for (const hook of extension.handlers.get("session_start") ?? []) {
			await hook({} as never, ctx as never);
		}

		// The surface was obtained, and the widget key reached the context.
		expect(ctx.ui.hasUI).toBe(false);
		expect(widgets).toContain("outsider-widget");
		// WHAT IS NOT PROVEN, said out loud: on this context a real `setWidget`
		// throws, so nothing here shows a panel mounting. That needs an
		// interactive frame, and until one exists this row is evidence about the
		// surface, not about `epic-r0`'s fifth face.
	});
});
