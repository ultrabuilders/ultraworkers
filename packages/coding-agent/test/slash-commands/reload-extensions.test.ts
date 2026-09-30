/**
 * `/reload-extensions` must reach extensions with `reason: "reload"`.
 *
 * `emitResourcesDiscover` shipped wired into the runner with a `reason` of
 * `"startup" | "reload"` and had NO call site carrying `"reload"` — the arm was
 * dead code that read exactly like a finished feature. Type checking cannot see
 * that: the parameter union already contained the value, so every type gate was
 * green while the feature was unreachable.
 *
 * So the contract asserted here is the call site, not the type. A registered
 * `resources_discover` handler has to observe an event whose `reason` is
 * `"reload"`. The same test also pins the one thing the command must NOT do:
 * repurpose the existing `/reload`, which is MCP-only and stays that way.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { ResourcesDiscoverEvent } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";
import { BUILTIN_SESSION_SLASH_COMMANDS } from "@oh-my-pi/pi-coding-agent/slash-commands/builtin-session";
import { executeBuiltinSlashCommand } from "@oh-my-pi/pi-coding-agent/slash-commands/builtin-registry";
import type { TuiSlashCommandRuntime } from "@oh-my-pi/pi-coding-agent/slash-commands/types";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { getProjectDir, removeWithRetries, setProjectDir } from "@oh-my-pi/pi-utils";

const originalProjectDir = getProjectDir();

/** A runner holding exactly one active extension that records what it is told. */
async function createRunnerWithDiscoverySpy(cwd: string): Promise<{
	runner: ExtensionRunner;
	seen: ResourcesDiscoverEvent[];
}> {
	const seen: ResourcesDiscoverEvent[] = [];
	const runtime = new ExtensionRuntime();
	const extension = await loadExtensionFromFactory(
		pi => {
			pi.on("resources_discover", async event => {
				seen.push(event);
			});
		},
		cwd,
		new EventBus(),
		runtime,
		"reload-extensions-test",
	);
	// The runner ctor takes (extensions, runtime, cwd, sessionManager,
	// modelRegistry); discovery needs none of the tail three, so the stubs are
	// the narrowest thing that constructs a real one.
	const runner = new ExtensionRunner([extension], runtime, cwd, { getCwd: () => cwd } as never, {} as never);
	return { runner, seen };
}

function createFakeCtx(cwd: string, runner: ExtensionRunner, ui?: { confirm: () => Promise<boolean> }) {
	return {
		session: {
			extensionRunner: runner,
			effectiveExtensionRoots: { explicit: [], mode: "merge", configured: [], configuredLevel: "user" },
			setTitleSystemPrompt: vi.fn(() => {}),
			refreshSkillsAndCommands: vi.fn(async () => {}),
		},
		sessionManager: { getCwd: () => cwd },
		settings: Settings.isolated({}),
		refreshSkillState: vi.fn(async () => {}),
		refreshSlashCommandState: vi.fn(async () => {}),
		showStatus: vi.fn(() => {}),
		showHookNotify: vi.fn(() => {}),
		getToolUIContext: () => (ui ? { confirm: ui.confirm } : undefined),
		editor: { setText: vi.fn(() => {}) },
	} as never as InteractiveModeContext;
}

describe("/reload-extensions", () => {
	let projectDir = "";

	beforeEach(async () => {
		projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-reload-extensions-"));
		setProjectDir(projectDir);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		setProjectDir(originalProjectDir);
		await removeWithRetries(projectDir);
	});

	test('delivers reason "reload" to a registered resources_discover handler', async () => {
		const { runner, seen } = await createRunnerWithDiscoverySpy(projectDir);
		const ctx = createFakeCtx(projectDir, runner);
		const runtime: TuiSlashCommandRuntime = { ctx };

		const result = await executeBuiltinSlashCommand("/reload-extensions", runtime);
		expect(result).toBe(true);

		expect(seen).toHaveLength(1);
		expect(seen[0].reason).toBe("reload");
	});

	test("reports the extensions it discarded instead of reloading silently", async () => {
		const { runner, seen } = await createRunnerWithDiscoverySpy(projectDir);
		const ctx = createFakeCtx(projectDir, runner);
		const runtime: TuiSlashCommandRuntime = { ctx };

		await executeBuiltinSlashCommand("/reload-extensions", runtime);

		// The user asked to know what a reload costs them; a command that unloads
		// live extension state and prints only a generic "done" answers nothing.
		const notices = (ctx.showHookNotify as unknown as ReturnType<typeof vi.fn>).mock.calls.map(call =>
			String(call[0]),
		);
		expect(notices.join("\n")).toContain("unloaded and loaded again");
		expect(seen.map(event => event.reason)).toEqual(["reload"]);
	});

	test("cancels without reloading when the operator declines the confirmation", async () => {
		const { runner, seen } = await createRunnerWithDiscoverySpy(projectDir);
		const confirm = vi.fn(async () => false);
		const ctx = createFakeCtx(projectDir, runner, { confirm });
		const runtime: TuiSlashCommandRuntime = { ctx };

		await executeBuiltinSlashCommand("/reload-extensions", runtime);

		// A declined teardown is the one case where "reload" must NOT be emitted:
		// extensions keep running, so a discovery event would describe a teardown
		// that never happened.
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(seen).toHaveLength(0);
	});
});

describe("/reload keeps its MCP-only meaning", () => {
	test("the pre-existing /mcp reload subcommand is unchanged and still MCP-only", () => {
		const mcp = BUILTIN_SESSION_SLASH_COMMANDS.find(command => command.name === "mcp");
		expect(mcp).toBeDefined();
		const subcommands = mcp?.subcommands ?? [];
		expect(subcommands.find(entry => entry.name === "reload")?.description).toBe("Force reload MCP runtime tools");
		// And no top-level command silently inherited the old name, which is what
		// "do not change what /reload means" actually costs an operator.
		expect(BUILTIN_SESSION_SLASH_COMMANDS.find(command => command.name === "reload")).toBeUndefined();
	});
});
