import * as fs from "node:fs";
import * as path from "node:path";
import { adjustHsv } from "@oh-my-pi/pi-utils/color";
import { getCustomThemesDir } from "@oh-my-pi/pi-utils/dirs";
import { isEnoent } from "@oh-my-pi/pi-utils/fs-error";
import { logger } from "@oh-my-pi/pi-utils";
import { detectColorMode, resolveThemeColors } from "./color";
import darkThemeJson from "./dark.json" with { type: "json" };
import { defaultThemes } from "./defaults";
import lightThemeJson from "./light.json" with { type: "json" };
import type { ColorMode, ThemeBg, ThemeColor, ThemeJson } from "./schema";
import { normalizeSpinnerFramesOverride, type SymbolPreset } from "./symbols";
import { Theme } from "./theme-class";

// ============================================================================
// Theme Loading
// ============================================================================

const BUILTIN_THEMES: Record<string, ThemeJson> = {
	dark: darkThemeJson as ThemeJson,
	light: lightThemeJson as ThemeJson,
	...(defaultThemes as Record<string, ThemeJson>),
};

export function getBuiltinThemes(): Record<string, ThemeJson> {
	return BUILTIN_THEMES;
}

/**
 * Themes contributed by extensions, keyed by name.
 *
 * Registered rather than discovered from disk, because an extension already has
 * a registration API and a themes directory would make loading order — and
 * therefore which theme wins — depend on filesystem order.
 */
const REGISTERED_THEMES = new Map<string, ThemeJson>();

/**
 * Add a theme. Returns false when the name is already taken by a built-in or by
 * an earlier registration — the caller can then warn, because a silently
 * dropped theme is the failure this registry exists to make visible.
 */
export function registerTheme(name: string, theme: ThemeJson): boolean {
	if (name.length === 0 || name !== name.trim()) return false;
	if (name in BUILTIN_THEMES) {
		// The built-in wins, and saying so is the whole point: an extension whose
		// theme silently never appears is indistinguishable from one the user
		// mistyped the name of.
		logger.warn("Theme name collides with a built-in theme; the built-in is used", { name });
		return false;
	}
	if (REGISTERED_THEMES.has(name)) {
		logger.warn("Theme name already registered; the first registration is kept", { name });
		return false;
	}
	REGISTERED_THEMES.set(name, theme);
	return true;
}

/** Themes an extension registered, in registration order. */
export function getRegisteredThemes(): ReadonlyMap<string, ThemeJson> {
	return REGISTERED_THEMES;
}

/**
 * Resolve a theme name to its definition, extension themes included.
 *
 * Built-in wins on a name collision, and the loser is reported rather than
 * dropped in silence: a theme that never loads and a theme that was never
 * registered look identical to a user, and only one of them is a bug they can
 * report.
 */
export function resolveThemeJson(name: string): ThemeJson | undefined {
	if (name in BUILTIN_THEMES) return BUILTIN_THEMES[name];
	return REGISTERED_THEMES.get(name);
}

export async function getAvailableThemes(): Promise<string[]> {
	const themes = new Set<string>(Object.keys(getBuiltinThemes()));
	// Registered themes belong in the list the user picks from. Without this they
	// resolve only if someone types the exact name, which makes the registry
	// reachable but not usable.
	for (const name of REGISTERED_THEMES.keys()) themes.add(name);
	const customThemesDir = getCustomThemesDir();
	try {
		const files = await fs.promises.readdir(customThemesDir);
		for (const file of files) {
			if (file.endsWith(".json")) {
				themes.add(file.slice(0, -5));
			}
		}
	} catch {
		// Directory doesn't exist or isn't readable
	}
	return Array.from(themes).sort();
}

export interface ThemeInfo {
	name: string;
	path: string | undefined;
}

export async function getAvailableThemesWithPaths(): Promise<ThemeInfo[]> {
	const result: ThemeInfo[] = [];

	// Built-in themes (embedded, no file path)
	for (const name of Object.keys(getBuiltinThemes())) {
		result.push({ name, path: undefined });
	}

	// Themes an extension registered — no file on disk, so `path` stays
	// undefined, same as a built-in.
	for (const name of REGISTERED_THEMES.keys()) {
		if (!result.some(themeInfo => themeInfo.name === name)) {
			result.push({ name, path: undefined });
		}
	}

	// Custom themes
	const customThemesDir = getCustomThemesDir();
	try {
		const files = await fs.promises.readdir(customThemesDir);
		for (const file of files) {
			if (file.endsWith(".json")) {
				const name = file.slice(0, -5);
				if (!result.some(themeInfo => themeInfo.name === name)) {
					result.push({ name, path: path.join(customThemesDir, file) });
				}
			}
		}
	} catch {
		// Directory doesn't exist or isn't readable
	}

	return result.sort((a, b) => a.name.localeCompare(b.name));
}

function parseThemeJson(name: string, content: string): ThemeJson {
	let json: unknown;
	try {
		json = JSON.parse(content);
	} catch (error) {
		throw new Error(`Failed to parse theme ${name}: ${error}`);
	}
	let parsed: ThemeJson;
	try {
		// Custom-theme-only boundary: built-in first-frame themes do not need to
		// load or construct the omptype validation graph.
		const { validateThemeJson } = require("./schema-validation");
		parsed = validateThemeJson(json);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		// Extract color key information if available
		const missingColorMatch = errorMessage.match(/missing keys: (.+)/i);
		const missingColors: string[] = missingColorMatch ? missingColorMatch[1].split(",").map(s => s.trim()) : [];

		let fullErrorMessage = `Invalid theme "${name}":\n`;
		if (missingColors.length > 0) {
			fullErrorMessage += `\nMissing required color tokens:\n`;
			fullErrorMessage += missingColors.map(c => `  - ${c}`).join("\n");
			fullErrorMessage += `\n\nPlease add these colors to your theme's "colors" object.`;
			fullErrorMessage += `\nSee the built-in themes (dark.json, light.json) for reference values.`;
		}
		fullErrorMessage += `\n\nValidation error:\n  - ${errorMessage}`;

		throw new Error(fullErrorMessage);
	}
	return parsed;
}

export async function loadThemeJson(name: string): Promise<ThemeJson> {
	const registered = resolveThemeJson(name);
	if (registered) return registered;
	const customThemesDir = getCustomThemesDir();
	const themePath = path.join(customThemesDir, `${name}.json`);
	try {
		return parseThemeJson(name, await Bun.file(themePath).text());
	} catch (error) {
		if (isEnoent(error)) throw new Error(`Theme not found: ${name}`);
		throw error;
	}
}

/** Load a theme definition synchronously for the first terminal frame. */
export function loadThemeJsonSync(name: string): ThemeJson {
	const registered = resolveThemeJson(name);
	if (registered) return registered;
	const themePath = path.join(getCustomThemesDir(), `${name}.json`);
	try {
		return parseThemeJson(name, fs.readFileSync(themePath, "utf8"));
	} catch (error) {
		if (isEnoent(error)) throw new Error(`Theme not found: ${name}`);
		throw error;
	}
}

export interface CreateThemeOptions {
	mode?: ColorMode;
	symbolPresetOverride?: SymbolPreset;
	colorBlindMode?: boolean;
}

/** HSV adjustment to shift green toward blue for colorblind mode (red-green colorblindness) */
const COLORBLIND_ADJUSTMENT = { h: 60, s: 0.71 };

export function createTheme(themeJson: ThemeJson, options: CreateThemeOptions = {}): Theme {
	const { mode, symbolPresetOverride, colorBlindMode } = options;
	const colorMode = mode ?? detectColorMode();
	const resolvedColors = resolveThemeColors(themeJson.colors, themeJson.vars);

	if (colorBlindMode) {
		const added = resolvedColors.toolDiffAdded;
		if (typeof added === "string" && added.startsWith("#")) {
			resolvedColors.toolDiffAdded = adjustHsv(added, COLORBLIND_ADJUSTMENT);
		}
	}

	const fgColors: Record<ThemeColor, string | number> = {} as Record<ThemeColor, string | number>;
	const bgColors: Record<ThemeBg, string | number> = {} as Record<ThemeBg, string | number>;
	const bgColorKeys: Set<string> = new Set([
		"selectedBg",
		"userMessageBg",
		"customMessageBg",
		"toolPendingBg",
		"toolSuccessBg",
		"toolErrorBg",
		"statusLineBg",
	]);
	for (const [key, value] of Object.entries(resolvedColors)) {
		if (bgColorKeys.has(key)) {
			bgColors[key as ThemeBg] = value;
		} else {
			fgColors[key as ThemeColor] = value;
		}
	}
	// Extract symbol configuration - settings override takes precedence over theme
	const symbolPreset: SymbolPreset = symbolPresetOverride ?? themeJson.symbols?.preset ?? "unicode";
	const symbolOverrides = themeJson.symbols?.overrides ?? {};
	const spinnerFramesOverrides = normalizeSpinnerFramesOverride(themeJson.symbols?.spinnerFrames);
	return new Theme(fgColors, bgColors, colorMode, symbolPreset, symbolOverrides, spinnerFramesOverrides);
}

export async function loadTheme(name: string, options: CreateThemeOptions = {}): Promise<Theme> {
	const themeJson = await loadThemeJson(name);
	return createTheme(themeJson, options);
}

/** Load and construct a theme synchronously for latency-sensitive first paint. */
export function loadThemeSync(name: string, options: CreateThemeOptions = {}): Theme {
	return createTheme(loadThemeJsonSync(name), options);
}
export async function getThemeByName(name: string): Promise<Theme | undefined> {
	try {
		return await loadTheme(name);
	} catch {
		return undefined;
	}
}
