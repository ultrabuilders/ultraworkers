import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { BashRunnerHost } from "@oh-my-pi/pi-coding-agent/session/bash-runner";
import { BashRunner } from "@oh-my-pi/pi-coding-agent/session/bash-runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { TurnRecovery, type TurnRecoveryHost } from "@oh-my-pi/pi-coding-agent/session/turn-recovery";
import { TempDir } from "@oh-my-pi/pi-utils";
import { createAssistantMessage } from "./helpers/agent-session-setup";

/**
 * `#dropPersistedAssistantTurn` reparents the branch AWAY from the assistant entry
 * it is dropping. When a bash result is still owned by the session target at that
 * moment, the transition has to know WHICH entry the rewrite displaces — by then
 * `getLeafId()` is the `turn_end` marker written after the assistant message, so
 * the result would be filed under the marker instead of the turn it belongs to.
 *
 * `compaction-speculation.test.ts` stubs this method on its host mock and never
 * calls through it, so nothing else in the suite exercises this path. These rows
 * wire a real `BashRunner` into a real `SessionManager`, so the assertion is on
 * the resulting transcript rather than on the anchor option being forwarded.
 *
 * Production locates the entry two ways — by the persisted entry id the session
 * stamps onto the message, or failing that by matching the message itself. Both
 * are covered, because a fallback nobody checks is not a fallback that works.
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

const command = "dropped-turn-command";

/** How the host answers "which persisted entry is this message?" */
type PersistedIdLookup = (ids: { assistantEntryId: string; turnMarkerId: string }) => string | undefined;

describe("dropPersistedAssistantTurn bash ownership", () => {
	let tempDir: TempDir;

	beforeEach(() => {
		tempDir = TempDir.createSync("@ultraworkers-drop-bash-owner-");
	});

	afterEach(() => {
		tempDir.removeSync();
	});

	async function runDrop(lookup: PersistedIdLookup) {
		const sessionManager = SessionManager.inMemory(tempDir.path());
		sessionManager.appendMessage({ role: "user", content: "run a command" } as never);
		const assistantMessage = createAssistantMessage("the turn being dropped");
		const assistantEntryId = sessionManager.appendMessage(assistantMessage);
		// The turn marker lands after the assistant message, so from here on
		// getLeafId() answers "the marker" — never the entry being dropped.
		const turnMarkerId = sessionManager.appendTurnEntry({ turnIndex: 0, phase: "ended" });
		expect(sessionManager.getLeafId()).toBe(turnMarkerId);

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
		bash.recordBashResult(command, bashResult);
		expect(bash.hasPendingMessages).toBe(true);

		const host = {
			agent: { state: { messages: [] }, replaceMessages: () => {} } as never,
			sessionManager,
			persistedAssistantEntryId: () => lookup({ assistantEntryId, turnMarkerId }),
			isStreaming: () => true,
			waitForSessionMessagePersistence: async () => {},
			withBashBranchTransition: <T>(operation: () => T, options?: { anchorEntryId?: string }): T =>
				bash.withBranchTransition(operation, options),
		} as unknown as TurnRecoveryHost;

		const recovery = new TurnRecovery(host, { deferFallbackChainValidation: true });
		expect(await recovery.dropPersistedAssistantTurn(assistantMessage)).toBe(assistantEntryId);

		await bash.flushPending();

		const bashEntry = sessionManager
			.getEntries()
			.find(
				entry =>
					entry.type === "message" &&
					entry.message.role === "bashExecution" &&
					(entry.message as { command?: string }).command === command,
			);
		expect(bashEntry).toBeDefined();

		return {
			sessionManager,
			assistantEntryId,
			bashEntryId: bashEntry?.parentId,
			// The dropped turn left the live branch, so the result must not rejoin it.
			resultOnLiveBranch: sessionManager.getBranch().some(entry => entry.id === bashEntry?.id),
		};
	}

	it("parents the result to the dropped entry when the persisted id resolves it", async () => {
		const { sessionManager, assistantEntryId, bashEntryId, resultOnLiveBranch } = await runDrop(
			({ assistantEntryId: id }) => id,
		);
		expect(bashEntryId).toBe(assistantEntryId);
		expect(resultOnLiveBranch).toBe(false);
		await sessionManager.close();
	});

	it("falls back to the message match when no persisted id was stamped", async () => {
		const { sessionManager, assistantEntryId, bashEntryId, resultOnLiveBranch } = await runDrop(() => undefined);
		expect(bashEntryId).toBe(assistantEntryId);
		expect(resultOnLiveBranch).toBe(false);
		await sessionManager.close();
	});

	it("falls back to the message match when the stamped id is stale", async () => {
		// A persisted id that no longer names an assistant message must not anchor the
		// rewrite to the wrong entry; the message match is the safety net.
		const { sessionManager, assistantEntryId, bashEntryId, resultOnLiveBranch } = await runDrop(
			({ turnMarkerId }) => turnMarkerId,
		);
		expect(bashEntryId).toBe(assistantEntryId);
		expect(resultOnLiveBranch).toBe(false);
		await sessionManager.close();
	});
});
