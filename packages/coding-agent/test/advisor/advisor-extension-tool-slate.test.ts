import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { type } from "@oh-my-pi/omptype";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { type CreateAgentSessionOptions, createAgentSession } from "@oh-my-pi/pi-coding-agent/sdk";
import type { ExtensionFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { setAgentDir, Snowflake } from "@oh-my-pi/pi-utils";
import { createInMemoryAuthStorage } from "../helpers/agent-session-setup";

/**
 * A tool an extension registers is real for the advisor too.
 *
 * The advisor's tool slate was built by iterating `BUILTIN_TOOLS` alone, so a
 * plugin's tool could be named in `WATCHDOG.yml`, survive config validation, and
 * then match nothing at the intersection in `session-advisors.ts` — the config
 * accepted it, the editor listed the advisor as configured, and the tool never
 * reached the loop. Nothing failed; the advisor just quietly could not use it.
 *
 * This is the half that makes fixing the config layer real. Keeping unknown
 * names in `advisor.tools` is necessary and not sufficient: without the tool in
 * the slate, the name resolves to nothing and the config half is a mutation that
 * survives. Both halves are asserted here — the slate by this file, the
 * surviving name by `advisor/config.test.ts`.
 *
 * The observable is `getAdvisorAvailableToolNames()`, the same list the
 * `/advisor configure` editor offers the user to pick from. Asserting on it
 * rather than on a private field means the test states what a user can observe,
 * and covers the editor's listing as a side effect: before the fix this name was
 * absent from the picker too.
 */
describe("a tool registered by an extension is available to advisors", () => {
	let tempDir: string;
	let originalAgentDir: string | undefined;

	beforeEach(() => {
		tempDir = path.join(os.tmpdir(), `pi-advisor-slate-${Snowflake.next()}`);
		const agentDir = path.join(tempDir, "agent");
		fs.mkdirSync(agentDir, { recursive: true });
		setAgentDir(agentDir);
		originalAgentDir = process.env.PI_CODING_AGENT_DIR;
	});

	afterEach(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	function createOptions(): CreateAgentSessionOptions {
		return {
			cwd: tempDir,
			agentDir: tempDir,
			authStorage: createInMemoryAuthStorage(),
			modelRegistry: undefined as never,
			settings: Settings.isolated(),
			sessionManager: SessionManager.inMemory(),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableMCP: false,
			enableLsp: false,
			skipPythonPreflight: true,
			rules: [],
			preloadedCustomToolPaths: [],
			// The primary's slate is deliberately narrow: this test is about what the
			// ADVISOR can be given, and a session-level `--tools` restriction must not
			// be what puts the name there.
			toolNames: ["read"],
		};
	}

	const extensionTool: ExtensionFactory = pi => {
		pi.registerTool({
			name: "my_extension_tool",
			label: "My Extension Tool",
			description: "Registered by an extension outside the repo.",
			parameters: type({}),
			execute: async () => ({ output: "ok", details: undefined }) as never,
		});
	};

	it("lists it among the tools an advisor can be given", async () => {
		const { session } = await createAgentSession({ ...createOptions(), extensions: [extensionTool] });
		try {
			const available = session.getAdvisorAvailableToolNames();

			expect(available).toContain("my_extension_tool");
		} finally {
			await session.dispose();
		}
	});

	it("does not invent it for a restricted session, which loads no extensions at all", async () => {
		// The negative half, and a real security boundary rather than a bookkeeping
		// one: `restrictToolNames` is how a child session is denied extensions
		// entirely. Mirroring the primary's guard means the slate agrees with it;
		// without the guard a future caller could hand a restricted child tools the
		// primary itself may not use.
		const { session } = await createAgentSession({
			...createOptions(),
			restrictToolNames: true,
			preloadedPreparedExtensions: undefined,
			extensions: [],
		});
		try {
			expect(session.getAdvisorAvailableToolNames()).not.toContain("my_extension_tool");
		} finally {
			await session.dispose();
		}
	});
});
