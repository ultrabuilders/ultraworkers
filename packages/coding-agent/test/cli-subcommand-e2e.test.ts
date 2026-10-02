/**
 * An extension-registered verb must run in a REAL CLI process.
 *
 * ## Why this file exists separately from `cli-subcommand-registry.test.ts`
 *
 * That file drives `run()` in-process, which is the right way to test routing —
 * and it is not evidence the CLI works. The failure this seam was built to kill
 * is silent: the verb routes correctly, the argv reaches the dispatcher, and the
 * handler is never called because nothing was there to call. An in-process test
 * can only assert on what the in-process wiring produces.
 *
 * So this spawns the actual entry module. The bead's gate is explicit that an
 * e2e line running `resolveCliArgv` inside the test process **fails** it, and
 * that the discriminating question is whether the child process's stdout
 * contains prompt content: `omp <verb>` opening a chat with `<verb>` sitting in
 * the prompt is the bug, and only a child process can show it.
 *
 * ## What makes the pair mean something
 *
 * Both halves run the same verb with the same argv through the same binary.
 * With the extension installed the handler's own output is all that appears;
 * without it, nothing is installed to answer, and the argv falls through to
 * `launch`. If the handler were reached on the second run too, the positive
 * case would be proving nothing.
 */
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliEntry = path.join(repoRoot, "packages/coding-agent/src/cli.ts");

/**
 * The extension a user would actually install: a directory under the agent
 * dir's `extensions/`, exporting the default factory `registerSubcommand` is
 * documented on. Its handler prints to stdout, so "did it run" is decidable
 * from the child process alone.
 */
function installVerbExtension(agentDir: string, verb: string): void {
	const dir = path.join(agentDir, "extensions", "demo");
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(
		path.join(dir, "index.ts"),
		`export default function(pi: { registerSubcommand: (name: string, handler: (argv: string[]) => Promise<void>) => void }) {
\tpi.registerSubcommand(${JSON.stringify(verb)}, async argv => {
\t\tprocess.stdout.write("DEPLOY-HANDLER:" + argv.join(","));
\t});
}
`,
		"utf-8",
	);
}

interface CliRun {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

async function runCli(agentDir: string, args: string[]): Promise<CliRun> {
	const proc = Bun.spawn([process.execPath, cliEntry, ...args], {
		stdout: "pipe",
		stderr: "pipe",
		stdin: "ignore",
		env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: agentDir },
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { exitCode, stdout, stderr };
}

describe("omp <verb> in a real CLI process", () => {
	it("CONTROL: with nothing installed to answer, the verb never reaches a handler", async () => {
		using tempDir = TempDir.createSync("@ultraworkers-subcmd-e2e-control-");
		// The agent dir exists but holds no extension, so the verb is unclaimed.
		// `deploy` is deliberately not a built-in and not a reserved word: it falls
		// through to `launch`, which fails fast with no models rather than hanging.
		const run = await runCli(tempDir.path(), ["deploy", "staging"]);

		expect(run.stdout).not.toContain("DEPLOY-HANDLER");
		expect(run.exitCode).not.toBe(0);
	});

	it("runs an installed extension's handler and prints only what it printed", async () => {
		using tempDir = TempDir.createSync("@ultraworkers-subcmd-e2e-");
		installVerbExtension(tempDir.path(), "deploy");

		const run = await runCli(tempDir.path(), ["deploy", "staging"]);

		// Exact bytes, not a substring: the handler is the whole contract here, and a
		// match would also pass if the CLI wrapped the verb in a prompt on the way.
		expect(run.stdout).toBe("DEPLOY-HANDLER:staging");
		expect(run.exitCode).toBe(0);
	});

	it("passes flags through to the handler untouched", async () => {
		using tempDir = TempDir.createSync("@ultraworkers-subcmd-e2e-flags-");
		installVerbExtension(tempDir.path(), "deploy");

		const run = await runCli(tempDir.path(), ["deploy", "prod", "--force", "--tag=v2"]);

		// A verb owns its own grammar — core parses nothing, so nothing is dropped.
		expect(run.stdout).toBe("DEPLOY-HANDLER:prod,--force,--tag=v2");
	});

	it("still sends an ordinary bare prompt to launch, not to a handler", async () => {
		using tempDir = TempDir.createSync("@ultraworkers-subcmd-e2e-prompt-");
		installVerbExtension(tempDir.path(), "deploy");

		// A quoted multi-word prompt arrives as one argv token, which cannot name a
		// verb — so extensions are never loaded for it. It falls to `launch` and dies
		// on the missing model, exactly as a bare word would.
		const run = await runCli(tempDir.path(), ["deploy staging"]);

		expect(run.stdout).not.toContain("DEPLOY-HANDLER");
	});
});
