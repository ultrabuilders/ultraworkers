/**
 * Check for and install updates.
 */

import { WIRE_NAME } from "@oh-my-pi/pi-utils";
import { Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { updateHelp as commandHelp } from "../cli/command-help";
import * as pluginCli from "../cli/plugin-cli";
import * as updateCli from "../cli/update-cli";
import { CliUsageError } from "../cli/usage-error";
import { initTheme } from "@oh-my-pi/pi-tui/theme";

export default class Update extends Command {
	static description = commandHelp.description;
	static flags = {
		force: Flags.boolean({ char: "f", description: "Force update", default: false }),
		check: Flags.boolean({ char: "c", description: "Check for updates without installing", default: false }),
		plugins: Flags.boolean({ char: "l", description: "Update installed plugins", default: false }),
		canary: Flags.boolean({ description: "Switch to the canary channel and update", default: false }),
		stable: Flags.boolean({ description: "Switch back to the stable channel", default: false }),
	};

	// Examples are rendered verbatim into `omp update --help` and are the one part of
	// help text the reader is expected to copy and paste, so they name the INVOCABLE
	// command (WIRE_NAME, pinned by `wire-name.test.ts` and matching `package.json#bin`),
	// never the brand. A literal `omp` here is a copy that stays green after the binary
	// it names is renamed — the same defect as `BUNDLED_PACKAGES` and `cacheKey`.
	static examples = [
		`${WIRE_NAME} update`,
		`${WIRE_NAME} update --check`,
		`${WIRE_NAME} update --canary`,
		`# If GitHub rate-limits release metadata, set GITHUB_TOKEN or GH_TOKEN\n  GITHUB_TOKEN=... ${WIRE_NAME} update`,
	];

	async run(): Promise<void> {
		const { flags } = await this.parse(Update);
		await initTheme();
		if (flags.canary && flags.stable) throw new CliUsageError("--canary and --stable are mutually exclusive");
		if (flags.plugins) {
			await pluginCli.runPluginCommand({ action: "upgrade", args: [], flags: {} });
		} else {
			await updateCli.runUpdateCommand({
				force: flags.force,
				check: flags.check,
				channel: flags.canary ? "canary" : flags.stable ? "stable" : undefined,
			});
		}
	}
}
