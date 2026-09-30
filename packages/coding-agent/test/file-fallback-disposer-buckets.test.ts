import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
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
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "omp-fallback-buckets-"));
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
