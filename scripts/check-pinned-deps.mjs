import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dependencySections = ["dependencies", "devDependencies", "optionalDependencies"];
const exactVersionPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const ignoredDirectories = new Set([".git", "dist", "node_modules"]);
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

function collectPackageJsonFiles(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!ignoredDirectories.has(entry.name)) {
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
