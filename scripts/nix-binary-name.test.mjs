/**
 * `nix/package.nix` must install the file the local build actually produces.
 *
 * These two files are coupled through a path literal and nothing else connects
 * them: `nix/package.nix` runs `bun run build`, and `build-binary.ts` decides
 * the output name. Nothing in either file imports the other, so renaming the
 * output is a legal commit on its own — and it leaves the nix build installing
 * a file that does not exist. That is not hypothetical: `d29c43d736` renamed the
 * dev binary to `ultraworkers` and `nix/package.nix` kept installing
 * `dist/omp`, so `nix build` fails at `install -Dm755` on a path that will never
 * appear again.
 *
 * It failed SILENTLY for a long time because the gate that could have caught it
 * cannot run here: `nix` is not installed on the machines this is developed on,
 * so the package build is `NOT RUN` everywhere. A build step whose only oracle
 * is itself does not fail until someone runs it, and nobody was running it.
 *
 * So this gate compares the two sides by reading them. That is normally the
 * banned shape — a test that greps an implementation file asserts on how the
 * code looks, not on what it does. Here it is the contract itself: the only
 * observable failure mode of this coupling is "these two path literals name
 * different files", and reading both is the sole way to reach it without a nix
 * toolchain. The names are also not free text either side of a function
 * boundary — one is a build output path, the other is an install input, and
 * matching them IS the requirement.
 *
 * Scope is deliberately narrow. The installed NAME (`$out/bin/ultraworkers`),
 * `pname`, and `mainProgram` are user-facing and are the owner's decision. The
 * name moved from `omp` to `ultraworkers` during the rebrand; that move was a
 * user-facing break for a nix consumer writing `programs.omp.enable = true`,
 * and it was decided as policy rather than derived from anything this gate
 * checks. This gate says nothing about the destination name and stayed green
 * through that rename on purpose, because the source path it compares is
 * independent of where the file is installed to. Measured 2026-10-02: both
 * sides read `ultraworkers`, so the assertion below is still true.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_BINARY = path.join(REPO_ROOT, "packages/coding-agent/scripts/build-binary.ts");
const NIX_PACKAGE = path.join(REPO_ROOT, "nix/package.nix");

/**
 * The name `build-binary.ts` writes for a plain (non-cross) build.
 *
 * `outName` is a ternary whose false branch is the local build; the cross branch
 * adds a target suffix that a nix build never uses, since it runs without
 * CROSS_TARGET. Reading the false branch keeps this tied to the variable rather
 * than to a hardcoded string.
 */
async function localBuildOutputName() {
	const source = await readFile(BUILD_BINARY, "utf8");
	const match = source.match(/const outName = crossBuild \? `[^`]*` : "([^"]+)"/);
	assert.ok(match, "build-binary.ts no longer declares `outName` in the form this gate reads");
	return match[1];
}

/** The dist path `nix/package.nix` installs the compiled binary from. */
async function nixInstalledSourcePath() {
	const source = await readFile(NIX_PACKAGE, "utf8");
	const match = source.match(/install -Dm755 (packages\/coding-agent\/dist\/\S+)/);
	assert.ok(match, "nix/package.nix no longer installs a compiled binary from dist/");
	return match[1];
}

test("nix installs the binary the local build writes", async () => {
	const produced = await localBuildOutputName();
	const consumed = await nixInstalledSourcePath();

	assert.equal(
		consumed,
		`packages/coding-agent/dist/${produced}`,
		`nix/package.nix installs ${consumed}, but \`bun run build\` writes ` +
			`packages/coding-agent/dist/${produced}. Nothing connects these two files except this ` +
			`path, so the nix build fails at install on a file that does not exist.`,
	);
});