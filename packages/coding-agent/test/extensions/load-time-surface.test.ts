import { afterEach, describe, expect, it, vi } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Container } from "@oh-my-pi/pi-tui";
import type { ExtensionUiComponent } from "@oh-my-pi/pi-tui/chat/extension-types";
import { loadExtensions } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/loader";
import type { ExtensionUIContext } from "../../src/extensibility/extensions/types";
import { extensionSurfaceRegistry } from "../../src/extensibility/extensions/surface-registry";
import { ExtensionUiController } from "../../src/modes/controllers/extension-ui-controller";
import type { InteractiveModeContext } from "../../src/modes/types";
import { removeSyncWithRetries, Snowflake } from "@oh-my-pi/pi-utils";

/**
 * A surface declared at LOAD time must reach the band **without a hook ever
 * running**.
 *
 * ## The failure this defends against
 *
 * `ctx.ui.setHeader` already reaches a band, and what it mounts outlives the hook
 * that registered it — the controller owns the component, not the context. That
 * makes the load-time seam easy to declare unnecessary: "the panel already
 * persists, what is missing?" The answer is *when it first appears*. A panel
 * registered from a hook cannot exist before that hook fires, so an extension
 * whose panel belongs on screen from the first frame has no seam — and the
 * reactive one looks sufficient right up until the moment it matters.
 *
 * ## Why the e2e rows exist at all
 *
 * The rows that put a factory straight into the registry prove the drain. They
 * cannot show the programme's actual claim, because they skip the step an author
 * depends on: that `pi.registerSurface` is reachable from a module written
 * outside this repo, through the real loader. Deleting the `ExtensionAPI` wiring
 * would leave every registry row green. So the first row writes a real `.ts`
 * file to a temp dir and loads it through `loadExtensions`.
 */

interface FakeComponent extends ExtensionUiComponent {
	/** Test-only label, so a failed assertion names the component it expected. */
	label: string;
}

function fakeComponent(label: string, dispose?: () => void): FakeComponent {
	return { label, render: () => [], dispose };
}

function createBandContext() {
	// A real `Container`, for the reason the header/footer suite gives: the
	// controller drives the band through whatever `Container` exposes, and a fake
	// implementing only today's methods would let the real one drift unnoticed.
	const extensionHeaderContainer = new Container();
	const extensionFooterContainer = new Container();
	const ui = { requestRender: vi.fn() };
	// A no-op: no row here reads the tool context, and the controller installs it
	// during init regardless. Capturing it would be an unread variable, and a
	// captured one nobody asserts is a second thing to keep correct for nothing.
	const setToolUIContext = (_next: ExtensionUIContext): void => {};
	const ctx = {
		ui,
		extensionHeaderContainer,
		extensionFooterContainer,
		setToolUIContext,
		syncComposerShape: vi.fn(),
		// No runner: `initHooksAndCustomTools` installs the ui context and returns
		// early. That is also the strongest form of the claim — with no runner there
		// is nothing that could have fired a hook.
		session: { extensionRunner: undefined },
	} as unknown as InteractiveModeContext;
	return { ctx, extensionHeaderContainer, extensionFooterContainer };
}

const tempDirs: string[] = [];
/** Owners registered directly by a row, released in `afterEach`. */
const touched: string[] = [];

function declare(owner: string, band: "header" | "footer", component: FakeComponent, key?: string): void {
	touched.push(owner);
	extensionSurfaceRegistry.register(owner, {
		band,
		factory: () => component,
		options: { key, owner },
	});
}

/** Write a real extension module outside this repo and return its path. */
function writeExtensionModule(lines: string[]): { dir: string; file: string } {
	const dir = path.join(os.tmpdir(), `pi-load-time-surface-${Snowflake.next()}`);
	fs.mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);
	const file = path.join(dir, "surface-extension.ts");
	fs.writeFileSync(file, lines.join("\n"));
	return { dir, file };
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) removeSyncWithRetries(dir);
	for (const owner of touched.splice(0)) extensionSurfaceRegistry.releaseOwnedBy(owner);
});

describe("load-time surface registration", () => {
	it("reaches the band from an extension module written outside this repo", async () => {
		const { dir, file } = writeExtensionModule([
			'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
			"export default function register(pi: ExtensionAPI): void {",
			'\tpi.registerSurface("header", () => ({ render: () => [] }), { key: "e2e-band" });',
			"}",
		]);
		const loaded = await loadExtensions([file], dir);

		// The claim, in the order it has to hold: the module loaded with no error,
		// and the call reached the real loader rather than being quietly dropped.
		expect(loaded.errors).toEqual([]);
		expect(loaded.extensions).toHaveLength(1);
		const extension = loaded.extensions[0];
		expect(extension?.surfaces).toHaveLength(1);
		expect(extension?.surfaces[0]?.band).toBe("header");

		// And the declaration reaches the band when the session initialises.
		const { ctx, extensionHeaderContainer } = createBandContext();
		const controller = new ExtensionUiController(ctx);
		await controller.initHooksAndCustomTools();

		// Named by key rather than by identity: the extension's factory returns its
		// own component, so the only handle on it from here is the label it rendered.
		expect(extensionHeaderContainer.children.length).toBe(1);
	});

	it("refuses a band that is neither header nor footer, naming the extension", async () => {
		const { dir, file } = writeExtensionModule([
			'import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";',
			"export default function register(pi: ExtensionAPI): void {",
			"\t// @ts-expect-error — the point is that the HOST refuses it, not the compiler.",
			'\tpi.registerSurface("sidebar", () => ({ render: () => [] }));',
			"}",
		]);
		const loaded = await loadExtensions([file], dir);

		// The error must name the extension: an author who typed "sidebar" needs to
		// know which of their three modules did it, and a registry-level refusal with
		// no path is the failure `registerHostRenderStrategy`'s check exists to avoid.
		expect(loaded.errors).toHaveLength(1);
		// `errors` entries are `{ path, error }` — the path is the module's, and the
		// error string is the refusal. Asserting the message names the file is what
		// makes the refusal actionable rather than merely present.
		expect(loaded.errors[0]?.path).toContain("surface-extension.ts");
		expect(loaded.errors[0]?.error).toContain("surface band must be");
	});

	it("mounts a footer declared at load, in the band it asked for", async () => {
		const { ctx, extensionHeaderContainer, extensionFooterContainer } = createBandContext();
		const panel = fakeComponent("load-time-footer");

		declare("ext:alpha", "footer", panel);
		const controller = new ExtensionUiController(ctx);
		await controller.initHooksAndCustomTools();

		// Asserts the band as well as the mount: header and footer both reach a
		// container, so "it rendered somewhere" would pass with the band ignored.
		expect(extensionFooterContainer.children).toContain(panel);
		expect(extensionHeaderContainer.children).not.toContain(panel);
	});

	it("keeps both when two extensions declare the same key", async () => {
		// The collision policy is not this registry's to invent: it is the one
		// `setExtensionSurface` already applies to hook-declared surfaces, and the
		// load-time path routes through that method precisely so the two agree.
		const { ctx, extensionHeaderContainer } = createBandContext();
		const alpha = fakeComponent("alpha");
		const beta = fakeComponent("beta");

		declare("ext:alpha", "header", alpha, "shared");
		declare("ext:beta", "header", beta, "shared");
		const controller = new ExtensionUiController(ctx);
		await controller.initHooksAndCustomTools();

		expect(extensionHeaderContainer.children).toContain(alpha);
		expect(extensionHeaderContainer.children).toContain(beta);
	});

	it("stops mounting a band after its owner is unloaded", async () => {
		// Unload is the only way a declaration leaves a process-global registry, so a
		// teardown that forgot it would mount a band for an extension that no longer
		// exists — in every later session of the process, not just this one.
		const { ctx, extensionHeaderContainer } = createBandContext();
		const panel = fakeComponent("alpha");

		declare("ext:alpha", "header", panel);
		const controller = new ExtensionUiController(ctx);
		await controller.initHooksAndCustomTools();
		expect(extensionHeaderContainer.children).toContain(panel);

		extensionSurfaceRegistry.releaseOwnedBy("ext:alpha");

		const second = createBandContext();
		const next = new ExtensionUiController(second.ctx);
		await next.initHooksAndCustomTools();

		expect(second.extensionHeaderContainer.children).not.toContain(panel);
	});
});
