/**
 * Read-only audit of approval prompts recorded in a session transcript.
 */

import { Args, Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { approvalAuditHelp as commandHelp } from "../cli/command-help";
import { runApprovalAudit } from "../cli/approval-audit-cli";

export default class ApprovalAudit extends Command {
	static description = commandHelp.description;

	static args = {
		sessionFile: Args.string({
			description: "Path to a session .jsonl transcript",
			required: true,
		}),
	};

	static flags = {
		json: Flags.boolean({ description: "Output JSON" }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(ApprovalAudit);

		await runApprovalAudit({
			// `required: true` is enforced by the parser, but the parsed type stays
			// optional; same shape as `read`'s path.
			sessionFile: args.sessionFile ?? "",
			json: flags.json ?? false,
		});
	}
}
