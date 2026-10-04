/**
 * Which on-disk shapes does the host's `native` extension loader actually discover?
 *
 * Bead `259n.12` recorded that a missing `omp`/`pi` manifest key is why this plugin never loads,
 * and planned to fix it by adding that key. That diagnosis is wrong, and the plugin is not going
 * to load until it is fixed — so a consumer reading this test must be able to tell which reason
 * applies. It cannot: the note named one branch of a two-branch function.
 *
 * `discoverExtensionModulePaths` has two independent paths:
 *   - manifest path — a subdirectory `package.json` whose `omp`/`pi` key lists `extensions` (helpers.ts:915)
 *   - index path   — any subdirectory `index.{ts,js}` NOT claimed by a manifest, added unconditionally
 *                    (helpers.ts:941)
 *
 * So the manifest key is **optional** whenever a root `index.ts` exists, and **required** when the
 * entrypoint lives somewhere else. This tree currently matches NEITHER, which is the real blocker.
 *
 * Every row builds an independent temp config dir: a shared one lets one row's fixture satisfy
 * another's control, which turns a control into a second positive.
 */
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { loadCapability } from "../../../../packages/coding-agent/src/capability/index";
import "../../../../packages/coding-agent/src/discovery/builtin";

interface Discovered {
	path: string;
	name: string;
}

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

const ENTRY = "export default function activate() { return {}; }\n";

/** Build `<configDir>/extensions/wf/` from a file map, then ask the real loader what it sees. */
async function discover(files: Record<string, string>, manifest: Record<string, unknown> | null) {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "omp-shape-"));
	roots.push(root);
	const configDir = path.join(root, "cfg");
	const cwd = path.join(root, "cwd"); // deliberately has no .omp/, so only the agent dir contributes
	const extensionDir = path.join(configDir, "extensions", "wf");
	await fs.mkdir(cwd, { recursive: true });
	await fs.mkdir(extensionDir, { recursive: true });
	for (const [rel, body] of Object.entries(files)) {
		const target = path.join(extensionDir, rel);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.writeFile(target, body);
	}
	if (manifest !== null) {
		await fs.writeFile(
			path.join(extensionDir, "package.json"),
			JSON.stringify({ name: "wf", private: true, type: "module", ...manifest }, null, 2),
		);
	}
	const result = await loadCapability<Discovered>("extension-modules", {
		providers: ["native"],
		agentDir: configDir,
		cwd,
	});
	return result.items.map(item => item.path);
}

describe("what the native loader discovers", () => {
	test("a root index.ts is discovered with NO manifest key", async () => {
		// The row that refutes the recorded diagnosis: `omp`/`pi` is not the gate.
		expect(await discover({ "index.ts": ENTRY }, null)).toEqual([
			expect.stringContaining("index.ts"),
		]);
	});

	test("a manifest key reaches an entrypoint that is not a root index", async () => {
		const found = await discover({ "src/entry.ts": ENTRY }, { omp: { extensions: ["./src/entry.ts"] } });
		expect(found).toEqual([expect.stringContaining("src/entry.ts")]);
	});

	test("a manifest naming a file that is not there discovers nothing", async () => {
		// Control for the row above: without this, "manifest works" and "manifest ignored" agree.
		expect(await discover({ "index.ts": ENTRY }, { omp: { extensions: ["./src/absent.ts"] } })).toEqual([]);
	});

	test("a nested entrypoint with no manifest discovers nothing — this plugin's current shape", async () => {
		// The shape .claude/plugins/workflow has today: sources under src/, no root index, no key.
		expect(await discover({ "src/entry.ts": ENTRY }, null)).toEqual([]);
	});
});
