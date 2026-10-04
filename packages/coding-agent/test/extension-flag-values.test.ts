import { describe, expect, it } from "bun:test";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import type { Extension, ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";

// Contract: a flag's VALUE belongs to the extension that declared it.
//
// The declaration was always per-extension (`ext.flags` carries `extensionPath`),
// but the resolved value lived in one map shared by every extension, so the last
// extension to register a name silently decided what all the others read. Nothing
// errored and nothing warned: extension A asked for `--verbose`, was told `false`,
// and had no way to tell that was extension B's answer.
//
// Both extensions below share ONE `ExtensionRuntime` on purpose — that shared map
// is the bug, so a harness that gave each its own runtime would be testing a
// situation that cannot occur.

interface LoadedFlag extends Extension {
	api: ExtensionAPI;
}

async function loadPair(
	first: { name: string; default?: boolean | string },
	second: { name: string; default?: boolean | string },
): Promise<{ a: LoadedFlag; b: LoadedFlag; runtime: ExtensionRuntime }> {
	// One runtime for both, exactly as the loader wires a real session.
	const runtime = new ExtensionRuntime();

	const load = async (flag: { name: string; default?: boolean | string }, path: string): Promise<LoadedFlag> => {
		// `getFlag` lives on the API object the factory is handed, not on the
		// `Extension` the loader returns — so the factory has to keep a handle on it.
		let captured: ExtensionAPI | undefined;
		const extension = (await loadExtensionFromFactory(
			(api: ExtensionAPI) => {
				captured = api;
				api.registerFlag(flag.name, { type: "boolean", default: flag.default });
			},
			"/cwd",
			new EventBus(),
			runtime,
			path,
		)) as Extension;
		if (!captured) throw new Error(`factory for ${path} never ran`);
		return Object.assign(extension, { api: captured });
	};

	return { a: await load(first, "/ext/a"), b: await load(second, "/ext/b"), runtime };
}

/** Minimal collaborators: the runner constructor wants them, this path never uses them. */
function runnerFor(extensions: Extension[], runtime: ExtensionRuntime): ExtensionRunner {
	const modelRegistry = {
		providerSource: () => undefined,
		unregisterProvider: () => {},
	} as unknown as ConstructorParameters<typeof ExtensionRunner>[4];
	const sessionManager = { getCwd: () => "/cwd" } as unknown as ConstructorParameters<typeof ExtensionRunner>[3];
	return new ExtensionRunner(extensions, runtime, "/cwd", sessionManager, modelRegistry);
}

describe("per-extension flag values", () => {
	it("gives each extension its own default when two declare the same name", async () => {
		// THE case. A asks for `--verbose` and must get A's default, whatever B did
		// and in whatever order they loaded.
		const { a, b } = await loadPair({ name: "--verbose", default: true }, { name: "--verbose", default: false });

		expect({ extension: "a", value: a.api.getFlag("--verbose") }).toEqual({ extension: "a", value: true });
		expect({ extension: "b", value: b.api.getFlag("--verbose") }).toEqual({ extension: "b", value: false });
	});

	it("does not let a declared flag leak into an extension that never declared it", async () => {
		// The negative half of the same contract. `getFlag` has always gated on the
		// caller's own declarations, and that gate is what makes "not mine" and
		// "declared with no value yet" distinguishable at all.
		const { a } = await loadPair({ name: "--verbose", default: true }, { name: "--verbose", default: false });
		expect(a.api.getFlag("--only-b-knows")).toBeUndefined();
	});

	it("keeps the answer per-extension whichever order the two load in", async () => {
		// "Last registration wins" is only visible if you also run it the other way.
		// With a shared map, one of these two orders gives extension A the wrong
		// answer — and which one is decided by load order, not by anything a caller
		// can see.
		const forward = await loadPair({ name: "--verbose", default: true }, { name: "--verbose", default: false });
		const reversed = await loadPair({ name: "--verbose", default: false }, { name: "--verbose", default: true });

		expect([forward.a.api.getFlag("--verbose"), forward.b.api.getFlag("--verbose")]).toEqual([true, false]);
		expect([reversed.a.api.getFlag("--verbose"), reversed.b.api.getFlag("--verbose")]).toEqual([false, true]);
	});

	it("reports no value for a flag declared without a default, until one is set", async () => {
		// `registerFlag` only wrote to the shared map when a default existed, so a
		// default-less flag read as `undefined`. A backend that starts writing
		// `false` here would silently turn "unset" into "off".
		const { a, b } = await loadPair({ name: "--verbose" }, { name: "--verbose" });
		expect(a.api.getFlag("--verbose")).toBeUndefined();
		expect(b.api.getFlag("--verbose")).toBeUndefined();
	});
});

describe("setFlagValue", () => {
	it("applies a CLI value to every extension that declared the name", async () => {
		// The CLI parses `--verbose` once, with no idea which extension asked for it,
		// so the value has to reach all of them. This is the interim answer while
		// the collision policy (reject / namespace / warn) is still open — it is the
		// one choice that breaks nothing the other three would keep working under.
		const { a, b, runtime } = await loadPair(
			{ name: "--verbose", default: true },
			{ name: "--verbose", default: false },
		);
		const runner = runnerFor([a, b], runtime);

		runner.setFlagValue("--verbose", false);

		expect(a.api.getFlag("--verbose")).toBe(false);
		expect(b.api.getFlag("--verbose")).toBe(false);
	});

	it("changes nothing when no extension declared the name", async () => {
		// A typo on the command line must not create a value that `getFlag` could
		// later hand back to some extension that declares it much further along.
		const { a, b, runtime } = await loadPair(
			{ name: "--verbose", default: true },
			{ name: "--quiet", default: false },
		);
		const runner = runnerFor([a, b], runtime);

		runner.setFlagValue("--not-declared", "x");

		expect(a.api.getFlag("--verbose")).toBe(true);
		expect(b.api.getFlag("--quiet")).toBe(false);
		expect(a.api.getFlag("--not-declared")).toBeUndefined();
	});
});
