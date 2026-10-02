import { describe, expect, it } from "bun:test";
import { Container } from "@oh-my-pi/pi-tui";
import type { ExtensionUIContext } from "@oh-my-pi/pi-coding-agent/extensibility/extensions";
import { noOpUIContext } from "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner";
import { createAcpExtensionUiContext } from "@oh-my-pi/pi-coding-agent/modes/acp/acp-agent";
import { ExtensionUiController } from "@oh-my-pi/pi-coding-agent/modes/controllers/extension-ui-controller";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";
import type { AgentSideConnection, ClientCapabilities } from "@oh-my-pi/pi-utils/acp";

/**
 * `canMount` must answer whether the call will mount — not whether a UI is attached.
 *
 * The two disagree, which is the only reason this member exists. ACP reports
 * `hasUI: true` for any client that supports `elicitation.form` and still throws on
 * all three surfaces below; RPC reports `hasUI: true` unconditionally and throws on
 * the same three. A `canMount` written as `() => this.hasUI` would therefore return
 * `true` on exactly the contexts where the answer is `false`, and the advice would
 * lie in precisely the places it was added to stop lying.
 *
 * So the expectation here is never derived from `hasUI`. It is derived from the
 * other end: each surface is actually called, and the row asserts that `canMount`
 * agrees with whether it threw. An implementation that reads the flag cannot pass
 * this, because the flag is not what the call observes.
 *
 * COVERAGE GAP, stated rather than hidden: `RpcExtensionUIContext` is a class nested
 * inside `runRpcMode` and is not reachable from a test without exporting it, which
 * would widen the public surface to buy a row. Its three throws and its `canMount`
 * sit in one class and are held by review — the same arrangement
 * `extension-ui-custom.test.ts` already records for this member's sibling.
 */
const FORM_CAPABILITIES: ClientCapabilities = { elicitation: { form: {} } };
const UNUSED_CONNECTION = {} as AgentSideConnection;

/** The surface `canMount` names, paired with the call that is supposed to mount it. */
const SURFACES = [
	{
		name: "header",
		mounts(context: ExtensionUIContext): void {
			context.setHeader(undefined, { key: "banner" });
		},
	},
	{
		name: "footer",
		mounts(context: ExtensionUIContext): void {
			context.setFooter(undefined, { key: "legend" });
		},
	},
	{
		name: "custom",
		mounts(context: ExtensionUIContext): void {
			void context.custom(() => {
				throw new Error("the frameless path must not reach the component factory");
			});
		},
	},
] as const;

function acpContext(capabilities: ClientCapabilities | undefined): ExtensionUIContext {
	return createAcpExtensionUiContext(UNUSED_CONNECTION, () => "session", capabilities);
}

/** The framed context, built over throwaway bands. Whether the band reaches the screen is `header-footer-real-frame.test.ts`'s claim, not this file's. */
function framedContext(): ExtensionUIContext {
	const ctx = {
		editor: new Container(),
		editorContainer: new Container(),
		hookWidgetContainerAbove: new Container(),
		hookWidgetContainerBelow: new Container(),
		extensionHeaderContainer: new Container(),
		extensionFooterContainer: new Container(),
		ui: {
			requestRender: () => {},
			getFocused: () => new Container(),
			setFocus: () => {},
			showOverlay: () => {},
			terminal: { rows: 40, columns: 120 },
		},
		session: {
			extensionRunner: {
				getExtensionPaths: () => [],
				getComposerShapes: () => [],
				emit: async () => {},
				initialize: () => {},
				onError: () => {},
			},
			setUsageFallbackConfirmer: () => {},
		},
		setToolUIContext: () => {},
		addAutocompleteProvider: () => {},
		syncComposerShape: () => {},
		showStatus: () => {},
	} as unknown as InteractiveModeContext;

	const controller = new ExtensionUiController(ctx);
	let handed: ExtensionUIContext | undefined;
	(ctx as unknown as { setToolUIContext: (c: ExtensionUIContext) => void }).setToolUIContext = context => {
		handed = context;
	};
	void controller.initHooksAndCustomTools();
	if (!handed) throw new Error("the controller never published a UI context");
	return handed;
}

/**
 * Runs the real call and reports whether it refused synchronously.
 *
 * Every frameless implementation throws before it can return — the ACP, RPC and
 * noOp members all throw in their own body — so a synchronous catch is the whole
 * observation. The framed `custom` is deliberately excluded from this helper rather
 * than raced against a timer: it opens an interactive overlay a test cannot close,
 * and it rejects on a later tick, so both a sync catch and a bounded await would
 * measure something other than whether it mounted.
 */
function mountsOrThrows(surface: (typeof SURFACES)[number], context: ExtensionUIContext): boolean {
	try {
		surface.mounts(context);
		return true;
	} catch {
		return false;
	}
}

interface Row {
	readonly name: string;
	readonly make: () => ExtensionUIContext;
}

const FRAMELESS: readonly Row[] = [
	{ name: "noOpUIContext", make: () => noOpUIContext },
	{ name: "ACP, client supports elicitation.form", make: () => acpContext(FORM_CAPABILITIES) },
	{ name: "ACP, client without form support", make: () => acpContext(undefined) },
];

describe("canMount agrees with what the call itself does, on every frameless context", () => {
	for (const row of FRAMELESS) {
		it(`${row.name} reports one answer across all three surfaces`, () => {
			const context = row.make();
			const answers = new Set(SURFACES.map(surface => context.canMount(surface.name)));

			// The grouping is the claim under test: `header`, `footer` and `custom`
			// are one group because they behave identically everywhere, not because
			// they read alike. If a future context mounts one and not the others,
			// this set grows past one and the group has to be split.
			expect([...answers]).toHaveLength(1);
		});

		for (const surface of SURFACES) {
			it(`${row.name} — canMount("${surface.name}") matches the call`, () => {
				const context = row.make();

				expect(context.canMount(surface.name)).toBe(mountsOrThrows(surface, context));
			});
		}
	}
});

describe("the framed context mounts all three, so it is the only one answering true", () => {
	it("reports one answer across all three surfaces", () => {
		const context = framedContext();

		// First-sight control: the bands this controller was handed exist and the
		// context agrees on every surface, so "all three true" is a claim about a
		// real frame rather than a constant.
		expect(new Set(SURFACES.map(surface => context.canMount(surface.name)))).toEqual(new Set([true]));
	});

	for (const surface of SURFACES.filter(s => s.name !== "custom")) {
		it(`canMount("${surface.name}") is true, and the call does not refuse`, () => {
			const context = framedContext();

			expect(context.canMount(surface.name)).toBe(mountsOrThrows(surface, context));
		});
	}

	it("canMount('custom') is true, asserted without invoking it", () => {
		// Stated rather than faked: the framed `custom` opens an overlay that waits
		// for a keypress, so no test can observe it mounting and then let go. The
		// claim here is the query only; `header-footer-real-frame.test.ts` is where
		// a band is shown reaching the screen.
		expect(framedContext().canMount("custom")).toBe(true);
	});
});

describe("canMount is not hasUI under another name", () => {
	it("disagrees with hasUI wherever the two disagree", () => {
		// The single row where it matters: a client that supports form elicitation
		// round-trips dialogs, so `hasUI` is `true`, and still has nowhere to put a
		// header. An implementation reading the flag answers `true` here and the
		// call throws — which is the failure the member exists to prevent.
		const context = acpContext(FORM_CAPABILITIES);

		expect(context.hasUI).toBe(true);
		expect(context.canMount("header")).toBe(false);
	});

	it("agrees with hasUI only where they were never in conflict", () => {
		// `noOpUIContext` is the one context where deriving the answer from the flag
		// would be indistinguishable from stating it. Including it keeps the matrix
		// honest: the two members coincide here and only here.
		expect(noOpUIContext.hasUI).toBe(noOpUIContext.canMount("header"));
	});
});
