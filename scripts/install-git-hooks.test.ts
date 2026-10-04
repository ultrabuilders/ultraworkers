import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { HOOKS_PATH, installGitHooks } from "./install-git-hooks";

/**
 * Step 2 of `epic-z4zg`'s three enforcement steps, and the only one that does not
 * travel with a clone.
 *
 * The guard in `scripts/hooks/pre-commit` is committed, executable, and — on a
 * clone that never ran the installer — completely inert, because git resolves
 * hooks from `core.hooksPath` rather than from the tree. A guard that never runs
 * is indistinguishable from a guard that works: both leave the peer row riding
 * along in a successful commit. This repo has shipped that inert state twice.
 *
 * So these rows assert the OUTCOME (a bare commit is refused and HEAD does not
 * move), never the config key. Setting `core.hooksPath` and observing the key
 * would pass even if the hook file were missing, non-executable, or pointed at
 * the wrong directory — the three ways this has already failed.
 */

const repoRoot = path.join(import.meta.dir, "..");
const HOOK = path.join(repoRoot, "scripts", "hooks", "pre-commit");

async function makeClone(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "git-hooks-"));
	const run = (args: string[]) => Bun.spawnSync(["git", ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" });
	run(["init", "-q", "."]);
	run(["config", "user.email", "hooks@test"]);
	run(["config", "user.name", "hooks"]);
	return dir;
}

/** Installs the shipped hook at the location git will look, at the shipped mode. */
async function placeHook(dir: string): Promise<void> {
	await fs.mkdir(path.join(dir, HOOKS_PATH), { recursive: true });
	await fs.writeFile(path.join(dir, HOOKS_PATH, "pre-commit"), await fs.readFile(HOOK), { mode: 0o755 });
}

/** A clone with one committed file and a staged peer row that a bare commit would take. */
async function stagePeerRow(dir: string): Promise<string> {
	const run = (args: string[]) => Bun.spawnSync(["git", ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" });
	await Bun.write(path.join(dir, "a.txt"), "a\n");
	run(["add", "a.txt"]);
	run(["commit", "-qm", "seed"]);
	await Bun.write(path.join(dir, "peer.txt"), "theirs\n");
	run(["add", "peer.txt"]);
	// HEAD as it stands with the peer's row staged — the value both rows below
	// compare against to prove the commit did or did not happen.
	return run(["rev-parse", "HEAD"]).stdout.toString().trim();
}

describe("installing the shared-tree guard", () => {
	it("makes a bare commit impossible, which is the whole point of shipping the guard", async () => {
		// THE row. Same clone shape as the control below, differing ONLY in whether
		// the installer ran — so the difference in outcome is attributable to the
		// installer and to nothing else.
		const dir = await makeClone();
		await placeHook(dir);

		const head = await stagePeerRow(dir);
		expect(installGitHooks(dir).exitCode).toBe(0);

		const r = Bun.spawnSync(["git", "commit", "-qm", "mine"], { cwd: dir, stdout: "pipe", stderr: "pipe" });

		expect(r.exitCode).not.toBe(0);
		expect(r.stderr.toString()).toContain("belongs to every agent");
		expect(Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: dir, stdout: "pipe" }).stdout.toString().trim()).toBe(
			head,
		);
	});

	it("leaves a clone WITHOUT the installer unprotected, so the row above is not free", async () => {
		// The control, and the reason this file exists. If a bare commit were refused
		// either way — because git found the hook somewhere else, or because the test
		// harness refused on its own — then the row above would be proving nothing.
		// It passes today; it is the thing that would go red first if the mechanism
		// stopped being what it claims.
		const dir = await makeClone();
		await placeHook(dir);

		const head = await stagePeerRow(dir);
		const r = Bun.spawnSync(["git", "commit", "-qm", "mine"], { cwd: dir, stdout: "pipe", stderr: "pipe" });

		expect(r.exitCode).toBe(0);
		expect(Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: dir, stdout: "pipe" }).stdout.toString().trim()).not.toBe(
			head,
		);
		expect(
			Bun.spawnSync(["git", "show", "--name-only", "--format=", "HEAD"], { cwd: dir, stdout: "pipe" })
				.stdout.toString(),
		).toContain("peer.txt");
	});

	it("reports no change on a second run, so bun setup stays free to re-run", async () => {
		// `bun setup` runs on every clone and every re-install. An installer that
		// rewrote config each time would be noise, and one that failed on a second
		// run would make setup non-idempotent for no benefit.
		const dir = await makeClone();
		await placeHook(dir);

		const first = installGitHooks(dir);
		const second = installGitHooks(dir);

		expect(first.changed).toBe(true);
		expect(second.changed).toBe(false);
		expect(second.current).toBe(HOOKS_PATH);
		expect(second.exitCode).toBe(0);
	});

	it("replaces a DIFFERENT hooksPath and says so, rather than leaving the guard inert", async () => {
		// The stale case. A clone pointed at `.git/hooks` — the default shape, or a
		// leftover from another repo's setup — has its guard inert exactly like an
		// uninstalled one, and looks armed. Repairing it silently would be the safer
		// default, but hiding it would repeat the original sin: a protection that
		// appears without appearing. So the repair is observable in the return value.
		const dir = await makeClone();
		Bun.spawnSync(["git", "config", "core.hooksPath", ".git/hooks"], { cwd: dir, stdout: "pipe" });

		const result = installGitHooks(dir);

		expect(result.previous).toBe(".git/hooks");
		expect(result.current).toBe(HOOKS_PATH);
		expect(result.changed).toBe(true);
	});

	it("fails loudly outside a git repository instead of reporting success", async () => {
		// A non-zero exit is the contract: `bun setup` halts on a failed step, so a
		// silent 0 here would leave the guard unarmed AND let setup continue as if the
		// clone were protected.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "git-hooks-norepo-"));

		const result = installGitHooks(dir);

		expect(result.exitCode).not.toBe(0);
	});
});