import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as url from "node:url";
import { removeWithRetries } from "@oh-my-pi/pi-utils";

const CLI_ENTRY = path.join(import.meta.dir, "..", "src", "cli.ts");
const FIXTURE_PATH = path.join(import.meta.dir, "fixtures", "resources-no-templates-mcp.ts");

describe("ultraworkers read MCP resources", () => {
	let root: string;
	let projectDir: string;
	let agentDir: string;
	let probePath: string;

	beforeEach(async () => {
		root = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-read-mcp-"));
		projectDir = path.join(root, "project");
		agentDir = path.join(root, "agent");
		await Promise.all([fs.mkdir(projectDir), fs.mkdir(agentDir)]);
		// The server below is declared in a PROJECT `.mcp.json`, and
		// `mcp.enableProjectConfig` defaults to FALSE — honouring a project-scope
		// config means running code that arrived with a cloned repo (commit
		// a183f4957d, the RCE fix). Without this opt-in the file is never read, the
		// server is never discovered, and `read` reports "No MCP server has
		// resource" with an empty list — which reads like a broken resource router
		// rather than a config the test never enabled.
		//
		// `config.yml`, not `settings.json`: the CLI migrates a `settings.json` it
		// finds to `config.yml` on startup, so writing the former here leaves the
		// value in a file this test no longer controls and the assertion passes for
		// the wrong reason. Verified by ablation both ways — with this line the probe
		// prints the fixture content; deleting it returns the empty-resources error.
		await Bun.write(path.join(agentDir, "config.yml"), "mcp:\n  enableProjectConfig: true\n");
		await Bun.write(
			path.join(projectDir, ".mcp.json"),
			JSON.stringify({
				mcpServers: {
					fixture: {
						type: "stdio",
						command: process.execPath,
						args: [FIXTURE_PATH],
					},
				},
			}),
		);
		probePath = path.join(root, "probe.ts");
		await Bun.write(
			probePath,
			[
				`import { runCli } from ${JSON.stringify(url.pathToFileURL(CLI_ENTRY).href)};`,
				'await runCli(["read", "test://alpha"]);',
				'await runCli(["read", "urn:fixture:gamma"]);',
				'await runCli(["read", "mcp://test://beta"]);',
				'await runCli(["read", "test://missing"]);',
			].join("\n"),
		);
	});

	afterEach(async () => {
		await removeWithRetries(root);
	});

	async function runReadProbe(): Promise<{ exitCode: number; output: string; error: string }> {
		const proc = Bun.spawn([process.execPath, probePath], {
			cwd: projectDir,
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				HOME: root,
				NO_COLOR: "1",
				PI_CODING_AGENT_DIR: agentDir,
			},
		});
		const stdout = new Response(proc.stdout).text();
		const stderr = new Response(proc.stderr).text();
		const [exitCode, output, error] = await Promise.all([proc.exited, stdout, stderr]);
		return { exitCode, output, error };
	}

	it("reads native, opaque, and wrapped MCP resources and reports missing resources through the CLI", async () => {
		const { exitCode, output, error } = await runReadProbe();

		expect(exitCode).toBe(1);
		expect(output).toContain("fixture content for test://alpha");
		expect(output).toContain("fixture content for urn:fixture:gamma");
		expect(output).toContain("fixture content for test://beta");
		expect(error).toContain('No MCP server has resource "test://missing"');
	}, 30_000);
});
