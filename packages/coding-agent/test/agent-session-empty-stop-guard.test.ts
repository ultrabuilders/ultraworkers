import { afterAll, afterEach, describe, expect, it, vi } from "bun:test";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { Agent, type AgentMessage, type AgentTool } from "@oh-my-pi/pi-agent-core";
import type { ThinkingContent } from "@oh-my-pi/pi-ai";
import { createMockModel, type MockModel, type MockResponse } from "@oh-my-pi/pi-ai/providers/mock";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { AgentSession, type AgentSessionEvent } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { convertToLlm } from "@oh-my-pi/pi-coding-agent/session/messages";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { TempDir, withTimeout } from "@oh-my-pi/pi-utils";
import { mockSchedulerWaitWithClock } from "./helpers/mock-scheduler-clock";

const recordToolSchema = type({ value: type("string") });

type Harness = {
	session: AgentSession;
	tempDir: TempDir;
};
type SettingsOverrides = Record<string, unknown>;

const activeHarnesses: Harness[] = [];
const sharedDir = TempDir.createSync("@ultraworkers-empty-stop-guard-shared-");
const sharedAuthStorage = await AuthStorage.create(path.join(sharedDir.path(), "auth.db"));
sharedAuthStorage.keys.setRuntime("mock", "test-key");
const sharedModelRegistry = new ModelRegistry(sharedAuthStorage, path.join(sharedDir.path(), "models.yml"));

afterAll(() => {
	sharedAuthStorage.close();
	sharedDir.removeSync();
});

const recordTool: AgentTool<typeof recordToolSchema, { value: string }> = {
	name: "record",
	label: "Record",
	description: "Record a value",
	parameters: recordToolSchema,
	async execute(_toolCallId, params) {
		return {
			content: [{ type: "text", text: `recorded:${params.value}` }],
			details: { value: params.value },
		};
	},
};

function recordCall(value: string, id: string): MockResponse {
	return {
		content: [{ type: "toolCall", id, name: "record", arguments: { value } }],
		stopReason: "toolUse",
	};
}

function emptyStop(): MockResponse {
	return {
		content: [],
		stopReason: "stop",
		usage: { output: 0, cacheRead: 100 },
	};
}

// A zero-block `stop` for which the provider still billed output tokens: content
// was generated and dropped downstream (e.g. a filter/refusal flattened to
// `finish_reason: "stop"` by a proxy), so the context/`/shake images` hint is wrong.
function filteredEmptyStop(): MockResponse {
	return {
		content: [],
		stopReason: "stop",
		usage: { output: 126, cacheRead: 100 },
	};
}

function reasoningOnlyEmptyStop(): MockResponse {
	return {
		content: [],
		stopReason: "stop",
		usage: { output: 126, reasoningTokens: 126, cacheRead: 100 },
	};
}

function orphanedToolUseStop(): MockResponse {
	return {
		content: [{ type: "thinking", thinking: "I should call a tool next." }],
		stopReason: "toolUse",
		usage: { output: 1, cacheRead: 100 },
	};
}

function thinkingOnlyStop(): MockResponse {
	return {
		content: [{ type: "thinking", thinking: "I should inspect the next file." }],
		stopReason: "stop",
		usage: { output: 1, cacheRead: 100 },
	};
}

function emptyProviderResponse(): MockResponse {
	return {
		content: [{ type: "thinking", thinking: "I finished reasoning but omitted the final answer." }],
		stopReason: "error",
		errorMessage: "Cloud Code Assist API returned a thought-only response without final output",
	};
}

function signedThinkingOnlyStop(): MockResponse {
	const content: ThinkingContent = { type: "thinking", thinking: "", thinkingSignature: "nonempty" };
	return {
		content: [content],
		stopReason: "stop",
		usage: { output: 1, cacheRead: 100 },
	};
}

async function createHarness(
	responses: MockResponse[],
	settingsOverrides: SettingsOverrides = {},
	options: {
		persistSession?: boolean;
		extensionRunner?: ExtensionRunner;
		provider?: string;
		id?: string;
	} = {},
): Promise<Harness & { mock: MockModel }> {
	const tempDir = TempDir.createSync("@ultraworkers-empty-stop-guard-");
	const authStorage = sharedAuthStorage;

	const mock = createMockModel({ provider: options.provider, id: options.id, responses });
	authStorage.keys.setRuntime(mock.provider, "test-key");
	const modelRegistry = sharedModelRegistry;
	const settings = Settings.isolated({
		"compaction.enabled": false,
		"retry.enabled": false,
		"todo.enabled": false,
		"todo.eager": "default",
		"todo.reminders": false,
		...settingsOverrides,
	});
	settings.setModelRole("default", `${mock.provider}/${mock.id}`);

	const sessionManager = options.persistSession
		? SessionManager.create(tempDir.path(), tempDir.path())
		: SessionManager.inMemory(tempDir.path());
	const tools = [recordTool as AgentTool];
	const agent = new Agent({
		getApiKey: () => "test-key",
		initialState: {
			model: mock,
			systemPrompt: ["Test"],
			tools,
			messages: [],
		},
		convertToLlm,
		streamFn: mock.stream,
	});

	const session = new AgentSession({
		agent,
		sessionManager,
		settings,
		modelRegistry,
		toolRegistry: new Map(tools.map(tool => [tool.name, tool])),
		extensionRunner: options.extensionRunner,
	});
	const harness = { session, tempDir };
	activeHarnesses.push(harness);
	return { ...harness, mock };
}

function assistantText(messages: AgentMessage[]): string {
	return messages
		.filter((message): message is Extract<AgentMessage, { role: "assistant" }> => message.role === "assistant")
		.flatMap(message => message.content.flatMap(content => (content.type === "text" ? [content.text] : [])))
		.join("\n");
}

function emptyAssistantStops(messages: AgentMessage[]): AgentMessage[] {
	return messages.filter(
		message =>
			message.role === "assistant" &&
			message.stopReason === "stop" &&
			!message.content.some(content => {
				if (content.type === "text") return content.text.trim().length > 0;
				return content.type === "toolCall";
			}),
	);
}
function reminderMessages(messages: AgentMessage[]): AgentMessage[] {
	const isEmptyStopRetryReminder = (text: string): boolean =>
		text.includes("<system-reminder>") || text.includes("<system-injection>");

	return messages.filter(message => {
		if (message.role !== "developer") return false;
		return typeof message.content === "string"
			? isEmptyStopRetryReminder(message.content)
			: message.content.some(content => content.type === "text" && isEmptyStopRetryReminder(content.text));
	});
}

async function expectPromptCompletes(prompt: Promise<boolean>): Promise<void> {
	await withTimeout(prompt, 1_000, "Expected session prompt to settle after empty-stop retry cap");
}

afterEach(async () => {
	for (const harness of activeHarnesses.splice(0)) {
		await harness.session.dispose();
		harness.tempDir.removeSync();
	}
	vi.restoreAllMocks();
});

describe("AgentSession empty stop guard", () => {
	it("retries an empty assistant stop after a tool result", async () => {
		const { session, mock } = await createHarness([
			recordCall("alpha", "call-record-alpha"),
			emptyStop(),
			{ content: ["finished after retry"], stopReason: "stop" },
		]);

		await session.prompt("record alpha");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(3);
		expect(assistantText(session.agent.state.messages)).toContain("finished after retry");
		expect(emptyAssistantStops(session.agent.state.messages)).toHaveLength(0);
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(1);

		const activeBranchMessages = session.sessionManager
			.getBranch()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		expect(emptyAssistantStops(activeBranchMessages)).toHaveLength(0);
		// Deliberately NOT an assertion over `getEntries()`. This used to assert the
		// journal held no empty stop, on the stated belief that a discarded one is
		// "physically removed from the journal, not just reparented off the active
		// branch". `discardEntryDurably` (session-manager.ts:3334) does the opposite
		// on purpose: when a child may carry content the subtree is PRESERVED
		// off-branch behind a marker, because deleting it would lose data. So the
		// assertion contradicted the function it was guarding and could only ever be
		// red — the branch assertion above is the contract. That a discarded stop
		// cannot resurface is a claim about RELOAD, and it is asserted where there is
		// a reload: "does not resurface a discarded empty stop after reloading from
		// disk" at the end of this file.
	});

	it("retries a tool-use stop that has no tool call or text", async () => {
		const { session, mock } = await createHarness([
			recordCall("orphan", "call-record-orphan"),
			orphanedToolUseStop(),
			{ content: ["finished after orphaned tool-use retry"], stopReason: "stop" },
		]);

		await session.prompt("record orphan");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(3);
		expect(assistantText(session.agent.state.messages)).toContain("finished after orphaned tool-use retry");
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(1);
	});

	it("retries a stop that only contains thinking", async () => {
		const { session, mock } = await createHarness([
			recordCall("thinking", "call-record-thinking"),
			thinkingOnlyStop(),
			{ content: ["finished after thinking-only retry"], stopReason: "stop" },
		]);

		await session.prompt("record thinking");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(3);
		expect(assistantText(session.agent.state.messages)).toContain("finished after thinking-only retry");
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(1);
		expect(emptyAssistantStops(session.agent.state.messages)).toHaveLength(0);
	});

	it("continues with an output reminder after a Cloud Code Assist empty response", async () => {
		const { session, mock } = await createHarness([
			emptyProviderResponse(),
			{ content: ["finished after provider-empty retry"], stopReason: "stop" },
		]);

		await session.prompt("finish the response");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(2);
		expect(assistantText(session.agent.state.messages)).toContain("finished after provider-empty retry");
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(1);
		expect(
			session.agent.state.messages.some(message => message.role === "assistant" && message.stopReason === "error"),
		).toBe(false);
	});

	it("caps provider-empty recovery without consuming generic retries and accepts the next prompt", async () => {
		mockSchedulerWaitWithClock();
		const { session, mock } = await createHarness(
			[emptyProviderResponse(), emptyProviderResponse(), emptyProviderResponse(), emptyProviderResponse()],
			{
				"retry.enabled": true,
				"retry.baseDelayMs": 5,
				"retry.maxDelayMs": 5_000,
				"retry.maxRetries": 2,
			},
		);
		const retryStartEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_start" }>> = [];
		const retryEndEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_start") retryStartEvents.push(event);
			if (event.type === "auto_retry_end") retryEndEvents.push(event);
		});

		await expectPromptCompletes(session.prompt("finish the response after reasoning"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(3);
		expect(retryStartEvents).toHaveLength(0);
		expect(retryEndEvents).toHaveLength(1);
		expect(retryEndEvents[0]).toMatchObject({
			type: "auto_retry_end",
			success: false,
			attempt: 3,
		});
		expect(retryEndEvents[0]?.finalError).toContain("no final output");
		expect(session.isRetrying).toBe(false);
		expect(session.retryAttempt).toBe(0);

		mock.push({ content: ["fresh final answer"], stopReason: "stop" });
		await expectPromptCompletes(session.prompt("continue"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(5);
		expect(retryEndEvents).toHaveLength(1);
		expect(session.isRetrying).toBe(false);
		expect(assistantText(session.agent.state.messages)).toContain("fresh final answer");
	});

	it("accepts a signed thinking-only stop without retrying", async () => {
		const { session, mock } = await createHarness([
			signedThinkingOnlyStop(),
			{ content: ["must not be requested"], stopReason: "stop" },
		]);

		await session.prompt("finish with signed thinking");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(1);
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(0);
		expect(session.agent.state.messages.at(-1)?.role).toBe("assistant");
	});

	it("removes orphaned tool-use stops even when retry cap is hit", async () => {
		const { session, mock } = await createHarness([
			recordCall("gamma", "call-record-gamma"),
			orphanedToolUseStop(),
			orphanedToolUseStop(),
			orphanedToolUseStop(),
			orphanedToolUseStop(),
		]);
		await session.prompt("record gamma");
		await session.waitForIdle();
		expect(mock.calls).toHaveLength(5);
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(3);
		const activeBranchMessages = session.sessionManager
			.getBranch()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		const orphanedToolUseStops = activeBranchMessages.filter(
			message =>
				message.role === "assistant" &&
				message.stopReason === "toolUse" &&
				!message.content.some(content => content.type === "toolCall"),
		);
		expect(orphanedToolUseStops).toHaveLength(0);
	});
	it("caps empty stop retries at three attempts and discards the final empty turn", async () => {
		const { session, mock } = await createHarness([
			recordCall("beta", "call-record-beta"),
			emptyStop(),
			emptyStop(),
			emptyStop(),
			emptyStop(),
		]);

		await session.prompt("record beta");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(5);
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(3);
		expect(emptyAssistantStops(session.agent.state.messages)).toHaveLength(0);

		const activeBranchMessages = session.sessionManager
			.getBranch()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		expect(emptyAssistantStops(activeBranchMessages)).toHaveLength(0);

		// The loader reconstructs the active branch from the LAST physical journal
		// entry, so what has to hold is that the last entry is the marker selecting
		// the discarded turn's parent — not that the journal is free of empty stops.
		// This used to assert the latter, on the belief that the empty stop is
		// "removed from history"; `discardEntryDurably` (session-manager.ts:3334)
		// preserves a content-bearing entry off-branch on purpose, so that belief
		// was the opposite of the design and the assertion could only be red. The
		// active-branch assertion above already covers "not on the live path"; the
		// surviving half of the original claim — that RELOAD cannot reactivate it —
		// needs a reload and is asserted in the reload case at the end of this file.
		const lastJournalEntry = session.sessionManager.getEntries().at(-1);
		expect(lastJournalEntry).toMatchObject({
			type: "branch_summary",
			summary: "",
			details: { kind: "discarded-entry-branch" },
		});
	});

	it("does not revive capped empty responses through pending todo reminders", async () => {
		const { session, mock } = await createHarness(
			[
				emptyStop(),
				emptyStop(),
				emptyStop(),
				emptyStop(),
				{ content: ["Which task should I resume?"], stopReason: "stop" },
			],
			{ "todo.enabled": true, "todo.reminders": true, "todo.remindersMax": 3 },
		);
		session.setTodoPhases([
			{ name: "Work", tasks: [{ content: "Finish the pending change", status: "in_progress" }] },
		]);
		const retryEnds: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		const todoReminders: Array<Extract<AgentSessionEvent, { type: "todo_reminder" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_end") retryEnds.push(event);
			if (event.type === "todo_reminder") todoReminders.push(event);
		});

		await expectPromptCompletes(session.prompt("continue the pending task"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(retryEnds).toEqual([expect.objectContaining({ success: false, attempt: 3 })]);
		expect(todoReminders).toEqual([]);

		await session.prompt("I am ready to resume");
		await session.waitForIdle();
		expect(mock.calls).toHaveLength(5);
	});

	it("discards the capped empty stop durably without waiting on a stalled message_end hook", async () => {
		const releaseMessageEnd = Promise.withResolvers<void>();
		const finalMessageEndEntered = Promise.withResolvers<void>();
		let assistantMessageEnds = 0;
		const extensionRunner = {
			hasHandlers: vi.fn((eventType: string) => eventType === "message_end"),
			emitBeforeAgentStart: vi.fn(async () => undefined),
			emit: vi.fn(async (event: { type: string; message?: AgentMessage }) => {
				if (event.type !== "message_end" || event.message?.role !== "assistant") return undefined;
				assistantMessageEnds++;
				if (assistantMessageEnds !== 4) return undefined;
				finalMessageEndEntered.resolve();
				await releaseMessageEnd.promise;
				return undefined;
			}),
		} as unknown as ExtensionRunner;
		const { session } = await createHarness(
			[emptyStop(), emptyStop(), emptyStop(), emptyStop()],
			{},
			{ extensionRunner },
		);

		// Persistence and the capped-stop cleanup run in emission order and must not
		// be owned by extension listeners: a held message_end hook cannot stall the
		// prompt, and the discard already waited for the final turn's persistence.
		const prompt = session.prompt("answer while the final hook is held");
		await finalMessageEndEntered.promise;
		await withTimeout(prompt, 2_000, "Prompt stalled behind a held message_end hook");
		const activeBranchMessages = session.sessionManager
			.getBranch()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		expect(emptyAssistantStops(activeBranchMessages)).toHaveLength(0);
		expect(session.sessionManager.getEntries().at(-1)).toMatchObject({
			type: "branch_summary",
			details: { kind: "discarded-entry-branch" },
		});

		releaseMessageEnd.resolve();
		await session.waitForIdle();
		const settledBranchMessages = session.sessionManager
			.getBranch()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		expect(emptyAssistantStops(settledBranchMessages)).toHaveLength(0);
	});

	it("does not let a capped empty stop anchor the next context estimate", async () => {
		const billedEmptyStops = Array.from({ length: 4 }, (): MockResponse => ({
			content: [],
			stopReason: "stop",
			usage: { input: 172_000, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 172_001 },
		}));
		const { session, mock } = await createHarness(billedEmptyStops);

		await expectPromptCompletes(session.prompt("answer from compacted context"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(session.getContextUsage()?.tokens).toBeLessThan(10_000);
		expect(emptyAssistantStops(session.agent.state.messages)).toHaveLength(0);
	});

	it("emits failed auto-retry end when repeated empty stops exhaust the retry cap", async () => {
		const { session, mock } = await createHarness([emptyStop(), emptyStop(), emptyStop(), emptyStop()]);
		const retryEndEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_end") {
				retryEndEvents.push(event);
			}
		});

		await expectPromptCompletes(session.prompt("answer without tools"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(retryEndEvents).toHaveLength(1);
		expect(retryEndEvents[0]).toMatchObject({
			type: "auto_retry_end",
			success: false,
			attempt: 3,
		});
		expect(retryEndEvents[0]?.finalError).toContain("/shake images");
	});

	it("names billed output tokens instead of the context hint when a capped empty stop billed output", async () => {
		const { session, mock } = await createHarness([
			filteredEmptyStop(),
			filteredEmptyStop(),
			filteredEmptyStop(),
			filteredEmptyStop(),
		]);
		const retryEndEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_end") {
				retryEndEvents.push(event);
			}
		});

		await expectPromptCompletes(session.prompt("answer that gets filtered"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(retryEndEvents).toHaveLength(1);
		expect(retryEndEvents[0]?.success).toBe(false);
		const finalError = retryEndEvents[0]?.finalError ?? "";
		expect(finalError).toContain("billed 126 output tokens");
		expect(finalError).not.toContain("/shake images");
	});

	it("keeps the context hint when a capped zero-block stop billed only reasoning tokens", async () => {
		const { session, mock } = await createHarness([
			reasoningOnlyEmptyStop(),
			reasoningOnlyEmptyStop(),
			reasoningOnlyEmptyStop(),
			reasoningOnlyEmptyStop(),
		]);
		const retryEndEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_end") {
				retryEndEvents.push(event);
			}
		});

		await expectPromptCompletes(session.prompt("think without delivering an answer"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(retryEndEvents).toHaveLength(1);
		expect(retryEndEvents[0]?.success).toBe(false);
		const finalError = retryEndEvents[0]?.finalError ?? "";
		expect(finalError).toContain("/shake images");
		expect(finalError).not.toContain("billed");
	});

	it("keeps the context hint for a capped thinking-only stop even though it billed output", async () => {
		const { session, mock } = await createHarness([
			thinkingOnlyStop(),
			thinkingOnlyStop(),
			thinkingOnlyStop(),
			thinkingOnlyStop(),
		]);
		const retryEndEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_end") {
				retryEndEvents.push(event);
			}
		});

		await expectPromptCompletes(session.prompt("think without answering"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(retryEndEvents).toHaveLength(1);
		expect(retryEndEvents[0]?.success).toBe(false);
		const finalError = retryEndEvents[0]?.finalError ?? "";
		expect(finalError).toContain("/shake images");
		expect(finalError).not.toContain("billed");
	});

	it("ends auto-retry state when empty stop retries hit the cap", async () => {
		mockSchedulerWaitWithClock();
		const { session, mock } = await createHarness(
			[{ throw: "503 service unavailable: overloaded_error" }, emptyStop(), emptyStop(), emptyStop(), emptyStop()],
			{
				"retry.enabled": true,
				"retry.baseDelayMs": 5,
				"retry.maxDelayMs": 5_000,
				"retry.maxRetries": 2,
			},
		);
		const retryStartEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_start" }>> = [];
		const retryEndEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_start") {
				retryStartEvents.push(event);
			}
			if (event.type === "auto_retry_end") {
				retryEndEvents.push(event);
			}
		});

		await expectPromptCompletes(session.prompt("recover from transient error"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(5);
		expect(session.isRetrying).toBe(false);
		expect(session.retryAttempt).toBe(0);
		expect(retryStartEvents).toHaveLength(1);
		expect(retryStartEvents[0]?.attempt).toBe(1);
		expect(retryEndEvents.filter(event => event.success)).toEqual([]);
		expect(retryEndEvents).toHaveLength(1);
		expect(retryEndEvents[0]).toMatchObject({
			type: "auto_retry_end",
			success: false,
			attempt: 1,
		});
		expect(retryEndEvents[0]?.finalError).toContain("empty stop");
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(3);
		expect(emptyAssistantStops(session.agent.state.messages)).toHaveLength(0);

		mock.push({ content: ["fresh unrelated success"], stopReason: "stop" });
		await session.prompt("start unrelated turn after cap");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(6);
		expect(retryEndEvents).toHaveLength(1);
		expect(session.isRetrying).toBe(false);
		expect(session.retryAttempt).toBe(0);
		expect(assistantText(session.agent.state.messages)).toContain("fresh unrelated success");

		mock.push({ throw: "503 service unavailable: overloaded_error" });
		mock.push({ content: ["fresh retry success"], stopReason: "stop" });
		await expectPromptCompletes(session.prompt("recover with fresh retry budget"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(8);
		expect(retryStartEvents).toHaveLength(2);
		expect(retryStartEvents[1]?.attempt).toBe(1);
		expect(retryEndEvents).toHaveLength(2);
		expect(retryEndEvents[1]).toMatchObject({
			type: "auto_retry_end",
			success: true,
			attempt: 1,
		});
		expect(session.isRetrying).toBe(false);
		expect(session.retryAttempt).toBe(0);
	});

	it("preserves auto-retry budget across empty stop continuations", async () => {
		mockSchedulerWaitWithClock();
		const { session, mock } = await createHarness(
			[
				{ throw: "503 service unavailable: overloaded_error" },
				emptyStop(),
				{ throw: "503 service unavailable: overloaded_error" },
				{ throw: "503 service unavailable: overloaded_error" },
			],
			{
				"retry.enabled": true,
				"retry.baseDelayMs": 5,
				"retry.maxDelayMs": 5_000,
				"retry.maxRetries": 2,
			},
		);
		const retryEndEvents: Array<Extract<AgentSessionEvent, { type: "auto_retry_end" }>> = [];
		session.subscribe(event => {
			if (event.type === "auto_retry_end") {
				retryEndEvents.push(event);
			}
		});

		await expectPromptCompletes(session.prompt("recover without replenishing retries"));
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(4);
		expect(retryEndEvents.filter(event => event.success)).toEqual([]);
		expect(retryEndEvents).toHaveLength(1);
		expect(retryEndEvents[0]).toMatchObject({
			type: "auto_retry_end",
			success: false,
			attempt: 2,
		});
		expect(session.isRetrying).toBe(false);
		expect(reminderMessages(session.agent.state.messages)).toHaveLength(1);
	});

	it("preserves Codex commentary when discarding a colliding empty final stop", async () => {
		const timestamp = 1_725_287_000_000;
		vi.spyOn(Date, "now").mockReturnValue(timestamp);
		const commentary = "Codex commentary before the empty final answer.";
		const recovered = "Recovered after the empty final-answer retry.";
		const { session, mock } = await createHarness(
			[{ content: [commentary], stopReason: "stop" }, emptyStop(), { content: [recovered], stopReason: "stop" }],
			{},
			{ provider: "openai-codex", id: "gpt-5.5-codex" },
		);

		await session.prompt("produce commentary");
		await session.waitForIdle();
		// Persisted identity must win regardless of branch enumeration order. The
		// coarse matcher otherwise selects the commentary when it is encountered first.
		const getBranch = session.sessionManager.getBranch.bind(session.sessionManager);
		const branchSpy = vi
			.spyOn(session.sessionManager, "getBranch")
			.mockImplementation(() => getBranch().slice().reverse());
		await session.followUp("continue after commentary");
		await session.waitForIdle();
		branchSpy.mockRestore();

		const assistantTexts = (messages: AgentMessage[]): string[] =>
			messages
				.filter((message): message is Extract<AgentMessage, { role: "assistant" }> => message.role === "assistant")
				.flatMap(message => message.content.flatMap(block => (block.type === "text" ? [block.text] : [])));

		expect(mock.calls).toHaveLength(3);
		expect(assistantTexts(session.agent.state.messages)).toEqual([commentary, recovered]);
		expect(emptyAssistantStops(session.agent.state.messages)).toHaveLength(0);

		const persistedMessages = session.sessionManager
			.getBranch()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		expect(assistantTexts(persistedMessages)).toEqual([commentary, recovered]);
		expect(emptyAssistantStops(persistedMessages)).toHaveLength(0);
	});

	it("does not retry normal stop or tool-use turns", async () => {
		const normal = await createHarness([{ content: ["already done"], stopReason: "stop" }]);

		await normal.session.prompt("answer normally");
		await normal.session.waitForIdle();

		expect(normal.mock.calls).toHaveLength(1);
		expect(reminderMessages(normal.session.agent.state.messages)).toHaveLength(0);

		const withTool = await createHarness([
			recordCall("gamma", "call-record-gamma"),
			{ content: ["tool path complete"], stopReason: "stop" },
		]);

		await withTool.session.prompt("record gamma");
		await withTool.session.waitForIdle();

		expect(withTool.mock.calls).toHaveLength(2);
		expect(reminderMessages(withTool.session.agent.state.messages)).toHaveLength(0);
		expect(assistantText(withTool.session.agent.state.messages)).toContain("tool path complete");
	});

	it("does not resurface a discarded empty stop after reloading from disk", async () => {
		// The reason this case exists. Two assertions elsewhere in this file used to
		// read `getEntries()` and expect no empty stop, which is what made them red.
		// They were trying to say "a discarded stop cannot come back", and the only
		// thing that can establish that is a RELOAD: the loader rebuilds the active
		// branch from the last physical journal entry (session-manager.ts:3338 —
		// "The loader reconstructs the active branch from the last physical journal
		// entry, so changing the in-memory leaf alone is lost on reload"). With
		// `SessionManager.inMemory` there is no file, so the claim was unobservable
		// and the assertions were standing in for it as well as they could.
		//
		// What they could NOT stand in for is the retention. `discardEntryDurably`
		// keeps a content-bearing entry off-branch behind a marker rather than
		// deleting it, so "the journal is empty of empty stops" is false by design.
		// The contract is narrower and is asserted below in both halves: the journal
		// still HOLDS the entry, and the branch a reload selects does not.
		const { session, mock, tempDir } = await createHarness(
			[recordCall("beta", "call-record-beta"), emptyStop(), emptyStop(), emptyStop(), emptyStop()],
			{},
			{ persistSession: true },
		);

		await session.prompt("record beta");
		await session.waitForIdle();

		expect(mock.calls).toHaveLength(5);
		expect(emptyAssistantStops(session.agent.state.messages)).toHaveLength(0);

		const journalMessages = session.sessionManager
			.getEntries()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		// The half that was true all along and that the old assertion denied: the
		// discarded stops are still on disk, held off-branch on purpose.
		expect(emptyAssistantStops(journalMessages).length).toBeGreaterThan(0);
		// ...and the marker that makes the selection durable is the last entry.
		expect(session.sessionManager.getEntries().at(-1)).toMatchObject({
			type: "branch_summary",
			summary: "",
			details: { kind: "discarded-entry-branch" },
		});

		// Now the half that needs a reader: a fresh manager over the same directory,
		// loading the journal the way a resumed process does. If the marker were not
		// honoured, the discarded stops would be the active leaf again.
		const sessionFile = session.sessionManager.getSessionFile();
		expect(sessionFile).toBeDefined();
		const reloaded = SessionManager.create(tempDir.path(), tempDir.path());
		await reloaded.setSessionFile(sessionFile as string);

		const reloadedBranch = reloaded
			.getBranch()
			.filter(entry => entry.type === "message")
			.map(entry => entry.message as AgentMessage);
		expect(emptyAssistantStops(reloadedBranch)).toHaveLength(0);
		// The reload kept the conversation, so the assertion above is not vacuously
		// empty. The user turn is what must survive: the assistant turns here WERE the
		// empty stops, so there is no assistant text to look for.
		expect(
			reloadedBranch.some(
				message => message.role === "user" && JSON.stringify(message.content).includes("record beta"),
			),
		).toBe(true);
	});
});
