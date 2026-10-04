import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	ExtensionContextDisposedError,
	ExtensionRunner,
} from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { getProjectAgentDir } from "@oh-my-pi/pi-utils";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { hasFileWriteFallback } from "@oh-my-pi/pi-coding-agent/tools/file-write-fallback";

// Contract: releasing ONE extension's file-fallback trampoline leaves every other
// extension's installed.
//
// A flat disposer list can only express "release all of them" — the all-or-nothing
// behaviour per-extension teardown exists to avoid. Releasing A would unhook B's
// fallback, so B silently stops handling a denied write with nothing logged.
//
// Driven through the real load path rather than by filling the `#private` bucket
// map, so the test cannot pass against a field name that has drifted.

/** `initialize` wires the whole runtime; the fallback trampolines need only that it ran. */
const ACTIONS = { sendMessage: () => {} } as never;

async function harness() {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ultraworkers-fallback-buckets-"));
	const extensionsDir = getProjectAgentDir(dir);
	await fs.mkdir(extensionsDir, { recursive: true });
	const source = (marker: string) => `
		export default function (pi) {
			pi.registerFileWriteFallback(async () => {
				Reflect.set(globalThis, "ompFallbackProbe", ${JSON.stringify(marker)});
				return true;
			});
		}
	`;
	await fs.writeFile(path.join(extensionsDir, "mine.ts"), source("mine"));
	await fs.writeFile(path.join(extensionsDir, "theirs.ts"), source("theirs"));
	const loaded = await loadExtensions(
		[path.join(extensionsDir, "mine.ts"), path.join(extensionsDir, "theirs.ts")],
		dir,
	);
	const runner = new ExtensionRunner(
		loaded.extensions,
		loaded.runtime,
		dir,
		SessionManager.inMemory(dir),
		undefined as never,
	);
	return { dir, runner, loaded };
}

describe("file fallback disposer buckets", () => {
	it("releasing one extension leaves the other's fallback working", async () => {
		const { dir, runner, loaded } = await harness();
		try {
			// Nothing is wired until the runner initialises; that installs one
			// trampoline per extension that declared a fallback.
			runner.initialize(ACTIONS, {} as never, undefined, undefined, "rpc");

			runner.disposeFileFallbacksFor(loaded.extensions[0]!.path);

			// Still installed. Releasing ONE bucket must not unhook the neighbour's
			// trampoline — with a flat disposer list this would be false, which is
			// the silent all-or-nothing teardown this change exists to remove.
			expect(hasFileWriteFallback()).toBe(true);
		} finally {
			runner.disposeFileFallbacks();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("forgets the bucket, so a second release cannot re-run its disposers", async () => {
		const { dir, runner, loaded } = await harness();
		try {
			runner.initialize(ACTIONS, {} as never, undefined, undefined, "rpc");
			runner.disposeFileFallbacksFor(loaded.extensions[0]!.path);
			// Releasing again must be a no-op, not a second run of the same disposer.
			runner.disposeFileFallbacksFor(loaded.extensions[0]!.path);
			expect(hasFileWriteFallback()).toBe(true);
		} finally {
			runner.disposeFileFallbacks();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("drains every bucket on teardown", async () => {
		const { dir, runner, loaded } = await harness();
		runner.initialize(ACTIONS, {} as never, undefined, undefined, "rpc");
		runner.disposeFileFallbacks();
		// Nothing left to dispatch to: both trampolines released.
		expect(hasFileWriteFallback()).toBe(false);
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe("unloadExtension", () => {
	it("removes the extension from the registry and from the load order", async () => {
		const { dir, runner, loaded } = await harness();
		try {
			runner.initialize(ACTIONS, {} as never, undefined, undefined, "rpc");
			const path = loaded.extensions[0]!.path;
			expect(runner.isExtensionActive(path)).toBe(true);

			expect(runner.unloadExtension(path)).toBe(true);

			expect(runner.isExtensionActive(path)).toBe(false);
			// `#loadOrder` must lose it too: `getLoadedExtensions()` reads that first,
			// so leaving it would reinstall trampolines on the next initialize().
			expect(runner.getLoadedExtensions().map(e => e.path)).not.toContain(path);
		} finally {
			// The fallback registry is process-wide, and `bun test` runs every file
			// in one process. These two tests were the only ones here that skipped
			// this, so their `return true` trampolines outlived the file and consumed
			// every later denied write in the suite — which made
			// `tools/file-write-fallback.test.ts` red in a full run and green alone.
			runner.disposeFileFallbacks();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("is a no-op for an unknown path, so a double unload does not throw", async () => {
		const { dir, runner, loaded } = await harness();
		try {
			runner.initialize(ACTIONS, {} as never, undefined, undefined, "rpc");
			const path = loaded.extensions[0]!.path;
			expect(runner.unloadExtension(path)).toBe(true);
			// A caller racing a disable toggle must not have to guard.
			expect(runner.unloadExtension(path)).toBe(false);
			expect(runner.unloadExtension("/ext/never-loaded.ts")).toBe(false);
		} finally {
			// The fallback registry is process-wide, and `bun test` runs every file
			// in one process. These two tests were the only ones here that skipped
			// this, so their `return true` trampolines outlived the file and consumed
			// every later denied write in the suite — which made
			// `tools/file-write-fallback.test.ts` red in a full run and green alone.
			runner.disposeFileFallbacks();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});

	it("leaves the surviving extension's fallback installed", async () => {
		const { dir, runner, loaded } = await harness();
		try {
			runner.initialize(ACTIONS, {} as never, undefined, undefined, "rpc");
			runner.unloadExtension(loaded.extensions[0]!.path);
			expect(hasFileWriteFallback()).toBe(true);
		} finally {
			runner.disposeFileFallbacks();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});

describe("extension context self-invalidation", () => {
	it("throws a NAMED error once the owning extension is unloaded", async () => {
		// An unloaded extension keeping its context keeps steering the session, and
		// can end up steering a NEWER extension through it with nothing logged. The
		// name matters as much as the throw: anonymous here reads as an extension bug.
		const { dir, runner, loaded } = await harness();
		try {
			runner.initialize(ACTIONS, {} as never, undefined, undefined, "rpc");
			const ext = loaded.extensions[0]!;
			const ctx = runner.createContext(undefined, undefined, ext);

			// Alive: both a method and the GETTER must work. The getter is the trap —
			// a guard built with `{...ctx}` evaluates it at build time and breaks here.
			expect(typeof ctx.hasUI).toBe("boolean");
			expect(ctx.mode).toBeDefined();

			expect(runner.unloadExtension(ext.path)).toBe(true);

			let thrown: unknown;
			try {
				(ctx as unknown as { getContextUsage: () => unknown }).getContextUsage();
			} catch (error) {
				thrown = error;
			}
			expect(thrown).toBeInstanceOf(ExtensionContextDisposedError);
			expect((thrown as Error).name).toBe("ExtensionContextDisposedError");
			expect((thrown as Error).message).toContain(ext.path);

			// The getter is guarded too, not just methods.
			let getterThrew = false;
			try {
				void ctx.model;
			} catch (error) {
				getterThrew = error instanceof ExtensionContextDisposedError;
			}
			expect(getterThrew).toBe(true);
		} finally {
			runner.disposeFileFallbacks();
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});
