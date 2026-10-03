/**
 * Built-in provenance survives being torn down, not just being taken.
 *
 * `extension-shadow-dispatch.test.ts` already anchors the registration path: an
 * extension taking `bash` makes `hasBuiltInTool("bash")` false, and that row was
 * measured to fail when `sdk.ts`'s `wrappedExtensionTools` loop stops dropping
 * the name from the built-in set. That covers the moment a name is *taken*.
 *
 * This file covers the inverse transition, driven by settings rather than by an
 * extension: `bash` is admitted only while `bash.enabled` is true, so flipping
 * that setting makes `reconcileBuiltinTools` remove a built-in that is genuinely
 * the product's own. The name has to leave the built-in set as well as the
 * registry, and it has to come back when the setting returns.
 *
 * The round trip is the part worth having. `hasBuiltInTool` cannot report the
 * difference on its own — once the registry entry is gone its second branch
 * answers false whatever the set holds — so a removal that cleared only the
 * registry reads identically at the halfway point. Re-enabling the setting is
 * where the two implementations diverge: the re-add arm skips a name that
 * `isBuiltIn(name)` already claims, so a name left behind in the set comes back
 * missing.
 *
 * Scope, stated because it was measured rather than assumed. `sdk.ts` drops the
 * name from `builtInRegistryToolNames` in the same arm, but that set is not the
 * one a consumer reads: `SessionTools` copies it at construction
 * (`new Set(options.builtInToolNames)`) and maintains its own from the delta the
 * SDK returns. Removing the SDK-side `delete()` therefore left every assertion
 * here green, and no test can anchor it from outside — the session's copy is the
 * authority. The xdev mount path is likewise not covered here.
 *
 * These assert the behavior as implemented. Whether an extension *should* be
 * able to take a built-in's name is the open owner decision in
 * `epic-opencode-99`; a ruling that tightens the boundary turns these red, which
 * is the point.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { getBundledModel } from "@oh-my-pi/pi-catalog/models";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { cfgBashEnabled } from "@oh-my-pi/pi-coding-agent/exec/settings";
import {
	type CreateAgentSessionOptions,
	createAgentSession,
	discoverAuthStorage,
	type ExtensionFactory,
} from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";

/** A settings-gated built-in: `bash` is admitted only while `bash.enabled` is true. */
const GATED_BUILT_IN = "bash";

/**
 * The label the extension gives its tool. The built-in it shares a name with
 * carries its own, so reading the registry entry proves which implementation
 * stands there rather than inferring it.
 */
const EXTENSION_LABEL = "Shadow bash";

function extensionRegistering(name: string): ExtensionFactory {
	return pi => {
		pi.registerTool({
			name,
			label: name === GATED_BUILT_IN ? EXTENSION_LABEL : `Shadow ${name}`,
			description: "Extension tool used to observe which implementation the registry holds.",
			parameters: type({}),
			async execute() {
				return { content: [{ type: "text" as const, text: "extension" }] };
			},
		});
	};
}

describe("built-in provenance when a built-in is torn down under an extension tool", () => {
	let registryAuthDir: string;
	let modelRegistry: ModelRegistry;
	const tempDirs: string[] = [];

	const makeTempDir = (): string => {
		const dir = path.join(os.tmpdir(), `pi-shadow-teardown-${Snowflake.next()}`);
		fs.mkdirSync(dir, { recursive: true });
		tempDirs.push(dir);
		return dir;
	};

	beforeAll(async () => {
		registryAuthDir = path.join(os.tmpdir(), `pi-shadow-teardown-auth-${Snowflake.next()}`);
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

	const options = (tempDir: string, settings = Settings.isolated()): CreateAgentSessionOptions => ({
		cwd: tempDir,
		agentDir: tempDir,
		modelRegistry,
		sessionManager: SessionManager.inMemory(),
		settings,
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

	it("stops reporting a settings-gated built-in as first-party once the setting removes it", async () => {
		// The teardown direction registration cannot reach. `bash` is admitted only
		// while `bash.enabled` is true, so turning it off drives reconcile's removal
		// arm — and that arm has to leave the name out of the built-in set as well as
		// out of the registry.
		//
		// The removal arm is guarded by `if (!registered || !isBuiltIn(name)) continue;`,
		// so it only runs for a name that is *still* a built-in. That is why this row
		// uses no extension: a shadowed name is already non-built-in and skips the arm
		// entirely. `hasBuiltInTool` cannot tell those two cases apart on its own — it
		// answers false for a shadowed name too — so the observable has to be a
		// different built-in's provenance surviving the same pass.
		const tempDir = makeTempDir();
		const { session } = await createAgentSession({ ...options(tempDir) });

		// Preconditions, stated rather than assumed: the built-in is registered, and
		// it is first-party before the setting turns it off.
		expect(session.getToolByName(GATED_BUILT_IN)).toBeDefined();
		expect(session.hasBuiltInTool(GATED_BUILT_IN)).toBe(true);
		expect(session.hasBuiltInTool("read")).toBe(true);

		session.settings.writeValue(cfgBashEnabled, false, "override");
		await session.reconcileBuiltinTools({ refreshPrompt: false });

		// The removed tool leaves the registry…
		expect(session.getToolByName(GATED_BUILT_IN)).toBeUndefined();
		// …and stops being first-party, which is what the settings gate, `/mcp` and
		// tool-card rendering read. A removal that cleared only the registry would
		// leave a name nothing backs still reported as the product's own.
		expect(session.hasBuiltInTool(GATED_BUILT_IN)).toBe(false);
		// The neighbour proves the arm removed this name rather than clearing the set.
		expect(session.hasBuiltInTool("read")).toBe(true);

		// The consequence of getting the set wrong, and the only place it is visible.
		// `hasBuiltInTool` cannot report it on its own: once the registry entry is
		// gone its second branch answers false whatever the set holds. The re-add arm
		// can — it skips a name that `isBuiltIn(name)` already claims
		// (`if (!planned.has(name) || (registered && (isBuiltIn(name) || …))) continue;`),
		// so a removal that left the name in the set makes the tool come back
		// missing. This round trip is the observable difference between dropping the
		// name from the set and dropping it only from the registry.
		session.settings.writeValue(cfgBashEnabled, true, "override");
		await session.reconcileBuiltinTools({ refreshPrompt: false });

		expect(session.getToolByName(GATED_BUILT_IN)).toBeDefined();
		expect(session.hasBuiltInTool(GATED_BUILT_IN)).toBe(true);

		await session.dispose();
	});

	it("keeps an extension tool's provenance through the same reconcile pass", async () => {
		// The negative contract, and the one that catches a removal arm that clears
		// the whole built-in set. An extension tool is never in that set, so a pass
		// that dropped every name would report it as first-party — which is the exact
		// failure the sibling registration row guards against, on the other path.
		const tempDir = makeTempDir();
		const { session } = await createAgentSession({
			...options(tempDir),
			extensions: [extensionRegistering("zz-extension-only-tool")],
		});

		expect(session.hasBuiltInTool("read")).toBe(true);
		expect(session.hasBuiltInTool("zz-extension-only-tool")).toBe(false);

		session.settings.writeValue(cfgBashEnabled, false, "override");
		await session.reconcileBuiltinTools({ refreshPrompt: false });

		expect(session.hasBuiltInTool("read")).toBe(true);
		expect(session.hasBuiltInTool("zz-extension-only-tool")).toBe(false);

		await session.dispose();
	});
});
