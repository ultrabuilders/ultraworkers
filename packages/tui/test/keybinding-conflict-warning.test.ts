import { describe, expect, it } from "bun:test";
import { KeybindingsManager, TUI_KEYBINDINGS } from "@oh-my-pi/pi-tui";
import { formatKeybindingConflicts } from "@oh-my-pi/pi-tui/chrome/keybinding-hints";

describe("formatKeybindingConflicts", () => {
	// The call site branches on this: a falsy return is what keeps a clean
	// keybindings.yml from producing an empty warning banner at every startup.
	it("returns empty for no conflicts, so the caller can pass getConflicts() straight through", () => {
		const keybindings = new KeybindingsManager(TUI_KEYBINDINGS, {
			"tui.input.submit": "ctrl+x",
		});

		expect(keybindings.getConflicts()).toEqual([]);
		expect(formatKeybindingConflicts(keybindings.getConflicts())).toBe("");
	});

	// The key is rendered through the active theme's key.* symbols and the
	// platform, so its exact glyph is `Ctrl+X` on one host and `⌃X` on another —
	// and another test file may have swapped the theme first. What must hold on
	// every host is the pairing: one line per contested key, naming every action
	// that holds it.
	it("pairs each contested key with every action holding it, one line per key", () => {
		const keybindings = new KeybindingsManager(TUI_KEYBINDINGS, {
			"tui.input.submit": "ctrl+x",
			"tui.select.confirm": "ctrl+x",
		});

		const [line, ...rest] = formatKeybindingConflicts(keybindings.getConflicts()).split("\n");

		expect(rest).toEqual([]);
		expect(line).toMatch(/^.+: tui\.input\.submit, tui\.select\.confirm$/);
	});

	it("keeps two separate collisions on separate lines, so neither hides the other", () => {
		const keybindings = new KeybindingsManager(TUI_KEYBINDINGS, {
			"tui.input.submit": ["ctrl+x", "ctrl+y"],
			"tui.select.confirm": "ctrl+x",
			"tui.select.cancel": "ctrl+y",
		});

		const lines = formatKeybindingConflicts(keybindings.getConflicts()).split("\n");

		expect(lines).toHaveLength(2);
		// Each line carries its own action pair, so a reader can tell which key
		// collided with what — collapsing them onto one line would lose that.
		expect(lines[0]).toMatch(/: tui\.input\.submit, tui\.select\.confirm$/);
		expect(lines[1]).toMatch(/: tui\.input\.submit, tui\.select\.cancel$/);
		// And the two lines are not the same collision written twice.
		expect(lines[0]).not.toBe(lines[1]);
	});

	// The action names come from the user's own keybindings.yml, so they reach
	// the terminal untrusted. A literal tab is what punches a visible hole in a
	// TUI row, and it survives key rendering untouched.
	it("expands a tab in an action name instead of letting it reach the terminal", () => {
		const conflicts = [{ key: "ctrl+x" as const, keybindings: ["tui.input.sub\tmit"] }];

		const line = formatKeybindingConflicts(conflicts);

		expect(line).not.toContain("\t");
		expect(line).toMatch(/tui\.input\.sub {2,}mit$/);
	});

	// Without the width cap an unbounded action name wraps and lands under the
	// next line's key column, which reads as a second (wrong) conflict.
	it("caps each action name at the line width so a long name cannot wrap into the next row", () => {
		const conflicts = [{ key: "ctrl+x" as const, keybindings: [`tui.${"n".repeat(200)}`] }];

		const line = formatKeybindingConflicts(conflicts);

		expect(line).not.toContain("\n");
		expect(line.length).toBeLessThanOrEqual(110);
	});
});
