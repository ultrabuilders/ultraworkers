/**
 * An extension that registers a tool under a built-in's name wins that name.
 *
 * The diagnostic for this is already covered (`extension-shadow-warning.test.ts`),
 * and the subcommand half of the same asymmetry is covered in
 * `cli-subcommand-registry.test.ts` — `registerSubcommand` *refuses* a built-in
 * verb where the tool registry lets the extension take it. What nothing pinned
 * was the behaviour itself: that a call under the built-in's name really runs the
 * extension's tool, and that the built-in is still reachable afterwards.
 *
 * That second half matters because the shadow warning tells the user exactly
 * this — "the built-in stays reachable only through `ctx.invokeTool`". A warning
 * that names an escape hatch nobody tests is how the corrected docblock in
 * `tools/index.ts` ended up lying in the first place: the prose described an
 * intent, the code did something else, and no assertion separated them.
 *
 * `read` is the built-in shadowed here rather than `bash`, so the delegation runs
 * a real file read instead of a shell command — the assertion is about which
 * implementation answers, not about what either one does.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { ExtensionContext } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import {
	type CreateAgentSessionOptions,
	createAgentSession,
	discoverAuthStorage,
	type ExtensionFactory,
} from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";
import * as logger from "@oh-my-pi/pi-utils/logger";

/** A built-in whose parameters this test does not exercise — it never runs for real. */
const SHADOWED = "read";

/** What the extension's tool returns, so "the extension answered" is unambiguous. */
const SENTINEL = "answered by the extension";

/** The file the delegated native `read` is asked for. */
const NATIVE_SENTINEL = "the native built-in answered";

/** What `ctx.invokeTool` returned, captured from inside the shadowing tool. */
let delegated: string | undefined;

const textOf = (result: { content?: Array<{ type: string; text?: string }> } | undefined): string =>
	(result?.content ?? [])
		.filter(part => part.type === "text")
		.map(part => part.text ?? "")
		.join("");

/**
 * Registers a tool under the built-in's name, and — when it runs — delegates to
 * the native tool of the same name so the test can see both answers.
 */
function shadowingExtension(target: string): ExtensionFactory {
	return pi => {
		pi.registerTool({
			name: SHADOWED,
			label: "Shadow read",
			description: "Extension tool standing in for the built-in read.",
			parameters: type({}),
			async execute(_toolCallId, _params, _signal, _onUpdate, context) {
				// The wrapper binds this context to the tool's own name, so a bare
				// `invokeTool` here is the native built-in of that same name.
				const ctx = context as unknown as ExtensionContext | undefined;
				try {
					const native = await ctx?.invokeTool?.({ path: target });
					delegated = textOf(native);
				} catch (error) {
					delegated = `threw: ${(error as Error).message}`;
				}
				return { content: [{ type: "text", text: SENTINEL }], details: {} };
			},
		});
	};
}

describe("an extension tool registered under a built-in's name", () => {
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
		delegated = undefined;
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

	it("answers under the built-in's name with the extension's own tool", async () => {
		const tempDir = makeTempDir();
		const target = path.join(tempDir, "native.txt");
		fs.writeFileSync(target, NATIVE_SENTINEL);
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [shadowingExtension(target)],
		});
		try {
			const tool = session.getToolByName(SHADOWED);
			if (!tool) throw new Error(`expected a tool named ${SHADOWED}`);
			const result = await tool.execute("shadowed-call", {});

			// Not "the registry holds both and the built-in is picked": the point is
			// which implementation the model would reach by asking for this name.
			expect(textOf(result)).toContain(SENTINEL);
			expect(textOf(result)).not.toContain(NATIVE_SENTINEL);
		} finally {
			await session.dispose();
		}
	});

	it("leaves the built-in reachable through ctx.invokeTool, as the warning promises", async () => {
		// The warning text tells a user whose `read` was taken where to go. If the
		// native-tool resolver stopped resolving, the message would be sending them
		// to a function that no longer exists — and, being a log line, nothing would
		// report it.
		const tempDir = makeTempDir();
		const target = path.join(tempDir, "native.txt");
		fs.writeFileSync(target, NATIVE_SENTINEL);
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [shadowingExtension(target)],
		});
		try {
			const tool = session.getToolByName(SHADOWED);
			if (!tool) throw new Error(`expected a tool named ${SHADOWED}`);
			await tool.execute("shadowed-delegating-call", {});

			expect(delegated).toContain(NATIVE_SENTINEL);
			expect(delegated).not.toContain(SENTINEL);
		} finally {
			await session.dispose();
		}
	});
});
