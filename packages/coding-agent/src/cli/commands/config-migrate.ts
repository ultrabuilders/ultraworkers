/**
 * `ultraworkers config migrate` — move a config root from its old name to its new one.
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
	type MigrationMove,
	type MigrationOptions,
	type MigrationPlan,
	executeConfigMigration,
	planConfigMigration,
} from "@oh-my-pi/pi-utils/config-migrate";
import {
	APP_NAME,
	$which,
	CONFIG_DIR_NAME_NEXT,
	getAgentDbPath,
	getAgentDir,
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
 * The layout *under* a config root, observed from the live resolver rather than
 * written out as a literal: `agent/agent.db`, `run/daemons`, and so on. Hardcoding
 * those segments would be a second copy of the directory structure, which is a
 * pair that drifts — and a guard pointed at the wrong path still looks like a
 * guard.
 */
const CONFIG_ROOT = path.dirname(getAgentDir());

/** The databases the resolver names, wherever it currently points. */
const RESOLVED_DBS: readonly string[] = [getAgentDbPath(), getHistoryDbPath()];

/**
 * The same layout as a set of root-relative segments, for roots the plan names
 * that the resolver does not describe — the XDG roots in particular, which sit
 * outside `CONFIG_ROOT` by definition. A segment that escapes is dropped rather
 * than re-rooted, because a path that cannot exist is worse than one that can:
 * `findLiveHolders` skips what it cannot stat, so a bad segment is indistinguishable
 * from a clean file until it renames something.
 */
const DB_LAYOUT: readonly string[] = [getAgentDbPath(), getHistoryDbPath()]
	.map(file => path.relative(CONFIG_ROOT, file))
	.filter(segment => segment !== "" && !segment.startsWith("..") && !path.isAbsolute(segment));
// Same filter as DB_LAYOUT above, and for the same reason: this is a path
// RELATIVE to CONFIG_ROOT, so rejoining it onto a different move root lets any
// `..` segment escape and name a directory outside every root being renamed.
// Measured: joining "../../Users/<me>/.omp/run/daemons" onto "/tmp/legacy-root"
// resolves to the real home daemon directory, so `guardedPaths` readdir'd the
// developer's live daemons and guarded them for a migration that cannot touch
// them — the false refusal this function exists to avoid, and a read of a path
// the plan never named. Dropping the segment leaves the layout empty, which is
// correct: a daemon root that is not under this one cannot be harmed by it.
const DAEMON_LAYOUT = path
	.relative(CONFIG_ROOT, getDaemonRuntimeRoot())
	.split(path.sep)
	.filter(segment => segment !== "" && segment !== ".." && segment !== "." && !segment.includes(path.sep))
	.join(path.sep);

/**
 * True when `file` really lives under `root`.
 *
 * The layout the guard checks used to be `path.relative(CONFIG_ROOT, dbPath)`,
 * rejoined onto whichever root the plan was about to rename. That is only a layout
 * while both sides share a root, and they come from different authorities: the move
 * sources are derived from `HOME`, while `CONFIG_ROOT` comes from the live agent-dir
 * resolver, which `PI_CODING_AGENT_DIR` can point anywhere.
 *
 * Measured with the resolver redirected: the guard checked
 * `~/.omp/omp-migrate-elsewhere-XXX/agent.db` while the database actually open was
 * `~/.omp/agent/agent.db`. Every path was skipped as missing, `findLiveHolders`
 * reported nothing, and the migration renamed a directory holding an open SQLite
 * database — the exact failure this guard exists to prevent.
 *
 * Note that rejecting only a `..` escape does not catch it. The fake agent dir's
 * *parent* becomes the config root, so the relative path is a plain sibling name
 * with no `..` in it and no reason to look wrong. Containment against the root
 * being renamed is the question that actually matters, so that is what is asked.
 */
function isInside(root: string, file: string): boolean {
	const relative = path.relative(root, file);
	return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/** SQLite's own files, plus the write-ahead siblings that can hold the database open. */
const DB_SUFFIXES = [".db", ".db-wal", ".db-shm"] as const;

/**
 * Every database under one config root, read from the root rather than from a
 * layout derived elsewhere.
 *
 * The fallback for a root the resolver says nothing about. It is a bounded scan
 * rather than a fixed list of names precisely because hardcoding names is what made
 * the derived layout necessary in the first place — and it is strictly wider than
 * the two names it replaces: measured on a real profile it also picks up
 * `models.db` and `skill-descriptions.db`, which no name-based list carried.
 */
function databasePathsUnder(root: string): string[] {
	const found: string[] = [];
	const walk = (dir: string, depth: number): void => {
		if (depth < 0) return;
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return; // No such directory yet is the ordinary case on a fresh install.
		}
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full, depth - 1);
			} else if (DB_SUFFIXES.some(suffix => entry.name.endsWith(suffix))) {
				found.push(full);
			}
		}
	};
	walk(root, 3);
	return found;
}

/**
 * The files whose live handle makes a directory rename unsafe.
 *
 * Keyed to the roots the plan is about to RENAME, not to whichever root the
 * resolver happens to read from. Those two usually agree, and the agreement is
 * what made the first version of this correct — but they agree by coincidence
 * of two independent rules: a move is planned only when the destination does
 * not exist, and the read root is the first candidate that does. Change either
 * one and the guard keeps running while inspecting a directory nobody is about
 * to touch, which is the failure mode of a check that cannot report itself as
 * having checked nothing.
 *
 * Measured on a machine holding both roots: the read root resolved to the
 * DESTINATION, whose `agent.db` is a different file from the 2 MB `~/.omp` one.
 * No data was at risk there either — with both roots present the base move
 * becomes a conflict and is skipped, so there is nothing to rename. That is why
 * this is a structural fix and not a bug report: the exploit is unreachable
 * today, and this makes it unreachable by construction rather than by two rules
 * that have to keep coinciding.
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
export function guardedPaths(moves: readonly MigrationMove[]): string[] {
	// No moves means nothing will be renamed, so there is nothing whose open handle
	// can hurt. Returning the read-root paths here would guard a directory the
	// migration is not touching and refuse a command that cannot do damage.
	const paths: string[] = [];
	for (const root of new Set(moves.map(move => move.from))) {
		// The databases the resolver names, when they really sit under this root. A
		// resolved path outside every move root cannot be harmed by renaming one, and
		// guarding it anyway would refuse a command that cannot do damage.
		const inside = RESOLVED_DBS.filter(db => isInside(root, db));
		if (inside.length > 0) {
			for (const db of inside) paths.push(db, `${db}-wal`, `${db}-shm`);
		} else {
			// The resolver points nowhere near this root, so it cannot say what is inside
			// it — and a root it cannot describe is exactly the root that must be read
			// directly. Returning nothing here is indistinguishable from a clean root,
			// which is the state that lets an open database be renamed out from under its
			// holder.
			paths.push(...databasePathsUnder(root));
		}
		// The derived layout, rejoined onto this root, so a root the resolver knows
		// nothing about still gets the canonical set rather than none. Every path this
		// adds lands under the root by construction, and `findLiveHolders` skips what it
		// cannot stat, so a redundant entry costs a stat and never a false refusal.
		for (const layout of DB_LAYOUT) {
			const file = path.join(root, layout);
			paths.push(file, `${file}-wal`, `${file}-shm`);
		}
		// The daemon root is additive: the data-loss case is an open database with no
		// daemon of its own, so the databases above are what the refusal rests on.
		const daemonRoot = getDaemonRuntimeRoot();
		paths.push(
			...(isInside(root, daemonRoot)
				? daemonRuntimePaths(daemonRoot)
				: daemonRuntimePaths(path.join(root, DAEMON_LAYOUT))),
		);
	}
	return paths;
}

/** Whatever a running daemon leaves behind under one root's state directory. */
function daemonRuntimePaths(runtimeRoot: string): string[] {
	try {
		return fs.readdirSync(runtimeRoot).map(name => path.join(runtimeRoot, name));
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
			// `lsof -t` terminates every line it prints, so a non-empty result ends in a
			// newline and the final split element is "". `Number("")` is 0 and
			// `Number.isInteger(0)` is true, so the naive parse put a phantom pid 0 in
			// the list — and the refusal then told the user a process was holding their
			// database when pid 0 names no process at all. The floor is `pid > 0` rather
			// than a blank-line filter so a negative parse is rejected too, and it sits
			// beside the `-1` sentinel this function already uses for "cannot prove it is
			// unused": the old test guarded only that case, which the parser already
			// excluded by construction, leaving the case that was real unguarded.
			pids = provenUnused
				? []
				: stdout
						.split("\n")
						.map(Number)
						.filter(pid => Number.isInteger(pid) && pid > 0);
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
		`migration deleting your history and auth. Quit ${APP_NAME} and any other process using`,
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
	const holders = await findLiveHolders(guardedPaths(plan.moves));
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
