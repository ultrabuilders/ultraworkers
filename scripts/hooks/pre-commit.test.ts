import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

/**
 * The pre-commit guard refuses a bare commit, because on this tree the index
 * belongs to every agent and a bare commit takes all of it.
 *
 * Each row states what a consumer observes if the guard regresses. Without the
 * first row the refusals below would pass just as well if the hook were never
 * invoked at all — a guard that cannot fire reads exactly like a guard that is
 * working, so firing is proved separately rather than assumed.
 *
 * `makeRepo` copies the hook and chmods the COPY to 0755, so every row below
 * proves the hook's LOGIC and none of them proves the shipped FILE is usable.
 * Those are separate contracts, and the shipped one was broken: the hook was
 * tracked 100644, so on every fresh clone git ignored it with a hint and a bare
 * commit succeeded. All seven rows stayed green. Hence the mode row.
 */

const HOOK = path.join(import.meta.dir, "pre-commit");

async function makeRepo(): Promise<string> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "precommit-guard-"));
	const run = (args: string[]) =>
		Bun.spawnSync(["git", ...args], {
			cwd: dir,
			stdout: "pipe",
			stderr: "pipe",
		});
	run(["init", "-q", "."]);
	run(["config", "user.email", "guard@test"]);
	run(["config", "user.name", "guard"]);
	await fs.mkdir(path.join(dir, ".git", "hooks"), { recursive: true });
	await fs.copyFile(HOOK, path.join(dir, ".git", "hooks", "pre-commit"));
	await fs.chmod(path.join(dir, ".git", "hooks", "pre-commit"), 0o755);
	return dir;
}

function git(dir: string, args: string[]) {
	const r = Bun.spawnSync(["git", ...args], {
		cwd: dir,
		stdout: "pipe",
		stderr: "pipe",
	});
	return {
		code: r.exitCode,
		out: r.stdout.toString(),
		err: r.stderr.toString(),
	};
}

async function seed(dir: string, name: string, content: string) {
	await Bun.write(path.join(dir, name), content);
	git(dir, ["add", name]);
}

describe("pre-commit guard", () => {
	it("is tracked executable, or git ignores it and every other row proves nothing", () => {
		// `makeRepo` chmods its own copy, so this is the only row that sees the mode
		// git actually checks out. Git skips a non-executable hook and says so in a
		// hint that scrolls past: the guard is then absent, not failing, which is
		// why the suite read 7 pass while the hazard it exists for was still open.
		//
		// Asserted on the INDEX entry, not the filesystem, because the index is what
		// a clone gets — a local `chmod +x` that was never staged fixes one machine
		// and ships 100644 to everyone else.
		const mode = Bun.spawnSync(["git", "ls-files", "-s", "scripts/hooks/pre-commit"], {
			cwd: path.join(import.meta.dir, "..", ".."),
			stdout: "pipe",
			stderr: "pipe",
		}).stdout.toString();
		expect(mode).toStartWith("100755");
	});

	it("runs at all, and reports which index it was handed", async () => {
		// The control. If this row fails, every refusal below is passing for the
		// wrong reason and the suite proves nothing.
		const dir = await makeRepo();
		await Bun.write(path.join(dir, ".git", "hooks", "pre-commit"), `#!/bin/sh\necho GUARD_FIRED >&2\nexit 0\n`);
		await seed(dir, "a.txt", "a\n");
		git(dir, ["commit", "-qm", "seed"]);
		await Bun.write(path.join(dir, "a.txt"), "b\n");
		git(dir, ["add", "a.txt"]);
		const r = git(dir, ["commit", "-qm", "probe"]);
		expect(r.err).toContain("GUARD_FIRED");
	});

	it("refuses a bare commit, so a peer's staged row cannot ride along", async () => {
		// The regression this exists for: `d985fe7dc9` and `f9b23a9cba` each
		// committed another session's rows and git reported success.
		const dir = await makeRepo();
		await seed(dir, "a.txt", "a\n");
		git(dir, ["commit", "-qm", "seed"]);
		await seed(dir, "peer.txt", "theirs\n");

		const before = git(dir, ["rev-parse", "HEAD"]).out.trim();
		const r = git(dir, ["commit", "-qm", "mine"]);

		expect(r.code).not.toBe(0);
		expect(r.err).toContain("belongs to every agent");
		// The refusal must not have quietly gone through anyway.
		expect(git(dir, ["rev-parse", "HEAD"]).out.trim()).toBe(before);
	});

	it("refuses `git commit -a`, which stages every tracked file the same way", async () => {
		// `-a` is the bare commit wearing a flag: it stages every tracked file in the
		// tree, so it commits exactly what a bare commit would. The guard compared
		// GIT_INDEX_FILE against `$git_dir/index` by PATH, and `-a` runs against
		// `$git_dir/index.lock` — a different path — so it read as path-scoped and
		// exited 0. Measured: a peer's untracked-in-index row landed in the commit
		// while the guard reported success.
		//
		// Asserted on the OBSERVABLE outcome (the peer's row must not be in the
		// commit), not on which index git handed the hook: the index path is git's
		// business and could change, while "the peer's row is in the commit" is the
		// harm this guard exists to prevent.
		const dir = await makeRepo();
		await seed(dir, "a.txt", "a\n");
		git(dir, ["commit", "-qm", "seed"]);
		// Tracked but unmodified in the index, and modified in the worktree: `-a`
		// stages the modification, which is what puts it in the commit.
		await Bun.write(path.join(dir, "peer.txt"), "theirs\n");
		git(dir, ["add", "peer.txt"]);
		git(dir, ["commit", "-qm", "theirs"]);
		await Bun.write(path.join(dir, "peer.txt"), "theirs-again\n");

		const before = git(dir, ["rev-parse", "HEAD"]).out.trim();
		const r = git(dir, ["commit", "-qam", "mine"]);

		expect(r.code).not.toBe(0);
		expect(git(dir, ["rev-parse", "HEAD"]).out.trim()).toBe(before);
	});

	it("leaves the shared index untouched when it refuses", async () => {
		// A guard that cleans up on its way out would destroy the very staging it
		// exists to protect.
		const dir = await makeRepo();
		await seed(dir, "a.txt", "a\n");
		git(dir, ["commit", "-qm", "seed"]);
		await seed(dir, "peer.txt", "theirs\n");

		git(dir, ["commit", "-qm", "mine"]);
		expect(git(dir, ["diff", "--cached", "--name-only"]).out.trim()).toBe("peer.txt");
	});

	it("allows a path-scoped commit, which git runs against its own index", async () => {
		// The other side of the discriminator. Without this row the guard could
		// pass by refusing everything.
		const dir = await makeRepo();
		await seed(dir, "a.txt", "a\n");
		git(dir, ["commit", "-qm", "seed"]);
		await seed(dir, "peer.txt", "theirs\n");
		await Bun.write(path.join(dir, "a.txt"), "a2\n");

		const r = git(dir, ["commit", "-qm", "mine", "--only", "--", "a.txt"]);
		expect(r.code).toBe(0);
	});

	it("allows a commit with nothing staged, leaving git's own message", async () => {
		// Replacing git's clear "nothing to commit" with this guard's refusal would
		// be a worse error than the one it prevents.
		const dir = await makeRepo();
		await seed(dir, "a.txt", "a\n");
		git(dir, ["commit", "-qm", "seed"]);

		const r = git(dir, ["commit", "-qm", "nothing"]);
		expect(r.err).not.toContain("belongs to every agent");
	});

	it("allows the first commit, where the index is an import and not a staging area", async () => {
		// `commit-scoped.ts` builds against HEAD, so refusing here would leave no
		// correct tool at all.
		const dir = await makeRepo();
		await seed(dir, "a.txt", "a\n");
		await seed(dir, "b.txt", "b\n");

		const r = git(dir, ["commit", "-qm", "initial"]);
		expect(r.code).toBe(0);
		expect(git(dir, ["rev-list", "--count", "HEAD"]).out.trim()).toBe("1");
	});

	it("lets a bare commit through when the hook is NOT installed, so 'it is set up' is a claim someone must check", async () => {
		// The inverse of every refusal above, and the reason they cannot be read as
		// "the tree is protected". `makeRepo` copies the hook into .git/hooks and
		// chmods the COPY, so every other row proves the LOGIC fires once git
		// invokes it. None of them proves git invokes it — and git silently does
		// NOT when the hook is absent or non-executable: no failure, just a hint
		// that scrolls past, and the bare commit succeeds.
		//
		// That is the exact shape of the two incidents this guard exists for
		// (`d985fe7dc9`, `f9b23a9cba`), and it has already happened twice on this
		// repo for the same reason: shipped 100644, then 100755 in the wrong place.
		// Both times every test above stayed green.
		//
		// `core.hooksPath` is per-clone local config and is NOT shipped, so a fresh
		// clone starts with no hook until someone runs the install step. This row is
		// what keeps that step from being a promise: it asserts the UNPROTECTED
		// state is observable, so "the guard is active here" stops being an
		// assumption and becomes something a reader can go verify.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "precommit-uninstalled-"));
		const run = (args: string[]) => Bun.spawnSync(["git", ...args], { cwd: dir, stdout: "pipe", stderr: "pipe" });
		run(["init", "-q", "."]);
		run(["config", "user.email", "guard@test"]);
		run(["config", "user.name", "guard"]);
		await Bun.write(path.join(dir, "a.txt"), "a\n");
		run(["add", "a.txt"]);
		run(["commit", "-qm", "seed"]);
		// A peer's row, which an installed guard would refuse to carry.
		await Bun.write(path.join(dir, "peer.txt"), "theirs\n");
		run(["add", "peer.txt"]);

		const before = run(["rev-parse", "HEAD"]).stdout.toString().trim();
		const r = run(["commit", "-qm", "mine"]);

		// No hook at .git/hooks/pre-commit, so nothing refuses: git reports SUCCESS
		// and the peer's row rides along. This is the hazard, demonstrated.
		expect(r.exitCode).toBe(0);
		expect(git(dir, ["rev-parse", "HEAD"]).out.trim()).not.toBe(before);
		expect(git(dir, ["show", "--name-only", "--format=", "HEAD"]).out).toContain("peer.txt");
	});

	it("does not block commit-scoped.ts, the tool it tells you to use instead", async () => {
		// The failure that would make this guard worse than no guard: it refuses the
		// bare commit, names a replacement in the message, and then blocks that
		// replacement too. Nothing here proves the guard is silent for
		// `commit-scoped.ts` because it builds its commit with `git commit-tree`,
		// which runs no hooks — verified against the real script, not assumed.
		const dir = await makeRepo();
		await fs.mkdir(path.join(dir, "scripts"), { recursive: true });
		await fs.copyFile(
			path.join(import.meta.dir, "..", "commit-scoped.ts"),
			path.join(dir, "scripts", "commit-scoped.ts"),
		);
		git(dir, ["config", "core.hooksPath", ".git/hooks"]);
		await seed(dir, "a.txt", "a\n");
		git(dir, ["commit", "-qm", "seed"]);
		await seed(dir, "b.txt", "mine\n");
		// A peer's row, which commit-scoped must leave staged and uncommitted.
		await seed(dir, "peer.txt", "theirs\n");

		const r = Bun.spawnSync(["bun", "scripts/commit-scoped.ts", "b.txt", "-m", "mine"], {
			cwd: dir,
			stdout: "pipe",
			stderr: "pipe",
		});
		expect(r.stderr.toString()).not.toContain("belongs to every agent");
		expect(git(dir, ["log", "-1", "--format=%s"]).out.trim()).toBe("mine");
		// The point of the replacement tool: the peer's row is still staged, and
		// the commit named only the path it was given.
		expect(git(dir, ["diff", "--cached", "--name-only"]).out.trim()).toBe("peer.txt");
	});
});
