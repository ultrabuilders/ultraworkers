import { describe, expect, it } from "bun:test";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { Extension, ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { ModeRegistry, modeRegistry } from "@oh-my-pi/pi-coding-agent/modes/mode-registry";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";

/**
 * The programme's own test, at the smallest size that states it: an extension
 * *outside* core declares a mode and that mode becomes real.
 *
 * The failure this defends against is silence. A `registerMode` that records a
 * definition somewhere nobody reads looks identical to one that works until an
 * author tries to activate their mode and finds the registry has never heard of
 * it — so every assertion here reads the registry back, the way the status line
 * and the write guard will, rather than checking that a call was made.
 */

const EXTENSION_PATH = "/virtual/outsider-extension";

/**
 * `name` is the extension's identity: `loadExtensionFromFactory` passes it to
 * `createExtension` as BOTH `path` and `resolvedPath`, and `path` is what the
 * unload loop compares, so this is the string a mode is owned by.
 */
async function loadWith(register: (api: ExtensionAPI) => void, name = "outsider-extension"): Promise<Extension> {
	return loadExtensionFromFactory(register, EXTENSION_PATH, new EventBus(), new ExtensionRuntime(), name);
}

describe("extension registerMode", () => {
	it("installs a declared mode that can then be activated", async () => {
		await loadWith(pi => {
			pi.registerMode({
				id: "outsider-alpha",
				name: "Outsider Alpha",
				description: "Declared by an extension that lives outside core.",
				statusLine: { label: "Alpha" },
				enter: () => {},
			});
		});

		// The registry is the thing every consumer reads. If the mode is not in
		// here, no status-line chip and no write policy can ever mention it.
		expect(modeRegistry.has("outsider-alpha")).toBe(true);
		expect(modeRegistry.resolvedMode()).toBeUndefined();

		modeRegistry.setActivation("outsider-alpha");
		expect(modeRegistry.activeId()).toBe("outsider-alpha");
		expect(modeRegistry.resolvedMode()?.statusLine.label).toBe("Alpha");

		// Leave the shared registry as we found it — this is module-global state and
		// a test that leaves a mode active poisons every file that runs after it.
		modeRegistry.setActivation(undefined);
		expect(modeRegistry.activeId()).toBeUndefined();
	});

	it("carries the write policy, so an extension mode can refuse writes", async () => {
		// A mode that can narrow tools but cannot refuse writes is the weaker half
		// of the contract; the policy is what plan mode's guarantee rests on.
		await loadWith(pi => {
			pi.registerMode({
				id: "outsider-beta",
				name: "Outsider Beta",
				description: "Declares a write policy.",
				statusLine: { label: "Beta" },
				writePolicy: { denyDelete: true },
			});
		});

		modeRegistry.setActivation("outsider-beta");
		expect(modeRegistry.writePolicy()).toEqual({ denyDelete: true });

		modeRegistry.setActivation(undefined);
		expect(modeRegistry.writePolicy()).toBeUndefined();
	});

	it("refuses an id that is already taken, naming the extension that holds it", async () => {
		// Two extensions must not both believe they own the same mode: the second
		// would silently displace the first, and the displaced mode keeps whatever
		// state it already applied. The message has to name the holder, because
		// "already registered" alone cannot be acted on when three are loaded.
		expect(() =>
			modeRegistry.register({
				id: "outsider-alpha",
				name: "Impostor",
				description: "x",
				statusLine: { label: "X" },
			}),
		).toThrow(/already registered/);
	});
});

describe("ModeRegistry.unregister", () => {
	it("withdraws a declaration and reports whether there was one", () => {
		const registry = new ModeRegistry();
		registry.register({ id: "temp", name: "Temp", description: "d", statusLine: { label: "T" } });

		expect(registry.unregister("temp")).toBe(true);
		expect(registry.has("temp")).toBe(false);
		// The second call must report "nothing there" rather than throw, because the
		// caller's guard is exactly this return value — an unload that runs twice,
		// or an id a later owner already claimed, must not be an error.
		expect(registry.unregister("temp")).toBe(false);
	});

	it("clears the active mode when that mode is the one withdrawn", () => {
		// Otherwise `resolvedMode()` keeps reporting a record nothing can resolve,
		// and the status line renders a chip for a mode that no longer exists.
		const registry = new ModeRegistry();
		registry.register({
			id: "temp",
			name: "Temp",
			description: "d",
			statusLine: { label: "T" },
			writePolicy: { denyDelete: true },
		});
		registry.setActivation("temp");

		const seen: Array<string | undefined> = [];
		registry.onChange(mode => seen.push(mode?.id));

		registry.unregister("temp");
		expect(registry.activeId()).toBeUndefined();
		expect(registry.resolvedMode()).toBeUndefined();
		expect(registry.writePolicy()).toBeUndefined();
		expect(seen).toEqual([undefined]);
	});

	it("leaves another mode active when a different one is withdrawn", () => {
		// Withdrawing an unused mode must not deactivate the live one — that would
		// silently drop the active mode's write policy while the user is still in it.
		const registry = new ModeRegistry();
		registry.register({ id: "a", name: "A", description: "d", statusLine: { label: "A" } });
		registry.register({ id: "b", name: "B", description: "d", statusLine: { label: "B" } });
		registry.setActivation("b");

		registry.unregister("a");
		expect(registry.activeId()).toBe("b");
	});

	it("reports the source that declared an id, and forgets it on withdrawal", () => {
		// `modeSource` is what makes a stale unload safe, so it has to be readable
		// for a mode declared with a source and absent for one declared without —
		// the built-in modes register with no source, and "no owner" has to be
		// distinguishable from "owner unknown".
		const registry = new ModeRegistry();
		registry.register({ id: "owned", name: "O", description: "d", statusLine: { label: "O" } }, "/ext/owner");
		registry.register({ id: "builtin", name: "B", description: "d", statusLine: { label: "B" } });

		expect(registry.modeSource("owned")).toBe("/ext/owner");
		expect(registry.modeSource("builtin")).toBeUndefined();
		expect(registry.modeSource("never-declared")).toBeUndefined();

		// A withdrawn id must not keep naming its old owner: a re-registration under
		// the same id is what a reload does, and the leftover source would make the
		// new owner look like the old one to the very guard that reads it.
		registry.unregister("owned");
		expect(registry.modeSource("owned")).toBeUndefined();
	});
});

describe("unload does not withdraw a mode a later owner holds", () => {
	// The failure this defends against is a live extension losing its mode with no
	// error anywhere. `unloadExtension` walks ids recorded at load time; by the time
	// it runs, a reloaded copy may already own that id. Without the source check the
	// stale record withdraws the *new* owner's declaration.
	//
	// Driving it through the real runner (not `ModeRegistry` directly) is the point:
	// the guard lives in the unload loop, so a test that skips the loop would stay
	// green with the guard deleted.
	function runnerFor(extensions: Extension[]): ExtensionRunner {
		const modelRegistry = { providerSource: () => undefined, unregisterProvider: () => {} } as never;
		const sessionManager = { getCwd: () => "/cwd" } as never;
		return new ExtensionRunner(extensions, new ExtensionRuntime(), "/cwd", sessionManager, modelRegistry);
	}

	it("keeps a mode re-registered by another extension after a stale runner unloads", async () => {
		// Two runners in one process, which is what the process-global registry
		// actually means in production: each holds its own `extensions` array, so
		// the second unload is NOT short-circuited by the first having spliced the
		// record out. That is the only shape in which a stale record reaches the
		// mode loop at all — a repeat unload on the *same* runner returns false and
		// never gets there.
		const first = await loadWith(pi => {
			pi.registerMode({ id: "contested", name: "First", description: "d", statusLine: { label: "1" } });
		}, "/ext/first");
		const staleRunner = runnerFor([first]);

		// A different runner unloads the same extension. Its record still lists
		// `contested`, so its cleanup loop runs for real.
		expect(runnerFor([first]).unloadExtension("/ext/first")).toBe(true);
		expect(modeRegistry.has("contested")).toBe(false);

		// The freed id is the window: a later owner takes it, exactly as a reloaded
		// copy of the same extension would.
		await loadWith(pi => {
			pi.registerMode({ id: "contested", name: "Second", description: "d", statusLine: { label: "2" } });
		}, "/ext/second");
		expect(modeRegistry.has("contested")).toBe(true);
		expect(modeRegistry.modeSource("contested")).toBe("/ext/second");

		// The stale runner now unloads too. Without the source check it walks its
		// own record, finds `contested`, and withdraws the mode `/ext/second` is
		// using right now — a live extension losing its mode with no error.
		staleRunner.unloadExtension("/ext/first");

		expect(modeRegistry.has("contested")).toBe(true);
		modeRegistry.setActivation("contested");
		expect(modeRegistry.resolvedMode()?.statusLine.label).toBe("2");

		modeRegistry.setActivation(undefined);
		modeRegistry.unregister("contested");
	});

	it("still withdraws its own mode on an ordinary unload", async () => {
		// The negative contract for the guard: skipping on a source mismatch must
		// not turn `unregister` into a no-op. If the check were inverted or always
		// true, this extension would keep its mode forever and a reloaded copy of it
		// would then collide with its own predecessor.
		const owned = await loadWith(pi => {
			pi.registerMode({ id: "owned-until-unload", name: "Owned", description: "d", statusLine: { label: "O" } });
		}, "/ext/owned");

		expect(modeRegistry.modeSource("owned-until-unload")).toBe("/ext/owned");
		expect(runnerFor([owned]).unloadExtension("/ext/owned")).toBe(true);
		expect(modeRegistry.has("owned-until-unload")).toBe(false);
		expect(modeRegistry.modeSource("owned-until-unload")).toBeUndefined();
	});
});
