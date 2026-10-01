#!/usr/bin/env node

/**
 * Tests for `check-commit-tree-not-shrunk.mjs`.
 *
 * The contract is behavioural: given a repository whose HEAD commit shrank the
 * tree, the gate must exit 1, and given a normal commit it must exit 0. Each
 * case reproduces one real way an index can be wrong rather than asserting on
 * the script's text.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.join(HERE, "check-commit-tree-not-shrunk.mjs");

function run(cmd, args, cwd, env) {
	return execFileSync(cmd, args, { cwd, encoding: "utf8", env: { ...process.env, ...env } });
}

function git(args, cwd, env) {
	return run("git", args, cwd, env);
}

/** A repo with `files` committed text files, plus the gate script itself. */
function makeRepo(files) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tree-shrink-test-"));
	git(["init", "-q", "."], dir);
	git(["config", "user.email", "test@example.invalid"], dir);
	git(["config", "user.name", "test"], dir);
	for (const [rel, body] of Object.entries(files)) {
		fs.mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
		fs.writeFileSync(path.join(dir, rel), body);
	}
	git(["add", "-A"], dir);
	git(["commit", "-q", "-m", "baseline"], dir);
	fs.copyFileSync(GATE, path.join(dir, "gate.mjs"));
	return dir;
}

function gateExit(dir, env = {}) {
	try {
		run("node", ["gate.mjs"], dir, env);
		return 0;
	} catch (err) {
		return err.status ?? -1;
	}
}

function trackedFiles(dir) {
	return run("git", ["ls-tree", "-r", "HEAD", "--name-only"], dir)
		.split("\n")
		.filter(Boolean).length;
}

test("a commit that adds a file passes", () => {
	const dir = makeRepo({ "a/one.txt": "one\n" });
	fs.mkdirSync(path.join(dir, "b"), { recursive: true });
	fs.writeFileSync(path.join(dir, "b/two.txt"), "two\n");
	git(["add", "-A"], dir);
	git(["commit", "-q", "-m", "add b/two.txt"], dir);
	assert.equal(gateExit(dir), 0);
});

test("a commit that edits a file, adding bytes, passes", () => {
	// Guards the byte-count arm: an edit can grow the tree while shrinking
	// nothing, and must not be reported.
	const dir = makeRepo({ "a/one.txt": "one\n" });
	fs.appendFileSync(path.join(dir, "a/one.txt"), "a much longer second line\n");
	git(["add", "-A"], dir);
	git(["commit", "-q", "-m", "extend"], dir);
	assert.equal(gateExit(dir), 0);
});

test("the empty-tree commit that a missing GIT_INDEX_FILE produces fails", () => {
	// The measured incident: GIT_INDEX_FILE pointed at a path that did not exist,
	// git read it as an empty index, and committed a tree of zero files while
	// reporting success.
	const dir = makeRepo({ "a/one.txt": "one\n", "b/two.txt": "two\n" });
	run("git", ["commit", "-q", "--allow-empty", "-m", "bug"], dir, {
		GIT_INDEX_FILE: path.join(dir, "no-such-index-file"),
	});
	assert.equal(trackedFiles(dir), 0, "precondition: the commit really emptied the tree");
	assert.equal(gateExit(dir), 1);
});

test("a partial stale index fails even though the tree is not empty", () => {
	// The reason this gate compares weights instead of testing `files == 0`: a
	// stale index commits whatever it last held, so the tree keeps some files and
	// silently loses others. A zero-check would pass this commit.
	const dir = makeRepo({ "a/one.txt": "one\n" });
	fs.mkdirSync(path.join(dir, "b"), { recursive: true });
	fs.writeFileSync(path.join(dir, "b/two.txt"), "two\n");
	git(["add", "-A"], dir);
	git(["commit", "-q", "-m", "add b/two.txt"], dir);
	const full = trackedFiles(dir);
	assert.ok(full > 1, "precondition: the tree has several files");

	// Commit from an index pinned to the previous commit: two files disappear,
	// the rest survive, and git still calls it a success.
	const stale = path.join(dir, "stale-index");
	run("git", ["read-tree", "HEAD~1"], dir, { GIT_INDEX_FILE: stale });
	run("git", ["commit", "-q", "-m", "stale index"], dir, { GIT_INDEX_FILE: stale });

	assert.ok(trackedFiles(dir) > 0, "precondition: the tree is NOT empty");
	assert.ok(trackedFiles(dir) < full, "precondition: but it did lose files");
	assert.equal(gateExit(dir), 1, "a non-empty tree that lost files is still a shrink");
});

test("an intended shrink is allowed only with the explicit escape hatch", () => {
	const dir = makeRepo({ "a/one.txt": "one\n", "b/two.txt": "two\n" });
	git(["rm", "-q", "b/two.txt"], dir);
	git(["commit", "-q", "-m", "delete b/two.txt"], dir);
	assert.equal(gateExit(dir), 1, "a real deletion is still a shrink and must be argued for");
	assert.equal(gateExit(dir, { OMP_ALLOW_TREE_SHRINK: "1" }), 0);
});

test("the root commit is skipped, having no parent to compare against", () => {
	const dir = makeRepo({ "a/one.txt": "one\n" });
	assert.equal(gateExit(dir), 0);
});

test("a merge commit is skipped, since parent comparison is ambiguous", () => {
	const dir = makeRepo({ "a/one.txt": "one\n" });
	git(["checkout", "-q", "-b", "side"], dir);
	fs.writeFileSync(path.join(dir, "a/side.txt"), "side\n");
	git(["add", "-A"], dir);
	git(["commit", "-q", "-m", "side work"], dir);
	git(["checkout", "-q", "-"], dir);
	fs.writeFileSync(path.join(dir, "a/main.txt"), "main\n");
	git(["add", "-A"], dir);
	git(["commit", "-q", "-m", "main work"], dir);
	run("git", ["merge", "-q", "--no-ff", "-m", "merge side", "side"], dir);
	assert.equal(gateExit(dir), 0);
});