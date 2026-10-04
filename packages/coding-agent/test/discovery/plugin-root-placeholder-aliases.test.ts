/**
 * The plugin-root placeholder has three spellings and three independent consumers.
 *
 * `${CLAUDE_PLUGIN_ROOT}` is what Claude Code's own marketplaces author,
 * `${OMP_PLUGIN_ROOT}` is our pre-rebrand spelling, and
 * `${ULTRAWORKERS_PLUGIN_ROOT}` is canonical after the rebrand. All three resolve to
 * the same root, so they are aliases rather than fallbacks — nothing can shadow
 * anything else and there is no precedence to get wrong.
 *
 * What breaks if this regresses: the placeholders are authored in plugin manifests
 * published by third parties. Drop a spelling from one consumer and a manifest using
 * it keeps the raw text as `argv[0]`, the spawn fails ENOENT, and nothing upstream
 * reports anything — there is no error to grep for. That is why these rows go through
 * the real loader rather than calling a helper directly: the helpers each look
 * correct in isolation, and the failure mode is precisely a consumer that was not
 * updated alongside its siblings.
 *
 * The legacy spelling has its own row on purpose. Once the canonical spelling exists,
 * "finish the rename and drop the old one" is a one-line change that passes every test
 * about the new name while breaking every marketplace published before the rebrand.
 */
import { afterEach, beforeEach, describe, expect, it, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { clearCache as clearFsCache } from "@oh-my-pi/pi-coding-agent/capability/fs";
import { disableUserSource, enableProvider, loadCapability } from "@oh-my-pi/pi-coding-agent/capability";
import { clearClaudePluginRootsCache } from "@oh-my-pi/pi-coding-agent/discovery/helpers";
import { substitutePluginRoot } from "@oh-my-pi/pi-coding-agent/discovery/substitute-plugin-root";
import { type MCPServer, mcpCapability } from "@oh-my-pi/pi-coding-agent/capability/mcp";
import { __resetDirsFromEnvForTests, removeWithRetries, setAgentDir } from "@oh-my-pi/pi-utils";

// Providers register as a side effect of this import; without it the capability has
// no provider and every assertion below passes because nothing loaded at all.
import "@oh-my-pi/pi-coding-agent/discovery/claude-plugins";

// Concatenation avoids the noTemplateCurlyInString lint rule on placeholder names.
const CLAUDE = "$" + "{CLAUDE_PLUGIN_ROOT}";
const LEGACY = "$" + "{OMP_PLUGIN_ROOT}";
const CANONICAL = "$" + "{ULTRAWORKERS_PLUGIN_ROOT}";

describe("substitutePluginRoot", () => {
	const ROOT = "/plugins/my-plugin";

	it("resolves the canonical spelling", () => {
		expect(substitutePluginRoot(`${CANONICAL}/bin/server`, ROOT)).toBe("/plugins/my-plugin/bin/server");
	});

	it("still resolves the pre-rebrand spelling after the canonical one was added", () => {
		// The regression row. Deleting the legacy replaceAll satisfies every other
		// test in this file and silently breaks third-party manifests.
		expect(substitutePluginRoot(`${LEGACY}/bin/server`, ROOT)).toBe("/plugins/my-plugin/bin/server");
	});

	it("resolves all three spellings in one string", () => {
		// Distinct branch: chained replaceAll over a string carrying several
		// placeholders, which no single-spelling row exercises.
		expect(substitutePluginRoot(`${CANONICAL}:${LEGACY}:${CLAUDE}`, ROOT)).toBe(
			"/plugins/my-plugin:/plugins/my-plugin:/plugins/my-plugin",
		);
	});

	it("leaves an unregistered placeholder untouched", () => {
		// The control for the rows above: a spelling we do not register survives as
		// literal text, so their passing proves the alias did the work rather than
		// something rewriting every `${...}` incidentally.
		expect(substitutePluginRoot("$" + "{SOME_OTHER_ROOT}/bin", ROOT)).toBe("$" + "{SOME_OTHER_ROOT}/bin");
	});
});

describe("a plugin bundle whose manifest roots its MCP server", () => {
	let tempDir: string;
	let testAgentDir: string;
	let pluginPath: string;
	let registryPath: string;
	let originalHome: string | undefined;
	let originalAgentDirEnv: string | undefined;
	let originalOmpProfileEnv: string | undefined;
	let originalPiProfileEnv: string | undefined;
	let originalClaudeConfigDir: string | undefined;

	function restoreEnvValue(key: string, value: string | undefined): void {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}

	/** Write a real plugin bundle with one stdio server and load it through discovery. */
	async function loadBundleMcp(server: Record<string, unknown>): Promise<MCPServer[]> {
		await fs.mkdir(path.join(pluginPath, ".omp-plugin"), { recursive: true });
		await fs.mkdir(path.dirname(registryPath), { recursive: true });
		await Promise.all([
			fs.writeFile(
				path.join(pluginPath, ".omp-plugin", "plugin.json"),
				JSON.stringify({ name: "bundle", version: "1.0.0", mcpServers: { rooted: server } }),
			),
			fs.writeFile(
				registryPath,
				JSON.stringify({
					version: 2,
					plugins: { "bundle@market": [{ scope: "user", installPath: pluginPath, version: "1.0.0" }] },
				}),
			),
		]);
		const result = await loadCapability<MCPServer>(mcpCapability.id, { cwd: tempDir });
		return result.items;
	}

	beforeEach(async () => {
		clearClaudePluginRootsCache();
		clearFsCache();
		originalHome = process.env.HOME;
		originalAgentDirEnv = process.env.PI_CODING_AGENT_DIR;
		originalOmpProfileEnv = process.env.OMP_PROFILE;
		originalPiProfileEnv = process.env.PI_PROFILE;
		originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
		delete process.env.CLAUDE_CONFIG_DIR;
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-root-alias-"));
		testAgentDir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-root-alias-agent-"));
		process.env.HOME = tempDir;
		vi.spyOn(os, "homedir").mockReturnValue(tempDir);
		setAgentDir(testAgentDir);
		pluginPath = path.join(tempDir, "plugins", "bundle");
		registryPath = path.join(tempDir, ".omp", "plugins", "installed_plugins.json");
		enableProvider("claude-plugins");
		disableUserSource("claude-plugins");
		disableUserSource("claude");
	});

	afterEach(async () => {
		clearClaudePluginRootsCache();
		clearFsCache();
		vi.restoreAllMocks();
		restoreEnvValue("HOME", originalHome);
		restoreEnvValue("OMP_PROFILE", originalOmpProfileEnv);
		restoreEnvValue("PI_PROFILE", originalPiProfileEnv);
		restoreEnvValue("PI_CODING_AGENT_DIR", originalAgentDirEnv);
		restoreEnvValue("CLAUDE_CONFIG_DIR", originalClaudeConfigDir);
		enableProvider("claude-plugins");
		disableUserSource("claude-plugins");
		disableUserSource("claude");
		__resetDirsFromEnvForTests();
		await removeWithRetries(tempDir);
		await removeWithRetries(testAgentDir);
	});

	test("the canonical spelling becomes the executable, with no placeholder left in argv[0]", async () => {
		const items = await loadBundleMcp({ command: `${CANONICAL}/bin/server` });

		const server = items.find(s => s.name === "bundle:rooted");
		expect(server?.command).toBe(path.join(pluginPath, "bin", "server"));
	});

	test("the pre-rebrand spelling still becomes the executable", async () => {
		// Same failure mode as the unit row, one layer out: this is the path a
		// marketplace published before the rebrand actually takes.
		const items = await loadBundleMcp({ command: `${LEGACY}/bin/server` });

		const server = items.find(s => s.name === "bundle:rooted");
		expect(server?.command).toBe(path.join(pluginPath, "bin", "server"));
	});

	test("the canonical spelling expands inside an env value and is pinned literal", async () => {
		// The second, independent consumer: env values go through
		// resolveMarketplaceEnv rather than substitutePluginRoot. A key added to one
		// and not the other leaves this half silently unexpanded.
		const items = await loadBundleMcp({
			command: "server",
			env: { PLUGIN_DIR: CANONICAL },
		});

		const server = items.find(s => s.name === "bundle:rooted");
		expect(server?.env?.PLUGIN_DIR).toBe(pluginPath);
		// Expanded values are final package data and must never be re-scanned as a
		// bare env name at connect time, so the key is recorded as literal.
		expect(server?.envLiteralKeys).toContain("PLUGIN_DIR");
	});
});
