import { describe, expect, it, vi } from "bun:test";
import { Container } from "@oh-my-pi/pi-tui";
import type { ExtensionUiComponent } from "@oh-my-pi/pi-tui/chat/extension-types";
import type { ExtensionUIContext } from "../../src/extensibility/extensions/types";
import { ExtensionUiController } from "../../src/modes/controllers/extension-ui-controller";
import type { InteractiveModeContext } from "../../src/modes/types";

/**
 * An extension may mount a component into the prompt's header or footer band, and
 * withdraw it again. Before this seam existed the controller bound
 * `setHeader`/`setFooter` to `() => {}`: an extension asking for a band got
 * silence, no error, and no component — the caller had no way to tell the band
 * from a mode that simply had no frame.
 *
 * These rows assert *which component survives*, never how many. "Exactly one
 * widget was disposed" is also the result of a perfectly correct unload, so a
 * count cannot distinguish "removed another extension's band" from "removed the
 * dead one's". Only naming the component that must still be alive can.
 */

/**
 * A real `ExtensionUiComponent` rather than a cast: the factory's return type is
 * `Component & { dispose?() }`, and a stub that does not satisfy it would leave
 * the test exercising a shape the product never passes.
 */
interface FakeComponent extends ExtensionUiComponent {
	/** Test-only label, so a failed assertion names the component it expected. */
	label: string;
}

function fakeComponent(label: string, dispose?: () => void): FakeComponent {
	return { label, render: () => [], dispose };
}

function createBandContext() {
	// A real `Container`, not a hand-rolled `{children, clear, addChild}`. The
	// controller drives the band through whatever `Container` exposes, so a fake
	// that implements only today's three methods passes no matter what the real
	// one is called tomorrow — the fake can drift from the product and the suite
	// stays green. This file answers "which extension's band survives", which is
	// about ownership and needs no frame; `header-footer-real-frame.test.ts` is
	// where the band is checked against the container the composer actually draws.
	const extensionHeaderContainer = new Container();
	const extensionFooterContainer = new Container();
	const ui = { requestRender: vi.fn() };
	let toolUIContext: ExtensionUIContext | undefined;
	const ctx = {
		ui,
		extensionHeaderContainer,
		extensionFooterContainer,
		setToolUIContext: (next: ExtensionUIContext) => {
			toolUIContext = next;
		},
		syncComposerShape: vi.fn(),
		// No runner: `initHooksAndCustomTools` installs the ui context and then
		// returns early, which is all this seam needs.
		session: { extensionRunner: undefined },
	} as unknown as InteractiveModeContext;
	return {
		ctx,
		extensionHeaderContainer,
		extensionFooterContainer,
		ui,
		toolUIContext: () => {
			if (!toolUIContext) throw new Error("initHooksAndCustomTools did not install a ui context");
			return toolUIContext;
		},
	};
}

describe("extension header/footer bands", () => {
	it("mounts a band requested through the extension UI context", async () => {
		// The regression this seam exists for, and it is driven through
		// `ExtensionUIContext.setHeader` rather than the controller method beneath
		// it. Calling `setExtensionSurface` directly would stay green when the ui
		// context bindings were reverted to `() => {}` — the historical bug — because
		// the binding is the thing that was broken, not the method it delegates to.
		const { ctx, extensionHeaderContainer, toolUIContext } = createBandContext();
		const controller = new ExtensionUiController(ctx);
		await controller.initHooksAndCustomTools();
		const band = fakeComponent("status-band");

		toolUIContext().setHeader(() => band, { owner: "ext:alpha" });

		expect(extensionHeaderContainer.children).toContain(band);
	});

	it("keeps another extension's band when two of them register the same key", () => {
		// Withdrawal is scoped by owner and deliberately NOT by key: two extensions
		// may hold the same key, and matching on it would let the second one's
		// cleanup take the first one's band with it. The collision suffix is what
		// makes both live at once, so the assertion is that alpha's unload leaves
		// beta's component mounted — not that one component is left.
		const { ctx, extensionHeaderContainer } = createBandContext();
		const controller = new ExtensionUiController(ctx);
		const alpha = fakeComponent("alpha");
		const beta = fakeComponent("beta");

		controller.setExtensionSurface("header", () => alpha, { key: "shared", owner: "ext:alpha" });
		controller.setExtensionSurface("header", () => beta, { key: "shared", owner: "ext:beta" });
		controller.setExtensionSurface("header", undefined, { key: "shared", owner: "ext:alpha" });

		expect(extensionHeaderContainer.children).toContain(beta);
		expect(extensionHeaderContainer.children).not.toContain(alpha);
	});

	it("retires the previous component when the same owner registers again", () => {
		// The update path. Leaving the old component mounted beside its replacement
		// renders two bands for one extension and never disposes either, so the
		// old one's resources outlive it.
		const { ctx, extensionHeaderContainer } = createBandContext();
		const controller = new ExtensionUiController(ctx);
		const dispose = vi.fn();
		const first = fakeComponent("first", dispose);
		const second = fakeComponent("second");

		controller.setExtensionSurface("header", () => first, { owner: "ext:alpha" });
		controller.setExtensionSurface("header", () => second, { owner: "ext:alpha" });

		expect(dispose).toHaveBeenCalled();
		expect(extensionHeaderContainer.children).toContain(second);
		expect(extensionHeaderContainer.children).not.toContain(first);
	});

	it("keeps the header and footer bands independent", () => {
		// The two bands are separate maps rendered into separate containers. A
		// withdrawal on one must not disturb the other, which a single shared map
		// would pass for whichever band happened to be read first.
		const { ctx, extensionHeaderContainer, extensionFooterContainer } = createBandContext();
		const controller = new ExtensionUiController(ctx);
		const header = fakeComponent("header");
		const footer = fakeComponent("footer");

		controller.setExtensionSurface("header", () => header, { owner: "ext:alpha" });
		controller.setExtensionSurface("footer", () => footer, { owner: "ext:alpha" });
		controller.setExtensionSurface("header", undefined, { owner: "ext:alpha" });

		expect(extensionHeaderContainer.children).not.toContain(header);
		expect(extensionFooterContainer.children).toContain(footer);
	});
});
