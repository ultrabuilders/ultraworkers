import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { loadHooks } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/loader";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import type { ExtensionAPI, ExtensionFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

// Contract: `on()` hands back a disposer, and that disposer withdraws exactly
// the one registration it came from.
//
// `on()` used to return `void`, so an extension that registered a handler under
// some condition had no way to take it back out — the handler then outlived
// whatever justified it, across a `/reload` or for the rest of the session.
//
// The parts that are easy to get wrong, and what these cases defend:
//   - removal is by IDENTITY, so a disposer never evicts the neighbour that
//     happens to sit in the slot it was made for;
//   - calling it twice is a no-op, not a second removal of whoever moved in;
//   - the map key is deleted when the last handler goes, so the key set does not
//     grow across reloads;
//   - the disposer stays callable after the registering module has finished
//     running, because the host is what controls the lifetime.

type Handler = (...args: unknown[]) => Promise<unknown>;
const HANDLERS = "__ompDisposerHandlers";

async function loadExt(register: ExtensionFactory, id: string) {
	return loadExtensionFromFactory(register, "/ext", new EventBus(), new ExtensionRuntime(), id);
}

const handlersOf = (ext: { handlers?: Map<string, Handler[]> } | undefined) => ext?.handlers;

describe("extension api on() disposer", () => {
	it("withdraws the handler it came from and leaves the others registered", async () => {
		// The observable difference: after the disposer runs, exactly one of the two
		// registrations fires. A disposer that removed the wrong entry would leave
		// two, or none.
		const fired: string[] = [];
		const ext = await loadExt(api => {
			api.on("session_start", async () => {
				fired.push("first");
			});
			const dispose = api.on("session_start", async () => {
				fired.push("second");
			});
			dispose();
		}, "disposer-basic");

		for (const handler of handlersOf(ext as never)?.get("session_start") ?? []) await handler();
		expect(fired).toEqual(["first"]);
	});

	it("removes by identity, not by the index it was created at", async () => {
		// The disposer is made while "middle" is at index 1. Removing by that index
		// would evict "last" instead, and the invocation order would show it.
		const fired: string[] = [];
		const ext = await loadExt(api => {
			api.on("session_start", async () => {
				fired.push("first");
			});
			const dispose = api.on("session_start", async () => {
				fired.push("middle");
			});
			api.on("session_start", async () => {
				fired.push("last");
			});
			dispose();
		}, "disposer-identity");

		for (const handler of handlersOf(ext as never)?.get("session_start") ?? []) await handler();
		expect(fired).toEqual(["first", "last"]);
	});

	it("does nothing on a second call, instead of evicting the surviving handler", async () => {
		// Without the identity guard, a double dispose silently unregisters
		// somebody else's handler — and the caller has no way to notice.
		const ext = await loadExt(api => {
			const dispose = api.on("session_start", async () => {});
			api.on("session_start", async () => {});
			dispose();
			dispose();
		}, "disposer-double");

		expect(handlersOf(ext as never)?.get("session_start")).toHaveLength(1);
	});

	it("deletes the map key once its last handler is withdrawn", async () => {
		// The key set is what grows across `/reload`: every event an extension ever
		// touched would linger as an empty array if the key were left behind.
		const ext = await loadExt(api => {
			const dispose = api.on("session_before_tree", async () => {});
			dispose();
		}, "disposer-key-cleanup");

		expect(handlersOf(ext as never)?.has("session_before_tree")).toBe(false);
	});
});

describe("hook api on() disposer", () => {
	afterEach(() => {
		Reflect.deleteProperty(globalThis, HANDLERS);
	});

	/**
	 * `loadHooks` dynamic-imports a real path, so a hook module cannot hand a
	 * closure back directly. It parks its disposers on a global, which is the
	 * handover the other hook tests already use.
	 */
	async function loadHookModule(source: string): Promise<Map<string, Handler[]>> {
		const dir = mkdtempSync(path.join(os.tmpdir(), "omp-hook-disposer-"));
		writeFileSync(
			path.join(dir, "hook.ts"),
			`import type { HookAPI } from "@oh-my-pi/pi-coding-agent/extensibility/hooks/types";
const g = globalThis as unknown as Record<string, unknown>;
export default function hook(api: HookAPI) {
${source}
}
`,
		);
		const result = await loadHooks([path.join(dir, "hook.ts")], dir);
		return result.hooks[0]?.handlers as unknown as Map<string, Handler[]>;
	}

	it("withdraws the handler it came from", async () => {
		const fired: string[] = [];
		(globalThis as unknown as Record<string, unknown>).fired = fired;
		try {
			const handlers = await loadHookModule(`
	api.on("session_start", async () => { (globalThis as unknown as { fired: string[] }).fired.push("first"); });
	const dispose = api.on("session_start", async () => { (globalThis as unknown as { fired: string[] }).fired.push("second"); });
	dispose();
`);
			for (const handler of handlers.get("session_start") ?? []) await handler();
			expect(fired).toEqual(["first"]);
		} finally {
			Reflect.deleteProperty(globalThis, "fired");
		}
	});

	it("stays callable after the module finished loading, and still withdraws", async () => {
		// The point of a disposer is that the HOST decides when a registration ends,
		// which is after the registering module has returned. A disposer that only
		// worked inside the module would satisfy the case above and still be useless,
		// so this asserts the effect after the module is gone — not that a function
		// came back.
		const handlers = await loadHookModule(`
	(globalThis as unknown as Record<string, unknown>).${HANDLERS} = api.on("session_start", async () => {});
`);
		expect(handlers.get("session_start")).toHaveLength(1);

		const dispose = (globalThis as unknown as Record<string, unknown>)[HANDLERS] as (() => void) | undefined;
		dispose?.();

		expect(handlers.get("session_start")).toBeUndefined();
	});
});
