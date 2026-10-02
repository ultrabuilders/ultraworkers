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

	/** One assistant reply per prompt, no tool calls, so each turn opens and closes. */
	function createSession(responses: number): AgentSession {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected claude-sonnet-4-5 model to exist");
		const modelRegistry = new ModelRegistry(authStorage!);
		const agent = new Agent({
			getApiKey: () => "test-key",
			initialState: {
				model,
				systemPrompt: ["Test"],
				tools: [],
				messages: manager.buildSessionContext().messages,
			},
			streamFn: createMockModel({
				responses: Array.from({ length: responses }, (_, i) => ({ content: [`Reply ${i}`] })),
			}).stream,
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
