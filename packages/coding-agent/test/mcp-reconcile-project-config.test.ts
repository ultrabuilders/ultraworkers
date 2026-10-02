/**
 * Live `mcp.enableProjectConfig` reconciliation.
 *
 * The setting is registered OFF (`mcp/settings.ts`) and `loadAllMCPConfigs` also
 * defaults it off, because a project-scope `mcp.json` travels inside the repository
 * and honouring it lets a cloned repo start processes. `#applyProjectConfig` had
 * `?? true` where the other two read `?? false`, which broke the flag in BOTH
 * directions rather than only the unsafe one:
 *
 *   cached `undefined`, user enables the flag → `undefined ?? true` is `true`, which
 *   equals the requested `true`, so the reconciler returned early and the reload the
 *   listener exists to perform never happened.
 *
 * The consumer-observable failure: the user turns `mcp.enableProjectConfig` on,
 * nothing happens, and nothing is printed — so they go looking for the bug elsewhere.
 * An accidental *enable* at least shows up as strange behaviour; a silent no-op does
 * not.
 *
 * This asserts the outcome, not the expression. The observable is
 * `getSource(name).level`, which `#applyProjectConfig` itself uses and which
 * `connectServers` records for every config before attempting any connection — so
 * this needs no server to actually connect.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { clearCache as clearFsCache } from "@oh-my-pi/pi-coding-agent/capability/fs";
import { MCPManager } from "@oh-my-pi/pi-coding-agent/mcp/manager";
import { setAgentDir, __resetDirsFromEnvForTests } from "@oh-my-pi/pi-utils";
import "@oh-my-pi/pi-coding-agent/discovery";

// `setAgentDir` exports `PI_CODING_AGENT_DIR`; leaving it set past this file hands
// every later suite an agent dir pointing at a temp directory this file deletes.
const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

// `node ./payload.js` against a file that does not exist: the child exits at once
// instead of lingering, so the reconcile path cannot leave an orphan behind.
const PROJECT_SERVER = { type: "stdio", command: "node", args: ["./payload.js"] } as const;

describe("reconciling a live mcp.enableProjectConfig change", () => {
	let tempHome = "";
	let projectDir = "";
	let userAgentDir = "";
	let originalHome: string | undefined;
	let manager: MCPManager | undefined;

	beforeEach(async () => {
		originalHome = process.env.HOME;
		tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "omp-mcp-reconcile-home-"));
		projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-mcp-reconcile-project-"));
		userAgentDir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-mcp-reconcile-agent-"));
		process.env.HOME = tempHome;
		vi.spyOn(os, "homedir").mockReturnValue(tempHome);
		setAgentDir(userAgentDir);
		clearFsCache();
		const projectConfigDir = path.join(projectDir, ".omp");
		await fs.mkdir(projectConfigDir, { recursive: true });
		await fs.writeFile(
			path.join(projectConfigDir, "mcp.json"),
			JSON.stringify({ mcpServers: { projectonly: PROJECT_SERVER } }, null, 2),
		);
	});

	afterEach(async () => {
		await manager?.disconnectAll();
		manager = undefined;
		process.env.HOME = originalHome;
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		vi.restoreAllMocks();
		clearFsCache();
		for (const dir of [tempHome, projectDir, userAgentDir]) {
			if (dir) await fs.rm(dir, { recursive: true, force: true });
		}
	});

	test("enabling the flag takes effect on a manager that never set it", async () => {
		manager = new MCPManager(projectDir);
		// `enableProjectConfig` deliberately OMITTED, not passed as false: this is the
		// shape every real call site uses when the caller has no opinion, and it is
		// what leaves the manager's cached option undefined.
		await manager.discoverAndConnect({ filterExa: false, filterBrowser: false, startupTimeoutMs: 2000 });

		// Off by default, so the project entry is not known yet.
		expect(manager.getSource("projectonly")).toBeUndefined();

		await manager.reconcileProjectConfig(true);

		expect(manager.getSource("projectonly")?.level).toBe("project");
	});

	test("enabling the flag twice does not lose the server", async () => {
		manager = new MCPManager(projectDir);
		await manager.discoverAndConnect({ filterExa: false, filterBrowser: false, startupTimeoutMs: 2000 });

		await manager.reconcileProjectConfig(true);
		await manager.reconcileProjectConfig(true);

		expect(manager.getSource("projectonly")?.level).toBe("project");
	});
});
