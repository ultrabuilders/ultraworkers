/**
 * Read-only inventory of every discovered extension and why it is or is not loaded.
 *
 * RULE: this module must NOT re-derive state, shadowing, or disable policy.
 * Every field is copied from `loadAllExtensions` — the same call the dashboard
 * makes — so the CLI and the Extension Control Center cannot disagree about what
 * is loaded. The one thing that must be replicated exactly is the `disabledIds`
 * argument: passing `undefined` leaves the loader's internal disabled set empty,
 * so item-level disables would report `active` here and `disabled` in the
 * dashboard. That argument is the whole difference between the two.
 */

import { replaceTabs, shortenPath } from "@oh-my-pi/pi-tui/render/render-utils";
import type {
	DisabledReason,
	Extension,
	ExtensionKind,
	ExtensionState,
} from "@oh-my-pi/pi-tui/overlays/extensions/types";
import { Settings } from "../config/settings";
import { cfgDisabledExtensions } from "../extensibility/settings";
import { loadAllExtensions } from "../modes/components/extensions/state-manager";

/** One discovered extension, reduced to the fields a triage question needs. */
export interface ExtensionTriageRow {
	/** Unique id, `${kind}:${name}`. */
	id: string;
	kind: ExtensionKind;
	state: ExtensionState;
	/** Present only when `state` explains a block. */
	disabledReason?: DisabledReason;
	provider: string;
	level: "user" | "project" | "native";
	/** Already shortened for display. */
	path: string;
	/**
	 * True when this row is the lower-precedence copy of a same-name item.
	 *
	 * Deliberately a boolean, not the winner's id: the shadower is a property of
	 * the discovery pass, not of this row, and reporting it here would either
	 * be always-undefined or re-derive shadowing — both of which this module
	 * exists to avoid.
	 */
	shadowed: boolean;
}

export interface ExtensionsTriageArgs {
	cwd?: string;
	json: boolean;
}

/** Project one discovered extension. Pure: reads nothing but its argument. */
export function toTriageRow(ext: Extension): ExtensionTriageRow {
	return {
		id: ext.id,
		kind: ext.kind,
		state: ext.state,
		...(ext.disabledReason ? { disabledReason: ext.disabledReason } : {}),
		provider: ext.source.provider,
		level: ext.source.level,
		path: shortenPath(ext.path),
		shadowed: ext.state === "shadowed" || ext.shadowedBy !== undefined,
	};
}

function formatRow(row: ExtensionTriageRow): string {
	// Tabs and raw home paths both break a fixed-width terminal, and a path is
	// the one field here that routinely contains a tab.
	const reason = row.disabledReason ? ` (${row.disabledReason})` : "";
	return replaceTabs(`${row.id}  ${row.state}${reason}  ${row.provider}/${row.level}  ${row.path}`);
}

export async function runExtensionsTriage(args: ExtensionsTriageArgs): Promise<void> {
	const sm = await Settings.init();
	const disabledIds = cfgDisabledExtensions.get(sm);
	const extensions = await loadAllExtensions(args.cwd, disabledIds);
	const rows = extensions.map(toTriageRow);

	if (args.json) {
		console.log(JSON.stringify({ extensions: rows }, null, 2));
		return;
	}

	if (rows.length === 0) {
		console.log("No extensions discovered.");
		return;
	}

	for (const row of rows) {
		console.log(formatRow(row));
	}
}
