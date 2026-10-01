/**
 * Utilities for formatting keybinding hints in the UI.
 */
import { getKeybindings, type KeybindingConflict, type KeyId, type Keybinding } from "../keybindings";
import {
	type AppKeybinding,
	formatKeyHint,
	formatKeyHints,
	type KeyName,
	type KeybindingsManager,
} from "../app-keybindings";
import { theme } from "../theme/index";
import { replaceTabs, TRUNCATE_LENGTHS, truncateToWidth } from "../render/render-utils";

/**
 * Primary (first) key bound to an editor action, formatted for footer hints;
 * empty when unbound. Full alternatives: `formatKeyHints(getKeybindings().getKeys(action))`.
 */
export function editorKey(action: Keybinding): string {
	const [key] = getKeybindings().getKeys(action);
	return key ? formatKeyHint(key) : "";
}

/** Primary keys of several actions, slash-joined: `editorKeys("tui.select.up", "tui.select.down")` → `↑/↓`. */
export function editorKeys(...actions: Keybinding[]): string {
	return actions.map(editorKey).join("/");
}

/**
 * Keys bound to `action`, or `fallback` when the active registry has none — a
 * TUI-only registry carries no `app.*` bindings. Mirrors the fallbacks in
 * `keybinding-matchers.ts`, so hints name the keys the matcher accepts.
 */
export function boundKeys(action: Keybinding, fallback: readonly KeyId[]): readonly KeyId[] {
	const keys = getKeybindings().getKeys(action);
	return keys.length > 0 ? keys : fallback;
}

/** Primary interrupt key (`app.interrupt`, raw Escape when unbound, as `matchesAppInterrupt`). */
export function interruptKey(): string {
	return formatKeyHint(boundKeys("app.interrupt", ["escape"])[0] ?? "escape");
}

/** Primary key bound to an app action (see {@link editorKey}); all keys: `getDisplayString`. */
export function appKey(keybindings: KeybindingsManager, action: AppKeybinding): string {
	const [key] = keybindings.getKeys(action);
	return key ? formatKeyHint(key) : "";
}

/**
 * Format a keybinding hint with consistent styling: dim key, muted description.
 * Looks up the key from editor keybindings automatically.
 *
 * @param action - Keybinding action name (e.g., "tui.select.confirm", "app.tools.expand")
 * @param description - Description text (e.g., "to expand", "cancel")
 * @returns Formatted string with dim key and muted description
 */
export function keyHint(action: Keybinding, description: string): string {
	return theme.fg("dim", editorKey(action)) + theme.fg("muted", ` ${description}`);
}

/**
 * Format a keybinding hint for app-level actions.
 * Requires the KeybindingsManager instance.
 *
 * @param keybindings - KeybindingsManager instance
 * @param action - App keybinding name (e.g., "app.interrupt", "app.editor.external")
 * @param description - Description text
 * @returns Formatted string with dim key and muted description
 */
export function appKeyHint(keybindings: KeybindingsManager, action: AppKeybinding, description: string): string {
	return theme.fg("dim", appKey(keybindings, action)) + theme.fg("muted", ` ${description}`);
}

/**
 * Format a hint for fixed (non-configurable) keys, e.g. `rawKeyHint(["up", "down"], "navigate")`.
 * Alternatives render slash-separated (see {@link formatKeyHints}).
 */
export function rawKeyHint(keys: KeyName | readonly KeyName[], description: string): string {
	return theme.fg("dim", formatKeyHints(keys)) + theme.fg("muted", ` ${description}`);
}

/**
 * Render the keys two or more actions are both bound to, one per line: the key
 * first, then every action sharing it. Empty when nothing conflicts, so a caller
 * can pass `getConflicts()` straight through and skip the check itself.
 *
 * Names come from the user's own `keybindings.yml`, so they are untrusted text
 * on their way to the TUI — a tab in an action name punches a hole in the
 * layout, and a long one wraps into the next line's column. Both are sanitised
 * here rather than at the call site so no future caller can forget.
 *
 * @param conflicts - As returned by `KeybindingsManager.getConflicts()`
 */
export function formatKeybindingConflicts(conflicts: readonly KeybindingConflict[]): string {
	if (conflicts.length === 0) return "";
	const lines: string[] = [];
	for (const conflict of conflicts) {
		// The cap is on the finished line, not on each fragment: capping the key
		// and the names separately still lets `key: ` push the row past the width,
		// and a row that overflows wraps under the next line's key column.
		const actions = conflict.keybindings.map(binding => replaceTabs(binding)).join(", ");
		lines.push(truncateToWidth(`${formatKeyHint(conflict.key)}: ${actions}`, TRUNCATE_LENGTHS.LINE));
	}
	return lines.join("\n");
}
