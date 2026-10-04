import { describe, expect, it } from "bun:test";
import { rewriteGitWorktreeAdd } from "@oh-my-pi/pi-coding-agent/tools/bash-worktree-rewrite";

const CLI_CMD = ["bun", "/opt/ultraworkers cli.ts"] as const;

describe("rewriteGitWorktreeAdd", () => {
	it("routes supported branch creation through ultraworkers with an option terminator", () => {
		expect(rewriteGitWorktreeAdd("git worktree add -b feat ../wt origin/main", CLI_CMD)).toBe(
			"bun '/opt/ultraworkers cli.ts' worktree add -b feat -- ../wt origin/main",
		);
	});

	it("preserves surrounding shell structure while rewriting a -C segment", () => {
		expect(rewriteGitWorktreeAdd("cd x && git -C repo worktree add ../wt && ls", CLI_CMD)).toBe(
			"cd x && bun '/opt/ultraworkers cli.ts' worktree add -C repo -- ../wt && ls",
		);
	});

	it("leaves unsupported or unsafe commands unchanged", () => {
		const commands = [
			"git worktree add --lock ../wt",
			'git worktree add "$HOME/wt"',
			"FOO=1 git worktree add ../wt",
			"git worktree list",
			"printf x | git worktree add ../wt",
			"git worktree add ../wt | cat",
		];
		for (const command of commands) expect(rewriteGitWorktreeAdd(command, CLI_CMD)).toBe(command);
	});

	it("quotes rewritten argv containing spaces", () => {
		expect(rewriteGitWorktreeAdd("git worktree add 'path with spaces'", CLI_CMD)).toBe(
			"bun '/opt/ultraworkers cli.ts' worktree add -- 'path with spaces'",
		);
	});
});
