/**
 * Tests for the ACP permission gate in AgentSession.
 *
 * Verifies that tools with a real ACP approval policy (bash/delete/move) are gated behind
 * `ClientBridge.requestPermission`, while regular file-editing tools keep the same no-approval
 * behavior they have in the TUI.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { type } from "@oh-my-pi/omptype";
import { Agent, type AgentTool } from "@oh-my-pi/pi-agent-core";
import { createMockModel, type MockModelOptions } from "@oh-my-pi/pi-ai/providers/mock";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai/utils/event-stream";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { EditTool } from "@oh-my-pi/pi-coding-agent/edit";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { ExtensionToolWrapper } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import {
	PERMISSION_OPTIONS,
	PERMISSION_OPTIONS_BY_ID,
	canonicalizeApprovalKey,
	describeApprovalScope,
	permissionOptions,
} from "@oh-my-pi/pi-coding-agent/session/acp-permission-gate";
import {
	APPROVAL_ENTRY_TYPE,
	isApprovalDenial,
	TURN_ENTRY_TYPE,
	type ApprovalEntry,
	type TurnEntry,
} from "@oh-my-pi/pi-coding-agent/session/session-entries";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import type {
	ClientBridge,
	ClientBridgePermissionOption,
	ClientBridgePermissionOutcome,
	ClientBridgePermissionToolCall,
} from "@oh-my-pi/pi-coding-agent/session/client-bridge";
import { convertToLlm } from "@oh-my-pi/pi-coding-agent/session/messages";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import type { ToolSession } from "@oh-my-pi/pi-coding-agent/tools";
import { dispatchXdevTool, resolveMountedXdevExecutable, type XdevState } from "@oh-my-pi/pi-coding-agent/tools/xdev";
import { TempDir } from "@oh-my-pi/pi-utils";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let tempDir: TempDir;
let session: AgentSession | undefined;

const boundaryCases: Array<[decision: "allow_always" | "reject_always", transition: "new" | "switch"]> = [
	["allow_always", "new"],
	["allow_always", "switch"],
	["reject_always", "new"],
	["reject_always", "switch"],
];
/** Fake tool that records execute calls. */
function makeFakeTool(name: string): AgentTool & { executeCalls: number } {
	const tool = {
		name,
		label: name,
		description: `Fake ${name}`,
		parameters: type({ "command?": "string" }),
		executeCalls: 0,
		async execute() {
			tool.executeCalls++;
			return { content: [{ type: "text" as const, text: "ok" }] };
		},
	};
	return tool;
}

function makeToolSession(bridge: ClientBridge): ToolSession {
	return {
		cwd: tempDir.path(),
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		enableLsp: false,
		settings: Settings.isolated({ "edit.mode": "apply_patch" }),
		getArtifactsDir: () => null,
		getSessionId: () => null,
		getPlanModeState: () => undefined,
		getClientBridge: () => bridge,
	} as unknown as ToolSession;
}

/** Build a minimal ClientBridge whose requestPermission resolves to the given outcome. */
function makeBridge(outcome: ClientBridgePermissionOutcome): ClientBridge {
	return {
		capabilities: { requestPermission: true },
		async requestPermission(_toolCall, _options, _signal) {
			return outcome;
		},
	};
}

async function createSession(
	tools: AgentTool[],
	bridge?: ClientBridge,
	settingsOverrides: Record<string, unknown> = {},
	options?: {
		xdev?: XdevState;
		builtInToolNames?: string[];
		persist?: boolean;
	},
): Promise<AgentSession> {
	const model = getBundledModel("anthropic", "claude-sonnet-4-5");
	if (!model) throw new Error("Expected claude-sonnet-4-5 model to exist");

	const settings = Settings.isolated({ "compaction.enabled": false, ...settingsOverrides });
	const sessionManager = options?.persist
		? SessionManager.create(tempDir.path(), `${tempDir.path()}/sessions`)
		: SessionManager.inMemory(tempDir.path());

	const agent = new Agent({
		getApiKey: () => "test-key",
		initialState: {
			model,
			systemPrompt: ["Test"],
			tools,
			messages: [],
		},
		convertToLlm,
		streamFn: () => new AssistantMessageEventStream(),
	});

	const toolRegistry = options?.xdev?.tools ?? new Map<string, AgentTool>();
	for (const tool of tools) toolRegistry.set(tool.name, tool);
	const sess = new AgentSession({
		agent,
		sessionManager,
		settings,
		modelRegistry: {} as never,
		toolRegistry,
		xdev: options?.xdev,
		builtInToolNames: options?.builtInToolNames,
	});

	if (bridge) sess.setClientBridge(bridge);
	return sess;
}

async function createSessionWithMockModel(
	tools: AgentTool[],
	bridge: ClientBridge,
	responses: NonNullable<MockModelOptions["responses"]>,
): Promise<AgentSession> {
	const mock = createMockModel({ responses });
	const settings = Settings.isolated({ "compaction.enabled": false });
	const sessionManager = SessionManager.inMemory(tempDir.path());
	const agent = new Agent({
		getApiKey: () => "test-key",
		initialState: {
			model: mock.model,
			systemPrompt: ["Test"],
			tools,
			messages: [],
		},
		convertToLlm,
		streamFn: mock.stream,
	});

	const sess = new AgentSession({
		agent,
		sessionManager,
		settings,
		modelRegistry: { getApiKey: () => "test-key" } as never,
		toolRegistry: new Map(tools.map(t => [t.name, t])),
	});
	sess.setClientBridge(bridge);
	return sess;
}

beforeAll(() => {
	tempDir = TempDir.createSync("@pi-acp-permission-test-");
});

afterEach(async () => {
	await session?.dispose();
	session = undefined;
});

afterAll(async () => {
	await tempDir.remove();
});

it("eval bridge dispatch uses the same ACP gate as a direct tool call", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool], bridge);

	await session.setActiveToolsByName(["bash"]);
	const bridgedBash = session.getToolForEvalBridge("bash");
	await bridgedBash!.execute("call-bridge", { command: "echo hi" }, undefined, undefined as never, undefined as never);

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(bashTool.executeCalls).toBe(1);
});

it("explicit yolo approval mode skips the ACP permission gate", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool], bridge, { "tools.approvalMode": "yolo" });

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	await wrappedBash!.execute("call-1", { command: "echo hi" }, undefined, undefined as never, undefined as never);

	expect(permissionSpy).not.toHaveBeenCalled();
	expect(bashTool.executeCalls).toBe(1);
});

it("explicit yolo still gates tools whose per-tool policy requires a prompt", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool], bridge, {
		"tools.approvalMode": "yolo",
		"tools.approval": { bash: "prompt" },
	});

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	await wrappedBash!.execute("call-1", { command: "echo hi" }, undefined, undefined as never, undefined as never);

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(bashTool.executeCalls).toBe(1);
});

/**
 * Minimal runner for wrapping a tool exactly as an ACP session does: no
 * interactive UI (so the inner tier gate fails closed) and no event handlers.
 */
function noUiRunner(): ExtensionRunner {
	return {
		hasHandlers: () => false,
		consumeToolCallEmitted: () => false,
		hasUI: () => false,
		sessionId: "acp-permission-test",
		// This fake is not attached to a session, so it has nowhere to put an approval
		// record. It is a deliberate no-op rather than a silent catch: the rows using it
		// are about whether the ACP bridge satisfies or fails the inner gate, and the
		// audit those rows would drop is asserted elsewhere against a real SessionManager
		// (`records both halves of an approval, and neither reaches the model`).
		recordApprovalEntry: () => {},
		runScoped<T>(fn: () => T): T {
			return fn();
		},
	} as unknown as ExtensionRunner;
}

it("always-ask: an ACP grant satisfies the inner wrapper's explicit prompt policy", async () => {
	// In a real ACP session every registry tool is wrapped by ExtensionToolWrapper,
	// then again by the ACP permission gate. The client has answered the explicit
	// prompt, so the inner wrapper must not request the unavailable interactive UI.
	const bashTool = makeFakeTool("bash");
	const wrapped = new ExtensionToolWrapper(bashTool, noUiRunner()) as unknown as AgentTool;
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	const approvalSettings: Record<string, unknown> = {
		"tools.approvalMode": "always-ask",
		"tools.approval": { bash: "prompt" },
	};
	session = await createSession([wrapped], bridge, approvalSettings);

	await session.setActiveToolsByName(["bash"]);
	const gatedBash = session.agent.state.tools.find(t => t.name === "bash");
	const ctx = { settings: Settings.isolated(approvalSettings) } as never;

	await gatedBash!.execute("call-1", { command: "echo hi" }, undefined, undefined as never, ctx);

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(bashTool.executeCalls).toBe(1);
});

it("always-ask: an ordinary edit without an ACP grant still faces the inner approval gate", async () => {
	const editTool = makeFakeTool("edit");
	editTool.approval = "write";
	const wrapped = new ExtensionToolWrapper(editTool, noUiRunner()) as unknown as AgentTool;
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([wrapped], bridge, { "tools.approvalMode": "always-ask" });

	await session.setActiveToolsByName(["edit"]);
	const gatedEdit = session.agent.state.tools.find(t => t.name === "edit");
	const ctx = { settings: Settings.isolated({ "tools.approvalMode": "always-ask" }) } as never;

	await expect(
		gatedEdit!.execute("call-edit", { path: "/tmp/foo.ts" }, undefined, undefined as never, ctx),
	).rejects.toThrow(/requires approval but no interactive UI/);

	expect(permissionSpy).not.toHaveBeenCalled();
	expect(editTool.executeCalls).toBe(0);
});

it("delete and move tools request ACP permission before executing", async () => {
	const deleteTool = makeFakeTool("delete");
	const moveTool = makeFakeTool("move");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_once", kind: "allow_once" };
		},
	};
	session = await createSession([deleteTool, moveTool], bridge);

	await session.setActiveToolsByName(["delete", "move"]);
	const wrappedDelete = session.agent.state.tools.find(t => t.name === "delete");
	const wrappedMove = session.agent.state.tools.find(t => t.name === "move");

	await wrappedDelete!.execute(
		"call-delete",
		{ path: "/tmp/gone.ts" },
		undefined,
		undefined as never,
		undefined as never,
	);
	await wrappedMove!.execute(
		"call-move",
		{ oldPath: "/tmp/old.ts", newPath: "/tmp/new.ts" },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests.map(({ toolName, title, locations }) => ({ toolName, title, locations }))).toEqual([
		{ toolName: "delete", title: "Delete /tmp/gone.ts", locations: [{ path: "/tmp/gone.ts" }] },
		{
			toolName: "move",
			title: "Move /tmp/old.ts to /tmp/new.ts",
			locations: [{ path: "/tmp/old.ts" }, { path: "/tmp/new.ts" }],
		},
	]);
	expect(deleteTool.executeCalls).toBe(1);
	expect(moveTool.executeCalls).toBe(1);
});

it("top-level fallback preserves ACP permission for mounted destructive tools", async () => {
	const readTool = makeFakeTool("read");
	const writeTool = makeFakeTool("write");
	const deleteTool = makeFakeTool("delete");
	deleteTool.loadMode = "discoverable";
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	const tools = new Map([readTool, writeTool].map(tool => [tool.name, tool]));
	const xdev: XdevState = {
		tools,
		mountedNames: new Set(),
		builtInNames: new Set(["read", "write"]),
		isActive: name => name === "read" || name === "write",
	};
	session = await createSession([readTool, writeTool], bridge, {}, { xdev, builtInToolNames: ["read", "write"] });

	await session.refreshRpcHostTools([deleteTool]);
	expect(xdev.mountedNames.has("delete")).toBe(true);
	expect(session.getActiveToolNames()).not.toContain("delete");
	const fallbackTool = resolveMountedXdevExecutable(xdev, "delete");
	await fallbackTool!.execute(
		"call-mounted-delete",
		{ path: "/tmp/gone.ts" },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(deleteTool.executeCalls).toBe(1);
});

it("startup-mounted destructive tools gain the ACP permission gate when the bridge attaches", async () => {
	const readTool = makeFakeTool("read");
	const writeTool = makeFakeTool("write");
	const deleteTool = makeFakeTool("delete");
	deleteTool.loadMode = "discoverable";
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	const tools = new Map([readTool, writeTool, deleteTool].map(tool => [tool.name, tool]));
	const xdev: XdevState = {
		tools,
		mountedNames: new Set(["delete"]),
		builtInNames: new Set(["read", "write"]),
		isActive: name => name === "read" || name === "write",
	};
	session = await createSession(
		[readTool, writeTool, deleteTool],
		bridge,
		{},
		{ xdev, builtInToolNames: ["read", "write"] },
	);

	await dispatchXdevTool(xdev, "delete", JSON.stringify({ path: "/tmp/gone.ts" }), "call-startup-delete");

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(deleteTool.executeCalls).toBe(1);
});
it("edit, write, and ast_edit do not request ACP permission", async () => {
	const editTool = makeFakeTool("edit");
	const writeTool = makeFakeTool("write");
	const astEditTool = makeFakeTool("ast_edit");
	const bridge = makeBridge({ outcome: "cancelled" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([editTool, writeTool, astEditTool], bridge);

	await session.setActiveToolsByName(["edit", "write", "ast_edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");
	const wrappedWrite = session.agent.state.tools.find(t => t.name === "write");
	const wrappedAstEdit = session.agent.state.tools.find(t => t.name === "ast_edit");

	await wrappedEdit!.execute("call-edit", { path: "/tmp/foo.ts" }, undefined, undefined as never, undefined as never);
	await wrappedWrite!.execute(
		"call-write",
		{ path: "/tmp/foo.ts" },
		undefined,
		undefined as never,
		undefined as never,
	);
	await wrappedAstEdit!.execute(
		"call-ast",
		{ paths: ["/tmp/foo.ts"] },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(permissionSpy).toHaveBeenCalledTimes(0);
	expect(editTool.executeCalls).toBe(1);
	expect(writeTool.executeCalls).toBe(1);
	expect(astEditTool.executeCalls).toBe(1);
});

it("edit delete and move operations request ACP permission before executing", async () => {
	const editTool = makeFakeTool("edit");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_once", kind: "allow_once" };
		},
	};
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await wrappedEdit!.execute(
		"call-edit-delete",
		{ path: "/tmp/gone.ts", edits: [{ op: "delete" }] },
		undefined,
		undefined as never,
		undefined as never,
	);
	await wrappedEdit!.execute(
		"call-edit-move",
		{ path: "/tmp/old.ts", edits: [{ op: "update", rename: "/tmp/new.ts" }] },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests.map(({ title, locations }) => ({ title, locations }))).toEqual([
		{ title: "Delete /tmp/gone.ts", locations: [{ path: "/tmp/gone.ts" }] },
		{ title: "Move /tmp/old.ts to /tmp/new.ts", locations: [{ path: "/tmp/old.ts" }, { path: "/tmp/new.ts" }] },
	]);
	expect(editTool.executeCalls).toBe(2);
});

it("edit delete operations take precedence over stale rename metadata", async () => {
	const editTool = makeFakeTool("edit");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_once", kind: "allow_once" };
		},
	};
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await wrappedEdit!.execute(
		"call-edit-delete-with-rename",
		{ path: "/tmp/gone.ts", edits: [{ op: "delete", rename: "/tmp/stale.ts" }] },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests.map(({ title, locations }) => ({ title, locations }))).toEqual([
		{ title: "Delete /tmp/gone.ts", locations: [{ path: "/tmp/gone.ts" }] },
	]);
	expect(editTool.executeCalls).toBe(1);
});

it("apply_patch delete operations take precedence over earlier moves", async () => {
	const editTool = makeFakeTool("edit");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_once", kind: "allow_once" };
		},
	};
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await wrappedEdit!.execute(
		"call-apply-patch-delete-after-move",
		{
			input: [
				"*** Begin Patch",
				"*** Update File: /tmp/old.ts",
				"*** Move to: /tmp/new.ts",
				"@@",
				"-old",
				"+new",
				"*** Delete File: /tmp/gone.ts",
				"*** End Patch",
			].join("\n"),
		},
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests.map(({ title, locations }) => ({ title, locations }))).toEqual([
		{ title: "Delete /tmp/gone.ts", locations: [{ path: "/tmp/gone.ts" }] },
	]);
	expect(editTool.executeCalls).toBe(1);
});

it("apply_patch custom-wire delete requests ACP permission through agent dispatch", async () => {
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_once", kind: "allow_once" };
		},
	};
	const editTool = new EditTool(makeToolSession(bridge));
	session = await createSessionWithMockModel([editTool as AgentTool], bridge, [
		{
			content: [
				{
					type: "toolCall",
					id: "call-custom-apply-patch",
					name: "apply_patch",
					arguments: {
						input: ["*** Begin Patch", "*** Delete File: /tmp/gone.ts", "*** End Patch"].join("\n"),
					},
				},
			],
		},
		{ content: ["done"] },
	]);

	await session.prompt("delete with custom apply_patch");

	expect(requests.map(({ toolCallId, title, locations }) => ({ toolCallId, title, locations }))).toEqual([
		{
			toolCallId: "call-custom-apply-patch",
			title: "Delete /tmp/gone.ts",
			locations: [{ path: "/tmp/gone.ts" }],
		},
	]);
});

it("patch-mode delete operations take precedence over earlier moves", async () => {
	const editTool = makeFakeTool("edit");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_once", kind: "allow_once" };
		},
	};
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await wrappedEdit!.execute(
		"call-patch-delete-after-move",
		{
			path: "/tmp/old.ts",
			edits: [{ op: "update", rename: "/tmp/new.ts" }, { op: "delete" }],
		},
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests.map(({ title, locations }) => ({ title, locations }))).toEqual([
		{ title: "Delete /tmp/old.ts", locations: [{ path: "/tmp/old.ts" }] },
	]);
	expect(editTool.executeCalls).toBe(1);
});

it("always-allowing edit moves does not bypass patch-mode calls that also delete", async () => {
	const editTool = makeFakeTool("edit");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_always", kind: "allow_always" };
		},
	};
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await wrappedEdit!.execute(
		"call-edit-move",
		{ path: "/tmp/old.ts", edits: [{ op: "update", rename: "/tmp/new.ts" }] },
		undefined,
		undefined as never,
		undefined as never,
	);
	await wrappedEdit!.execute(
		"call-patch-delete-after-move",
		{
			path: "/tmp/another-old.ts",
			edits: [{ op: "update", rename: "/tmp/another-new.ts" }, { op: "delete" }],
		},
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests.map(({ title }) => title)).toEqual([
		"Move /tmp/old.ts to /tmp/new.ts",
		"Delete /tmp/another-old.ts",
	]);
	expect(editTool.executeCalls).toBe(2);
});

it("bash permission requests include execute metadata and command content", async () => {
	const bashTool = makeFakeTool("bash");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_once", kind: "allow_once" };
		},
	};
	session = await createSession([bashTool], bridge);

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	await wrappedBash!.execute(
		"call-bash-rich",
		{ command: "git status --short" },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests).toHaveLength(1);
	expect(requests[0]).toMatchObject({
		toolCallId: "call-bash-rich",
		toolName: "bash",
		title: "git status --short",
		kind: "execute",
		status: "pending",
		rawInput: { command: "git status --short" },
		content: [{ type: "content", content: { type: "text", text: "$ git status --short" } }],
	});
	expect(bashTool.executeCalls).toBe(1);
});

it("ordinary edit calls still bypass ACP permission after rejecting edit moves forever", async () => {
	const editTool = makeFakeTool("edit");
	const bridge = makeBridge({ outcome: "selected", optionId: "reject_always", kind: "reject_always" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await expect(
		wrappedEdit!.execute(
			"call-edit-move",
			{ path: "/tmp/old.ts", edits: [{ op: "update", rename: "/tmp/new.ts" }] },
			undefined,
			undefined as never,
			undefined as never,
		),
	).rejects.toThrow(/rejected by user/);
	await wrappedEdit!.execute(
		"call-edit-update",
		{ path: "/tmp/foo.ts" },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(editTool.executeCalls).toBe(1);
});

it("edit create operations with rename metadata do not request ACP move permission", async () => {
	const editTool = makeFakeTool("edit");
	const bridge = makeBridge({ outcome: "cancelled" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await wrappedEdit!.execute(
		"call-edit-create",
		{ path: "/tmp/new.ts", edits: [{ op: "create", rename: "/tmp/ignored.ts", diff: "export {};" }] },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(permissionSpy).toHaveBeenCalledTimes(0);
	expect(editTool.executeCalls).toBe(1);
});

it("always-allowing edit moves does not bypass later edit delete permission", async () => {
	const editTool = makeFakeTool("edit");
	const requests: ClientBridgePermissionToolCall[] = [];
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		async requestPermission(toolCall, _options, _signal) {
			requests.push(toolCall);
			return { outcome: "selected", optionId: "allow_always", kind: "allow_always" };
		},
	};
	session = await createSession([editTool], bridge);

	await session.setActiveToolsByName(["edit"]);
	const wrappedEdit = session.agent.state.tools.find(t => t.name === "edit");

	await wrappedEdit!.execute(
		"call-edit-move",
		{ path: "/tmp/old.ts", edits: [{ op: "update", rename: "/tmp/new.ts" }] },
		undefined,
		undefined as never,
		undefined as never,
	);
	await wrappedEdit!.execute(
		"call-edit-delete",
		{ path: "/tmp/gone.ts", edits: [{ op: "delete" }] },
		undefined,
		undefined as never,
		undefined as never,
	);

	expect(requests.map(({ title }) => title)).toEqual(["Move /tmp/old.ts to /tmp/new.ts", "Delete /tmp/gone.ts"]);
	expect(editTool.executeCalls).toBe(2);
});

it("setClientBridge wraps tools that were already active", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool]);

	session.setClientBridge(bridge);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	await wrappedBash!.execute("call-1", { command: "echo hi" }, undefined, undefined as never, undefined as never);

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(bashTool.executeCalls).toBe(1);
});

it("aborting an open permission request rejects without executing the tool", async () => {
	const bashTool = makeFakeTool("bash");
	const pending = Promise.withResolvers<ClientBridgePermissionOutcome>();
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		requestPermission: async () => pending.promise,
	};
	session = await createSession([bashTool], bridge);
	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	const abortController = new AbortController();
	const execution = wrappedBash!.execute(
		"call-1",
		{ command: "echo hi" },
		abortController.signal,
		undefined as never,
		undefined as never,
	);
	abortController.abort();

	await expect(execution).rejects.toThrow(/Permission request cancelled/);
	expect(bashTool.executeCalls).toBe(0);
	pending.resolve({ outcome: "cancelled" });
});

// ---------------------------------------------------------------------------
// 2. Reject once: throws, underlying execute never called
// ---------------------------------------------------------------------------

it("reject_once: throws ToolError and never calls underlying execute", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "reject_once", kind: "reject_once" });
	session = await createSession([bashTool], bridge);

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	await expect(
		wrappedBash!.execute("call-1", { command: "echo hi" }, undefined, undefined as never, undefined as never),
	).rejects.toThrow(/rejected by user/);

	expect(bashTool.executeCalls).toBe(0);
});

it("unknown selected permission option ID fails closed without executing", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_typo" });
	session = await createSession([bashTool], bridge);

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	await expect(
		wrappedBash!.execute("call-unknown", { command: "echo hi" }, undefined, undefined as never, undefined as never),
	).rejects.toThrow(/unknown option ID/);
	expect(bashTool.executeCalls).toBe(0);
});

// ---------------------------------------------------------------------------
// 3. Always allow caches: bridge called exactly once across two executions
// ---------------------------------------------------------------------------

it("allow_always: caches decision and calls bridge only once for subsequent executes", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_always", kind: "allow_always" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool], bridge);

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");

	// First call — bridge is consulted, decision cached.
	await wrappedBash!.execute("call-1", { command: "echo a" }, undefined, undefined as never, undefined as never);
	// Second call — must skip the bridge entirely.
	//
	// This used to be `echo b`, and it passed because the decision was cached under
	// the *tool name*, so approving `echo a` silently approved `echo b` too. That is
	// the defect GAP-M1-20 is about, not a property of caching, so the second call
	// is now the same command and the row still tests what its title says: that a
	// decision is remembered. The narrowing direction — a different command asking
	// again — is covered by its own row below.
	await wrappedBash!.execute("call-2", { command: "echo a" }, undefined, undefined as never, undefined as never);

	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(bashTool.executeCalls).toBe(2);
});

it.each(boundaryCases)(
	"%s permission decisions prompt again after a successful %s session boundary",
	async (decision, transition) => {
		const bashTool = makeFakeTool("bash");
		const bridge = makeBridge({ outcome: "selected", optionId: decision, kind: decision });
		const permissionSpy = spyOn(bridge, "requestPermission");
		session = await createSession([bashTool], bridge, {}, { persist: true });

		await session.setActiveToolsByName(["bash"]);
		const wrappedBash = session.agent.state.tools.find(tool => tool.name === "bash");
		if (!wrappedBash) throw new Error("Expected wrapped bash tool");

		for (let callIndex = 0; callIndex < 2; callIndex++) {
			if (callIndex === 1) {
				if (transition === "new") {
					expect(await session.newSession()).toBe(true);
				} else {
					const targetId = `permission-target-${Bun.nanoseconds()}`;
					const targetPath = `${tempDir.path()}/${targetId}.jsonl`;
					await Bun.write(
						targetPath,
						`${JSON.stringify({
							type: "session",
							version: 3,
							id: targetId,
							timestamp: new Date().toISOString(),
							cwd: tempDir.path(),
						})}\n`,
					);
					expect(await session.switchSession(targetPath)).toBe(true);
				}
			}

			const execution = wrappedBash.execute(
				`call-${callIndex}`,
				{ command: "echo boundary" },
				undefined,
				undefined as never,
				undefined as never,
			);
			if (decision === "reject_always") {
				await expect(execution).rejects.toThrow(/rejected by user/);
			} else {
				await execution;
			}
		}

		expect(permissionSpy).toHaveBeenCalledTimes(2);
		expect(bashTool.executeCalls).toBe(decision === "allow_always" ? 2 : 0);
	},
);

// ---------------------------------------------------------------------------
// 4. Read tool not gated: bridge never called even when bridge is set
// ---------------------------------------------------------------------------

it("read tool: requestPermission is never called for non-gated tools", async () => {
	const readTool = makeFakeTool("read");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([readTool], bridge);

	await session.setActiveToolsByName(["read"]);
	const wrappedRead = session.agent.state.tools.find(t => t.name === "read");

	await wrappedRead!.execute("call-1", {}, undefined, undefined as never, undefined as never);

	expect(permissionSpy).toHaveBeenCalledTimes(0);
	expect(readTool.executeCalls).toBe(1);
});

it("setActiveToolsByName normalizes legacy tool names", async () => {
	const grepTool = makeFakeTool("grep");
	const globTool = makeFakeTool("glob");
	session = await createSession([grepTool, globTool]);

	await session.setActiveToolsByName(["Search", "glob", "grep"]);

	expect(session.getActiveToolNames()).toEqual(["grep", "glob"]);
});

// ---------------------------------------------------------------------------
// The scope of an "always" decision
// ---------------------------------------------------------------------------

/**
 * A bridge that answers the first prompt with `first`, then with whatever the
 * caller queued. The queue is what lets one row observe both what a grant covers
 * and what it does not, in a single session — the cache lives on the session, so
 * the second call has to happen in the same one.
 */
/** One prompt as the bridge saw it: what was asked, under which key. */
interface PromptRecord {
	action: string;
	cacheKey: string;
	options: ClientBridgePermissionOption[];
}

/** The action a tool call represents, for the log line. */
function describeAction(call: ClientBridgePermissionToolCall): string {
	const raw = call.rawInput as { command?: unknown } | undefined;
	if (typeof raw?.command === "string") return raw.command;
	return call.title ?? call.toolName;
}

/**
 * Print the prompt history before asserting on how many prompts happened.
 *
 * The count is this file's whole observable, and a bare count says nothing about
 * *which* key was too wide — printing the key alongside the action is what turns
 * a red run into a one-line diagnosis instead of a bisect.
 */
function reportPrompts(tag: string, prompts: PromptRecord[], extra?: Record<string, unknown>): void {
	console.error(
		`[${tag}] prompts=%o`,
		prompts.map(({ action, cacheKey }) => ({ action, cacheKey })),
	);
	if (extra) console.error(`[${tag}] %o`, extra);
}

function makeQueueBridge(
	first: ClientBridgePermissionOutcome,
	rest: ClientBridgePermissionOutcome,
): ClientBridge & {
	seen: ClientBridgePermissionOption[][];
	prompts: PromptRecord[];
} {
	const seen: ClientBridgePermissionOption[][] = [];
	const prompts: PromptRecord[] = [];
	let call = 0;
	return {
		seen,
		prompts,
		capabilities: { requestPermission: true },
		async requestPermission(toolCall: ClientBridgePermissionToolCall, options: ClientBridgePermissionOption[]) {
			seen.push(options);
			prompts.push({
				action: describeAction(toolCall),
				cacheKey: canonicalizeApprovalKey(toolCall.toolName, toolCall.rawInput),
				options,
			});
			call++;
			return call === 1 ? first : rest;
		},
	} as ClientBridge & { seen: ClientBridgePermissionOption[][]; prompts: PromptRecord[] };
}

/** Run `command` through the gated bash tool of a live session. */
async function runBash(session: AgentSession, command: string): Promise<void> {
	await session.setActiveToolsByName(["bash"]);
	const bash = session.agent.state.tools.find(tool => tool.name === "bash");
	await bash!.execute(`call-${command}`, { command }, undefined, undefined as never, undefined as never);
}

it("an always-allow for one bash command does not carry to a different command", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeQueueBridge(
		{ outcome: "selected", optionId: "allow_always", kind: "allow_always" },
		{
			outcome: "selected",
			optionId: "allow_once",
			kind: "allow_once",
		},
	);
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool], bridge);

	// The negative that gives this item its meaning: without it, narrowing the key
	// is decoration, and a "fix" that prompts for everything also passes.
	const actions = ["git status", "rm -rf ./build"];
	await runBash(session, actions[0]);
	reportPrompts("perm:negative", bridge.prompts, { actions, promptsSoFar: 1 });
	expect(permissionSpy).toHaveBeenCalledTimes(1);

	// Same tool, different action. Under the old tool-name key this ran without
	// asking, so approving `git status` had also approved `rm -rf`.
	await runBash(session, actions[1]);
	reportPrompts("perm:negative", bridge.prompts, { actions, promptsSoFar: 2 });
	expect(permissionSpy).toHaveBeenCalledTimes(2);

	expect(bashTool.executeCalls).toBe(2);
});

it("an always-allow does carry to the same bash command again", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeQueueBridge(
		{ outcome: "selected", optionId: "allow_always", kind: "allow_always" },
		{
			outcome: "selected",
			optionId: "allow_once",
			kind: "allow_once",
		},
	);
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool], bridge);

	// The other direction. Asserting only the row above would also be satisfied by
	// a change that re-asked for everything, which is not a fix.
	const sameAction = "git status";
	await runBash(session, sameAction);
	await runBash(session, sameAction);

	// The action is printed as well as the count: "did not prompt" is only
	// evidence if the row also proves which action it declined to ask about.
	reportPrompts("perm:reuse", bridge.prompts, { sameAction, promptedAgain: false });
	expect(permissionSpy).toHaveBeenCalledTimes(1);
	expect(bashTool.executeCalls).toBe(2);
});

it("the always options name the scope being granted", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeQueueBridge(
		{ outcome: "selected", optionId: "allow_once", kind: "allow_once" },
		{
			outcome: "selected",
			optionId: "allow_once",
			kind: "allow_once",
		},
	);
	session = await createSession([bashTool], bridge);

	await runBash(session, "git status");

	// Both the whole option array and the joined label: the array says whether the
	// scope landed on the right *option*, the label says whether it is readable.
	// A run where they disagree is a different bug from one where the label is
	// simply wrong, and printing only the label hides which of the two it was.
	const options = bridge.seen[0] ?? [];
	const labels = options.map(option => option.name);
	console.error("[perm:scope] options=%o label=%o", options, labels.join(" "));
	// A narrower key is worth nothing while the button still reads "Always allow".
	expect(labels.join(" ")).toContain("git status");
});

it("an always-reject sticks for that action only", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeQueueBridge(
		{ outcome: "selected", optionId: "reject_always", kind: "reject_always" },
		{
			outcome: "selected",
			optionId: "allow_once",
			kind: "allow_once",
		},
	);
	const permissionSpy = spyOn(bridge, "requestPermission");
	session = await createSession([bashTool], bridge);

	// Rejected permanently: no prompt the second time, and it must not run.
	await expect(runBash(session, "rm -rf ./build")).rejects.toThrow();
	await expect(runBash(session, "rm -rf ./build")).rejects.toThrow();
	reportPrompts("perm:reject", bridge.prompts, { rejected: "rm -rf ./build", sameReprompts: 1 });
	expect(permissionSpy).toHaveBeenCalledTimes(1);

	// A different action is still a separate question — reject_always shares the
	// key with allow_always deliberately, and narrowing must apply to both.
	await runBash(session, "git status");
	reportPrompts("perm:reject", bridge.prompts, {
		rejected: "rm -rf ./build",
		otherAction: "git status",
		otherPrompts: 2,
	});
	expect(permissionSpy).toHaveBeenCalledTimes(2);
	expect(bashTool.executeCalls).toBe(1);
});

/**
 * The fallback branch of `canonicalizeApprovalKey`.
 *
 * This one is asserted at the unit level on purpose. `getPermissionIntent` only
 * routes `bash`, `delete`, `move` and `edit` — anything else returns `undefined`
 * and is never gated, so there is no end-to-end path that reaches the fallback
 * today. The branch exists for the day a fifth gated tool arrives, and that is
 * exactly the day it matters: an author adds the tool to `getPermissionIntent`,
 * forgets a branch here, and every call of that tool silently shares one grant
 * again. There is no e2e row that could fail first, so this row is the gate.
 */
it("a tool with no canonicalization branch still separates distinct calls", () => {
	const first = canonicalizeApprovalKey("some-future-tool", { path: "a.txt" });
	const second = canonicalizeApprovalKey("some-future-tool", { path: "b.txt" });

	// Falling back to the tool name is the bug this whole change removes. If this
	// row were written against that fallback it would pass, so it is the mutation
	// below — not this assertion — that gives it meaning.
	expect(first).not.toBe(second);

	// The same call twice is still the same action, so a grant can take effect.
	expect(canonicalizeApprovalKey("some-future-tool", { path: "a.txt" })).toBe(first);
});

it("a bash call with no command does not share a grant with other bash calls", () => {
	// The same trap one branch inward: `bash` with no `command` has nothing to
	// canonicalize, and used to fall back to the bare tool name.
	const empty = canonicalizeApprovalKey("bash", {});
	const withCommand = canonicalizeApprovalKey("bash", { command: "git status" });

	expect(empty).not.toBe(withCommand);
	expect(empty).not.toBe("bash");
});

/**
 * The scope label, which is the words the user reads before granting for the
 * session. `describeApprovalScope` states its own contract — "it names the same
 * thing the key does" — and these rows are that contract.
 *
 * **Why the unit, when there is no end-to-end path.** For the same reason the
 * fallback row above is a unit: `getPermissionIntent` routes only `bash`,
 * `delete`, `move` and `edit`, and the caller executes without a prompt when it
 * returns `undefined`. So no tool reaches this branch end-to-end today, and no
 * e2e row could fail if the branch were wrong. This branch is a trap for the day
 * a fifth gated tool arrives — and on that day it is the label, not the gate,
 * that would be quietly lying.
 *
 * The regression these rows defend is one-directional, so they are checked
 * against the key rather than against fixed strings: whatever the label says,
 * two calls the key separates must not read alike.
 */
it("names the payload of an unrecognised tool, so two scopes cannot read alike", () => {
	// The load-bearing pair. `every acme-fetch call` satisfies the old fallback and
	// satisfies nothing here: it describes a grant an order of magnitude wider than
	// the one two different payloads actually get.
	const first = describeApprovalScope("acme-fetch", { url: "https://example.test/a" });
	const second = describeApprovalScope("acme-fetch", { url: "https://example.test/b" });

	expect(first).not.toBe(second);
	// The key is the thing being described, so the pair has to move together.
	expect(canonicalizeApprovalKey("acme-fetch", { url: "https://example.test/a" })).not.toBe(
		canonicalizeApprovalKey("acme-fetch", { url: "https://example.test/b" }),
	);
});

it("gives one payload one label, so a grant can take effect", () => {
	// The counterpart, and the reason the label is derived rather than randomised:
	// "always" has to mean something on the second identical call.
	expect(describeApprovalScope("acme-fetch", { url: "https://example.test/a" })).toBe(
		describeApprovalScope("acme-fetch", { url: "https://example.test/a" }),
	);
});

it("keeps two long payloads apart when the readable part is cut", () => {
	// Truncation is the one way the fix could reintroduce its own defect: both
	// labels start the same 60 characters, so without a digest they are the same
	// string and two separate grants read as one.
	const filler = "x".repeat(200);
	const first = describeApprovalScope("acme-fetch", { url: `${filler}AAAA` });
	const second = describeApprovalScope("acme-fetch", { url: `${filler}BBBB` });

	expect(first).not.toBe(second);
});

it("still says 'every call' when there is nothing to tell two calls apart", () => {
	// The one case the old wording was true in: no payload means every call shares
	// the single key `acme-fetch:<hash of {}>`, so "every acme-fetch call" is exact
	// rather than a guess. Narrowing this would be a cosmetic regression.
	expect(describeApprovalScope("acme-fetch", {})).toBe("every acme-fetch call");
});

it("leaves the four branched tools labelling exactly as before", () => {
	// Byte identity, not semantics: every one of these strings has already been
	// printed in a permission prompt, and the branched labels are the ones whose
	// correspondence to the key is already correct.
	expect(describeApprovalScope("bash", { command: "git status" })).toBe("git status");
	expect(describeApprovalScope("delete", { path: "build/out.js" })).toBe("delete build/out.js");
	expect(describeApprovalScope("move", { oldPath: "a", newPath: "b" })).toBe("move a to b");
	expect(describeApprovalScope("edit", { path: "/tmp/gone.ts", edits: [{ op: "delete" }] })).toBe(
		"every delete in an edit",
	);
});

it("carries the scope onto the two options that persist and no others", () => {
	// The wire half. `permissionOptions` is what the client renders, so a label that
	// is computed correctly but dropped here would leave the user reading nothing at
	// all — and the once-options must not grow a scope they do not have, since they
	// do not persist anything.
	const options = permissionOptions(describeApprovalScope("acme-fetch", { url: "https://example.test/a" }));
	const named = new Map(options.map(option => [option.kind, option.name]));

	expect(named.get("allow_always")).toContain("acme-fetch url=https://example.test/a");
	expect(named.get("reject_always")).toContain("acme-fetch url=https://example.test/a");
	expect(named.get("allow_once")).toBe("Allow once");
	expect(named.get("reject_once")).toBe("Reject");
	// Ids and kinds are the wire contract for resolving an answer back; the label
	// must not disturb them.
	expect(options.map(option => option.optionId)).toEqual(PERMISSION_OPTIONS.map(option => option.optionId));
	for (const option of options) {
		expect(PERMISSION_OPTIONS_BY_ID.get(option.optionId)?.kind).toBe(option.kind);
	}
});

/**
 * The approval audit pair.
 *
 * After a crash the only question that matters is "who approved this, and what
 * was approved". A single record cannot answer it: written only at the answer it
 * cannot tell a denial from a process that died while the prompt was open, and
 * written only at the ask it cannot say what was decided. So both halves go to
 * the log, joined by the tool call id.
 */
it("records both halves of an approval, and neither reaches the model", async () => {
	const bashTool = makeFakeTool("bash");
	const bridge = makeBridge({ outcome: "selected", optionId: "allow_once", kind: "allow_once" });
	session = await createSession([bashTool], bridge);

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");
	await wrappedBash!.execute(
		"call-audit",
		{ command: "rm -rf ./build" },
		undefined,
		undefined as never,
		undefined as never,
	);

	const entries = session.sessionManager
		.getEntries()
		.filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
	expect(entries.map(e => e.phase)).toEqual(["asked", "answered"]);

	// The pair must be joinable, or a crash log is two unrelated lines.
	const [asked, answered] = entries;
	expect(answered.requestId).toBe(asked.requestId);

	// The decision that was actually applied, and the action it was applied to.
	expect(answered.decision).toBe("allow_once");
	expect(asked.policyKey).toBe("bash:rm -rf ./build");

	// The load-bearing half of the contract. `SessionMessageEntry` is the only
	// union member carrying an AgentMessage, so this is structural — but if it ever
	// stops being true, the model starts reading its own permission history, and
	// the test is what notices.
	const modelMessages = session.agent.state.messages;
	expect(modelMessages.some(m => JSON.stringify(m).includes("rm -rf ./build"))).toBe(false);
});

describe("an ACP approval the client never answered", () => {
	/**
	 * The negative half of `blockedBy`, and the half that would be dangerous if it were
	 * wrong in the other direction.
	 *
	 * `blockedBy` marks a turn as *refused*. So the failure this guards is not a
	 * missing entry — it is a healthy turn recorded as blocked, which is a transcript
	 * that lies about what happened. `isApprovalDenial` already filters on
	 * `phase === "answered"`, and this is the row that proves the filter is load-bearing
	 * through a real writer rather than a hand-built object: `session-tools.ts` writes
	 * the `asked` half at :956 and only reaches the `answered` half at :1006 after the
	 * client replies, so a cancelled outcome leaves the question genuinely open.
	 */
	it("leaves a turn that was only asked about unblocked", async () => {
		const bashTool = makeFakeTool("bash");
		// `cancelled` returns before the answered half is written, which is exactly
		// the crash case the pair exists to make legible.
		const bridge = makeBridge({ outcome: "cancelled" });
		session = await createSessionWithMockModel([bashTool], bridge, [
			{
				content: [{ type: "toolCall", id: "call-asked-only", name: "bash", arguments: { command: "git status" } }],
			},
			{ content: ["done"] },
		]);

		await session.prompt("check the tree");

		const halves = session.sessionManager
			.getEntries()
			.filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
		// The precondition that makes this row mean something: the question really
		// was put, and really was left unanswered.
		expect(halves.map(e => e.phase)).toEqual(["asked"]);
		expect(halves.every(entry => !isApprovalDenial(entry))).toBe(true);

		// Absent, not `[]`.
		const ended = session.sessionManager
			.getEntries()
			.find((e): e is TurnEntry => e.type === TURN_ENTRY_TYPE && e.phase === "ended");
		expect(ended?.blockedBy).toBeUndefined();
	});
});

it("an approval recorded as asked but never answered is distinguishable", async () => {
	// The crash case the pair exists for. A bridge that never answers leaves only
	// the `asked` half in the log, which is what tells a reader the question was
	// open when the process died rather than denied.
	const bashTool = makeFakeTool("bash");
	const bridge: ClientBridge = {
		capabilities: { requestPermission: true },
		requestPermission: () => new Promise<ClientBridgePermissionOutcome>(() => {}),
	};
	session = await createSession([bashTool], bridge, { "tools.approval": { bash: "prompt" } });

	await session.setActiveToolsByName(["bash"]);
	const wrappedBash = session.agent.state.tools.find(t => t.name === "bash");
	await Promise.race([
		wrappedBash!
			.execute(
				"call-open",
				{ command: "git status" },
				AbortSignal.timeout(60),
				undefined as never,
				undefined as never,
			)
			.catch(() => {}),
		Bun.sleep(60),
	]);

	const entries = session.sessionManager
		.getEntries()
		.filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
	expect(entries.some(e => e.phase === "asked")).toBe(true);
	expect(entries.some(e => e.phase === "answered")).toBe(false);
});

/**
 * The join. `blockedBy` is assembled by scanning the log for `isApprovalDenial`,
 * so the field is only as good as the writers that feed it — and this is the one
 * writer that answers with the ACP vocabulary rather than a gate's `policy`.
 *
 * Both halves were already pinned apart, which is exactly why the join needed its
 * own row. `records both halves of an approval` proves this path writes an
 * `ApprovalEntry`, but runs no turn, so `blockedBy` never sees it.
 * `blockedBy, read back off a real turn` proves the reader works on a real turn,
 * but builds its entries by calling `appendApprovalEntry` by hand — so it stays
 * green if this path stops recording entirely. Neither can fail for the reason
 * that matters here.
 *
 * `reject_once` specifically: it is the answer that reaches the log as an option
 * kind, so a reader that only understood `"denied"` would record the row and then
 * never surface it.
 */
describe("an ACP rejection reaches the turn record", () => {
	/** Drive one prompt whose turn calls bash, with the bridge answering `kind`. */
	async function promptThroughGate(
		kind: "reject_once" | "allow_once",
		callId: string,
	): Promise<{ bash: ReturnType<typeof makeFakeTool>; prompts: () => number }> {
		const bash = makeFakeTool("bash");
		const bridge = makeBridge({ outcome: "selected", optionId: kind, kind });
		// Spied before the prompt, so the count is the gate engaging and not a
		// wrapper that was never installed.
		const permissionSpy = spyOn(bridge, "requestPermission");
		session = await createSessionWithMockModel([bash], bridge, [
			{ content: [{ type: "toolCall", id: callId, name: "bash", arguments: { command: "rm -rf ./build" } }] },
			{ content: ["done"] },
		]);
		await session.prompt("clean the build");
		return { bash, prompts: () => permissionSpy.mock.calls.length };
	}

	function approvals(): ApprovalEntry[] {
		return session!.sessionManager.getEntries().filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
	}

	function firstEndedTurn(): TurnEntry | undefined {
		return session!.sessionManager
			.getEntries()
			.find((e): e is TurnEntry => e.type === TURN_ENTRY_TYPE && e.phase === "ended");
	}

	it("names the refused request on the turn that was refused in", async () => {
		const { bash, prompts } = await promptThroughGate("reject_once", "call-acp-reject");

		// The gate actually engaged, exactly once. Without this, a run where the
		// wrapper was never installed satisfies every assertion below vacuously —
		// and a fixture that cannot fail cannot catch its mutant.
		expect(prompts()).toBe(1);
		expect(bash.executeCalls).toBe(0);

		const halves = approvals();
		// Both halves, joined by requestId. A lone `answered` row would answer "was
		// this allowed" while proving nothing about what the user was asked.
		expect(halves.map(e => e.phase)).toEqual(["asked", "answered"]);
		const [asked, answered] = halves;
		expect(answered.requestId).toBe(asked.requestId);
		// The tool call id, so `blockedBy` names the call a reader can go look at.
		expect(answered.requestId).toBe("call-acp-reject");

		// The ACP vocabulary and provenance, which no other writer emits.
		expect(answered.decision).toBe("reject_once");
		expect(answered.source).toBe("acp");
		expect(asked.policyKey).toBe("bash:rm -rf ./build");

		// The load-bearing link: this function is the reader's only filter. A row it
		// rejects would be written, counted in the log, and invisible to `blockedBy`.
		expect(isApprovalDenial(answered)).toBe(true);

		// And the field itself, read off the turn that was open when the refusal
		// landed. The model continues after a rejected call, so this is the first
		// ended turn, not the last.
		expect(firstEndedTurn()?.blockedBy).toEqual(["call-acp-reject"]);
	});

	it("leaves the turn unblocked when the same gate allows the call", async () => {
		// The control that gives the row above its meaning. Same writer, same turn,
		// same tool, same command — only the answer differs. If `blockedBy` were
		// built from "an approval happened" rather than "an approval was refused",
		// this turn would read `["call-acp-allow"]` and the row above would be
		// satisfied by a writer that records every prompt as a refusal.
		const { bash, prompts } = await promptThroughGate("allow_once", "call-acp-allow");

		// Same proof the row above needs, and the reason `blockedBy` being absent is
		// meaningful here: an approval really was written and really was not a denial.
		expect(prompts()).toBe(1);
		const answered = approvals().find(e => e.phase === "answered");
		if (!answered) throw new Error("Expected an answered approval half");
		expect(isApprovalDenial(answered)).toBe(false);
		expect(answered.decision).toBe("allow_once");
		expect(bash.executeCalls).toBe(1);

		// Absent, not `[]`: an empty array is indistinguishable from a writer that
		// meant to populate the field and failed.
		expect(firstEndedTurn()?.blockedBy).toBeUndefined();
	});
});
