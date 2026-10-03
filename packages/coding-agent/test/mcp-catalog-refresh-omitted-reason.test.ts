/**
 * What an OMITTED reason means, on a real session.
 *
 * `AgentSession.refreshMCPTools` takes `reason?`, and four production call sites
 * omit it entirely:
 *
 *   sdk.ts:2434                    deferred MCP discovery result
 *   sdk.ts:5284                    project-config enable/disable listener
 *   modes/print-mode.ts:237        initial startup refresh
 *   agent-session.ts:2501          browser MCP filter reconcile
 *
 * Every other test in this area passes a reason explicitly, so this file covers
 * the one shape production actually uses and the suite never exercised. The
 * optional marker is not decoration: `session-tools.ts` reads the reason at a
 * single line, `activateArrivingCatalog = reason === "connect"`, and an absent
 * reason takes the false branch. That is deliberate — the docblock states that a
 * caller which cannot state its intent must not widen anything — and it is the
 * behaviour all four of those sites depend on.
 *
 * The control assertion is the reason this file exists rather than one more
 * "tool is not active" check. A "not enabled" result is what a broken harness,
 * a bad fixture or a missing registration would ALSO produce, so on its own it
 * proves nothing. The last test replays the identical call with `"connect"` and
 * shows the tool becoming active, which is what makes the two earlier results
 * attributable to the omitted reason rather than to the setup.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { AuthStorage } from "@oh-my-pi/pi-ai";
import type { CustomTool } from "@oh-my-pi/pi-coding-agent/extensibility/custom-tools/types";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { createAgentSession } from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { removeSyncWithRetries, TempDir } from "@oh-my-pi/pi-utils";

/** Same shape as `mcp-tool-activation-session.test.ts`, which needs the same thing. */
function catalogTool(name: string, serverName: string): CustomTool {
	return {
		name,
		label: `${serverName}/tool`,
		description: `Tool from ${serverName}`,
		parameters: type({ q: "string" }),
		strict: true,
		mcpServerName: serverName,
		mcpToolName: "tool",
		async execute() {
			return { content: [{ type: "text", text: `${name} executed` }] };
		},
	} as CustomTool;
}

describe("refreshing the MCP catalog without stating a reason", () => {
	let sharedTempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@ultraworkers-omitted-reason-");
		authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(async () => {
		authStorage.close();
		sharedTempDir.removeSync();
	});

	/** Creates a session the way the other activation tests do, on a throwaway cwd. */
	async function withSession(
		run: (session: Awaited<ReturnType<typeof createAgentSession>>["session"]) => Promise<void>,
	) {
		const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "uw-omitted-reason-"));
		fs.writeFileSync(path.join(workDir, "omp.json"), JSON.stringify({ mcpServers: {} }));
		const { session } = await createAgentSession({
			cwd: workDir,
			agentDir: workDir,
			modelRegistry,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.startupTimeoutMs": 15_000 }),
			model: getBundledModel("openai", "gpt-4o-mini"),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableLsp: false,
			skipPythonPreflight: true,
			enableMCP: false,
		});
		try {
			await run(session);
		} finally {
			await session.dispose();
			removeSyncWithRetries(workDir);
		}
	}

	it("registers a tool that arrives with no reason stated, and does not activate it", async () => {
		await withSession(async session => {
			const connected = catalogTool("mcp__one_alpha", "one");
			await session.refreshMCPTools([connected], "connect");
			const activeBefore = session.getEnabledToolNames();
			expect(activeBefore).toContain("mcp__one_alpha");

			// No second argument. This is the call shape sdk.ts:2434, sdk.ts:5284,
			// modes/print-mode.ts:237 and agent-session.ts:2501 all make.
			const arrived = catalogTool("mcp__two_beta", "two");
			await session.refreshMCPTools([connected, arrived]);

			// Registered and visible — the refresh is not a no-op, it really ran.
			expect(session.getAllToolNames()).toContain("mcp__two_beta");
			// But not callable, and the connected set is untouched.
			expect(session.getEnabledToolNames()).not.toContain("mcp__two_beta");
			expect(session.getEnabledToolNames()).toEqual(activeBefore);
		});
	}, 40_000);

	/**
	 * The control. Without it the test above is unfalsifiable: a session that
	 * activated nothing at all would satisfy it, and so would a fixture whose
	 * tool never registered. Replaying the same catalog under `"connect"` shows
	 * the machinery is live and the difference is the omitted reason alone.
	 */
	it('activates the same tool when the same call is given "connect"', async () => {
		await withSession(async session => {
			const connected = catalogTool("mcp__one_alpha", "one");
			await session.refreshMCPTools([connected], "connect");
			const activeBefore = session.getEnabledToolNames();

			const arrived = catalogTool("mcp__two_beta", "two");
			await session.refreshMCPTools([connected, arrived], "connect");

			expect(session.getEnabledToolNames()).toContain("mcp__two_beta");
			// The connected set grew by exactly the arrived tool, so the two tests
			// above and here differ in one argument and disagree in one outcome.
			expect(session.getEnabledToolNames().filter(n => n !== "mcp__two_beta")).toEqual(activeBefore);
		});
	}, 40_000);
});
