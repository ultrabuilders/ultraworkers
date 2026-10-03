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
