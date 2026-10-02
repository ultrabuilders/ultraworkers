import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "bun:test";
import * as path from "node:path";
import { Agent } from "@oh-my-pi/pi-agent-core";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { resetSettingsForTest, Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { InteractiveMode } from "@oh-my-pi/pi-coding-agent/modes/interactive-mode";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import type { ExtensionUiComponent } from "@oh-my-pi/pi-tui/chat/extension-types";
import { initTheme } from "@oh-my-pi/pi-tui/theme";
import { TempDir } from "@oh-my-pi/pi-utils";

/**
 * `ui.setWidget`, observed where production puts it.
 *
 * Unlike the header/footer bands, the widget bands are NOT the composer's objects —
 * `InteractiveMode` creates them and hands them to `composer.setRuntimeChildren`. So
 * "the widget is in a container" and "that container is on screen" are two separate
 * facts, and a test that stops at the first has reproduced the defect this seam is
 * about: the call succeeds, the component exists, and nothing is ever drawn.
 *
 * Hence the second assertion in every test here. `hookWidgetContainerAbove` holding
 * the widget is worth nothing on its own — the container is created, mounted and
 * populated by three separate statements in `interactive-mode.ts`, and only the
 * middle one is observable from the widget side.
 */
interface LabelledComponent extends ExtensionUiComponent {
	label: string;
}

function component(label: string): LabelledComponent {
	return { label, render: () => [] };
}

describe("setWidget reaches a band the composer draws", () => {
	let tempDir: TempDir;
	let authStorage: AuthStorage;
	let session: AgentSession;
	let mode: InteractiveMode;

	const ui = () => {
		const context = mode.getToolUIContext();
		if (!context) throw new Error("Interactive mode must expose a UI context to extensions");
		return context;
	};

	beforeAll(() => {
		initTheme();
	});

	beforeEach(async () => {
		resetSettingsForTest();
		tempDir = TempDir.createSync("@pi-widget-frame-");
		await Settings.init({ inMemory: true, cwd: tempDir.path() });
		authStorage = await AuthStorage.create(path.join(tempDir.path(), "testauth.db"));
		const modelRegistry = new ModelRegistry(authStorage);
		const model = modelRegistry.find("anthropic", "claude-sonnet-4-5");
		if (!model) throw new Error("Expected claude-sonnet-4-5 to exist in registry");

		session = new AgentSession({
			agent: new Agent({
				initialState: { model, systemPrompt: ["Test"], tools: [], messages: [] },
			}),
			sessionManager: SessionManager.create(tempDir.path(), tempDir.path()),
			settings: Settings.isolated(),
			modelRegistry,
		});
		mode = new InteractiveMode(session, "test");
		// `init()` is what installs the runtime dock: it is the only caller of
		// `composer.setRuntimeChildren`, which is what puts the widget bands on
		// screen. Without it the mode has the containers but nothing has received
		// them, and every "is it mounted" assertion below fails for the wrong reason.
		await mode.init({ suppressWelcomeIntro: true });
		await mode.initHooksAndCustomTools();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		mode?.stop();
		await session?.dispose();
		authStorage?.close();
		tempDir?.removeSync();
		resetSettingsForTest();
	});

	it("puts the widget in the container the mode created for the band", () => {
		const widget = component("widget-row");

		ui().setWidget("banner", () => widget);

		expect(mode.hookWidgetContainerAbove.children).toContain(widget);
	});

	it("keeps that widget band attached to the composer's render tree", () => {
		// The assertion the first one cannot make. `setRuntimeChildren` is what puts
		// these containers on screen; a band that is populated but never handed over
		// is the exact shape of "the call succeeded and nothing appeared".
		expect(mode.composer.ui.children).toContain(mode.hookWidgetContainerAbove);
		expect(mode.composer.ui.children).toContain(mode.hookWidgetContainerBelow);
	});

	it("sends a belowEditor widget to the lower band and leaves the upper one alone", () => {
		const widget = component("widget-row");

		ui().setWidget("banner", () => widget, { placement: "belowEditor" });

		expect(mode.hookWidgetContainerBelow.children).toContain(widget);
		expect(mode.hookWidgetContainerAbove.children).not.toContain(widget);
	});

	it("takes the widget back out of the same container on withdrawal", () => {
		const widget = component("widget-row");

		ui().setWidget("banner", () => widget);
		expect(mode.hookWidgetContainerAbove.children).toContain(widget);

		ui().setWidget("banner", undefined);
		expect(mode.hookWidgetContainerAbove.children).not.toContain(widget);
	});
});
