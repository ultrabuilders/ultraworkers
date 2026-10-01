/**
 * A hook you approved once, and then somebody edited.
 *
 * ## The contract
 *
 * `discoverExtensionPaths` is what turns discovered hook files into loadable
 * extension paths. The rule under test: a hook whose file no longer matches the
 * content recorded for it is **not** among the returned paths, and says so.
 * Without this, edited hook code runs at the privilege the user approved for
 * different code, silently.
 *
 * ## Why a subprocess
 *
 * Two reasons, both about state that cannot be reasoned with inside this
 * process:
 *
 * - `os.homedir()` binds at process start, so assigning `process.env.HOME`
 *   mid-test changes nothing and the probe would quietly measure the developer's
 *   own machine instead of the fixture.
 * - The settings singleton is process-wide. The whole point of the second phase
 *   is "a record written in run 1 is still there in run 2", and an in-process
 *   test cannot distinguish a persisted record from one that merely survived in
 *   memory. Persistence is the load-bearing part — a record that is never
 *   flushed makes every hook first-sight forever and `modified` unreachable.
 *
 * So each phase is a fresh process pointed at the same `PI_CODING_AGENT_DIR`.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const temps: string[] = [];

afterEach(async () => {
	for (const dir of temps.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

/**
 * Run `discoverExtensionPaths` in a fresh process against `agentDir` and report
 * which hook files it would load, plus whether the record reached config.yml.
 */
async function loadHookPaths(agentDir: string): Promise<{ loaded: string[]; config: string }> {
	const script = [
		'import { discoverExtensionPaths } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";',
		'import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";',
		// The startup path initialises the settings singleton before anything reads
		// it; a bare probe that skips this fails on the uninitialised proxy rather
		// than on the behaviour under test.
		"await Settings.init({ cwd: process.cwd(), agentDir: process.env.PI_CODING_AGENT_DIR });",
		"const paths = await discoverExtensionPaths([], process.cwd(), undefined, { ambient: true });",
		'process.stdout.write(JSON.stringify({ loaded: paths.filter(p => p.includes("guard.ts")) }));',
	].join("\n");

	const proc = Bun.spawn(["bun", "-e", script], {
		cwd: process.cwd(),
		env: { ...process.env, PI_CODING_AGENT_DIR: agentDir },
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	expect(await proc.exited, stderr).toBe(0);

	const configPath = path.join(agentDir, "config.yml");
	const config = await fs.readFile(configPath, "utf8").catch(() => "");
	return { loaded: (JSON.parse(stdout) as { loaded: string[] }).loaded, config };
}

/** A hook factory file. Only its bytes matter here, not what it registers. */
const HOOK_SOURCE = `export default function hook(api: { on(e: string, h: () => void): void }) {
	api.on("tool_call", () => {});
}
`;

async function makeAgentDirWithHook(source: string): Promise<{ agentDir: string; hookPath: string }> {
	const agentDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "omp-hook-trust-")));
	temps.push(agentDir);
	const hookDir = path.join(agentDir, "hooks", "pre");
	await fs.mkdir(hookDir, { recursive: true });
	const hookPath = path.join(hookDir, "guard.ts");
	await Bun.write(hookPath, source);
	return { agentDir, hookPath };
}

describe("hook trust", () => {
	test("a hook edited after it was recorded stops being offered for loading", async () => {
		const { agentDir, hookPath } = await makeAgentDirWithHook(HOOK_SOURCE);

		// First sight: recorded, and loaded. This is what keeps hooks that already
		// exist working across an upgrade — the alternative policy blocks every
		// hook on every install with no way to review them.
		const first = await loadHookPaths(agentDir);
		expect(first.loaded).toEqual([hookPath]);

		// The record must be on disk, not merely in the memory of a process that is
		// about to exit. Without this the next run is first sight again.
		expect(first.config).toContain("trustedHash");
		expect(first.config).toContain("pre:");

		// Now edit the file the user approved.
		await Bun.write(hookPath, `${HOOK_SOURCE}\n// edited\n`);

		const second = await loadHookPaths(agentDir);
		expect(second.loaded).toEqual([]);
	});

	test("an unedited hook keeps loading across processes", async () => {
		const { agentDir, hookPath } = await makeAgentDirWithHook(HOOK_SOURCE);

		await loadHookPaths(agentDir);
		const again = await loadHookPaths(agentDir);

		// The control for the row above: if this went red, the first row would pass
		// for the wrong reason — a hook that simply never loads.
		expect(again.loaded).toEqual([hookPath]);
	});

	test("two hooks differing only in tool are recorded separately", async () => {
		const agentDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "omp-hook-trust-two-")));
		temps.push(agentDir);
		const preDir = path.join(agentDir, "hooks", "pre");
		const postDir = path.join(agentDir, "hooks", "post");
		await fs.mkdir(preDir, { recursive: true });
		await fs.mkdir(postDir, { recursive: true });
		await Bun.write(path.join(preDir, "guard.ts"), HOOK_SOURCE);
		await Bun.write(path.join(postDir, "guard.ts"), HOOK_SOURCE);

		const { config } = await loadHookPaths(agentDir);

		// Same name, different hook identity. A record keyed on the file name alone
		// would collide here and one hook's approval would stand in for the other's.
		expect(config).toContain("pre:");
		expect(config).toContain("post:");
	});
});
