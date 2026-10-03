import type { SourceMeta } from "../../../capability/types";
import type { CustomTool } from "../../../extensibility/custom-tools/types";
import { type LoadMCPConfigsOptions, loadAllMCPConfigs } from "../../../mcp/config";
import type { MCPLoadResult } from "../../../mcp/manager";
import type { McpConnectionStatusEvent } from "../../../mcp/startup-events";
import type { MCPServerConfig, McpCatalogRefreshReason } from "../../../mcp/types";

/** Manager methods `/extensions` needs to match `/mcp enable` / `/mcp disable`. */
export interface MCPToggleManager {
	getConnectionStatus(name: string): "connected" | "connecting" | "disconnected";
	getTools(): CustomTool[];
	disconnectServer(name: string): Promise<void>;
	connectServers(
		configs: Record<string, MCPServerConfig>,
		sources: Record<string, SourceMeta>,
		onStatus?: (event: McpConnectionStatusEvent) => void,
	): Promise<Pick<MCPLoadResult, "errors"> | MCPLoadResult>;
}

/**
 * The session refresh this panel drives.
 *
 * `reason` is REQUIRED here even though `AgentSession.refreshMCPTools` declares
 * it optional. The optionality exists for callers that genuinely cannot state
 * their intent, and an absent reason is handled as `push` — which activates
 * nothing that was not already active. That default is the right reading of
 * silence, and the wrong thing for the one caller here: every refresh in this
 * function is immediately preceded by a connect or a disconnect, so the intent
 * is known and stating it is cheaper than guessing it.
 *
 * Making it required is not a compatibility hazard. The single implementor is the
 * host's own session (`createExtensionDashboardRuntime`), and a function whose
 * second parameter is optional still satisfies this signature.
 */
export interface MCPToggleSession {
	refreshMCPTools(tools: CustomTool[], reason: McpCatalogRefreshReason): Promise<void> | void;
}

export interface ApplyMcpToggleRuntimeOptions {
	name: string;
	enabled: boolean;
	cwd: string;
	manager?: MCPToggleManager;
	session?: MCPToggleSession;
	/** Same discovery filters as session startup (`sdk.ts` / `/mcp reload`). */
	discovery?: LoadMCPConfigsOptions;
	/**
	 * DO NOT DELETE AS AN UNUSED PARAMETER. No production caller passes it — that
	 * is the shape of a registration seam BEFORE anyone uses it, which is what
	 * this one is. AGENTS.md's own criterion: core-owned WITH a registration seam
	 * is already decomposed; core-owned with no seam is the finding. Deleting it
	 * removes the one thing the programme's single test asks for — an extension
	 * written outside this repo supplying its own loader without a core change.
	 *
	 * It is not dead code. Three tests pass it, and one of them
	 * (`"enable passes startup discovery filters into config load"`) uses it as the
	 * ONLY way to observe that `discovery` reaches the loader without touching the
	 * filesystem. Those are legitimate users of a testability seam, not tests
	 * happening to depend on a parameter nobody uses.
	 *
	 * The default is the real behaviour: `loadAllMCPConfigs` already applies
	 * `applyScopePolicy` per source level, so scope is enforced on this path and a
	 * caller must not re-apply it.
	 */
	loadConfigs?: typeof loadAllMCPConfigs;
	onStatus?: (event: McpConnectionStatusEvent) => void;
}

/**
 * After `/extensions` persists an MCP enable/disable, apply the same live
 * connect/disconnect + session tool refresh that `/mcp enable` / `/mcp disable`
 * already do. Config persistence stays in `setMcpServerEnabled`.
 *
 * Every branch states the reason, and the reason is never a judgement call: it is
 * the line above. `MCPManager` already declares `"connect"` / `"disconnect"` on
 * its own emits, so a refresh that follows one of them must not arrive as
 * something weaker. `"connect"` is the only value that activates the arriving
 * catalog; the rest keep only what was already active.
 *
 * THE `!config` BRANCH — reachable, and it used to be silent. This function
 * re-derives through the `enableProjectConfig` gate, but the panel's LIST comes
 * from discovery, which does not apply that gate. The two disagree, so the
 * branch fires for a server the user can plainly see in the panel; it used to
 * refresh and return, reporting success for a connect that never happened. It
 * now throws, and the reason is spelled out at the branch.
 *
 * The remaining coupling is worth knowing before anyone moves that gate:
 * `/mcp` no longer re-derives config at all — `MCPCommandController` reads
 * `mcpManager.getSource(name)` — so the two paths share only the same setting,
 * not a mechanism. Changing the gate has to move both in one commit.
 */
export async function applyMcpToggleRuntime(options: ApplyMcpToggleRuntimeOptions): Promise<void> {
	const { name, enabled, cwd, manager, session, discovery, loadConfigs = loadAllMCPConfigs, onStatus } = options;
	if (!manager) return;

	if (!enabled) {
		await manager.disconnectServer(name);
		// The server was just disconnected, so this retracts what it offered.
		await session?.refreshMCPTools(manager.getTools(), "disconnect");
		return;
	}

	if (manager.getConnectionStatus(name) !== "disconnected") {
		// Already connected, so this branch connects nothing and no catalog arrived.
		// Saying `connect` would activate tools the user never connected.
		await session?.refreshMCPTools(manager.getTools(), "push");
		return;
	}

	const { configs, sources } = await loadConfigs(cwd, discovery);
	const config = configs[name];
	if (!config) {
		// Refresh first: the catalog genuinely did not change, so the session should
		// still see that. Then REPORT, because returning here is what made this look
		// like a connect that happened.
		await session?.refreshMCPTools(manager.getTools(), "push");
		// This branch IS reachable, and measuring it is what proved it. Discovery
		// (`discovery/mcp-json.ts`) lists project-scope `.mcp.json` servers without
		// consulting `mcp.enableProjectConfig`, so the panel shows a server that the
		// gated loader then refuses to return:
		//
		//   loadAllMCPConfigs(cwd, { enableProjectConfig: false })  →  projonly absent
		//   applyMcpToggleRuntime("projonly", enabled: true)          →  hits this branch
		//
		// `MCPCommandController.#connectEnabledMCPServer` fixed exactly this for
		// itself, and named the knob in the message. Both dashboard call sites already
		// wrap `applyMcpToggle` in try/catch, so throwing reports it without inventing
		// a new error surface.
		throw new Error(
			`Cannot enable "${name}": no server configuration is available for it. ` +
				`If it is declared in a project \`.mcp.json\`, \`mcp.enableProjectConfig\` is what keeps it out.`,
		);
	}
	const source = sources[name];
	await manager.connectServers({ [name]: config }, source ? { [name]: source } : {}, onStatus);
	// The user connected this server through the panel. Its tools have to activate,
	// which is the whole difference between `connect` and every other reason.
	await session?.refreshMCPTools(manager.getTools(), "connect");
}
