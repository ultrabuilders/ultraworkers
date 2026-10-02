import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { setKeyHintPlatform } from "@oh-my-pi/pi-tui/app-keybindings";
import { buildHotkeysMarkdown } from "@oh-my-pi/pi-tui/hotkeys-markdown";
import { initThemeSync, setSymbolPreset } from "@oh-my-pi/pi-tui/theme";

/** Exit-row wiring for stubs that only care about display strings: no key claims the
 *  forward-delete role, so the exit row renders its plain "Exit" wording. */
const noForwardDelete = { getKeys: () => [], matchesCanonical: () => false };

describe("buildHotkeysMarkdown", () => {
	// Key hints render through the ACTIVE THEME's `key.*` symbols — words in the
	// ascii preset (`Ctrl`), glyphs in unicode (`⌃`). These assertions pin exact
	// bytes, so they have to pin the preset as well as the platform. Before this,
	// they held only while no other test file had loaded a theme, which made this
	// file pass alone and fail in the suite depending purely on run order.
	beforeEach(async () => {
		await setSymbolPreset("ascii");
	});

	afterEach(() => {
		setKeyHintPlatform(undefined);
		initThemeSync();
	});

	it("emits flush-left markdown and uses the configured temporary selector hint", () => {
		const displayStrings: Record<string, string> = {
			"app.clipboard.copyLine": "Alt+Shift+L",
			"app.clipboard.copyPrompt": "Ctrl+Shift+P",
			"app.plan.toggle": "Alt+Shift+P",
			"app.tools.expand": "Ctrl+O",
			"app.tools.toggleVisibility": "Ctrl+Shift+O",
			"app.display.reset": "Alt+L",
			"app.interrupt": "Esc",
			"app.clear": "Ctrl+C",
			"app.exit": "Ctrl+D",
			"app.suspend": "Ctrl+Z",
			"app.thinking.cycle": "Shift+Tab",
			"app.model.cycleForward": "Ctrl+P",
			"app.model.cycleBackward": "Shift+Ctrl+P",
			"app.model.selectTemporary": "Ctrl+Shift+L",
			"app.model.select": "Alt+M",
			"app.history.search": "Ctrl+R",
			"app.thinking.toggle": "Ctrl+T",
			"app.editor.external": "Ctrl+G",
			"app.retry": "Alt+R",
			"app.clipboard.pasteImage": "Ctrl+V",
			"app.stt.toggle": "Alt+H",
			"app.live.toggle": "Ctrl+L",
		};
		const markdown = buildHotkeysMarkdown({
			keybindings: {
				...noForwardDelete,
				getDisplayString(action) {
					return displayStrings[action] ?? "Disabled";
				},
			},
		});

		const lines = markdown.split("\n");
		expect(lines[0]).toBe("**Navigation**");
		expect(markdown).toContain("| `Ctrl+Shift+P` | Copy whole prompt |");
		expect(markdown).toContain("| `Ctrl+Shift+L` | Select model (temporary) |");
		expect(markdown).toContain("| `Alt+M` | Select model (set roles) |");
		expect(markdown).toContain("| `Alt+L` | Reset terminal display |");
		expect(markdown).toContain("| `Ctrl+L` | Start/stop live voice mode (/live) |");
		expect(markdown).toContain("| `Alt+R` | Retry last failed assistant turn |");
		expect(markdown).toContain("| `Alt+Shift+P` | Toggle plan mode |");
		expect(markdown).toContain("| `Ctrl+Shift+O` | Toggle tool activity visibility |");
		expect(markdown).toContain("| `#<number>` | GitHub issue/PR reference");
		expect(markdown).toContain("| `#` / `#<text>` | Prompt actions");
		for (const line of lines) {
			if (line.length === 0) continue;
			expect(line.startsWith(" ")).toBe(false);
			expect(line.startsWith("\t")).toBe(false);
		}
	});

	it("renders the temporary selector row as disabled when no display string is configured", () => {
		const markdown = buildHotkeysMarkdown({
			keybindings: {
				...noForwardDelete,
				getDisplayString(action) {
					if (action === "app.model.selectTemporary") {
						return "";
					}
					if (action === "app.model.select") {
						return "Alt+M";
					}
					if (action === "app.display.reset") {
						return "Alt+L";
					}
					return "Ctrl+K";
				},
			},
		});

		expect(markdown).toContain("| `Disabled` | Select model (temporary) |");
		expect(markdown).toContain("| `Alt+M` | Select model (set roles) |");
	});

	it("drops Option/Cmd static navigation labels off darwin", () => {
		setKeyHintPlatform("linux");
		const markdown = buildHotkeysMarkdown({
			keybindings: { ...noForwardDelete, getDisplayString: () => "Disabled" },
		});

		expect(markdown).not.toContain("Option+");
		expect(markdown).not.toContain("Cmd+");
	});

	it("lists a shortcut contributed through the registration seam, after the built-in groups", () => {
		const markdown = buildHotkeysMarkdown({
			keybindings: { ...noForwardDelete, getDisplayString: () => "Disabled" },
			extraGroups: [
				{
					title: "Deploy helper",
					rows: [{ keys: ["ctrl+shift+d"], action: "Deploy to staging" }],
				},
			],
		});

		// The row a user reads to learn their extension's key exists at all:
		// formatted through the same path as a built-in row, under its own heading.
		expect(markdown).toContain("**Deploy helper**");
		expect(markdown).toContain("| `Ctrl+Shift+D` | Deploy to staging |");
		// Rendered after core's groups, so a registrant never displaces a built-in row.
		expect(markdown.indexOf("**Deploy helper**")).toBeGreaterThan(markdown.indexOf("**Other**"));
	});

	it("leaves the reference byte-identical when nothing is contributed", () => {
		const keybindings = { ...noForwardDelete, getDisplayString: () => "Disabled" };
		const withoutSeam = buildHotkeysMarkdown({ keybindings });
		const withEmptyContributions = buildHotkeysMarkdown({ keybindings, extraGroups: [] });

		// The negative half of the seam contract: an extension that registers no
		// shortcut must not be able to change what /hotkeys prints — including by
		// contributing a group, which must not leave an empty heading behind.
		expect(withEmptyContributions).toBe(withoutSeam);
		expect(withoutSeam).not.toContain("****");
	});
});
