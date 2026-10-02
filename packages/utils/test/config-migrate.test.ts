/**
 * The contract: someone renames their config root and the command either moves
 * their install intact, or tells them it refused. What it must never do is merge
 * two roots, or touch a disk when the user only asked to see the plan.
 *
 * Every case drives the engine through injected `home` / `env` / `platform` on a
 * temporary tree. Nothing here reads a real `~/.omp`, mutates `process.env`, or
 * patches a module — which is the point of the engine taking those three as
 * arguments rather than reading them itself.
 */

import { afterAll, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { executeConfigMigration, type MigrationOptions, planConfigMigration } from "@oh-my-pi/pi-utils/config-migrate";

// LEGACY SPELLING — these two stay literals on purpose and must not be derived
// from a brand constant. This test's whole subject is a tree that was written by
// an OLDER build, so the old name is the input. Deriving `OLD_BASE` from
// `CONFIG_DIR_NAME` or `OLD_APP` from `APP_NAME` would make both sides move
// together: the fixture would be seeded with today's name, the "before" tree
// would not exist, and the migration would silently become a no-op that passes
// while proving nothing. That is the failure W4's dual-read exists to prevent,
// reproduced from the other direction. The new-name constants below are the
// rename target, so both spellings are stated here rather than imported.
const OLD_BASE = ".omp";
const NEW_BASE = ".ultraworkers";
/** XDG app roots carry no leading dot — they are `APP_NAME`, not `CONFIG_DIR_NAME`. */
const OLD_APP = "omp";
const NEW_APP = "ultraworkers";
const INSTALL_ID = "3f2a91c4-6d5e-4b7a-9c10-8e2d4f6a1b33";

const roots: string[] = [];

async function tempRoot(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-config-migrate-"));
	roots.push(dir);
	return dir;
}

async function write(target: string, contents: string): Promise<void> {
	await fs.mkdir(path.dirname(target), { recursive: true });
	await Bun.write(target, contents);
}

async function read(target: string): Promise<string> {
	return Bun.file(target).text();
}

async function exists(target: string): Promise<boolean> {
	try {
		await fs.stat(target);
		return true;
	} catch {
		return false;
	}
}

/** A home root carrying the real on-disk layout: settings, install id, sessions, a named profile. */
async function seedHome(home: string, base = OLD_BASE): Promise<void> {
	const root = path.join(home, base);
	await write(path.join(root, "config.yml"), "theme: catppuccin-mocha\n");
	await write(path.join(root, "install-id"), INSTALL_ID);
	await write(path.join(root, "agent", "sessions", "data", "session-1.jsonl"), '{"role":"user"}\n');
	await write(path.join(root, "profiles", "work", "agent", "settings.yml"), "defaultModel: test-model\n");
}

function optionsFor(home: string, env: NodeJS.ProcessEnv = {}): MigrationOptions {
	return {
		oldBaseName: OLD_BASE,
		newBaseName: NEW_BASE,
		oldAppName: OLD_APP,
		newAppName: NEW_APP,
		home,
		env,
		platform: "linux",
	};
}

/** Recursive snapshot, so "nothing changed" is a byte claim and not a count. */
async function snapshot(target: string): Promise<Record<string, string>> {
	const out: Record<string, string> = {};
	async function walk(dir: string): Promise<void> {
		for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(full);
			else out[path.relative(target, full)] = await read(full);
		}
	}
	await walk(target);
	return out;
}

afterAll(async () => {
	await Promise.all(roots.map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe("planning never touches disk", () => {
	test("a plan leaves every seeded path exactly where it was", async () => {
		const home = await tempRoot();
		await seedHome(home);
		const before = await snapshot(home);

		const plan = await planConfigMigration(optionsFor(home));

		expect(plan.moves).toHaveLength(1);
		expect(plan.moves[0]?.kind).toBe("base");
		expect(plan.conflicts).toEqual([]);
		expect(await snapshot(home)).toEqual(before);
	});
});

describe("applying moves every root, XDG included", () => {
	test("base plus all three XDG roots move, and the XDG seeds use the undotted app name", async () => {
		const home = await tempRoot();
		const data = await tempRoot();
		const state = await tempRoot();
		const cache = await tempRoot();
		await seedHome(home);
		for (const xdg of [data, state, cache]) await seedHome(xdg, OLD_APP);

		const plan = await planConfigMigration(
			optionsFor(home, { XDG_DATA_HOME: data, XDG_STATE_HOME: state, XDG_CACHE_HOME: cache }),
		);
		const outcome = await executeConfigMigration(plan);

		expect(outcome.moved).toBe(4);
		expect(outcome.failed).toEqual([]);
		for (const from of [path.join(home, OLD_BASE), ...[data, state, cache].map(dir => path.join(dir, OLD_APP))]) {
			expect(await exists(from)).toBe(false);
		}
		for (const to of [path.join(home, NEW_BASE), ...[data, state, cache].map(dir => path.join(dir, NEW_APP))]) {
			expect(await exists(path.join(to, "config.yml"))).toBe(true);
		}
	});

	test("a platform without XDG roots plans only the base move", async () => {
		const home = await tempRoot();
		const data = await tempRoot();
		await seedHome(home);
		// Seeded, so the XDG root genuinely exists. An empty XDG directory would
		// make this case pass for the wrong reason: the planner skips a source
		// that is not there whether or not the platform gate exists.
		await seedHome(data, OLD_APP);

		const plan = await planConfigMigration({
			...optionsFor(home, { XDG_DATA_HOME: data }),
			platform: "win32",
		});

		expect(plan.moves.map(move => move.kind)).toEqual(["base"]);
		expect(await exists(path.join(data, OLD_APP, "config.yml"))).toBe(true);
	});
});

describe("applying twice is a no-op", () => {
	test("the second apply moves nothing and leaves the tree byte-identical", async () => {
		const home = await tempRoot();
		await seedHome(home);
		const first = await executeConfigMigration(await planConfigMigration(optionsFor(home)));
		expect(first.moved).toBe(1);
		const afterFirst = await snapshot(home);

		const second = await executeConfigMigration(await planConfigMigration(optionsFor(home)));

		expect(second.moved).toBe(0);
		expect((await planConfigMigration(optionsFor(home))).moves).toEqual([]);
		expect(await snapshot(home)).toEqual(afterFirst);
	});
});

describe("two existing roots are a conflict, never a merge", () => {
	test("both marker files survive untouched and the pair is reported, not moved", async () => {
		const home = await tempRoot();
		await seedHome(home);
		await write(path.join(home, NEW_BASE, "config.yml"), "theme: never-used\n");

		const plan = await planConfigMigration(optionsFor(home));

		expect(plan.moves).toEqual([]);
		expect(plan.conflicts).toHaveLength(1);
		expect(plan.conflicts[0]?.kind).toBe("base");
		expect(await read(path.join(home, OLD_BASE, "config.yml"))).toBe("theme: catppuccin-mocha\n");
		expect(await read(path.join(home, NEW_BASE, "config.yml"))).toBe("theme: never-used\n");
	});
});

describe("state that identifies the install survives the move", () => {
	test("install-id keeps its value, and a named profile travels with its root", async () => {
		const home = await tempRoot();
		await seedHome(home);

		await executeConfigMigration(await planConfigMigration(optionsFor(home)));

		expect(await read(path.join(home, NEW_BASE, "install-id"))).toBe(INSTALL_ID);
		expect(await read(path.join(home, NEW_BASE, "profiles", "work", "agent", "settings.yml"))).toBe(
			"defaultModel: test-model\n",
		);
		expect(await read(path.join(home, NEW_BASE, "agent", "sessions", "data", "session-1.jsonl"))).toBe(
			'{"role":"user"}\n',
		);
	});
});

describe("a root that cannot move is reported, and does not strand the others", () => {
	test("a plan that has gone stale reports the move instead of counting it", async () => {
		const home = await tempRoot();
		const data = await tempRoot();
		const state = await tempRoot();
		const cache = await tempRoot();
		await seedHome(home);
		for (const xdg of [data, state, cache]) await seedHome(xdg, OLD_APP);

		// The plan is computed, then two roots disappear — a second process
		// cleaned up, or the user read the dry run minutes ago and something else
		// moved the directories. Counting those as `moved` would tell them their
		// data is at the new path when it is nowhere.
		const plan = await planConfigMigration(
			optionsFor(home, { XDG_DATA_HOME: data, XDG_STATE_HOME: state, XDG_CACHE_HOME: cache }),
		);
		await fs.rm(path.join(data, OLD_APP), { recursive: true, force: true });
		await fs.rm(path.join(state, OLD_APP), { recursive: true, force: true });

		const outcome = await executeConfigMigration(plan);

		expect(outcome.moved).toBe(2);
		expect(outcome.failed.map(entry => entry.move.kind)).toEqual(["xdg-data", "xdg-state"]);
		expect(outcome.failed[0]?.reason).toContain(OLD_APP);
		// The last root still lands, which is the whole point of not aborting on
		// the first failure: one unreadable directory must not strand the rest.
		expect(await exists(path.join(cache, NEW_APP, "config.yml"))).toBe(true);
		expect(await read(path.join(home, NEW_BASE, "install-id"))).toBe(INSTALL_ID);
	});

	test("an occupied destination is a conflict, not a failed move", async () => {
		const home = await tempRoot();
		await seedHome(home);
		await write(path.join(home, NEW_BASE, "config.yml"), "theme: never-used\n");

		const outcome = await executeConfigMigration(await planConfigMigration(optionsFor(home)));

		// It never reaches the executor, so it is reported as a conflict the user
		// must reconcile — not as a failure that looks like something broke.
		expect(outcome.moved).toBe(0);
		expect(outcome.failed).toEqual([]);
		expect(outcome.skipped).toBe(1);
	});

	test("a root whose old and new names coincide is not touched at all", async () => {
		const home = await tempRoot();
		await seedHome(home);
		// Both names collapsed while the root is still sitting under that name —
		// what a caller that derives "the old name" from the live resolver would
		// pass. `rename(x, x)` succeeds, so the self-move has to be filtered out
		// before it reaches the executor, or the user is told their config
		// migrated when nothing happened.
		const collapsed = { ...optionsFor(home), newBaseName: OLD_BASE };

		const plan = await planConfigMigration(collapsed);
		const outcome = await executeConfigMigration(plan);

		expect(plan).toEqual({ moves: [], conflicts: [] });
		expect(outcome.moved).toBe(0);
		expect(outcome.skipped).toBe(0);
		// Still where it was, and still readable.
		expect(await read(path.join(home, OLD_BASE, "install-id"))).toBe(INSTALL_ID);
	});
});
