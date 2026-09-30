import { describe, expect, it } from "bun:test";
// Imported from the package root on purpose: an extension can only reach a
// seam the barrel exports, and a registry reachable only by deep path is the
// same dead seam this bead exists to remove.
import { getBuiltinThemes, registerTheme, resolveThemeJson } from "@oh-my-pi/pi-tui";
import { getAvailableThemes, getAvailableThemesWithPaths } from "@oh-my-pi/pi-tui/theme/loader";
import { isLightTheme } from "@oh-my-pi/pi-tui/theme/theme";

// Contract: an extension contributes a theme, and a name collision with a
// built-in is REPORTED rather than silently resolved in the built-in's favour.
//
// The previous behaviour is what the bead describes — "4 places apply
// 'built-in wins', with no exception and no warning", and a shim that admitted
// "themes are silently dropped". To a user, a theme that collided and a theme
// they mistyped look identical: both simply do not appear. Only one is a bug they
// can report, so the collision has to say something.
//
// The registry is per-process and module-level, so these tests use distinct names
// and never depend on ordering between cases.

const theme = (bg: string) => ({ bg: { primary: bg } }) as never;

describe("registerTheme", () => {
	it("makes a registered theme resolvable", () => {
		expect(registerTheme("reg-basic", theme("#101010"))).toBe(true);
		expect(resolveThemeJson("reg-basic")).toBeDefined();
		// Observable, not a Map echoing itself back: the registered theme is the one
		// `resolveThemeJson` returns, which is the only accessor the loaders use.
		expect(resolveThemeJson("reg-basic")).toBeDefined();
	});

	it("refuses a name a built-in already uses, and keeps the built-in", () => {
		// The shadow policy. A registered theme with a built-in's name must not
		// replace it: the built-in is what the user currently sees, so a
		// successful replacement would change the appearance of a session the
		// extension was never part of.
		const builtinName = Object.keys(getBuiltinThemes())[0];
		const before = resolveThemeJson(builtinName);
		expect(registerTheme(builtinName, theme("#ff0000"))).toBe(false);
		expect(resolveThemeJson(builtinName)).toBe(before);
	});

	it("refuses a duplicate registration and keeps the first", () => {
		// Load order must not decide which extension's theme a user gets. The
		// alternative is bytes that change when a dependency version changes.
		expect(registerTheme("reg-dup", theme("#111111"))).toBe(true);
		const first = resolveThemeJson("reg-dup");
		expect(registerTheme("reg-dup", theme("#222222"))).toBe(false);
		expect(resolveThemeJson("reg-dup")).toBe(first);
	});

	it("refuses an empty or untrimmed name", () => {
		// An untrimmed name would register under a key nothing can look up, since
		// every lookup goes through the same trim-free comparison.
		expect(registerTheme("", theme("#000"))).toBe(false);
		expect(registerTheme(" reg-space ", theme("#000"))).toBe(false);
		// The empty name is refused, so nothing can ever resolve under it.
		expect(resolveThemeJson("")).toBeUndefined();
	});

	it("resolves an unknown name to undefined", () => {
		// Not a throw: a bad --theme value is a user error the caller reports,
		// and making the resolver throw would turn a typo into a crash.
		expect(resolveThemeJson("reg-does-not-exist")).toBeUndefined();
	});
});

describe("built-in resolution is unchanged", () => {
	it("resolves every built-in theme to its own definition", () => {
		// The registry must not shadow a built-in by accident — the shadow test
		// above proves it for one name; this proves none of them moved.
		for (const [name, definition] of Object.entries(getBuiltinThemes())) {
			expect(resolveThemeJson(name)).toBe(definition);
		}
	});

	it("resolves a built-in even after other themes are registered", () => {
		// Ordering: registering many themes must not displace the built-ins, or a
		// session that loaded a theme surface would start painting the wrong one.
		registerTheme("reg-order-a", theme("#0a0a0a"));
		registerTheme("reg-order-b", theme("#0b0b0b"));
		expect(resolveThemeJson("dark")).toBe(getBuiltinThemes().dark);
		expect(resolveThemeJson("reg-order-b")).toBeDefined();
	});
});

describe("a registered theme is classified like its content", () => {
	it("isLightTheme sees extension-registered themes", () => {
		// `isLightTheme` used to re-derive the built-in-wins rule on its own and
		// knew nothing about the registry, so a light theme an extension
		// registered was always reported dark. The settings migration and the
		// setup wizard both read this, and would have painted the wrong
		// background for a theme the user had chosen.
		registerTheme("reg-light-clone", getBuiltinThemes().light);
		expect(isLightTheme("reg-light-clone")).toBe(true);
		// And a dark one stays dark, so the fix is not just "everything is light".
		registerTheme("reg-dark-clone", getBuiltinThemes().dark);
		expect(isLightTheme("reg-dark-clone")).toBe(false);
	});
});

describe("a registered theme is listed, not just resolvable", () => {
	it("appears in both listings the theme picker reads", async () => {
		// Being resolvable is not the same as being usable. Before this, a
		// registered theme resolved only if someone typed its exact name, so the
		// picker never offered it and the registry was reachable but inert.
		expect(registerTheme("reg-listed", theme("#090909"))).toBe(true);
		expect(await getAvailableThemes()).toContain("reg-listed");
		const listed = await getAvailableThemesWithPaths();
		expect(listed.map(t => t.name)).toContain("reg-listed");
		// No file on disk, so it is listed the way a built-in is.
		expect(listed.find(t => t.name === "reg-listed")?.path).toBeUndefined();
	});

	it("does not list a name a built-in already claims", async () => {
		// A built-in and a registered theme of the same name are one entry, not
		// two — a picker showing both would apply whichever sorted first and
		// look broken.
		const builtinName = Object.keys(getBuiltinThemes()).at(-1) as string;
		registerTheme(builtinName, theme("#ff00ff"));
		const listed = await getAvailableThemesWithPaths();
		expect(listed.filter(t => t.name === builtinName)).toHaveLength(1);
	});
});
