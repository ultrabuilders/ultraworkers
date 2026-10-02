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
import { approveHookOnDisk } from "./helpers/approve-hook";

const temps: string[] = [];

afterEach(async () => {
	for (const dir of temps.splice(0)) await fs.rm(dir, { recursive: true, force: true });
});

/**
 * Run `discoverExtensionPaths` in a fresh process against `agentDir` and report
 * which hook files it would load, plus whether the record reached config.yml.
 *
 * `extraRoots` are injected as additional extension roots, the way `--extension`
 * does at startup. They are the case that broke: every root is scanned into one
 * flat hook list, so two roots can each hold a `pre/guard.ts`.
 */
async function loadHookPaths(
	agentDir: string,
	extraRoots: string[] = [],
	approve?: { file: string },
): Promise<{ loaded: string[]; config: string }> {
	const script = [
		'import { injectOmpExtensionCliRoots } from "@oh-my-pi/pi-coding-agent/discovery/omp-extension-roots";',
		'import { discoverExtensionPaths } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";',
		'import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";',
		// The startup path initialises the settings singleton before anything reads
		// it; a bare probe that skips this fails on the uninitialised proxy rather
		// than on the behaviour under test.
		"await Settings.init({ cwd: process.cwd(), agentDir: process.env.PI_CODING_AGENT_DIR });",
		`injectOmpExtensionCliRoots(${JSON.stringify(extraRoots)}, process.env.HOME ?? "/tmp", process.cwd(), { replace: true, mode: "merge" });`,
		...(approve
			? [
					'import { recordHookHash } from "@oh-my-pi/pi-coding-agent/config/hook-settings";',
					'import { loadCapability } from "@oh-my-pi/pi-coding-agent/capability";',
					'import { hookCapability } from "@oh-my-pi/pi-coding-agent/capability/hook";',
					'import { hookContentHash, hookTrustKey } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/trust";',
					// Read the key off the hook rather than deriving it. Measured, and the
					// derivation is layout-dependent: the same `pre/guard.ts` keys as
					// `pre:guard:guard.ts` under an injected extension root but as
					// `pre:guard.ts:guard.ts` under `.claude/hooks`, so a rule written from
					// one of them silently approves a key the loader never asks about.
					`{ const all = (await loadCapability(hookCapability.id, { cwd: process.cwd(), ambient: true })).all;`,
					`  const h = all.find(x => x.path === ${JSON.stringify(approve.file)});`,
					"  if (!h) throw new Error('probe: hook not discovered');",
					"  recordHookHash(hookTrustKey(h), await hookContentHash({ path: h.path }));",
					"}",
				]
			: []),
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
	return {
		loaded: (JSON.parse(stdout) as { loaded: string[] }).loaded,
		config,
	};
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

		// Approved first, then loaded. Approval is explicit since GAP-D3 (a): a hook
		// nobody approved does not load, so the record has to be pinned rather than
		// left to happen as a side effect of looking at it.
		await approveHookOnDisk(agentDir, hookPath);
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

		await approveHookOnDisk(agentDir, hookPath);
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

		await approveHookOnDisk(agentDir, path.join(preDir, "guard.ts"));
		await approveHookOnDisk(agentDir, path.join(postDir, "guard.ts"));
		const { config } = await loadHookPaths(agentDir);

		// Same name, different hook identity. A record keyed on the file name alone
		// would collide here and one hook's approval would stand in for the other's.
		expect(config).toContain("pre:");
		expect(config).toContain("post:");
	});

	test("a hook that is unreadable once is not locked out afterwards", async () => {
		const { agentDir, hookPath } = await makeAgentDirWithHook(HOOK_SOURCE);
		await approveHookOnDisk(agentDir, hookPath);

		// Briefly unreadable — a sync that has not landed, a permissions change, a
		// network mount that blinked. No hash can be computed, so nothing is
		// recorded and nothing is judged.
		await fs.chmod(hookPath, 0o000);
		expect((await loadHookPaths(agentDir)).loaded).toEqual([]);

		// Readable again. This is the row that matters: recording a stand-in hash
		// for the unreadable moment would make this read as an edit and refuse the
		// hook forever, until the user found the record in config.yml by hand and
		// deleted it. The lockout is caused by the gate, not by anything the user
		// did.
		await fs.chmod(hookPath, 0o644);
		expect((await loadHookPaths(agentDir)).loaded).toEqual([hookPath]);
	});

	/**
	 * Timeout is 30s, not Bun's 5s default, because this row spawns THREE cold `bun`
	 * processes where the others spawn one or two — and each cold process pays ~1.1s
	 * to load the coding-agent package. Measured: 3.3s of work inside a 5s budget,
	 * i.e. 33% headroom, against a file whose wall time varied 9.1s–16.1s across five
	 * identical runs on an idle machine. It failed at 5009ms on a cold run and then
	 * passed five times running, which is a budget problem rather than a contract
	 * problem: the same assertions hold every time.
	 *
	 * This is NOT a permission to wait longer for a hang. The three spawns are
	 * inherent — each assertion needs a fresh process, because `os.homedir()` binds at
	 * process start and the settings singleton is process-wide — so the work cannot be
	 * collapsed, only budgeted. 30s matches the convention in `cli-unsettled-command`
	 * and `acp-stdout-hygiene`, which spawn processes too.
	 */
	test("a hook that moves to another root keeps loading", async () => {
		const agentDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "omp-hook-trust-move-")));
		temps.push(agentDir);
		const oldRoot = path.join(agentDir, "old");
		const newRoot = path.join(agentDir, "new");
		await fs.mkdir(path.join(oldRoot, "hooks", "pre"), { recursive: true });
		const hookName = path.join("hooks", "pre", "guard.ts");
		await Bun.write(path.join(oldRoot, hookName), HOOK_SOURCE);

		// Approved inside the child, in the same process and against the same config
		// the discovery then reads. `oldRoot` is injected as a CLI extension root
		// rather than the agent dir, so nothing in this process can reach it; the key
		// comes from the hook itself, in the child.
		const oldHook = path.join(oldRoot, hookName);
		const approve = { file: oldHook };
		expect((await loadHookPaths(agentDir, [oldRoot], approve)).loaded).toEqual([oldHook]);

		// The user moves their extension directory. Same hook identity — same type,
		// tool and name — same bytes, different path. This must not read as an edit:
		// hashing the path into the content hash turned a directory move into a
		// whole hook tree going `modified` at once, silently, with one warn line.
		await fs.rename(oldRoot, newRoot);
		expect((await loadHookPaths(agentDir, [newRoot])).loaded).toEqual([path.join(newRoot, hookName)]);

		// And the tripwire still fires on a genuine edit at the new location.
		await Bun.write(path.join(newRoot, hookName), `${HOOK_SOURCE}\n// edited\n`);
		expect((await loadHookPaths(agentDir, [newRoot])).loaded).toEqual([]);
	}, 30_000);
});
