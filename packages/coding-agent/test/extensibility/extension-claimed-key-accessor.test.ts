import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import { getKeybindings, setKeybindings } from "@oh-my-pi/pi-tui";
import { getProjectAgentDir, logger, TempDir } from "@oh-my-pi/pi-utils";

/**
 * An extension can ask which keys core owns, before it claims one.
 *
 * The refusal was already enforced: `runner.getShortcuts` drops a registration on a
 * claimed key and logs a line. Nothing on the extension's side of that API could
 * answer the question first, so an author shipping `f9` for their own command had
 * to find out from a keypress that did nothing. `getClaimedKeyIds` is the read seam
 * for that — it exists to be consulted *before* `registerShortcut`, which makes its
 * two properties load-bearing rather than cosmetic.
 *
 * First: it must read the host's live bindings, not a table of shipped defaults. A
 * key the user remapped a built-in onto is the case that separates the two — `f7` is
 * on no default list anywhere, so an accessor hard-coded to defaults would call it
 * free and send the author straight into the refusal the accessor was supposed to
 * prevent. Row 2 proves the remap is visible; row 1 is its control, deliberately a
 * key of the *other* provenance (a shipped default) so that a reader broken in
 * either direction — reporting only defaults, or only user keys — turns one row red
 * instead of both passing together.
 *
 * Second: it must be a live read. Extensions load once at startup but answer key
 * prompts whenever the user hits them, and the manager the host installs can change
 * under them (profile switch, keybindings reload). An accessor that snapshotted at
 * load would answer from a table the dispatcher stopped using.
 *
 * Finally the seam has to agree with the enforcement it is meant to pre-empt — row 4
 * ties the accessor to the refusal, so a reader that drifts from the rule it exists
 * to explain is caught rather than left looking correct.
 */
describe("an extension asks which keys core already owns", () => {
	let tempDir: TempDir;
	let extensionsDir: string;
	let sessionManager: SessionManager;
	let sharedTempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;
	let restoreKeybindings: ReturnType<typeof getKeybindings>;
	/** Where the probe extension reports what the accessor returned. */
	let answerPath: string;

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@ultraworkers-claimed-accessor-shared-");
		authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(() => {
		authStorage.close();
		sharedTempDir.removeSync();
	});

	beforeEach(() => {
		tempDir = TempDir.createSync("@ultraworkers-claimed-accessor-");
		extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		sessionManager = SessionManager.inMemory();
		restoreKeybindings = getKeybindings();
		answerPath = path.join(tempDir.path(), "claimed.json");
	});

	afterEach(() => {
		vi.restoreAllMocks();
		setKeybindings(restoreKeybindings);
		tempDir.removeSync();
	});

	/**
	 * One extension: a command that reports what the accessor says, plus a shortcut
	 * claiming `f7`. The command handler is how the accessor is reached at *use*
	 * time rather than only at load, which is what makes row 3 possible.
	 */
	async function loadProbe(): Promise<ExtensionRunner> {
		fs.writeFileSync(
			path.join(extensionsDir, "ext.ts"),
			`import * as fs from "node:fs";
			export default function(pi) {
				pi.registerCommand("probe-claimed", {
					description: "Report the keys core owns",
					handler: async () => {
						fs.writeFileSync(${JSON.stringify(answerPath)}, JSON.stringify([...pi.getClaimedKeyIds()].sort()));
					},
				});
				pi.registerShortcut("f7", { description: "Claims a key", handler: async () => {} });
			}`,
		);
		const result = await loadExtensions([path.join(extensionsDir, "ext.ts")], tempDir.path());
		expect(result.errors).toEqual([]);
		return new ExtensionRunner(result.extensions, result.runtime, tempDir.path(), sessionManager, modelRegistry);
	}

	/**
	 * Ask the loaded extension, through the API it actually holds.
	 *
	 * The answer comes back through a file rather than a return value because a
	 * command handler is `(args, ctx) => Promise<void>` — it has no channel back to
	 * the caller, which is exactly why an extension wanting this information has to
	 * write it out somewhere. Inventing a return value here would have tested a
	 * signature the API does not have.
	 */
	async function ask(runner: ExtensionRunner): Promise<string[]> {
		const command = runner.getCommand("probe-claimed");
		expect(command).toBeDefined();
		await command!.handler("", runner.createCommandContext());
		return JSON.parse(await Bun.file(answerPath).text()) as string[];
	}

	/** The host's manager for a user who remapped `app.session.new` onto `f7`. */
	function hostWithRemapToF7(): KeybindingsManager {
		return KeybindingsManager.inMemory({ "app.session.new": "f7" });
	}

	it("reports a key core ships a default for", async () => {
		// The control row, and it is the default-provenance half of the pair below.
		setKeybindings(KeybindingsManager.inMemory());
		const runner = await loadProbe();

		const claimed = await ask(runner);

		// `escape` is `app.interrupt`'s default, so it is claimed by definition.
		expect(claimed).toContain("escape");
	});

	it("reports a key the user remapped onto a built-in, which no default table mentions", async () => {
		// The scenario. `f7` is the key the extension below tries to claim, and the
		// user has given it to session-new — so the accessor has to say "taken" or
		// it is sending the author into the refusal it exists to prevent.
		setKeybindings(hostWithRemapToF7());
		const runner = await loadProbe();

		const claimed = await ask(runner);

		expect(claimed).toContain("f7");
		// And the default it displaced is gone, or the accessor is reporting a union
		// of defaults and remaps rather than what the dispatcher will actually use.
		expect(claimed).not.toContain("ctrl+n");
	});

	it("answers from the manager that is installed now, not the one installed at load", async () => {
		// Liveness. Same loaded extension, same command, no reload between the two
		// asks — only the host's manager changes, which is what a profile switch or a
		// keybindings reload does. An accessor that snapshotted at load answers from a
		// table the dispatcher already stopped using.
		setKeybindings(KeybindingsManager.inMemory());
		const runner = await loadProbe();
		const before = await ask(runner);

		setKeybindings(hostWithRemapToF7());
		const after = await ask(runner);

		expect(before).not.toContain("f7");
		expect(after).toContain("f7");
	});

	it("agrees with the refusal: a key it calls claimed is one registerShortcut drops", async () => {
		// Without this the accessor is a decorative read that can drift from the rule
		// it claims to explain, and nothing else here would notice — the rows above
		// only prove it can produce a set, not that the set is the right one.
		setKeybindings(hostWithRemapToF7());
		const runner = await loadProbe();
		const claimed = await ask(runner);
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const shortcuts = runner.getShortcuts(hostWithRemapToF7().claimedKeyIds());

		expect(claimed).toContain("f7");
		expect(shortcuts.has("f7" as never)).toBe(false);
	});
});
