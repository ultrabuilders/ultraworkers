/**
 * The durable turn record, observed through a real turn.
 *
 * `turn-entry.test.ts` pins the entry's *shape*; this file pins that something
 * *writes* it. The gap between those is the whole reason this file exists: with
 * only the shape test, deleting the `appendTurnEntry` call from the `turn_start`
 * arm of `AgentSession` leaves the suite green, because a hand-built object
 * literal cannot tell whether the host ever persisted one.
 *
 * What a consumer observes, and what breaks if it regresses:
 *
 * 1. One prompt produces a *pair* of entries — `started` then `ended` — sharing
 *    one `turnIndex`. A record written only on close would produce one, and a
 *    turn cut short by a thrown hook would produce none at all: three sites in
 *    `runLoopBody` push `turn_start` and then throw, so `turn_end` never follows.
 * 2. The pair is ordered, so a reader can reconstruct the turn's extent rather
 *    than just see that two rows exist.
 * 3. `turnIndex` advances across turns, which is what makes the record a
 *    *sequence* and not two unlinked facts.
 *
 * The negative half — a turn must never reach LLM context — is asserted here
 * too rather than only in the shape test, because this is the path that actually
 * writes the entry and the one a future change would plausibly break.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { Agent } from "@oh-my-pi/pi-agent-core";
import { createMockModel } from "@oh-my-pi/pi-ai/providers/mock";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import type { TurnEntry } from "../../src/session/session-entries";
import { isTranscriptEntry } from "../../src/session/session-context";

describe("durable turn entries, written by a real turn", () => {
	let session: AgentSession | undefined;
	let manager: SessionManager;
	let authStorage: AuthStorage | undefined;

	beforeEach(async () => {
		authStorage = await AuthStorage.create(":memory:");
		authStorage.keys.setRuntime("anthropic", "test-key");
		manager = SessionManager.inMemory();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		if (session) await session.dispose();
		session = undefined;
		authStorage?.close();
		authStorage = undefined;
	});

	/**
	 * One assistant reply per prompt, no tool calls, so each turn opens and closes.
	 *
	 * `onModelCall` runs while the turn is open — the model call is the one point
	 * guaranteed to be inside a turn — so a test can put something in the log
	 * between `turn_start` and `turn_end` without reaching into the session.
	 */
	function createSession(responses: number, onModelCall?: () => void): AgentSession {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected claude-sonnet-4-5 model to exist");
		const modelRegistry = new ModelRegistry(authStorage!);
		const mockStream = createMockModel({
			responses: Array.from({ length: responses }, (_, i) => ({ content: [`Reply ${i}`] })),
		}).stream;
		const streamFn: typeof mockStream = (streamModel, context, options) => {
			onModelCall?.();
			return mockStream(streamModel, context, options);
		};
		const agent = new Agent({
			getApiKey: () => "test-key",
			initialState: {
				model,
				systemPrompt: ["Test"],
				tools: [],
				messages: manager.buildSessionContext().messages,
			},
			streamFn,
		});
		session = new AgentSession({
			agent,
			sessionManager: manager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			modelRegistry,
		});
		return session;
	}

	function turnEntries(): TurnEntry[] {
		return manager.getEntries().filter((e): e is TurnEntry => e.type === "turn");
	}

	it("records both halves of a turn, in order, under one index", async () => {
		createSession(1);
		await session!.prompt("hello");

		const turns = turnEntries();
		// Exactly two, not "at least one": the `ended` half alone would satisfy a
		// weaker assertion, and that is precisely the state this file must reject.
		expect(turns.map(t => t.phase)).toEqual(["started", "ended"]);
		expect(turns[0]!.turnIndex).toBe(turns[1]!.turnIndex);
	});

	it("advances the index between turns so the log reads as a sequence", async () => {
		createSession(2);
		await session!.prompt("first");
		await session!.prompt("second");

		const indices = turnEntries().map(t => t.turnIndex);
		expect(indices).toEqual([0, 0, 1, 1]);
	});

	it("keeps a written turn entry out of LLM context", async () => {
		createSession(1);
		await session!.prompt("hello");

		// Asserted on entries this turn actually produced, not on a literal: the
		// point is that the *persisted* row is invisible to the model.
		for (const entry of turnEntries()) {
			expect(isTranscriptEntry(entry as never)).toBe(false);
		}
		expect(turnEntries().length).toBeGreaterThan(0);
	});
});

/**
 * `blockedBy` — which approvals were refused while a turn was open.
 *
 * The field is the bead's reason for existing ("ghi durable turn khi bị chặn"), and
 * a declared field with a type and a docblock is a `static echo` until something
 * writes it. These drive a real `AgentSession` and read the real log.
 *
 * "Refused while the turn was open", not "cut the turn short": a rejected tool call
 * does not end a turn — the model takes the rejection and continues — so the causal
 * reading is not observable and asserting it would pin a claim nothing can check.
 */
describe("blockedBy, read back off a real turn", () => {
	let session: AgentSession | undefined;
	let manager: SessionManager;
	let authStorage: AuthStorage | undefined;

	beforeEach(async () => {
		authStorage = await AuthStorage.create(":memory:");
		authStorage.keys.setRuntime("anthropic", "test-key");
		manager = SessionManager.inMemory();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		if (session) await session.dispose();
		session = undefined;
		authStorage?.close();
		authStorage = undefined;
	});

	function createSession(responses: number, onModelCall?: () => void): AgentSession {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected claude-sonnet-4-5 model to exist");
		const modelRegistry = new ModelRegistry(authStorage!);
		const mockStream = createMockModel({
			responses: Array.from({ length: responses }, (_, i) => ({ content: [`Reply ${i}`] })),
		}).stream;
		const streamFn: typeof mockStream = (streamModel, context, options) => {
			onModelCall?.();
			return mockStream(streamModel, context, options);
		};
		session = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: {
					model,
					systemPrompt: ["Test"],
					tools: [],
					messages: manager.buildSessionContext().messages,
				},
				streamFn,
			}),
			sessionManager: manager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			modelRegistry,
		});
		return session;
	}

	/**
	 * A session whose turn calls a tool, so the test can act *inside* the turn.
	 *
	 * The model call is not a usable seam here, and that was measured rather than
	 * assumed: it runs before `turn_start` is emitted (`modelCall -> turn:started
	 * -> turn:ended`), so anything appended there lands before the turn's window
	 * opens. Tool execution is the one point guaranteed to sit between `turn_start`
	 * and `turn_end`.
	 */
	function createSessionWithTool(onToolExecute: () => void): AgentSession {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected claude-sonnet-4-5 model to exist");
		const modelRegistry = new ModelRegistry(authStorage!);
		const tool: AgentTool = {
			name: "dangerous",
			description: "Records an approval refusal while the turn is open",
			parameters: { type: "object", properties: {} },
			async execute() {
				onToolExecute();
				return { output: "done" };
			},
		} as unknown as AgentTool;
		const mock = createMockModel({
			responses: [
				{ content: [{ type: "toolCall", name: "dangerous", arguments: {} }], stopReason: "toolUse" },
				{ content: ["finished"] },
			],
		});
		session = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: {
					model,
					systemPrompt: ["Test"],
					tools: [tool],
					messages: manager.buildSessionContext().messages,
				},
				streamFn: mock.stream,
			}),
			sessionManager: manager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			modelRegistry,
		});
		return session;
	}

	/** One refusal, as the writer that produces it: an `asked`/`answered` pair. */
	function refuseApproval(requestId: string, decision = "denied"): void {
		manager.appendApprovalEntry({ requestId, phase: "asked", toolName: "bash" });
		manager.appendApprovalEntry({ requestId, phase: "answered", toolName: "bash", decision });
	}

	function endedTurn(): TurnEntry | undefined {
		return manager.getEntries().find((e): e is TurnEntry => e.type === "turn" && e.phase === "ended");
	}

	it("names the requestIds refused during the turn", async () => {
		createSessionWithTool(() => refuseApproval("call-deny-1"));
		await session!.prompt("run something dangerous");

		expect(endedTurn()?.blockedBy).toEqual(["call-deny-1"]);
	});

	it("records a refusal the gate made, not only a user choice", async () => {
		// A tool-level gate answers with a policy, never an option kind. Both reach
		// the same field, so a filter that only understood the ACP vocabulary would
		// silently drop every gate denial — the case this bead exists for.
		createSessionWithTool(() => {
			manager.appendApprovalEntry({ requestId: "call-gate-1", phase: "asked", toolName: "bash" });
			manager.appendApprovalEntry({
				requestId: "call-gate-1",
				phase: "answered",
				toolName: "bash",
				policy: "deny",
			});
		});
		await session!.prompt("run something dangerous");

		expect(endedTurn()?.blockedBy).toEqual(["call-gate-1"]);
	});

	it("does not attribute an earlier refusal to a later turn", async () => {
		// Recorded before any turn exists, so it sits below the window anchor. If
		// the scan were the whole log, this turn would claim a refusal it never met
		// — and every turn after the first would inherit all history, which is the
		// shape that makes the field useless for the question it exists to answer.
		refuseApproval("call-earlier");
		createSession(1);
		await session!.prompt("hello");

		expect(endedTurn()?.blockedBy).toBeUndefined();
	});

	it("scopes the refusal to the turn that met it, not to the whole log", async () => {
		refuseApproval("call-before");
		let fired = false;
		createSessionWithTool(() => {
			if (fired) return;
			fired = true;
			refuseApproval("call-during");
		});
		await session!.prompt("run something dangerous");

		// Both refusals are in the log; only the one that happened inside the turn
		// belongs to it.
		expect(endedTurn()?.blockedBy).toEqual(["call-during"]);
	});

	it("omits the field on a turn that was never refused", async () => {
		createSession(1);
		await session!.prompt("hello");

		// Absent, not `[]`: an empty array is indistinguishable from a writer that
		// meant to populate it and failed.
		expect(endedTurn()?.blockedBy).toBeUndefined();
	});
});
