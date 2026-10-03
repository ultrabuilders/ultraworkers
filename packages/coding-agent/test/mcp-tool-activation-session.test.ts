/**
 * The activation half of the rug-pull fix, on a real session.
 *
 * `mcp-tool-activation-gate.test.ts` covers the manager half: a withdrawn tool
 * refuses with a reason. This file covers the half that actually DENIES the
 * call — a tool the server pushes mid-session is registered and visible, but
 * does not become active, so the model is never handed the ability to call it.
 *
 * Both halves are needed. A tombstone alone stops a retraction; only this stops
 * an expansion. Trust in an MCP server is granted to the connection, not to its
 * catalog, and `notifications/tools/list_changed` lets the catalog move.
 *
 * Assertions are on `getEnabledToolNames()` — what the model may actually call —
 * and never on the registry. The registry already contained the new tool before
 * any of this was patched, so a "did the registry get it" assertion passes on the
 * unpatched tree and would be a dead gate.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { AuthStorage } from "@oh-my-pi/pi-ai";
import { type AgentTool } from "@oh-my-pi/pi-agent-core";
import type { CustomTool } from "@oh-my-pi/pi-coding-agent/extensibility/custom-tools/types";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { createAgentSession } from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { removeSyncWithRetries, TempDir } from "@oh-my-pi/pi-utils";
import { ALPHA_TOOL, BETA_TOOL } from "./fixtures/rug-pull-mcp";

const FIXTURE_PATH = path.join(import.meta.dir, "fixtures", "rug-pull-mcp.ts");
const SERVER = "rugpull";
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

const extensionToolParameters = type({});

/**
 * A stand-in for a tool an extension registers over MCP.
 *
 * It only has to be a well-formed `AgentTool` with an `mcp__` name, because that is
 * all `setExtensionMCPTool` looks at before storing it (:690 bails on anything
 * else). Nothing in this file ever calls it — the assertions are about which
 * names the model may reach, not about what the tool does.
 */
function extensionMcpTool(name: string): AgentTool<typeof extensionToolParameters> {
	return {
		name,
		label: name,
		description: `Extension-owned MCP tool ${name}`,
		parameters: extensionToolParameters,
		async execute() {
			return { content: [{ type: "text", text: "ok" }] };
		},
	};
}

/** Copied from `agent-session-tool-rebuild-skip.test.ts`, which needs the same shape. */
function managerMcpTool(name: string, serverName: string, mcpToolName: string, description: string): CustomTool {
	return {
		name,
		label: `${serverName}/${mcpToolName}`,
		description,
		parameters: type({ q: "string" }),
		strict: true,
		mcpServerName: serverName,
		mcpToolName,
		async execute() {
			return { content: [{ type: "text", text: `${name} executed` }] };
		},
	} as CustomTool;
}

describe("a session's active tool set after the server pushes a new tool", () => {
	let sharedTempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@ultraworkers-rugpull-session-");
		authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(async () => {
		authStorage.close();
		sharedTempDir.removeSync();
	});

	let workDir = "";
	let addGate = "";

	beforeEach(() => {
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), "uw-rugpull-session-"));
		addGate = path.join(workDir, "add");
		fs.writeFileSync(path.join(workDir, "omp.json"), JSON.stringify({ mcpServers: {} }));
		fs.mkdirSync(path.join(workDir, ".omp"), { recursive: true });
		fs.writeFileSync(
			path.join(workDir, ".omp", "mcp.json"),
			JSON.stringify({
				mcpServers: {
					[SERVER]: {
						type: "stdio",
						command: process.execPath,
						args: [FIXTURE_PATH],
						env: { RUG_PULL_ADD_UNTIL: addGate, RUG_PULL_REMOVE_UNTIL: path.join(workDir, "remove") },
					},
				},
			}),
		);
	});

	it("registers the pushed tool but does not activate it", async () => {
		const { session } = await createAgentSession({
			cwd: workDir,
			agentDir: workDir,
			modelRegistry,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.enableProjectConfig": true, "mcp.startupTimeoutMs": 15_000 }),
			model: getBundledModel("openai", "gpt-4o-mini"),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableLsp: false,
			skipPythonPreflight: true,
			enableMCP: true,
		});
		try {
			await waitUntil(() => session.getEnabledToolNames().includes(ALPHA), `${ALPHA} to be active`);
			const beforePush = session.getEnabledToolNames();
			expect(beforePush).toContain(ALPHA);

			fs.writeFileSync(addGate, "go");
			// The manager has to have seen the new catalog before the active-set
			// assertion means anything — otherwise this passes on a race.
			await waitUntil(() => session.getAllToolNames().includes(BETA), `${BETA} to be registered`);

			// The contract: registered and visible, NOT active. The user was never
			// asked about this tool, so the model must not be handed the ability to
			// call it — an already-trusted server cannot extend its own reach.
			expect(session.getAllToolNames().includes(BETA)).toBe(true);
			expect(session.getEnabledToolNames()).not.toContain(BETA);
			// And the tool that was already active is untouched: the gate filters the
			// arriving catalog, it does not revoke what the user already allowed.
			expect(session.getEnabledToolNames()).toContain(ALPHA);
			expect(session.getEnabledToolNames()).toEqual(beforePush);
		} finally {
			await session.dispose();
			removeSyncWithRetries(workDir);
		}
	}, 40_000);

	/**
	 * `#applyMCPToolRefresh` reads `previousMcpTools.size === 0` as "first MCP
	 * connection", so the gate's soundness rests on an invariant that lives in
	 * ANOTHER file: `mcp/manager.ts` `#replaceServerTools` leaves a tombstone for
	 * every withdrawn tool, permanently. Because the tombstone keeps the original
	 * `mcp__` name, a registry that has held MCP tools never returns to empty —
	 * which is the only reason a later push is still recognised as a push.
	 *
	 * Nothing else pins that. If the tombstone were ever dropped at the manager
	 * layer, `size === 0` becomes reachable, `isFirstMCPConnection` becomes true,
	 * and a server that already spent its trust gets a tool silently activated —
	 * with no test turning red anywhere. This row makes the dependency visible,
	 * and it is the reason the tombstone must survive: it is not only what a
	 * mid-turn call resolves against, it is what holds the activation gate shut.
	 */
	it("keeps a withdrawn tool in the registry, so a later push is still gated", async () => {
		const { session } = await createAgentSession({
			cwd: workDir,
			agentDir: workDir,
			modelRegistry,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.enableProjectConfig": true, "mcp.startupTimeoutMs": 15_000 }),
			model: getBundledModel("openai", "gpt-4o-mini"),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableLsp: false,
			skipPythonPreflight: true,
			enableMCP: true,
		});
		try {
			await waitUntil(() => session.getEnabledToolNames().includes(ALPHA), `${ALPHA} to be active`);

			// The server withdraws its only tool, then pushes a new one. Both gates
			// are opened together: the fixture's poller consumes them in one pass, so
			// the session sees a catalog that went empty and then did not. Ordering
			// between the two is not what this row is about — what it asserts is the
			// state the withdrawal LEAVES behind.
			fs.writeFileSync(path.join(workDir, "remove"), "go");
			fs.writeFileSync(addGate, "go");
			await waitUntil(() => session.getAllToolNames().includes(BETA), `${BETA} to be registered`);

			// The invariant `#applyMCPToolRefresh`'s discriminator leans on, asserted
			// from the session's side: ALPHA's name is STILL registered even though
			// the server withdrew it. A tombstone, not a deletion.
			//
			// Nothing else pins this. `previousMcpTools.size === 0` stands for "first
			// MCP connection", and it holds only while a withdrawn tool keeps its
			// `mcp__` name — an invariant owned by `mcp/manager.ts`
			// `#replaceServerTools`, in a different file, with no test connecting the
			// two. Drop the tombstone and `size === 0` becomes reachable again,
			// `isFirstMCPConnection` flips to true, and a server that already spent
			// its trust gets a tool silently activated — with nothing red anywhere.
			expect(session.getAllToolNames()).toContain(ALPHA);

			// And the consequence: BETA arrived while the registry was non-empty only
			// because of that tombstone, so it is gated as the push it is — registered
			// and visible, never active.
			expect(session.getEnabledToolNames()).not.toContain(BETA);
		} finally {
			await session.dispose();
			removeSyncWithRetries(workDir);
		}
	}, 40_000);

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

	/**
	 * The declared-intent contract, all three branches in one test so an ablation
	 * means something: dropping any one of them has to turn this red, not merely
	 * change which assertion trips.
	 *
	 *   A tool is active IF AND ONLY IF the user connected the server that offers
	 *   it. `connect` is the user acting, so its catalog activates. `push` is a
	 *   trusted server widening its own reach after approval, so it does not. And
	 *   a refresh never widens the connected set.
	 *
	 * The middle assertion is the one that earns its place. It is a SECOND server
	 * connecting after the first, so `previousMcpTools` is already non-empty — the
	 * exact state the old `previousMcpTools.size === 0` proxy read as "a push".
	 * Before the seam that made a deliberately connected server's tool registered
	 * and never active: invisible to the model and absent from the xd:// route
	 * guidance.
	 */
	it("activates a connected server's catalog and never a pushed tool", async () => {
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
			const one = catalogTool("mcp__one_alpha", "one");
			await session.refreshMCPTools([one], "connect");
			expect(session.getEnabledToolNames()).toContain("mcp__one_alpha");

			// A second server connects later. Its tool must activate: the user
			// connected it, exactly as they connected the first.
			const two = catalogTool("mcp__two_beta", "two");
			await session.refreshMCPTools([one, two], "connect");
			expect(session.getEnabledToolNames()).toContain("mcp__two_beta");
			const connected = session.getEnabledToolNames();

			// That server then pushes a tool nobody connected: registered and
			// visible, NOT active, and the connected set is left exactly as it was.
			const pushed = catalogTool("mcp__two_gamma", "two");
			await session.refreshMCPTools([one, two, pushed], "push");
			expect(session.getAllToolNames()).toContain("mcp__two_gamma");
			expect(session.getEnabledToolNames()).not.toContain("mcp__two_gamma");
			expect(session.getEnabledToolNames()).toEqual(connected);
		} finally {
			await session.dispose();
			removeSyncWithRetries(workDir);
		}
	}, 40_000);

	/**
	 * The extension-owned clause of the same invariant.
	 *
	 * `#applyMCPToolRefresh` rebuilds the whole active set on every refresh
	 * (session-tools.ts:2283), from three sources. Two of them are the manager's:
	 * the carried-over selection, and — on a first connection — the arriving
	 * catalog wholesale. Neither can retain an extension-owned tool, because
	 * `setExtensionMCPTool` deliberately deletes the name from
	 * `#mcpManagerToolNames` (:693) so the manager and the extension cannot both
	 * claim it. The third source, `retainedActiveExtensionToolNames` (:2280), is
	 * therefore the only thing standing between an extension's tool and a refresh
	 * that silently switches it off.
	 *
	 * Both clauses matter, and they are not the same clause. Retention is a
	 * contract: the user turned the tool on, and losing that across an unrelated
	 * server-side catalogue change would be a bug. Widening is security:
	 * retention filters `previousActiveMcpToolNames`, so it can only ever keep a
	 * tool that was already on — it must never be the way a newly registered
	 * extension tool becomes callable.
	 */
	it("keeps an extension-owned MCP tool's selection across a manager refresh, without activating a newly registered one", async () => {
		const { session } = await createAgentSession({
			cwd: workDir,
			agentDir: workDir,
			modelRegistry,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.enableProjectConfig": true, "mcp.startupTimeoutMs": 15_000 }),
			model: getBundledModel("openai", "gpt-4o-mini"),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableLsp: false,
			skipPythonPreflight: true,
			enableMCP: true,
		});
		try {
			await waitUntil(() => session.getEnabledToolNames().includes(ALPHA), `${ALPHA} to be active`);

			// An extension registers two MCP tools it owns. Ownership is not
			// activation, so only the first is ever switched on — by the user,
			// through the same call any other tool is switched on through.
			const owned = extensionMcpTool("mcp__extwidget_do");
			const unregistered = extensionMcpTool("mcp__extwidget_late");
			for (const tool of [owned, unregistered]) {
				session.setToolBuiltIn(tool.name, false);
				session.setExtensionMCPTool(tool.name, tool);
			}

			// Refresh #1. Every refresh clears the `mcp__` names and re-adds them from
			// `#extensionMcpTools` plus the manager's catalogue (session-tools.ts:2246),
			// so this is what puts the extension's tools in the registry at all. Until
			// it has happened they cannot be selected, which is why the user's
			// activation below has to come after it rather than before.
			//
			// The reason is passed EXPLICITLY on every refresh here. It is load-bearing
			// and the default is not a fixed thing: at HEAD an absent reason reads as
			// "not a push" and widens the active set, so a test that left it out would
			// be asserting whatever the default happens to be on the day. "push" says
			// what this row means — the catalogue moved mid-session — and is correct
			// under either reading.
			const catalog = [
				managerMcpTool(ALPHA, SERVER, ALPHA_TOOL, "Alpha"),
				managerMcpTool(BETA, SERVER, BETA_TOOL, "Beta"),
			];
			await session.refreshMCPTools(catalog, "push");
			expect(session.getAllToolNames()).toContain(owned.name);
			expect(session.getAllToolNames()).toContain(unregistered.name);

			// The extension's tool is enabled the way any tool is enabled: the user
			// asks for it by name. Ownership is not activation, so `unregistered` is
			// left alone and must stay off through the refresh below.
			await session.setActiveToolsByName([...session.getEnabledToolNames(), owned.name]);
			expect(session.getEnabledToolNames()).toContain(owned.name);

			// Refresh #2, and the one under test. Awaited rather than waited for, so
			// there is no window in which the assertions could read a half-applied
			// set. BETA is in the manager's catalogue and has never been active, so
			// this is also a push — the manager's own gate is what must refuse it.
			await session.refreshMCPTools(catalog, "push");

			// Clause 1, the contract: the tool the user enabled is still enabled.
			// Without `retainedActiveExtensionToolNames` this is the assertion that
			// goes red — `nextActive` is rebuilt from scratch on every refresh, and
			// neither manager-side term can carry this name, because
			// `setExtensionMCPTool` deleted it from `#mcpManagerToolNames`.
			expect(session.getEnabledToolNames()).toContain(owned.name);

			// Clause 2, the security half: retention filters the names that were
			// ALREADY active, so a tool that was registered but never switched on is
			// still off after the same refresh. Registered and visible, never
			// callable.
			expect(session.getAllToolNames()).toContain(unregistered.name);
			expect(session.getEnabledToolNames()).not.toContain(unregistered.name);

			// And the refresh genuinely re-derived the set rather than no-opping:
			// the manager's own pushed tool is still refused.
			expect(session.getEnabledToolNames()).not.toContain(BETA);
		} finally {
			await session.dispose();
			removeSyncWithRetries(workDir);
		}
	}, 40_000);
});
