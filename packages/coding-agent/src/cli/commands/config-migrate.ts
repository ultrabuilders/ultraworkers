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

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { $ } from "bun";
import {
	type MigrationKind,
	type MigrationOptions,
	type MigrationPlan,
	executeConfigMigration,
	planConfigMigration,
} from "@oh-my-pi/pi-utils/config-migrate";
import {
	$which,
	CONFIG_DIR_NAME_NEXT,
	getAgentDbPath,
	getDaemonRuntimeRoot,
	getHistoryDbPath,
	LEGACY_CONFIG_DIR_NAME,
	XDG_CONFIG_DIR_CANDIDATES,
} from "@oh-my-pi/pi-utils";
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

/**
 * A file the migration would move out from under a live process.
 *
 * `pids` is empty when a file exists but nothing is known to hold it; it is
 * never a claim that the file is safe.
 */
export interface LiveHolder {
	readonly path: string;
	readonly pids: readonly number[];
}

/**
 * The files whose live handle makes a directory rename unsafe.
 *
 * Two roots, and they are not the same root: the SQLite databases live at the
 * DATA root while daemons register under the STATE root, so a check that only
 * looked for a running daemon would wave through the case that actually
 * corrupts data — a database open with no daemon of its own. Both are listed.
 *
 * The `-wal` and `-shm` siblings are included because a SQLite database can be
 * held open through its write-ahead log alone, and because a hot `-wal` is the
 * clearest evidence that the database is live rather than merely present.
 */
export function guardedPaths(): string[] {
	const paths = [getAgentDbPath(), getHistoryDbPath()];
	const withSiblings = paths.flatMap(file => [file, `${file}-wal`, `${file}-shm`]);
	return [...withSiblings, ...daemonRuntimePaths()];
}

/** Whatever a running daemon leaves behind under the state root. */
function daemonRuntimePaths(): string[] {
	try {
		return fs.readdirSync(getDaemonRuntimeRoot()).map(name => path.join(getDaemonRuntimeRoot(), name));
	} catch {
		// No daemon root yet is the ordinary case on a fresh install.
		return [];
	}
}

/**
 * PIDs currently holding each path, via `lsof -t`.
 *
 * The same command and the same conservatism as `removeBackupBestEffort` in
 * `update-cli.ts`: only exit 1 with empty stdout *and* empty stderr proves a
 * file is unused. A missing `lsof`, a diagnostic on stderr, or a spawn failure
 * is treated as "possibly held", because the failure this guards against is
 * silent data loss and the cost of a false positive is one `--force`.
 */
export async function findLiveHolders(paths: readonly string[]): Promise<LiveHolder[]> {
	const lsof = $which("lsof") ?? ((await Bun.file("/usr/sbin/lsof").exists()) ? "/usr/sbin/lsof" : null);
	const holders: LiveHolder[] = [];
	for (const file of paths) {
		if (!(await Bun.file(file).exists())) continue;
		let pids: number[] = [];
		try {
			const result = await $`${lsof} -t -- ${file}`.quiet().nothrow();
			// Bun Shell hands back Buffers, not strings: `stdout.split` is not a
			// function and the TypeError would land in the catch below, reporting
			// every held file as "unknown holder" — a guard that cannot name what it
			// found still refuses, but the user is left with nothing to act on.
			const stdout = result.stdout.toString();
			const provenUnused = result.exitCode === 1 && stdout.length === 0 && result.stderr.length === 0;
			pids = provenUnused ? [] : stdout.split("\n").map(Number).filter(Number.isInteger);
		} catch {
			pids = [-1]; // cannot prove it is unused
		}
		if (pids.length > 0) holders.push({ path: file, pids });
	}
	return holders;
}

/**
 * The refusal message.
 *
 * Exported, and free of `process.exit`, so the contract can be asserted without
 * killing the test runner: the command decides to exit, this decides what the
 * user is told. It names the databases rather than the daemon, because a daemon
 * is only one of the two reasons the move is unsafe and the less alarming one.
 */
export function openRootWarning(holders: readonly LiveHolder[]): string[] {
	const lines = ["Refusing to move a config root that is open:"];
	for (const holder of holders) {
		const who = holder.pids.includes(-1) ? "unknown holder" : `pid ${holder.pids.join(", ")}`;
		lines.push(`  ${holder.path} — held by ${who}`);
	}
	lines.push(
		"",
		"Moving these renames SQLite databases that are still open. The holder keeps",
		"writing to the renamed file and loses its config root, which looks like the",
		"migration deleting your history and auth. Quit omp and any other process using",
		"this config root, then re-run — or pass --force to move anyway.",
	);
	return lines;
}

export async function configMigrate(apply: boolean, force = false): Promise<void> {
	const plan = await planConfigMigration(migrationOptions());

	if (!apply) {
		printPlan(plan);
		console.log(chalk.dim("\nDry run. Re-run with --apply to move these directories."));
		return;
	}

	// The refusal is named for what it actually does, not for what it detects.
	// "A daemon is running" undersells it: the move renames SQLite databases that
	// are open, and on POSIX the rename succeeds — the holder keeps writing to the
	// renamed inode while the config root it thinks it is in is gone. That reads
	// to the user as the tool losing their history, with no error anywhere.
	const holders = await findLiveHolders(guardedPaths());
	if (holders.length > 0 && !force) {
		for (const line of openRootWarning(holders)) console.error(chalk.red(line));
		// `process.exitCode` + return, not `process.exit`, matching how this same
		// function reports a failed move below. It is also what makes the refusal
		// assertable: a hard exit takes the test runner down with it, and a guard
		// whose refusal path can only be checked by killing the process is a guard
		// nobody checks.
		process.exitCode = 1;
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
