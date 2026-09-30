import type { InteractiveModeContext } from "../../modes/types";
import { reloadTuiPluginState } from "../builtin-marketplace";
import type { SlashCommandRuntime } from "../types";

/**
 * Assemble the headless runtime shape from the interactive context.
 *
 * The TUI dispatcher already builds this to run a `handle`-only command, and a
 * command that implements BOTH tiers needs the same object inside its own
 * `handleTui`. That is why it lives here rather than inline at the dispatcher:
 * two adapters drift, and the copy that rots is always the one only the newer
 * path reaches — which for a reload command means a TUI reload quietly skipping
 * whichever step the headless adapter grew and the TUI one did not.
 */
export function tuiRuntimeAsSlashCommand(ctx: InteractiveModeContext): SlashCommandRuntime {
	return {
		session: ctx.session,
		sessionManager: ctx.sessionManager,
		settings: ctx.settings,
		cwd: ctx.sessionManager.getCwd(),
		output: (text: string) => {
			ctx.showStatus(text);
		},
		refreshCommands: () => ctx.refreshSlashCommandState(),
		reloadPlugins: () => reloadTuiPluginState(ctx),
	};
}
