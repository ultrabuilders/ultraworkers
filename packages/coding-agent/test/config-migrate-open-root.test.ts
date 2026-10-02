/**
 * `omp config migrate --apply` refuses to move a config root that is in use.
 *
 * The failure this prevents is silent, which is why it needs a test at all.
 * On POSIX, renaming a directory that a process holds a SQLite file inside
 * *succeeds*. The holder keeps writing to the renamed inode while the config
 * root it believes it is using is gone — so the user sees their history and
 * auth vanish with no error from either side. "A daemon is running" undersells
 * it, so the refusal names the databases.
 *
 * The holder is a real open descriptor, not a mocked `lsof`. A test that only
 * wrote a file, or stubbed the command, would stay green while the actual
 * open-file detection was broken — which is the whole failure mode here: a
 * guard that cannot see an open file always passes.
 *
 * `configMigrate` itself is not called, because it exits the process on
 * refusal and that would take the test runner with it. `openRootWarning` is the
 * message it would print, and it is asserted directly.
 */
import { afterAll, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { findLiveHolders, guardedPaths, openRootWarning } from "@oh-my-pi/pi-coding-agent/cli/commands/config-migrate";

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "omp-migrate-open-"));
const heldFile = path.join(scratch, "agent.db");
const untouchedFile = path.join(scratch, "history.db");
fs.writeFileSync(heldFile, "");
fs.writeFileSync(untouchedFile, "");

// A separate process holding the file open on a real descriptor — which is the
// situation the guard exists for, and not a stand-in for it. `sh` keeps fd 3
// open across the sleep, so `lsof` reports the child rather than this test.
const holder = Bun.spawn(["sh", "-c", `exec 3< ${JSON.stringify(heldFile)}; sleep 30`], {
	stdout: "ignore",
	stderr: "ignore",
	stdin: "ignore",
});

afterAll(() => {
	holder.kill();
	fs.rmSync(scratch, { recursive: true, force: true });
});

describe("findLiveHolders", () => {
	test("reports a file another process is holding, naming that process", async () => {
		const holders = await findLiveHolders([heldFile]);

		// The pid must be the real holder, not a placeholder: a refusal naming the
		// wrong pid would send the user hunting a process that is not running.
		expect(holders).toHaveLength(1);
		expect(holders[0].path).toBe(heldFile);
		expect(holders[0].pids).toContain(holder.pid);
		expect(holders[0].pids).not.toContain(-1);
		// `lsof -t` ends every line with a newline, so the final split element is "".
		// `Number("")` is 0 and passes `Number.isInteger`, so the unguarded parse put a
		// phantom pid 0 in the list and the refusal told the user a process was
		// holding their database when pid 0 names no process at all. The user acts on
		// this message, so a fabricated pid in it is a defect, not a cosmetic one.
		expect(holders[0].pids).not.toContain(0);
	});

	test("reports nothing for a file no process is holding", async () => {
		expect(await findLiveHolders([untouchedFile])).toEqual([]);
	});

	test("reports nothing for a path that does not exist", async () => {
		expect(await findLiveHolders([path.join(scratch, "absent.db")])).toEqual([]);
	});
});

describe("openRootWarning", () => {
	test("names the open file, the holder, and the rename that loses the data", () => {
		const text = openRootWarning([{ path: heldFile, pids: [holder.pid] }]).join("\n");

		expect(text).toContain(heldFile);
		expect(text).toContain(`pid ${holder.pid}`);
		// The three things a user needs to decide: what is held, that it is being
		// renamed rather than merely busy, and how to proceed anyway.
		expect(text).toContain("renames SQLite databases that are still open");
		expect(text).toContain("--force");
	});

	test("does not claim to know a holder it could not identify", () => {
		// `findLiveHolders` returns pid -1 when lsof is missing or fails. Printing
		// "pid -1" would be a fabricated fact; the user needs to know it is unknown.
		expect(openRootWarning([{ path: heldFile, pids: [-1] }]).join("\n")).toContain("unknown holder");
	});
});

/**
 * The command end to end, on a config root this test owns.
 *
 * The unit rows above prove the detector sees an open file and the message names
 * it. Neither proves the command USES them: `configMigrate` could keep returning
 * an empty holder list, or wire `--force` to nothing, and every row above would
 * stay green. So this spawns the real command against a real legacy root with a
 * real open database — the exact situation the guard exists for.
 *
 * `HOME` is redirected because the paths are derived from the home directory:
 * run in-process, `configMigrate(true)` would plan to move the developer's own
 * `~/.omp`. A child with its own `HOME` resolves `~/.omp/agent/agent.db` — and
 * therefore `getAgentDbPath()` — inside a scratch tree.
 */
describe("guardedPaths follows the roots the plan will rename", () => {
	// The failure this pins: an earlier version derived the guarded paths from
	// `getAgentDbPath()`, which resolves through the READ root — the first config
	// root that exists. On a machine holding both roots, that is the DESTINATION,
	// so the guard inspected a different file from the one about to be renamed and
	// reported itself as clean. Measured on such a machine: read root
	// `~/.ultraworkers`, real file `~/.omp/agent/history.db` at 2 MB, never checked.
	//
	// No data was at risk — with both roots present the base move becomes a
	// conflict and nothing is renamed — but that safety came from two independent
	// rules coinciding, not from the guard looking where it looks. These rows make
	// the looking correct on its own.
	test("guards the database inside the root being moved, not the one being read", () => {
		const paths = guardedPaths([{ kind: "base", from: "/tmp/legacy-root", to: "/tmp/new-root" }]);

		// What the rename destroys.
		expect(paths).toContain("/tmp/legacy-root/agent/agent.db");
		expect(paths).toContain("/tmp/legacy-root/agent/history.db");
		// And the sibling files a live SQLite connection can be held through.
		expect(paths).toContain("/tmp/legacy-root/agent/agent.db-wal");
		expect(paths).toContain("/tmp/legacy-root/agent/history.db-shm");
		// Never the destination: nothing there is being renamed, so a holder on it
		// must not be able to refuse this command.
		expect(paths).not.toContain("/tmp/new-root/agent/agent.db");
	});

	test("guards nothing when the plan will move nothing", () => {
		// The split-root case: both roots exist, so the base move is a conflict and
		// `plan.moves` is empty. Refusing here would block a command that cannot do
		// damage — and, worse, would do it while pointing at the wrong directory.
		expect(guardedPaths([])).toEqual([]);
	});

	test("covers every root the plan moves, including XDG ones", () => {
		const paths = guardedPaths([
			{ kind: "base", from: "/tmp/legacy", to: "/tmp/new" },
			{ kind: "xdg-state", from: "/tmp/xdg-state-old", to: "/tmp/xdg-state-new" },
		]);

		expect(paths).toContain("/tmp/legacy/agent/agent.db");
		// The XDG move is a different root and is renamed too; a guard that only knew
		// the base root would miss it.
		expect(paths).toContain("/tmp/xdg-state-old/agent/agent.db");
	});
});

describe("config migrate --apply on an open root", () => {
	/** cwd is the package, so the import below resolves against real sources. */
	const packageDir = import.meta.dir.replace(/\/test$/, "");

	async function runMigrate(
		force: boolean,
		extraEnv: Record<string, string> = {},
	): Promise<{
		exitCode: number;
		stderr: string;
		legacyRootSurvived: boolean;
	}> {
		const home = fs.mkdtempSync(path.join(os.tmpdir(), "omp-migrate-home-"));
		// Only the LEGACY root exists, which is what puts `agent.db` inside the
		// directory the migration is about to rename.
		fs.mkdirSync(path.join(home, ".omp", "agent"), { recursive: true });
		const db = path.join(home, ".omp", "agent", "agent.db");
		fs.writeFileSync(db, "");

		const holder = Bun.spawn(["sh", "-c", `exec 3< ${JSON.stringify(db)}; sleep 30`], {
			stdout: "ignore",
			stderr: "ignore",
			stdin: "ignore",
		});
		try {
			const child = Bun.spawn(
				[
					process.execPath,
					"-e",
					`import { configMigrate } from "./src/cli/commands/config-migrate.ts";\nawait configMigrate(true, ${force});`,
				],
				{
					cwd: packageDir,
					env: { ...process.env, HOME: home, ...extraEnv },
					stdout: "pipe",
					stderr: "pipe",
					stdin: "ignore",
				},
			);
			const [stderr, exitCode] = await Promise.all([new Response(child.stderr).text(), child.exited]);
			return { exitCode, stderr, legacyRootSurvived: fs.existsSync(path.join(home, ".omp")) };
		} finally {
			holder.kill();
			fs.rmSync(home, { recursive: true, force: true });
		}
	}

	test("--apply refuses while the database is open, and does not move anything", async () => {
		const { exitCode, stderr, legacyRootSurvived } = await runMigrate(false);

		expect(exitCode).toBe(1);
		expect(stderr).toContain("Refusing to move a config root that is open:");
		// The half that matters. A guard that warns and then renames anyway has
		// replaced a loud failure with the silent one it was built to prevent.
		expect(legacyRootSurvived).toBe(true);
	});

	test("--force moves anyway", async () => {
		const { exitCode, stderr, legacyRootSurvived } = await runMigrate(true);

		expect(exitCode).toBe(0);
		expect(stderr).not.toContain("Refusing");
		expect(legacyRootSurvived).toBe(false);
	});

	test("still refuses when the agent dir is redirected outside the config root", async () => {
		// The layout the guard checks is derived from the live resolver, and
		// `PI_CODING_AGENT_DIR` moves that resolver off the root being renamed. The
		// relative layout then came back as `../<dir>/agent.db`, which rejoined onto the
		// move source named a file that does not exist — so every path was skipped as
		// missing, the guard reported nothing, and the migration renamed a directory
		// holding an open database. That is the precise failure this guard exists to
		// prevent, so it is driven through the real child rather than through
		// `guardedPaths`, which would stay green if the refusal path were deleted.
		const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "omp-migrate-elsewhere-"));
		try {
			const { exitCode, stderr, legacyRootSurvived } = await runMigrate(false, {
				PI_CODING_AGENT_DIR: elsewhere,
			});

			expect(exitCode).toBe(1);
			expect(stderr).toContain("Refusing to move a config root that is open:");
			expect(legacyRootSurvived).toBe(true);
		} finally {
			fs.rmSync(elsewhere, { recursive: true, force: true });
		}
	});
});
