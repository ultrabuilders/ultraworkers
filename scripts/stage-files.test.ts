/**
 * `stage-files.ts` exists because a read-back of the staged set is not a guarantee:
 * `git add` and `git commit` are two moments, and a peer can stage between them.
 * Measured four times on the shared tree, read-back showed exactly the files I
 * named and the commit still carried a fifth.
 *
 * So these tests run against REAL git repositories in temp dirs rather than
 * against mocks. The property under test is what ends up in `.git/index`, and a
 * mock of `update-index` would be asserting that the mock was called — which is
 * the shape of test that passes while the index is wrong.
 *
 * The load-bearing case is the first one: a peer's staged entry must survive, and
 * must NOT appear in what this tool reports as staged. A version that quietly ran
 * `git add` instead would pass every other test here.
 */
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { $ } from "bun";
import { TempDir } from "@oh-my-pi/pi-utils";
import { isTrackedAtHead, stageFile, stageFiles, validateTargets } from "./stage-files";

/** A git repo with one commit, so HEAD exists and `cat-file -e HEAD:<path>` is meaningful. */
async function makeRepo(): Promise<{ dir: TempDir; root: string }> {
	const dir = TempDir.createSync();
	const root = dir.path();
	const run = async (...args: string[]) => {
		const r = await $`git ${args}`.cwd(root).quiet().nothrow();
		if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.toString()}`);
	};
	await run("init", "-q");
	await run("config", "user.email", "test@example.com");
	await run("config", "user.name", "Test");
	await fs.promises.writeFile(path.join(root, "seed.txt"), "seed\n");
	await run("add", "seed.txt");
	await run("commit", "-q", "-m", "seed");
	return { dir, root };
}

/** What the index currently records for `file`, or undefined when absent. */
async function indexBlob(root: string, file: string): Promise<string | undefined> {
	const r = await $`git ls-files -s -- ${file}`.cwd(root).quiet().nothrow();
	if (r.exitCode !== 0) return undefined;
	const line = r.text().trim();
	if (line === "") return undefined;
	return line.split(/\s+/)[1];
}

describe("validateTargets", () => {
	test("refuses an empty list rather than staging nothing", () => {
		expect(() => validateTargets([], process.cwd())).toThrow(/name at least one file/);
	});

	test("refuses a path that is not on disk", () => {
		expect(() => validateTargets(["definitely/not/here.ts"], process.cwd())).toThrow(/no such file/);
	});

	test("refuses an absolute path, which would resolve outside the repo root", () => {
		expect(() => validateTargets([path.resolve("scripts/stage-files.ts")], process.cwd())).toThrow(/repo-relative/);
	});

	test("refuses a directory", () => {
		expect(() => validateTargets(["scripts"], process.cwd())).toThrow(/not a regular file/);
	});

	test("refuses the same path twice, which would stage it and then report it as new", () => {
		expect(() => validateTargets(["scripts/stage-files.ts", "scripts/stage-files.ts"], process.cwd())).toThrow(
			/named twice/,
		);
	});
});

describe("stageFiles against a real index", () => {
	test("stages a brand-new file that HEAD has never seen", async () => {
		const { dir, root } = await makeRepo();
		try {
			await fs.promises.writeFile(path.join(root, "fresh.ts"), "export const a = 1;\n");
			expect(await isTrackedAtHead("fresh.ts", root)).toBe(false);

			const [staged] = await stageFiles(["fresh.ts"], root);

			expect(staged?.isNew).toBe(true);
			expect(await indexBlob(root, "fresh.ts")).toBe(staged?.hash);
			// The bytes staged are the bytes on disk, not a name-only marker.
			expect(staged?.bytes).toBeGreaterThan(0);
		} finally {
			dir.remove();
		}
	});

	test("a peer's staged entry survives untouched and is not reported as mine", async () => {
		// The whole reason this tool exists.
		//
		// The peer's edit is to the SAME path, which is the case that separates this
		// from `git add`: staging that path with `git add` takes the peer's bytes too,
		// because the working tree holds one file that both of us wrote into. A peer
		// editing a DIFFERENT path does not discriminate — `git add` is equally safe
		// there, so that version of this test passes an implementation with none of the
		// property claimed here.
		const { dir, root } = await makeRepo();
		try {
			await fs.promises.writeFile(path.join(root, "shared.ts"), "export const mine = 1;\n");
			await $`git add shared.ts`.cwd(root).quiet().nothrow();
			await $`git commit -q -m shared`.cwd(root).quiet().nothrow();

			// A peer, mid-flight in the same file, on top of my version.
			const peerContent = "export const mine = 1;\n// peer's uncommitted line\n";
			await fs.promises.writeFile(path.join(root, "shared.ts"), peerContent);

			const [staged] = await stageFiles(["shared.ts"], root, {
				contents: new Map([["shared.ts", "export const mine = 1;\n"]]),
			});

			// What landed in the index is MY content, not the working tree's. This is
			// the assertion a `git add` implementation cannot pass: it would stage
			// `peerContent` and report a hash for it.
			const stagedBlob = await $`git cat-file -p ${staged!.hash}`.cwd(root).quiet().nothrow();
			expect(stagedBlob.text()).toBe("export const mine = 1;\n");

			// The peer's bytes are still on disk, untouched — this is not a checkout.
			expect(await fs.promises.readFile(path.join(root, "shared.ts"), "utf8")).toBe(peerContent);
		} finally {
			dir.remove();
		}
	});

	test("a peer's staged entry on another path is neither clobbered nor claimed", async () => {
		const { dir, root } = await makeRepo();
		try {
			await fs.promises.writeFile(path.join(root, "peer.ts"), "export const peer = 1;\n");
			await $`git add peer.ts`.cwd(root).quiet().nothrow();
			const peerBlob = await indexBlob(root, "peer.ts");
			expect(peerBlob).toBeDefined();

			await fs.promises.writeFile(path.join(root, "mine.ts"), "export const mine = 1;\n");
			const staged = await stageFiles(["mine.ts"], root);

			expect(staged.map(s => s.path)).toEqual(["mine.ts"]);
			expect(await indexBlob(root, "peer.ts")).toBe(peerBlob);
			// Both are staged, so a BARE commit would take both. That is the hazard
			// `commit-scoped.ts` exists to close on the commit side.
			const status = await $`git diff --cached --name-only`.cwd(root).quiet().nothrow();
			expect(status.text().split("\n").filter(Boolean).sort()).toEqual(["mine.ts", "peer.ts"]);
		} finally {
			dir.remove();
		}
	});

	test("stages a modification without touching the working tree", async () => {
		const { dir, root } = await makeRepo();
		try {
			await fs.promises.writeFile(path.join(root, "tracked.txt"), "one\n");
			await $`git add tracked.txt`.cwd(root).quiet().nothrow();
			await $`git commit -q -m two`.cwd(root).quiet().nothrow();

			await fs.promises.writeFile(path.join(root, "tracked.txt"), "two-changed\n");
			const [staged] = await stageFiles(["tracked.txt"], root);

			expect(staged?.isNew).toBe(false);
			// The working tree still holds the author's edit — staging is not a checkout.
			expect(await fs.promises.readFile(path.join(root, "tracked.txt"), "utf8")).toBe("two-changed\n");
			// And the index points at the NEW content, not HEAD's.
			const show = await $`git cat-file -p ${staged!.hash}`.cwd(root).quiet().nothrow();
			expect(show.text()).toBe("two-changed\n");
		} finally {
			dir.remove();
		}
	});

	test("records the executable bit, so a staged script is not committed as 644", async () => {
		const { dir, root } = await makeRepo();
		try {
			await fs.promises.writeFile(path.join(root, "hook.sh"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
			await fs.promises.chmod(path.join(root, "hook.sh"), 0o755);
			await stageFile("hook.sh", root);

			const r = await $`git ls-files -s -- hook.sh`.cwd(root).quiet().nothrow();
			expect(r.text().split(/\s+/)[0]).toBe("100755");
		} finally {
			dir.remove();
		}
	});

	test("a bad path in the middle stages nothing at all", async () => {
		// Half-staged work on a shared tree is worse than none: it sits in an index
		// another session will commit under its own message.
		const { dir, root } = await makeRepo();
		try {
			await fs.promises.writeFile(path.join(root, "ok.ts"), "ok\n");
			await expect(stageFiles(["ok.ts", "missing.ts"], root)).rejects.toThrow(/no such file/);
			expect(await indexBlob(root, "ok.ts")).toBeUndefined();
		} finally {
			dir.remove();
		}
	});
});
