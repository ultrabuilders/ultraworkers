import { afterEach, describe, expect, it } from "bun:test";
import { orderedSettings } from "@oh-my-pi/pi-coding-agent/config/all-settings";
import { all, lookup, ownerOf, registerOwned, unregisterOwned } from "@oh-my-pi/pi-coding-agent/config/registry";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { resetSettingsForTest, Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import * as fs from "node:fs";
import * as path from "node:path";
import { TempDir } from "@oh-my-pi/pi-utils";

/**
 * A setting an extension declares must be a FIRST-CLASS citizen of the registry, not
 * a side-channel row: it resolves, it names the layer that won, it can be removed by
 * its owner, and its `env` layer is opt-in rather than inferred.
 *
 * These rows exist because each of those is a separate way for the feature to be
 * half-built and still look done. A dynamic key that resolves but reports no layer is
 * indistinguishable from a correct one at the call site that only reads the value; a
 * registry with no unregister looks fine right up until an extension is reloaded.
 */

/** Owners registered by a test, removed in `afterEach` so rows cannot leak into each other. */
const touched: string[] = [];

function own<T extends { id: string }>(owner: string, definition: T): T {
	touched.push(owner);
	return registerOwned(owner, definition as never) as unknown as T;
}

afterEach(() => {
	// Reverse order: a row that registered two ids under one owner must not be left
	// half-removed, and removing in insertion order would make that order observable.
	for (const owner of touched.splice(0).reverse()) unregisterOwned(owner);
	resetSettingsForTest();
});

describe("a setting registered by an owner is removable by that owner", () => {
	it("drops the id from lookup, from the ordered panel list, and from the owner index", () => {
		// The defect this guards: `ordered` is append-only, so a setting whose owner is
		// never told about it can only ever be added. Unloading an extension then leaves
		// its rows behind forever, and reloading it collides with its own previous
		// registration — an error naming a setting the author cannot see.
		const id = "test.owner.removable";
		own("test-owner-a", { id, type: "string", default: "x" });

		expect(lookup(id)).toBeDefined();
		expect(orderedSettings().some(s => s.id === id)).toBe(true);
		expect(ownerOf(id)).toBe("test-owner-a");

		expect(unregisterOwned("test-owner-a")).toEqual([id]);

		// All three must go. Checking only `lookup` would pass while the row stayed in
		// the panel list, which is the surface a user actually sees.
		expect(lookup(id)).toBeUndefined();
		expect(orderedSettings().some(s => s.id === id)).toBe(false);
		expect(ownerOf(id)).toBeUndefined();
	});

	it("is a no-op for an owner that registered nothing, rather than throwing", () => {
		// Unload runs on teardown paths that fire even when load failed partway. An
		// owner that never registered anything is the normal case there, and throwing
		// would turn a partial load into a crash during cleanup.
		expect(unregisterOwned("test-owner-never-registered")).toEqual([]);
	});

	it("leaves another owner's setting alone when one owner is removed", () => {
		// Ownership is the whole point of the index. If removal were global, unloading
		// one extension would silently strip every other extension's settings — and
		// the failure would surface much later, as a setting that has quietly reverted
		// to its default.
		const keptId = "test.owner.kept";
		const droppedId = "test.owner.dropped";
		own("test-owner-keep", { id: keptId, type: "string", default: "keep" });
		own("test-owner-drop", { id: droppedId, type: "string", default: "drop" });

		unregisterOwned("test-owner-drop");

		expect(lookup(droppedId)).toBeUndefined();
		expect(lookup(keptId)).toBeDefined();
		expect(ownerOf(keptId)).toBe("test-owner-keep");
	});

	it("reports the owner of a core setting as 'core', not as undefined", () => {
		// Every one of the 41 files calling `register({...})` goes through `register`,
		// which delegates with owner `"core"`. If that delegation lost the owner, every
		// built-in setting would look unowned — and a future "remove everything this
		// extension declared" pass would be unable to tell core from extension.
		const coreIds = all().filter(s => !s.id.startsWith("test.owner."));
		expect(coreIds.length).toBeGreaterThan(0);
		for (const setting of coreIds.slice(0, 20)) {
			expect(ownerOf(setting.id), `${setting.id} has no owner`).toBe("core");
		}
	});
});

describe("a collision between two settings is reported, not silently resolved", () => {
	it("names the colliding id, and refuses rather than letting the second win", () => {
		// Last-writer-wins here means the first author's setting is replaced by a value
		// with different semantics, and NEITHER author is told. The author's only clue
		// is that their key stopped taking effect, which looks like a config-layer bug
		// and sends them looking in the wrong place entirely.
		own("test-owner-first", { id: "test.owner.collide", type: "string", default: "first" });

		let thrown: Error | undefined;
		try {
			registerOwned("test-owner-second", { id: "test.owner.collide", type: "number", default: 7 } as never);
		} catch (error) {
			thrown = error as Error;
		}

		expect(thrown, "the second registration was allowed to win").toBeDefined();
		// The id must be in the message: an author who cannot see WHICH key collided
		// has to bisect their whole setting list.
		expect(thrown!.message).toContain("test.owner.collide");
		// The holder, so the author knows it is not a core setting they collided with
		// and can find the other extension by name rather than by bisecting.
		expect(thrown!.message).toContain("test-owner-first");
		// And the rule, so the error carries its own fix: extension-owned settings
		// belong under the reserved namespace, which is what makes the collision
		// impossible in the first place. Without this the author has to know a
		// convention the error never mentions.
		expect(thrown!.message).toContain("plugins.");
		// And the first declaration must survive untouched. Read through a real
		// `Settings` instance: a handle resolves against the layer stack, so passing a
		// bare object here would throw inside `settingsOf` rather than prove anything
		// about which declaration survived.
		const survivor = lookup("test.owner.collide");
		expect(survivor?.get(Settings.isolated())).toBe("first");
	});
});

describe("an extension registering the same setting twice is idempotent, not a collision", () => {
	// Driven through the real loader, because the idempotence lives in the loader's
	// rebind path (loader.ts registerSetting) and not in the registry: `registerOwned`
	// is right to throw on a duplicate. A test that called `registerOwned` twice would
	// be testing the registry's refusal, which is a different contract.
	function writeExtension(dir: string, id: string): string {
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(
			path.join(dir, "index.js"),
			`export default function activate(ctx) {
  ctx.registerSetting({ id: ${JSON.stringify(id)}, type: "string", default: "declared" });
  ctx.registerSetting({ id: ${JSON.stringify(id)}, type: "string", default: "declared" });
}
`,
		);
		return dir;
	}

	it("returns the same handle on rebind and reports no error", async () => {
		// Loading and reloading an extension in one process is normal (reload, then
		// suspend/resume). If rebinding threw "registered twice", the author would be
		// told their own setting name was taken — by themselves.
		const temp = TempDir.createSync("@pi-ext-setting-");
		try {
			const extDir = writeExtension(temp.join("ext"), "test.owner.rebind");
			const result = await loadExtensions([extDir], process.cwd());

			expect(result.errors).toEqual([]);
			const extension = result.extensions[0]!;
			// Registered once, though the factory declared it twice.
			expect(extension.settingIds.filter(id => id === "test.owner.rebind")).toHaveLength(1);
			expect(lookup("test.owner.rebind")).toBeDefined();
			// The second declaration must not have created a second row in the panel.
			const rows = orderedSettings().filter(s => s.id === "test.owner.rebind");
			expect(rows).toHaveLength(1);

			touched.push(String((extension as unknown as { path: string }).path));
		} finally {
			temp.removeSync();
		}
	});

	it("surfaces a genuine cross-extension collision in LoadExtensionsResult.errors", async () => {
		// Two DIFFERENT extensions declaring the same id is the real conflict, and it
		// has to be reported through `errors` — the channel the loader already uses for
		// everything else. Asserted through `loadExtensions` because
		// `loadExtensionFromFactory` throws raw and never produces an `errors` entry,
		// so a test written against the wrong one would pass on a loader that silently
		// swallowed the collision.
		const temp = TempDir.createSync("@pi-ext-collide-");
		try {
			const a = writeExtension(temp.join("a"), "test.owner.shared");
			const b = writeExtension(temp.join("b"), "test.owner.shared");
			const result = await loadExtensions([a, b], process.cwd());

			expect(result.errors.length, "the collision was not reported at all").toBeGreaterThan(0);
			const reported = result.errors.map(e => e.error).join("\n");
			expect(reported).toContain("test.owner.shared");
		} finally {
			temp.removeSync();
		}
	});
});

describe("the env layer is opt-in per setting", () => {
	it("reports 'env' only when the definition declares an env name and it is set", async () => {
		// `env` is declared per setting (`SettingDefinition.env`), never inferred from
		// the id. Inferring it would mean any process environment variable could
		// silently override a user's configuration, which is a much larger surface than
		// the author agreed to.
		const withEnv = "TEST_OWNER_ENV_YES";
		const withoutEnv = "TEST_OWNER_ENV_NO";
		const saved = { withEnv: Bun.env[withEnv], withoutEnv: Bun.env[withoutEnv] };
		const temp = TempDir.createSync("@pi-ext-env-");
		try {
			Bun.env[withEnv] = "from-env";
			// Set, but the definition does not declare it — so it must not be consulted.
			Bun.env[withoutEnv] = "from-env";

			fs.mkdirSync(temp.join("ext"), { recursive: true });
			fs.writeFileSync(
				path.join(temp.join("ext"), "index.js"),
				`export default function activate(ctx) {
  ctx.registerSetting({ id: "test.owner.envYes", type: "string", default: "default", env: ${JSON.stringify(withEnv)} });
  ctx.registerSetting({ id: "test.owner.envNo", type: "string", default: "default" });
}
`,
			);
			await loadExtensions([temp.join("ext")], process.cwd());

			const yes = lookup("test.owner.envYes");
			const no = lookup("test.owner.envNo");
			expect(yes).toBeDefined();
			expect(no).toBeDefined();
			if (!yes || !no) return;

			const scope = Settings.isolated();
			// The declared one resolves from the environment and says so.
			expect(yes.provenance(scope)).toBe("env");
			expect(yes.get(scope)).toBe("from-env");
			// The undeclared one ignores a variable of the matching name entirely: the
			// value stays the default and the layer is not "env".
			expect(no.provenance(scope)).not.toBe("env");
			expect(no.get(scope)).toBe("default");
		} finally {
			if (saved.withEnv === undefined) delete Bun.env[withEnv];
			else Bun.env[withEnv] = saved.withEnv;
			if (saved.withoutEnv === undefined) delete Bun.env[withoutEnv];
			else Bun.env[withoutEnv] = saved.withoutEnv;
			temp.removeSync();
		}
	});
});

describe("a dynamically registered setting joins the same five-layer stack as a core one", () => {
	it("resolves from the settings layers and names the layer that won", async () => {
		// The distinction this pins: a dynamic key is a real `Setting`, reading the
		// same layer stack, not a renamed store that happens to return the right
		// number. A flag store would pass a value-only assertion and fail here, which
		// is why the layer is asserted and not just the value.
		const temp = TempDir.createSync("@pi-ext-layer-");
		const agentDir = temp.join("agent");
		const overlay = temp.join("overlay.yml");
		fs.mkdirSync(agentDir, { recursive: true });
		fs.mkdirSync(temp.join("ext"), { recursive: true });
		fs.writeFileSync(
			path.join(temp.join("ext"), "index.js"),
			`export default function activate(ctx) {
  ctx.registerSetting({ id: "test.owner.layered", type: "string", default: "built-in" });
}
`,
		);
		try {
			await loadExtensions([temp.join("ext")], process.cwd());
			const handle = lookup("test.owner.layered");
			expect(handle).toBeDefined();
			if (!handle) return;

			// The default is the lowest non-env layer: the value resolves with no config
			// file at all, and the provenance names a real layer rather than nothing.
			const bare = Settings.isolated();
			expect(handle.get(bare)).toBe("built-in");
			expect(["global", "project", "overlay", "runtime", "default"]).toContain(handle.provenance(bare));

			// With an overlay supplying a different value, the overlay must win AND be
			// reported as the winner. A store that ignored layers would return the
			// default and still pass a value-only check on the previous line.
			await Bun.write(overlay, "test:\n  owner:\n    layered: from-overlay\n");
			const settings = await Settings.loadIsolated({ agentDir, cwd: agentDir, configFiles: [overlay] });
			const scoped = settings;
			expect(handle.provenance(scoped)).toBe("overlay");
			expect(handle.get(scoped)).toBe("from-overlay");
		} finally {
			temp.removeSync();
		}
	});
});
