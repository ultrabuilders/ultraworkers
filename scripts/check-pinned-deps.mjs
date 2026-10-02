import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dependencySections = ["dependencies", "devDependencies", "optionalDependencies"];
const exactVersionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
// `.claude` carries the same reason and the same measurement as in
// `check-ts-relative-imports.mjs`: `isNestedRepositoryRoot` catches a worktree
// because that checkout has a `.git` entry, but nothing caught an ordinary
// dot-directory at the same path. This gate reads every `package.json` the walk
// finds, and a checkout under `.claude/worktrees/` brings a whole second
// dependency graph with it — governed by a different index, so its ranges are not
// this repository's supply-chain surface. Measured cost of excluding: zero
// tracked files, at any depth.
//
// Matched by NAME at every level, not by a root-anchored prefix, and that is
// deliberate — do not narrow it to `.claude/` at the root. A `.claude/` at any
// depth is project-scoped agent configuration rather than shipped source, so it
// is not this repository's supply-chain surface to begin with; one name here
// states that for every level, where a prefix would state it for one and leave
// the rest to be re-decided. Reviewed and kept in this form (epic-wh2q).
const ignoredDirectories = new Set([".git", ".claude", "dist", "node_modules"]);
const internalPackageNames = new Set();
const packageJsonFiles = [];

/**
 * Workspaces that never reach a registry, so a range specifier there carries no
 * supply-chain exposure this gate exists to prevent. Each entry records WHY it is
 * exempt: a reader must be able to tell "not published" apart from "red, so I
 * ignored it". An entry loses its exemption the moment the package gains a
 * `publishConfig` — see `check-pinned-deps.test.mjs`, which fails when that
 * happens, so this list cannot rot into a blanket suppression.
 */
const unpublishedWorkspaces = new Map([
	[".omp/tools", "internal agent tooling, installed from the repo"],
	["packages/coding-agent/examples/extensions/with-deps", "example shipped in-repo, never published"],
	["packages/metaharness", "internal harness UI, not on any registry"],
	["packages/omptype", "vendored fork, published from a different pipeline"],
]);

/**
 * True when `directory` is itself the root of another repository.
 *
 * `readdirSync` returns dotfile entries unconditionally — it has no `dot`
 * option at all, so there is nothing to switch off. Walking into a nested
 * checkout therefore re-reports every finding the parent repository already
 * owns: `EnterWorktree` writes a complete tree under `.claude/worktrees/<name>/`
 * with its own `.git` file, and the parent gate then reports files governed by
 * a different index. Measured at 661 phantom findings from one worktree.
 *
 * The rule is deliberately NOT "skip dot-directories". This repository tracks
 * 532 files under dot-directories, and two of them are load-bearing for these
 * gates: `.omp/tools/package.json` is an explicitly-exempt workspace in
 * `check-pinned-deps`, and `.omp/tools/tui.ts` is a gated TypeScript source.
 * A blanket dot-skip would delete that coverage silently while still printing
 * a clean report — the one failure mode a gate must never have.
 *
 * A separate repository is the distinction that actually separates the two:
 * its files belong to a different index.
 */
function isNestedRepositoryRoot(directory) {
	return existsSync(join(directory, ".git"));
}

function collectPackageJsonFiles(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!ignoredDirectories.has(entry.name) && !isNestedRepositoryRoot(join(directory, entry.name))) {
				collectPackageJsonFiles(join(directory, entry.name));
			}
			continue;
		}

		if (entry.isFile() && entry.name === "package.json") {
			packageJsonFiles.push(join(directory, entry.name));
		}
	}
}

function isInternalWorkspaceDependency(name) {
	return name.startsWith("@oh-my-pi/pi-") || internalPackageNames.has(name);
}

function isNonRegistrySpecifier(specifier) {
	return /^(?:workspace:|file:|link:|portal:|git\+|github:|git:|https?:|ssh:|git:\/\/)/.test(specifier);
}

function getVersionSpecifier(specifier) {
	if (!specifier.startsWith("npm:")) return specifier;
	const aliasTarget = specifier.slice("npm:".length);
	const versionSeparator = aliasTarget.lastIndexOf("@");
	if (versionSeparator <= 0) return specifier;
	return aliasTarget.slice(versionSeparator + 1);
}

/**
 * Bun's workspace catalog protocol. The plain form is the literal string
 * `catalog:`, with the pinned version living once in the root `package.json`
 * under `catalog`; `catalog:^1.2.3` is the documented override form. A range
 * never appears in the plain form, so requiring a semver literal would be a
 * false positive on the repo's own pinning mechanism.
 */
function isCatalogSpecifier(specifier) {
	return specifier.startsWith("catalog:");
}

/**
 * Whether this manifest sits in a workspace that never reaches a registry.
 * Re-derived per file rather than memoized on the exemption list, so a package
 * that later gains `publishConfig` loses its exemption the moment it earns one.
 */
function isUnpublishedWorkspace(file, packageJson) {
	const directory = file.replace(/\/package\.json$/, "");
	const reason = unpublishedWorkspaces.get(directory);
	if (reason === undefined) return false;
	if (packageJson.private === true) return true;
	return packageJson.publishConfig === undefined;
}

const failures = [];

collectPackageJsonFiles(".");

for (const file of packageJsonFiles.sort()) {
	const packageJson = JSON.parse(readFileSync(file, "utf8"));
	const unpublished = isUnpublishedWorkspace(file, packageJson);

	for (const section of dependencySections) {
		const dependencies = packageJson[section];
		if (!dependencies) continue;

		for (const [name, specifier] of Object.entries(dependencies)) {
			if (isInternalWorkspaceDependency(name) || isNonRegistrySpecifier(specifier)) continue;
			if (isCatalogSpecifier(specifier) || unpublished) continue;
			if (exactVersionPattern.test(getVersionSpecifier(specifier))) continue;
			failures.push(`${file}: ${section}.${name} must be pinned, found ${specifier}`);
		}
	}
}

if (failures.length > 0) {
	console.error("Direct external dependencies must use exact versions:");
	for (const failure of failures) console.error(`  ${failure}`);
	process.exit(1);
}
