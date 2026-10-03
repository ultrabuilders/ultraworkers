/**
 * An extension that registers a tool under a built-in's name takes that name —
 * the built-in is dropped from the active set and only the extension's tool
 * runs. That asymmetry is an open owner decision, so nothing here decides it.
 * What this pins is the diagnostic: the collision is reported, naming both
 * claimants, exactly as the sibling registry already does for verbs
 * (`registerSubcommand` in `extensions/loader.ts` warns on a colliding verb).
 *
 * The failure this guards is silence. The sibling registry warns; this path
 * overwrote the entry with no message at all, so an extension written outside
 * this repo had no signal that its `bash` was no longer the built-in `bash`.
 * A reviewer reading that path sees `toolRegistry.set` and reasonably concludes
 * registration is additive.
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

function extensionRegistering(name: string): ExtensionFactory {
	return pi => {
		pi.registerTool({
			name,
			label: `Shadow ${name}`,
			description: "Extension tool used to observe what the registry reports.",
			parameters: type({}),
			async execute() {
				return { content: [{ type: "text", text: "extension" }] };
			},
		});
	};
}

describe("an extension tool shadowing a built-in is reported", () => {
	let registryAuthDir: string;
	let modelRegistry: ModelRegistry;
	const tempDirs: string[] = [];

	const makeTempDir = (): string => {
		const dir = path.join(os.tmpdir(), `pi-shadow-warn-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		return dir;
	};

	beforeAll(async () => {
		registryAuthDir = path.join(os.tmpdir(), `pi-shadow-warn-auth-${Snowflake.next()}`);
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

	it("warns, naming the tool and the extension that shadowed a built-in", async () => {
		const tempDir = makeTempDir();
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});

		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [extensionRegistering(BUILT_IN)],
		});

		const shadowing = warn.mock.calls
			.map(call => String(call[0] ?? ""))
			.filter(message => message.includes(`"${BUILT_IN}"`));
		expect(shadowing.length).toBeGreaterThan(0);
		expect(shadowing.some(message => message.includes("shadows a built-in"))).toBe(true);
		// The message has to name the extension too: an anonymous collision report
		// tells the reader that something happened but not which of their
		// extensions to go and fix.
		expect(shadowing.some(message => message.startsWith("Extension "))).toBe(true);

		await session.dispose();
	});

	// The control. Without it, "logger.warn was called" would also be satisfied by a
	// warning on every registered extension tool, which is not the contract: only a
	// collision is worth a user's attention.
	it("stays silent for an extension tool that collides with nothing", async () => {
		const tempDir = makeTempDir();
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});

		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [extensionRegistering(NON_COLLIDING)],
		});

		const aboutShadowing = warn.mock.calls
			.map(call => String(call[0] ?? ""))
			.filter(message => message.includes("shadows a built-in"));
		expect(aboutShadowing).toEqual([]);

		await session.dispose();
	});
});
