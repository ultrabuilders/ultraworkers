/**
 * `registerDoubleEscapeAction` — the seam that opens the double-Escape gesture.
 *
 * The gesture used to be a closed enum (`rewind` | `tree` | `none`) dispatched by a
 * hardcoded two-branch `if/else`, so an extension could not add an action and
 * could not answer the gesture in the place core answers it. The bead's claim is
 * that this is a registration seam, not a missing capability — which is only
 * provable if registration is reachable, attributable, and reversible.
 *
 * The contract each case defends is what the USER observes: which action
 * double-Escape resolves to, and whether suspending the owner hands the gesture
 * back to core. Nothing here asserts that a function was called; the out-of-repo
 * path is covered in `double-escape-action-extension-e2e.test.ts`.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import * as path from "node:path";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { ExtensionRuntime } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { DoubleEscapeAction, Extension } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { TempDir } from "@oh-my-pi/pi-utils";

let sharedTempDir: TempDir;
let modelRegistry: ModelRegistry;
let authStorage: AuthStorage;

beforeAll(async () => {
	sharedTempDir = TempDir.createSync("@pi-double-escape-shared-");
	authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"));
	modelRegistry = new ModelRegistry(authStorage);
});

afterAll(async () => {
	authStorage.close();
	sharedTempDir.removeSync();
});

/**
 * A runner carrying exactly the loaded extensions given — the seam reads no other
 * state, so building the real object with a real (empty) runtime is enough and
 * keeps the assertions on behaviour rather than on a hand-rolled stand-in.
 */
function runnerWith(actionsByExtension: Array<[string, DoubleEscapeAction[]]>): ExtensionRunner {
	const extensions = actionsByExtension.map(([name, actions]) => {
		const extensionPath = path.join(sharedTempDir.path(), name);
		return {
			path: extensionPath,
			resolvedPath: extensionPath,
			registeredProviders: [],
			toolRegistrationListeners: new Set(),
			handlers: new Map(),
			tools: new Map(),
			assistantThinkingRenderers: [],
			fileWriteFallbackHandlers: [],
			fileDeleteFallbackHandlers: [],
			compactionProtections: [],
			messageRenderers: new Map(),
			composerShapes: new Map(),
			outputFormats: new Map(),
			commands: new Map(),
			flags: new Map(),
			shortcuts: new Map(),
			doubleEscapeActions: actions,
			settingIds: [],
			toolNameResolvers: [],
		} as unknown as Extension;
	});
	return new ExtensionRunner(
		extensions,
		new ExtensionRuntime(),
		sharedTempDir.path(),
		SessionManager.inMemory(),
		modelRegistry,
	);
}

function action(id: string, extensionPath: string, description?: string): DoubleEscapeAction {
	return { id, extensionPath, ...(description ? { description } : {}), handler: () => {} };
}

describe("getDoubleEscapeActions", () => {
	it("is empty with no extension registered, so core's dispatch is untouched", () => {
		// The negative contract the whole seam rests on: a host with no
		// double-Escape extension must resolve the gesture exactly as it did
		// before the seam existed. An empty list here is what makes that true —
		// a spuriously non-empty one would silently steal the gesture.
		expect(runnerWith([]).getDoubleEscapeActions()).toEqual([]);
	});

	it("returns one extension's action, attributable to the extension that owns it", () => {
		const owner = path.join(sharedTempDir.path(), "bookmarks");
		const actions = runnerWith([["bookmarks", [action("bookmarks", owner)]]]).getDoubleEscapeActions();

		expect(actions).toHaveLength(1);
		// Attribution is the observable: when the handler throws, the error is
		// reported against the owning extension, and that is only possible if the
		// path travelled with the action rather than being looked up at throw time.
		expect(actions[0]?.extensionPath).toBe(owner);
		expect(actions[0]?.id).toBe("bookmarks");
	});

	it("keeps load order across extensions, which is the tiebreak the dispatch uses", () => {
		const first = path.join(sharedTempDir.path(), "first");
		const second = path.join(sharedTempDir.path(), "second");
		const actions = runnerWith([
			["first", [action("a", first), action("b", first)]],
			["second", [action("c", second)]],
		]).getDoubleEscapeActions();

		// The gesture names ONE action, so the dispatch takes the first and stops.
		// Load order is the only order an extension author can predict, so it is
		// the order the seam must preserve — reversed here, the first-loaded
		// extension would silently lose the gesture to the last one.
		expect(actions.map(a => a.id)).toEqual(["a", "b", "c"]);
		expect(actions.map(a => a.extensionPath)).toEqual([first, first, second]);
	});

	it("returns a snapshot, so unloading mid-iteration cannot splice the list", () => {
		const owner = path.join(sharedTempDir.path(), "bookmarks");
		const loaded = [action("bookmarks", owner)];
		const extensionPath = path.join(sharedTempDir.path(), "bookmarks");
		const extension = {
			path: extensionPath,
			resolvedPath: extensionPath,
			doubleEscapeActions: loaded,
		} as unknown as Extension;
		const runtime = new ExtensionRuntime();
		const runner = new ExtensionRunner(
			[extension],
			runtime,
			sharedTempDir.path(),
			SessionManager.inMemory(),
			modelRegistry,
		);

		const snapshot = runner.getDoubleEscapeActions();
		expect(snapshot).toHaveLength(1);

		// The input controller iterates this while responding to a keystroke. An
		// extension unloading in that window empties the bucket it is reading, and a
		// live view would shift under the loop — the second iteration would read past
		// the end, or fire an action from an extension that is already gone.
		loaded.length = 0;

		// The snapshot taken before the unload is unaffected, which is what lets an
		// in-flight dispatch finish on the value it started with.
		expect(snapshot).toHaveLength(1);
		expect(snapshot[0]?.id).toBe("bookmarks");
		// And the next dispatch sees the post-unload truth: the gesture goes back to
		// core, because an unloaded extension must stop answering it.
		expect(runner.getDoubleEscapeActions()).toEqual([]);
	});
});

describe("what the user is told the gesture does", () => {
	it("carries the description through, since it is the only user-visible change", () => {
		const owner = path.join(sharedTempDir.path(), "bookmarks");
		const runner = runnerWith([["bookmarks", [action("bookmarks", owner, "Jump to a bookmarked message")]]]);

		// Registering an action silently changes what double-Escape does. The
		// description is where a user reads the new answer; dropping it would make
		// the seam invisible rather than merely incomplete.
		expect(runner.getDoubleEscapeActions()[0]?.description).toBe("Jump to a bookmarked message");
	});
});
