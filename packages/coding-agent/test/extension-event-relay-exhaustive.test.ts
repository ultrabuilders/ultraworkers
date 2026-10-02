import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as path from "node:path";
import { Agent } from "@oh-my-pi/pi-agent-core";
import { createMockModel } from "@oh-my-pi/pi-ai/providers/mock";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { GoalUpdatedEvent } from "@oh-my-pi/pi-coding-agent/extensibility/shared-events";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { convertToLlm } from "@oh-my-pi/pi-coding-agent/session/messages";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { TempDir } from "@oh-my-pi/pi-utils";

/**
 * `goal_updated` is the one relayable kind with no dedicated `emitXxx()` on the
 * runner and no in-process subscriber on the way — it travels the whole
 * GoalRuntime → `GoalRuntimeHost.emit` → `#emitSessionEvent` → relay-table →
 * `ExtensionRunner.emit` chain and nothing else. If the table is mis-keyed, an
 * inverted, or an arm returns `undefined` instead of a payload, the author's
 * `pi.on("goal_updated", …)` handler simply never fires. A silent subscription
 * is the failure this asserts against.
 */
describe("session event relay table", () => {
	let tempDir: TempDir;
	let authStorage: AuthStorage;
	let session: AgentSession | undefined;

	beforeEach(async () => {
		tempDir = TempDir.createSync("@ultraworkers-relay-exhaustive-");
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "auth.db"));
		authStorage.keys.setRuntime("openai", "openai-test-key");
	});

	afterEach(() => {
		session?.dispose();
		session = undefined;
		authStorage.close();
		tempDir.remove();
	});

	it("delivers a dropped goal to a registered goal_updated handler", async () => {
		const modelRegistry = new ModelRegistry(authStorage);
		const sessionManager = SessionManager.inMemory(tempDir.path());
		const runtime = new ExtensionRuntime();
		const received: GoalUpdatedEvent[] = [];
		const extension = await loadExtensionFromFactory(
			pi => {
				pi.on("goal_updated", async event => {
					received.push(event);
				});
			},
			tempDir.path(),
			new EventBus(),
			runtime,
			"relay-exhaustive",
		);
		const extensionRunner = new ExtensionRunner([extension], runtime, tempDir.path(), sessionManager, modelRegistry);
		const mock = createMockModel({ provider: "openai", id: "gpt-test", responses: [] });
		const agent = new Agent({
			getApiKey: () => "test-key",
			initialState: { model: mock.model, systemPrompt: ["Test"], tools: [], messages: [] },
			convertToLlm,
			streamFn: mock.stream,
		});
		const settings = Settings.isolated({ "compaction.enabled": false, "todo.enabled": false });
		settings.setModelRole("default", `${mock.model.provider}/${mock.model.id}`);
		session = new AgentSession({
			agent,
			sessionManager,
			settings,
			modelRegistry,
			toolRegistry: new Map(),
			extensionRunner,
		});

		const created = await session.goalRuntime.createGoal({ objective: "ship the relay", tokenBudget: 5_000 });
		const goalId = created.goal.id;

		const dropped = await session.goalRuntime.dropGoal();

		// Both transitions announce themselves: creation enables the mode, drop
		// clears it. Asserting the sequence — not just the last frame — is what
		// catches an arm that drops a payload or reorders the relay.
		expect(received.map(event => event.goal?.status)).toEqual(["active", "dropped"]);
		const event = received.at(-1)!;
		expect(event.type).toBe("goal_updated");
		// The dropped goal the session itself minted — identity, not a fixture echo.
		expect(dropped?.id).toBe(goalId);
		expect(event.goal?.id).toBe(goalId);
		expect(event.goal?.objective).toBe("ship the relay");
		expect(event.state?.enabled).toBe(false);
		expect(event.state?.goal.id).toBe(goalId);
	});
});
