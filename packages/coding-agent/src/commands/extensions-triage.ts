/**
 * Read-only inventory of discovered extensions and their load state.
 */

import { Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { extensionsTriageHelp as commandHelp } from "../cli/command-help";
import { runExtensionsTriage } from "../cli/extensions-triage-cli";

export default class ExtensionsTriage extends Command {
	static description = commandHelp.description;

	static flags = {
		json: Flags.boolean({ description: "Output JSON" }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(ExtensionsTriage);

		await runExtensionsTriage({
			cwd: process.cwd(),
			json: flags.json ?? false,
		});
	}
}
