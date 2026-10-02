import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { discoverAndLoadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { modeRegistry } from "@oh-my-pi/pi-coding-agent/modes/mode-registry";
import { getAgentDir, getPluginsDir, removeSyncWithRetries, setAgentDir, TempDir } from "@oh-my-pi/pi-utils";

/**
 * The programme's test, in the only form that counts: an extension that lives
 * *outside* this repository, installed the way a user installs one, declaring
 * every surface the programme names — tool, slash command, lifecycle hook, TUI
 * panel, mode — with no change to core and no hardcoded path.
 *
 * The failure this defends against is the quiet one. Each of those five
 * registrations is a separate branch in the loader, and a seam that exists for
 * four of them and silently drops the fifth still looks like a working plugin
 * system in every demo. So the assertions read what each surface *holds* after
 * a real discovery run, not that a factory was invoked.
 *
 * `configuredPaths` is always `[]`. Passing the fixture's path there would load
 * it directly and skip the discovery walk, which is the part that has to work
 * for an extension nobody hands a path to.
 */

const FIXTURE_DIR = path.join(import.meta.dir, "fixtures", "outsider-extension");

describe("an extension installed from outside the repo", () => {
	let projectDir: TempDir;
	let tempHome = "";
	const originalAgentDir = getAgentDir();
	const xdgVars = ["XDG_DATA_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME"] as const;
	const originalXdg = new Map<string, string | undefined>();

	/** Copy the fixture into a config dir, so the test never loads repo source. */
	function installInto(configDir: string): string {
		const target = path.join(configDir, "extensions", "outsider-extension");
		fs.mkdirSync(target, { recursive: true });
		for (const file of ["index.ts", "package.json"]) {
			fs.copyFileSync(path.join(FIXTURE_DIR, file), path.join(target, file));
		}
		return target;
	}

	beforeEach(() => {
		projectDir = TempDir.createSync("@omp-outsider-");
		// Same isolation the plugin-discovery suite uses, and for the same reason:
		// `os.homedir()` decides where `<configRoot>` resolves, so a regression
		// there would otherwise read — and on Windows once wrote — the developer's
		// real `~/.omp`. The XDG_* vars are cleared because the resolver prefers
		// `$XDG_DATA_HOME/omp` over the home config root when that dir exists.
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "omp-outsider-home-"));
		for (const key of xdgVars) {
			originalXdg.set(key, process.env[key]);
			delete process.env[key];
		}
		spyOn(os, "homedir").mockReturnValue(tempHome);
		setAgentDir(path.join(tempHome, ".omp", "agent"));

		// Fail loudly here rather than writing fixtures into a real config dir.
		const pluginsDir = getPluginsDir();
		if (!pluginsDir.startsWith(tempHome + path.sep)) {
			throw new Error(`extension isolation failed: getPluginsDir() resolved outside the temp home: ${pluginsDir}`);
		}
	});

	afterEach(() => {
		// The registry is process-global and `bun test` shares one process across
		// files, so a mode left declared here would answer `has()` for every suite
		// that runs after this one.
		modeRegistry.unregister("outsider");
		modeRegistry.setActivation(undefined);
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

	it("registers a tool, a command, a hook, a panel and a mode at user scope", async () => {
		// The user config root is `getAgentDir()` itself, not `<home>/.omp`: the
		// resolver is profile-scoped and reads `extensions/` under the agent dir.
		// Installing one level too high is invisible — nothing scans it — so the
		// extension simply never appears.
		installInto(getAgentDir());
		// A `.omp` in the project dir would also be discovered; this case is about
		// the user scope, and an empty project dir keeps the two from overlapping.
		fs.mkdirSync(path.join(projectDir.path(), ".omp"), { recursive: true });

		const result = await discoverAndLoadExtensions([], projectDir.path());
		const extension = result.extensions.find(ext => ext.path.includes("outsider-extension"));

		// It RAN. A parse or type error inside the fixture surfaces here, and
		// every assertion below would otherwise be reading an empty registry.
		expect(result.errors).toHaveLength(0);
		expect(extension).toBeDefined();
		if (!extension) return;

		// 1 — tool
		expect([...extension.tools.keys()]).toContain("outsider_echo");
		// 2 — slash command
		expect(extension.commands.has("outsider-ping")).toBe(true);
		// 3 — lifecycle hook: the fixture subscribes `session_start` twice, and a
		// loader that kept only the last registration would still show one.
		const startHooks = extension.handlers.get("session_start") ?? [];
		expect(startHooks.length).toBe(2);
		// 4 — TUI panel. The widget is mounted by the hook, not at load time, and
		// `setWidget` is documented to work without a frame — so the contract worth
		// pinning is that the out-of-repo extension reached the UI context and the
		// call was accepted, not that some record on `extension` grew. A vacuous
		// `>= 0` here would pass against a fixture that never declared a panel.
		const widgets: string[] = [];
		const ctx = { ui: { hasUI: false, setWidget: (key: string) => widgets.push(key) } };
		for (const hook of startHooks) await hook(ctx as never);
		expect(widgets).toContain("outsider-widget");
		// 5 — mode, with its write policy reachable from the same registry core reads
		expect(modeRegistry.has("outsider")).toBe(true);
		modeRegistry.setActivation("outsider");
		expect(modeRegistry.resolvedMode()?.statusLine.label).toBe("Outsider");
		expect(modeRegistry.writePolicy()).toEqual({ denyDelete: true });
	});

	it("installs the same extension at project scope, discovered from the working directory", async () => {
		// Scope is a discovery decision, not a loader one, so it gets its own case:
		// if only the user scope worked, an extension shared with a team by
		// committing it to the repo would never load for anyone else.
		installInto(path.join(projectDir.path(), ".omp"));

		const result = await discoverAndLoadExtensions([], projectDir.path());
		const extension = result.extensions.find(ext => ext.path.includes("outsider-extension"));

		expect(result.errors).toHaveLength(0);
		expect(extension).toBeDefined();
		expect(modeRegistry.has("outsider")).toBe(true);
	});

	it("runs the installed tool and returns its result", async () => {
		// Discovery and execution are different contracts. Finding the extension
		// only proves the manifest was read; if `execute` were never wired, the
		// model would see a tool that does nothing when it calls one.
		installInto(getAgentDir());
		fs.mkdirSync(path.join(projectDir.path(), ".omp"), { recursive: true });

		const result = await discoverAndLoadExtensions([], projectDir.path());
		const extension = result.extensions.find(ext => ext.path.includes("outsider-extension"));
		// `RegisteredTool` wraps the author's definition rather than being it, so
		// the executable is one level down — reading `tool.execute` gets undefined.
		const tool = extension?.tools.get("outsider_echo");
		if (!tool) throw new Error("outsider_echo was not registered");

		const output = await tool.definition.execute({ text: "ping" } as never, {} as never);
		expect(JSON.stringify(output.content)).toContain("outsider heard: ping");
	});

	it("surfaces a factory that throws as a load error, not a silent omission", async () => {
		// The negative contract for discovery. A factory that throws must land in
		// `errors` with its path, so a broken extension is distinguishable from one
		// that was never installed — otherwise the user's only symptom is a missing
		// command with nothing saying why.
		//
		// This is a *throw*, not a malformed registration: `registerTool({})` stores
		// a tool keyed by `undefined` without complaint (measured — the loader does
		// no argument validation), so that case would assert nothing about errors.
		installInto(getAgentDir());
		const broken = path.join(getAgentDir(), "extensions", "broken-extension");
		fs.mkdirSync(broken, { recursive: true });
		fs.writeFileSync(path.join(broken, "index.ts"), 'export default function() { throw new Error("boom"); }');

		const result = await discoverAndLoadExtensions([], projectDir.path());
		const failure = result.errors.find(entry => entry.path.includes("broken-extension"));

		expect(failure).toBeDefined();
		expect(failure?.error).toContain("boom");
		// The working extension beside it must still load: one bad neighbour must
		// not take the rest of the config down with it.
		expect(result.extensions.some(ext => ext.path.includes("outsider-extension"))).toBe(true);
	});
});
