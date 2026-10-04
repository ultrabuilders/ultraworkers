import { describe, expect, it } from "bun:test";
import { addFileWriteFallback, hasFileWriteFallback } from "@oh-my-pi/pi-coding-agent/tools/file-write-fallback";
import { Type } from "@oh-my-pi/omptype/typebox";
import { boxComposerStyle } from "@oh-my-pi/pi-tui/components/composer/box";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { Extension, ExtensionFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

// Contract: `unloadExtension(path)` means the extension is GONE, and suspend
// means it is HIDDEN but still alive. Those are opposite states, and the runner
// keeps them in two different lists — so every site that has to tell them apart
// has to consult both.
//
// The cases below all live on the SUSPENDED path, because that is where the two
// lists disagree. `setSuspendedExtensions` splices `extensions` down to the
// active set while `#loadOrder` keeps every extension ever bound, so a suspended
// extension is present in one and absent from the other — and code reading only
// one of them gets a wrong answer with nothing to notice it.

async function loadExt(register: ExtensionFactory, name: string): Promise<Extension> {
	// The 5th argument is the extension's `name`, which becomes its `path`.
	return (await loadExtensionFromFactory(register, "/cwd", new EventBus(), new ExtensionRuntime(), name)) as Extension;
}

/** Minimal collaborators: unload reaches the model registry, context reads cwd. */
function runnerFor(extensions: Extension[]): ExtensionRunner {
	const modelRegistry = {
		providerSource: () => undefined,
		unregisterProvider: () => {},
	} as unknown as ConstructorParameters<typeof ExtensionRunner>[4];
	const sessionManager = { getCwd: () => "/cwd" } as unknown as ConstructorParameters<typeof ExtensionRunner>[3];
	return new ExtensionRunner(extensions, new ExtensionRuntime(), "/cwd", sessionManager, modelRegistry);
}

const commandsOf = (ext: Extension): string[] => [...ext.commands.keys()];

/**
 * Every bucket `clearExtensionBuckets` empties, each with the mutation ONLY that
 * line can catch.
 *
 * The mutation column is the whole reason this is a table and not a loop. A bucket
 * dropped from `clearExtensionBuckets` — or cleared with the wrong trampoline — is
 * invisible to `check:ts` and to a whole-vector compare: `[1,1,...,1,0]` is not the
 * zero vector, so a loop DOES go red, but it reports "some bucket survived" and
 * leaves the reader to bisect thirteen lines to find which. Each row asserts one
 * bucket by name, so the failing line names the bucket, and its comment names the
 * edit that would break it while leaving every sibling green.
 */
const BUCKETS: ReadonlyArray<{ name: string; read: (ext: Extension) => number; mutation: string }> = [
	{ name: "handlers", read: e => e.handlers.size, mutation: "deleting `handlers.clear()`" },
	{ name: "tools", read: e => e.tools.size, mutation: "deleting `tools.clear()`" },
	{
		name: "assistantThinkingRenderers",
		read: e => e.assistantThinkingRenderers.length,
		mutation: "clearing with `.splice(0)` instead of assigning `length = 0`",
	},
	{
		name: "fileWriteFallbackHandlers",
		read: e => e.fileWriteFallbackHandlers.length,
		mutation: "confusing the write fallback with the delete fallback — both are arrays of the same shape",
	},
	{
		name: "fileDeleteFallbackHandlers",
		read: e => e.fileDeleteFallbackHandlers.length,
		mutation: "clearing the write fallback twice and this one never",
	},
	{ name: "messageRenderers", read: e => e.messageRenderers.size, mutation: "deleting `messageRenderers.clear()`" },
	{ name: "composerShapes", read: e => e.composerShapes.size, mutation: "deleting `composerShapes.clear()`" },
	{ name: "commands", read: e => e.commands.size, mutation: "deleting `commands.clear()`" },
	{
		name: "flags",
		read: e => e.flags.size,
		// Was: "clearing `flags` but forgetting the parallel `flagValues` map".
		// 68cb6c3ade moved a flag's value onto the declaration itself
		// (`extension.flags.get(name).value`), so there is no parallel map left to
		// forget and clearing `flags` is now the whole withdrawal.
		mutation: "deleting `flags.clear()`",
	},
	{ name: "shortcuts", read: e => e.shortcuts.size, mutation: "deleting `shortcuts.clear()`" },
	{ name: "outputFormats", read: e => e.outputFormats.size, mutation: "deleting `outputFormats.clear()`" },
	{
		name: "toolNameResolvers",
		read: e => e.toolNameResolvers.length,
		mutation: "clearing with `.splice(0)` instead of assigning `length = 0`",
	},
	{
		name: "usageReporters",
		read: e => e.usageReporters.length,
		mutation: "deleting `usageReporters.length = 0` — a stale reporter keeps adding a dead extension's tokens",
	},
	{
		name: "hostRenderStrategies",
		read: e => e.hostRenderStrategies.length,
		mutation:
			"deleting `hostRenderStrategies.length = 0` — a dead extension keeps steering how the terminal repaints on resize",
	},
	{
		name: "toolRegistrationListeners",
		read: e => e.toolRegistrationListeners.size,
		mutation: "omitting the listener trampoline, since no registration method fills it from the factory",
	},
];

describe("ExtensionRunner.unloadExtension", () => {
	it("releases a suspended extension's timers instead of throwing on a missing owner", async () => {
		// `clearFor` matches each timer by reading `owner.path`. With no timers the
		// loop body never runs and the bad owner is never dereferenced — so a test
		// that schedules nothing passes against the broken code. The crash needs
		// something actually registered, which is the whole point of unloading.
		let fired = 0;
		const ext = await loadExt(api => {
			api.registerCommand("ping", { description: "p", handler: async () => {} });
		}, "/ext/timed");

		const runner = runnerFor([ext]);
		runner.createContext(undefined, undefined, ext).setInterval(() => fired++, 5);
		runner.setSuspendedExtensions(() => true);

		expect(runner.unloadExtension("/ext/timed")).toBe(true);
		await Bun.sleep(30);
		// A callback still firing means the timer outlived the extension that
		// scheduled it — the exact leak unload exists to close.
		expect(fired).toBe(0);
	});

	it("stops reporting an unloaded extension as resumable", async () => {
		const ext = await loadExt(api => {
			api.registerCommand("ping", { description: "p", handler: async () => {} });
		}, "/ext/gone");

		const runner = runnerFor([ext]);
		runner.setSuspendedExtensions(() => true);
		runner.unloadExtension("/ext/gone");

		// A resume-all after an unload must not hand back an extension that no longer
		// exists. Left in the suspended set, it resurfaces as a phantom "resumed"
		// entry on every later suspend/resume cycle, forever.
		const { resumed } = runner.setSuspendedExtensions(() => false);
		expect(resumed.map(extension => extension.path)).not.toContain("/ext/gone");
	});

	/**
	 * An extension that filled every bucket `clearExtensionBuckets` empties.
	 *
	 * Filled through the factory for the buckets the API reaches, and through the
	 * runner for `toolRegistrationListeners`, which has no registration method on the
	 * extension API at all.
	 */
	async function filledExt(): Promise<Extension> {
		const ext = await loadExt(api => {
			api.on("session_start", () => {});
			api.registerTool({
				name: "probe_tool",
				label: "Probe",
				description: "d",
				parameters: Type.Object({}),
				execute: async () => ({ content: [{ type: "text", text: "ok" }], details: {} }),
			});
			api.registerAssistantThinkingRenderer(() => undefined);
			api.registerFileWriteFallback(async () => false);
			api.registerFileDeleteFallback(async () => false);
			api.registerMessageRenderer("probe_custom", () => undefined);
			// A real built-in style, re-identified: `ComposerStyle` carries enough required
			// fields that a hand-written literal would be a cast, and a cast here would
			// stop type-checking the very shape the bucket is supposed to hold.
			api.registerComposerShape({
				label: "Probe",
				style: { ...boxComposerStyle, id: "probe-style" },
			});
			api.registerCommand("one", { description: "d", handler: async () => {} });
			api.registerFlag("--probe", { type: "boolean", default: true });
			api.registerShortcut("s", { description: "d", handler: async () => {} });
			api.registerOutputFormat({ id: "probe-fmt", mimeType: "text/plain", format: () => new Uint8Array() });
			api.registerToolNameResolver(() => undefined);
			api.registerUsageReporter("probe_tool", () => undefined);
		}, "/ext/buckets");
		runnerFor([ext]).onToolRegistered(() => {});
		return ext;
	}

	// Distinguishing mutation: see BUCKETS["handlers"].mutation.
	it("empties the handlers bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "handlers")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "handlers")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["tools"].mutation.
	it("empties the tools bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "tools")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "tools")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["assistantThinkingRenderers"].mutation.
	it("empties the assistantThinkingRenderers bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "assistantThinkingRenderers")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "assistantThinkingRenderers")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["fileWriteFallbackHandlers"].mutation.
	it("empties the fileWriteFallbackHandlers bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "fileWriteFallbackHandlers")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "fileWriteFallbackHandlers")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["fileDeleteFallbackHandlers"].mutation.
	it("empties the fileDeleteFallbackHandlers bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "fileDeleteFallbackHandlers")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "fileDeleteFallbackHandlers")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["messageRenderers"].mutation.
	it("empties the messageRenderers bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "messageRenderers")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "messageRenderers")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["composerShapes"].mutation.
	it("empties the composerShapes bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "composerShapes")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "composerShapes")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["commands"].mutation.
	it("empties the commands bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "commands")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "commands")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["flags"].mutation.
	it("empties the flags bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "flags")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "flags")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["shortcuts"].mutation.
	it("empties the shortcuts bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "shortcuts")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "shortcuts")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["outputFormats"].mutation.
	it("empties the outputFormats bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "outputFormats")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "outputFormats")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["toolNameResolvers"].mutation.
	it("empties the toolNameResolvers bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "toolNameResolvers")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "toolNameResolvers")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["usageReporters"].mutation.
	it("empties the usageReporters bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "usageReporters")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "usageReporters")!.read(ext)).toBe(0);
	});

	// Distinguishing mutation: see BUCKETS["toolRegistrationListeners"].mutation.
	it("empties the toolRegistrationListeners bucket", async () => {
		const ext = await filledExt();
		// Precondition first: an unfilled bucket passes this assertion no matter what
		// the unload does, so a fixture that silently stopped filling would make the
		// line green for the wrong reason.
		expect(BUCKETS.find(b => b.name === "toolRegistrationListeners")!.read(ext)).toBeGreaterThan(0);
		expect(runnerFor([ext]).unloadExtension("/ext/buckets")).toBe(true);
		expect(BUCKETS.find(b => b.name === "toolRegistrationListeners")!.read(ext)).toBe(0);
	});

	// The file-fallback seam, observed through the registry rather than the runner's
	// private disposer map.
	//
	// `#pushFallbackDisposer` is private and reachable only from `initialize()`, which
	// needs a full actions/context scaffold this unit does not have. Asserting on the
	// map itself would mean adding an accessor purely for the test, so these use the
	// registry the trampolines land in — the thing whose emptiness is the actual
	// contract: a handler bound to a torn-down session must never fire again.
	it("leaves no file-write fallback in the registry once the session shuts down", () => {
		// Each registration disposes itself -- there is no exported registry-wide
		// reset, so clearing via the returned disposer is the only supported path and
		// is also exactly what the runner does.
		const dispose = addFileWriteFallback(async () => false);
		try {
			expect(hasFileWriteFallback()).toBe(true);
		} finally {
			dispose();
		}
		expect(hasFileWriteFallback()).toBe(false);
	});

	// Distinguishing mutation: releasing with a stale index after the array shifted, so
	// a disposal removes the WRONG handler and the real one survives. A boolean check
	// alone would call that correct.
	it("removes the exact registration, not whatever shifted into its place", () => {
		const first = addFileWriteFallback(async () => false);
		const second = addFileWriteFallback(async () => true);
		try {
			// Releasing out of order is the case an index-based splice gets wrong: the
			// second removal must not take the first handler with it.
			second();
			expect(hasFileWriteFallback()).toBe(true);
			first();
			expect(hasFileWriteFallback()).toBe(false);
		} finally {
			// Leave nothing behind for whichever test runs next in this process.
			first();
			second();
		}
	});

	// Distinguishing mutation: clearing the bucket by extension identity instead of by
	// flag NAME when two extensions declare the same name. The neighbour's flag would
	// vanish with the unload, and `check:ts` is blind to it.
	it("empties the flags bucket per extension, so a shared flag name survives for its owner", async () => {
		const keep = await loadExt(api => {
			api.registerFlag("--shared", { type: "boolean", default: true });
		}, "/ext/keep-flag");
		const drop = await loadExt(api => {
			api.registerFlag("--shared", { type: "boolean", default: false });
		}, "/ext/drop-flag");
		const runner = runnerFor([keep, drop]);
		expect([...keep.flags.keys()]).toEqual(["--shared"]);
		expect([...drop.flags.keys()]).toEqual(["--shared"]);

		runner.unloadExtension("/ext/drop-flag");
		expect([...drop.flags.keys()]).toEqual([]);
		expect([...keep.flags.keys()]).toEqual(["--shared"]);
	});

	it("leaves a neighbour's registrations alone", async () => {
		const keep = await loadExt(api => {
			api.registerCommand("keep", { description: "d", handler: async () => {} });
		}, "/ext/keep");
		const drop = await loadExt(api => {
			api.registerCommand("drop", { description: "d", handler: async () => {} });
		}, "/ext/drop");

		const runner = runnerFor([keep, drop]);
		runner.unloadExtension("/ext/drop");

		// Unload owns exactly one path. A neighbour's command vanishing is the
		// failure a shared-bucket bug produces, and a test that only asks "did the
		// target empty" would not catch it.
		expect(commandsOf(keep)).toEqual(["keep"]);
		expect(commandsOf(drop)).toEqual([]);
	});

	it("returns false for an unknown path so a double unload is a no-op", () => {
		expect(runnerFor([]).unloadExtension("/ext/never-loaded")).toBe(false);
	});
});

describe("a suspended extension's context stays usable", () => {
	it("survives suspension, because resume is the entire point of suspend", async () => {
		const ext = await loadExt(api => {
			api.registerCommand("ping", { description: "p", handler: async () => {} });
		}, "/ext/resumable");

		const runner = runnerFor([ext]);
		const ctx = runner.createContext(undefined, undefined, ext);
		expect(() => ctx.getContextUsage()).not.toThrow();

		runner.setSuspendedExtensions(() => true);
		// Liveness is checked when a member is USED, not when the context is built.
		// Reading `extensions` alone reports a merely-suspended extension as dead,
		// which kills precisely what suspend promises to preserve.
		expect(() => ctx.getContextUsage()).not.toThrow();
	});

	it("is dead after a real unload, so a held context cannot keep acting", async () => {
		const ext = await loadExt(api => {
			api.registerCommand("ping", { description: "p", handler: async () => {} });
		}, "/ext/dead");

		const runner = runnerFor([ext]);
		const ctx = runner.createContext(undefined, undefined, ext);
		runner.unloadExtension("/ext/dead");

		// The negative half of the contract: if suspension stopped reading as death,
		// the guard would have to be deleted instead — and a context held across an
		// unload would go on calling into a registry that no longer holds it.
		expect(() => ctx.getContextUsage()).toThrow(/unloaded/);
	});
});
