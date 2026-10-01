/**
 * `omp config migrate` — move a config root from its old name to its new one.
 *
 * Dry-run by default. A user who types a migration command and loses their
 * settings has no way back, so the destructive path is opt-in and the default
 * path is a read.
 *
 * The formatter lives here rather than in the engine so that `pi-utils` stays
 * free of output concerns and this file can be tested through the same surface
 * the user sees.
 */

import * as os from "node:os";
import {
	type MigrationKind,
	type MigrationOptions,
	type MigrationPlan,
	executeConfigMigration,
	planConfigMigration,
} from "@oh-my-pi/pi-utils/config-migrate";
import { CONFIG_DIR_NAME_NEXT, LEGACY_CONFIG_DIR_NAME, XDG_CONFIG_DIR_CANDIDATES } from "@oh-my-pi/pi-utils";
import { shortenPath } from "@oh-my-pi/pi-tui/render/render-utils";
import chalk from "@oh-my-pi/pi-utils/chalk";

const KIND_LABELS: Record<MigrationKind, string> = {
	base: "config root",
	"xdg-data": "XDG data",
	"xdg-state": "XDG state",
	"xdg-cache": "XDG cache",
};

function display(target: string): string {
	return shortenPath(target, os.homedir());
}

/**
 * Where the data is, and where it is going.
 *
 * The XDG spellings come from `XDG_CONFIG_DIR_CANDIDATES` rather than a literal:
 * that list is already ordered canonical-first and is what the read and write
 * paths consult, so a second copy of the same pair is a pair that drifts.
 */
export function migrationOptions(): MigrationOptions {
	const [newAppName, oldAppName] = XDG_CONFIG_DIR_CANDIDATES;
	return {
		oldBaseName: LEGACY_CONFIG_DIR_NAME,
		newBaseName: CONFIG_DIR_NAME_NEXT,
		oldAppName,
		newAppName,
		home: os.homedir(),
		env: process.env,
		platform: process.platform,
	};
}

function printPlan(plan: MigrationPlan): void {
	if (plan.moves.length === 0 && plan.conflicts.length === 0) {
		console.log(chalk.dim("Nothing to migrate — no config root found under its old name."));
		return;
	}
	if (plan.moves.length > 0) {
		console.log(chalk.bold("Would move:"));
		for (const move of plan.moves) {
			console.log(`  ${KIND_LABELS[move.kind]}: ${display(move.from)} → ${display(move.to)}`);
		}
	}
	if (plan.conflicts.length > 0) {
		// Never merged automatically: two roots are two installs, and joining
		// them would silently drop whichever file lost the collision.
		console.log(chalk.yellow("\nLeft alone — both paths exist, merge them yourself:"));
		for (const conflict of plan.conflicts) {
			console.log(`  ${KIND_LABELS[conflict.kind]}: ${display(conflict.from)} and ${display(conflict.to)}`);
		}
	}
}

export async function configMigrate(apply: boolean): Promise<void> {
	const plan = await planConfigMigration(migrationOptions());

	if (!apply) {
		printPlan(plan);
		console.log(chalk.dim("\nDry run. Re-run with --apply to move these directories."));
		return;
	}

	const outcome = await executeConfigMigration(plan);
	printPlan(plan);
	console.log("");
	if (outcome.moved > 0)
		console.log(chalk.green(`Moved ${outcome.moved} director${outcome.moved === 1 ? "y" : "ies"}.`));
	else console.log(chalk.dim("Nothing to move."));
	if (outcome.skipped > 0) console.log(chalk.yellow(`Skipped ${outcome.skipped} existing destination(s).`));
	for (const entry of outcome.failed) {
		console.error(chalk.red(`Failed to move ${display(entry.move.from)}: ${entry.reason}`));
	}
	process.exitCode = outcome.failed.length > 0 ? 1 : 0;
}
