import type { AssistantMessage } from "@oh-my-pi/pi-ai";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { PlanModeState } from "@oh-my-pi/pi-coding-agent/plan-mode/state";
import type { AgentSession, AgentSessionEvent } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import type { PlanProposalHandler } from "@oh-my-pi/pi-coding-agent/tools/resolve";

/**
 * Shared harness for driving `runPrintMode` in tests.
 *
 * Moved here rather than exported from the first test that needed it: a helper
 * living in a `*.test.ts` invites importing a test file from another test file,
 * which nothing else in `test/` does. `test/helpers/` is already where shared
 * harnesses live (see `interactive-mode-context.ts`).
 *
 * One definition, two users. Do not copy it back into a test file — two copies
 * of the same harness is a bug even when both run.
 */

export function makeAssistantMessage(text: string): AssistantMessage {
	const timestamp = Date.now();
	const usage = {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-sonnet-4-5",
		stopReason: "stop",
		usage,
		timestamp,
	};
}

export interface DelayedSession {
	session: AgentSession;
	promptStarted: Promise<void>;
	resolvePrompt: () => void;
	getPlanModeAtPrompt: () => PlanModeState | undefined;
	getTextOutputCommitted: () => boolean;
	getModeChanges: () => Array<{ mode: string; data?: Record<string, unknown> }>;
	getPlanProposalHandler: () => PlanProposalHandler | undefined;
	getCurrentPlanMode: () => PlanModeState | undefined;
	emit: (event: AgentSessionEvent) => void;
	getAbortCalls: () => number;
	/**
	 * How many times print mode disposed the session.
	 *
	 * The fake's `dispose` used to be a bare no-op, which is right for the tests
	 * that only care about output and wrong for the one that asks whether print
	 * mode tears the session down at all — that question was being answered by
	 * reading `print-mode.ts` and counting the *string* `session.dispose(`.
	 */
	getDisposeCalls: () => number;
}

export function createDelayedSession(
	finalMessage: AssistantMessage,
	options: { defaultPlanMode?: boolean } = {},
): DelayedSession {
	const messages: AssistantMessage[] = [];
	const { promise: promptStarted, resolve: markPromptStarted } = Promise.withResolvers<void>();
	const { promise: promptReleased, resolve: resolvePrompt } = Promise.withResolvers<void>();
	let advisorDrainPrepared = false;
	let planModeState: PlanModeState | undefined;
	let planModeAtPrompt: PlanModeState | undefined;
	let enabledToolNames = ["read"];
	const modeChanges: Array<{ mode: string; data?: Record<string, unknown> }> = [];
	let planProposalHandler: PlanProposalHandler | undefined;
	let subscriber: ((event: AgentSessionEvent) => void) | undefined;
	let textOutputCommitted = true;
	let abortCalls = 0;
	let disposeCalls = 0;

	const session = {
		state: { messages },
		getLastAssistantMessage: () => messages.findLast(message => message.role === "assistant"),
		sessionManager: {
			getHeader: () => undefined,
			buildSessionContext: () => ({ messages: [] }),
			getEntries: () => [],
			onPersistenceError: () => () => {},
			appendModeChange: (mode: string, data?: Record<string, unknown>) => {
				modeChanges.push({ mode, data });
				return "mode-change";
			},
		},
		settings: Settings.isolated({
			"plan.enabled": true,
			"plan.defaultOnStartup": options.defaultPlanMode === true,
		}),
		model: undefined,
		isStreaming: false,
		getPlanReferencePath: () => "",
		getEnabledToolNames: () => enabledToolNames,
		hasBuiltInTool: (name: string) => name === "write",
		setActiveToolsByName: async (names: string[]) => {
			enabledToolNames = names;
		},
		getPlanModeState: () => planModeState,
		setPlanModeState: (state: PlanModeState | undefined) => {
			planModeState = state;
		},
		preparePlanForReview: async (title: string) => {
			const details = { planFilePath: `local://${title}-plan.md`, title, planExists: true };
			return { content: [{ type: "text" as const, text: "Plan ready for review." }], details };
		},
		setPlanProposalHandler: (handler: PlanProposalHandler | null) => {
			planProposalHandler = handler ?? undefined;
		},
		resolveRoleModelWithThinking: () => ({
			model: undefined,
			thinkingLevel: undefined,
			explicitThinkingLevel: false,
		}),
		extensionRunner: undefined,
		markPlanInternalAbortPending: () => {},
		clearPlanInternalAbortPending: () => {},
		abort: async () => {
			abortCalls++;
		},
		setTextOutputCommitted: (committed: boolean) => {
			textOutputCommitted = committed;
		},
		subscribe: (listener: (event: AgentSessionEvent) => void) => {
			subscriber = listener;
			return () => {};
		},
		prompt: async () => {
			planModeAtPrompt = planModeState;
			if (advisorDrainPrepared) throw new Error("headless advisor delivery armed before prompt completion");
			markPromptStarted();
			await promptReleased;
			messages.push(finalMessage);
			return true;
		},
		prepareForHeadlessAdvisorDrain: () => {
			advisorDrainPrepared = true;
		},
		waitForAdvisorCatchup: async () => {
			if (!advisorDrainPrepared) throw new Error("advisor catch-up started before headless delivery was armed");
		},
		dispose: async () => {
			disposeCalls++;
		},
	} as unknown as AgentSession;

	return {
		session,
		promptStarted,
		resolvePrompt,
		getPlanModeAtPrompt: () => planModeAtPrompt,
		getModeChanges: () => modeChanges,
		getPlanProposalHandler: () => planProposalHandler,
		getTextOutputCommitted: () => textOutputCommitted,
		getCurrentPlanMode: () => planModeState,
		emit: event => subscriber?.(event),
		getAbortCalls: () => abortCalls,
		getDisposeCalls: () => disposeCalls,
	};
}
