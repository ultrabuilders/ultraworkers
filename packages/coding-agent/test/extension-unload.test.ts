import { describe, expect, it } from "bun:test";
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

/** One number per bucket `clearExtensionBuckets` empties, in the order it empties them. */
function bucketSizes(ext: Extension): number[] {
	return [
		ext.handlers.size,
		ext.tools.size,
		ext.assistantThinkingRenderers.length,
		ext.fileWriteFallbackHandlers.length,
		ext.fileDeleteFallbackHandlers.length,
		ext.messageRenderers.size,
		ext.composerShapes.size,
		ext.commands.size,
		ext.flags.size,
		ext.shortcuts.size,
		ext.outputFormats.size,
		ext.toolNameResolvers.length,
		ext.toolRegistrationListeners.size,
	];
}

const EMPTY_BUCKETS = new Array(13).fill(0);

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

	it("empties every registration bucket the unloaded extension filled", async () => {
		// Every bucket, not a representative few. `clearExtensionBuckets` is the one
		// place that lists them, and a bucket added there but not filled here would
		// still keep serving after an unload while this test stayed green — the exact
		// rot the shared helper's own comment warns about.
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
		}, "/ext/buckets");

		const runner = runnerFor([ext]);
		// Filled through the runner, not the loader: `toolRegistrationListeners` has no
		// registration method on the extension API at all, so it is unreachable from
		// the factory above.
		runner.onToolRegistered(() => {});

		// Every bucket non-empty, checked ELEMENT BY ELEMENT. Comparing the whole
		// vector against an all-zero vector would pass with a single bucket left
		// unfilled — `[1,1,…,1,0]` is not the zero vector — so the test could not
		// answer "which bucket did we forget to fill", only "was anything filled".
		expect(bucketSizes(ext).every(size => size > 0)).toBe(true);
		expect(runner.unloadExtension("/ext/buckets")).toBe(true);

		// The object survives in the caller's array — the runner only mutates its own
		// view. What must be empty is the CONTENT, so re-registering the same path
		// cannot resurrect a command the author believed they removed.
		expect(bucketSizes(ext)).toEqual(EMPTY_BUCKETS);
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
