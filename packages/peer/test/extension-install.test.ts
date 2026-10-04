import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	discoverAndLoadExtensions,
	extensionSettingOwner,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { unregisterOwned } from "@oh-my-pi/pi-coding-agent/config/registry";
import { getAgentDir, logger, removeSyncWithRetries, setAgentDir, TempDir } from "@oh-my-pi/pi-utils";

/**
 * `packages/peer` as an installed extension, loaded the way a user loads one.
 *
 * ## The failure this defends against
 *
 * `registerPeerTools` and `registerPeerCommands` had **no caller anywhere** — not in
 * `src/`, not in a test. A package with a complete implementation and no manifest is a
 * library that cannot become a plugin, and every test in this directory stayed green
 * because they all import `../src/...` directly. None of them can see the missing half,
 * which is the half that only exists outside the repo: the manifest, the entry file, and
 * the loader's discovery walk. So this suite installs the package somewhere the repo
 * does not contain it and asks whether the verbs arrive.
 *
 * ## Why the assertions fire `session_start` rather than reading the registry directly
 *
 * This extension registers on `session_start`, not at activate time, because five of the
 * six things the verbs need are per-session facts. That deferral is a contract with an
 * observable consequence — a loader that ran the factory and dropped the hook, or a host
 * that never fires `session_start`, leaves the tool table **empty** — and it is the one
 * thing a direct read of `registerPeerTools`'s source could never catch.
 *
 * ## What is deliberately NOT asserted here
 *
 * That the `crossSessionInbound` setting reaches the fence. It cannot, and no assertion
 * here should imply otherwise: an extension is handed no route to host settings
 * (`ExtensionContext` has no settings field, the setting descriptor
 * `cfgPeerCrossSessionInbound` is in `src/peer/settings.ts` and is not exported from any
 * public subpath, and the registry's `lookupSetting` is not public either). Closing that
 * needs a core change. The fence's own wiring — that a registered fence is consulted
 * before delivery — is covered where it lives, in
 * `coding-agent/test/irc/inbound-fence-wiring.test.ts`, which can import the core module
 * this package cannot.
 *
 * Asserting the parameter *shape* instead would be the mistake worth avoiding: it
 * protects a type rather than a behaviour, and it is exactly the assertion that let an
 * earlier version of the entry point read a nonexistent `ctx.policy` behind an `as never`
 * while typechecking green.
 */

const PKG_DIR = path.resolve(import.meta.dir, "..");
const REPO_ROOT = path.resolve(import.meta.dir, "..", "..", "..");

const PEER_TOOLS = ["peer.list", "peer.send", "peer.lock", "peer.release"];
const PEER_COMMANDS = ["list-agents", "peers", "rename"];

describe("packages/peer installed as an extension", () => {
	let projectDir: TempDir;
	let tempHome = "";
	const originalAgentDir = getAgentDir();
	const xdgVars = ["XDG_DATA_HOME", "XDG_STATE_HOME", "XDG_CACHE_HOME"] as const;
	const originalXdg = new Map<string, string | undefined>();
	const settingsOwners: string[] = [];

	/**
	 * Copy the whole package into `<agentDir>/extensions/peer/`.
	 *
	 * `src/` comes along because the entry file reaches it relatively (`../src/fence`,
	 * eight such imports). Copying only `extensions/index.ts` would load a module whose
	 * every relative import dangles, which fails as a load error and reads as "the
	 * extension is broken" rather than "the test installed it wrong".
	 */
	function installInto(configDir: string): string {
		const target = path.join(configDir, "extensions", "peer");
		fs.mkdirSync(target, { recursive: true });
		fs.cpSync(path.join(PKG_DIR, "src"), path.join(target, "src"), { recursive: true });
		fs.mkdirSync(path.join(target, "extensions"), { recursive: true });
		for (const file of ["package.json", "extensions/index.ts"]) {
			fs.copyFileSync(path.join(PKG_DIR, file), path.join(target, file));
		}
		return target;
	}

	async function loadInstalled(cwd: string) {
		const result = await discoverAndLoadExtensions([], cwd);
		for (const extension of result.extensions) settingsOwners.push(extensionSettingOwner(extension));
		return result;
	}

	/** Run the extension's `session_start` handlers with a context carrying a `cwd`. */
	async function fireSessionStart(handlers: readonly ((event: unknown, ctx: unknown) => unknown)[], cwd: string) {
		for (const handler of handlers) await handler({}, { cwd });
	}

	beforeEach(() => {
		projectDir = TempDir.createSync("@ultraworkers-peer-ext-");
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "uw-peer-home-"));
		for (const key of xdgVars) {
			originalXdg.set(key, process.env[key]);
			delete process.env[key];
		}
		spyOn(os, "homedir").mockReturnValue(tempHome);
		setAgentDir(path.join(tempHome, ".omp", "agent"));
	});

	afterEach(() => {
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

	it("loads from a manifest the repo does not contain, and registers its verbs on the first context", async () => {
		// User scope. A `.omp` in the project dir would also be discovered, and this
		// case is about the copy a user drops in their own config dir.
		installInto(getAgentDir());
		fs.mkdirSync(path.join(projectDir.path(), ".omp"), { recursive: true });

		const result = await loadInstalled(projectDir.path());
		const extension = result.extensions.find(ext => ext.path.includes(`${path.sep}peer${path.sep}`));

		// It RAN. A parse error, a bad relative import, or a factory that throws lands
		// here, and every assertion below would otherwise read an empty registry and
		// pass for the wrong reason.
		expect(result.errors).toHaveLength(0);
		expect(extension).toBeDefined();
		if (!extension) return;

		// Provenance — the claim in this file's name. Every sibling assertion reads the
		// same registry, so a loader special-casing this package, or pointed at the
		// copy inside `packages/peer`, leaves all of them green. Only a path can tell
		// the two apart, and a hardcoded path cannot produce a temp dir this run made.
		expect(extension.path.startsWith(`${tempHome}${path.sep}`)).toBe(true);
		expect(extension.path.startsWith(`${REPO_ROOT}${path.sep}`)).toBe(false);

		// Nothing yet — the verbs are deferred, so an empty table here is the
		// contract rather than a gap.
		expect([...extension.tools.keys()]).toHaveLength(0);

		const startHooks = extension.handlers.get("session_start") ?? [];
		expect(startHooks.length).toBeGreaterThan(0);
		await fireSessionStart(startHooks, projectDir.path());

		for (const name of PEER_TOOLS) expect([...extension.tools.keys()]).toContain(name);
		for (const name of PEER_COMMANDS) expect(extension.commands.has(name)).toBe(true);
	});

	it("runs the registration once, not again on a reconnect", async () => {
		// `session_start` re-fires on reconnect, and the extension guards with a
		// `registered` flag. A guard that stopped working is NOT visible in the tool
		// table: re-registering a name is a `Map` overwrite, so the count stays at four
		// either way. That was measured — deleting the guard left this file green — so
		// the assertion here is on the work the guard actually prevents, which is
		// observable: the load message is emitted once per process.
		installInto(getAgentDir());
		fs.mkdirSync(path.join(projectDir.path(), ".omp"), { recursive: true });

		const result = await loadInstalled(projectDir.path());
		const extension = result.extensions.find(ext => ext.path.includes(`${path.sep}peer${path.sep}`));
		if (!extension) throw new Error("peer extension did not load");

		const startHooks = extension.handlers.get("session_start") ?? [];
		const loaded = spyOn(logger, "info");
		await fireSessionStart(startHooks, projectDir.path());
		await fireSessionStart(startHooks, projectDir.path());

		const loadMessages = loaded.mock.calls.filter(call => call[0] === "peer extension loaded");
		expect(loadMessages.length).toBe(1);
		// And the surfaces the reconnect must not have doubled up on.
		expect(extension.tools.size).toBe(PEER_TOOLS.length);
		expect(extension.commands.size).toBe(PEER_COMMANDS.length);
		loaded.mockRestore();
	});
});
