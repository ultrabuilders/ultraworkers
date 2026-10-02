import * as fs from "node:fs";
import { createRequire, isBuiltin } from "node:module";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as vm from "node:vm";
import { collectModuleSourceSpecifiers, stripTypeScriptSyntax } from "./rewrite-imports";

interface LocalModuleEntry {
	version: number;
	identifier: string;
	module: vm.SourceTextModule;
	/** Memoized link+evaluate of this module as a graph root; set lazily by `#loadLocalModule`. */
	loaded?: Promise<void>;
}

export type LocalImportResolution = { mode: "local"; value: unknown } | { mode: "external"; target: string };

/**
 * Decides one import, before anything is loaded or executed.
 *
 * ## Why the policy sits here and not on the rewritten callee
 *
 * `rewriteDynamicImports` already takes a `callee` parameter, which looks like the
 * seam to inject an import policy. It is not: that parameter is on the *code
 * rewriting* path, and the fallback inside `DYNAMIC_IMPORT_CALLEE` is a separate,
 * module-private constant used by a different function. Wiring one does not change
 * the other, so a policy passed there would look installed while the fallback —
 * the branch that actually runs in a foreign realm — kept its old behaviour.
 *
 * This sits at `#resolveFromBase` instead because that is the **single** decision
 * point: `resolveForRun` (dynamic `import()` in worker code) and `resolveForModule`
 * (`import.meta.resolve`/`__omp_import_from__`) both funnel through it, before any
 * module is loaded and before the external `import()` is reached. One hook, so
 * there is no second path a policy would have to be added to later.
 *
 * ## The default is deliberately the current behaviour
 *
 * No policy installed ⇒ every specifier resolves exactly as it did before this
 * type existed. That is what keeps the fallback load-bearing: puppeteer-
 * serialized code runs in a realm with no worker globals, and a policy that
 * rejected unknown specifiers there would break `tab.evaluate`.
 */
export type LocalImportPolicy = (request: {
	/** The raw specifier as written in the source — not the resolved path. */
	specifier: string;
	/** Lexically normalized absolute path, or `undefined` for a bare/URL specifier. */
	resolvedPath: string | undefined;
	/** True when the specifier names a Node builtin, which needs no policy decision. */
	isBuiltin: boolean;
}) => LocalImportResolution | "allow" | "deny";

const LOCAL_MODULE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx", ".mts"]);

export class LocalModuleLoader {
	#context: vm.Context;
	#sessionTag: string;
	#moduleMtimes = new Map<string, number>();
	#moduleDeps = new Map<string, Set<string>>();
	#moduleParents = new Map<string, Set<string>>();
	#moduleVersions = new Map<string, number>();
	#moduleEntries = new Map<string, LocalModuleEntry>();
	#moduleBuilds = new Map<string, Promise<LocalModuleEntry>>();
	#externalModules = new Map<string, Promise<vm.Module>>();
	#requireCache = new Map<string, NodeJS.Require>();
	#modulePaths = new WeakMap<vm.Module, string>();
	#packageRoot: string | undefined;
	#linkChain: Promise<void> = Promise.resolve();
	#importPolicy: LocalImportPolicy | undefined;

	constructor(sessionId: string) {
		this.#context = vm.createContext(globalThis);
		this.#sessionTag = Bun.hash(sessionId).toString(16);
	}

	setPackageRoot(packageRoot: string | undefined): void {
		const normalized = packageRoot ? path.resolve(packageRoot) : undefined;
		if (normalized === this.#packageRoot) return;
		this.#packageRoot = normalized;
		this.#requireCache.clear();
	}

	/**
	 * Install the import policy consulted by every specifier this loader resolves.
	 *
	 * Passing `undefined` restores the default, which is to resolve everything as
	 * before this seam existed. Kept as a setter rather than a constructor argument
	 * because the loader is constructed by the runtime before a host has any say
	 * in the policy, and a policy installed later must not require a new session.
	 */
	setImportPolicy(policy: LocalImportPolicy | undefined): void {
		this.#importPolicy = policy;
	}

	async resolveForRun(baseDir: string, source: string): Promise<LocalImportResolution> {
		this.#refreshTrackedLocalModules();
		return await this.#resolveFromBase(baseDir, source);
	}

	async resolveForModule(moduleUrl: string, source: string, cwd: string): Promise<LocalImportResolution> {
		this.#refreshTrackedLocalModules();
		const modulePath = this.filenameForUrl(moduleUrl);
		const baseDir = modulePath ? path.dirname(modulePath) : cwd;
		return await this.#resolveFromBase(baseDir, source);
	}

	requireForFile(moduleUrlOrPath: string | undefined, cwd: string): NodeJS.Require {
		const basePath = this.filenameForUrl(moduleUrlOrPath) ?? path.join(cwd, "[eval]");
		let cached = this.#requireCache.get(basePath);
		if (!cached) {
			cached = buildRequire(basePath, this.#packageRoot);
			this.#requireCache.set(basePath, cached);
		}
		return cached;
	}

	filenameForUrl(moduleUrlOrPath: string | undefined): string | null {
		if (!moduleUrlOrPath) return null;
		if (moduleUrlOrPath.startsWith("file://")) return fileURLToPath(moduleUrlOrPath);
		return path.isAbsolute(moduleUrlOrPath) ? moduleUrlOrPath : null;
	}

	dirnameForUrl(moduleUrlOrPath: string | undefined, cwd: string): string {
		const filename = this.filenameForUrl(moduleUrlOrPath);
		return filename ? path.dirname(filename) : cwd;
	}

	async #resolveFromBase(baseDir: string, source: string): Promise<LocalImportResolution> {
		const resolved = resolveImportSpecifier(baseDir, source, this.#packageRoot);
		const policy = this.#importPolicy;
		if (policy) {
			// Consulted BEFORE either branch below, so a denial cannot be bypassed by
			// choosing a specifier shape that lands in the other one.
			const verdict = policy({
				specifier: source,
				resolvedPath: isLocalPathSpecifier(source) ? resolved : undefined,
				isBuiltin: isBuiltin(source),
			});
			if (verdict === "deny") {
				// Thrown rather than returned: a denied import must not look like a
				// module that failed to resolve, because the two get reported
				// differently and only one of them is a decision the host made.
				throw new Error(`Import of "${source}" was denied by the configured import policy.`);
			}
			// A resolution from the policy replaces the default entirely, so a host can
			// redirect a specifier (a virtual module, say) and not merely allow it.
			if (verdict !== "allow") return verdict;
		}
		if (isLocalPathSpecifier(source) && isManagedLocalModulePath(resolved)) {
			const module = await this.#loadLocalModule(resolved);
			return { mode: "local", value: module.namespace };
		}
		return { mode: "external", target: normalizeImportTarget(resolved) };
	}

	async #ensureLocalModule(modulePath: string): Promise<LocalModuleEntry> {
		const existing = this.#moduleEntries.get(modulePath);
		if (existing) return existing;
		const building = this.#moduleBuilds.get(modulePath);
		if (building) return await building;
		const buildPromise = this.#buildLocalModule(modulePath).finally(() => {
			if (this.#moduleBuilds.get(modulePath) === buildPromise) this.#moduleBuilds.delete(modulePath);
		});
		this.#moduleBuilds.set(modulePath, buildPromise);
		return await buildPromise;
	}

	// Construct (parse + register) a local module WITHOUT linking or evaluating it.
	// Linking and evaluation are driven once from the graph root in `#linkAndEvaluate`;
	// doing them per-module inside the recursive linker re-enters Bun's node:vm linker
	// mid-instantiation, which segfaults JSC (getImportedModule on a null record) whenever
	// the local graph contains an import cycle.
	async #buildLocalModule(modulePath: string): Promise<LocalModuleEntry> {
		const rawSource = fs.readFileSync(modulePath, "utf8");
		const stripped = stripTypeScriptSyntax(rawSource, {
			force: isTypeScriptModulePath(modulePath),
			loader: stripLoaderForPath(modulePath),
		});
		const moduleDir = path.dirname(modulePath);
		const localDeps = new Set<string>();
		for (const specifier of await collectModuleSourceSpecifiers(stripped)) {
			const resolved = resolveImportSpecifier(moduleDir, specifier, this.#packageRoot);
			if (isLocalPathSpecifier(specifier) && isManagedLocalModulePath(resolved)) {
				localDeps.add(resolved);
			}
		}
		this.#setModuleDependencies(modulePath, localDeps);
		this.#moduleMtimes.set(modulePath, fs.statSync(modulePath).mtimeMs);
		const version = this.#moduleVersions.get(modulePath) ?? 1;
		this.#moduleVersions.set(modulePath, version);
		const fileUrl = pathToFileURL(modulePath).href;
		const identifier = `${fileUrl}?omp-session=${this.#sessionTag}&v=${version}`;
		const wrappedSource = buildModuleSource(stripped, modulePath);
		const module = new vm.SourceTextModule(wrappedSource, {
			context: this.#context,
			identifier,
			initializeImportMeta: meta => {
				(meta as { url?: string; path?: string; dir?: string }).url = fileUrl;
				(meta as { url?: string; path?: string; dir?: string }).path = modulePath;
				(meta as { url?: string; path?: string; dir?: string }).dir = moduleDir;
			},
			importModuleDynamically: async specifier => {
				return await this.#resolveDynamicImport(modulePath, String(specifier));
			},
		});
		this.#modulePaths.set(module, modulePath);
		const entry: LocalModuleEntry = { version, identifier, module };
		this.#moduleEntries.set(modulePath, entry);
		return entry;
	}

	// Construct (if needed) then link+evaluate a local module as a graph root, returning
	// the evaluated module. Link and evaluate run exactly once over the whole reachable
	// graph; the static linker only constructs dependencies, letting node:vm instantiate
	// cyclic graphs in a single pass.
	async #loadLocalModule(modulePath: string): Promise<vm.SourceTextModule> {
		const entry = await this.#ensureLocalModule(modulePath);
		entry.loaded ??= this.#linkAndEvaluate(entry, modulePath);
		await entry.loaded;
		return entry.module;
	}

	async #linkAndEvaluate(entry: LocalModuleEntry, modulePath: string): Promise<void> {
		const { module } = entry;
		try {
			// Serialize the link phase across every graph root. Bun's node:vm linker
			// segfaults (getImportedModule on a null record) when two link passes
			// instantiate overlapping module instances concurrently — e.g.
			// Promise.all([import("./a"), import("./b")]) over a graph that shares
			// dependencies. Holding the lock for the whole module.link() (including its
			// async resolver callbacks) guarantees the linker is never re-entered
			// mid-instantiation. The lock is released before evaluate(), so a dynamic
			// import during evaluation can re-acquire it without deadlock.
			await this.#serializeLink(async () => {
				if (module.status === "unlinked") await module.link(this.#linkResolve);
			});
			if (module.status === "linked") await module.evaluate();
		} catch (error) {
			this.#invalidateFailedLoad(modulePath);
			throw error;
		}
		if (module.status === "errored") {
			this.#invalidateFailedLoad(modulePath);
			throw module.error;
		}
	}

	// Promise-chain mutex serializing node:vm link passes (see #linkAndEvaluate).
	// #linkChain is kept non-rejecting so a failed link never wedges the queue.
	#serializeLink<T>(run: () => Promise<T>): Promise<T> {
		const result = this.#linkChain.then(run);
		this.#linkChain = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	// Shared static-link resolver for `module.link()`. node:vm passes the referencing
	// module and reuses this one resolver for the entire graph, so the referrer path is
	// recovered from `#modulePaths`. Local dependencies are constructed but NOT linked or
	// evaluated here (the root drives that); externals are loaded eagerly — they carry no
	// imports and cannot participate in a cycle.
	#linkResolve = async (specifier: string, referencingModule: vm.Module): Promise<vm.Module> => {
		const referrerPath = this.#modulePaths.get(referencingModule);
		if (referrerPath === undefined) {
			throw new Error(`local module loader: unknown referrer while linking "${specifier}"`);
		}
		const resolved = resolveImportSpecifier(path.dirname(referrerPath), specifier, this.#packageRoot);
		if (isLocalPathSpecifier(specifier) && isManagedLocalModulePath(resolved)) {
			return (await this.#ensureLocalModule(resolved)).module;
		}
		return await this.#ensureExternalModule(normalizeImportTarget(resolved));
	};

	// Resolver for runtime `import()` inside evaluated module code: the result must be a
	// fully linked+evaluated module, so local targets are loaded as graph roots.
	async #resolveDynamicImport(referrerPath: string, specifier: string): Promise<vm.Module> {
		const resolved = resolveImportSpecifier(path.dirname(referrerPath), specifier, this.#packageRoot);
		if (isLocalPathSpecifier(specifier) && isManagedLocalModulePath(resolved)) {
			return await this.#loadLocalModule(resolved);
		}
		return await this.#ensureExternalModule(normalizeImportTarget(resolved));
	}

	// A failed link/evaluate can leave a partial graph cached. Drop every reachable module
	// that is not fully evaluated so the next attempt reconstructs it; fully evaluated
	// modules keep valid namespaces and stay cached.
	#invalidateFailedLoad(rootPath: string): void {
		const stack = [rootPath];
		const seen = new Set<string>();
		while (stack.length > 0) {
			const current = stack.pop();
			if (current === undefined || seen.has(current)) continue;
			seen.add(current);
			const entry = this.#moduleEntries.get(current);
			if (entry && entry.module.status === "evaluated") continue;
			this.#moduleEntries.delete(current);
			this.#moduleBuilds.delete(current);
			const deps = this.#moduleDeps.get(current);
			if (deps) for (const dep of deps) stack.push(dep);
		}
	}

	async #ensureExternalModule(target: string): Promise<vm.Module> {
		const existing = this.#externalModules.get(target);
		if (existing) return await existing;
		const loadPromise = (async () => {
			const namespace = await import(target);
			const exportNames = Object.keys(namespace);
			const module = new vm.SyntheticModule(
				exportNames,
				function () {
					for (const name of exportNames) {
						this.setExport(name, namespace[name as keyof typeof namespace]);
					}
				},
				{ context: this.#context, identifier: target },
			);
			await module.link(() => {
				throw new Error("Synthetic external modules have no dependencies");
			});
			await module.evaluate();
			return module;
		})();
		this.#externalModules.set(target, loadPromise);
		try {
			return await loadPromise;
		} catch (error) {
			if (this.#externalModules.get(target) === loadPromise) this.#externalModules.delete(target);
			throw error;
		}
	}

	#refreshTrackedLocalModules(): void {
		const changed: string[] = [];
		for (const [modulePath, previousMtime] of this.#moduleMtimes.entries()) {
			let nextMtime: number | undefined;
			try {
				nextMtime = fs.statSync(modulePath).mtimeMs;
			} catch {
				nextMtime = undefined;
			}
			if (nextMtime === previousMtime) continue;
			if (nextMtime === undefined) this.#moduleMtimes.delete(modulePath);
			else this.#moduleMtimes.set(modulePath, nextMtime);
			changed.push(modulePath);
		}
		for (const modulePath of changed) {
			this.#invalidateModuleAndParents(modulePath, new Set());
		}
	}

	#invalidateModuleAndParents(modulePath: string, seen: Set<string>): void {
		if (seen.has(modulePath)) return;
		seen.add(modulePath);
		this.#moduleEntries.delete(modulePath);
		this.#moduleBuilds.delete(modulePath);
		this.#moduleVersions.set(modulePath, (this.#moduleVersions.get(modulePath) ?? 1) + 1);
		const parents = [...(this.#moduleParents.get(modulePath) ?? [])];
		for (const parent of parents) this.#invalidateModuleAndParents(parent, seen);
	}

	#setModuleDependencies(modulePath: string, deps: Set<string>): void {
		const previousDeps = this.#moduleDeps.get(modulePath);
		if (previousDeps) {
			for (const dep of previousDeps) {
				const parents = this.#moduleParents.get(dep);
				if (!parents) continue;
				parents.delete(modulePath);
				if (parents.size === 0) this.#moduleParents.delete(dep);
			}
		}
		this.#moduleDeps.set(modulePath, new Set(deps));
		for (const dep of deps) {
			const parents = this.#moduleParents.get(dep) ?? new Set<string>();
			parents.add(modulePath);
			this.#moduleParents.set(dep, parents);
		}
	}
}

function buildRequire(fromPath: string, packageRoot: string | undefined): NodeJS.Require {
	const basePath = path.extname(fromPath) ? fromPath : path.join(fromPath, "[eval]");
	const primary = createRequire(pathToFileURL(basePath).href);
	if (!packageRoot) return primary;
	const fallback = createRequire(pathToFileURL(path.join(packageRoot, "package.json")).href);
	const requireWithFallback = ((id: string) => {
		if (!isBareSpecifier(id)) return primary(id);
		let primaryResolutionError: unknown;
		try {
			primary.resolve(id);
		} catch (error) {
			primaryResolutionError = error;
		}
		if (!primaryResolutionError) return primary(id);
		try {
			fallback.resolve(id);
		} catch (fallbackError) {
			throw packageFallbackError(primaryResolutionError, fallbackError, packageRoot);
		}
		return fallback(id);
	}) as NodeJS.Require;
	const resolve = ((id: string, options?: { paths?: string[] }) => {
		try {
			return primary.resolve(id, options);
		} catch (primaryError) {
			if (!isBareSpecifier(id)) throw primaryError;
			try {
				return fallback.resolve(id, options);
			} catch (fallbackError) {
				throw packageFallbackError(primaryError, fallbackError, packageRoot);
			}
		}
	}) as NodeJS.Require["resolve"] & { paths(request: string): string[] | null };
	resolve.paths = request => primary.resolve.paths(request);
	Object.defineProperties(requireWithFallback, {
		resolve: { value: resolve },
		cache: { value: primary.cache },
		extensions: { value: primary.extensions },
		main: { value: primary.main },
	});
	return requireWithFallback;
}

function buildModuleSource(source: string, modulePath: string): string {
	const moduleDir = path.dirname(modulePath);
	return [
		`const require = globalThis.__omp_get_require__(${JSON.stringify(pathToFileURL(modulePath).href)});`,
		`const __filename = ${JSON.stringify(modulePath)};`,
		`const __dirname = ${JSON.stringify(moduleDir)};`,
		source,
	].join("\n");
}

function resolveImportSpecifier(baseDir: string, source: string, packageRoot: string | undefined): string {
	if (/^[a-z][a-z0-9+.-]*:/i.test(source) || isBuiltin(source)) return source;
	if (!isBareSpecifier(source)) return Bun.resolveSync(source, baseDir);
	let projectError: unknown;
	try {
		return resolveBareSpecifierWithinProject(source, baseDir);
	} catch (error) {
		projectError = error;
	}
	if (packageRoot) {
		try {
			return resolveBareSpecifierWithinProject(source, packageRoot);
		} catch (fallbackError) {
			throw packageFallbackError(projectError, fallbackError, packageRoot);
		}
	}
	throw projectError;
}

function resolveBareSpecifierWithinProject(source: string, baseDir: string): string {
	const resolved = Bun.resolveSync(source, baseDir);
	if (!path.isAbsolute(resolved)) {
		throw new Error(
			`Refusing non-file resolution ${JSON.stringify(resolved)} for bare package ${JSON.stringify(source)} from ${baseDir}`,
		);
	}
	const segments = source.split("/");
	const packageName = source.startsWith("@") ? segments.slice(0, 2) : segments.slice(0, 1);
	const target = path.resolve(resolved);
	let ancestor = path.resolve(baseDir);
	for (;;) {
		if (fs.existsSync(path.join(ancestor, "node_modules", ...packageName))) return resolved;
		const parent = path.dirname(ancestor);
		if (parent !== ancestor && fs.existsSync(path.join(ancestor, "package.json")) && pathIsWithin(ancestor, target)) {
			return resolved;
		}
		if (parent === ancestor) break;
		ancestor = parent;
	}
	throw new Error(
		`Refusing package ${JSON.stringify(source)} resolved outside the importing project's ancestry: ${resolved}`,
	);
}

function pathIsWithin(root: string, candidate: string): boolean {
	const relative = path.relative(root, candidate);
	return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function packageFallbackError(projectError: unknown, fallbackError: unknown, packageRoot: string): Error {
	const projectMessage = projectError instanceof Error ? projectError.message : String(projectError);
	const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
	return new Error(
		`${projectMessage}\nJS package environment fallback ${packageRoot} also failed: ${fallbackMessage}\n` +
			"Install the missing dependency with %bun add (select %environment project only to modify the project).",
		{ cause: projectError },
	);
}

function isBareSpecifier(source: string): boolean {
	return !isLocalPathSpecifier(source) && !/^[a-z][a-z0-9+.-]*:/i.test(source) && !isBuiltin(source);
}

function isLocalPathSpecifier(source: string): boolean {
	return (
		source.startsWith("./") ||
		source.startsWith("../") ||
		source === "." ||
		source === ".." ||
		source.startsWith("/") ||
		source.startsWith("~/") ||
		/^[a-zA-Z]:[\\/]/.test(source)
	);
}

function isTypeScriptModulePath(modulePath: string): boolean {
	const ext = path.extname(modulePath);
	return ext === ".ts" || ext === ".tsx" || ext === ".mts";
}

function stripLoaderForPath(modulePath: string): "ts" | "tsx" {
	return path.extname(modulePath) === ".tsx" ? "tsx" : "ts";
}

function isManagedLocalModulePath(target: string): boolean {
	return (
		path.isAbsolute(target) &&
		LOCAL_MODULE_EXTENSIONS.has(path.extname(target)) &&
		!target.includes(`${path.sep}node_modules${path.sep}`)
	);
}

function normalizeImportTarget(target: string): string {
	if (path.isAbsolute(target)) return pathToFileURL(target).href;
	return target;
}
