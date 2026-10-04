/**
 * GAP-D9 (`a4`, 2026-10-03): opting in to a project-scope `.mcp.json` means
 * "these servers may be loaded" — NOT "any shell these servers name may run".
 * Permission and target must stay separate. A user who turns project config on
 * to use the MCP servers of the repo they are working in has not agreed to let
 * that repo drive their `/bin/sh` through a `!command` value.
 *
 * This is the layer ABOVE the one `mcp-project-config-not-trusted-by-default`
 * covers. That file proves the project entry is dropped unless the user opts
 * in; this one proves what happens **after** they do. Opting in is a real
 * grant, and the gap it was silently more than: a grant of shell execution too.
 *
 * The assertions run the value all the way through `MCPManager.prepareConfig`,
 * the code that actually spawns `/bin/sh`, and check for a file the command
 * would create. Asserting the policy flags alone would be a tautology — this
 * file's own fixture would satisfy them if it read the flags it just wrote —
 * while the sentinel is only absent if the real shell path declined to run. The
 * third row is the control that keeps the other two honest: it proves the
 * sentinel mechanism can fire in this very fixture, so their absence is a
 * decision rather than a broken probe.
 *
 * Both carriers are driven separately because they are independent branches:
 *
 *   manager.ts:2074  resolved.env && resolved.envPolicy !== "literal"
 *   manager.ts:2095  resolved.headers && resolved.headerPolicy !== "origin-locked"
 *
 * `loadAllMCPConfigs` forces both flags at load, where `_source` is still
 * attached, so neither carrier can be closed while the other is missed.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { clearCache as clearFsCache } from "@oh-my-pi/pi-coding-agent/capability/fs";
import { loadAllMCPConfigs } from "@oh-my-pi/pi-coding-agent/mcp/config";
import { MCPManager } from "@oh-my-pi/pi-coding-agent/mcp/manager";
import { setAgentDir, __resetDirsFromEnvForTests } from "@oh-my-pi/pi-utils";
import { clearConfigValueCache } from "@oh-my-pi/pi-coding-agent/config/resolve-config-value";
import "@oh-my-pi/pi-coding-agent/discovery";

// `setAgentDir` writes `PI_CODING_AGENT_DIR` into the process environment, so leaving it
// set past this file hands every later suite an agent dir pointing at a temp directory
// this file then deletes. That is not a cosmetic leak: `config migrate` derives the
// database paths its open-file guard checks from the agent dir, so with the override
// still in place the guard inspected a path that cannot exist, reported no holders, and
// the migration renamed a config root holding an open SQLite database.
const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

async function writeMcpJson(dir: string, servers: Record<string, unknown>): Promise<void> {
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, "mcp.json"), JSON.stringify({ mcpServers: servers }, null, 2));
}

async function exists(file: string): Promise<boolean> {
	return await Bun.file(file).exists();
}

describe("an opted-in project-scope .mcp.json still cannot name a shell command", () => {
	let tempHome = "";
	let projectDir = "";
	let userAgentDir = "";
	let originalHome: string | undefined;
	// Absolute, per-test, and shell-quoted: the path reaches `/bin/sh -c`, so a temp dir
	// with a space in it would be two arguments and the probe would silently create
	// nothing — which the control row below would catch, not hide.
	let projectEnvSentinel = "";
	let projectHeaderSentinel = "";
	let userEnvSentinel = "";

	beforeEach(async () => {
		originalHome = process.env.HOME;
		tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "uw-projliteral-home-"));
		projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "uw-projliteral-project-"));
		userAgentDir = await fs.mkdtemp(path.join(os.tmpdir(), "uw-projliteral-agent-"));
		projectEnvSentinel = path.join(tempHome, "project-env-ran");
		projectHeaderSentinel = path.join(tempHome, "project-header-ran");
		userEnvSentinel = path.join(tempHome, "user-env-ran");
		process.env.HOME = tempHome;
		vi.spyOn(os, "homedir").mockReturnValue(tempHome);
		setAgentDir(userAgentDir);
		clearFsCache();
		await writeMcpJson(path.join(projectDir, ".omp"), {
			// Carrier 1 needs a non-http transport; carrier 2 needs an http one, since
			// only the http/sse branch resolves headers.
			projenv: { type: "stdio", command: "node", env: { API_KEY: `!touch ${projectEnvSentinel}` } },
			projhdr: {
				type: "http",
				url: "https://example.test/mcp",
				headers: { "X-Key": `!touch ${projectHeaderSentinel}` },
			},
		});
	});

	afterEach(async () => {
		process.env.HOME = originalHome;
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		vi.restoreAllMocks();
		clearFsCache();
		clearConfigValueCache();
		for (const dir of [tempHome, projectDir, userAgentDir]) {
			if (dir) await fs.rm(dir, { recursive: true, force: true });
		}
	});

	async function prepare(name: string): Promise<void> {
		const result = await loadAllMCPConfigs(projectDir, {
			enableProjectConfig: true,
			filterExa: false,
			filterBrowser: false,
		});
		const config = result.configs[name];
		expect(config).toBeDefined();
		// `oauth: false` skips credential injection, which would otherwise depend on
		// unrelated auth state; the contract under test is the `!command` branch alone.
		await new MCPManager(projectDir).prepareConfig(config, { oauth: false });
	}

	test("opting in grants loading, not shell execution, for a project env value", async () => {
		// Opting in still loads it — the gate is a grant, not a removal. Without this,
		// "no sentinel" would be satisfiable by dropping the server.
		const loaded = await loadAllMCPConfigs(projectDir, {
			enableProjectConfig: true,
			filterExa: false,
			filterBrowser: false,
		});
		expect(Object.keys(loaded.configs)).toContain("projenv");

		await prepare("projenv");

		expect(await exists(projectEnvSentinel)).toBe(false);
	});

	test("the same holds for a project header value", async () => {
		await prepare("projhdr");

		expect(await exists(projectHeaderSentinel)).toBe(false);
	});

	test("a user-scope `!command` still runs, so the two rows above are a decision", async () => {
		await writeMcpJson(userAgentDir, {
			mine: { type: "stdio", command: "node", env: { API_KEY: `!touch ${userEnvSentinel}` } },
		});
		clearFsCache();

		await prepare("mine");

		// Personal config is the user's own machine, not a repo someone else controls,
		// so `!command` is a legitimate carrier there. Forcing literal globally would
		// pass the two rows above while silently breaking every such config — and this
		// row is what would go red, which is the point of asserting it.
		expect(await exists(userEnvSentinel)).toBe(true);
	});
});
