/**
 * `worktree add` prints git's prose and nothing about the path it created, so a script
 * that runs it cannot learn where the worktree landed: `add ../feature` resolves
 * against the cwd the caller passed, and the only way to recover the answer afterwards
 * is to re-run `list` and diff. That is BUG-026's third consequence, and it survived the
 * fix for the first two — `list` and `clear` were taught to report worktrees they could
 * not see, while `add` stayed silent about the one thing it just produced.
 *
 * `--json` made it worse rather than better: the flag is declared on the command, so
 * `worktree add --json ../feature` parsed, was accepted, and was then dropped on the
 * floor — the handler never forwarded it. A flag that parses and does nothing is the
 * shape this repo already has a name for.
 *
 * The rows below drive the real `addWorktree` against a real repository, because the
 * defect is a claim about stdout, and stdout is the contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { addWorktree, type AddWorktreeResult } from "@oh-my-pi/pi-coding-agent/cli/worktree-cli";
import { resetSettingsForTest } from "@oh-my-pi/pi-coding-agent/config/settings";

async function git(args: string[], cwd: string): Promise<string> {
	const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	const [text, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	await proc.exited;
	if (proc.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${err}`);
	return text;
}

describe("worktree add reports the worktree it created", () => {
	let base: string;
	let repo: string;
	let logs: string[];

	beforeEach(() => {
		logs = [];
		vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		});
	});

	/** Run one `addWorktree` call with stdout already being collected. */
	async function capture(fn: () => Promise<AddWorktreeResult>): Promise<AddWorktreeResult> {
		return fn();
	}

	beforeEach(async () => {
		// Realpath: the created path is compared against `fs.realpath` below, and on
		// macOS `os.tmpdir()` is under /var → /private/var. Spelling fixtures with the
		// raw path would make the rows fail for a reason that has nothing to do with
		// what they are testing.
		base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-wt-add-")));
		repo = path.join(base, "repo");
		await fs.mkdir(repo, { recursive: true });
		await git(["init", "-q", "-b", "main"], repo);
		await git(["config", "user.email", "t@example.invalid"], repo);
		await git(["config", "user.name", "T"], repo);
		await Bun.write(path.join(repo, "README.md"), "x\n");
		await git(["add", "-A"], repo);
		await git(["commit", "-qm", "init"], repo);
	});

	afterEach(async () => {
		// `addWorktree` calls `Settings.init({ cwd })`, and `Settings` is a
		// process-global first-caller-wins singleton (config/settings.ts:738). Without
		// this reset the singleton stays bound to the temp repo this file made, and
		// any later test that calls `Settings.init({ cwd: <its own dir> })` gets this
		// repo's config back instead of its own — reading zero custom skill
		// directories and reporting nothing where it expected rows.
		//
		// This is not specific to `json`/`quiet`: `Settings.init` runs before any
		// output branch, so even a fully silent `addWorktree` leaks.
		resetSettingsForTest();
		await fs.rm(base, { recursive: true, force: true });
	});

	it("returns the created path, resolved against the cwd it was given", async () => {
		// The fact a caller cannot derive: it wrote `../sibling`, and the directory that
		// exists is not the string it passed. Returning the argument verbatim would be a
		// plausible-looking lie that sends the next step to a path that does not exist.
		const result = await capture(() =>
			addWorktree({ cwd: repo, path: "../sibling", detach: false, quiet: true, json: true }),
		);

		const expected = path.resolve(repo, "../sibling");
		expect(result.path).toBe(expected);
		expect(result.path).not.toBe("../sibling");
		expect(await fs.stat(expected).then(s => s.isDirectory())).toBe(true);
	});

	it("reports the ref and detach state actually checked out", async () => {
		const onBranch = await capture(() =>
			addWorktree({ cwd: repo, path: path.join(base, "b1"), detach: false, quiet: true, json: true }),
		);
		expect(onBranch.ref).toBe("b1");
		expect(onBranch.detached).toBe(false);

		const detached = await capture(() =>
			addWorktree({ cwd: repo, path: path.join(base, "b2"), detach: true, quiet: true, json: true }),
		);
		expect(detached.detached).toBe(true);
		// Precedence between the two flags, stated as a row because neither is
		// exclusive: `--detach` must win over the branch named after the directory, or
		// the caller gets a branch it did not ask for.
		expect((await git(["rev-parse", "--abbrev-ref", "HEAD"], detached.path)).trim()).toBe("HEAD");
	});

	it("--quiet still suppresses the human progress lines", async () => {
		await capture(() =>
			addWorktree({ cwd: repo, path: path.join(base, "silent"), detach: false, quiet: true, json: false }),
		);

		// The negative contract. Without it, a fix that simply deleted the
		// `!options.quiet` guards would pass every other row here, since they all run
		// with `quiet: true`.
		expect(logs).toEqual([]);
	});

	it("names the created path in human output, where the caller cannot derive it", async () => {
		await capture(() => addWorktree({ cwd: repo, path: "../human-out", detach: false, quiet: false, json: false }));

		// The relative argument is the point: the caller wrote `../human-out`, and the
		// directory that exists is not that string. A human reading this output has no
		// other way to learn where the worktree landed, which is what the row is for.
		const created = path.resolve(repo, "../human-out");
		expect(logs.join("\n")).toContain(created);
		expect(await fs.stat(created).then(s => s.isDirectory())).toBe(true);
	});

	it("--quiet does not suppress --json, because the machine-readable request is the output", async () => {
		await capture(() =>
			addWorktree({ cwd: repo, path: path.join(base, "both"), detach: false, quiet: true, json: true }),
		);

		// Both flags are accepted together and neither is exclusive. If `--quiet` won,
		// a script passing both would silently get nothing — the same empty-is-clean
		// shape BUG-026 is about, reached through a different door.
		expect(logs).toHaveLength(1);
		const parsed = JSON.parse(logs[0]) as AddWorktreeResult;
		expect(parsed.path).toBe(path.join(base, "both"));
		expect(parsed.ref).toBe("both");
		expect(parsed.detached).toBe(false);
	});
});
