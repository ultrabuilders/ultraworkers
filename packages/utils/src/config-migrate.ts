/**
 * Relocate a config root from its old name to its new one.
 *
 * The rename is the safe part; the *ordering* is the whole design. A migration
 * that merges two existing roots loses whichever one it did not overwrite, so
 * this never merges: when both the old and the new root exist, the pair is
 * reported as a conflict and left untouched for a human to reconcile.
 *
 * `planConfigMigration` is a pure read. It takes `home`, `env` and `platform` as
 * arguments rather than reading `os.homedir()` / `process.env` / `process.platform`
 * itself, which is what lets the whole three-branch rule be tested against a
 * synthetic tree instead of the developer's real home directory. Nothing in
 * this file writes, prints, or exits.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isEnoent } from "./fs-error";
import { movePath } from "./fs-move";

export type MigrationKind = "base" | "xdg-data" | "xdg-state" | "xdg-cache";

export interface MigrationMove {
	readonly kind: MigrationKind;
	readonly from: string;
	readonly to: string;
}

/** Both roots exist. Never resolved automatically. */
export interface MigrationConflict {
	readonly kind: MigrationKind;
	readonly from: string;
	readonly to: string;
}

export interface MigrationPlan {
	readonly moves: readonly MigrationMove[];
	readonly conflicts: readonly MigrationConflict[];
}

export interface MigrationOptions {
	/**
	 * Home-scoped config root before the rename, dot-prefixed. Resolved by the
	 * caller rather than imported so `PI_CONFIG_DIR` keeps working.
	 */
	readonly oldBaseName: string;
	/** Home-scoped config root after the rename. */
	readonly newBaseName: string;
	/**
	 * XDG app directory before the rename — and note this is **not**
	 * `oldBaseName`: an XDG app root is derived from the app name and carries no
	 * leading dot. Seeding fixtures with the dotted name is the mistake that
	 * leaves a migrated tree green while the real one silently skips three roots.
	 */
	readonly oldAppName: string;
	/** XDG app directory after the rename. */
	readonly newAppName: string;
	readonly home: string;
	readonly env: NodeJS.ProcessEnv;
	readonly platform: NodeJS.Platform;
}

export interface MigrationOutcome {
	readonly moved: number;
	readonly skipped: number;
	/** One entry per failed move; the source is still in place for each. */
	readonly failed: readonly { readonly move: MigrationMove; readonly reason: string }[];
}

const XDG_KINDS = [
	{ kind: "xdg-data", variable: "XDG_DATA_HOME" },
	{ kind: "xdg-state", variable: "XDG_STATE_HOME" },
	{ kind: "xdg-cache", variable: "XDG_CACHE_HOME" },
] as const satisfies readonly { kind: MigrationKind; variable: string }[];

async function pathExists(target: string): Promise<boolean> {
	try {
		await fs.stat(target);
		return true;
	} catch (error) {
		if (isEnoent(error)) return false;
		throw error;
	}
}

/**
 * Decide what would move. Writes nothing — this is what makes the command's
 * dry-run default trustworthy rather than a claim.
 */
export async function planConfigMigration(options: MigrationOptions): Promise<MigrationPlan> {
	const candidates: MigrationMove[] = [
		{
			kind: "base",
			from: path.join(options.home, options.oldBaseName),
			to: path.join(options.home, options.newBaseName),
		},
	];

	// Mirrors dirs.ts: an XDG app root only exists where the platform has one,
	// and only when the variable is actually set. An unset XDG_DATA_HOME means
	// the root is at its default location, which is not this migration's business.
	if (options.platform === "linux" || options.platform === "darwin") {
		for (const { kind, variable } of XDG_KINDS) {
			const value = options.env[variable];
			if (!value) continue;
			candidates.push({
				kind,
				from: path.join(value, options.oldAppName),
				to: path.join(value, options.newAppName),
			});
		}
	}

	const moves: MigrationMove[] = [];
	const conflicts: MigrationConflict[] = [];
	for (const candidate of candidates) {
		// A rename onto itself succeeds and reports success, which would tell a
		// user whose config root has already been flipped that the migration ran
		// when nothing happened. Only reachable when the two names coincide, but
		// "already migrated" is exactly the state a re-run has to survive.
		if (candidate.from === candidate.to) continue;
		if (!(await pathExists(candidate.from))) continue;
		if (await pathExists(candidate.to)) {
			conflicts.push(candidate);
			continue;
		}
		moves.push(candidate);
	}
	return { moves, conflicts };
}

/**
 * Carry out `plan.moves` and nothing else.
 *
 * A failure is collected and the walk continues, because a root that cannot
 * move (permissions, a mount that vanished) should not strand the other three.
 * `movePath` only removes the source after a successful copy, so every entry in
 * `failed` still has its data where it was.
 */
export async function executeConfigMigration(plan: MigrationPlan): Promise<MigrationOutcome> {
	const failed: { move: MigrationMove; reason: string }[] = [];
	let moved = 0;
	for (const move of plan.moves) {
		try {
			await movePath(move.from, move.to);
			moved++;
		} catch (error) {
			failed.push({ move, reason: error instanceof Error ? error.message : String(error) });
		}
	}
	return { moved, skipped: plan.conflicts.length, failed };
}
