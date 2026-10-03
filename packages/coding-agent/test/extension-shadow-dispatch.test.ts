/**
 * The behavior an extension author actually observes when their tool takes a
 * built-in's name: THEIR tool runs, and the name stops counting as built-in.
 *
 * `extension-shadow-warning.test.ts` pins the *diagnostic* for that collision —
 * that it is reported and names both claimants. This pins the two consequences
 * the warning merely describes, because a warning that fires while the registry
 * does something else leaves the reader with a message contradicted by the
 * behavior:
 *
 *   1. The registry entry under the built-in's name is the extension's tool, so
 *      dispatch runs the extension's implementation rather than the built-in's.
 *   2. `hasBuiltInTool(name)` is false — the name left the built-in set. That is
 *      what the settings gate, `/mcp` and tool-card rendering read, so it is the
 *      difference between "shadowed for this one call" and "no longer built-in".
 *
 * Neither assertion decides whether the policy is right. Whether an extension
 * *should* be able to take a built-in's name is an open owner decision (see
 * `epic-opencode-99`), and the sibling registry takes the opposite policy —
 * `registerSubcommand` in `extensions/loader.ts` refuses a colliding verb and
 * records both claimants. These describe the behavior as implemented, the same
 * way the `tools/index.ts` docblock now does; they do not endorse it. A ruling
 * that tightens the boundary turns these red, which is the point: the change
 * becomes visible instead of silent.
 *
 * The failure this guards is a reviewer reading `toolRegistry.set` and
 * concluding registration is additive, and shipping an extension whose `bash` is
 * quietly not the built-in `bash`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import {
	type CreateAgentSessionOptions,
	createAgentSession,
	discoverAuthStorage,
	type ExtensionFactory,
} from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";
import * as logger from "@oh-my-pi/pi-utils/logger";

/** A built-in tool name, so registering it is a collision by construction. */
const BUILT_IN = "bash";

/** A name no built-in holds, so registering it is not a collision. */
const NON_COLLIDING = "zz-extension-only-tool";

/**
 * The label the extension gives its tool. The built-in it shadows carries its own,
 * so reading the registry entry under `BUILT_IN` proves which implementation
 * stands there — the dispatch question — rather than inferring it.
 */
const EXTENSION_LABEL = "Shadow bash";

function extensionRegistering(name: string): ExtensionFactory {
	return pi => {
		pi.registerTool({
			name,
			label: name === BUILT_IN ? EXTENSION_LABEL : `Shadow ${name}`,
			description: "Extension tool used to observe which implementation the registry holds.",
			parameters: type({}),
			async execute() {
				return { content: [{ type: "text" as const, text: "extension" }] };
			},
		});
	};
}

describe("an extension tool taking a built-in's name", () => {
	let registryAuthDir: string;
	let modelRegistry: ModelRegistry;
	const tempDirs: string[] = [];

	const makeTempDir = (): string => {
		const dir = path.join(os.tmpdir(), `pi-shadow-dispatch-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		return dir;
	};

	beforeAll(async () => {
		registryAuthDir = path.join(os.tmpdir(), `pi-shadow-dispatch-auth-${Snowflake.next()}`);
		fs.mkdirSync(registryAuthDir, { recursive: true });
		modelRegistry = new ModelRegistry(await discoverAuthStorage(registryAuthDir));
	});

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) removeSyncWithRetries(dir);
		vi.restoreAllMocks();
	});

	afterAll(() => {
		removeSyncWithRetries(registryAuthDir);
	});

	const options = (tempDir: string): CreateAgentSessionOptions => ({
		cwd: tempDir,
		agentDir: tempDir,
		modelRegistry,
		sessionManager: SessionManager.inMemory(),
		settings: Settings.isolated(),
		model: getBundledModel("openai", "gpt-4o-mini"),
		disableExtensionDiscovery: true,
		skills: [],
		contextFiles: [],
		promptTemplates: [],
		slashCommands: [],
		enableMCP: false,
		enableLsp: false,
		rules: [],
		workspaceTree: { rootPath: tempDir, rendered: "", truncated: false, totalLines: 0, agentsMdFiles: [] },
	});

	it("leaves the extension's tool as the one that name dispatches to", async () => {
		const tempDir = makeTempDir();
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [extensionRegistering(BUILT_IN)],
		});

		// The registry entry under the built-in's name is the extension's tool, so a
		// call for that name runs the extension's implementation. Reading the entry
		// is the dispatch question itself: `resolveToolForCall` matches on name, and
		// this is the entry it matches.
		expect(session.getToolByName(BUILT_IN)?.label).toBe(EXTENSION_LABEL);

		await session.dispose();
	});

	// The consequence that outlives the call. `hasBuiltInTool` is what the settings
	// gate, `/mcp` and tool-card rendering read, so a name still claiming to be
	// built-in after an extension took it would keep its built-in treatment in all
	// of those places while dispatching the extension's code.
	//
	// The second assertion is the control that makes this about the shadow rather
	// than about the session: a name nobody took still counts as built-in, so an
	// implementation that answered `false` for everything cannot satisfy both.
	it("stops reporting the taken name as built-in, while an untaken one still does", async () => {
		const tempDir = makeTempDir();
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [extensionRegistering(BUILT_IN)],
		});

		expect(session.hasBuiltInTool(BUILT_IN)).toBe(false);
		expect(session.hasBuiltInTool("read")).toBe(true);

		await session.dispose();
	});

	// The negative contract, and the one that would catch a registry which dropped
	// every name off the built-in set. An extension tool that collides with nothing
	// is an ordinary case, and if it cost the session its built-in provenance the
	// settings gate would stop gating anything.
	it("leaves built-in provenance intact for an extension tool that collides with nothing", async () => {
		const tempDir = makeTempDir();
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [extensionRegistering(NON_COLLIDING)],
		});

		expect(session.hasBuiltInTool(BUILT_IN)).toBe(true);
		expect(session.hasBuiltInTool(NON_COLLIDING)).toBe(false);

		await session.dispose();
	});
});
