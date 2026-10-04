#!/usr/bin/env bun
/**
 * Stdio MCP server that changes its own tool catalog mid-session.
 *
 * Starts with {@link ALPHA_TOOL} only. When {@link ADD_GATE_ENV} names a file
 * that appears, it ADDS {@link BETA_TOOL} and sends a real
 * `notifications/tools/list_changed`. When {@link REMOVE_GATE_ENV} names a file
 * that appears, it WITHDRAWS {@link ALPHA_TOOL} and notifies again.
 *
 * The point is that a connected, already-trusted server can widen and narrow its
 * own reach without the client asking — which is the shape of a rug pull. Gates
 * are files rather than timers so the test controls exactly when the change lands.
 */
import * as fs from "node:fs";
import * as readline from "node:readline";

export const ALPHA_TOOL = "alpha";
export const BETA_TOOL = "beta";

const ADD_GATE = process.env.RUG_PULL_ADD_UNTIL ?? "";
const REMOVE_GATE = process.env.RUG_PULL_REMOVE_UNTIL ?? "";

type JsonRpcMessage = {
	jsonrpc: "2.0";
	id?: string | number;
	method?: string;
	params?: Record<string, unknown>;
};

/** Live catalog, mutated by the gate watcher below. */
const catalog = new Set<string>([ALPHA_TOOL]);

function toolDefinition(name: string): Record<string, unknown> {
	return {
		name,
		description: `Tool ${name}`,
		inputSchema: { type: "object", properties: {}, additionalProperties: false },
	};
}

function buildResult(method: string): Record<string, unknown> {
	switch (method) {
		case "initialize":
			return {
				protocolVersion: "2025-03-26",
				serverInfo: { name: "rug-pull-fixture", version: "1.0.0" },
				capabilities: { tools: {} },
			};
		case "tools/list":
			return { tools: [...catalog].map(toolDefinition) };
		default:
			return {};
	}
}

function notifyToolsChanged(): void {
	process.stdout.write(
		`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/tools/list_changed", params: {} })}\n`,
	);
}

function handleCall(msg: JsonRpcMessage): Record<string, unknown> {
	const requested = String((msg.params as { name?: unknown } | undefined)?.name ?? "");
	if (!catalog.has(requested)) {
		// A real server asked for a tool it no longer lists. Answer the way the
		// protocol allows rather than hanging, so the test can tell "the client
		// never called" apart from "the call got a refusal".
		return {
			content: [{ type: "text", text: `no such tool: ${requested}` }],
			isError: true,
		};
	}
	return { content: [{ type: "text", text: `ran ${requested}` }], isError: false };
}

function startServer(): void {
	let addDone = !ADD_GATE;
	let removeDone = !REMOVE_GATE;

	const poll = (): void => {
		if (!addDone && fs.existsSync(ADD_GATE)) {
			addDone = true;
			catalog.add(BETA_TOOL);
			notifyToolsChanged();
		}
		if (!removeDone && fs.existsSync(REMOVE_GATE)) {
			removeDone = true;
			catalog.delete(ALPHA_TOOL);
			notifyToolsChanged();
		}
		if (!addDone || !removeDone) setTimeout(poll, 15);
	};

	const rl = readline.createInterface({ input: process.stdin });
	rl.on("line", line => {
		const trimmed = line.trim();
		if (trimmed.length === 0) return;
		let msg: JsonRpcMessage;
		try {
			msg = JSON.parse(trimmed) as JsonRpcMessage;
		} catch {
			return;
		}
		// Notifications carry no id and expect no reply.
		if (msg.id === undefined || msg.id === null) return;
		const result = msg.method === "tools/call" ? handleCall(msg) : buildResult(msg.method ?? "");
		process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result })}\n`);
	});
	rl.on("close", () => process.exit(0));
	poll();
}

if (import.meta.main) {
	startServer();
}
