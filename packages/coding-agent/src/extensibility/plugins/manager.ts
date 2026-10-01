import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	atomicWriteJson,
	getPluginsDir,
	getPluginsLockfile,
	getPluginsNodeModules,
	getPluginsPackageJson,
	getProjectDir,
	getProjectPluginOverridesPath,
	isEnoent,
	logger,
	withFileLock,
} from "@oh-my-pi/pi-utils";
import { resolveActiveProjectRegistryPath } from "../../discovery/helpers";
import { loadExtensions } from "../extensions/loader";
import { collectDiagnostics } from "../extensions/diagnostics";
import { refreshBunGitCache } from "./bun-git-cache";
import { type GitSource, parseGitUrl } from "./git-url";
import { resolvePluginManifestEntries } from "./loader";
import { resolveOrDefaultProjectRegistryPath } from "../../discovery/helpers";
import {
	getMarketplacesCacheDir,
	getMarketplacesRegistryPath,
	getPluginsCacheDir,
	MarketplaceManager,
} from "./marketplace/index";
import { getInstalledPluginsRegistryPath, readInstalledPluginsRegistry } from "./marketplace/registry";
import { parsePluginId } from "./marketplace/types";
import { extractPackageName, parsePluginSpec } from "./parser";
import { normalizePluginRuntimeConfig } from "./runtime-config";
import type {
	CheckOutcome,
	DoctorOptions,
	InstalledPlugin,
	InstallOptions,
	PluginManifest,
	PluginRuntimeConfig,
	PluginSettingSchema,
	ProjectPluginOverrides,
} from "./types";

// =============================================================================
// Validation
// =============================================================================

/** Valid npm package name pattern (scoped and unscoped, with optional version) */
const VALID_PACKAGE_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@[a-z0-9-._^~>=<]+)?$/i;

/** Characters that are never valid in any plugin install spec — git or npm. */
const SHELL_METACHARS = /[;&|`$(){}<>\\\n\r\t]/;

/**
 * Validate package name to prevent command injection. npm specs only — git
 * specs (`github:user/repo`, `https://github.com/...`, ...) MUST go through
 * {@link validateGitSpec} instead because they contain characters npm rejects
 * (`:`, `/`, `#`, `+`, `@` in non-version positions).
 */
function validatePackageName(name: string): void {
	// Remove version specifier for validation
	const baseName = extractPackageName(name);
	if (!VALID_PACKAGE_NAME.test(baseName)) {
		throw new Error(`Invalid package name: ${name}`);
	}
	// Extra safety: no shell metacharacters
	if (/[;&|`$(){}[\]<>\\]/.test(name)) {
		throw new Error(`Invalid characters in package name: ${name}`);
	}
}

/**
 * Validate a git install spec — accepts `:`, `/`, `#`, `+`, `.`, `-`, `_`,
 * `~`, `@` (which would all fail {@link validatePackageName}) but rejects
 * shell metacharacters so the spec stays safe when forwarded to bun install.
 * `Bun.spawn` does not invoke a shell, but defense-in-depth keeps things
 * obvious for future readers.
 */
function validateGitSpec(spec: string): void {
	if (SHELL_METACHARS.test(spec)) {
		throw new Error(`Invalid characters in plugin source: ${spec}`);
	}
}

function gitInstallSpec(original: string, source: GitSource): string {
	if (/^github:/i.test(original) || !/^[a-z]+:[^/]/i.test(original)) {
		return original;
	}
	if (!source.ref || source.repo.includes("#")) {
		return source.repo;
	}
	return `${source.repo}#${source.ref}`;
}

function findGitPackageName(source: GitSource, deps: Record<string, string>): string | undefined {
	for (const [key, value] of Object.entries(deps)) {
		if (typeof value !== "string") {
			continue;
		}
		const installedSource = parseGitUrl(value);
		if (installedSource && installedSource.host === source.host && installedSource.path === source.path) {
			return key;
		}
	}
	return undefined;
}

interface PluginPackageSnapshot {
	readonly actualName: string;
	readonly packagePath: string;
	readonly backupRoot: string;
	readonly backupPath: string;
}

interface RuntimePackageJson {
	name?: unknown;
	version: string;
	omp?: PluginManifest;
	pi?: PluginManifest;
}
// =============================================================================
// Plugin Manager
// =============================================================================

/** Outcome of a plugin-config mutation, as observed on disk. */
export interface ChangeResult {
	/** False when the mutation was a no-op, so nothing was written. */
	changed: boolean;
	/** Whether the running session already reflects the write. */
	application: "applied" | "restart-required";
}

/** A contributed diagnostic that never settles must not take the doctor down with it. */
const DIAGNOSTIC_TIMEOUT_MS = 5_000;

/**
 * Parity between `patches/*.patch` and `package.json.patchedDependencies`.
 *
 * MANDATORY to report `unavailable` rather than pass: the ledger is local-only
 * until the M4 patch-dependency work merges, and a build that silently applies
 * fewer patches than the manifest claims is a failure nobody would otherwise see.
 *
 * Moved here from `doctor-checks.ts`, which no production path reached. The check
 * is only worth anything if the shipped doctor runs it — a registry nothing calls
 * is a table of intentions, and it left the live summary reporting every line as
 * accounted for while this one went unchecked.
 */
async function checkPatchLedger(root: string): Promise<CheckOutcome> {
	const patchesDir = path.join(root, "patches");
	if (!fs.existsSync(patchesDir)) {
		return {
			name: "patch_ledger",
			status: "unavailable",
			message: `No patches/ directory under ${root} — patch ledger not checked`,
		};
	}

	let manifest: { patchedDependencies?: Record<string, string> } | undefined;
	try {
		manifest = (await Bun.file(path.join(root, "package.json")).json()) as typeof manifest;
	} catch {
		manifest = undefined;
	}
	if (!manifest) {
		return {
			name: "patch_ledger",
			status: "unavailable",
			message: "package.json could not be read — patch ledger not checked",
		};
	}

	const declared = manifest.patchedDependencies ?? {};
	const declaredFiles = Object.values(declared);
	const entries = await fs.promises.readdir(patchesDir);
	const missing = declaredFiles.filter(file => !fs.existsSync(path.join(root, file)));

	// The reverse direction too: a patch file nothing declares is applied by nobody,
	// so the manifest and the directory have drifted apart.
	const onDisk = entries.filter(name => name.endsWith(".patch")).map(name => `patches/${name}`);
	const undeclared = onDisk.filter(file => !declaredFiles.includes(file));

	const problems = [
		...missing.map(file => `declared but missing: ${file}`),
		...undeclared.map(file => `present but undeclared: ${file}`),
	];
	if (problems.length > 0) {
		return { name: "patch_ledger", status: "error", message: problems.join("; ") };
	}
	return {
		name: "patch_ledger",
		status: "ok",
		message: `${declaredFiles.length} patch(es) declared and present`,
	};
}

export class PluginManager {
	#runtimeConfig: PluginRuntimeConfig | null = null;
	#cwd: string;

	constructor(
		cwd: string = getProjectDir(),
		/**
		 * Overrides the plugins home, so the lockfile resolves under it. Read,
		 * lock and write must all agree on one path; passing it per instance is
		 * what lets a test drive two managers at two different lockfiles.
		 */
		readonly home?: string,
	) {
		this.#cwd = cwd;
	}

	/** The single lockfile path this instance reads, locks and writes. */
	#getLockfile(): string {
		return getPluginsLockfile(this.home);
	}

	// ==========================================================================
	// Runtime Config Management
	// ==========================================================================

	async #readRuntimeConfigAt(lockPath: string): Promise<PluginRuntimeConfig> {
		try {
			return normalizePluginRuntimeConfig(await Bun.file(lockPath).json());
		} catch (err) {
			if (isEnoent(err)) return normalizePluginRuntimeConfig({});
			logger.warn("Failed to load plugin runtime config", { path: lockPath, error: String(err) });
			return normalizePluginRuntimeConfig({});
		}
	}

	async #loadRuntimeConfig(): Promise<PluginRuntimeConfig> {
		return this.#readRuntimeConfigAt(this.#getLockfile());
	}

	async #ensureConfigLoaded(): Promise<PluginRuntimeConfig> {
		if (!this.#runtimeConfig) {
			this.#runtimeConfig = await this.#loadRuntimeConfig();
		}
		return this.#runtimeConfig;
	}

	async #mutateConfig(
		mutate: (config: PluginRuntimeConfig) => void,
		application: ChangeResult["application"],
	): Promise<ChangeResult> {
		return await withFileLock(this.#getLockfile(), async () => {
			// Re-read INSIDE the lock rather than trusting the memoized copy: a
			// second process may have written since it was taken, and mutating
			// that stale object would silently drop their changes on our write.
			const config = await this.#loadRuntimeConfig();
			const before = JSON.stringify(config);
			mutate(config);
			const changed = JSON.stringify(config) !== before;
			this.#runtimeConfig = config;
			if (changed) {
				await atomicWriteJson(this.#getLockfile(), config);
			}
			return { changed, application };
		});
	}

	async #loadProjectOverrides(): Promise<ProjectPluginOverrides> {
		const overridesPath = getProjectPluginOverridesPath(this.#cwd);
		try {
			return await Bun.file(overridesPath).json();
		} catch (err) {
			if (isEnoent(err)) return {};
			logger.warn("Failed to load project plugin overrides", { path: overridesPath, error: String(err) });
			return {};
		}
	}

	// ==========================================================================
	// Directory Management
	// ==========================================================================

	async #ensurePluginsDir(): Promise<void> {
		await fs.promises.mkdir(getPluginsDir(), { recursive: true });
		await fs.promises.mkdir(getPluginsNodeModules(), { recursive: true });
	}

	async #ensurePackageJson(): Promise<void> {
		const pkgJsonPath = getPluginsPackageJson();
		try {
			await Bun.file(pkgJsonPath).json();
		} catch (err) {
			if (isEnoent(err)) {
				await Bun.write(
					pkgJsonPath,
					JSON.stringify(
						{
							name: "omp-plugins",
							private: true,
							dependencies: {},
						},
						null,
						2,
					),
				);
				return;
			}
			throw err;
		}
	}

	/**
	 * Read the `dependencies` map from `plugins/package.json`. Returns an empty
	 * object when the file does not exist yet so callers can diff `before`
	 * against `after` to discover the package bun just installed under its
	 * real name (git specs do not encode the package name in the spec itself).
	 */
	async #readDeps(pkgJsonPath: string): Promise<Record<string, string>> {
		try {
			const json = await Bun.file(pkgJsonPath).json();
			return (json.dependencies as Record<string, string>) ?? {};
		} catch (err) {
			if (isEnoent(err)) return {};
			throw err;
		}
	}

	async #removeDependencyEntries(pkgJsonPath: string, names: readonly string[]): Promise<void> {
		const pkgJson: { dependencies?: Record<string, string>; [key: string]: unknown } =
			await Bun.file(pkgJsonPath).json();
		if (!pkgJson.dependencies) {
			return;
		}
		let changed = false;
		for (const name of names) {
			if (name in pkgJson.dependencies) {
				delete pkgJson.dependencies[name];
				changed = true;
			}
		}
		if (changed) {
			await Bun.write(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
		}
	}

	#collectInstalledNames(deps: Record<string, string>, config: PluginRuntimeConfig): Set<string> {
		const installedNames = new Set<string>();
		for (const name of Object.keys(deps)) {
			installedNames.add(name);
		}
		for (const name of Object.keys(config.plugins)) {
			installedNames.add(name);
		}
		return installedNames;
	}
	async #resolvePlugin(
		fallbackName: string,
		pluginPath: string,
		config: PluginRuntimeConfig,
		projectOverrides: ProjectPluginOverrides,
	): Promise<InstalledPlugin | undefined> {
		let pluginPkg: RuntimePackageJson;
		try {
			pluginPkg = await Bun.file(path.join(pluginPath, "package.json")).json();
		} catch (err) {
			if (isEnoent(err)) return undefined;
			throw err;
		}

		const name = typeof pluginPkg.name === "string" && pluginPkg.name.length > 0 ? pluginPkg.name : fallbackName;
		const manifest: PluginManifest = pluginPkg.omp || pluginPkg.pi || { version: pluginPkg.version };
		manifest.version = pluginPkg.version;
		const runtimeState = config.plugins[name] || {
			version: pluginPkg.version,
			enabledFeatures: null,
			enabled: true,
		};
		const isDisabledInProject = projectOverrides.disabled?.includes(name) ?? false;

		return {
			name,
			version: pluginPkg.version,
			path: pluginPath,
			manifest,
			enabledFeatures: projectOverrides.features?.[name] ?? runtimeState.enabledFeatures,
			enabled: runtimeState.enabled && !isDisabledInProject,
		};
	}
	async #collectMarketplaceRuntimePackageRealpaths(): Promise<Map<string, Set<string>>> {
		const registry = await readInstalledPluginsRegistry(getInstalledPluginsRegistryPath());
		const packageRealpaths = new Map<string, Set<string>>();
		await Promise.all(
			Object.entries(registry.plugins).flatMap(([pluginId, entries]) =>
				entries.map(async entry => {
					// Legacy registries written before `scope` was added omit the field;
					// `listClaudePluginRoots` treats those as user-scoped, so do the same.
					if ((entry.scope ?? "user") !== "user") return;
					const packageJsonPath = path.join(entry.installPath, "package.json");
					const parsedId = parsePluginId(pluginId);
					let packageName = parsedId?.name ?? pluginId;
					try {
						const pkg: RuntimePackageJson = await Bun.file(packageJsonPath).json();
						if (typeof pkg.name === "string" && pkg.name.length > 0) {
							packageName = pkg.name;
						}
					} catch (err) {
						if (!isEnoent(err)) {
							logger.debug("Failed to inspect marketplace plugin package path", {
								path: entry.installPath,
								error: String(err),
							});
							return;
						}
					}

					try {
						const installRealpath = await fs.promises.realpath(entry.installPath);
						const realpaths = packageRealpaths.get(packageName) ?? new Set<string>();
						realpaths.add(installRealpath);
						packageRealpaths.set(packageName, realpaths);
					} catch (err) {
						if (isEnoent(err)) return;
						throw err;
					}
				}),
			),
		);
		return packageRealpaths;
	}

	async #isMarketplaceRuntimeLink(
		name: string,
		deps: Record<string, string>,
		marketplaceRuntimeRealpaths: Map<string, Set<string>>,
		pluginPath: string,
	): Promise<boolean> {
		if (name in deps) return false;
		const realpaths = marketplaceRuntimeRealpaths.get(name);
		if (!realpaths) return false;
		try {
			return realpaths.has(await fs.promises.realpath(pluginPath));
		} catch (err) {
			if (isEnoent(err)) return false;
			throw err;
		}
	}

	async #snapshotInstalledPackage(actualName: string | undefined): Promise<PluginPackageSnapshot | null> {
		if (!actualName) {
			return null;
		}
		const packagePath = path.join(getPluginsNodeModules(), actualName);
		try {
			await fs.promises.lstat(packagePath);
		} catch (err) {
			if (isEnoent(err)) {
				return null;
			}
			throw err;
		}

		const backupRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "omp-plugin-backup-"));
		const backupPath = path.join(backupRoot, "package");
		await fs.promises.cp(packagePath, backupPath, { recursive: true, verbatimSymlinks: true });
		return { actualName, packagePath, backupRoot, backupPath };
	}

	async #cleanupSnapshot(snapshot: PluginPackageSnapshot | null): Promise<void> {
		if (!snapshot) {
			return;
		}
		try {
			await fs.promises.rm(snapshot.backupRoot, { recursive: true, force: true });
		} catch (err) {
			logger.warn("Failed to remove plugin install backup", { plugin: snapshot.actualName, error: String(err) });
		}
	}

	async #rollbackFailedInstall(
		actualName: string | undefined,
		packageJsonBefore: string,
		bunLockBefore: string | null,
		snapshot: PluginPackageSnapshot | null,
	): Promise<void> {
		await Bun.write(getPluginsPackageJson(), packageJsonBefore);

		// Restore (or remove) bun's lockfile. Without this, a `bun install` +
		// `bun update` pair that successfully rewrote `bun.lock` would leave the
		// rejected commit pinned even when validation rolls everything else back.
		const bunLockPath = path.join(getPluginsDir(), "bun.lock");
		if (bunLockBefore === null) {
			await fs.promises.rm(bunLockPath, { force: true });
		} else {
			await Bun.write(bunLockPath, bunLockBefore);
		}

		// `actualName` may be undefined when the install failed before the dep
		// key was resolved — package.json + bun.lock restoration above is the
		// complete rollback in that case.
		if (!actualName) {
			return;
		}
		const packagePath = path.join(getPluginsNodeModules(), actualName);
		await fs.promises.rm(packagePath, { recursive: true, force: true });
		if (!snapshot) {
			return;
		}
		await fs.promises.mkdir(path.dirname(snapshot.packagePath), { recursive: true });
		await fs.promises.cp(snapshot.backupPath, snapshot.packagePath, { recursive: true, verbatimSymlinks: true });
	}

	async #validateInstalledExtensions(plugin: InstalledPlugin): Promise<void> {
		const declaredEntries = resolvePluginManifestEntries(plugin, "extensions");
		if (declaredEntries.length === 0) {
			return;
		}

		const errors: string[] = [];
		const loadable: string[] = [];
		for (const { entry, resolvedPath } of declaredEntries) {
			if (resolvedPath === null) {
				errors.push(`${entry}: declared extension entry not found on disk`);
			} else {
				loadable.push(resolvedPath);
			}
		}

		if (loadable.length > 0) {
			const result = await loadExtensions(loadable, this.#cwd);
			for (const failure of result.errors) {
				errors.push(`${failure.path}: ${failure.error}`);
			}
		}

		if (errors.length > 0) {
			throw new Error(`Plugin ${plugin.name} extension validation failed:\n${errors.join("\n")}`);
		}
	}

	// ==========================================================================
	// Install / Uninstall
	// ==========================================================================

	/**
	 * Install a plugin with optional feature selection.
	 *
	 * Accepts:
	 * - npm specs: `pkg`, `pkg@1.2.3`, `@scope/pkg`, `pkg[features]`
	 * - namespaced git shorthand: `github:user/repo[#ref]`, `gitlab:`, `bitbucket:`,
	 *   `codeberg:`, `sourcehut:`/`srht:`
	 * - full git URLs: `https://github.com/user/repo`, `git@github.com:user/repo`,
	 *   `ssh://…`, `git+https://…`
	 *
	 * For git specs the package name is not knowable from the spec, so the
	 * installer diffs `plugins/package.json` `dependencies` before and after
	 * to find the newly added key.
	 *
	 * @param specString - Package specifier with optional features: "pkg", "pkg[feat]", "pkg[*]", "pkg[]"
	 * @param options - Install options
	 * @returns Installed plugin metadata
	 */
	async install(specString: string, options: InstallOptions = {}): Promise<InstalledPlugin> {
		const spec = parsePluginSpec(specString);
		const gitSource = parseGitUrl(spec.packageName);
		if (gitSource) {
			validateGitSpec(spec.packageName);
		} else {
			validatePackageName(spec.packageName);
		}

		await this.#ensurePackageJson();

		if (options.dryRun) {
			return {
				name: spec.packageName,
				version: "0.0.0-dryrun",
				path: "",
				manifest: { version: "0.0.0-dryrun" },
				enabledFeatures: spec.features === "*" ? null : (spec.features as string[] | null),
				enabled: true,
			};
		}
		const pkgJsonPath = getPluginsPackageJson();
		const packageJsonBefore = await Bun.file(pkgJsonPath).text();
		// Snapshot bun's lockfile so the rollback path can restore the pin. Every
		// step below — `bun install`, `bun update`, feature/extension validation,
		// runtime-config save — must either complete entirely or leave the
		// lockfile pointing at its pre-install state. Absent before install means
		// "remove on rollback".
		const bunLockPath = path.join(getPluginsDir(), "bun.lock");
		let bunLockBefore: string | null;
		try {
			bunLockBefore = await Bun.file(bunLockPath).text();
		} catch (err) {
			if (!isEnoent(err)) throw err;
			bunLockBefore = null;
		}
		const depsBefore = await this.#readDeps(pkgJsonPath);
		const packageInstallSpec = gitSource ? gitInstallSpec(spec.packageName, gitSource) : spec.packageName;
		const existingActualName = gitSource
			? findGitPackageName(gitSource, depsBefore)
			: extractPackageName(spec.packageName);
		const packageSnapshot = await this.#snapshotInstalledPackage(existingActualName);

		// `actualName` is hoisted so the rollback handler can clean up the right
		// node_modules entry even if a step between `bun install` and the final
		// validation throws.
		let actualName: string | undefined;
		try {
			// Bun treats a dependency replacement from `repo#old-ref` to the same
			// package at `repo`/`repo#new-ref` as a self-edge and bails with
			// DependencyLoop. Remove only the stale manifest edge; rollback restores
			// the original package.json and node_modules snapshot on failure.
			if (gitSource && existingActualName) {
				const installedSource = parseGitUrl(depsBefore[existingActualName] ?? "");
				if (installedSource && installedSource.ref !== gitSource.ref) {
					await this.#removeDependencyEntries(pkgJsonPath, [existingActualName]);
				}
			}
			// `bun install` appends a manifest edge rather than replacing it, so
			// reinstalling over a stale, malformed, or duplicated entry leaves bad
			// keys and the next install dies with DependencyLoop. Prune the edges
			// first; rollback restores the original package.json on failure, and
			// the parse/rewrite also collapses any pre-existing duplicates (#12296).
			if (!gitSource) {
				const npmName = extractPackageName(spec.packageName);
				const staleNames: string[] = [];
				for (const name in depsBefore) {
					if (extractPackageName(name) === npmName) {
						staleNames.push(name);
					}
				}
				if (staleNames.length > 0) {
					await this.#removeDependencyEntries(pkgJsonPath, staleNames);
				}
			}

			// Step 1: write the spec into plugins/package.json + node_modules.
			// npm specs resolve through bun's manifest (packument) cache, which honors
			// the registry's Cache-Control TTL and so keeps serving a stale version
			// after a new one is published — an uninstall/reinstall or an explicit
			// `pkg@newVersion` then resolves the old version or fails outright (#11634).
			// `--no-cache` re-fetches the manifest while leaving the tarball cache
			// intact. Git specs don't use the manifest cache; their cache staleness is
			// handled by refreshBunGitCache + `bun update` below.
			const installArgs = [
				"bun",
				"install",
				...(gitSource ? [] : ["--no-cache"]),
				...(options.force ? ["--force"] : []),
				packageInstallSpec,
			];
			const installProc = Bun.spawn(installArgs, {
				cwd: getPluginsDir(),
				stdin: "ignore",
				stdout: "pipe",
				stderr: "pipe",
				windowsHide: true,
			});
			// Drain stdout+stderr concurrently with proc.exited. Awaiting exited
			// before reading either pipe risks a >64 KiB OS-pipe-buffer deadlock
			// once bun install prints enough progress; even where Bun currently
			// buffers eagerly, doing this leaks unbounded memory.
			const [installExit, , installStderr] = await Promise.all([
				installProc.exited,
				new Response(installProc.stdout).text(),
				new Response(installProc.stderr).text(),
			]);
			if (installExit !== 0) {
				throw new Error(`bun install failed: ${installStderr}`);
			}
			// Resolve actual package name. npm specs encode the name (strip version);
			// git specs do not, so diff plugins/package.json deps to find the new entry.
			if (gitSource) {
				const depsAfter = await this.#readDeps(pkgJsonPath);
				let resolved: string | undefined;
				for (const key of Object.keys(depsAfter)) {
					if (!(key in depsBefore)) {
						resolved = key;
						break;
					}
				}
				// Fallback: a force-reinstall of an already-present git plugin will not
				// add a new key, just rewrite the existing one to the new spec value.
				// Match by repository identity, not by ref, so failed upgrades from
				// one ref to another still resolve to the original package name.
				if (!resolved) {
					resolved = findGitPackageName(gitSource, depsAfter);
				}
				if (!resolved) {
					throw new Error(
						`Installed ${spec.packageName} but could not determine package name from plugins/package.json`,
					);
				}
				actualName = resolved;
			} else {
				actualName = extractPackageName(spec.packageName);
			}

			// Step 2: refresh the git lockfile pin when re-installing an existing
			// git plugin. `bun install <spec>` is a no-op when the spec matches the
			// lockfile entry, while `bun update <name>` resolves through Bun's bare
			// clone cache. Fetch the matching cache clone first so a stale cached
			// ref cannot silently preserve the old pin (#3063, #5401). First-time
			// installs skip this because the initial `bun install` populated the
			// cache from the remote. Rollback is handled by the outer catch.
			if (gitSource && existingActualName) {
				await refreshBunGitCache(gitSource, getPluginsDir());
				const updateProc = Bun.spawn(["bun", "update", actualName], {
					cwd: getPluginsDir(),
					stdin: "ignore",
					stdout: "pipe",
					stderr: "pipe",
					windowsHide: true,
				});
				// Same drain-concurrent-with-exit pattern as the bun install above.
				const [updateExit, , updateStderr] = await Promise.all([
					updateProc.exited,
					new Response(updateProc.stdout).text(),
					new Response(updateProc.stderr).text(),
				]);
				if (updateExit !== 0) {
					throw new Error(`bun update ${actualName} failed: ${updateStderr}`);
				}
			}

			const pkgPath = path.join(getPluginsNodeModules(), actualName, "package.json");
			let pkg: { name: string; version: string; omp?: PluginManifest; pi?: PluginManifest };
			try {
				pkg = await Bun.file(pkgPath).json();
			} catch (err) {
				if (isEnoent(err)) {
					throw new Error(`Package installed but package.json not found at ${pkgPath}`);
				}
				throw err;
			}
			const manifest: PluginManifest = pkg.omp || pkg.pi || { version: pkg.version };
			manifest.version = pkg.version;

			// Resolve enabled features
			let enabledFeatures: string[] | null = null;
			if (spec.features === "*") {
				// All features
				enabledFeatures = manifest.features ? Object.keys(manifest.features) : null;
			} else if (Array.isArray(spec.features)) {
				if (spec.features.length > 0) {
					// Validate requested features exist
					if (manifest.features) {
						for (const feat of spec.features) {
							if (!(feat in manifest.features)) {
								throw new Error(
									`Unknown feature "${feat}" in ${actualName}. Available: ${Object.keys(manifest.features).join(", ")}`,
								);
							}
						}
					}
					enabledFeatures = spec.features;
				} else {
					// Empty array = no optional features
					enabledFeatures = [];
				}
			}
			// null = use defaults

			const installedPlugin: InstalledPlugin = {
				name: pkg.name,
				version: pkg.version,
				path: path.join(getPluginsNodeModules(), actualName),
				manifest,
				enabledFeatures,
				enabled: true,
			};

			await this.#validateInstalledExtensions(installedPlugin);

			// Update runtime config
			await this.#mutateConfig(config => {
				config.plugins[pkg.name] = {
					version: pkg.version,
					enabledFeatures,
					enabled: true,
				};
			}, "restart-required");

			return installedPlugin;
		} catch (err) {
			try {
				await this.#rollbackFailedInstall(
					actualName ?? existingActualName,
					packageJsonBefore,
					bunLockBefore,
					packageSnapshot,
				);
			} catch (rollbackErr) {
				const message = err instanceof Error ? err.message : String(err);
				const rollbackMessage = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
				throw new Error(`${message}\nRollback failed: ${rollbackMessage}`);
			}
			throw err;
		} finally {
			await this.#cleanupSnapshot(packageSnapshot);
		}
	}

	/**
	 * Uninstall a plugin.
	 */
	async uninstall(name: string): Promise<void> {
		validatePackageName(name);
		await this.#ensurePackageJson();

		const proc = Bun.spawn(["bun", "uninstall", name], {
			cwd: getPluginsDir(),
			stdin: "ignore",
			stdout: "pipe",
			stderr: "pipe",
			windowsHide: true,
		});

		// Drain both pipes concurrently with proc.exited to avoid a pipe-buffer
		// deadlock if bun uninstall floods stdout/stderr.
		const [exitCode] = await Promise.all([
			proc.exited,
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
		]);
		if (exitCode !== 0) {
			throw new Error(`npm uninstall failed for ${name}`);
		}

		// Linked plugins have no package.json dependency, so Bun has no entry to
		// remove. Clean the runtime path explicitly after Bun updates its lockfile.
		await fs.promises.rm(path.join(getPluginsNodeModules(), name), { recursive: true, force: true });

		// Remove from runtime config
		await this.#mutateConfig(config => {
			delete config.plugins[name];
			delete config.settings[name];
		}, "restart-required");
	}

	/**
	 * Resolve one installed plugin, including a marketplace runtime package that
	 * is intentionally omitted from {@link list}.
	 *
	 * Resolution order mirrors {@link getEnabledPlugins}: an explicit trusted
	 * `options.path` (marketplace registry entry) wins; otherwise the active
	 * enabled project plugin root shadows the user root — so inside a project
	 * where the same package name exists in both scopes, config reads and writes
	 * act on the package copy active at runtime.
	 */
	async getPlugin(name: string, options: { path?: string } = {}): Promise<InstalledPlugin | undefined> {
		const [config, projectOverrides] = await Promise.all([this.#ensureConfigLoaded(), this.#loadProjectOverrides()]);
		if (options.path) {
			return this.#resolvePlugin(name, options.path, config, projectOverrides);
		}
		const projectPlugin = await this.#resolvePluginAtActiveProjectRoot(name, projectOverrides);
		const deps = await this.#readDeps(getPluginsPackageJson());
		const userPlugin = this.#collectInstalledNames(deps, config).has(name)
			? await this.#resolvePlugin(name, path.join(getPluginsNodeModules(), name), config, projectOverrides)
			: undefined;
		if (projectPlugin?.enabled || !userPlugin) {
			return projectPlugin;
		}
		return userPlugin;
	}

	/**
	 * Resolve a plugin from the active project plugin root
	 * (`<anchor>/.omp/plugins`). Project npm/link/marketplace installs all record
	 * their runtime state and `node_modules` symlink there — invisible to the
	 * user-root lookup — so this reads the project's own `package.json`
	 * dependencies plus `omp-plugins.lock.json`, and resolves the package from
	 * the project `node_modules`. Returns undefined when there is no active
	 * project, when it coincides with the user root, or when the package is not
	 * installed there.
	 */
	async #resolvePluginAtActiveProjectRoot(
		name: string,
		projectOverrides: ProjectPluginOverrides,
	): Promise<InstalledPlugin | undefined> {
		const registryPath = await resolveActiveProjectRegistryPath(this.#cwd);
		if (!registryPath) return undefined;
		const projectRoot = path.dirname(registryPath);
		if (path.resolve(projectRoot) === path.resolve(getPluginsDir())) return undefined;
		const [projectDeps, projectConfig] = await Promise.all([
			this.#readDeps(path.join(projectRoot, "package.json")),
			this.#readRuntimeConfigAt(path.join(projectRoot, "omp-plugins.lock.json")),
		]);
		if (!this.#collectInstalledNames(projectDeps, projectConfig).has(name)) return undefined;
		return this.#resolvePlugin(name, path.join(projectRoot, "node_modules", name), projectConfig, projectOverrides);
	}

	/**
	 * List all installed plugins.
	 */
	async list(): Promise<InstalledPlugin[]> {
		const pkgJsonPath = getPluginsPackageJson();
		let deps: Record<string, string> = {};
		try {
			const pkg: { dependencies?: Record<string, string> } = await Bun.file(pkgJsonPath).json();
			deps = pkg.dependencies ?? {};
		} catch (err) {
			if (!isEnoent(err)) throw err;
		}

		const [projectOverrides, config, marketplaceRuntimeRealpaths] = await Promise.all([
			this.#loadProjectOverrides(),
			this.#ensureConfigLoaded(),
			this.#collectMarketplaceRuntimePackageRealpaths(),
		]);
		const plugins: InstalledPlugin[] = [];
		const installedNames = this.#collectInstalledNames(deps, config);
		for (const name of installedNames) {
			const pluginPath = path.join(getPluginsNodeModules(), name);
			if (await this.#isMarketplaceRuntimeLink(name, deps, marketplaceRuntimeRealpaths, pluginPath)) continue;
			const plugin = await this.#resolvePlugin(name, pluginPath, config, projectOverrides);
			if (plugin) {
				plugins.push(plugin);
			}
		}

		return plugins;
	}

	/**
	 * Link a local plugin for development.
	 */
	async link(localPath: string): Promise<InstalledPlugin> {
		const absolutePath = path.resolve(this.#cwd, localPath);

		const pkgFilePath = path.join(absolutePath, "package.json");
		let pkg: { name?: string; version: string; omp?: PluginManifest; pi?: PluginManifest };
		try {
			pkg = await Bun.file(pkgFilePath).json();
		} catch (err) {
			if (isEnoent(err)) throw new Error(`package.json not found at ${absolutePath}`);
			throw err;
		}
		if (!pkg.name) {
			throw new Error("package.json must have a name field");
		}
		validatePackageName(pkg.name);

		await this.#ensurePluginsDir();

		const linkPath = path.join(getPluginsNodeModules(), pkg.name);

		// Handle scoped packages
		if (pkg.name.startsWith("@")) {
			const scopeDir = path.join(getPluginsNodeModules(), pkg.name.split("/")[0]);
			await fs.promises.mkdir(scopeDir, { recursive: true });
		}

		// Whatever is there — a stale link, or a real directory from a git install.
		await fs.promises.rm(linkPath, { recursive: true, force: true });

		// A junction needs no privilege on Windows; a plain directory symlink
		// would EPERM outside developer mode (same treatment as the marketplace
		// link in marketplace/manager.ts).
		await fs.promises.symlink(absolutePath, linkPath, process.platform === "win32" ? "junction" : "dir");

		const manifest: PluginManifest = pkg.omp || pkg.pi || { version: pkg.version };
		manifest.version = pkg.version;

		// Captured as a const: the `if (!pkg.name) throw` above narrows `pkg.name`
		// to string, but that narrowing does not survive into a callback for a
		// `let`, where the compiler must assume it may have been reassigned.
		const pluginName = pkg.name;

		// Add to runtime config
		await this.#mutateConfig(config => {
			config.plugins[pluginName] = {
				version: pkg.version,
				enabledFeatures: null,
				enabled: true,
			};
		}, "restart-required");

		return {
			name: pkg.name,
			version: pkg.version,
			path: absolutePath,
			manifest,
			enabledFeatures: null,
			enabled: true,
		};
	}

	// ==========================================================================
	// Enable / Disable
	// ==========================================================================

	/**
	 * Enable or disable a plugin globally.
	 */
	async setEnabled(name: string, enabled: boolean): Promise<ChangeResult> {
		return await this.#mutateConfig(config => {
			if (!config.plugins[name]) {
				throw new Error(`Plugin ${name} not found in runtime config`);
			}
			config.plugins[name].enabled = enabled;
		}, "restart-required");
	}

	// ==========================================================================
	// Features
	// ==========================================================================

	/**
	 * Get enabled features for a plugin.
	 */
	async getEnabledFeatures(name: string): Promise<string[] | null> {
		const config = await this.#ensureConfigLoaded();
		return config.plugins[name]?.enabledFeatures ?? null;
	}

	/**
	 * Set enabled features for a plugin.
	 */
	async setEnabledFeatures(name: string, features: string[] | null): Promise<ChangeResult> {
		// Read the manifest BEFORE taking the lock. Validating a feature name is
		// read-only, so a TOCTOU race here is harmless — whereas holding an OS
		// lock across manifest I/O would make every other process queue behind
		// this one for the duration of a disk read.
		let manifestFeatures: Record<string, unknown> | undefined;
		if (features && features.length > 0) {
			const plugin = await this.getPlugin(name, { path: path.join(getPluginsNodeModules(), name) });
			manifestFeatures = plugin?.manifest.features;
		}

		return await this.#mutateConfig(config => {
			// Not-found still wins over an unknown feature, as it did before the
			// lock was introduced: the caller's mistake is the same either way,
			// but "no such plugin" is the more useful message.
			if (!config.plugins[name]) {
				throw new Error(`Plugin ${name} not found in runtime config`);
			}

			if (features && features.length > 0 && manifestFeatures) {
				for (const feat of features) {
					if (!(feat in manifestFeatures)) {
						throw new Error(
							`Unknown feature "${feat}" in ${name}. Available: ${Object.keys(manifestFeatures).join(", ")}`,
						);
					}
				}
			}

			config.plugins[name].enabledFeatures = features;
		}, "restart-required");
	}

	// ==========================================================================
	// Settings
	// ==========================================================================

	/**
	 * Get all settings for a plugin.
	 */
	async getPluginSettings(name: string): Promise<Record<string, unknown>> {
		const config = await this.#ensureConfigLoaded();
		const global = config.settings[name] || {};
		const projectOverrides = await this.#loadProjectOverrides();
		const project = projectOverrides.settings?.[name] || {};

		// Project settings override global
		return { ...global, ...project };
	}

	/**
	 * Set a plugin setting value.
	 */
	async setPluginSetting(name: string, key: string, value: unknown): Promise<ChangeResult> {
		return await this.#mutateConfig(config => {
			if (!config.settings[name]) {
				config.settings[name] = {};
			}
			config.settings[name][key] = value;
		}, "restart-required");
	}

	/**
	 * Delete a plugin setting.
	 */
	async deletePluginSetting(name: string, key: string): Promise<ChangeResult> {
		return await this.#mutateConfig(config => {
			// No `if (config.settings[name])` early return. Deleting a key that
			// was never there is a no-op, and the diff reports `changed: false`
			// for it. The old guard skipped the write entirely, which left
			// "nothing to delete" indistinguishable from "deleted" — and callers
			// now branch on that difference.
			if (config.settings[name]) {
				delete config.settings[name][key];
			}
		}, "restart-required");
	}

	// ==========================================================================
	// Doctor
	// ==========================================================================

	/**
	 * Run health checks on the plugin system.
	 */
	async doctor(options: DoctorOptions = {}): Promise<CheckOutcome[]> {
		const checks: CheckOutcome[] = [];

		// Check 1: Plugins directory exists
		const pluginsDir = getPluginsDir();
		const pluginsDirExists = fs.existsSync(pluginsDir);
		checks.push({
			name: "plugins_directory",
			status: pluginsDirExists ? "ok" : "warning",
			message: pluginsDirExists ? `Found at ${pluginsDir}` : "Not created yet",
		});

		// Check 2: package.json exists
		const pkgJsonPath = getPluginsPackageJson();
		let pkg: { dependencies?: Record<string, string> };
		let hasPkgJson = true;
		try {
			pkg = await Bun.file(pkgJsonPath).json();
		} catch (err) {
			if (isEnoent(err)) {
				hasPkgJson = false;
				pkg = {};
			} else {
				throw err;
			}
		}
		checks.push({
			name: "package_manifest",
			status: hasPkgJson ? "ok" : "warning",
			message: hasPkgJson ? "Found" : "Not created yet",
		});

		// Check 3: node_modules exists
		const nodeModulesPath = getPluginsNodeModules();
		const hasNodeModules = fs.existsSync(nodeModulesPath);
		checks.push({
			name: "node_modules",
			status: hasNodeModules ? "ok" : hasPkgJson ? "error" : "warning",
			message: hasNodeModules ? "Found" : "Missing (run npm install in plugins dir)",
		});

		const deps = pkg.dependencies || {};
		const [config, marketplaceRuntimeRealpaths] = await Promise.all([
			this.#ensureConfigLoaded(),
			this.#collectMarketplaceRuntimePackageRealpaths(),
		]);
		const installedNames = this.#collectInstalledNames(deps, config);

		for (const name of installedNames) {
			const pluginPath = path.join(nodeModulesPath, name);
			if (await this.#isMarketplaceRuntimeLink(name, deps, marketplaceRuntimeRealpaths, pluginPath)) continue;
			const pluginPkgPath = path.join(pluginPath, "package.json");
			const fromDependencies = name in deps;

			let pluginPkg: { version: string; description?: string; omp?: PluginManifest; pi?: PluginManifest };
			try {
				pluginPkg = await Bun.file(pluginPkgPath).json();
			} catch (err) {
				if (isEnoent(err)) {
					if (!fs.existsSync(pluginPath)) {
						if (fromDependencies) {
							const fixed = options.fix ? await this.#installPluginDependencies() : false;
							checks.push({
								name: `plugin:${name}`,
								status: "error",
								message: "Missing from node_modules",
								fixed,
							});
						} else {
							// Restore first, delete second. Putting the plugin back is what
							// the user wants from `--fix`; deleting their config entry is
							// only the honest fallback for an entry whose bytes cannot be
							// proven — a branch or tag re-fetched now is a different commit,
							// and silently swapping it in would be worse than removing it.
							const restore = options.fix ? await this.#restoreOrphanedPlugin(name) : null;
							if (restore?.fixed) {
								checks.push({
									name: `orphan:${name}`,
									status: "ok",
									message: "Plugin in config but not installed — restored from its pinned source",
									fixed: true,
									changedOnDisk: true,
								});
							} else {
								const repair = options.fix ? await this.#removeOrphanedConfig(name) : null;
								checks.push({
									name: `orphan:${name}`,
									status: "warning",
									message: restore?.reason
										? `Plugin in config but not installed — not restored: ${restore.reason}`
										: "Plugin in config but not installed",
									fixed: repair?.fixed ?? false,
									changedOnDisk: repair?.change.changed ?? false,
								});
							}
						}
					} else {
						checks.push({
							name: `plugin:${name}`,
							status: "error",
							message: "Missing package.json",
						});
					}
					continue;
				}
				throw err;
			}
			// Config-only entries are live local links whose source version may
			// change without relinking; drift only applies to managed dependencies.
			// Repair BEFORE the manifest validation below so those checks see the
			// freshly installed package. The repair re-extracts only this package
			// (see #reconcileVersionDrift), so sibling plugins already validated in
			// this loop stay valid.
			const recordedVersion = config.plugins[name]?.version;
			if (fromDependencies && recordedVersion && pluginPkg.version && recordedVersion !== pluginPkg.version) {
				const fixed = options.fix ? await this.#reconcileVersionDrift(name, recordedVersion) : false;
				checks.push({
					name: `plugin:${name}:version`,
					status: fixed ? "ok" : "error",
					message: fixed
						? `Reconciled version drift: node_modules now matches lock v${recordedVersion}`
						: `Version drift: lock records v${recordedVersion} but node_modules has v${pluginPkg.version} (run \`omp plugin install ${name} --force\`)`,
					fixed,
				});
				if (fixed) {
					try {
						pluginPkg = await Bun.file(pluginPkgPath).json();
					} catch {
						// Keep the pre-repair metadata if the refreshed manifest is unreadable.
					}
				}
			}

			const hasManifest = !!(pluginPkg.omp || pluginPkg.pi);
			const manifest: PluginManifest | undefined = pluginPkg.omp || pluginPkg.pi;

			checks.push({
				name: `plugin:${name}`,
				status: hasManifest ? "ok" : "warning",
				message: hasManifest
					? `v${pluginPkg.version}${pluginPkg.description ? ` - ${pluginPkg.description}` : ""}`
					: `v${pluginPkg.version} - No omp/pi manifest (not an omp plugin)`,
			});

			// Check tools path exists if specified
			if (manifest?.tools) {
				const toolsPath = path.join(pluginPath, manifest.tools);
				if (!fs.existsSync(toolsPath)) {
					checks.push({
						name: `plugin:${name}:tools`,
						status: "error",
						message: `Tools entry "${manifest.tools}" not found`,
					});
				}
			}

			// Check hooks path exists if specified
			if (manifest?.hooks) {
				const hooksPath = path.join(pluginPath, manifest.hooks);
				if (!fs.existsSync(hooksPath)) {
					checks.push({
						name: `plugin:${name}:hooks`,
						status: "error",
						message: `Hooks entry "${manifest.hooks}" not found`,
					});
				}
			}

			// Check extension entry paths exist if specified
			if (manifest?.extensions) {
				for (const extensionPath of manifest.extensions) {
					const resolvedExtensionPath = path.join(pluginPath, extensionPath);
					if (!fs.existsSync(resolvedExtensionPath)) {
						checks.push({
							name: `plugin:${name}:extension:${extensionPath}`,
							status: "error",
							message: `Extension entry "${extensionPath}" not found`,
						});
					}
				}
			}

			// Check enabled features exist in manifest
			const runtimeState = config.plugins[name];
			if (runtimeState?.enabledFeatures && manifest?.features) {
				for (const feat of runtimeState.enabledFeatures) {
					if (!(feat in manifest.features)) {
						const repair = options.fix ? await this.#removeInvalidFeature(name, feat) : null;
						checks.push({
							name: `plugin:${name}:feature:${feat}`,
							status: "warning",
							message: `Enabled feature "${feat}" not in manifest`,
							fixed: repair?.fixed ?? false,
							changedOnDisk: repair?.change.changed ?? false,
						});
					}
				}
			}
		}

		// Extension-contributed checks join the built-in ones; they never replace
		// them. A doctor whose own findings an extension could suppress would stop
		// being able to report a fault in the very extension that supplied it,
		// which is the one case where a plugin is most likely to be at fault.
		//
		// Each is run with a timeout rather than awaited bare: a diagnostic is
		// third-party code on a path that must still print the built-in findings.
		// An extension that hangs here would otherwise take `omp plugin doctor`
		// down with it — the check meant to report a broken extension becoming the
		// outage.
		for (const { source, diagnostic } of collectDiagnostics()) {
			// The timer is CLEARED, not merely raced. `Promise.race` settles as soon
			// as `run()` does, but an uncleared timer keeps the event loop alive for
			// the rest of its window: doctor would print every finding and then stand
			// there for five seconds before the process could exit. Clearing also
			// discards the pending `reject`, so the fast path cannot fire a rejection
			// into a race that has already been decided.
			const { promise: expiry, reject } = Promise.withResolvers<never>();
			const timer = setTimeout(() => reject(new Error("timed out")), DIAGNOSTIC_TIMEOUT_MS);
			try {
				const outcome = await Promise.race([Promise.resolve(diagnostic.run()), expiry]);
				checks.push({
					name: `extension:${diagnostic.id}`,
					...outcome,
					message: `[${source}] ${outcome.message}`,
				});
			} catch (err) {
				checks.push({
					name: `extension:${diagnostic.id}`,
					// An error is not a pass. Reported as an error naming the reason,
					// because a check that silently vanished would leave the user
					// believing an unverified surface was verified.
					status: "error",
					message: `[${source}] check failed: ${err instanceof Error ? err.message : String(err)}`,
				});
			} finally {
				clearTimeout(timer);
			}
		}

		// The patch ledger. `unavailable` is a real answer here — the
		// premise (a `patches/` directory to compare against) is missing on any
		// install that is not this repo — and it must not be folded into the
		// error/warning/ok counts, or the summary would claim full coverage of
		// checks that never ran.
		checks.push(await checkPatchLedger(this.#cwd));

		return checks;
	}

	async #installPluginDependencies(): Promise<boolean> {
		try {
			const proc = Bun.spawn(["bun", "install"], {
				cwd: getPluginsDir(),
				stdin: "ignore",
				stdout: "pipe",
				stderr: "pipe",
				windowsHide: true,
			});
			// Drain pipes concurrently with proc.exited; otherwise a chatty
			// bun install can block on a full OS pipe buffer.
			const [exit] = await Promise.all([
				proc.exited,
				new Response(proc.stdout).text(),
				new Response(proc.stderr).text(),
			]);
			return exit === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Reconcile lock-vs-disk drift by re-extracting only the drifted package,
	 * then confirming node_modules matches the lock-recorded version. Removing
	 * the package first guarantees a real reinstall — a stale or already-satisfied
	 * range cannot no-op — while leaving sibling plugins untouched, unlike a
	 * global `bun install --force`, which re-extracts every dependency.
	 */
	async #reconcileVersionDrift(name: string, expected: string): Promise<boolean> {
		const packageJsonBefore = await Bun.file(getPluginsPackageJson()).text();
		const bunLockPath = path.join(getPluginsDir(), "bun.lock");
		let bunLockBefore: string | null;
		try {
			bunLockBefore = await Bun.file(bunLockPath).text();
		} catch (err) {
			if (!isEnoent(err)) throw err;
			bunLockBefore = null;
		}
		const snapshot = await this.#snapshotInstalledPackage(name);
		let fixed = false;
		try {
			await fs.promises.rm(path.join(getPluginsNodeModules(), name), { recursive: true, force: true });
			if (!(await this.#installPluginDependencies())) return false;
			try {
				const pkg: { version?: string } = await Bun.file(
					path.join(getPluginsNodeModules(), name, "package.json"),
				).json();
				fixed = pkg.version === expected;
				return fixed;
			} catch {
				return false;
			}
		} finally {
			try {
				if (!fixed) {
					await this.#rollbackFailedInstall(name, packageJsonBefore, bunLockBefore, snapshot);
				}
			} finally {
				await this.#cleanupSnapshot(snapshot);
			}
		}
	}

	/**
	 * Drop a feature the manifest no longer declares.
	 *
	 * `fixed` keeps the boolean this always returned — "did we run the repair".
	 * `change` is new and says whether the lockfile actually moved, which is a
	 * different question: a feature already absent from the list is repaired
	 * successfully and writes nothing.
	 */
	async #removeInvalidFeature(name: string, feat: string): Promise<{ fixed: boolean; change: ChangeResult }> {
		if (!(await this.#ensureConfigLoaded()).plugins[name]?.enabledFeatures) {
			return { fixed: false, change: { changed: false, application: "restart-required" } };
		}
		const change = await this.#mutateConfig(config => {
			const state = config.plugins[name];
			if (state?.enabledFeatures) {
				state.enabledFeatures = state.enabledFeatures.filter(f => f !== feat);
			}
		}, "restart-required");
		return { fixed: true, change };
	}

	/**
	 * Put back a plugin whose installed copy went missing, when its recorded source
	 * can prove what would come back.
	 *
	 * Returns `fixed: false` with a reason rather than throwing: this runs inside a
	 * doctor sweep over every configured plugin, and one entry that cannot be
	 * restored is a finding to report, not a sweep to abort. The caller falls back
	 * to {@link #removeOrphanedConfig}, because removing the config entry is still
	 * correct when the bytes cannot be proven.
	 */
	async #restoreOrphanedPlugin(name: string): Promise<{ fixed: boolean; reason: string }> {
		// The installed registry is keyed by `name@marketplace`, but a doctor sweep
		// only has the bare package name out of the config. The marketplace half is
		// recoverable from the key; nothing else about the entry is, which is why
		// the reinstall has to go back through the catalog rather than be assembled
		// from the registry alone.
		const registry = await readInstalledPluginsRegistry(getInstalledPluginsRegistryPath());
		const id = Object.keys(registry.plugins).find(key => key === name || key.startsWith(`${name}@`));
		if (!id) return { fixed: false, reason: "no installed-registry entry records which marketplace it came from" };

		const parsed = parsePluginId(id);
		if (!parsed) return { fixed: false, reason: `installed-registry id "${id}" is not a name@marketplace pair` };

		const scope = registry.plugins[id]?.[0]?.scope ?? "user";
		try {
			const marketplace = new MarketplaceManager({
				marketplacesRegistryPath: getMarketplacesRegistryPath(),
				installedRegistryPath: getInstalledPluginsRegistryPath(),
				projectInstalledRegistryPath: await resolveOrDefaultProjectRegistryPath(this.#cwd),
				marketplacesCacheDir: getMarketplacesCacheDir(),
				pluginsCacheDir: getPluginsCacheDir(),
			});
			await marketplace.restorePlugin(parsed.name, parsed.marketplace, { scope });
			return { fixed: true, reason: "" };
		} catch (err) {
			// The pin refusal arrives here like any other failure, and it is the one
			// that matters: it is the gate refusing, so its message is the finding.
			return { fixed: false, reason: err instanceof Error ? err.message : String(err) };
		}
	}

	/**
	 * Drop config for a plugin that is no longer installed. `fixed` and `change`
	 * mean the same two things as in {@link #removeInvalidFeature}.
	 */
	async #removeOrphanedConfig(name: string): Promise<{ fixed: boolean; change: ChangeResult }> {
		const change = await this.#mutateConfig(config => {
			delete config.plugins[name];
			delete config.settings[name];
		}, "restart-required");
		return { fixed: true, change };
	}
}

// =============================================================================
// Setting Validation
// =============================================================================

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validate a setting value against its schema.
 */
export function validateSetting(value: unknown, schema: PluginSettingSchema): ValidationResult {
	switch (schema.type) {
		case "string":
			if (typeof value !== "string") {
				return { valid: false, error: "Expected string" };
			}
			break;

		case "number":
			if (typeof value !== "number" || Number.isNaN(value)) {
				return { valid: false, error: "Expected number" };
			}
			if (schema.min !== undefined && value < schema.min) {
				return { valid: false, error: `Must be >= ${schema.min}` };
			}
			if (schema.max !== undefined && value > schema.max) {
				return { valid: false, error: `Must be <= ${schema.max}` };
			}
			break;

		case "boolean":
			if (typeof value !== "boolean") {
				return { valid: false, error: "Expected boolean" };
			}
			break;

		case "enum":
			if (!schema.values.includes(String(value))) {
				return { valid: false, error: `Must be one of: ${schema.values.join(", ")}` };
			}
			break;
	}

	return { valid: true };
}

/**
 * Parse a string value according to a setting schema's type.
 */
export function parseSettingValue(valueStr: string, schema: PluginSettingSchema): unknown {
	switch (schema.type) {
		case "number":
			return Number(valueStr);

		case "boolean":
			return valueStr === "true" || valueStr === "yes" || valueStr === "1";
		default:
			return valueStr;
	}
}
