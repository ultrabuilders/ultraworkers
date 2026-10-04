/**
 * The command class behind an extension-registered top-level verb.
 *
 * This lives apart from `cli-commands.ts` for one concrete reason: it must
 * import `Command` as a *value* in order to extend it, and a value edge from
 * `cli-commands.ts` to `@oh-my-pi/pi-utils/cli` is what pushes `cli.ts` past its
 * 24-file entry-graph budget (measured: 24 → 25, with everything else held
 * constant). Hiding the import here instead keeps the router's edge type-only.
 *
 * Putting the class behind `CommandEntry.load` — the same lazy contract every
 * built-in command in that table already uses — means the module is evaluated
 * only once a verb actually dispatches. `ultraworkers --version`, `ultraworkers --help`, and every
 * prompt never reach it.
 */
import { type CommandCtor, Command } from "@oh-my-pi/pi-utils/cli";
import type { SubcommandHandler } from "../cli-commands";

/**
 * Wrap an extension handler as a command `run()` can dispatch.
 *
 * `run()` calls `new Cmd(argv, config)` then `instance.run()`, so `argv` here is
 * already the tokens *after* the verb — `ultraworkers deploy staging` arrives as
 * `["staging"]`. No argv parsing is performed: a verb owns its own grammar, and
 * anything needing one belongs in a session command instead.
 */
export function createSubcommandClass(handler: SubcommandHandler): CommandCtor {
	return class ExtensionSubcommand extends Command {
		override async run(): Promise<void> {
			await handler(this.argv);
		}
	};
}
