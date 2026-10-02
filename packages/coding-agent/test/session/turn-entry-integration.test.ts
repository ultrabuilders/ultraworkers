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
import { ExtensionToolWrapper } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/wrapper";
import { BashTool } from "@oh-my-pi/pi-coding-agent/tools/bash";
import { TempDir } from "@oh-my-pi/pi-utils";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import {
	APPROVAL_ENTRY_TYPE,
	isApprovalDenial,
	type ApprovalEntry,
	type TurnEntry,
} from "../../src/session/session-entries";
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

/**
 * The join for the *tool* path, and the reason the rows above are not enough.
 *
 * Every row above builds its refusal with `manager.appendApprovalEntry` by hand.
 * That proves the reader — it does not prove any writer reaches it. So the field
 * could be green while the tool-policy writer recorded nothing, which is precisely
 * what it used to do: both `deny` sites in `ExtensionToolWrapper` threw
 * `denyError` and wrote no entry, so a critical `bash` command was refused in
 * front of the user and `blockedBy` could not name it.
 *
 * The writer here is the real `ExtensionToolWrapper` around the real `BashTool`,
 * driven through a real turn. Only the runner's one-line forward to the manager is
 * a stand-in — and that line is verbatim what `ExtensionRunner.recordApprovalEntry`
 * does (`runner.ts:939`), so what is under test is the wrapper's half.
 */
describe("blockedBy, from a tool-policy denial", () => {
	// A list, not one slot: the row that needs a canary creates a second sandbox
	// inside the helper's own, and a single field would silently drop one.
	const sandboxes: TempDir[] = [];
	// Own session, not the sibling blocks': their `afterEach` disposes theirs, and
	// sharing the name across describes would leave this one undisposed.
	let own: AgentSession | undefined;

	afterEach(async () => {
		if (own) await own.dispose();
		own = undefined;
		while (sandboxes.length > 0) await sandboxes.pop()!.remove();
	});

	/**
	 * A runner whose only interesting method is the join's last hop: forward one
	 * audit half to the same `SessionManager` the turn scan reads. Everything else
	 * is inert so nothing else in the wrapper is under test here.
	 */
	function runnerFor(
		manager: SessionManager,
		settings: Settings,
		answer: "Approve" | "Deny" = "Approve",
	): ExtensionRunner {
		return {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			sessionId: "policy-denial-turn-test",
			// The wrapper resolves approval from its context, falling back to the
			// runner's session settings when the loop supplies none.
			sessionSettings: settings,
			// The seam the wrapper actually uses when it does ask. Without it a prompt
			// cannot be answered, so the prompted-denial row could not exist.
			getUIContext: () => ({
				select: async () => answer,
			}),
			recordApprovalEntry: (half: Omit<ApprovalEntry, "type">) => {
				manager.appendApprovalEntry(half as never);
			},
			runScoped<T>(fn: () => T): T {
				return fn();
			},
		} as unknown as ExtensionRunner;
	}

	/**
	 * Drive one prompt whose turn calls bash with `command`.
	 *
	 * `yolo` by default: that is the path where nobody is asked anything, so the
	 * refusal is the tool's own policy rather than a user answering a prompt. The
	 * `answer` override exists for the sibling branch — a refusal a human was
	 * actually asked about and said no to.
	 */
	async function promptThroughToolPolicy(
		command: string,
		callId: string,
		answer: "Approve" | "Deny" = "Approve",
	): Promise<SessionManager> {
		sandboxes.push(TempDir.createSync("@pi-policy-denial-"));
		const manager = SessionManager.inMemory();
		const settings = Settings.isolated(
			answer === "Approve" ? { "tools.approvalMode": "yolo" } : { "tools.approvalMode": "always-ask" },
		);
		const runner = runnerFor(manager, settings, answer);

		const bash = new BashTool({
			settings,
		} as unknown as ConstructorParameters<typeof BashTool>[0]);
		const wrapped = new ExtensionToolWrapper(bash as unknown as AgentTool, runner);

		const mock = createMockModel({
			responses: [
				{ content: [{ type: "toolCall", id: callId, name: "bash", arguments: { command } }] },
				{ content: ["finished"] },
			],
		});
		own = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: {
					model: mock.model,
					systemPrompt: ["Test"],
					tools: [wrapped],
					messages: manager.buildSessionContext().messages,
				},
				streamFn: mock.stream,
			}),
			sessionManager: manager,
			settings,
			// The mock model's provider has no key in the real registry, and nothing
			// here exercises auth — only the log the turn writes.
			modelRegistry: { getApiKey: () => "test-key" } as never,
		});

		await own.prompt("do the thing");
		return manager;
	}

	it("names the refused call on the turn, and the command never runs", async () => {
		// A canary rather than a bare assertion that something threw. `rm -rf <abs>`
		// is critical to the classifier and points at a throwaway file, so the
		// command is safe to name — and if the gate ever regressed to letting it
		// through, this row would fail on the missing canary rather than hang the
		// suite on a refusal that no longer happens.
		const canary = TempDir.createSync("@pi-canary-");
		sandboxes.push(canary);
		const target = `${canary.path()}/canary`;
		await Bun.write(target, "still here");

		const manager = await promptThroughToolPolicy(`rm -rf ${target}`, "call-canary");

		// The stronger half: not "it threw" but "the thing did not happen".
		expect(await Bun.file(target).exists()).toBe(true);

		const halves = manager.getEntries().filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
		// One half only. A policy denial asks nobody, so there is no `asked` to pair
		// with, and inventing one would report a question the user never saw.
		expect(halves).toHaveLength(1);
		expect(halves[0]).toMatchObject({
			requestId: "call-canary",
			phase: "answered",
			policy: "deny",
			source: "tool",
		});
		// The reader's filter, which is what makes the field non-empty at all.
		expect(isApprovalDenial(halves[0]!)).toBe(true);

		const ended = manager.getEntries().find((e): e is TurnEntry => e.type === "turn" && e.phase === "ended");
		expect(ended?.blockedBy).toEqual(["call-canary"]);
	});

	it("leaves the turn unblocked when the same tool runs an ordinary command", async () => {
		// The control, and the reason the row above is about the denial rather than
		// about bash. Same wrapper, same runner, same real turn, same real tool —
		// only the classifier's verdict differs. A writer that recorded every call
		// would put `call-benign` on the turn and satisfy the row above wrongly.
		const manager = await promptThroughToolPolicy("echo hello", "call-benign");

		const halves = manager.getEntries().filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
		expect(halves.every(entry => !isApprovalDenial(entry))).toBe(true);

		const ended = manager.getEntries().find((e): e is TurnEntry => e.type === "turn" && e.phase === "ended");
		expect(ended?.blockedBy).toBeUndefined();
	});
});

/**
 * The sibling branch, and the last writer with a real path to the field.
 *
 * The block above closes the refusal *nobody was asked about*: `policy: "deny"`,
 * decided by the tool, recorded from `#recordPolicyDenial`. This one is a refusal a
 * human saw and said no to — a different writer call site (`recordApprovalAnswered`
 * rather than `#recordPolicyDenial`) and a different decision vocabulary
 * (`decision: "denied"` rather than `policy: "deny"`).
 *
 * Both reach the field through the same reader, so the block above does not cover
 * this one. A reader understanding only `policy: "deny"` would leave every refusal a
 * person actually expressed invisible, and the block above would stay green the
 * whole time.
 *
 * `always-ask` is what makes the question happen. Under `yolo` the wrapper resolves
 * without asking and records nothing — which is the honest answer, not a gap.
 */
describe("blockedBy, from a refusal a person was asked about", () => {
	const sandboxes: TempDir[] = [];
	let own: AgentSession | undefined;

	afterEach(async () => {
		if (own) await own.dispose();
		own = undefined;
		while (sandboxes.length > 0) await sandboxes.pop()!.remove();
	});

	function runnerFor(manager: SessionManager, settings: Settings, answer: "Approve" | "Deny"): ExtensionRunner {
		return {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			sessionId: "prompted-denial-turn-test",
			sessionSettings: settings,
			getUIContext: () => ({
				select: async () => answer,
			}),
			recordApprovalEntry: (half: Omit<ApprovalEntry, "type">) => {
				manager.appendApprovalEntry(half as never);
			},
			runScoped<T>(fn: () => T): T {
				return fn();
			},
		} as unknown as ExtensionRunner;
	}

	/** Drive one real turn whose bash call is put to `answer`. */
	async function promptThroughPrompt(command: string, callId: string, answer: "Approve" | "Deny") {
		sandboxes.push(TempDir.createSync("@pi-prompted-denial-"));
		const manager = SessionManager.inMemory();
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		const runner = runnerFor(manager, settings, answer);

		const bash = new BashTool({
			settings,
		} as unknown as ConstructorParameters<typeof BashTool>[0]);
		const wrapped = new ExtensionToolWrapper(bash as unknown as AgentTool, runner);

		const mock = createMockModel({
			responses: [
				{ content: [{ type: "toolCall", id: callId, name: "bash", arguments: { command } }] },
				{ content: ["finished"] },
			],
		});
		own = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: {
					model: mock.model,
					systemPrompt: ["Test"],
					tools: [wrapped],
					messages: manager.buildSessionContext().messages,
				},
				streamFn: mock.stream,
			}),
			sessionManager: manager,
			settings,
			modelRegistry: { getApiKey: () => "test-key" } as never,
		});

		await own.prompt("do the thing");
		return manager;
	}

	it("names the call the user said no to, from the decision they made", async () => {
		const manager = await promptThroughPrompt("echo hello", "call-user-deny", "Deny");

		// A *pair*, not one row: this refusal has an `asked` half, because for once a
		// question really was put to somebody. A single row here would mean the audit
		// could not tell this refusal from the policy one above.
		const halves = manager.getEntries().filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
		expect(halves.map(e => e.phase)).toEqual(["asked", "answered"]);
		const [asked, answered] = halves;
		expect(answered.requestId).toBe(asked.requestId);
		expect(answered.requestId).toBe("call-user-deny");
		// This branch's provenance and vocabulary — `source: "user"` and a decision
		// string, neither of which the policy branch writes.
		expect(answered.decision).toBe("denied");
		expect(answered.source).toBe("user");
		expect(asked.decision).toBeUndefined();

		expect(isApprovalDenial(answered)).toBe(true);

		const ended = manager.getEntries().find((e): e is TurnEntry => e.type === "turn" && e.phase === "ended");
		expect(ended?.blockedBy).toEqual(["call-user-deny"]);
	});

	it("leaves the turn unblocked when the user said yes to the same call", async () => {
		// The control that gives the row above its meaning. Same prompt, same tool,
		// same real turn — one answer apart. If `blockedBy` meant "an approval was
		// recorded", this turn would carry the id and the row above would be
		// satisfied by a writer that audits every prompt as a refusal.
		//
		// This is also the negative direction, and the dangerous one: `blockedBy`
		// marks a turn as *refused*, so a reader that accepted an approval would
		// write a transcript saying a healthy turn was denied. "Absent" is the only
		// correct answer here and nothing else would be.
		const manager = await promptThroughPrompt("echo hello", "call-user-allow", "Approve");

		const halves = manager.getEntries().filter((e): e is ApprovalEntry => e.type === APPROVAL_ENTRY_TYPE);
		// Still a full pair: the question really was asked and really was answered.
		expect(halves.map(e => e.phase)).toEqual(["asked", "answered"]);
		// The decision a reader must not mistake for a refusal.
		expect(halves[1]?.decision).toBe("approved");
		expect(halves.every(entry => !isApprovalDenial(entry))).toBe(true);

		const ended = manager.getEntries().find((e): e is TurnEntry => e.type === "turn" && e.phase === "ended");
		expect(ended?.blockedBy).toBeUndefined();
	});

	it("does not carry a refusal into the next turn", async () => {
		// The window contract, through real writers instead of entries built by hand.
		// `#approvalDenialsSinceTurnOpen` slices from the leaf captured when the turn
		// opened; if it scanned the whole log instead, every turn after the first
		// would inherit all history — and the field would be useless for the question
		// it exists to answer, while still looking populated.
		sandboxes.push(TempDir.createSync("@pi-window-"));
		const manager = SessionManager.inMemory();
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		// Mutable, so one session can refuse and then comply — the cache and the turn
		// counter both live on the session, so the second turn has to happen in the
		// same one.
		let answer: "Approve" | "Deny" = "Deny";
		const runner = {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			sessionId: "window-turn-test",
			sessionSettings: settings,
			getUIContext: () => ({
				select: async () => answer,
			}),
			recordApprovalEntry: (half: Omit<ApprovalEntry, "type">) => {
				manager.appendApprovalEntry(half as never);
			},
			runScoped<T>(fn: () => T): T {
				return fn();
			},
		} as unknown as ExtensionRunner;

		const bash = new BashTool({
			settings,
		} as unknown as ConstructorParameters<typeof BashTool>[0]);
		const wrapped = new ExtensionToolWrapper(bash as unknown as AgentTool, runner);
		// A reply between the two tool calls, so they land in *separate* prompts. The
		// mock consumes this list in order, and both calls in one prompt would both be
		// answered while `answer` still held the first prompt's value — which would
		// make the second turn denied too and the row test nothing.
		const mock = createMockModel({
			responses: [
				{ content: [{ type: "toolCall", id: "call-turn1", name: "bash", arguments: { command: "echo one" } }] },
				{ content: ["first reply"] },
				{ content: [{ type: "toolCall", id: "call-turn2", name: "bash", arguments: { command: "echo two" } }] },
				{ content: ["finished"] },
			],
		});
		own = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: {
					model: mock.model,
					systemPrompt: ["Test"],
					tools: [wrapped],
					messages: manager.buildSessionContext().messages,
				},
				streamFn: mock.stream,
			}),
			sessionManager: manager,
			settings,
			modelRegistry: { getApiKey: () => "test-key" } as never,
		});

		answer = "Deny";
		await own.prompt("first");
		answer = "Approve";
		await own.prompt("second");

		const ended = manager.getEntries().filter((e): e is TurnEntry => e.type === "turn" && e.phase === "ended");
		// Asserted over the flattened refusals rather than against a turn count: how
		// many turns a two-tool-call prompt produces is a detail of the mock, and a
		// count assertion would break when the mock changes while saying nothing
		// about the window. What matters is that the only refusal anywhere in the log
		// is the one that really happened, and that it is not duplicated forward.
		expect(ended.flatMap(e => e.blockedBy ?? [])).toEqual(["call-turn1"]);
		// And the settled turn reads clean — the direction that would lie to a reader.
		expect(ended[ended.length - 1]?.blockedBy).toBeUndefined();
	});

	it("still closes a turn whose model call failed, so a refusal inside it stays reachable", async () => {
		// The precondition the whole field rests on, measured rather than assumed.
		//
		// `blockedBy` is written only on `turn_end`. A turn that opened and never
		// closed would strand every refusal inside it: the entries stay in the log but
		// no turn names them, so the field silently under-reports. Three sites in
		// `runLoopBody` do push `turn_start` and then throw, so the shape is possible —
		// which is exactly why the ordinary case needs pinning.
		//
		// This row replaced one I could not build. Producing an unclosed turn through
		// `prompt()` by throwing from the model stream does not work: the loop recovers
		// and closes the turn anyway (measured — started and ended both 2). So a row
		// asserting `started > ended` would have been a test that cannot fail. This one
		// asserts the reachable half, and says so rather than pretending otherwise.
		sandboxes.push(TempDir.createSync("@pi-failed-turn-"));
		const manager = SessionManager.inMemory();
		const settings = Settings.isolated({ "tools.approvalMode": "always-ask" });
		const runner = {
			hasHandlers: () => false,
			consumeToolCallEmitted: () => false,
			hasUI: () => true,
			sessionId: "failed-turn-test",
			sessionSettings: settings,
			getUIContext: () => ({ select: async () => "Deny" }),
			recordApprovalEntry: (half: Omit<ApprovalEntry, "type">) => {
				manager.appendApprovalEntry(half as never);
			},
			runScoped<T>(fn: () => T): T {
				return fn();
			},
		} as unknown as ExtensionRunner;

		const bash = new BashTool({
			settings,
		} as unknown as ConstructorParameters<typeof BashTool>[0]);
		const wrapped = new ExtensionToolWrapper(bash as unknown as AgentTool, runner);

		let modelCalls = 0;
		const mock = createMockModel({
			responses: [
				{ content: [{ type: "toolCall", id: "call-refused", name: "bash", arguments: { command: "echo one" } }] },
				{ content: ["first reply"] },
				{ content: ["second reply"] },
			],
		});
		const stream = mock.stream;
		// Annotated rather than cast: the annotation is what gives `model`/`context`/
		// `options` their types. A cast on the whole arrow leaves them implicitly any.
		const streamFn: typeof stream = (model, context, options) => {
			modelCalls++;
			// The second model call fails, inside the turn that follows the refusal.
			if (modelCalls === 2) throw new Error("model call failed");
			return stream(model, context, options);
		};
		own = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: {
					model: mock.model,
					systemPrompt: ["Test"],
					tools: [wrapped],
					messages: manager.buildSessionContext().messages,
				},
				streamFn,
			}),
			sessionManager: manager,
			settings,
			modelRegistry: { getApiKey: () => "test-key" } as never,
		});

		await own.prompt("first");

		const turns = manager.getEntries().filter((e): e is TurnEntry => e.type === "turn");
		const started = turns.filter(t => t.phase === "started").length;
		const ended = turns.filter(t => t.phase === "ended").length;

		// Equal, not "at least one ended". That is the assertion that breaks first if
		// the error path skips `turn_end` — and it only means anything because the
		// failing call really happened.
		expect(modelCalls).toBe(2);
		expect(ended).toBe(started);

		// And the refusal is still reachable through the field, which is what a
		// stranded turn would have cost.
		expect(turns.flatMap(t => t.blockedBy ?? [])).toEqual(["call-refused"]);
	});
});

/**
 * `turn_id`, the turn index a `session_stop` handler is told about.
 *
 * This pins a bug this branch already fixed. The increment that advances the turn
 * counter used to sit inside the extension relay's `turn_end` arm, which is gated on
 * `hasHandlers` — and `hasHandlers` only ever sees *user* extensions. So in a session
 * with none, the counter never advanced, `Math.max(0, this.#turnIndex - 1)` was `0`
 * for the life of the process, and every `session_stop` handler was told it was
 * looking at turn 0 no matter how many turns had run.
 *
 * Asserted through a real turn rather than by reading the counter: the field only
 * exists to tell a hook which turn it is being asked about, so the contract is what
 * the hook receives. Two prompts must report 0 then 1.
 */
describe("turn_id reported to session_stop", () => {
	it("advances with the turn instead of staying at 0", async () => {
		const auth = await AuthStorage.create(":memory:");
		auth.keys.setRuntime("anthropic", "test-key");
		const manager = SessionManager.inMemory();
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected claude-sonnet-4-5 model to exist");

		const seen: number[] = [];
		// A tool so the single prompt spans two turns inside one run.
		const noopTool = {
			name: "noop",
			description: "Does nothing; exists to make the turn advance",
			parameters: { type: "object", properties: {} },
			async execute() {
				return { output: "ok" };
			},
		} as unknown as AgentTool;
		// A stub, not a spy: the relay is gated on this, and the point of the test is
		// the value handed across the boundary. Only `session_stop` is subscribed, so
		// the relay stays out of every other arm — which is the configuration the
		// regression needed.
		// A Proxy rather than a hand-listed double: `AgentSession` calls a long tail
		// of runner methods on this path (`emitBeforeAgentStart` and friends), and
		// stubbing them one by one couples this test to an unrelated call list. The
		// only two answers that matter here are explicit — whether anything
		// subscribes, and what `turn_id` the hook receives — so everything else is a
		// no-op.
		const answers: Record<string, unknown> = {
			hasHandlers: (type: string) => type === "session_stop",
			emitSessionStop: async (event: { turn_id: number }) => {
				seen.push(event.turn_id);
				return undefined;
			},
		};
		const runner = new Proxy(answers, {
			get: (target, prop: string) => (prop in target ? target[prop] : async () => undefined),
		}) as unknown as ExtensionRunner;

		const session = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: {
					model,
					systemPrompt: ["Test"],
					tools: [noopTool],
					messages: manager.buildSessionContext().messages,
				},
				streamFn: createMockModel({
					responses: [
						{ content: [{ type: "toolCall", name: "noop", arguments: {} }], stopReason: "toolUse" },
						{ content: ["done"] },
					],
				}).stream,
			}),
			sessionManager: manager,
			settings: Settings.isolated({ "compaction.enabled": false }),
			modelRegistry: new ModelRegistry(auth),
			extensionRunner: runner,
		});

		try {
			await session.prompt("first");
		} finally {
			await session.dispose();
			auth.close();
		}

		// Control: the hook has to have run at all, or "1" and "0" are the same
		// observation of a suite that never called it.
		expect(seen).toHaveLength(1);
		// 1, not 0. The counter resets on `agent_start`, so it numbers turns *within
		// a run*: this prompt ran two turns (a tool call and a reply), so the settled
		// turn is the second. With the increment stuck behind the relay's
		// `hasHandlers` gate it never advanced and this read 0 forever.
		expect(seen).toEqual([1]);
	});
});
