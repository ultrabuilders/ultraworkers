import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { BashRunner } from "@oh-my-pi/pi-coding-agent/session/bash-runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { TurnRecovery } from "@oh-my-pi/pi-coding-agent/session/turn-recovery";
import type { BashRunnerHost } from "@oh-my-pi/pi-coding-agent/session/bash-runner";
import type { TurnRecoveryHost } from "@oh-my-pi/pi-coding-agent/session/turn-recovery";
import { TempDir } from "@oh-my-pi/pi-utils";
import { createAssistantMessage } from "./helpers/agent-session-setup";

/**
 * `#dropPersistedAssistantTurn` reparents the branch AWAY from the assistant
 * entry it is dropping. When a bash result is still owned by the session target
 * at that moment, the transition has to know WHICH entry the rewrite displaces —
 * by then `getLeafId()` is the `turn_end` marker written after the assistant
 * message, so the result would be filed under the marker instead of the turn it
 * belongs to.
 *
 * `compaction-speculation.test.ts` stubs this method on its host mock and never
 * calls through it, so nothing else in the suite exercises this path. This file
 * wires a real `BashRunner` into a real `SessionManager` so the assertion is on
 * the resulting transcript, not on the option being forwarded.
 */

const bashResult = {
	output: "recovery-output",
	exitCode: 0,
	cancelled: false,
	truncated: false,
	totalLines: 1,
	totalBytes: 15,
	outputLines: 1,
	outputBytes: 15,
};

describe("dropPersistedAssistantTurn bash ownership", () => {
	let tempDir: TempDir;

	beforeEach(() => {
		tempDir = TempDir.createSync("@ultraworkers-drop-bash-owner-");
	});

	afterEach(() => {
		tempDir.removeSync();
	});

	it("parents a still-owned bash result to the dropped assistant entry, not the turn marker", async () => {
		const sessionManager = SessionManager.inMemory(tempDir.path());
		sessionManager.appendMessage({ role: "user", content: "run a command" } as never);
		const assistantMessage = createAssistantMessage("the turn being dropped");
		const assistantEntryId = sessionManager.appendMessage(assistantMessage);
		// The turn marker lands after the assistant message, so from here on
		// getLeafId() answers "the marker" — never the entry being dropped.
		sessionManager.appendTurnEntry({ turnIndex: 0, phase: "ended" });
		expect(sessionManager.getLeafId()).not.toBe(assistantEntryId);

		const bashHost: BashRunnerHost = {
			agent: { appendMessage: () => {} } as never,
			sessionManager,
			settings: {} as never,
			extensionRunner: () => undefined,
			isStreaming: () => true,
		};
		const bash = new BashRunner(bashHost);
		// Streaming keeps the reference alive instead of releasing it, so the
		// upcoming transition has a live owner to hand a destination to.
		bash.recordBashResult("dropped-turn-command", bashResult);
		expect(bash.hasPendingMessages).toBe(true);

		const host = {
			agent: { state: { messages: [] }, replaceMessages: () => {} } as never,
			sessionManager,
			persistedAssistantEntryId: () => undefined,
			isStreaming: () => true,
			waitForSessionMessagePersistence: async () => {},
			withBashBranchTransition: <T>(operation: () => T, options?: { anchorEntryId?: string }): T =>
				bash.withBranchTransition(operation, options),
		} as unknown as TurnRecoveryHost;

		const recovery = new TurnRecovery(host, { deferFallbackChainValidation: true });
		const droppedId = await recovery.dropPersistedAssistantTurn(assistantMessage);
		expect(droppedId).toBe(assistantEntryId);

		await bash.flushPending();

		const bashEntry = sessionManager
			.getEntries()
			.find(
				entry =>
					entry.type === "message" &&
					entry.message.role === "bashExecution" &&
					(entry.message as { command?: string }).command === "dropped-turn-command",
			);
		expect(bashEntry).toBeDefined();
		expect(bashEntry?.parentId).toBe(assistantEntryId);

		// The dropped turn is off the live branch; the result must not rejoin it.
		expect(
			sessionManager
				.getBranch()
				.some(
					entry =>
						entry.type === "message" &&
						entry.message.role === "bashExecution" &&
						(entry.message as { command?: string }).command === "dropped-turn-command",
				),
		).toBe(false);

		await sessionManager.close();
	});
});
