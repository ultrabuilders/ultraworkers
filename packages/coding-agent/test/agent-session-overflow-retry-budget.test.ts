import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { Agent, type AgentTool } from "@oh-my-pi/pi-agent-core";
import { createMockModel, type MockResponse } from "@oh-my-pi/pi-ai/providers/mock";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { convertToLlm } from "@oh-my-pi/pi-coding-agent/session/messages";
import { OVERFLOW_RECOVERY_MAX_RETRIES } from "@oh-my-pi/pi-coding-agent/session/session-maintenance";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";

/**
 * The overflow retry budget.
 *
 * `INCOMPLETE_RECOVERY_MAX_RETRIES` bounds the *no-progress* loop: a turn that
 * returns nothing recoverable. It cannot bound the loop this file covers — a
 * turn that completes, then the next request overflows, then compaction, then
 * overflow again — because an overflow turn delivers no output, so the counter
 * is never charged for it. That loop *succeeds* at recovering every round, so
 * it never appears in the error log: it just spends one full model turn per
 * round, forever.
 *
 * Every test below measures the number of model turns a fake transport observes.
 * That is the only honest surface for this behaviour — the old loop threw no
 * error, so `not.toThrow()` is green on the unpatched tree and catches nothing.
 */

const OVERFLOW_ERROR = "prompt is too long: 300000 tokens > 200000 maximum";
const NOTICE_SOURCE = "compaction";

/** A tool whose result alone refills most of the window, so every round of the
 * loop leaves compaction with real work and real headroom to give back. */
const fillerSchema = type({});
const fillerTool: AgentTool<typeof fillerSchema, undefined> = {
	name: "noop",
	label: "No-op",
	description: "Refill the context so overflow recovery keeps finding work to do",
	parameters: fillerSchema,
	async execute() {
		return { content: [{ type: "text", text: "z".repeat(150_000) }], details: undefined };
	},
};

describe("AgentSession context-overflow retry budget", () => {
	let tempDir: TempDir;
	let authStorage: AuthStorage;
	let session: AgentSession;

	afterEach(async () => {
		await session?.dispose();
		authStorage?.close();
		await tempDir?.remove();
		vi.restoreAllMocks();
	});

	/**
	 * Build a real session: a real `Agent` whose `streamFn` is the scripted
	 * transport, a real `SessionManager`, and the real extension surface (a
	 * `session_before_compact` handler standing in for a summary model, so
	 * compaction performs a real history rewrite without a second LLM call).
	 *
	 * `respond` decides each model turn from a 1-based turn index, so the caller
	 * scripts the exact cadence rather than a fixed count.
	 */
	async function createSession(
		respond: (turn: number) => MockResponse,
	): Promise<{ modelTurns: () => number; notices: string[]; overflowCompactions: () => number }> {
		tempDir = TempDir.createSync("@pi-overflow-budget-");
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "auth.db"));
		authStorage.keys.setRuntime("mock", "test-key");
		const modelRegistry = new ModelRegistry(authStorage, path.join(tempDir.path(), "models.yml"));

		let turns = 0;
		const mock = createMockModel({
			contextWindow: 200_000,
			maxTokens: 64_000,
			handler: () => {
				turns++;
				return respond(turns);
			},
		});
		vi.spyOn(modelRegistry, "getAvailable").mockReturnValue([mock]);

		const sessionManager = SessionManager.inMemory(tempDir.path());
		sessionManager.appendMessage({ role: "user", content: "hello", timestamp: Date.now() } as never);

		const extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		const extensionPath = path.join(extensionsDir, "compaction-short-circuit.ts");
		fs.writeFileSync(
			extensionPath,
			[
				"export default function(pi) {",
				'\tpi.on("session_before_compact", async (event) => ({',
				"\t\tcompaction: {",
				'\t\t\tsummary: "compacted",',
				"\t\t\tshortSummary: undefined,",
				"\t\t\tfirstKeptEntryId: event.preparation.firstKeptEntryId,",
				"\t\t\ttokensBefore: event.preparation.tokensBefore,",
				"\t\t\tdetails: {},",
				"\t\t},",
				"\t}));",
				"}",
			].join("\n"),
		);
		const loaded = await loadExtensions([extensionPath], tempDir.path());

		const agent = new Agent({
			getApiKey: () => "test-key",
			initialState: { model: mock, systemPrompt: ["Test"], tools: [fillerTool], messages: [] },
			convertToLlm,
			streamFn: mock.stream,
		});

		session = new AgentSession({
			agent,
			sessionManager,
			settings: Settings.isolated({
				"compaction.autoContinue": true,
				"contextPromotion.enabled": false,
				// The transport script *is* the failure; the generic transient
				// retry ladder would otherwise re-drive it behind our back and
				// make the turn count a property of the backoff, not the budget.
				"retry.enabled": false,
				"todo.enabled": false,
			}),
			modelRegistry,
			extensionRunner: new ExtensionRunner(
				loaded.extensions,
				loaded.runtime,
				tempDir.path(),
				sessionManager,
				modelRegistry,
			),
		});

		const notices: string[] = [];
		let overflowCompactions = 0;
		session.subscribe(event => {
			if (event.type === "notice" && event.source === NOTICE_SOURCE) notices.push(event.message);
			if (event.type === "auto_compaction_start" && event.reason === "overflow") overflowCompactions++;
		});
		return { modelTurns: () => turns, notices, overflowCompactions: () => overflowCompactions };
	}

	it("stops after exactly one overflow retry instead of looping forever", async () => {
		// Regression: `compact → overflow → compact` ran unbounded, one full
		// model turn per round, because each round's compaction genuinely made
		// progress (the tool result refilled the context) and therefore
		// genuinely scheduled the next retry. Nothing errored, so nothing logged.
		const observed = await createSession(turn =>
			turn % 2 === 1
				? { content: [{ type: "toolCall", id: `tc-${turn}`, name: "noop", arguments: {} }] }
				: { throw: OVERFLOW_ERROR },
		);

		await session.prompt("go");
		await session.waitForIdle();

		// One overflowing turn, one retry, then the second overflow is refused.
		// The odd turns are the tool calls that refill the context; the even
		// ones are the overflows. Budget is 1 retry ⇒ exactly one refill+overflow
		// pair is served, so 2 overflow turns ⇒ 1 initial + 2×(refill+overflow).
		expect(observed.modelTurns()).toBe(2 * (OVERFLOW_RECOVERY_MAX_RETRIES + 1));
		expect(session.getLastAssistantMessage()).toMatchObject({
			stopReason: "error",
			errorMessage: expect.stringContaining("Context overflow recovery gave up"),
		});
	});

	it("reports the cause and the exhausted budget instead of stopping silently", async () => {
		// A cap that only stops turns the expensive loop into an unexplained
		// dead run — the session yields and the user cannot tell why. The message
		// has to name the cause (context overflow) and the fact that the budget
		// ran out. Asserted on the turn content, not on a log line.
		const observed = await createSession(turn =>
			turn % 2 === 1
				? { content: [{ type: "toolCall", id: `tc-${turn}`, name: "noop", arguments: {} }] }
				: { throw: OVERFLOW_ERROR },
		);

		await session.prompt("go");
		await session.waitForIdle();

		const terminal = session.getLastAssistantMessage();
		expect(terminal?.errorMessage).toMatch(/context overflow/i);
		expect(terminal?.errorMessage).toMatch(
			new RegExp(`after ${OVERFLOW_RECOVERY_MAX_RETRIES} compact-and-retry attempts?`, "i"),
		);
		// Surfaced to the user too, not only retained on the dropped turn.
		expect(observed.notices.some(message => /overflow recovery gave up/i.test(message))).toBe(true);
	});

	it("spends the budget per cause, not per turn: a length stop does not consume it", async () => {
		// Boundary between two causes. Turn 2 overflows and spends the budget;
		// turn 3 stops for a *different* reason (output cap, not context), which
		// closes that incident; turn 4's overflow is therefore a fresh one and
		// must still be compacted and retried.
		//
		// A counter shared across causes fails here in the worst way: one
		// unrelated `length` stop silently disables context recovery for the
		// rest of the session, turning a recoverable overflow into a dead run.
		// That regression is invisible to the two tests above, which only ever
		// produce overflow — hence a separate test rather than one more row.
		const observed = await createSession(turn => {
			if (turn === 2) return { throw: OVERFLOW_ERROR };
			if (turn === 3) return { stopReason: "length", content: [], usage: { output: 4096 } };
			if (turn >= 4) return { throw: OVERFLOW_ERROR };
			return { content: [{ type: "toolCall", id: "tc-1", name: "noop", arguments: {} }] };
		});

		await session.prompt("go");
		await session.waitForIdle();

		// Turn 4's overflow ran its own compaction. With a shared counter it is
		// refused on turn 2's stale count and no second compaction happens.
		expect(observed.overflowCompactions()).toBe(4);
		expect(session.getLastAssistantMessage()?.errorMessage).not.toMatch(/overflow recovery gave up/i);
	});

	it("still compacts and retries an overflow that arrives once, before the budget applies", async () => {
		// Negative assertion for the new path: a session that overflows once and
		// then recovers must be untouched by the cap. Toggling the new gate off
		// has to leave this behaviour exactly as it was — a cap that breaks the
		// ordinary single-overflow recovery would damage every existing user.
		const observed = await createSession(turn => {
			if (turn === 1) return { content: [{ type: "toolCall", id: "tc-1", name: "noop", arguments: {} }] };
			if (turn === 2) return { throw: OVERFLOW_ERROR };
			return { content: ["recovered"] };
		});

		await session.prompt("go");
		await session.waitForIdle();

		// 3 turns: the overflow, its retry, and the successful answer.
		expect(observed.modelTurns()).toBe(3);
		expect(session.getLastAssistantMessage()?.errorMessage).toBeUndefined();
	});
});
