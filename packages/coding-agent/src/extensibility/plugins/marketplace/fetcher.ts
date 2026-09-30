/**
 * Marketplace catalog fetcher.
 *
 * Classifies a source string, resolves it, and loads the catalog.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vcs from "@oh-my-pi/pi-natives/vcs";
import { isEnoent, logger } from "@oh-my-pi/pi-utils";
import { validateAdapterConfig } from "../../../dap/config";
import { validateServerConfig as validateLspServerConfig } from "../../../lsp/config";

import {
	isValidNameSegment,
	nameSegmentCollisionKey,
	type MarketplaceCatalog,
	type MarketplaceSourceType,
} from "./types";

const GIT_CLONE_TIMEOUT_MS = 30 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────

export interface FetchResult {
	catalog: MarketplaceCatalog;
	/** For git sources: path to the cloned marketplace directory. */
	clonePath?: string;
}

// ── classifySource ────────────────────────────────────────────────────

/**
 * Detects Windows-style absolute paths cross-platform:
 *   C:\path, C:/path  → drive-letter + colon + separator
 *   \\server\share    → UNC path
 *
 * Needed because path.isAbsolute("C:\...") returns false on POSIX.
 */
const WIN_ABS_RE = /^[A-Za-z]:[/\\]|^\\\\/;

/**
 * GitHub owner/repo shorthand: lowercase alphanumeric + hyphens/dots, one slash.
 * Must NOT start with a protocol — that is ruled out by earlier checks.
 */
const GITHUB_SHORTHAND_RE = /^[a-z0-9-]+\/[a-z0-9._-]+$/i;

/**
 * Classify a marketplace source string into one of the four source types.
 *
 * Rules are ordered; the first match wins. Protocol/pattern checks (rules 1-3)
 * run before any path.isAbsolute() check so that SCP-style git@ URLs are
 * never misclassified as local paths on Windows.
 *
 * @throws if the source format is unrecognized.
 */
export function classifySource(source: string): MarketplaceSourceType {
	// Rule 1: HTTP(S) URLs — .json suffix → url, everything else → git
	if (source.startsWith("https://") || source.startsWith("http://")) {
		try {
			const { pathname } = new URL(source);
			return pathname.endsWith(".json") ? "url" : "git";
		} catch {
			// Malformed URL — treat as git
			return "git";
		}
	}

	// Rule 2: SCP-style SSH git URLs
	if (source.startsWith("git@") || source.startsWith("ssh://")) {
		return "git";
	}

	// Rule 3: GitHub owner/repo shorthand (no protocol, no leading slash)
	if (GITHUB_SHORTHAND_RE.test(source)) {
		return "github";
	}

	// Rule 4: Explicit relative or home-relative paths
	if (source.startsWith("./") || source.startsWith("~/")) {
		return "local";
	}

	// Rule 5: Absolute paths — POSIX via path.isAbsolute, Windows via regex
	if (path.isAbsolute(source) || WIN_ABS_RE.test(source)) {
		return "local";
	}

	throw new Error(`Unrecognized source format. Did you mean './${source}' (local) or 'owner/repo' (GitHub)?`);
}

// ── parseMarketplaceCatalog ───────────────────────────────────────────

function assertField(condition: boolean, field: string, filePath: string): asserts condition {
	if (!condition) {
		throw new Error(`Missing or invalid field "${field}" in catalog: ${filePath}`);
	}
}

/**
 * Plugin fields that are written to disk during installation and then read back by
 * a loader that drops what it cannot use.
 *
 * `hooks` and `mcpServers` are deliberately absent. Nothing in installation reads
 * them — `docs/marketplace.md` records both as "preserved", with runtime
 * configuration coming from the plugin manifest/tree instead — so validating them
 * would be validating a dead field and would only make it look load-bearing.
 */
const INSTALLED_CONFIG_FIELDS = ["lspServers", "dapAdapters"] as const;

/**
 * Why one entry would be dropped, per the rule of the loader that owns it.
 *
 * Each field is delegated to the validator its own consumer already uses, so strict
 * rejects exactly the set the loader discards. Anything looser would tell an author
 * their plugin is broken when it would have worked; anything stricter would reject a
 * valid catalog.
 */
function serverConfigErrors(
	field: (typeof INSTALLED_CONFIG_FIELDS)[number],
	serverName: string,
	config: unknown,
): string[] {
	return field === "lspServers"
		? validateLspServerConfig(serverName, config)
		: validateAdapterConfig(serverName, config);
}

/**
 * Parse and validate a marketplace.json catalog from raw JSON content.
 *
 * Required fields: name (valid name segment), owner.name, plugins array.
 * Each plugin entry requires name (string) and source (string or object
 * with a "source" field). Extra fields are preserved via spread.
 *
 * A catalog that sets `metadata.strict` is additionally rejected as a whole if any
 * plugin's `lspServers` or `dapAdapters` entry would be silently dropped by the
 * loader that reads it. That flag is catalog-level on purpose: parsing is
 * all-or-nothing, so a per-entry flag would let a remote author fail an entire
 * marketplace — including the plugins that were fine — from one entry of theirs.
 *
 * @throws on JSON parse failure, missing/invalid required fields, or — only under
 * `metadata.strict` — server config the loaders would discard.
 */
export function parseMarketplaceCatalog(content: string, filePath: string): MarketplaceCatalog {
	let raw: unknown;
	try {
		raw = JSON.parse(content);
	} catch (err) {
		throw new Error(`Failed to parse marketplace catalog at ${filePath}: ${(err as Error).message}`);
	}

	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		throw new Error(`Marketplace catalog at ${filePath} must be a JSON object`);
	}

	const obj = raw as Record<string, unknown>;

	// name: required, must be a valid name segment
	assertField(typeof obj.name === "string" && isValidNameSegment(obj.name), "name", filePath);

	// owner: required object with name string
	assertField(typeof obj.owner === "object" && obj.owner !== null && !Array.isArray(obj.owner), "owner", filePath);
	const owner = obj.owner as Record<string, unknown>;
	assertField(typeof owner.name === "string", "owner.name", filePath);

	// plugins: required array
	assertField(Array.isArray(obj.plugins), "plugins", filePath);

	// Strict is a property of the CATALOG, not of an entry, and the distinction is
	// load-bearing: parsing is all-or-nothing, so a per-entry flag handed a remote
	// author the power to fail an entire marketplace — including every plugin that
	// was fine — by setting it on one entry of theirs. Deciding how forgiving your
	// own catalog is belongs to whoever publishes it.
	const strictCatalog =
		typeof obj.metadata === "object" &&
		obj.metadata !== null &&
		!Array.isArray(obj.metadata) &&
		(obj.metadata as Record<string, unknown>).strict === true;

	// Every violation is collected and thrown once at the end, so the author sees
	// all of them rather than whichever entry happened to come first, and so the
	// message does not depend on the order entries appear in the file.
	const strictViolations: string[] = [];

	const plugins = obj.plugins as unknown[];
	const validPlugins: unknown[] = [];
	const pluginNameKeys = new Set<string>();
	for (let i = 0; i < plugins.length; i++) {
		try {
			const entry = plugins[i];
			assertField(typeof entry === "object" && entry !== null && !Array.isArray(entry), `plugins[${i}]`, filePath);
			const p = entry as Record<string, unknown>;
			assertField(typeof p.name === "string" && isValidNameSegment(p.name), `plugins[${i}].name`, filePath);
			// source can be a string path or a typed object (github/url/git-subdir/npm)
			// all typed objects carry a "source" discriminant string field
			assertField(
				typeof p.source === "string" ||
					(typeof p.source === "object" &&
						p.source !== null &&
						!Array.isArray(p.source) &&
						typeof (p.source as Record<string, unknown>).source === "string"),
				`plugins[${i}].source`,
				filePath,
			);
			// String sources must be relative paths starting with "./"
			if (typeof p.source === "string") {
				assertField((p.source as string).startsWith("./"), `plugins[${i}].source (must start with "./")`, filePath);
			}
			// Validate required fields for typed source variants
			if (typeof p.source === "object" && p.source !== null) {
				const src = p.source as Record<string, unknown>;
				const variant = src.source as string;
				if (variant === "github") {
					assertField(typeof src.repo === "string" && src.repo.length > 0, `plugins[${i}].source.repo`, filePath);
				} else if (variant === "url" || variant === "git-subdir") {
					assertField(typeof src.url === "string" && src.url.length > 0, `plugins[${i}].source.url`, filePath);
					if (variant === "git-subdir") {
						assertField(
							typeof src.path === "string" && src.path.length > 0,
							`plugins[${i}].source.path`,
							filePath,
						);
					}
				} else if (variant === "npm") {
					assertField(
						typeof src.package === "string" && src.package.length > 0,
						`plugins[${i}].source.package`,
						filePath,
					);
				} else {
					assertField(false, `plugins[${i}].source.source (unknown variant: "${variant}")`, filePath);
				}
			}
			// Under a strict catalog, an entry whose server config the loaders would
			// silently drop is rejected here rather than discovered later.
			//
			// The rule is deliberately the LOADER'S, not a key list copied here. An
			// earlier version of this checked that each map value was an object —
			// which the type already guarantees and `normalizeConfig` tolerates — so
			// it rejected the one case that was already handled correctly and loudly,
			// and let through `{ comand: "x" }`, where `normalizeServerConfig` finds no
			// `command` and drops the server with only a `logger.warn`. The user then
			// has a plugin whose LSP server silently does not exist.
			//
			// Checking against a hand-copied key list instead would be worse still:
			// it goes stale the moment `ServerConfig` gains a field, and then a
			// perfectly valid catalog is rejected on an omp upgrade. So strict
			// validates the REQUIRED fields, which is precisely the set that would
			// vanish — no more, and nothing that a future field can break.
			if (strictCatalog) {
				for (const field of INSTALLED_CONFIG_FIELDS) {
					const value = (p as Record<string, unknown>)[field];
					if (value === undefined) continue;
					// A string is the "read this file instead" form, resolved and
					// validated at that point, where the path is actually known.
					if (typeof value === "string") continue;
					// Anything else goes to the validator AS IS. Pre-filtering here
					// used to skip a non-object entry, which is precisely the case both
					// validators open by rejecting — so the one thing that made a server
					// vanish was the one thing strict never saw.
					for (const [serverName, serverConfig] of Object.entries(value as Record<string, unknown>)) {
						for (const reason of serverConfigErrors(field, serverName, serverConfig)) {
							strictViolations.push(`plugins[${i}].${field}["${serverName}"]: ${reason}`);
						}
					}
				}
			}

			const pluginNameKey = nameSegmentCollisionKey(p.name);
			assertField(!pluginNameKeys.has(pluginNameKey), `plugins[${i}].name (case-equivalent duplicate)`, filePath);
			pluginNameKeys.add(pluginNameKey);
			validPlugins.push(entry);
		} catch (err) {
			// A strict catalog asked to be told about a malformed entry, and a check
			// that logs while silently dropping the plugin is not a check — the author
			// gets a line in a log file and a marketplace that quietly lost an entry.
			// So a strict failure propagates; only the default keeps the blast radius
			// narrow. `strict` is catalog-wide precisely so that this throw is the
			// publisher's own choice about their own catalog.
			if (strictCatalog) throw err;
			// Warn and skip invalid plugin entries instead of failing the entire catalog.
			// This lets the rest of the marketplace load even if one entry has a bad name/source.
			const name =
				typeof plugins[i] === "object" && plugins[i] !== null
					? ((plugins[i] as Record<string, unknown>).name ?? `[${i}]`)
					: `[${i}]`;
			logger.warn(`Skipping invalid plugin ${name}: ${(err as Error).message}`);
		}
	}

	// Thrown once, after every entry has been read, so the author is told about all
	// of their broken servers rather than the first one, and so the message does not
	// depend on the order entries happen to appear in the file.
	if (strictViolations.length > 0) {
		// The catalog name is in the message because this error is the only thing the
		// user gets: `cloneAndReadCatalog` deletes the temporary clone on failure, so
		// there is nothing left on disk to diff against. "Which catalog, and which of
		// my plugins" has to be answerable from this string alone.
		const catalogName = typeof obj.name === "string" ? obj.name : "(unnamed)";
		throw new Error(
			`Marketplace catalog "${catalogName}" (${filePath}) sets metadata.strict but has ` +
				`${strictViolations.length} server config(s) the loaders would silently drop:\n` +
				strictViolations.map(v => `  - ${v}`).join("\n"),
		);
	}

	// Replace the plugins array with only valid entries
	obj.plugins = validPlugins;

	// Extra fields are preserved — cast through unknown for type safety
	return obj as unknown as MarketplaceCatalog;
}

// ── fetchMarketplace ──────────────────────────────────────────────────

/**
 * Catalog paths tried in priority order: omp-namespaced override first, then
 * the Claude Code-compatible fallback so existing marketplaces keep loading.
 */
const CATALOG_RELATIVE_PATHS: readonly string[] = [".omp-plugin/marketplace.json", ".claude-plugin/marketplace.json"];

async function readMarketplaceCatalog(
	root: string,
	options: { relativeDisplayPaths?: boolean } = {},
): Promise<{ catalogPath: string; displayPath: string; content: string }> {
	const tried: string[] = [];
	for (const rel of CATALOG_RELATIVE_PATHS) {
		const catalogPath = path.join(root, ...rel.split("/"));
		const displayPath = options.relativeDisplayPaths ? rel : catalogPath;
		tried.push(displayPath);
		try {
			const content = await Bun.file(catalogPath).text();
			return { catalogPath, displayPath, content };
		} catch (err) {
			if (isEnoent(err)) continue;
			throw err;
		}
	}
	throw new Error(
		`Marketplace catalog not found at ${tried.map(p => `"${p}"`).join(" or ")}. ` +
			`Ensure the directory exists and contains one of: ${CATALOG_RELATIVE_PATHS.join(", ")}.`,
	);
}

/**
 * Expand a `~/...` path to an absolute path using os.homedir().
 * Other paths are returned unchanged.
 */
function expandHome(p: string): string {
	if (p.startsWith("~/")) {
		return path.join(os.homedir(), p.slice(2));
	}
	return p;
}

/**
 * Fetch a marketplace catalog from a source.
 *
 * Dispatches on the source type: local filesystem paths are read directly;
 * GitHub/git sources are cloned with `git`; URL sources are fetched over HTTP.
 *
 * @param source   Source identifier: path, GitHub shorthand, git URL, or HTTP URL.
 * @param cacheDir Cache directory root for non-local sources.
 */
export async function fetchMarketplace(source: string, cacheDir: string): Promise<FetchResult> {
	const type = classifySource(source);

	if (type === "local") {
		const resolved = path.resolve(expandHome(source));
		const { catalogPath, content } = await readMarketplaceCatalog(resolved);
		const catalog = parseMarketplaceCatalog(content, catalogPath);
		return { catalog };
	}

	if (type === "github") {
		const url = `https://github.com/${source}.git`;
		return cloneAndReadCatalog(url, source, cacheDir);
	}

	if (type === "git") {
		return cloneAndReadCatalog(source, source, cacheDir);
	}

	// type === "url"
	const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
	if (!response.ok) {
		throw new Error(
			`Failed to fetch marketplace catalog from ${source}: HTTP ${response.status} ${response.statusText}`,
		);
	}
	const text = await response.text();
	const catalog = parseMarketplaceCatalog(text, source);

	return { catalog };
}

// ── cloneAndReadCatalog ───────────────────────────────────────────────

/**
 * Clone a git repository and read its marketplace catalog.
 *
 * Clones to a temporary directory and reads the catalog. The caller is
 * responsible for promoting the clone to its final cache location via
 * `promoteCloneToCache` after any duplicate/drift checks pass.
 */
async function cloneAndReadCatalog(url: string, source: string, cacheDir: string): Promise<FetchResult> {
	const tmpDir = path.join(cacheDir, `.tmp-clone-${Date.now()}`);
	await fs.mkdir(cacheDir, { recursive: true });

	logger.debug(`[marketplace] cloning ${url} → ${tmpDir}`);
	await vcs.clone(url, tmpDir, { timeoutMs: GIT_CLONE_TIMEOUT_MS });

	try {
		const { displayPath, content } = await readMarketplaceCatalog(tmpDir, { relativeDisplayPaths: true });
		const catalog = parseMarketplaceCatalog(content, displayPath);
		return { catalog, clonePath: tmpDir };
	} catch (err) {
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
		throw new Error(`Cloned repository ${url}: ${(err as Error).message} (source: ${source})`, { cause: err });
	}
}

/**
 * Promote a temporary clone directory to its final cache location.
 *
 * Callers should invoke this only after duplicate/drift checks pass.
 * Removes any existing directory at the target path before renaming.
 */
export async function promoteCloneToCache(tmpDir: string, cacheDir: string, name: string): Promise<string> {
	const finalDir = path.join(cacheDir, name);
	await fs.rm(finalDir, { recursive: true, force: true });
	await fs.rename(tmpDir, finalDir);
	return finalDir;
}
