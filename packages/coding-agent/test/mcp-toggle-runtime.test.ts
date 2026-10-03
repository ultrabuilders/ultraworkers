import { describe, expect, test } from "bun:test";
import type { CustomTool } from "@oh-my-pi/pi-coding-agent/extensibility/custom-tools/types";
import { applyMcpToggleRuntime } from "@oh-my-pi/pi-coding-agent/modes/components/extensions/mcp-runtime";
import type { MCPToggleManager } from "@oh-my-pi/pi-coding-agent/modes/components/extensions/mcp-runtime";
import type { McpCatalogRefreshReason } from "@oh-my-pi/pi-coding-agent/mcp/types";

function stubCustomTool(name: string): CustomTool {
	return {
		name,
		label: name,
		description: name,
		parameters: { type: "object" },
		async execute() {
			return { content: [{ type: "text", text: "" }] };
		},
	};
}

describe("applyMcpToggleRuntime", () => {
	test("disable disconnects the live manager and refreshes session tools", async () => {
		const disconnected: string[] = [];
		const refreshed: CustomTool[][] = [];
		const tools = [stubCustomTool("other_tool")];
		await applyMcpToggleRuntime({
			name: "github",
			enabled: false,
			cwd: "/tmp",
			manager: {
				getConnectionStatus: () => "connected",
				getTools: () => tools,
				disconnectServer: async name => {
					disconnected.push(name);
				},
				connectServers: async () => {
					throw new Error("disable must not reconnect");
				},
			},
			session: {
				refreshMCPTools: next => {
					refreshed.push(next);
				},
			},
		});
		expect(disconnected).toEqual(["github"]);
		expect(refreshed).toEqual([tools]);
	});

	test("enable reconnects a disconnected server then refreshes session tools", async () => {
		const connected: Array<Record<string, { command: string }>> = [];
		const refreshed: CustomTool[][] = [];
		const tools = [stubCustomTool("github_search")];
		await applyMcpToggleRuntime({
			name: "github",
			enabled: true,
			cwd: "/tmp/project",
			loadConfigs: async () => ({
				configs: { github: { command: "github-mcp-server" } },
				sources: {},
				exaApiKeys: [],
			}),
			manager: {
				getConnectionStatus: () => "disconnected",
				getTools: () => tools,
				disconnectServer: async () => {
					throw new Error("enable must not disconnect");
				},
				connectServers: async configs => {
					connected.push(configs as Record<string, { command: string }>);
					return { errors: new Map() };
				},
			},
			session: {
				refreshMCPTools: next => {
					refreshed.push(next);
				},
			},
		});
		expect(connected).toEqual([{ github: { command: "github-mcp-server" } }]);
		expect(refreshed).toEqual([tools]);
	});

	test("enable passes startup discovery filters into config load", async () => {
		const loads: Array<{ cwd: string; options: unknown }> = [];
		const connected: string[] = [];
		await applyMcpToggleRuntime({
			name: "project-only",
			enabled: true,
			cwd: "/tmp/project",
			discovery: { enableProjectConfig: false, filterExa: true, filterBrowser: true },
			loadConfigs: async (cwd, options) => {
				loads.push({ cwd, options });
				return { configs: {}, sources: {}, exaApiKeys: [] };
			},
			manager: {
				getConnectionStatus: () => "disconnected",
				getTools: () => [],
				disconnectServer: async () => {
					throw new Error("enable must not disconnect");
				},
				connectServers: async configs => {
					connected.push(...Object.keys(configs));
					return { errors: new Map() };
				},
			},
		});
		expect(loads).toEqual([
			{
				cwd: "/tmp/project",
				options: { enableProjectConfig: false, filterExa: true, filterBrowser: true },
			},
		]);
		expect(connected).toEqual([]);
	});
});

/**
 * `refreshMCPTools` takes a SECOND argument: `McpCatalogRefreshReason`, the
 * declaration of WHY the catalog changed. It cannot be recovered from the tool
 * array — a connect, a `tools/list_changed` push and a disconnect all deliver
 * the same array — and only `"connect"` activates the arriving catalog.
 *
 * The three tests above cannot see any of that. Their stubs are one-argument
 * lambdas, which satisfy a one-argument interface, so they pass unchanged
 * against an implementation that states nothing at all. Asserting the reason is
 * what the interface has to widen before; until it does, the assertion cannot be
 * written — a one-argument lambda cannot receive an argument that is not passed.
 */
describe("applyMcpToggleRuntime declares why the catalog changed", () => {
	/**
	 * A manager that records what it was asked to do, so each reason can be
	 * compared against the action it claims rather than against a fixed string.
	 */
	function managerStub(status: "connected" | "disconnected", acted: string[]): MCPToggleManager {
		return {
			getConnectionStatus: () => status,
			getTools: () => [],
			disconnectServer: async name => {
				acted.push(`disconnect:${name}`);
			},
			connectServers: async configs => {
				acted.push(`connect:${Object.keys(configs).join(",")}`);
				return { errors: new Map() };
			},
		};
	}

	const githubConfig = {
		configs: { github: { command: "github-mcp-server" } },
		sources: {},
		exaApiKeys: [],
	};

	test("disabling a server states `disconnect`, naming the retraction it just performed", async () => {
		const acted: string[] = [];
		const reasons: (McpCatalogRefreshReason | undefined)[] = [];
		await applyMcpToggleRuntime({
			name: "github",
			enabled: false,
			cwd: "/tmp",
			manager: managerStub("connected", acted),
			session: {
				refreshMCPTools: (_next, reason) => {
					reasons.push(reason);
				},
			},
		});
		// The pairing is the assertion. A hard-coded "push" fails here for the same
		// input that the third test proves correct for a different action.
		expect(acted).toEqual(["disconnect:github"]);
		expect(reasons).toEqual(["disconnect"]);
	});

	test("connecting a server states `connect`, so its arriving catalog activates", async () => {
		const acted: string[] = [];
		const reasons: (McpCatalogRefreshReason | undefined)[] = [];
		await applyMcpToggleRuntime({
			name: "github",
			enabled: true,
			cwd: "/tmp/project",
			loadConfigs: async () => githubConfig,
			manager: managerStub("disconnected", acted),
			session: {
				refreshMCPTools: (_next, reason) => {
					reasons.push(reason);
				},
			},
		});
		expect(acted).toEqual(["connect:github"]);
		expect(reasons).toEqual(["connect"]);
	});

	// The control, and the reason none of the three above could be satisfied by one
	// hard-coded string. Enabling an ALREADY-connected server performs no connect,
	// so no catalog arrived; claiming `connect` here would activate tools the user
	// never connected, which is precisely the trust boundary the parameter exists
	// to hold.
	test("enabling an already-connected server changes no catalog and states `push`", async () => {
		const acted: string[] = [];
		const reasons: (McpCatalogRefreshReason | undefined)[] = [];
		await applyMcpToggleRuntime({
			name: "github",
			enabled: true,
			cwd: "/tmp/project",
			loadConfigs: async () => githubConfig,
			manager: managerStub("connected", acted),
			session: {
				refreshMCPTools: (_next, reason) => {
					reasons.push(reason);
				},
			},
		});
		expect(acted).toEqual([]);
		expect(reasons).toEqual(["push"]);
	});
});
