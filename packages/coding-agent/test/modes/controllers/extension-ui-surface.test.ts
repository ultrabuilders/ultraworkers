import { afterEach, beforeAll, describe, expect, it, vi } from "bun:test";
import { Container, Text } from "@oh-my-pi/pi-tui";
import { getThemeByName, setThemeInstance } from "@oh-my-pi/pi-tui/theme";
import { logger } from "@oh-my-pi/pi-utils";
import { noOpUIContext } from "../../../src/extensibility/extensions/runner";
import type { ExtensionUIContext } from "../../../src/extensibility/extensions";
import { ExtensionUiController } from "../../../src/modes/controllers/extension-ui-controller";
import type { InteractiveModeContext } from "../../../src/modes/types";

beforeAll(async () => {
	const dark = await getThemeByName("dark");
	if (!dark) throw new Error("Failed to load dark theme");
	setThemeInstance(dark);
});

afterEach(() => {
	vi.restoreAllMocks();
});

function makeHarness() {
	const editor = new Container();
	const extensionHeaderContainer = new Container();
	const extensionFooterContainer = new Container();
	const requestRender = vi.fn();
	let uiContext: ExtensionUIContext | undefined;
	const ctx = {
		editor,
		editorContainer: new Container(),
		hookWidgetContainerAbove: new Container(),
		hookWidgetContainerBelow: new Container(),
		extensionHeaderContainer,
		extensionFooterContainer,
		ui: {
			requestRender,
			getFocused: () => editor,
			setFocus: vi.fn(),
			showOverlay: vi.fn(),
			terminal: { rows: 40, columns: 120 },
		},
		session: {
			extensionRunner: {
				getExtensionPaths: () => [],
				getComposerShapes: () => [],
				emit: async () => {},
				initialize: () => {},
				onError: () => {},
			} as unknown as InteractiveModeContext["session"]["extensionRunner"],
			setUsageFallbackConfirmer: vi.fn(),
		},
		setToolUIContext(context: ExtensionUIContext): void {
			uiContext = context;
		},
		addAutocompleteProvider: vi.fn(),
		syncComposerShape: vi.fn(),
		showStatus: vi.fn(),
	} as unknown as InteractiveModeContext;

	const controller = new ExtensionUiController(ctx);
	return {
		controller,
		extensionHeaderContainer,
		extensionFooterContainer,
		requestRender,
		async init(): Promise<ExtensionUIContext> {
			await controller.initHooksAndCustomTools();
			if (!uiContext) throw new Error("setToolUIContext was never called");
			return uiContext;
		},
	};
}

/** Rows a band actually paints, with ANSI stripped per row (joining first loses the last one). */
function bandRows(container: Container): string {
	return container
		.render(80)
		.map(row => Bun.stripANSI(row))
		.join("\n");
}

const marker = (text: string) => () => new Text(text, 0, 0);

describe("extension header/footer on a framed context", () => {
	it("mounts a header into the band it was handed, and renders its rows", async () => {
		const harness = makeHarness();
		const ui = await harness.init();

		ui.setHeader(marker("HDR-ROW") as never, { key: "banner" });

		// Assert on rendered rows, not on "did not throw": the seam this bead closes
		// is the one where the call succeeded and nothing ever appeared, so the only
		// assertion that can catch a regression is the painted output.
		//
		// What this does NOT cover: that the band handed to the controller is the one
		// the composer draws. `makeHarness` supplies its own container, so rewiring
		// `interactive-mode.ts` to pass a throwaway leaves this green. That link is
		// asserted in `extensions/header-footer-real-frame.test.ts`.
		expect(bandRows(harness.extensionHeaderContainer)).toContain("HDR-ROW");
		expect(bandRows(harness.extensionFooterContainer)).not.toContain("HDR-ROW");
		expect(harness.requestRender).toHaveBeenCalled();
	});

	it("mounts a footer into its own band, independent of the header", async () => {
		const harness = makeHarness();
		const ui = await harness.init();

		ui.setFooter(marker("FTR-ROW") as never, { key: "legend" });

		expect(bandRows(harness.extensionFooterContainer)).toContain("FTR-ROW");
		expect(bandRows(harness.extensionHeaderContainer)).not.toContain("FTR-ROW");
	});

	it("keeps both surfaces when two extensions claim the same key", async () => {
		const harness = makeHarness();
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
		const ui = await harness.init();

		// Two different extensions, one key. The obvious `Map.set` would evict the
		// first and its author would watch the surface vanish with no error — the
		// exact silent loss this whole surface exists to end. The rule the repo
		// already uses for a name clash (`extensibility/skills.ts`) is: warn,
		// namespace the later registration, keep both reachable.
		ui.setHeader(marker("FIRST-EXT") as never, { key: "banner", owner: "/ext/a.ts" });
		ui.setHeader(marker("SECOND-EXT") as never, { key: "banner", owner: "/ext/b.ts" });

		const rows = bandRows(harness.extensionHeaderContainer);
		expect(rows).toContain("FIRST-EXT");
		expect(rows).toContain("SECOND-EXT");
		expect(warn).toHaveBeenCalled();
		const logged = warn.mock.calls[0]?.[1] as { availableAs?: string; name?: string } | undefined;
		expect(logged?.name).toBe("banner");
		expect(logged?.availableAs).toBe("banner~2");
	});

	it("replaces rather than accumulates when the same extension re-registers", async () => {
		const harness = makeHarness();
		const ui = await harness.init();

		ui.setHeader(marker("GENERATION-ONE") as never, { key: "banner", owner: "/ext/a.ts" });
		ui.setHeader(marker("GENERATION-TWO") as never, { key: "banner", owner: "/ext/a.ts" });

		const rows = bandRows(harness.extensionHeaderContainer);
		expect(rows).toContain("GENERATION-TWO");
		expect(rows).not.toContain("GENERATION-ONE");
	});

	it("withdraws only the withdrawing extension's surface", async () => {
		const harness = makeHarness();
		const ui = await harness.init();

		ui.setHeader(marker("KEEPS-RENDERING") as never, { key: "shared", owner: "/ext/a.ts" });
		ui.setHeader(marker("GETS-WITHDRAWN") as never, { key: "shared", owner: "/ext/b.ts" });
		ui.setHeader(undefined, { key: "shared", owner: "/ext/b.ts" });

		const rows = bandRows(harness.extensionHeaderContainer);
		expect(rows).toContain("KEEPS-RENDERING");
		expect(rows).not.toContain("GETS-WITHDRAWN");
	});
});

describe("extension header/footer on a frameless context", () => {
	it("still refuses, so the same call cannot half-succeed where it cannot be seen", async () => {
		const harness = makeHarness();
		await harness.init();

		// The pairing is the contract: the identical call paints on a framed context
		// and is refused on a frameless one. Unifying the two is the regression —
		// a surface that mounts where nobody can see it is the silent failure again.
		expect(() => noOpUIContext.setHeader(marker("ANYWHERE") as never, { key: "banner" })).toThrow(/setHeader/);
		expect(() => noOpUIContext.setFooter(marker("ANYWHERE") as never, { key: "legend" })).toThrow(/setFooter/);
	});
});
