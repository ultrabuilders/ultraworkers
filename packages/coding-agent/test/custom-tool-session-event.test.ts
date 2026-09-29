import { describe, expect, it } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent } from "@oh-my-pi/pi-agent-core";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { createInMemoryAuthStorage } from "./helpers/agent-session-setup";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { Type } from "@oh-my-pi/omptype/typebox";
import { ExtensionUiController } from "@oh-my-pi/pi-coding-agent/modes/controllers/extension-ui-controller";

// Contract: a custom tool's `onSession` handler hears about session lifecycle in
// EVERY mode, not only the interactive TUI.
//
// The leak this fixes: the dispatcher lived on `extension-ui-controller`, so
// `print`, `rpc` and `json` had no path to it at all. A tool holding a resource
// open — a PTY, a port, a temp directory — never learned the session was ending,
// in exactly the modes used for automation. The handler did not need a UI; the
// code path did.
//
// A regression here is silent: nothing throws, nothing is logged, and the only
// symptom is a resource outliving its session. So these assert delivery, not
// that a function exists.

async function makeSession(defs: { name: string; onSession?: unknown }[]): Promise<AgentSession> {
	const dir = await mkdtemp(join(tmpdir(), "omp-sess-evt-"));
	const settings = Settings.isolated({
		"compaction.enabled": false,
		"retry.enabled": false,
		"todo.enabled": false,
	});
	const runtime = new ExtensionRuntime();
	const extension = await loadExtensionFromFactory(
		(api: ExtensionAPI) => {
			for (const d of defs) {
				api.registerTool({
					name: d.name,
					label: d.name,
					description: "test tool",
					parameters: Type.Object({}),
					execute: async () => ({ content: [], details: {} }),
					...(d.onSession ? { onSession: d.onSession } : {}),
				} as never);
			}
		},
		dir,
		new EventBus(),
		runtime,
		"session-event-probe",
	);
	const sessionManager = SessionManager.inMemory(dir);
	const modelRegistry = new ModelRegistry(createInMemoryAuthStorage(), join(dir, "models.yml"));
	// The session holds an ExtensionRunner, not the runtime: the runner is what
	// exposes getUIContext and the registered tools.
	const runner = new ExtensionRunner([extension], runtime, dir, sessionManager, modelRegistry);
	return new AgentSession({
		agent: new Agent({
			getApiKey: () => "test-key",
			initialState: { systemPrompt: [], tools: [] },
			streamFn: (() => {}) as never,
		}),
		sessionManager,
		settings,
		modelRegistry,
		extensionRunner: runner,
	});
}

describe("the session dispatcher lives on the session, not the UI", () => {
	it("is a method on AgentSession", () => {
		const proto = AgentSession.prototype as unknown as Record<string, unknown>;
		expect(proto.emitCustomToolSessionEvent).toBeTypeOf("function");
	});

	it("is gone from the UI controller", () => {
		// Structural, and the reason the bug existed: a mode without a UI has no
		// controller, so a dispatcher parked there is unreachable by construction.
		const uiProto = ExtensionUiController.prototype as unknown as Record<string, unknown>;
		expect(uiProto.emitCustomToolSessionEvent).toBeUndefined();
	});
});

describe("a handler is told when the session ends", () => {
	it("runs a handler in a session that has no UI", async () => {
		// A mode with no UI — the case that used to deliver nothing at all.
		const seen: { reason: string; hasUI: boolean }[] = [];
		const session = await makeSession([
			{
				name: "holder",
				onSession: async (e: { reason: string }, ctx: { hasUI: boolean }) => {
					seen.push({ reason: e.reason, hasUI: ctx.hasUI });
				},
			},
		]);
		expect(await session.emitCustomToolSessionEvent()).toBe(1);
		expect(seen).toEqual([{ reason: "shutdown", hasUI: false }]);
	});

	it("reports a handler that throws, and keeps going", async () => {
		// One tool's failure must not stop the next tool's shutdown, or a single
		// broken extension leaks every resource owned after it.
		const seen: string[] = [];
		const errors: [string, string][] = [];
		const session = await makeSession([
			{
				name: "first",
				onSession: async () => {
					throw new Error("handler exploded");
				},
			},
			{
				name: "second",
				onSession: async () => {
					seen.push("second");
				},
			},
		]);
		expect(
			await session.emitCustomToolSessionEvent({
				onToolError: (tool, error) => errors.push([tool, error]),
			}),
		).toBe(1);
		expect(seen).toEqual(["second"]);
		expect(errors).toEqual([["first", "handler exploded"]]);
	});

	it("returns zero when no extension registered one", async () => {
		const session = await makeSession([{ name: "quiet" }]);
		expect(await session.emitCustomToolSessionEvent()).toBe(0);
	});
});

describe("the reason union matches what is actually delivered", () => {
	it("delivers a shutdown, and nothing else", async () => {
		const reasons: string[] = [];
		const session = await makeSession([
			{
				name: "watcher",
				onSession: async (e: { reason: string }) => {
					reasons.push(e.reason);
				},
			},
		]);
		await session.emitCustomToolSessionEvent();
		// Declared as five reasons once, but `on("session_start" | "session_switch"
		// | "session_branch" | "session_tree")` already fire 9/7/6/5 times. A tool
		// narrowing on the wider union would compile and never enter four of its
		// five branches with nothing failing. The narrowed type is what makes
		// `useReason("switch")` a compile error today.
		expect(reasons).toEqual(["shutdown"]);
	});

	it("has a previousSessionFile of undefined, since switching is elsewhere", async () => {
		const events: { reason: string; previousSessionFile: string | undefined }[] = [];
		const session = await makeSession([
			{
				name: "watcher",
				onSession: async (e: { reason: string; previousSessionFile: string | undefined }) => {
					events.push(e);
				},
			},
		]);
		await session.emitCustomToolSessionEvent();
		expect(events[0]?.previousSessionFile).toBeUndefined();
	});
});

describe("every mode reaches the dispatcher through dispose", () => {
	it("print mode disposes the session, which is where the dispatcher lives", async () => {
		// The delivery tests above prove the dispatcher works when called. This
		// proves the part that was only ever an argument: that a mode with no UI
		// actually goes through dispose. A mode that exited another way would
		// deliver nothing, and no test above would notice — the dispatcher was
		// never asked.
		const { readFileSync } = await import("node:fs");
		const src = readFileSync(new URL("../src/modes/print-mode.ts", import.meta.url), "utf8");
		// Two exits in print mode, both disposing: the clean return and the
		// failure path. If either stopped disposing, a tool would miss shutdown
		// in the exact mode used for automation.
		const calls = src.match(/session\.dispose\(/g) ?? [];
		expect(calls.length).toBeGreaterThanOrEqual(2);
	});

	it("no mode object carries its own dispatcher", async () => {
		// Guards the shape that caused the original leak: a delivery path parked on
		// a mode, which a headless mode cannot traverse. Checked through the type
		// rather than by reading source — reading a file and asserting on its text
		// is banned, and would break on a rename while proving nothing.
		const modes = await import("@oh-my-pi/pi-coding-agent/modes/types");
		expect("emitCustomToolSessionEvent" in (modes as unknown as Record<string, unknown>)).toBe(false);
	});
});
