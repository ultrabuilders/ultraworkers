import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
	classifySource,
	fetchMarketplace,
	parseMarketplaceCatalog,
} from "@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace";
import * as vcs from "@oh-my-pi/pi-natives/vcs";
import { removeSyncWithRetries } from "@oh-my-pi/pi-utils";

// Fixture lives at test/marketplace/fixtures/valid-marketplace/
const FIXTURE_DIR = path.join(import.meta.dir, "fixtures", "valid-marketplace");

// ── classifySource ────────────────────────────────────────────────────

describe("classifySource", () => {
	// ── local ─────────────────────────────────────────────────────────

	it("classifies './' prefix as local", () => {
		expect(classifySource("./my-marketplace")).toBe("local");
	});

	it("classifies POSIX absolute path as local", () => {
		expect(classifySource("/abs/path")).toBe("local");
	});

	it("classifies '~/' prefix as local", () => {
		expect(classifySource("~/my-marketplace")).toBe("local");
	});

	it("classifies Windows absolute path as local", () => {
		// C:\Users\me\marketplace — path.isAbsolute returns false on POSIX,
		// so the WIN_ABS_RE fallback must handle this.
		expect(classifySource("C:\\Users\\me\\marketplace")).toBe("local");
	});

	// ── url ───────────────────────────────────────────────────────────

	it("classifies https .json URL as url", () => {
		expect(classifySource("https://example.com/marketplace.json")).toBe("url");
	});

	// ── git ───────────────────────────────────────────────────────────

	it("classifies https non-.json URL as git", () => {
		expect(classifySource("https://github.com/owner/repo.git")).toBe("git");
	});

	it("classifies git@ SCP-style URL as git", () => {
		expect(classifySource("git@github.com:owner/repo.git")).toBe("git");
	});

	it("classifies ssh:// URL as git", () => {
		expect(classifySource("ssh://git@github.com/owner/repo")).toBe("git");
	});

	// ── github ────────────────────────────────────────────────────────

	it("classifies owner/repo shorthand as github", () => {
		expect(classifySource("owner/repo")).toBe("github");
	});

	// ── errors ────────────────────────────────────────────────────────

	it("throws on bare name with suggestion", () => {
		expect(() => classifySource("just-a-name")).toThrow(
			"Unrecognized source format. Did you mean './just-a-name' (local) or 'owner/repo' (GitHub)?",
		);
	});
});

// ── parseMarketplaceCatalog ───────────────────────────────────────────

describe("parseMarketplaceCatalog", () => {
	const VALID = JSON.stringify({
		name: "test-marketplace",
		owner: { name: "Test Author", email: "test@example.com" },
		metadata: { description: "A test marketplace" },
		plugins: [{ name: "hello-plugin", source: "./plugins/hello-plugin", description: "Greets" }],
	});

	it("parses a valid catalog", () => {
		const catalog = parseMarketplaceCatalog(VALID, "/fake/marketplace.json");
		expect(catalog.name).toBe("test-marketplace");
		expect(catalog.owner.name).toBe("Test Author");
		expect(catalog.plugins).toHaveLength(1);
		expect(catalog.plugins[0].name).toBe("hello-plugin");
	});

	// `metadata.strict` makes the parser reject, rather than accept, a plugin whose
	// installed server config would be silently dropped by the loader that reads it.
	describe("strict and nested config", () => {
		function catalogWith(extra: Record<string, unknown>, strict = false): string {
			return JSON.stringify({
				name: "test-marketplace",
				owner: { name: "Test Author", email: "test@example.com" },
				metadata: { description: "A test marketplace", ...(strict ? { strict: true } : {}) },
				plugins: [{ name: "hello-plugin", source: "./plugins/hello-plugin", ...extra }],
			});
		}

		const VALID_LSP = { command: "rust-analyzer", fileTypes: [".rs"], rootMarkers: ["Cargo.toml"] };
		const VALID_DAP = { command: "lldb-dap" };

		it("rejects an LSP entry whose command is a typo", () => {
			// The failure this exists for. `{ comand: ... }` parses, installs, and
			// writes `.lsp.json` — then `normalizeServerConfig` finds no `command`
			// and drops the server with a single `logger.warn`. The user's LSP server
			// simply never starts, and nothing said why.
			expect(() =>
				parseMarketplaceCatalog(
					catalogWith({ lspServers: { rust: { comand: "rust-analyzer" } } }, true),
					"/fake/marketplace.json",
				),
			).toThrow(/command/);
		});

		it("rejects a DAP adapter with no command", () => {
			// Same silent disappearance, and quieter than LSP: `normalizeAdapterConfig`
			// used to `return null` with nothing logged at all.
			expect(() =>
				parseMarketplaceCatalog(catalogWith({ dapAdapters: { lldb: { args: ["--x"] } } }, true), "/fake/m.json"),
			).toThrow(/command/);
		});

		it("rejects a server entry that is not an object at all", () => {
			// `{ alpha: "oops" }` reaches `.lsp.json`, and the loader drops it: the entry
			// is not a config, so no server exists and only a log line says so. An
			// earlier version of this check skipped non-object entries as "not a
			// server config at all" — so it passed exactly the case strict exists to
			// catch. The validators reject this; the parser must let them.
			for (const field of ["lspServers", "dapAdapters"]) {
				expect(() =>
					parseMarketplaceCatalog(catalogWith({ [field]: { alpha: "oops" } }, true), "/fake/m.json"),
				).toThrow(/must be an object/);
			}
		});

		it("names the catalog and the server, because the message is the only thing left", () => {
			// `cloneAndReadCatalog` deletes the temporary clone when parsing fails, so
			// there is nothing on disk to diff. "Which catalog, and which of my
			// plugins" has to be answerable from the error string alone.
			expect(() =>
				parseMarketplaceCatalog(catalogWith({ lspServers: { rust: {} } }, true), "/fake/marketplace.json"),
			).toThrow(/test-marketplace.*rust/s);
		});

		it("reports every broken entry, not only the first", () => {
			// An author fixing a catalog should see all of their mistakes in one run.
			// Reporting only the first makes the fix a sequence of trial-and-error
			// rounds, and makes the message depend on entry order.
			let message = "";
			try {
				parseMarketplaceCatalog(
					catalogWith({ lspServers: { alpha: {}, bravo: {} } }, true),
					"/fake/marketplace.json",
				);
			} catch (err) {
				message = (err as Error).message;
			}
			expect(message).toContain("alpha");
			expect(message).toContain("bravo");
		});

		it("does not tighten a catalog that never opted in", () => {
			// The opt-out must stay a real opt-out. The same entry that strict
			// rejects has to keep parsing unchanged for everyone else, or turning the
			// flag on would have been a breaking change nobody asked for.
			const catalog = parseMarketplaceCatalog(
				catalogWith({ lspServers: { rust: { comand: "rust-analyzer" } } }),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins).toHaveLength(1);
			expect(catalog.plugins[0]?.lspServers).toEqual({ rust: { comand: "rust-analyzer" } });
		});

		it("keeps author-chosen server names, which are not a closed vocabulary", () => {
			// The OUTER key is a lookup name the author invented, so there is no set
			// to check it against. Only the config INSIDE it has required fields.
			// Valid DAP rides along because the two fields must agree: a gate that
			// rejected good config would be indistinguishable from one that works.
			const catalog = parseMarketplaceCatalog(
				catalogWith({ lspServers: { "My_Server.2": VALID_LSP }, dapAdapters: { "My.Debug.2": VALID_DAP } }, true),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins[0]?.lspServers).toEqual({ "My_Server.2": VALID_LSP });
			expect(catalog.plugins[0]?.dapAdapters).toEqual({ "My.Debug.2": VALID_DAP });
		});

		it("does not validate hooks or mcpServers, which nothing installs", () => {
			// Neither field has a consumer: `docs/marketplace.md` records both as
			// preserved metadata, with runtime config read from the plugin
			// manifest/tree. Validating them would be validating a dead field and
			// would only make it look load-bearing.
			const catalog = parseMarketplaceCatalog(
				catalogWith({ hooks: { onToolCall: "x" }, mcpServers: { alpha: "anything" } }, true),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins[0]?.mcpServers).toEqual({ alpha: "anything" });
		});

		it("accepts the path form, which is checked where it resolves", () => {
			const catalog = parseMarketplaceCatalog(
				catalogWith({ lspServers: "./.lsp.json" }, true),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins[0]?.lspServers).toBe("./.lsp.json");
		});

		it("accepts config that merely differs from expectation, without losing a server", () => {
			// Strict rejects what would VANISH, not what is merely unfamiliar. An
			// optional key spelled wrongly costs an override, not a server — and a
			// copied key list would reject this valid catalog the moment ultraworkers grows a
			// field, blaming the author for our staleness.
			const catalog = parseMarketplaceCatalog(
				catalogWith({ lspServers: { rust: { ...VALID_LSP, warmupTimoutMs: 500 } } }, true),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins[0]?.lspServers).toEqual({ rust: { ...VALID_LSP, warmupTimoutMs: 500 } });
		});

		it("fails the whole catalog under strict, because a check that skips is not a check", () => {
			const raw = JSON.parse(catalogWith({ lspServers: { rust: {} } }, true)) as { plugins: unknown[] };
			raw.plugins.push({ name: "good-plugin", source: "./plugins/good-plugin" });
			expect(() => parseMarketplaceCatalog(JSON.stringify(raw), "/fake/marketplace.json")).toThrow();
		});

		it("ignores nested config entirely when strict is off", () => {
			const raw = JSON.parse(catalogWith({ hooks: 123 })) as { plugins: unknown[] };
			raw.plugins.push({ name: "good-plugin", source: "./plugins/good-plugin" });
			const catalog = parseMarketplaceCatalog(JSON.stringify(raw), "/fake/marketplace.json");
			expect(catalog.plugins.map(p => p.name)).toEqual(["hello-plugin", "good-plugin"]);
		});
	});

	it("parses a catalog whose name has uppercase letters (#10827)", () => {
		const catalog = parseMarketplaceCatalog(
			JSON.stringify({
				name: "HexRaysSA",
				owner: { name: "HexRaysSA" },
				plugins: [{ name: "ida-mcp", source: "./plugins/ida-mcp" }],
			}),
			"/f.json",
		);
		expect(catalog.name).toBe("HexRaysSA");
	});

	it("skips plugin names that differ only by case to prevent cache collisions", () => {
		const catalog = parseMarketplaceCatalog(
			JSON.stringify({
				name: "HexRaysSA",
				owner: { name: "HexRaysSA" },
				plugins: [
					{ name: "IDA-MCP", source: "./plugins/ida-mcp" },
					{ name: "ida-mcp", source: "./plugins/ida-mcp-lowercase" },
				],
			}),
			"/f.json",
		);
		expect(catalog.plugins.map(plugin => plugin.name)).toEqual(["IDA-MCP"]);
	});

	it("throws on missing name", () => {
		const bad = JSON.stringify({ owner: { name: "x" }, plugins: [] });
		expect(() => parseMarketplaceCatalog(bad, "/f.json")).toThrow(/"name"/);
	});

	it("throws when name fails isValidNameSegment", () => {
		const bad = JSON.stringify({ name: "Invalid Name", owner: { name: "x" }, plugins: [] });
		expect(() => parseMarketplaceCatalog(bad, "/f.json")).toThrow(/"name"/);
	});

	it("throws on missing plugins", () => {
		const bad = JSON.stringify({ name: "valid-name", owner: { name: "x" } });
		expect(() => parseMarketplaceCatalog(bad, "/f.json")).toThrow(/"plugins"/);
	});

	it("throws on missing owner", () => {
		const bad = JSON.stringify({ name: "valid-name", plugins: [] });
		expect(() => parseMarketplaceCatalog(bad, "/f.json")).toThrow(/"owner"/);
	});

	it("empty plugins array is valid", () => {
		const catalog = parseMarketplaceCatalog(
			JSON.stringify({ name: "valid-name", owner: { name: "x" }, plugins: [] }),
			"/f.json",
		);
		expect(catalog.plugins).toHaveLength(0);
	});

	it("preserves extra fields in output", () => {
		const extra = JSON.stringify({
			name: "my-market",
			owner: { name: "x" },
			plugins: [],
			myCustomField: "preserved",
			anotherExtra: 42,
		});
		const catalog = parseMarketplaceCatalog(extra, "/f.json") as unknown as Record<string, unknown>;
		expect(catalog.myCustomField).toBe("preserved");
		expect(catalog.anotherExtra).toBe(42);
	});

	it("accepts plugin with object source (typed source object)", () => {
		const content = JSON.stringify({
			name: "my-market",
			owner: { name: "x" },
			plugins: [{ name: "p1", source: { source: "github", repo: "owner/repo" } }],
		});
		const catalog = parseMarketplaceCatalog(content, "/f.json");
		expect(catalog.plugins[0].name).toBe("p1");
	});

	it("throws on invalid JSON", () => {
		expect(() => parseMarketplaceCatalog("{not json", "/f.json")).toThrow(
			"Failed to parse marketplace catalog at /f.json",
		);
	});
});

// ── fetchMarketplace ──────────────────────────────────────────────────

describe("fetchMarketplace", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ultraworkers-fetcher-test-"));
	});

	afterEach(() => {
		removeSyncWithRetries(tmpDir);
	});

	it("resolves catalog from fixture directory", async () => {
		const result = await fetchMarketplace(FIXTURE_DIR, tmpDir);
		expect(result.catalog.name).toBe("test-marketplace");
		expect(result.catalog.owner.name).toBe("Test Author");
		expect(result.catalog.plugins).toHaveLength(1);
		expect(result.catalog.plugins[0].name).toBe("hello-plugin");
		// local fetch never returns a clonePath
		expect(result.clonePath).toBeUndefined();
	});

	it("throws a clear error for nonexistent local directory", async () => {
		const missing = path.join(tmpDir, "nonexistent");
		await expect(fetchMarketplace(missing, tmpDir)).rejects.toThrow(/Marketplace catalog not found/);
	});

	it("loads catalog from .omp-plugin/marketplace.json when present", async () => {
		const root = path.join(tmpDir, "omp-only");
		fs.mkdirSync(path.join(root, ".omp-plugin"), { recursive: true });
		const catalog = {
			name: "omp-only-marketplace",
			owner: { name: "Test" },
			plugins: [{ name: "omp-plugin", source: "./plugins/omp-plugin", description: "x" }],
		};
		fs.writeFileSync(path.join(root, ".omp-plugin", "marketplace.json"), JSON.stringify(catalog));

		const result = await fetchMarketplace(root, tmpDir);
		expect(result.catalog.name).toBe("omp-only-marketplace");
		expect(result.catalog.plugins[0].name).toBe("omp-plugin");
	});

	it("prefers .omp-plugin/marketplace.json over .claude-plugin/marketplace.json when both exist", async () => {
		const root = path.join(tmpDir, "both-catalogs");
		fs.mkdirSync(path.join(root, ".omp-plugin"), { recursive: true });
		fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
		const ompCatalog = {
			name: "from-omp-plugin",
			owner: { name: "Test" },
			plugins: [{ name: "p", source: "./p", description: "x" }],
		};
		const claudeCatalog = {
			name: "from-claude-plugin",
			owner: { name: "Test" },
			plugins: [{ name: "p", source: "./p", description: "x" }],
		};
		fs.writeFileSync(path.join(root, ".omp-plugin", "marketplace.json"), JSON.stringify(ompCatalog));
		fs.writeFileSync(path.join(root, ".claude-plugin", "marketplace.json"), JSON.stringify(claudeCatalog));

		const result = await fetchMarketplace(root, tmpDir);
		expect(result.catalog.name).toBe("from-omp-plugin");
	});

	it("error message names both candidate paths when neither exists", async () => {
		const empty = path.join(tmpDir, "empty-dir");
		fs.mkdirSync(empty, { recursive: true });
		await expect(fetchMarketplace(empty, tmpDir)).rejects.toThrow(
			/\.omp-plugin[\\/]marketplace\.json.*\.claude-plugin[\\/]marketplace\.json/,
		);
	});

	it("hides temp clone paths in cloned catalog validation errors", async () => {
		const cloneSpy = spyOn(vcs, "clone").mockImplementation(async (_url, targetDir) => {
			fs.mkdirSync(path.join(targetDir, ".claude-plugin"), { recursive: true });
			fs.writeFileSync(
				path.join(targetDir, ".claude-plugin", "marketplace.json"),
				JSON.stringify({ name: "broken-marketplace", plugins: [] }),
			);
		});

		try {
			await expect(fetchMarketplace("kubeshark/kubeshark", tmpDir)).rejects.toThrow(
				'Cloned repository https://github.com/kubeshark/kubeshark.git: Missing or invalid field "owner" in catalog: .claude-plugin/marketplace.json (source: kubeshark/kubeshark)',
			);
		} finally {
			cloneSpy.mockRestore();
		}
	});
});
