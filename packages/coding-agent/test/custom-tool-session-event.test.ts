import { describe, expect, it, vi } from "bun:test";
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

/**
 * Constructing a session means a real ExtensionRunner, model registry and
 * extension load, and the suite needed five. Memoised on the tool definitions, so
 * the cases that share tools build once and the per-test cost is only for the
 * ones that genuinely differ.
 */
const sessionCache = new Map<string, Promise<AgentSession>>();

async function makeSession(defs: { name: string; onSession?: unknown }[]): Promise<AgentSession> {
	const key = JSON.stringify(defs.map(d => [d.name, typeof d.onSession === "function" || undefined]));
	let hit = sessionCache.get(key);
	if (!hit) {
		hit = buildSession(defs);
		sessionCache.set(key, hit);
	}
	return hit;
}

async function buildSession(defs: { name: string; onSession?: unknown }[]): Promise<AgentSession> {
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
		// Proved by running print mode, not by reading it. The previous version
		// counted the *string* `session.dispose(` in print-mode.ts: banned by
		// AGENTS.md, and it broke on a pure rename — adding `const sess = session`
		// and calling `sess.dispose(…)` took it red with behaviour unchanged.
		//
		// The delivery tests above prove the dispatcher works when called. This
		// proves the part that was only ever an argument: that a mode with no UI
		// reaches dispose at all. A mode that exited another way would deliver
		// nothing, and no test above would notice.
		const { createDelayedSession, makeAssistantMessage } = await import("./helpers/print-mode");
		const { runPrintMode } = await import("@oh-my-pi/pi-coding-agent/modes/print-mode");

		// Print mode writes to the real stdout/stderr otherwise.
		// Print mode's spinner drives an explicit flush by passing a callback as
		// the last write() argument. A mock that swallows it never resolves, so
		// print mode waits forever — which reads as a timeout in the code under
		// test rather than in the mock.
		const flush = (_chunk: unknown, ...rest: unknown[]) => {
			const last = rest[rest.length - 1];
			if (typeof last === "function") (last as () => void)();
			return true;
		};
		const stdout = vi.spyOn(process.stdout, "write").mockImplementation(flush);
		const stderr = vi.spyOn(process.stderr, "write").mockImplementation(flush);
		try {
			const delayed = createDelayedSession(makeAssistantMessage("done"));
			const run = runPrintMode(delayed.session, { mode: "text", initialMessage: "hello" });
			await delayed.promptStarted;
			delayed.resolvePrompt();
			await run;

			// Both exits must tear down: the clean return and the failure path. If
			// either stopped disposing, a tool would miss shutdown in the exact mode
			// used for automation.
			expect(delayed.getDisposeCalls()).toBeGreaterThanOrEqual(1);
		} finally {
			stdout.mockRestore();
			stderr.mockRestore();
		}
	});

	it("print mode also disposes when a signal tears the run down", async () => {
		// The second exit. Print mode registers a postmortem teardown so SIGINT /
		// SIGTERM / SIGHUP dispose the session instead of dropping it; without this
		// row, deleting that registration keeps the suite green.
		//
		// Driven through the real `postmortem.cleanup()` — a keep-alive pass, so it
		// runs every registered teardown and re-arms rather than exiting, which is
		// what makes it safe to call from a test at all.
		const { createDelayedSession, makeAssistantMessage } = await import("./helpers/print-mode");
		const { runPrintMode } = await import("@oh-my-pi/pi-coding-agent/modes/print-mode");
		const { postmortem } = await import("@oh-my-pi/pi-utils");

		const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
		try {
			const delayed = createDelayedSession(makeAssistantMessage("done"));
			const run = runPrintMode(delayed.session, { mode: "text", initialMessage: "hello" });
			await delayed.promptStarted;

			// The turn is parked on the prompt, so the teardown is registered but
			// nothing else has disposed yet. Firing the pass is the signal exit.
			expect(delayed.getDisposeCalls()).toBe(0);
			await postmortem.cleanup();

			expect(delayed.getDisposeCalls()).toBeGreaterThanOrEqual(1);

			delayed.resolvePrompt();
			// The run is deliberately not awaited here: the keep-alive pass already
			// fired the teardown, and print mode's own exit path is the subject of
			// the row above, not this one. Leaving it parked would leak a pending
			// promise into later files, so it is raced to settle-or-timeout instead.
			await Promise.race([run, Bun.sleep(1000)]);
		} finally {
			stdout.mockRestore();
			stderr.mockRestore();
		}
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
