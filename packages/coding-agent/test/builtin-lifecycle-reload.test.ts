/**
 * `/reload-extensions` — the operator-facing reload, and the `"reload"` arm of
 * `resources_discover`.
 *
 * What is under test, and why it is easy to get wrong:
 *
 * `emitResourcesDiscover` was written, typed and wired into the runner with a
 * `reason` of `"startup" | "reload"` and had **no call site anywhere in the
 * tree**. Both arms were unreachable, so the `"reload"` union member was a
 * branch that read as a finished feature and could never run. Adding a command
 * that mentions the word "reload" does not fix that; only a call site that
 * actually emits does.
 *
 * So the fixture here is a real extension file, loaded by the real loader, wired
 * to a real `ExtensionRunner` on a real `AgentSession`, driven through the real
 * command spec — and the assertion is what the extension's handler RECEIVED.
 * That is the only form in which the dead arm is observably alive: a spy on an
 * intermediate helper would pass with the call site deleted.
 *
 * The name departs from the bead's suggested `builtin-session.test.ts`: this
 * command lives in `builtin-lifecycle.ts`, and a file named for a different
 * module sends the next reader to the wrong place.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { Agent } from "@oh-my-pi/pi-agent-core";
import { createMockModel } from "@oh-my-pi/pi-ai/providers/mock";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import type { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { BUILTIN_LIFECYCLE_SLASH_COMMANDS } from "@oh-my-pi/pi-coding-agent/slash-commands/builtin-lifecycle";
import type { SlashCommandRuntime } from "@oh-my-pi/pi-coding-agent/slash-commands/types";
import { getProjectAgentDir, getProjectDir, setProjectDir, TempDir } from "@oh-my-pi/pi-utils";
import { createInMemoryAuthStorage } from "./helpers/agent-session-setup";

/**
 * `setProjectDir` calls `process.chdir`, and the reload tier calls it — so a test
 * that runs the command without handing the cwd back leaves EVERY later file in
 * the run with a directory that no longer exists. Measured: restoring it is what
 * keeps the sibling `slash-commands/reload-extensions.test.ts` green when both
 * files run in one `bun test`.
 */
const originalProjectDir = getProjectDir();

/** What the extension's handler saw, one JSON object per line. */
interface DiscoverRecord {
	readonly reason: string;
	readonly cwd: string;
	readonly type: string;
}

const reloadExtensions = BUILTIN_LIFECYCLE_SLASH_COMMANDS.find(command => command.name === "reload-extensions");

describe("/reload-extensions", () => {
	let tempDir: TempDir;
	let authStorage: AuthStorage;
	let session: AgentSession | undefined;

	beforeAll(() => {
		tempDir = TempDir.createSync("@pi-reload-extensions-");
		authStorage = createInMemoryAuthStorage();
		authStorage.keys.setRuntime("anthropic", "test-key");
	});

	afterEach(async () => {
		await session?.dispose();
		session = undefined;
		// Last, and only once the session is gone: `setProjectDir` chdir()s, and the
		// reload tier called it into the temp dir that `afterAll` then removes.
		setProjectDir(originalProjectDir);
	});

	afterAll(async () => {
		authStorage.close();
		await tempDir.remove();
	});

	/**
	 * Write a real extension that records every `resources_discover` it receives,
	 * load it through the real loader, and hand the resulting runner to a real
	 * session. Nothing here stands in for the pipeline — that is the point.
	 */
	async function sessionWithRecordingExtension(): Promise<{
		runtime: SlashCommandRuntime;
		outputs: string[];
		recorded: () => DiscoverRecord[];
		pluginReloads: () => number;
	}> {
		const logPath = tempDir.join("resources-discover.jsonl");
		const extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		fs.writeFileSync(
			path.join(extensionsDir, "records-discover.ts"),
			`import * as fs from "node:fs";
			export default function (pi) {
				pi.on("resources_discover", (event) => {
					fs.appendFileSync(
						${JSON.stringify(logPath)},
						JSON.stringify({ reason: event.reason, cwd: event.cwd, type: event.type }) + "\\n",
					);
					return { skillPaths: [], promptPaths: [], themePaths: [] };
				});
			}
			`,
		);

		const cwd = tempDir.path();
		const loaded = await loadExtensions([path.join(extensionsDir, "records-discover.ts")], cwd);
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions.map(extension => path.basename(extension.path))).toEqual(["records-discover.ts"]);

		const settings = Settings.isolated({ "compaction.enabled": false, "retry.enabled": false });
		const sessionManager = SessionManager.inMemory(cwd);
		const modelRegistry = new ModelRegistry(authStorage, tempDir.join("models.yml"));
		const runner = new ExtensionRunner(loaded.extensions, loaded.runtime, cwd, sessionManager, modelRegistry);
		const model = createMockModel({ provider: "anthropic", responses: [{ content: ["idle"] }] });
		session = new AgentSession({
			agent: new Agent({
				getApiKey: () => "test-key",
				initialState: { model, systemPrompt: [], tools: [] },
				streamFn: model.stream,
			}),
			sessionManager,
			settings,
			modelRegistry,
			extensionRunner: runner,
		});

		const recorded = (): DiscoverRecord[] => {
			if (!fs.existsSync(logPath)) return [];
			return fs
				.readFileSync(logPath, "utf8")
				.split("\n")
				.filter(line => line.length > 0)
				.map(line => JSON.parse(line) as DiscoverRecord);
		};

		const outputs: string[] = [];
		let pluginReloads = 0;
		return {
			outputs,
			recorded,
			pluginReloads: () => pluginReloads,
			runtime: {
				session,
				sessionManager,
				settings,
				cwd,
				output: (text: string) => {
					outputs.push(text);
				},
				refreshCommands: () => {},
				// The reload tier's last step. Counted rather than stubbed to a no-op so
				// the assertion below can say the tier RAN, not merely started.
				reloadPlugins: async () => {
					pluginReloads += 1;
				},
			},
		};
	}

	it('reaches an extension\'s resources_discover handler with reason "reload"', async () => {
		const { runtime, outputs, recorded, pluginReloads } = await sessionWithRecordingExtension();

		// The prior behaviour, stated as a precondition rather than assumed: setting
		// the whole session up — real extension, real loader, real runner — emits
		// nothing. So anything recorded below was caused by the command, which is
		// what makes this a test of the command rather than of the fixture.
		console.error("[reload] after setup, discover records = %d", recorded().length);
		expect(recorded()).toEqual([]);

		const result = await reloadExtensions?.handle?.(
			{ name: "reload-extensions", text: "/reload-extensions", args: "" },
			runtime,
		);

		const seen = recorded();
		// Printed before asserting: the failure this defends is "the handler was
		// never called at all", which is indistinguishable from a wiring mistake in
		// the fixture unless the log says so.
		console.error("[reload] discover records after command = %s", JSON.stringify(seen));
		console.error("[reload] command output = %s", JSON.stringify(outputs));

		expect(seen).toEqual([{ reason: "reload", cwd: runtime.cwd, type: "resources_discover" }]);
		// `rescopeHeadlessToCwd`'s final step, i.e. proof the existing tier ran and
		// was reused rather than bypassed.
		expect(pluginReloads()).toBe(1);
		expect(outputs).toHaveLength(1);
		expect(result).toEqual(expect.objectContaining({ consumed: true }));
	});

	it("tells the operator what the reload discarded, and that nobody was asked", async () => {
		const { runtime, outputs } = await sessionWithRecordingExtension();
		await reloadExtensions?.handle?.({ name: "reload-extensions", text: "/reload-extensions", args: "" }, runtime);

		// The headless tier has no dialog to offer, so the line it prints is the only
		// thing standing between the operator and a reload they did not authorise.
		// A regression that drops the count, or the disclosure, is what this pins.
		expect(outputs).toHaveLength(1);
		expect(outputs[0]).toContain("1 active extension unloaded and loaded again");
		expect(outputs[0]).toContain("no dialog is reachable");
	});

	it("counts only extensions that are actually running", async () => {
		const { runtime } = await sessionWithRecordingExtension();
		const descriptions: Array<string | undefined> = [];

		for (const suspend of [false, true]) {
			const runner = runtime.session.extensionRunner;
			if (!runner) throw new Error("fixture session has no extension runner");
			runner.setSuspendedExtensions(() => suspend);
			descriptions.push(
				reloadExtensions?.getTuiAutocompleteDescription?.({ ctx: { session: runtime.session } } as never),
			);
		}

		console.error("[reload] autocomplete with active then suspended = %s", JSON.stringify(descriptions));
		// A SUSPENDED extension is still in `#loadOrder`, so a count taken from
		// `getLoadedExtensions()` alone reports state that a reload cannot lose —
		// and the operator is warned about losing nothing.
		expect(descriptions[0]).toBe("Reload extensions: 1 active, their running state is discarded");
		expect(descriptions[1]).toBe("Reload extensions: no active extensions, nothing to lose");
	});
});
