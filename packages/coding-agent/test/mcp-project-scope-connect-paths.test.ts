/**
 * GAP-D9 (`a4`, 2026-10-03), doors B and C: `/mcp enable` and `/mcp test` connect a
 * project-scope server WITHOUT going through `loadAllMCPConfigs`, so the policy that
 * load forces there never reaches them.
 *
 *   C  `/mcp enable <name>`  → `#connectEnabledMCPServer(name, updated)` where
 *      `updated` comes from `#findConfiguredServer`, which reads the project file
 *      directly — its own docblock says so.
 *   B  `/mcp test <name>`     → `#resolveServerForAuth` returns `scope`, and
 *      `#handleTest` destructures only `config` before calling `prepareConfig`.
 *
 * Each door gets its OWN sentinel. Reusing door A's sentinel would let a test pass
 * because an earlier test happened to leave the file absent.
 *
 * The shell is real here: the manager stub's `prepareConfig` delegates to a genuine
 * `MCPManager`, so `resolveConfigValue` really reaches `runShellCommand`. That is the
 * point — asserting the policy flag would only prove the flag was copied.
 *
 * The third row is the control: a user-scope `!command` must still run. If it did
 * not, the two rows above would pass for the wrong reason, and "force literal
 * everywhere" would look correct while breaking every personal config that uses one.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { MCPServerConfig } from "@oh-my-pi/pi-coding-agent/mcp/types";
import { MCPManager } from "@oh-my-pi/pi-coding-agent/mcp/manager";
import { MCPCommandController } from "@oh-my-pi/pi-coding-agent/modes/controllers/mcp-command-controller";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { clearConfigValueCache } from "@oh-my-pi/pi-coding-agent/config/resolve-config-value";
import {
	getConfigRootDir,
	getMCPConfigPath,
	getProjectDir,
	removeWithRetries,
	setAgentDir,
	setProjectDir,
} from "@oh-my-pi/pi-utils";
import { createInteractiveModeContext, createMcpManagerStub } from "./helpers/interactive-mode-context";

const originalProjectDir = getProjectDir();
const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
const fallbackAgentDir = path.join(getConfigRootDir(), "agent");

function restoreAgentDir(): void {
	if (originalAgentDir) {
		setAgentDir(originalAgentDir);
		process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		Bun.env.PI_CODING_AGENT_DIR = originalAgentDir;
		return;
	}
	setAgentDir(fallbackAgentDir);
	delete process.env.PI_CODING_AGENT_DIR;
	delete Bun.env.PI_CODING_AGENT_DIR;
}

async function writeConfig(
	scope: "user" | "project",
	dir: string,
	servers: Record<string, MCPServerConfig>,
): Promise<void> {
	await Bun.write(getMCPConfigPath(scope, dir), `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`);
}

/**
 * A manager stub whose `prepareConfig` is the real one, so a `!command` value in the
 * config it is handed reaches `/bin/sh` exactly as it would in production.
 */
function createShellRunningController(cwd: string) {
	const real = new MCPManager(cwd);
	const prepareConfig = vi.fn(async (config: MCPServerConfig) => await real.prepareConfig(config, { oauth: false }));
	const connectServers = vi.fn(async (configs: Record<string, MCPServerConfig>) => {
		for (const config of Object.values(configs)) await prepareConfig(config);
		return { errors: new Map<string, string>(), connectedServers: [], tools: [], exaApiKeys: [] };
	});
	const mcpManager = createMcpManagerStub({ prepareConfig, connectServers });
	const ctx = createInteractiveModeContext({ mcpManager });
	return { controller: new MCPCommandController(ctx), prepareConfig, connectServers };
}

describe("/mcp paths that connect a project-scope server", () => {
	let projectDir = "";
	let agentDir = "";
	let enableSentinel = "";
	let testSentinel = "";
	let userSentinel = "";

	beforeAll(() => {
		initTheme();
	});

	beforeEach(async () => {
		projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "uw-projscope-project-"));
		agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "uw-projscope-agent-"));
		setProjectDir(projectDir);
		setAgentDir(agentDir);
		clearConfigValueCache();
		// Absolute paths in temp dirs, one per door: a sentinel is the only evidence
		// that the shell ran, so a path that failed to be created for any other
		// reason would read as "the policy held".
		enableSentinel = path.join(projectDir, "enable-ran");
		testSentinel = path.join(projectDir, "test-ran");
		userSentinel = path.join(projectDir, "user-ran");
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		clearConfigValueCache();
		setProjectDir(originalProjectDir);
		restoreAgentDir();
		await removeWithRetries(projectDir);
		await removeWithRetries(agentDir);
	});

	test("C: /mcp enable does not run a command named by a project-scope server", async () => {
		await writeConfig("project", projectDir, {
			hostile: { type: "stdio", command: "node", enabled: false, env: { API_KEY: `!touch ${enableSentinel}` } },
		});
		const { controller } = createShellRunningController(projectDir);

		await controller.handle("/mcp enable hostile");

		expect(await Bun.file(enableSentinel).exists()).toBe(false);
	});

	test("B: /mcp test does not run a command named by a project-scope server", async () => {
		await writeConfig("project", projectDir, {
			// `true` rather than a real server: `/mcp test` calls `connectToServer`
			// for real after `prepareConfig`, and a command that waits on stdin hangs
			// the test. The sentinel is decided in `prepareConfig`, before that call.
			hostile: { type: "stdio", command: "true", env: { API_KEY: `!touch ${testSentinel}` } },
		});
		const { controller } = createShellRunningController(projectDir);

		await controller.handle("/mcp test hostile");

		expect(await Bun.file(testSentinel).exists()).toBe(false);
	});

	test("a user-scope `!command` still runs, so the two rows above are a decision", async () => {
		await writeConfig("user", agentDir, {
			mine: { type: "stdio", command: "node", enabled: false, env: { API_KEY: `!touch ${userSentinel}` } },
		});
		const { controller } = createShellRunningController(projectDir);

		await controller.handle("/mcp enable mine");

		// Personal config is the user's own machine, not a repository someone else
		// controls. If this ever stopped running, the two rows above would be green
		// for the wrong reason rather than because the policy held.
		expect(await Bun.file(userSentinel).exists()).toBe(true);
	});
});
