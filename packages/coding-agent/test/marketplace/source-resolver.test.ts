import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { MarketplacePluginEntry } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace";
import {
	assertPinnedSource,
	classifySourcePin,
	resolvePluginSource,
	validatePluginSource,
} from "@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace";
import { removeSyncWithRetries } from "@oh-my-pi/pi-utils";

// Fixture: a cloned marketplace with a single plugin at ./plugins/hello-plugin
const FIXTURE_DIR = path.resolve(import.meta.dir, "fixtures/valid-marketplace");

// Helper — build a minimal MarketplacePluginEntry with the given source
function makeEntry(source: MarketplacePluginEntry["source"]): MarketplacePluginEntry {
	return { name: "hello-plugin", source };
}

describe("resolvePluginSource", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omp-src-res-test-"));
	});

	afterEach(() => {
		removeSyncWithRetries(tmpDir);
	});

	it("resolves relative source to absolute plugin directory", async () => {
		const entry = makeEntry("./plugins/hello-plugin");
		const resolved = await resolvePluginSource(entry, {
			marketplaceClonePath: FIXTURE_DIR,
			tmpDir,
		});
		expect(resolved.dir).toBe(path.resolve(FIXTURE_DIR, "plugins/hello-plugin"));
		expect(resolved.tempCloneRoot).toBeUndefined();
	});

	it("validates relative sources without mutating or cloning", async () => {
		await expect(
			validatePluginSource(makeEntry("./plugins/hello-plugin"), {
				marketplaceClonePath: FIXTURE_DIR,
			}),
		).resolves.toBe(path.resolve(FIXTURE_DIR, "plugins/hello-plugin"));
	});

	it("rejects unsupported npm sources during validation", async () => {
		await expect(validatePluginSource(makeEntry({ source: "npm", package: "hello-plugin" }), {})).rejects.toThrow(
			/npm plugin sources are not yet supported/,
		);
	});

	it("rejects git-subdir traversal during validation", async () => {
		await expect(
			validatePluginSource(
				makeEntry({
					source: "git-subdir",
					url: "owner/repo",
					path: "../../escape",
				}),
				{},
			),
		).rejects.toThrow(/escapes the cloned repository/);
	});

	it("allows git-subdir parent segments that remain contained", async () => {
		await expect(
			validatePluginSource(
				makeEntry({
					source: "git-subdir",
					url: "owner/repo",
					path: "packages/../plugins/foo",
				}),
				{},
			),
		).resolves.toBeUndefined();
	});

	it("throws when source string would escape marketplace root", async () => {
		// "../../escape" does not start with "./" — hits the non-relative guard
		const entry = makeEntry("../../escape");
		await expect(resolvePluginSource(entry, { marketplaceClonePath: FIXTURE_DIR, tmpDir })).rejects.toThrow();
	});

	it("throws when relative source would escape via path traversal (./../../escape)", async () => {
		// Starts with "./" but resolves outside marketplace root
		const entry = makeEntry("./../../escape");
		await expect(resolvePluginSource(entry, { marketplaceClonePath: FIXTURE_DIR, tmpDir })).rejects.toThrow(
			/outside marketplace root/,
		);
	});

	it("throws when marketplaceClonePath is missing for relative source", async () => {
		const entry = makeEntry("./plugins/hello-plugin");
		await expect(resolvePluginSource(entry, { tmpDir })).rejects.toThrow(/marketplaceClonePath/);
	});

	it("prepends catalogMetadata.pluginRoot to the relative source path", async () => {
		// pluginRoot "plugins" + source "./hello-plugin" → ./plugins/hello-plugin
		const entry = makeEntry("./hello-plugin");
		const resolved = await resolvePluginSource(entry, {
			marketplaceClonePath: FIXTURE_DIR,
			catalogMetadata: { pluginRoot: "plugins" },
			tmpDir,
		});
		expect(resolved.dir).toBe(path.resolve(FIXTURE_DIR, "plugins/hello-plugin"));
		expect(resolved.tempCloneRoot).toBeUndefined();
	});

	it("throws when resolved directory does not exist", async () => {
		const entry = makeEntry("./plugins/nonexistent-plugin");
		await expect(resolvePluginSource(entry, { marketplaceClonePath: FIXTURE_DIR, tmpDir })).rejects.toThrow(
			/does not exist/,
		);
	});
});

describe("classifySourcePin", () => {
	// The 40-hex boundary is the whole contract. Each case below is a distinct
	// branch of that one predicate, and the 7-char case is the expensive
	// direction: `manager.ts` displays `sha.slice(0, 7)`, so a classifier that
	// accepts an abbreviated sha would mark every already-installed entry on a
	// user's machine immutable and silently freeze their updates.

	const FULL = "a".repeat(40);

	it("treats a full 40-hex sha as a pin", () => {
		expect(classifySourcePin({ source: "github", repo: "owner/repo", sha: FULL })).toBe("immutable");
	});

	it("does not treat an abbreviated sha as a pin", () => {
		expect(
			classifySourcePin({
				source: "github",
				repo: "owner/repo",
				sha: FULL.slice(0, 7),
			}),
		).toBe("mutable");
	});

	it("rejects a 39-hex sha — the boundary is exact, not a minimum length", () => {
		expect(
			classifySourcePin({
				source: "url",
				url: "https://example.com/r.git",
				sha: FULL.slice(0, 39),
			}),
		).toBe("mutable");
	});

	it("rejects a 41-hex sha — a longer run is not a sha either", () => {
		expect(
			classifySourcePin({
				source: "url",
				url: "https://example.com/r.git",
				sha: `${FULL}a`,
			}),
		).toBe("mutable");
	});

	it("rejects 40 hex-looking characters that are not a sha", () => {
		// Length alone would pass; only the alphabet check rejects this.
		expect(
			classifySourcePin({
				source: "github",
				repo: "owner/repo",
				sha: "g".repeat(40),
			}),
		).toBe("mutable");
	});

	it("does not treat a branch ref as a pin", () => {
		expect(classifySourcePin({ source: "github", repo: "owner/repo", ref: "main" })).toBe("mutable");
	});

	it("does not treat a tag ref as a pin", () => {
		expect(
			classifySourcePin({
				source: "github",
				repo: "owner/repo",
				ref: "v1.2.3",
			}),
		).toBe("mutable");
	});

	it("does not treat a bare source with neither ref nor sha as a pin", () => {
		expect(classifySourcePin({ source: "github", repo: "owner/repo" })).toBe("mutable");
	});

	// Negative contract: sources with no git identity must classify, not throw.
	// A classifier reached from a restore path has to answer for every entry in
	// the registry, including the ones it can never pin.
	it("classifies non-git sources as mutable rather than rejecting them", () => {
		expect(classifySourcePin("./plugins/hello-plugin")).toBe("mutable");
		expect(
			classifySourcePin({
				source: "npm",
				package: "hello-plugin",
				version: "1.0.0",
			}),
		).toBe("mutable");
	});

	it("pins a git-subdir source only on a full sha", () => {
		expect(
			classifySourcePin({
				source: "git-subdir",
				url: "owner/repo",
				path: "plugins/foo",
				sha: FULL,
			}),
		).toBe("immutable");
		expect(
			classifySourcePin({
				source: "git-subdir",
				url: "owner/repo",
				path: "plugins/foo",
			}),
		).toBe("mutable");
	});
});

describe("assertPinnedSource", () => {
	const FULL = "a".repeat(40);

	// Both directions are required. An assert that only ever throws passes just
	// as happily as one that never does — the pin has to be *reachable*, or the
	// guard silently bans every restore including the reviewed ones.
	it("accepts a source pinned to a full sha", () => {
		assertPinnedSource({ source: "github", repo: "owner/repo", sha: FULL }, "hello-plugin");
	});

	it("refuses a branch-pinned source and names the entry", () => {
		// The name is the whole point: without it the message cannot be acted on
		// when a registry restores a dozen entries at once.
		expect(() => assertPinnedSource({ source: "github", repo: "owner/repo", ref: "main" }, "hello-plugin")).toThrow(
			/hello-plugin/,
		);
	});

	it("refuses a tag-pinned source", () => {
		expect(() => assertPinnedSource({ source: "github", repo: "owner/repo", ref: "v1.2.3" }, "chalk-logger")).toThrow(
			/chalk-logger/,
		);
	});

	it("refuses an abbreviated sha, which is a display prefix rather than a pin", () => {
		expect(() => assertPinnedSource({ source: "github", repo: "owner/repo", sha: FULL.slice(0, 7) }, "abc")).toThrow(
			/abc/,
		);
	});

	// The scope boundary, and the only thing separating "pin the source" from
	// "ban the source": entries already installed from a tag stay installable.
	it("leaves installability alone — it guards restore, not install", () => {
		const entry = makeEntry({
			source: "github",
			repo: "owner/repo",
			ref: "v1.2.3",
		});
		// The classifier still reports the entry as a legal, mutable source, so
		// nothing on the install path consults this guard and rejects it.
		expect(classifySourcePin(entry.source)).toBe("mutable");
		expect(() => assertPinnedSource(entry.source, entry.name)).toThrow(/hello-plugin/);
	});
});
