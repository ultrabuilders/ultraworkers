import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	discoverAndLoadExtensions,
	extensionSettingOwner,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { unregisterOwned } from "@oh-my-pi/pi-coding-agent/config/registry";
import { modeRegistry } from "@oh-my-pi/pi-coding-agent/modes/mode-registry";
import { getAgentDir, getPluginsDir, removeSyncWithRetries, setAgentDir, TempDir } from "@oh-my-pi/pi-utils";

/**
 * `epic-dynamic-workflows-259n.12` — Phase 8, the only condition that makes the plan
 * correct. AGENTS.md asks exactly one question:
 *
 *   an extension written outside this repo installs and registers a tool + slash command +
 *   config key + lifecycle hook + TUI panel — without changing a single line of core.
 *
 * Phases 1–7 can all be green with the extension in the wrong place, and this file is the
 * one that cannot be: it loads the REAL `extensions/workflow.ts` through the host's REAL
 * discovery and reads the registries afterwards. A unit test of the engine proves the engine
 * works; only this proves the user gets it.
 *
 * WHY IT IS RED TODAY, and why that is the correct state rather than a missing test. The
 * entrypoint does not exist — `docs/dynamic-workflows.md:216` maps `pi-extension.ts` to
 * `extensions/workflow.ts`, and that file is not on disk. Its eight dependencies are missing
 * too (`tools/workflow.ts`, `commands/index.ts`, `commands/ultracode.ts`, `arming.ts`,
 * `ui/panel.ts`, `manager.ts`, `settings.ts`, `workflows/registry.ts`), which is the real
 * reason it is not written: the plan says COPY, and a `WorkflowManager` that does not exist
 * cannot be copied. This test is written FIRST so that when the entrypoint lands, the rows
 * that must go green are already named and already load the real thing.
 *
 * It is deliberately NOT written to pass. A seam test that goes green without the entrypoint
 * is `epic-jwsy.11` again — a correct fence with zero production callers, where every test in
 * the suite is green and the user gets none of it.
 *
 * WHAT THIS FILE DOES NOT CLAIM. It asserts the five surfaces the programme names, from the
 * registries, after a real load. It does not prove a workflow RUNS: `agent()` throws until the
 * agent-bridge phase lands, so the tool is registered and reachable but a real run is not
 * exercised here. Nor does it assert anything about `packages/` — the zero-core-diff half of
 * the claim is a `git diff` over the merge base, which belongs in CI, not in a unit test that
 * would have to shell out to prove it.
 */

const REPO_ROOT = path.join(import.meta.dir, "..", "..");
const ENTRYPOINT = path.join(REPO_ROOT, "extensions", "workflow.ts");
const PLUGIN_DIR = path.join(REPO_ROOT, "extensions", "dynamic-workflows");

/**
 * What the plan says the entrypoint registers (`docs/dynamic-workflows.md:216`, and the
 * `259n.12` description). Names are asserted against the registries rather than against the
 * source, so a renamed constant fails this row instead of passing it.
 */
const EXPECTED = {
	tools: ["workflow", "workflow_control"],
	commands: ["workflows", "ultracode"],
} as const;

describe("259n.12 — the workflow extension reaches the host's seams", () => {
	let projectDir: TempDir;
	let tempHome = "";
	const originalAgentDir = getAgentDir();
	const xdgVars = ["XDG_DATA_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME"] as const;
	const originalXdg = new Map<string, string | undefined>();
	const settingsOwners: string[] = [];

	beforeEach(() => {
		projectDir = TempDir.createSync("@ultraworkers-workflow-seam-");
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "uw-workflow-seam-home-"));
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
		modeRegistry.unregister("ultracode");
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

	it("has an entrypoint at the path the plan maps pi-extension.ts to", () => {
		// The precondition, stated separately so its failure names the cause. Everything else
		// in this file fails downstream of a missing file, and a single "extension not found"
		// for five different seams is one fact reported five times.
		expect(fs.existsSync(ENTRYPOINT)).toBe(true);
	});

	it("names the entrypoint in a manifest the host's discovery can find", async () => {
		// The other half of "it loads", and it is a separate fact from the file existing. A
		// plugin directory with no `omp.extensions` list is not discovered at all — discovery
		// reads the manifest, not the directory — so an entrypoint sitting next to it would
		// make every registration row fail for a reason that has nothing to do with
		// registration. Measured: `extensions/dynamic-workflows/package.json` currently has
		// no `omp` key, so this row is red independently of the file being absent.
		const manifest = (await Bun.file(path.join(PLUGIN_DIR, "package.json")).json()) as {
			omp?: { extensions?: string[] };
		};
		expect(manifest.omp?.extensions).toContain("../workflow.ts");
	});

	it("loads through the host's real discovery without a core change", async () => {
		// A load ERROR here is the failure that matters most: an extension that fails to load
		// takes every other surface down with it, so each later row would otherwise report
		// "absent" for a reason that has nothing to do with that seam.
		const result = await discoverAndLoadExtensions([PLUGIN_DIR], projectDir.path());
		for (const extension of result.extensions) settingsOwners.push(extensionSettingOwner(extension));

		expect(result.errors).toEqual([]);
		const extension = result.extensions.find(e => e.path.includes("workflow"));
		expect(extension).toBeDefined();
	});

	it("registers the workflow tool and the lifecycle control tool", async () => {
		const result = await discoverAndLoadExtensions([PLUGIN_DIR], projectDir.path());
		const extension = result.extensions.find(e => e.path.includes("workflow"));
		if (!extension) throw new Error("workflow extension did not load");

		const registered = [...extension.tools.keys()];
		for (const tool of EXPECTED.tools) expect(registered).toContain(tool);
	});

	it("registers /workflows and /ultracode as slash commands", async () => {
		const result = await discoverAndLoadExtensions([PLUGIN_DIR], projectDir.path());
		const extension = result.extensions.find(e => e.path.includes("workflow"));
		if (!extension) throw new Error("workflow extension did not load");

		for (const command of EXPECTED.commands) {
			expect(extension.commands.has(command)).toBe(true);
		}
	});

	it("registers its settings under the plugins. prefix the registry refuses to skip", async () => {
		// `config/registry.ts:899` refuses any id outside `plugins.<id>.<key>` and throws
		// DURING registration, so a flat id does not merely lose one key — it fails the whole
		// load and takes the other four surfaces down with it. This row therefore also guards
		// the row above: a bad setting id would make the commands row fail for the wrong reason.
		const result = await discoverAndLoadExtensions([PLUGIN_DIR], projectDir.path());
		const extension = result.extensions.find(e => e.path.includes("workflow"));
		if (!extension) throw new Error("workflow extension did not load");

		expect(result.errors).toEqual([]);
		expect(extension.settings.size).toBeGreaterThan(0);
		for (const id of extension.settings.keys()) expect(id.startsWith("plugins.")).toBe(true);
	});

	it("subscribes to session_start so the panel is installed after the session exists", async () => {
		// Lifecycle, and specifically the ordering the bead calls out: `:257-279` does NOT
		// install the panel during the factory, because an extension's UI surfaces registered
		// before the session exists can be dropped by a session switch. A factory-time
		// install would satisfy a naive "did it register a hook" check while being wrong.
		const result = await discoverAndLoadExtensions([PLUGIN_DIR], projectDir.path());
		const extension = result.extensions.find(e => e.path.includes("workflow"));
		if (!extension) throw new Error("workflow extension did not load");

		expect((extension.handlers.get("session_start") ?? []).length).toBeGreaterThan(0);
	});

	it("reaches the panel surface, and says the condition that stops short of a mount", async () => {
		// The fifth seam. On the frameless context a real `setWidget` THROWS (`runner.ts:540`),
		// so mounting cannot be proven without an interactive frame — which is what the
		// programme's five-seam criterion is still waiting on. This row asserts the SURFACE
		// was obtained and asserts `hasUI === false` alongside it, so the limit is stated in
		// the test rather than left for a reader to infer from silence.
		const result = await discoverAndLoadExtensions([PLUGIN_DIR], projectDir.path());
		const extension = result.extensions.find(e => e.path.includes("workflow"));
		if (!extension) throw new Error("workflow extension did not load");

		const widgets: string[] = [];
		const ctx = { ui: { hasUI: false, setWidget: (key: string) => widgets.push(key) } };
		for (const hook of extension.handlers.get("session_start") ?? []) {
			await hook({} as never, ctx as never);
		}

		expect(ctx.ui.hasUI).toBe(false);
		expect(widgets).toContain("workflow-tasks");
	});
});
