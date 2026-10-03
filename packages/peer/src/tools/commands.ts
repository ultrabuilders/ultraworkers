/**
 * The two human slash commands: `/list-agents` (alias `/peers`) and `/rename`.
 *
 * They are slash commands rather than tools, and that placement is the point.
 * Renaming is a human decision, so it costs the agent nothing on the four-verb
 * §2.3 surface — which is part of what keeps that surface at four.
 *
 * `notify` is injected rather than reached for through `ctx.ui`, so the decision
 * logic above can be tested without a host and so this module commits to no
 * particular UI surface.
 */

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { ExtraReserved } from "../identity/index";
import { renameName } from "../identity/index";
import type { PeerRosterEntry } from "./verbs";

/** What the commands need from the host. */
export interface PeerCommandDeps {
	/** This session's current name. */
	readonly currentName: () => string;
	/** Apply a new name. Runs inside the same critical section as allocation. */
	readonly applyName: (next: string) => void;
	/** Is some *other* session holding this case-folded key? */
	readonly isNameTaken: (key: string) => boolean;
	/** Live roster across sessions. */
	readonly roster: () => Promise<readonly PeerRosterEntry[]>;
	/** Show a line to the human. */
	readonly notify: (message: string) => void;
	/** Role words this agent may not claim for itself. */
	readonly reservedNames?: ExtraReserved;
}

/** Register `/list-agents`, `/peers` and `/rename`. Call once per session. */
export function registerPeerCommands(api: ExtensionAPI, deps: PeerCommandDeps): void {
	async function showRoster(): Promise<void> {
		const self = deps.currentName();
		// Self first: an agent asking who it is talking to needs its own row
		// without scanning for it, and a human reading the list wants the same.
		const roster = [...(await deps.roster())].sort((a, b) =>
			a.id === self ? -1 : b.id === self ? 1 : a.id.localeCompare(b.id),
		);
		if (roster.length === 0) {
			deps.notify("No peer sessions are registered.");
			return;
		}
		deps.notify(roster.map(p => `${p.id === self ? "* " : "  "}${p.id} — ${p.task}`).join("\n"));
	}

	for (const name of ["list-agents", "peers"]) {
		api.registerCommand(name, {
			description: "List live peer sessions, this one first.",
			handler: async () => {
				await showRoster();
			},
		});
	}

	api.registerCommand("rename", {
		description: "Rename this session. Accepts any string; reserved names are refused.",
		handler: async args => {
			const outcome = renameName(
				deps.currentName(),
				args,
				deps.isNameTaken,
				deps.reservedNames ?? new Set<string>(),
			);
			if (outcome.kind === "refused") {
				// Each refusal names its own cause: "taken" means a peer has it,
				// "reserved" means policy, "empty" means the input was unusable.
				deps.notify(
					outcome.reason === "taken"
						? `Another session already holds ${outcome.requested ?? "that name"}.`
						: outcome.reason === "reserved"
							? `${outcome.requested ?? "That name"} is reserved.`
							: "A name is required, and must contain something a reader can see.",
				);
				return;
			}
			deps.applyName(outcome.to);
			deps.notify(`Renamed ${outcome.from} → ${outcome.to}.`);
		},
	});
}
