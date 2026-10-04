import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { MCPManager } from "@oh-my-pi/pi-coding-agent/mcp/manager";
import type { MCPStdioServerConfig, McpCatalogRefreshReason } from "@oh-my-pi/pi-coding-agent/mcp/types";
import { removeSyncWithRetries } from "@oh-my-pi/pi-utils";

import { MANY_TOOL_COUNT, manyToolName } from "./fixtures/many-tools-mcp";

const FIXTURE_PATH = path.join(import.meta.dir, "fixtures", "many-tools-mcp.ts");
const SERVER = "ownership";

function fixtureConfig(): MCPStdioServerConfig {
	return { type: "stdio", command: process.execPath, args: [FIXTURE_PATH] };
}

function waitUntil(predicate: () => boolean, label: string, timeoutMs = 20_000): Promise<void> {
	const { promise, resolve, reject } = Promise.withResolvers<void>();
	const start = Date.now();
	const tick = () => {
		if (predicate()) {
			resolve();
			return;
		}
		if (Date.now() - start > timeoutMs) {
			reject(new Error(`timed out waiting for ${label}`));
			return;
		}
		setTimeout(tick, 15);
	};
	tick();
	return promise;
}

/**
 * The session decides what an arriving tool does from `reason` alone — see
 * `session-tools.ts`: "The manager DECLARES why the catalog changed, because the
 * reason cannot be recovered from the argument". A connect, a
 * `notifications/tools/list_changed` push and a disconnect all arrive as the
 * same array of tools, so the only thing separating them is this value.
 *
 * That makes it load-bearing in a way the emitted tool list is not, and it is
 * therefore the contract worth pinning: every emission carries a reason, and
 * `"connect"` is spent only where a server was actually connected.
 */
describe("MCP catalog refresh reason declarations", () => {
	let workDir: string;
	let manager: MCPManager;
	let reasons: McpCatalogRefreshReason[];
	let emissions: number;

	beforeEach(() => {
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-mcp-reason-"));
		manager = new MCPManager(workDir);
		reasons = [];
		emissions = 0;
	});

	afterEach(async () => {
		await manager.disconnectAll();
		removeSyncWithRetries(workDir);
	});

	/** Records every reason the manager declares, so a wrong value is visible. */
	function recordEmissions(): void {
		manager.setOnToolsChanged((_tools, reason) => {
			emissions++;
			reasons.push(reason);
		});
	}

	it('declares "connect" when a server connects, and "disconnect" when it leaves', async () => {
		recordEmissions();

		await manager.connectServers({ [SERVER]: fixtureConfig() }, {});
		await waitUntil(() => emissions >= 1, "the connect emission");

		expect(reasons[0]).toBe("connect");
		expect(manager.getTools()).toHaveLength(MANY_TOOL_COUNT);
		expect(manager.getTools().map(t => t.name)).toContain(`mcp__ownership_${manyToolName(0)}`);

		const emissionsBeforeDisconnect = emissions;
		await manager.disconnectServer(SERVER);
		await waitUntil(() => emissions > emissionsBeforeDisconnect, "the disconnect emission");

		expect(reasons.at(-1)).toBe("disconnect");
	}, 30_000);

	it('never declares "connect" for a catalog the server pushed on its own', async () => {
		await manager.connectServers({ [SERVER]: fixtureConfig() }, {});
		recordEmissions();

		// The trust boundary. A trusted server widening its own reach after the
		// user approved the connection is NOT the user connecting a server, so it
		// must not spend the one value that activates an arriving catalog. If this
		// ever passes with `"connect"` the gate in the session has been bypassed.
		await manager.refreshServerTools(SERVER, "push");
		await waitUntil(() => emissions >= 1, "the push emission");

		expect(reasons).not.toContain("connect");
		expect(reasons.at(-1)).toBe("push");
	}, 30_000);

	it('re-declares "connect" for a reconnect, which is the user\'s own act', async () => {
		recordEmissions();

		await manager.connectServers({ [SERVER]: fixtureConfig() }, {});
		await waitUntil(() => emissions >= 1, "the connect emission");

		const result = await manager.reconnectServer(SERVER, { manual: true });
		expect(result).toBeTruthy();
		// Wait for a SECOND emission of any reason, then judge it — waiting for the
		// expected reason directly would turn a wrong value into a bare timeout.
		await waitUntil(() => emissions >= 2, "the reconnect emission");

		// A manual reconnect is the user re-asking for that server's tools, so it
		// declares `connect` again rather than inheriting the previous emission.
		expect(reasons.at(-1)).toBe("connect");
	}, 30_000);
});
