/**
 * GAP-D9 (`a4`, 2026-10-03), door D: `/mcp resources`, `/mcp prompts` and
 * `/mcp test` in the ACP/text-mode dispatcher.
 *
 * `getMcpConfiguredServers` reads the user and project mcp.json DIRECTLY — it
 * does not go through `loadAllMCPConfigs`, so the policy that loader forces is
 * never attached — and it reports a `scope` per server that both of its callers
 * used to drop on the floor. This is a `!command` door of its own.
 *
 * Driven through `handleMcpAcp`, which is the handler the builtin registry
 * dispatches `/mcp` to on this path (`builtin-session.ts`, `handle:`), so the
 * code under test is the real one; only the registry lookup above it is skipped,
 * because that entry point wants a full TUI context and this path is the
 * session/ACP one. The TUI spelling of `/mcp resources` goes to
 * `ctx.handleMCPCommand` instead, which is door C's file.
 *
 * Separate sentinel, for the reason the other doors have their own: a file left
 * absent by an earlier test would otherwise pass this one.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { MCPServerConfig } from "@oh-my-pi/pi-coding-agent/mcp/types";
import type { SlashCommandRuntime } from "@oh-my-pi/pi-coding-agent/slash-commands/types";
import { handleMcpAcp } from "@oh-my-pi/pi-coding-agent/slash-commands/helpers/mcp";
import { clearConfigValueCache } from "@oh-my-pi/pi-coding-agent/config/resolve-config-value";
import { getMCPConfigPath, getProjectDir, removeWithRetries, setAgentDir, setProjectDir } from "@oh-my-pi/pi-utils";

const originalProjectDir = getProjectDir();

async function writeConfig(
	scope: "user" | "project",
	dir: string,
	servers: Record<string, MCPServerConfig>,
): Promise<void> {
	await Bun.write(getMCPConfigPath(scope, dir), `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`);
}

/**
 * The slice of the runtime `/mcp resources` touches: the cwd it reads configs
 * from, and the auth storage `withPreparedMcpConnection` wires in before
 * resolving. The rest of the interface is not on this path.
 */
function createRuntime(cwd: string, output: (text: string) => void): SlashCommandRuntime {
	return {
		cwd,
		session: { modelRegistry: { authStorage: {} } },
		output,
		refreshCommands: () => {},
		reloadPlugins: () => {},
	} as unknown as SlashCommandRuntime;
}

describe("/mcp resources on the ACP path", () => {
	let projectDir = "";
	let agentDir = "";
	let projectSentinel = "";
	let testVerbSentinel = "";
	let userSentinel = "";

	beforeEach(async () => {
		projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "uw-slashscope-project-"));
		agentDir = await fs.mkdtemp(path.join(os.tmpdir(), "uw-slashscope-agent-"));
		setProjectDir(projectDir);
		setAgentDir(agentDir);
		clearConfigValueCache();
		projectSentinel = path.join(projectDir, "slash-project-ran");
		testVerbSentinel = path.join(projectDir, "slash-testverb-ran");
		userSentinel = path.join(projectDir, "slash-user-ran");
	});

	afterEach(async () => {
		clearConfigValueCache();
		setProjectDir(originalProjectDir);
		await removeWithRetries(projectDir);
		await removeWithRetries(agentDir);
	});

	test("does not run a command named by a project-scope server", async () => {
		await writeConfig("project", projectDir, {
			hostile: { type: "stdio", command: "true", env: { API_KEY: `!touch ${projectSentinel}` } },
		});

		await handleMcpAcp(
			{ name: "mcp", args: "resources", text: "/mcp resources" },
			createRuntime(projectDir, () => {}),
		);

		expect(await Bun.file(projectSentinel).exists()).toBe(false);
	});

	test("/mcp test does not run a command named by a project-scope server", async () => {
		// A second call site with its own sentinel. Without this row, reverting the
		// `/mcp test` call site would change nothing observable, and a fix at the
		// `resources` site would be free to leave it open.
		await writeConfig("project", projectDir, {
			hostile: { type: "stdio", command: "true", env: { API_KEY: `!touch ${testVerbSentinel}` } },
		});

		await handleMcpAcp(
			{ name: "mcp", args: "test hostile", text: "/mcp test hostile" },
			createRuntime(projectDir, () => {}),
		);

		expect(await Bun.file(testVerbSentinel).exists()).toBe(false);
	});

	test("a user-scope `!command` still runs, so the rows above are a decision", async () => {
		await writeConfig("user", agentDir, {
			mine: { type: "stdio", command: "true", env: { API_KEY: `!touch ${userSentinel}` } },
		});

		await handleMcpAcp(
			{ name: "mcp", args: "resources", text: "/mcp resources" },
			createRuntime(projectDir, () => {}),
		);

		// Personal config is the user's own machine, not a repository someone else
		// controls. Were this to stop running, the rows above would be green for the
		// wrong reason rather than because the policy held.
		expect(await Bun.file(userSentinel).exists()).toBe(true);
	});
});
