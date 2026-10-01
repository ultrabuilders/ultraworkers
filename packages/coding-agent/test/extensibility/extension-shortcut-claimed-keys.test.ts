import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import type { KeyId, KeybindingsConfig } from "@oh-my-pi/pi-tui";
import { getProjectAgentDir, logger, TempDir } from "@oh-my-pi/pi-utils";

/**
 * An extension may not take a key a built-in action currently owns.
 *
 * The rule was always true; what it was checked against was not. `getShortcuts`
 * consulted a hand-kept list of seventeen default keys, so a user who remapped a
 * built-in onto `f7` — a key on no list anywhere — and an extension that claimed
 * `f7` were both satisfied. The extension won, and the remap quietly stopped
 * working: no warning, because nothing at the claim site knew the remap existed.
 *
 * Codex reaches the same verdict from the other end (`tui/src/keymap.rs` reserves
 * only what is structurally unavailable — printable keys for text input, ctrl-z
 * for suspend — and validates everything else against the resolved keymap), which
 * is the shape ported here: derive the answer from the bindings, not from a list
 * of what someone thought to write down.
 *
 * The observable contract is the shortcut map the input controller installs. When
 * this regresses, the user's key does nothing and the extension's key works, with
 * nothing on screen saying why.
 */
describe("an extension shortcut on a key the user remapped onto a built-in", () => {
	let tempDir: TempDir;
	let extensionsDir: string;
	let sessionManager: SessionManager;
	let sharedTempDir: TempDir;
	let modelRegistry: ModelRegistry;
	let authStorage: AuthStorage;

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@pi-shortcut-shared-");
		authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(() => {
		authStorage.close();
		sharedTempDir.removeSync();
	});

	beforeEach(() => {
		tempDir = TempDir.createSync("@pi-shortcut-test-");
		extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
		fs.mkdirSync(extensionsDir, { recursive: true });
		sessionManager = SessionManager.inMemory();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		tempDir.removeSync();
	});

	/** Write one extension claiming `key`, and load it through the real loader. */
	async function loadClaiming(key: string): Promise<ExtensionRunner> {
		fs.writeFileSync(
			path.join(extensionsDir, "ext.ts"),
			`export default function(pi) {
				pi.registerShortcut(${JSON.stringify(key)}, {
					description: "Claims a key",
					handler: async () => {},
				});
			}`,
		);
		const result = await loadExtensions([path.join(extensionsDir, "ext.ts")], tempDir.path());
		return new ExtensionRunner(result.extensions, result.runtime, tempDir.path(), sessionManager, modelRegistry);
	}

	/** The host's real view: what a `keybindings.yml` produces, defaults included. */
	function hostKeys(userBindings: KeybindingsConfig = {}): ReadonlySet<KeyId> {
		return new KeybindingsManager(userBindings).claimedKeyIds();
	}

	it("refuses the claim and says which key it lost, because the user's remap outranks it", async () => {
		// The remap is the whole scenario: app.session.new now answers to f7, which
		// the reserved list never mentioned. Before the fix the extension took f7 and
		// the user's session-new key was dead.
		const runner = await loadClaiming("f7");
		const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

		const shortcuts = runner.getShortcuts(hostKeys({ "app.session.new": "f7" }));

		expect(shortcuts.has("f7")).toBe(false);
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("conflicts with built-in"), expect.any(Object));
	});

	it("accepts the very same claim when the user has not remapped anything onto it", async () => {
		// The negative control. Same extension, same key, different user config — so a
		// suite that only ever registered shortcuts would see a registry that refuses
		// everything and call it a pass.
		const runner = await loadClaiming("f7");

		const shortcuts = runner.getShortcuts(hostKeys());

		expect(shortcuts.get("f7")).toBeDefined();
	});

	it("still refuses a default built-in key when the host supplies no key set at all", async () => {
		// Callers that pass nothing get the shipped defaults, unchanged. Anything else
		// would silently grant extensions ctrl+c on a host that never wired the
		// keybindings manager up.
		const runner = await loadClaiming("ctrl+c");
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const shortcuts = runner.getShortcuts();

		expect(shortcuts.has("ctrl+c")).toBe(false);
	});

	it("returns exactly the shipped behaviour when the host supplies no key set", async () => {
		// Acceptance criterion 2, stated as a diff: for a runner whose extensions
		// claim nothing a user has remapped, the two maps must be identical, not
		// merely similar.
		const defaults = await loadClaiming("ctrl+q");
		vi.spyOn(logger, "warn").mockImplementation(() => {});
		const withFallback = [...defaults.getShortcuts().keys()].sort();

		const hostSupplied = await loadClaiming("ctrl+q");
		const withHostSet = [...hostSupplied.getShortcuts(hostKeys()).keys()].sort();

		expect(withHostSet).toEqual(withFallback);
	});

	it("frees a key the user moved off a built-in, which a growing set would have kept reserved", async () => {
		// Releasing a key is part of remapping too. app.session.new defaults to
		// ctrl+n; moved to alt+j, ctrl+n belongs to nobody and an extension may have
		// it. A set that only accumulated would strand it forever.
		const runner = await loadClaiming("ctrl+n");

		const shortcuts = runner.getShortcuts(hostKeys({ "app.session.new": "alt+j" }));

		expect(shortcuts.has("ctrl+n")).toBe(true);
		expect(shortcuts.has("alt+j")).toBe(false);
	});

	it("refuses a key the user bound to ANY built-in, not only the one it was tested with", async () => {
		// The set is derived from every binding, so remapping an unrelated action —
		// app.session.rename, say — still claims the key. A rule keyed to one action
		// would pass the test above and miss this one.
		const runner = await loadClaiming("f12");
		vi.spyOn(logger, "warn").mockImplementation(() => {});

		const shortcuts = runner.getShortcuts(hostKeys({ "app.session.rename": ["f12", "alt+j"] }));

		expect(shortcuts.has("f12")).toBe(false);
		expect(shortcuts.has("alt+j")).toBe(false);
	});
});
