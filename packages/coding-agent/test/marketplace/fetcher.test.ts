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

	// A per-entry `strict` flag is declared on MarketplacePluginEntry and read by
	// nothing. These pin what actually happens today, so turning it on is a visible
	// change rather than a silent one.
	describe("strict and nested config", () => {
		function catalogWith(extra: Record<string, unknown>): string {
			return JSON.stringify({
				name: "test-marketplace",
				owner: { name: "Test Author", email: "test@example.com" },
				metadata: { description: "A test marketplace" },
				plugins: [{ name: "hello-plugin", source: "./plugins/hello-plugin", ...extra }],
			});
		}

		it("accepts a nested config key that is not a real field", () => {
			// A typo in an author's marketplace.json is indistinguishable from a
			// valid key, and the plugin installs with a config nothing reads.
			const catalog = parseMarketplaceCatalog(catalogWith({ hooks: { onToolCall: "x" } }), "/fake/marketplace.json");
			expect(catalog.plugins).toHaveLength(1);
			expect(catalog.plugins[0]?.hooks).toEqual({ onToolCall: "x" });
		});

		it("rejects a nested config that is not an object when strict is set", () => {
			// The flag was declared and read by nothing. What strict can actually
			// check is SHAPE: these maps are written to disk verbatim, so a value
			// that is not an object produces a config file nothing could load.
			for (const field of ["hooks", "mcpServers", "lspServers", "dapAdapters"]) {
				expect(() =>
					parseMarketplaceCatalog(catalogWith({ strict: true, [field]: 123 }), "/fake/marketplace.json"),
				).toThrow(new RegExp(field));
			}
		});

		it("rejects a nested config whose entry is not an object", () => {
			expect(() =>
				parseMarketplaceCatalog(
					catalogWith({ strict: true, mcpServers: { alpha: "oops" } }),
					"/fake/marketplace.json",
				),
			).toThrow(/must be an object/);
		});

		it("still accepts a nested scalar when strict is not set", () => {
			// Leniency at the edge is the default and stays it: a publisher who
			// never opted in must not meet a stricter parser than they used to.
			const catalog = parseMarketplaceCatalog(
				catalogWith({ mcpServers: { alpha: "anything" } }),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins[0]?.mcpServers).toEqual({ alpha: "anything" });
		});

		it("keeps author-chosen keys, because there is no closed key set to check against", () => {
			// These maps are looked up by whatever name the author gave. Rejecting
			// an unusual key would break working catalogs, and there is no
			// vocabulary to check a typo against in the first place.
			const catalog = parseMarketplaceCatalog(
				catalogWith({ strict: true, mcpServers: { "My_Server.2": { command: "x" } } }),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins[0]?.mcpServers).toEqual({ "My_Server.2": { command: "x" } });
		});

		it("accepts a path string for a nested field under strict", () => {
			// The string form points at a file inside the plugin and is checked
			// where it is resolved, not here.
			const catalog = parseMarketplaceCatalog(
				catalogWith({ strict: true, lspServers: "./.lsp.json" }),
				"/fake/marketplace.json",
			);
			expect(catalog.plugins[0]?.lspServers).toBe("./.lsp.json");
		});

		it("fails the whole catalog under strict, because a check that skips is not a check", () => {
			// The default parser drops one bad entry and keeps the rest. Under
			// strict that would leave the author with a warning in a log file and a
			// marketplace that quietly lost a plugin — so strict propagates instead.
			const raw = JSON.parse(catalogWith({ strict: true, hooks: 123 })) as { plugins: unknown[] };
			raw.plugins.push({ name: "good-plugin", source: "./plugins/good-plugin" });
			expect(() => parseMarketplaceCatalog(JSON.stringify(raw), "/fake/marketplace.json")).toThrow();
		});

		it("ignores nested config entirely when strict is off", () => {
			// Leniency at the edge, unchanged: without `strict` a bad nested field
			// is not even a bad ENTRY — the plugin still loads, carrying the value
			// nobody will read. That is the behaviour a publisher who never opted
			// in has always had, and narrowing it is what strict is for.
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
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-fetcher-test-"));
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
