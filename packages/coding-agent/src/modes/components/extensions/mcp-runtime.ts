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
		// No config to connect from, so nothing was connected and nothing arrived.
		await session?.refreshMCPTools(manager.getTools(), "push");
		return;
	}
	const source = sources[name];
	await manager.connectServers({ [name]: config }, source ? { [name]: source } : {}, onStatus);
	// The user connected this server through the panel. Its tools have to activate,
	// which is the whole difference between `connect` and every other reason.
	await session?.refreshMCPTools(manager.getTools(), "connect");
}
