/**
 * A connected MCP server must not be able to widen or narrow its own reach.
 *
 * Trust in an MCP server is granted to the CONNECTION, not to its catalog, and
 * the catalog can move afterwards: `notifications/tools/list_changed` lets a
 * server add or retract a tool at any moment. Two halves follow from that, and
 * this file covers both through a real stdio server that really sends the
 * notification — not by calling the refresh path directly.
 *
 * The halves are deliberately separate, because either alone is half a fix:
 *   - A newly pushed tool is REGISTERED but not ACTIVE (see `session-tools.ts`,
 *     `#applyMCPToolRefresh`). Registration alone would still grant the call.
 *   - A WITHDRAWN tool leaves a tombstone that refuses with a reason, rather
 *     than vanishing into the dispatch-miss path (`manager.ts`,
 *     `#replaceServerTools`).
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { MCPManager } from "@oh-my-pi/pi-coding-agent/mcp/manager";
import { isWithdrawnMCPTool, TOOL_NO_LONGER_OFFERED } from "@oh-my-pi/pi-coding-agent/mcp/tool-bridge";
import type { MCPStdioServerConfig } from "@oh-my-pi/pi-coding-agent/mcp/types";
import { removeSyncWithRetries } from "@oh-my-pi/pi-utils";
import { ALPHA_TOOL, BETA_TOOL } from "./fixtures/rug-pull-mcp";

const FIXTURE_PATH = path.join(import.meta.dir, "fixtures", "rug-pull-mcp.ts");
const SERVER = "rugpull";

/** Sanitized names minted by `createMCPToolName`, e.g. `mcp__rugpull_alpha`. */
const ALPHA = `mcp__rugpull_${ALPHA_TOOL}`;
const BETA = `mcp__rugpull_${BETA_TOOL}`;

function waitUntil(predicate: () => boolean, label: string, timeoutMs = 10_000): Promise<void> {
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

describe("a server that changes its own tool catalog mid-session", () => {
	let workDir: string;
	let addGate: string;
	let removeGate: string;
	let manager: MCPManager;

	function fixtureConfig(): MCPStdioServerConfig {
		return {
			type: "stdio",
			command: process.execPath,
			args: [FIXTURE_PATH],
			env: { RUG_PULL_ADD_UNTIL: addGate, RUG_PULL_REMOVE_UNTIL: removeGate },
		};
	}

	beforeEach(() => {
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-mcp-rugpull-"));
		addGate = path.join(workDir, "add");
		removeGate = path.join(workDir, "remove");
		manager = new MCPManager(workDir);
	});

	afterEach(async () => {
		await manager.disconnectAll();
		removeSyncWithRetries(workDir);
	});

	async function connect(): Promise<void> {
		await manager.connectServers({ [SERVER]: fixtureConfig() }, {});
		await waitUntil(() => manager.getTools().some(t => t.name === ALPHA), `initial ${ALPHA}`);
	}

	it("a pushed tool joins the catalog without displacing the one already there", async () => {
		await connect();
		expect(manager.getTools().map(t => t.name)).toEqual([ALPHA]);

		fs.writeFileSync(addGate, "go");
		await waitUntil(() => manager.getTools().some(t => t.name === BETA), `${BETA} to arrive`);

		// Both are present. Which one the model may CALL is decided by the
		// activation gate in session-tools, not here — this asserts only that the
		// arriving catalog is not silently dropped, which would look identical to a
		// refresh that never fired.
		const names = manager
			.getTools()
			.map(t => t.name)
			.sort();
		expect(names).toEqual([ALPHA, BETA].sort());
	}, 20_000);

	it("a withdrawn tool refuses with what happened, not an unknown-tool miss", async () => {
		await connect();

		fs.writeFileSync(removeGate, "go");
		await waitUntil(
			() => manager.getTools().some(t => t.name === ALPHA && isWithdrawnMCPTool(t)),
			`${ALPHA} to be withdrawn`,
		);

		// The user is still running a turn whose model called this tool before the
		// server moved. What they see has to say the tool was withdrawn — an
		// "unknown tool" error reads as the model inventing a name, which sends them
		// looking in exactly the wrong place.
		const tombstone = manager.getTools().find(t => t.name === ALPHA);
		expect(tombstone).toBeDefined();
		expect(isWithdrawnMCPTool(tombstone!)).toBe(true);

		const result = await tombstone!.execute("call-1", {}, undefined, {} as never);
		expect(result.isError).toBe(true);
		const text = result.content.map(c => (c.type === "text" ? c.text : "")).join("");
		expect(text).toContain(TOOL_NO_LONGER_OFFERED);
		expect(text).toContain(ALPHA);
		// The refusal must not read as a server-side failure the user should retry:
		// nothing about the call is wrong except that the tool is gone.
		expect(text).toContain("was not run");
	}, 20_000);

	it("a withdrawn tool stays visible in the catalog, so history still resolves it", async () => {
		await connect();
		fs.writeFileSync(removeGate, "go");
		await waitUntil(
			() => manager.getTools().some(t => t.name === ALPHA && isWithdrawnMCPTool(t)),
			`${ALPHA} to be withdrawn`,
		);

		// Reconstructing a turn that called this tool must still find the tool, or
		// the user's own history renders as a broken call. The tombstone is what
		// makes that possible: it carries the label, description and schema the old
		// entry was rendered from.
		const tombstone = manager.getTools().find(t => t.name === ALPHA);
		expect(tombstone).toBeDefined();
		expect(tombstone!.description).not.toBe("");
		expect(tombstone!.parameters).toBeDefined();
		expect(tombstone!.label).toBe(`${SERVER}/${ALPHA_TOOL}`);
	}, 20_000);

	it("re-refreshing a server that already withdrew a tool mints one tombstone, not one per refresh", async () => {
		await connect();
		fs.writeFileSync(removeGate, "go");
		await waitUntil(
			() => manager.getTools().some(t => t.name === ALPHA && isWithdrawnMCPTool(t)),
			`${ALPHA} to be withdrawn`,
		);

		// Two further refreshes with the tool still absent. Without the tombstone
		// exclusion in `#replaceServerTools`, each pass would mint a fresh tombstone
		// from the previous one — so the catalog would grow by one entry per refresh
		// for the rest of the session, for a tool the server withdrew once.
		await manager.refreshServerTools(SERVER);
		await manager.refreshServerTools(SERVER);

		const tombstones = manager.getTools().filter(t => t.name === ALPHA && isWithdrawnMCPTool(t));
		expect(tombstones).toHaveLength(1);
		// And the catalog does not grow: `alpha` is the only entry, and it stays the
		// only entry however many refreshes follow.
		const sizeAfterWithdrawal = manager.getTools().length;
		await manager.refreshServerTools(SERVER);
		expect(manager.getTools()).toHaveLength(sizeAfterWithdrawal);
		expect(manager.getTools().map(t => t.name)).toEqual([ALPHA]);
	}, 20_000);

	it("a withdrawn tool keeps the most restrictive approval tier", async () => {
		await connect();
		fs.writeFileSync(removeGate, "go");
		await waitUntil(
			() => manager.getTools().some(t => t.name === ALPHA && isWithdrawnMCPTool(t)),
			`${ALPHA} to be withdrawn`,
		);

		// A live MCP tool declares `write`. The tombstone declares `exec`, so
		// anything that ever routes around `execute` still meets the strictest gate.
		// The assertion is the negative: it must NOT inherit the live tool's tier.
		const tombstone = manager.getTools().find(t => t.name === ALPHA)!;
		expect(tombstone.approval).toBe("exec");
	}, 20_000);
});
