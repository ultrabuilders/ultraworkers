/**
 * Session management from the shell: `omp session <list|archive|unarchive>`.
 */

import { Args, Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { sessionHelp as commandHelp } from "../cli/command-help";
import { runSessionArchive, runSessionList, runSessionUnarchive } from "../cli/session-cli";

export default class Session extends Command {
	static description = commandHelp.description;
	static args = {
		action: Args.string({
			description: "What to do",
			required: false,
			default: "list",
		}),
		id: Args.string({ description: "Session id, or any unambiguous prefix", required: false }),
	};

	static flags = {
		last: Flags.boolean({ description: "Print the newest session's path and exit" }),
		all: Flags.boolean({ description: "Include archived sessions" }),
		json: Flags.boolean({ description: "Emit JSON" }),
		"agent-dir": Flags.string({ description: "Agent directory to operate on" }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(Session);
		const agentDir = flags["agent-dir"];
		const action = args.action;

		switch (action) {
			case "list":
				await runSessionList({
					agentDir,
					last: flags.last ?? false,
					all: flags.all ?? false,
					json: flags.json ?? false,
				});
				return;
			case "archive":
			case "unarchive": {
				if (!args.id) {
					process.stderr.write(`${action} needs a session id\n`);
					process.exitCode = 1;
					return;
				}
				const run = action === "archive" ? runSessionArchive : runSessionUnarchive;
				await run({ agentDir, id: args.id });
				return;
			}
			default:
				process.stderr.write(`Unknown action "${action}". Expected list, archive, or unarchive.\n`);
				process.exitCode = 1;
		}
	}
}
