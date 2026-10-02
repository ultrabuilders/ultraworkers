/**
 * `pi.registerTheme` must reach the theme the user actually selects.
 *
 * ## The failure this file is built to catch
 *
 * `registerTheme` was not an empty function — the registry in
 * `packages/tui/src/theme/loader.ts` implemented the whole policy correctly, and
 * `packages/tui/test/theme-registry.test.ts` covered it. What it had was no way
 * in: no caller outside its own module and its own test, and no presence on
 * `ExtensionAPI`, so an extension could not reach it. That is the exact shape
 * WI-B was raised to eliminate — a registry that records a name nobody can write.
 *
 * The tempting test here is one that calls `registerTheme` and checks the map.
 * That test already exists, twice: `theme-registry.test.ts` and
 * `extension-seam-doctor.test.ts` both call the registry directly, and both stay
 * green if `ConcreteExtensionAPI.registerTheme` is deleted outright, because
 * neither ever loads an extension. So the assertion carrying the weight here goes
 * **through the loader**: a module outside this repo, loaded the way a user's
 * extension is loaded, calling the method on the `ExtensionAPI` it is handed.
 *
 * ## Why the assertions are selection, not registration
 *
 * "The registry grew" is not the contract. The contract is that the name is
 * *usable*: it appears in `getAvailableThemes()`, which is what the `/theme`
 * selector lists (`selector-controller.ts:254`), and `loadThemeJsonSync` returns
 * it, which is what paints the first frame. A registry that recorded the theme but
 * that nothing consulted would pass a membership assertion and fail both of
 * these. Those two are the only accessors the loaders use, so they are the ones
 * asserted.
 *
 * ## The mutation
 *
 * Deleting the single call `registerThemeInRegistry(name, theme)` from the loader
 * turns all three extension-driven cases red while the file still compiles — and
 * `theme-registry.test.ts` plus `extension-seam-doctor.test.ts` stay green across
 * all 20 of their tests. That asymmetry, 3 red here against 20 green there, is the
 * proof the producer is covered here and nowhere else.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import { getAvailableThemes, getBuiltinThemes, loadThemeJsonSync, resolveThemeJson } from "@oh-my-pi/pi-tui/theme";
import { TempDir, __resetDirsFromEnvForTests, setAgentDir } from "@oh-my-pi/pi-utils";

/**
 * The extension's theme. `colors` is the field `createTheme` reads
 * (`resolveThemeColors(themeJson.colors, …)`), so this is a shape the real theme
 * pipeline consumes rather than a token object that only satisfies a Map.
 *
 * It is a partial `ThemeJson` on purpose: a full one is 64 required colors, and
 * spelling them out would bury the one field the contract is about. The
 * comparison below is therefore written against `accent` specifically, which is
 * what "the extension's theme reached the loader" actually means — and which a
 * theme substituted from somewhere else could not satisfy.
 */
const EXT_ACCENT = "#0a0b0c";
const EXT_THEME = { colors: { accent: EXT_ACCENT } };

/**
 * Assert the selected theme is the one the extension contributed.
 *
 * `toEqual` against a partial is both a type error and an over-specification:
 * `ThemeJson` requires `name` and the full color set, so it would also go red if
 * `loadThemeJsonSync` gained a field — asserting more than the contract states.
 * Naming the field keeps the assertion exactly as strong as the claim: this
 * accent came from this extension.
 */
function expectSelectedTheme(themeName: string, accent: string): void {
	expect(loadThemeJsonSync(themeName).colors?.accent).toBe(accent);
}

/**
 * The registry has no reset — it is a per-process module-level `Map`, and adding
 * one would be a production API existing only for tests. So every case registers
 * a name nothing else in the suite uses and none depends on ordering.
 */
describe("pi.registerTheme: an extension's theme reaches the user", () => {
	let tempDir: TempDir;
	let cwd: string;
	const originalAgentDir = process.env.PI_CODING_AGENT_DIR;

	/**
	 * An extension module outside this repo, written the way a user writes one.
	 *
	 * `resultPath` exists because the collision cases' contract is the boolean the
	 * extension was *handed*, and a `registerTheme` that threw instead of returning
	 * `false` would produce a different observable. Writing it out makes "what did
	 * the extension see" a fact on disk rather than something inferred from whether
	 * the load reported an error.
	 */
	function writeExtension(name: string, theme: unknown, file: string, resultPath?: string): string {
		const dir = path.join(cwd, "ext");
		fs.mkdirSync(dir, { recursive: true });
		const entry = path.join(dir, file);
		const report = resultPath ? `\twriteFileSync(${JSON.stringify(resultPath)}, String(accepted), "utf-8");\n` : "";
		fs.writeFileSync(
			entry,
			`import { writeFileSync } from "node:fs";\nexport default function(pi) {\n\tconst accepted = pi.registerTheme(${JSON.stringify(name)}, ${JSON.stringify(theme)});\n${report}}\n`,
			"utf-8",
		);
		return entry;
	}

	beforeEach(() => {
		tempDir = TempDir.createSync("@pi-theme-seam-");
		cwd = tempDir.absolute();
		// Steer user-scope discovery at the temp dir, or the scan returns the
		// developer's own extensions and the suite learns to expect them.
		setAgentDir(path.join(cwd, "agent"));
	});

	afterEach(() => {
		if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
		__resetDirsFromEnvForTests();
		tempDir?.removeSync();
	});

	it("CONTROL: before the extension loads, its name selects nothing", async () => {
		// Both halves of the control pair, on the real read paths. If registration
		// changed nothing, this and the case below would be identical, and the
		// positive case would be indistinguishable from the broken behaviour it
		// exists to rule out.
		expect(resolveThemeJson("seam-loaded")).toBeUndefined();
		expect(await getAvailableThemes()).not.toContain("seam-loaded");
		expect(() => loadThemeJsonSync("seam-loaded")).toThrow("Theme not found: seam-loaded");
	});

	it("lists and loads a theme registered through the ExtensionAPI", async () => {
		const entry = writeExtension("seam-loaded", EXT_THEME, "index.ts");

		const loaded = await loadExtensions([entry], cwd);
		// The extension must load cleanly, or a later assertion would pass for the
		// wrong reason — a module that registered nothing at all.
		expect(loaded.errors).toHaveLength(0);

		// Listed: this is the array the `/theme` selector renders, so a name missing
		// from it is a theme the user cannot pick however the loader behaves.
		expect(await getAvailableThemes()).toContain("seam-loaded");
		// Loaded: this is what paints the first frame.
		expectSelectedTheme("seam-loaded", EXT_ACCENT);
	});

	it("NEGATIVE: a theme shadowing a built-in is refused, and the built-in still wins", async () => {
		// `dark` is a real built-in. The rule is that the built-in is kept and the
		// extension is told `false`, so it can react rather than ship a theme that
		// silently never appears.
		const resultPath = path.join(cwd, "accepted.txt");
		const entry = writeExtension("dark", { colors: { accent: "#ff0000" } }, "greedy.ts", resultPath);

		await loadExtensions([entry], cwd);

		// The extension was told, rather than left to infer from a theme that never
		// appeared — the whole reason the registry returns a boolean.
		expect(fs.readFileSync(resultPath, "utf-8")).toBe("false");
		// And the user's `dark` is untouched: this is a refusal, not an override.
		// Both halves, because `not.toBe("#ff0000")` alone would also pass if `dark`
		// resolved to nothing at all — a refusal that deleted the built-in would
		// satisfy it. Identity with the built-in is the actual claim.
		const builtinDark = getBuiltinThemes().dark;
		expect(loadThemeJsonSync("dark")).toBe(builtinDark);
		expect(loadThemeJsonSync("dark").colors?.accent).not.toBe("#ff0000");
	});

	it("NEGATIVE: a second extension reusing the name loses to the first", async () => {
		// The other half of the same rule, and a separate case because it is a
		// different policy statement: "first registration kept" is not implied by
		// "built-in wins", so one assertion cannot cover both.
		const resultPath = path.join(cwd, "accepted.txt");
		const first = writeExtension("seam-shared", { colors: { accent: "#111111" } }, "first.ts");
		const second = writeExtension("seam-shared", { colors: { accent: "#999999" } }, "second.ts", resultPath);

		await loadExtensions([first], cwd);
		await loadExtensions([second], cwd);

		expect(fs.readFileSync(resultPath, "utf-8")).toBe("false");
		expectSelectedTheme("seam-shared", "#111111");
	});
});
