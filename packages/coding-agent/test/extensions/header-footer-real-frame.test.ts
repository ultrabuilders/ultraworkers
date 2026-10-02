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
 * The link between the extension UI context and the frame the user actually sees.
 *
 * The other header/footer suites hand `ExtensionUiController` a context carrying a
 * container the test built itself, then assert the component landed in it. That
 * proves the controller fills whatever container it is given — it says nothing about
 * which container production gives it. Rewriting `interactive-mode.ts`'s assignment
 * to a throwaway `new Container()` left all of them green while making an extension's
 * header invisible in the terminal, which is the failure a user would report and no
 * test would catch.
 *
 * So these drive a real `InteractiveMode` and read the container back off the
 * composer — the object that renders — instead of off the mode's own field. The
 * distinction is the whole test: `mode.extensionHeaderContainer` is whatever the mode
 * was configured with, `mode.composer.extensionHeader` is the one on screen.
 */
interface LabelledComponent extends ExtensionUiComponent {
	label: string;
}

function component(label: string): LabelledComponent {
	return { label, render: () => [] };
}

describe("an extension header reaches the frame the composer draws", () => {
	let tempDir: TempDir;
	let authStorage: AuthStorage;
	let session: AgentSession;
	let mode: InteractiveMode;

	beforeAll(() => {
		initTheme();
	});

	beforeEach(async () => {
		resetSettingsForTest();
		tempDir = TempDir.createSync("@ultraworkers-ext-header-frame-");
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

	it("writes into the composer's own band, not a container only the mode can see", () => {
		const ui = mode.getToolUIContext();
		if (!ui) throw new Error("Interactive mode must expose a UI context to extensions");
		const band = component("status-band");

		ui.setHeader(() => band, { owner: "ext:alpha" });

		// Read off the composer, not off the mode. Under the wiring mutation that
		// made this feature invisible, the mode's container is a throwaway and this
		// list stays empty.
		expect(mode.composer.extensionHeader.children).toContain(band);
	});

	it("writes a footer into the footer band, and keeps the two apart", () => {
		const ui = mode.getToolUIContext();
		if (!ui) throw new Error("Interactive mode must expose a UI context to extensions");
		const header = component("header-band");
		const footer = component("footer-band");

		ui.setHeader(() => header, { owner: "ext:alpha" });
		ui.setFooter(() => footer, { owner: "ext:alpha" });

		expect(mode.composer.extensionHeader.children).toContain(header);
		expect(mode.composer.extensionFooter.children).toContain(footer);
		// A band swapped onto the other side would render in the wrong place while
		// both containment assertions above still passed.
		expect(mode.composer.extensionHeader.children).not.toContain(footer);
		expect(mode.composer.extensionFooter.children).not.toContain(header);
	});

	it("puts both bands in the composer's rendered child list", () => {
		// Containment alone would be satisfied by a container nothing draws. The band
		// only exists for the user if the composer attached it to its UI root.
		expect(mode.composer.ui.children).toContain(mode.composer.extensionHeader);
		expect(mode.composer.ui.children).toContain(mode.composer.extensionFooter);
	});

	it("withdraws the band it mounted, so a re-register cannot leave a ghost", () => {
		const ui = mode.getToolUIContext();
		if (!ui) throw new Error("Interactive mode must expose a UI context to extensions");
		const band = component("status-band");

		ui.setHeader(() => band, { owner: "ext:alpha" });
		expect(mode.composer.extensionHeader.children).toContain(band);

		ui.setHeader(undefined, { owner: "ext:alpha" });
		expect(mode.composer.extensionHeader.children).not.toContain(band);
	});
});
