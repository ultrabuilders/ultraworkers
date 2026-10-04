/**
 * The programme's own acceptance test, as one executable thing.
 *
 * AGENTS.md states a single test for this repo: an extension written *outside this
 * repo* installs and registers a **tool + slash command + config key + lifecycle
 * hook + TUI panel** without changing a single line of core.
 *
 * That sentence had never been executed as one thing. Measured over every test file
 * that mentions `registerTool` (28 of them, no sampling cap), **zero** also mention
 * both `registerCommand` and `registerSetting` — so no existing test holds all five
 * surfaces at once. Each seam may be individually correct while the conjunction, which
 * is what the programme actually promises, is unverified.
 *
 * So this file closes that gap. Each `it` asserts one surface reaches the *real*
 * registry — the same registries production reads — rather than that the extension
 * function ran. A seam that silently stopped writing to its registry fails here.
 *
 * The extension is written to a temp directory **outside the repo** and loaded
 * through `loadExtensions`, the same entry point the host uses, so nothing here can
 * pass by reaching into an in-repo convenience path.
 */

import { beforeAll, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { lookup } from "../../src/config/registry";
import { ModelRegistry } from "../../src/config/model-registry";
import { AuthStorage } from "../../src/session/auth-storage";
import { loadExtensions } from "../../src/extensibility/extensions/loader";
import { ExtensionRunner } from "../../src/extensibility/extensions/runner";
import { SessionManager } from "../../src/session/session-manager";

/**
 * An out-of-repo extension registering all five surfaces at once.
 *
 * The TUI panel is registered on `session_start`, not at factory time, because the
 * surface arrives as `ctx.ui` on the event — it is not on the `api` object.
 *
 * It was previously written as `typeof ctx.ui.showOverlay === "function"`, which was
 * **false for every value**, so the assertion below passed unconditionally. There is no
 * `showOverlay` on `ExtensionUIContext`: the declared interface has 24 members and no
 * such one, and neither runtime implementation carries it either — the TUI controller's
 * ~50-member object and the frameless fallback in `runner.ts` both lack it. The seam an
 * extension actually has for a panel is `ctx.ui.setWidget`.
 */
const FIVE_SURFACE_EXTENSION = `
export default function (pi) {
	pi.registerTool({
		name: "acceptance_probe",
		description: "Registers a tool from an out-of-repo extension",
		parameters: { type: "object", properties: {} },
		execute: async () => "probe-ok",
	});

	pi.registerCommand("acceptance-probe", {
		description: "Registers a slash command from an out-of-repo extension",
		handler: async () => {},
	});

	pi.registerSetting({
		// The registry refuses an id outside "plugins.<id>.<key>" (config/registry.ts:894),
		// and the error names the fix: "build the id with the injected
		// api.pluginSettingId(<id>, <key>)". So this calls the injected seam rather than
		// hand-writing the folded string.
		//
		// It used to write the literal instead, on the reasoning that an out-of-repo
		// extension cannot import the helper. The import indeed does not resolve, but the
		// premise was wrong about what follows: the host injects the helper onto the api
		// object (extensibility/extensions/loader.ts:261), exactly as it injects
		// \`api.zod\`, and config/registry.ts:899 already tells authors to use it. The
		// in-repo out-of-repo fixture does — test/fixtures/outsider-extension/index.ts:55.
		// Writing the literal made this file the one caller that proved nothing: it would
		// keep passing if the injection were deleted outright.
		id: pi.pluginSettingId("acceptance", "probeEnabled"),
		type: "boolean",
		default: false,
	});

	pi.on("session_start", async (_event, ctx) => {
		globalThis.__acceptanceHookFired = true;
		try {
			ctx.ui.setWidget("acceptance-panel", ["acceptance panel"]);
			globalThis.__acceptancePanelRefusal = null;
		} catch (error) {
			// A bare ExtensionRunner is frameless, and setWidget refuses there rather than
			// silently doing nothing (runner.ts) — on purpose, so an author is never left
			// believing a panel is on screen. Recording the refusal is what lets this file
			// tell "the seam refused loudly" apart from "the seam was never reached".
			globalThis.__acceptancePanelRefusal = error instanceof Error ? error.message : String(error);
		}
	});
}
`;

interface LoadedProbe {
	readonly result: Awaited<ReturnType<typeof loadExtensions>>;
	readonly extensionPath: string;
	/** The temp root, so tests that need a scratch file stay outside the repo too. */
	readonly outside: string;
}

/** Write the extension outside the repo and load it the way the host does. */
async function loadProbeExtension(): Promise<LoadedProbe> {
	// os.tmpdir() is outside the repo by construction; asserting that keeps the
	// "outside this repo" half of the promise from quietly becoming "in a fixture
	// directory", which is where a same-package import could resolve.
	const outside = await fs.promises.mkdtemp(path.join(os.tmpdir(), "ultraworkers-acceptance-"));
	const extensionPath = path.join(outside, "acceptance-extension.ts");
	await fs.promises.writeFile(extensionPath, FIVE_SURFACE_EXTENSION);
	const result = await loadExtensions([extensionPath], outside);
	return { result, extensionPath, outside };
}

/**
 * ONE load, shared by every assertion below.
 *
 * The first version loaded the extension per `it` and four of the five failed — not
 * because the seams were broken but because a tool name, a command name and a setting
 * id are **process-global singletons**: the second load in the same process collides
 * with the first, so the extension came back empty and every registry read saw nothing.
 *
 * That is also the shape the programme's promise actually has. It says *an* extension
 * registers the five surfaces — not that five successive registrations of it do. Loading
 * once and reading five registries is both the passing shape and the honest one.
 */
let probe: LoadedProbe;

beforeAll(async () => {
	probe = await loadProbeExtension();
});

describe("programme acceptance: five surfaces from one out-of-repo extension", () => {
	it("loads the out-of-repo extension with no errors", () => {
		const { result, extensionPath } = probe;
		// A seam that throws during registration surfaces here as a load error, and
		// every other assertion in this file would then pass vacuously on an empty
		// registry — so this is the precondition, not the headline.
		expect(result.errors.map(e => `${path.basename(e.path)}: ${e.error}`)).toEqual([]);
		expect(result.extensions.map(e => e.path)).toEqual([extensionPath]);
	});

	it("registers the tool", () => {
		// `tools` is the loader's own record, keyed by name. Asserting the key rather
		// than `runtime.getAllTools()` is deliberate: that method is *assigned* by the
		// host (runner.ts:1134), so a bare runner has none and asserting through it
		// would test the harness's wiring instead of the extension's registration.
		const names = probe.result.extensions.flatMap(e => [...e.tools.keys()]);
		expect(names).toContain("acceptance_probe");
	});

	it("registers the slash command", () => {
		const names = probe.result.extensions.flatMap(e => [...e.commands.keys()]);
		expect(names).toContain("acceptance-probe");
	});

	it("registers the config key in the process-global settings registry", () => {
		// Settings deliberately do NOT live on the Extension record: they go straight
		// into the process-global registry, which is why unload has to withdraw them by
		// id. So the assertion is against that registry, not against the extension.
		//
		// One assertion, because it now carries both facts at once. The extension builds
		// the id by calling the INJECTED seam, so this lookup can only be defined if the
		// host reached it — delete the injection from loader.ts:261 and `pi.pluginSettingId`
		// is undefined, the factory throws, the extension never registers, and this goes
		// red. That is what the previous version could not do: it compared the helper to a
		// literal on the host side, which holds no matter what the extension did.
		expect(lookup("plugins.acceptance.probe_enabled")).toBeDefined();
	});

	it("delivers the lifecycle hook and reaches the TUI surface from it", async () => {
		const { result } = probe;
		const runner = new ExtensionRunner(
			result.extensions,
			result.runtime,
			os.tmpdir(),
			SessionManager.inMemory(),
			new ModelRegistry(await AuthStorage.create(path.join(probe.outside, "acceptance-auth.db"))),
		);
		const errors: string[] = [];
		runner.onError(error => errors.push(error.error));

		await runner.emit({ type: "session_start" });

		expect(errors).toEqual([]);
		const probeGlobals = globalThis as Record<string, unknown>;
		// Three facts, because the previous version of this asserted
		// `typeof <probe> === "boolean"` — true for `false` as well, so it passed
		// whether the seam worked or not.
		//
		// 1. The hook fired. 2. It was handed a `ui` carrying the panel seam. 3. The seam
		// REFUSED, naming itself — a bare runner is frameless, and the refusal is the
		// behaviour worth pinning: it is the difference between an author being told the
		// panel is unavailable and an author believing it is on screen. A silent no-op
		// here would leave this assertion green, which is the defect being fixed.
		expect(probeGlobals.__acceptanceHookFired).toBe(true);
		expect(typeof probeGlobals.__acceptancePanelRefusal).toBe("string");
		expect(probeGlobals.__acceptancePanelRefusal as string).toContain("setWidget is not available");
	});
});
