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
import { AuthStorage } from "@oh-my-pi/pi-ai";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { TOOL_NO_LONGER_OFFERED } from "@oh-my-pi/pi-coding-agent/mcp/tool-bridge";
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

describe("a session's active tool set after the server pushes a new tool", () => {
	let sharedTempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@pi-rugpull-session-");
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
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-rugpull-session-"));
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
});
