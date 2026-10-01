/**
 * An extension can contribute a check to `omp plugin doctor`.
 *
 * The surface was core-owned with no way in: `DoctorCheck` is a closed struct
 * built entirely inside `PluginManager.doctor()`, and the 60-event ExtensionAPI
 * had no doctor event and no `registerDoctorCheck`. An extension shipping a
 * half-loaded resource had nowhere to say so — and the nearest-looking seam,
 * `on("resources_discover")`, contributes paths only, never a diagnostic.
 *
 * Every assertion here is on what `doctor()` RETURNS, which is the list the
 * `omp plugin doctor` command prints. Asserting that the registry holds an entry
 * would stay green while the command ignored it, and that is the whole failure
 * mode: a seam that exists and is not reached is indistinguishable from a
 * feature that was never built.
 *
 * The extension is a real one through the real loader. A hand-built stub would
 * not exercise the validation the loader applies, which is where the interesting
 * rejections live.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ExtensionRuntime, loadExtensionFromFactory } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { clearDiagnostics, collectDiagnostics } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/diagnostics";
import type { Extension, ExtensionAPI } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/types";
import { clearExtensionBuckets } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { PluginManager } from "@oh-my-pi/pi-coding-agent/extensibility/plugins/manager";
import { EventBus } from "@oh-my-pi/pi-coding-agent/utils/event-bus";

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "omp-doctor-seam-"));

afterEach(async () => {
	clearDiagnostics();
	await fs.rm(scratch, { recursive: true, force: true });
});

/** Run the real command surface and return the checks it produces. */
async function runDoctor(): Promise<{ name: string; status: string; message: string }[]> {
	const manager = new PluginManager();
	return manager.doctor();
}

async function loadWith(name: string, body: (api: ExtensionAPI, extension: Extension) => void): Promise<Extension> {
	const extensionPath = path.join(scratch, name);
	await fs.mkdir(extensionPath, { recursive: true });
	const factory = (api: ExtensionAPI): Promise<void> => {
		body(api, api as unknown as Extension);
		return Promise.resolve();
	};
	return loadExtensionFromFactory(factory as never, extensionPath, new EventBus(), new ExtensionRuntime(), name);
}

describe("extension-contributed doctor checks", () => {
	test("a check registered by an extension appears in what doctor returns", async () => {
		await loadWith("contributes", api => {
			api.registerDiagnostic({
				id: "model-cache",
				label: "model cache is writable",
				run: () => ({ status: "warning", message: "cache directory is read-only" }),
			});
		});

		const checks = await runDoctor();
		const contributed = checks.find(check => check.name === "extension:model-cache");

		// The whole point: the command REPORTS it. A registry entry that doctor
		// ignores would leave this undefined while everything else looked right.
		expect(contributed).toBeDefined();
		expect(contributed?.status).toBe("warning");
		expect(contributed?.message).toContain("cache directory is read-only");
	});

	test("the check names the extension that contributed it", async () => {
		// Two extensions can both register a check; without the source in the
		// message a user has no way to act on it.
		await loadWith("names-itself", api => {
			api.registerDiagnostic({
				id: "cache",
				label: "cache",
				run: () => ({ status: "error", message: "unwritable" }),
			});
		});

		const contributed = (await runDoctor()).find(check => check.name === "extension:cache");
		expect(contributed?.message).toContain("names-itself");
	});

	test("run() is evaluated when the doctor runs, not at registration", async () => {
		// A diagnostic describes current state. One computed at load time would be
		// reporting on the past by the time anyone reads it.
		let calls = 0;
		await loadWith("lazy", api => {
			api.registerDiagnostic({
				id: "lazy",
				label: "lazy",
				run: () => {
					calls += 1;
					return { status: "ok", message: `call ${calls}` };
				},
			});
		});

		expect(calls).toBe(0);
		const check = (await runDoctor()).find(entry => entry.name === "extension:lazy");
		expect(calls).toBe(1);
		expect(check?.message).toContain("call 1");
	});

	test("a diagnostic that throws is reported as an error, not dropped", async () => {
		// The dangerous shape: a check vanishes, and the user reads the remaining
		// list as "everything else is fine".
		await loadWith("throws", api => {
			api.registerDiagnostic({
				id: "explodes",
				label: "explodes",
				run: () => {
					throw new Error("probe failed");
				},
			});
		});

		const check = (await runDoctor()).find(entry => entry.name === "extension:explodes");
		expect(check?.status).toBe("error");
		expect(check?.message).toContain("probe failed");
	});

	test("a contributed check never displaces the built-in ones", async () => {
		// A doctor whose own findings an extension could suppress would stop being
		// able to report a fault in the extension that supplied it.
		await loadWith("noisy", api => {
			api.registerDiagnostic({
				id: "noise",
				label: "noise",
				run: () => ({ status: "error", message: "extension shouting" }),
			});
		});

		const checks = await runDoctor();
		expect(checks.some(check => check.name === "package_manifest")).toBe(true);
		expect(checks.some(check => check.name === "node_modules")).toBe(true);
	});

	test("the doctor still returns its built-in findings with no extension loaded", async () => {
		// The negative assertion: registering nothing leaves the command exactly as
		// it was before the seam existed.
		const checks = await runDoctor();
		expect(checks.some(check => check.name === "package_manifest")).toBe(true);
		expect(checks.some(check => check.name.startsWith("extension:"))).toBe(false);
	});
});

describe("registerDiagnostic rejects what it cannot honour", () => {
	const expectRejection = async (name: string, body: (api: ExtensionAPI) => void, expected: RegExp) => {
		// The loader's `register*` methods throw rather than silently ignoring a bad
		// registration, because an ignored one is indistinguishable from one that
		// never happened.
		await expect(loadWith(name, api => body(api))).rejects.toThrow(expected);
	};

	test("a blank id is refused", async () => {
		await expectRejection(
			"blank-id",
			api =>
				api.registerDiagnostic({
					id: "   ",
					label: "x",
					run: () => ({ status: "ok", message: "" }),
				}),
			/non-empty trimmed string/,
		);
	});

	test("a missing label is refused", async () => {
		await expectRejection(
			"blank-label",
			api =>
				api.registerDiagnostic({
					id: "x",
					label: "  ",
					run: () => ({ status: "ok", message: "" }),
				}),
			/must have a label/,
		);
	});

	test("a non-callable run is refused", async () => {
		await expectRejection(
			"not-callable",
			api =>
				api.registerDiagnostic({
					id: "x",
					label: "x",
					run: undefined as unknown as () => { status: "ok"; message: string },
				}),
			/must provide run\(\)/,
		);
	});

	test("a duplicate id in one extension is refused, not shadowed", async () => {
		// Two checks under one name make the doctor report twice under a label the
		// user cannot tell apart, and which one ran becomes anyone's guess.
		await expectRejection(
			"duplicate",
			api => {
				api.registerDiagnostic({ id: "dup", label: "a", run: () => ({ status: "ok", message: "a" }) });
				api.registerDiagnostic({ id: "dup", label: "b", run: () => ({ status: "ok", message: "b" }) });
			},
			/already registered/,
		);
	});
});

describe("the registry releases an extension's checks on unload", () => {
	test("disposing the runner's contribution removes the check", async () => {
		const extension = await loadWith("unloads", api => {
			api.registerDiagnostic({
				id: "transient",
				label: "transient",
				run: () => ({ status: "error", message: "only while loaded" }),
			});
		});

		// Present while loaded — otherwise the seam was never wired.
		expect(collectDiagnostics().some(entry => entry.diagnostic.id === "transient")).toBe(true);

		// And gone after, which is what stops a stale check reporting on a
		// directory that is no longer there and reading as a live fault.
		//
		// Through the REAL unload path, not `clearDiagnostics()`. Clearing the
		// registry from the test proved only that a Map can be emptied: removing
		// the call from the unload path left this test green, because the runner
		// never runs in it. The failure being guarded is one that only appears at
		// unload, so the test has to go through unload.
		clearExtensionBuckets(extension);
		expect(collectDiagnostics().some(entry => entry.diagnostic.id === "transient")).toBe(false);
	});

	test("ExtensionRuntime is constructible, so the seam has a runtime to live in", () => {
		expect(new ExtensionRuntime()).toBeInstanceOf(ExtensionRuntime);
	});
});
