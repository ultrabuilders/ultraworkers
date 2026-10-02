import { beforeAll, describe, expect, it } from "bun:test";
import type { DescribeContext } from "@oh-my-pi/pi-tui/native/node";
import { PluginListComponent } from "@oh-my-pi/pi-tui/overlays/plugin-settings";
import { getThemeByName, setThemeInstance } from "@oh-my-pi/pi-tui/theme";
import { APP_NAME } from "@oh-my-pi/pi-utils";

/**
 * The install instructions must name a command that exists.
 *
 * No published package ships an `omp` binary — `packages/coding-agent/package.json`
 * declares `bin: { ultraworkers }` and nothing else declares `omp` — so "Install npm
 * plugins: omp plugin install <package>" was an instruction to type a command that
 * fails with "command not found". `omp` survives only as a legacy config-directory
 * name in `XDG_CONFIG_DIR_CANDIDATES`, which is a different thing entirely.
 *
 * Both render paths are asserted because they are separate code: the empty-state rows
 * are `Text` children, while `describe()` is a separate native projection. Fixing one
 * and not the other leaves the same wrong command on screen depending on which path
 * the terminal takes.
 *
 * What this deliberately does NOT assert: that the string `omp` is gone from the file.
 * Two `omp.` role identifiers here are frozen wire identity, and `dirs.ts:33` marks
 * `WIRE_NAME` as a third-party contract value not to change without a compatibility
 * decision. A whole-file check would fail on exactly the two identifiers that must
 * stay, which is why the negative case below is scoped to the command shape.
 */
const cx: DescribeContext = {
	cols: 120,
	reduceMotion: false,
	dark: true,
	supports: () => true,
	feature: () => true,
};

const CALLBACKS = {
	onNpmSelect: () => {},
	onMarketplaceSelect: () => {},
	onCancel: () => {},
};

/** Rows the component actually paints, ANSI stripped per row. */
function paintedRows(component: PluginListComponent): string {
	return component
		.render(120)
		.map(row => Bun.stripANSI(row))
		.join("\n");
}

function emptyList(): PluginListComponent {
	return new PluginListComponent([], CALLBACKS);
}

beforeAll(async () => {
	const theme = await getThemeByName("dark");
	if (!theme) throw new Error("Failed to load dark theme");
	setThemeInstance(theme);
});

describe("the plugin list names a command the user can actually run", () => {
	it("paints the real binary name in the empty state", () => {
		const rows = paintedRows(emptyList());

		expect(rows).toContain(`${APP_NAME} plugin install <package>`);
		expect(rows).toContain(`${APP_NAME} plugin install <name>@<marketplace>`);
	});

	it("never asks the user to type a binary that is not published", () => {
		// The regression itself. Scoped to `omp plugin` — the command shape — rather
		// than to the bare token, because `omp.` role identifiers in this same file are
		// wire identity that must survive.
		expect(paintedRows(emptyList())).not.toContain("omp plugin");
	});

	it("names the real binary in the native describe() path too", () => {
		// A separate projection of the same empty state. Driving only `render` would
		// leave the wrong command on any terminal that takes the native path.
		const described = JSON.stringify(emptyList().describe(cx));

		expect(described).toContain(`${APP_NAME} plugin install <package>`);
		expect(described).not.toContain("omp plugin");
	});

	it("keeps the frozen wire role on the old spelling", () => {
		// The negative case that a whole-file check would have broken: `omp.` is still
		// correct for identity, and `APP_NAME` must never be substituted into it.
		const described = JSON.stringify(emptyList().describe(cx));

		expect(described).toContain("omp.overlay.plugin-settings");
	});
});
