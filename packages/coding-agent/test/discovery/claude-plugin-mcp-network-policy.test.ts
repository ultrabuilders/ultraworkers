/**
 * A plugin bundle's MCP server is held to the network policy at LOAD.
 *
 * The unit tests in `test/mcp/network-policy.test.ts` prove the table is right.
 * They cannot prove anything is wired to it — an uncalled function and a called
 * one behave identically under `assert(classifyHost(x) === "loopback")`. So this
 * file goes through the real discovery path: a plugin directory on disk, a real
 * registry, the real `loadCapability("mcp")`.
 *
 * The distinction under test is the one GAP-D1 decided. The same URL is refused
 * here, where a third-party bundle named it, and allowed on the path where the
 * user typed it themselves. A regression that widened either level would be
 * invisible to every other test in this repo: it would surface as "my local MCP
 * server stopped working", on someone else's machine.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { clearCache as clearFsCache } from "@oh-my-pi/pi-coding-agent/capability/fs";
import { disableUserSource, enableProvider, loadCapability } from "@oh-my-pi/pi-coding-agent/capability";
import { clearClaudePluginRootsCache } from "@oh-my-pi/pi-coding-agent/discovery/helpers";
import { type MCPServer, mcpCapability } from "@oh-my-pi/pi-coding-agent/capability/mcp";
import { __resetDirsFromEnvForTests, removeWithRetries, setAgentDir } from "@oh-my-pi/pi-utils";

// Providers register as a side effect of this import. Without it the capability
// has no provider at all, the load returns nothing, and every assertion below
// would pass for the wrong reason.
import "@oh-my-pi/pi-coding-agent/discovery/claude-plugins";

describe("a plugin bundle declaring an MCP server", () => {
	let tempDir: string;
	let testAgentDir: string;
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

	/**
	 * Write a plugin bundle whose manifest declares one MCP server, and return
	 * the load warnings. Mirrors the marketplace-plugin shape a real install
	 * produces: a registry entry pointing at a directory, and a manifest with an
	 * inline `mcpServers` object.
	 */
	async function loadBundleMcp(url: string): Promise<{ items: MCPServer[]; warnings: string[] }> {
		const pluginPath = path.join(tempDir, "plugins", "bundle");
		await fs.mkdir(path.join(pluginPath, ".omp-plugin"), { recursive: true });
		await fs.mkdir(path.dirname(registryPath), { recursive: true });
		await Promise.all([
			fs.writeFile(
				path.join(pluginPath, ".omp-plugin", "plugin.json"),
				JSON.stringify({
					name: "bundle",
					version: "1.0.0",
					mcpServers: { sneaky: { type: "http", url } },
				}),
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
		return { items: result.items, warnings: result.warnings };
	}

	let registryPath: string;

	beforeEach(async () => {
		clearClaudePluginRootsCache();
		clearFsCache();
		originalHome = process.env.HOME;
		originalAgentDirEnv = process.env.PI_CODING_AGENT_DIR;
		originalOmpProfileEnv = process.env.OMP_PROFILE;
		originalPiProfileEnv = process.env.PI_PROFILE;
		originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
		delete process.env.CLAUDE_CONFIG_DIR;
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-mcp-policy-"));
		testAgentDir = await fs.mkdtemp(path.join(os.tmpdir(), "plugin-mcp-policy-agent-"));
		process.env.HOME = tempDir;
		vi.spyOn(os, "homedir").mockReturnValue(tempDir);
		setAgentDir(testAgentDir);
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

	test("does not register a server pointed at the user's own loopback", async () => {
		// The threat GAP-D1 exists for: a bundle nobody reviewed names an address
		// on the machine the user is sitting at, and the resulting MCP server can
		// reach services bound to localhost.
		const { items, warnings } = await loadBundleMcp("https://127.0.0.1:3000/mcp");

		expect(items.find(s => s.name === "bundle:sneaky")).toBeUndefined();
		expect(warnings.some(w => w.includes("sneaky") && w.includes("loopback"))).toBe(true);
	});

	test("does not register a server pointed at loopback through the IPv4-mapped IPv6 form", async () => {
		// It renders as IPv6 in a log and routes to 127.0.0.1 exactly as the plain
		// form does. A filter that reads the host as "IPv6, looks fine" lets it by.
		const { items } = await loadBundleMcp("https://[::ffff:127.0.0.1]:3000/mcp");

		expect(items.find(s => s.name === "bundle:sneaky")).toBeUndefined();
	});

	test("does not register a server pointed at the cloud metadata endpoint", async () => {
		const { items } = await loadBundleMcp("https://169.254.169.254/latest/meta-data/");

		expect(items.find(s => s.name === "bundle:sneaky")).toBeUndefined();
	});

	test("does not register a plain-http server from a bundle", async () => {
		// The level, not just the address: a bundle's endpoint is https-only.
		const { items } = await loadBundleMcp("http://mcp.example.com/v1");

		expect(items.find(s => s.name === "bundle:sneaky")).toBeUndefined();
	});

	test("still registers a public https server the bundle legitimately declares", async () => {
		// The preservation row. Refusing legitimate bundles is the failure mode that
		// makes a policy change a breaking release, and no other test here would go
		// red for it — the breakage lands on the user's machine, not in CI.
		const { items } = await loadBundleMcp("https://mcp.example.com/v1");

		expect(items.find(s => s.name === "bundle:sneaky")).toBeDefined();
		expect(items.find(s => s.name === "bundle:sneaky")?.url).toBe("https://mcp.example.com/v1");
	});
});
