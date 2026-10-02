import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { AuthStorage } from "@oh-my-pi/pi-coding-agent/session/auth-storage";
import { ModelRegistry } from "@oh-my-pi/pi-coding-agent/config/model-registry";
import { discoverExtensionPaths } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { ExtensionRunner } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { getProjectAgentDir, TempDir } from "@oh-my-pi/pi-utils";

/**
 * A contested tool name must resolve to the same extension everywhere, not just on
 * the machine that happened to create the directories.
 *
 * Registration is last-extension-wins and `discoverExtensionPaths` now sorts, so
 * the winner is the highest-sorting path. Without the sort that winner is whatever
 * `readdir` or I/O completion happened to produce, which is why the first test
 * pins the NAME across two separate processes rather than asserting an internal
 * array: a same-process assertion would be satisfied by any single ordering,
 * including a filesystem-dependent one that merely repeats itself.
 */

const EXT_NAMES = ["ext-a", "ext-b", "ext-c", "ext-d", "ext-e", "ext-f", "ext-g", "ext-h"] as const;

interface ProbeResult {
	winnerPath: string;
	extensionOrder: string[];
}

interface ProbeResult {
	winnerPath: string;
	extensionOrder: string[];
}

/**
 * Run discovery + load + tool lookup in a FRESH process and report the winner.
 *
 * A separate process each time, never twice in one: the module-level `dirCache`
 * and Bun's ESM registry both survive an in-process repeat, which would hide
 * exactly the ordering this file exists to catch.
 */
async function probe(extsDir: string, tempPath: string): Promise<ProbeResult> {
	// The child runs with cwd at the repo root, so its dynamic imports resolve
	// against that cwd -- a bare specifier would be looked up as a package.
	const mod = (relative: string): string => JSON.stringify(`./${relative}`);
	const script = [
		`const extsDir = ${JSON.stringify(extsDir)};`,
		`const tempDir = ${JSON.stringify(tempPath)};`,
		`const { discoverExtensionPaths, loadExtensions } = await import(${mod("packages/coding-agent/src/extensibility/extensions/loader.ts")});`,
		`const { ExtensionRunner } = await import(${mod("packages/coding-agent/src/extensibility/extensions/runner.ts")});`,
		`const { SessionManager } = await import(${mod("packages/coding-agent/src/session/session-manager.ts")});`,
		`const { AuthStorage } = await import(${mod("packages/coding-agent/src/session/auth-storage.ts")});`,
		`const { ModelRegistry } = await import(${mod("packages/coding-agent/src/config/model-registry.ts")});`,
		"const paths = await discoverExtensionPaths([extsDir], tempDir, undefined, { ambient: false });",
		"const loaded = await loadExtensions(paths, tempDir);",
		'const auth = await AuthStorage.create(tempDir + "/probeauth.db");',
		"const runner = new ExtensionRunner(loaded.extensions, loaded.runtime, tempDir, SessionManager.inMemory(), new ModelRegistry(auth));",
		'const tool = runner.getRegisteredTool("dup");',
		"console.log(JSON.stringify({ winnerPath: tool?.extensionPath, extensionOrder: loaded.extensions.map(e => e.path) }));",
		"auth.close();",
	].join("\n");

	// cwd is the repo root so the probe's own relative imports resolve.
	const child = Bun.spawn([process.execPath, "-e", script], {
		cwd: path.resolve(import.meta.dir, "../../.."),
		env: { ...process.env, NO_COLOR: "1", PI_CODING_AGENT_DIR: tempPath },
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exitCode !== 0) throw new Error(`probe exited ${exitCode}: ${stderr}`);
	return JSON.parse(stdout.trim().split("\n").at(-1)!) as ProbeResult;
}

function extSource(label: string): string {
	return `export default function register(api) {
	api.registerTool({
		name: "dup",
		label: ${JSON.stringify(label)},
		parameters: { type: "object", properties: {}, additionalProperties: false },
		execute: async () => "ok",
	});
}
`;
}

describe("extension load order determinism", () => {
	let tempDir: TempDir;
	let extsDir: string;

	// Shared across both tests: ModelRegistry's constructor synchronously loads every
	// bundled model (~100ms), and neither test mutates it.
	let sharedTempDir: TempDir;
	let authStorage: AuthStorage;
	let modelRegistry: ModelRegistry;

	beforeAll(async () => {
		sharedTempDir = TempDir.createSync("@ultraworkers-ext-order-shared-");
		authStorage = await AuthStorage.create(path.join(sharedTempDir.path(), "testauth.db"));
		modelRegistry = new ModelRegistry(authStorage);
	});

	afterAll(() => {
		authStorage.close();
		sharedTempDir.removeSync();
	});

	beforeEach(() => {
		tempDir = TempDir.createSync("@ultraworkers-ext-order-");
		extsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions", "exts");
		fs.mkdirSync(extsDir, { recursive: true });
		for (const name of EXT_NAMES) {
			const dir = path.join(extsDir, name);
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(path.join(dir, "index.ts"), extSource(name));
		}
	});

	afterEach(() => {
		tempDir.removeSync();
	});

	/**
	 * The premise this whole test rests on.
	 *
	 * `readdir` must return these unsorted, and must not happen to end on `ext-h`.
	 * Both matter: registration scans BACKWARDS, so the winner is the LAST path. A
	 * filesystem that happened to return `ext-h` last would make a winner assertion
	 * pass with no sort present at all -- a green line proving nothing.
	 *
	 * Deliberately `fs.readdirSync`, not the cached `readDirEntries`: the configured
	 * directory branch resolves through `resolveExtensionDirectory`, which uses raw
	 * `fs.readdirSync` and never touches that cache. Probing the cache would confirm
	 * a premise about a code path this fixture does not go through.
	 */
	test("readdir order is not already sorted, and does not end on the expected winner", () => {
		const names = fs.readdirSync(extsDir);
		expect(names).not.toEqual([...names].sort());
		expect(names.at(-1)).not.toBe("ext-h");
	});

	test("the same tool name resolves to the same extension in two separate processes", async () => {
		// Two SEPARATE processes on purpose. The module-level `dirCache` and Bun's ESM
		// module cache both survive a second in-process call, which would hide exactly
		// the ordering this test exists to catch.
		const first = await probe(extsDir, tempDir.path());
		const second = await probe(extsDir, tempDir.path());

		const expected = path.join(extsDir, "ext-h", "index.ts");
		expect(first.winnerPath).toBe(expected);
		expect(second.winnerPath).toBe(expected);
		// Load order itself is the contract, not just the winner.
		expect(first.extensionOrder).toEqual(second.extensionOrder);
		expect(first.extensionOrder.at(-1)).toBe(expected);
	});

	/**
	 * The sort is code-unit, not locale-aware.
	 *
	 * `localeCompare` sorts these differently -- it puts `ext_1` and `ext-a` before
	 * `ext-B`, while code-unit order puts uppercase first. The fixture above uses
	 * lowercase names where the two agree, so without this case the locale guarantee
	 * would be untested while still looking covered.
	 */
	test("load order is code-unit, so it does not follow the host locale", async () => {
		const localeDir = path.join(getProjectAgentDir(tempDir.path()), "extensions", "locale");
		const names = ["ext-a", "ext-B", "ext_1"];
		for (const name of names) {
			const dir = path.join(localeDir, name);
			fs.mkdirSync(dir, { recursive: true });
			fs.writeFileSync(path.join(dir, "index.ts"), extSource(name));
		}

		const paths = await discoverExtensionPaths([localeDir], tempDir.path(), undefined, { ambient: false });
		expect(paths).toEqual([...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
		// And explicitly NOT what a locale-aware sort would have produced.
		expect(paths).not.toEqual([...paths].sort((a, b) => a.localeCompare(b)));
	});

	test("a duplicate tool name is reported with both registrants named", async () => {
		const extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions", "files");
		fs.mkdirSync(extensionsDir, { recursive: true });
		const first = path.join(extensionsDir, "one.ts");
		const second = path.join(extensionsDir, "two.ts");
		fs.writeFileSync(first, extSource("one"));
		fs.writeFileSync(second, extSource("two"));

		const loaded = await loadExtensions([first, second], tempDir.path());
		const runner = new ExtensionRunner(
			loaded.extensions,
			loaded.runtime,
			tempDir.path(),
			SessionManager.inMemory(),
			modelRegistry,
		);

		// Read through the getter rather than getCommandDiagnostics(), so this does
		// not depend on getRegisteredCommands() having run first.
		const diagnostics = runner.getToolCollisionDiagnostics();
		const collision = diagnostics.find(d => d.message.includes("'dup'"));
		expect(collision).toBeDefined();
		expect(collision!.type).toBe("warning");
		expect(collision!.paths).toEqual([first, second]);
		// Last-extension-wins, so the winner is the last registrant.
		expect(collision!.path).toBe(second);
		// A consumer reading only `message` must still learn about both sides.
		expect(collision!.message).toContain(first);
		expect(collision!.message).toContain(second);
	});

	test("an uncontested tool name produces no collision diagnostic", async () => {
		const extensionsDir = path.join(getProjectAgentDir(tempDir.path()), "extensions", "solo");
		fs.mkdirSync(extensionsDir, { recursive: true });
		const only = path.join(extensionsDir, "solo.ts");
		fs.writeFileSync(
			only,
			`export default function register(api) {
	api.registerTool({
			name: "unique",
			label: "unique",
			parameters: { type: "object", properties: {}, additionalProperties: false },
			execute: async () => "ok",
		});
}
`,
		);

		const loaded = await loadExtensions([only], tempDir.path());
		const runner = new ExtensionRunner(
			loaded.extensions,
			loaded.runtime,
			tempDir.path(),
			SessionManager.inMemory(),
			modelRegistry,
		);
		// One registrant is not a collision; reporting it would make the diagnostic
		// useless for finding real ones.
		expect(runner.getToolCollisionDiagnostics()).toEqual([]);
	});
});
