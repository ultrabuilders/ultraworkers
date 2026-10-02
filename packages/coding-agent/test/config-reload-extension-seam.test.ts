import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import {
	hasAfterConfigReloadHandlers,
	hasConfigReloadHandlers,
	runConfigReloadPass,
} from "@oh-my-pi/pi-coding-agent/config/reload-observer";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";

/**
 * The registry rows live in `config-reload-seam.test.ts`, the watch path rows in
 * `config-reload-watch-path.test.ts`. This file covers the level between them,
 * and is separate for the same reason those two are: the defect this bead closed
 * was a link no test could reach, so mixing three levels into one file makes it
 * impossible to say which level caught a future break.
 *
 * Each extension is loaded through the real loader in a real project directory,
 * so what is asserted is what an author outside this repository sees. The
 * failure each row names:
 *
 *  - registration is invisible — the registry the watcher consults stays empty,
 *    so a shipped build answers "config reloaded" to a veto nobody could make.
 *  - unload leaks the veto — the extension is gone but its reason is still
 *    returned, and the user's config silently stops applying.
 *
 * Handlers hand their news back through a file rather than a global: the
 * extension module is loaded on its own module graph and shares no scope with
 * this one, and a test that parks state on `globalThis` poisons every file
 * after it.
 */

const INFO = { sources: ["/tmp/ultraworkers/config.yml"] };

let tempDir: TempDir;
let extensionsDir: string;
/** Registrations still live, unloaded after each row. */
const live: Array<{ runner: ExtensionRunner; paths: string[] }> = [];

beforeEach(() => {
	tempDir = TempDir.createSync("@ultraworkers-config-reload-api-test-");
	extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions");
	fs.mkdirSync(extensionsDir, { recursive: true });
});

afterEach(() => {
	// The reload registry is process-global, so a row that leaves a handler
	// behind hands it to the next row — and to every other file in the suite.
	while (live.length > 0) {
		const entry = live.pop();
		if (!entry) continue;
		for (const extensionPath of entry.paths) entry.runner.unloadExtension(extensionPath);
	}
	tempDir.removeSync();
});

/** A file the extension writes into, so the test can read back what it observed. */
function relayPath(): string {
	return path.join(tempDir.path(), "relay.txt");
}

function readRelay(): string | undefined {
	try {
		return fs.readFileSync(relayPath(), "utf8");
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
		throw err;
	}
}

/** Write an extension whose factory body is the given source. */
function writeExtension(name: string, body: string): void {
	fs.writeFileSync(path.join(extensionsDir, `${name}.ts`), `export default function (pi) {\n${body}\n}\n`);
}

/** Load every extension in the directory through the real loader. */
async function load() {
	const authStorage = await AuthStorage.create(path.join(tempDir.path(), "auth.db"));
	const result = await loadExtensions(
		fs
			.readdirSync(extensionsDir, { withFileTypes: true })
			.filter(entry => entry.isFile() && entry.name.endsWith(".ts"))
			.map(entry => path.join(extensionsDir, entry.name))
			.sort(),
		tempDir.path(),
	);
	expect(result.errors).toEqual([]);
	const runner = new ExtensionRunner(
		result.extensions,
		result.runtime,
		tempDir.path(),
		SessionManager.inMemory(),
		new ModelRegistry(authStorage),
	);
	live.push({ runner, paths: result.extensions.map(extension => extension.path) });
	return { result, runner };
}

describe("an extension reaches the config-reload registry", () => {
	it("makes the registry non-empty, which is what the watcher consults", async () => {
		// Before the seam the registration functions had no production caller, so
		// this reads false in every shipped build: a veto path that is real code
		// nothing can enter.
		expect(hasConfigReloadHandlers()).toBe(false);

		writeExtension("observer", "\tpi.onBeforeConfigReload(() => undefined);");
		const { result } = await load();

		expect(hasConfigReloadHandlers()).toBe(true);
		expect(result.extensions).toHaveLength(1);
	});

	it("holds the apply, and the held pass keeps its reason", async () => {
		// The contract, not the boolean: a reason must leave the previous values in
		// force and tell the caller why, rather than silently dropping an edit the
		// user typed.
		writeExtension(
			"holder",
			`\tpi.onBeforeConfigReload(info => (info.sources.some(s => s.includes("busy")) ? "a tool is in flight" : undefined));`,
		);
		await load();

		let applied = 0;
		const held = await runConfigReloadPass({ sources: ["/tmp/ultraworkers/busy"] }, async () => {
			applied++;
		});
		expect(held.applied).toBe(false);
		expect(held.deferrals).toEqual(["a tool is in flight"]);
		expect(applied).toBe(0);

		const free = await runConfigReloadPass(INFO, async () => {
			applied++;
		});
		expect(free.applied).toBe(true);
		expect(applied).toBe(1);
	});

	it("tells an extension that the edit landed, not only that one is coming", async () => {
		// The after half exists because "hold it" and "it landed" are different
		// questions; without it an extension can offer a veto it cannot withdraw.
		expect(hasAfterConfigReloadHandlers()).toBe(false);
		writeExtension(
			"landed",
			`\tpi.onBeforeConfigReload(() => undefined);
\tpi.onAfterConfigReload(info => { Bun.write(${JSON.stringify(relayPath())}, info.sources.join(",")); });`,
		);
		await load();

		await runConfigReloadPass(INFO, async () => {});

		expect(readRelay()).toBe("/tmp/ultraworkers/config.yml");
	});

	it("refuses a handler that is not callable, naming the type it received", async () => {
		// A handler that throws when the reload fires turns "tell me first" into
		// "break the config watcher", so the door refuses rather than storing it.
		writeExtension(
			"broken",
			`\ttry {
\t\tpi.onBeforeConfigReload(undefined);
\t\tBun.write(${JSON.stringify(relayPath())}, "ACCEPTED");
\t} catch (err) {
\t\tBun.write(${JSON.stringify(relayPath())}, (err as Error).message);
\t}`,
		);
		await load();

		expect(readRelay()).toContain("must be a function");
		expect(readRelay()).toContain("undefined");
		expect(hasConfigReloadHandlers()).toBe(false);
	});
});

describe("unloading an extension withdraws its config-reload handlers", () => {
	it("restores exactly the pre-seam answer", async () => {
		// With no seam a held reload applies; once registered it does not; after
		// unload the first answer must be back — otherwise unload leaves the user
		// editing a config that no longer takes effect, with nothing saying why.
		writeExtension("gated", `\tpi.onBeforeConfigReload(() => "held by the extension");`);
		const { result, runner } = await load();

		const before = await runConfigReloadPass(INFO, async () => {});
		expect(before.applied).toBe(false);
		expect(before.deferrals).toEqual(["held by the extension"]);

		expect(runner.unloadExtension(result.extensions[0].path)).toBe(true);

		expect(hasConfigReloadHandlers()).toBe(false);
		const after = await runConfigReloadPass(INFO, async () => {});
		expect(after.applied).toBe(true);
		expect(after.deferrals).toEqual([]);
	});

	it("leaves a neighbour's handler alone", async () => {
		// Unload withdraws its own registrations. Withdrawing a sibling's would let
		// /reload or /suspend silently disable a different extension's veto, with
		// nothing in either one's output to say so.
		writeExtension("a-holder", `\tpi.onBeforeConfigReload(() => "a holds it");`);
		writeExtension("b-holder", `\tpi.onBeforeConfigReload(() => "b holds it");`);
		const { result, runner } = await load();
		expect(result.extensions).toHaveLength(2);

		runner.unloadExtension(result.extensions[0].path);

		const pass = await runConfigReloadPass(INFO, async () => {});
		expect(pass.applied).toBe(false);
		expect(pass.deferrals).toEqual(["b holds it"]);
	});
});
