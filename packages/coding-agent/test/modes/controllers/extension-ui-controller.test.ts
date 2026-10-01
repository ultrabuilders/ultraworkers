import { afterEach, beforeAll, describe, expect, it, type Mock, vi } from "bun:test";
import { type Component, Container, isFocusable, type OverlayOptions, setKeybindings } from "@oh-my-pi/pi-tui";
import { KeybindingsManager } from "@oh-my-pi/pi-tui/app-keybindings";
import type { ExtensionAskDialogQuestion, ExtensionUIContext } from "../../../src/extensibility/extensions";
import { AskDialogComponent } from "@oh-my-pi/pi-tui/overlays/ask-dialog";
import { CustomEditor } from "@oh-my-pi/pi-tui/prompt/custom-editor";
import { HookEditorComponent } from "@oh-my-pi/pi-tui/overlays/hook-editor";
import { ExtensionUiController } from "../../../src/modes/controllers/extension-ui-controller";
import { InputController } from "../../../src/modes/controllers/input-controller";
import { getEditorTheme, getThemeByName, setThemeInstance } from "@oh-my-pi/pi-tui/theme";
import type { InteractiveModeContext } from "../../../src/modes/types";

afterEach(() => {
	setKeybindings(KeybindingsManager.inMemory());
});

beforeAll(async () => {
	const dark = await getThemeByName("dark");
	if (!dark) throw new Error("Failed to load dark theme");
	setThemeInstance(dark);
});

function makeHarness() {
	const editor = new CustomEditor(getEditorTheme());
	/** Mutable so a row can unload an extension and remount again. */
	let liveExtensionPaths: string[] = [];
	const hookWidgetContainerAbove = new Container();
	const hookWidgetContainerBelow = new Container();
	const editorContainer = new Container();
	editorContainer.addChild(editor);
	const requestRender = vi.fn();
	let focused: Component | null = editor;
	editor.focused = true;
	const getFocused = () => focused;
	const setFocus = vi.fn((component: Component | null) => {
		if (focused && isFocusable(focused)) focused.focused = false;
		focused = component;
		if (focused && isFocusable(focused)) focused.focused = true;
	});
	const addAutocompleteProvider = vi.fn();
	const fakeHandle = {
		hide: vi.fn(),
		setHidden: vi.fn(),
		isHidden: vi.fn(() => false),
	};
	const showOverlay = vi.fn(() => fakeHandle);
	let uiContext: ExtensionUIContext | undefined;
	const ctx = {
		editor,
		ui: {
			requestRender,
			getFocused,
			setFocus,
			showOverlay,
			terminal: { rows: 40, columns: 120 },
		},
		editorContainer,
		hookWidgetContainerAbove,
		hookWidgetContainerBelow,
		session: {
			// Settable so a row can retire one extension between two remounts, which
			// is the whole difference between the old global wipe and the re-seat.
			// The rest of the surface the controller touches is stubbed empty: it is
			// reached during `init`, so a runner that only answers `getExtensionPaths`
			// fails every pre-existing row in this file, not just the new ones.
			extensionRunner: {
				getExtensionPaths: () => liveExtensionPaths,
				getComposerShapes: () => [],
				emit: async () => {},
				initialize: () => {},
				onError: () => {},
			} as unknown as InteractiveModeContext["session"]["extensionRunner"],
			setUsageFallbackConfirmer: vi.fn(),
		},
		setToolUIContext(context: ExtensionUIContext, hasUI: boolean): void {
			expect(hasUI).toBe(true);
			uiContext = context;
		},
		addAutocompleteProvider,
		syncComposerShape: vi.fn(),
		showStatus: vi.fn(),
	} as unknown as InteractiveModeContext;

	const controller = new ExtensionUiController(ctx);

	return {
		editor,
		requestRender,
		addAutocompleteProvider,
		hookWidgetContainerAbove,
		hookWidgetContainerBelow,
		/** The extensions the runner currently reports as loaded. */
		setLiveExtensions(paths: string[]): void {
			liveExtensionPaths = paths;
		},
		editorContainer,
		getFocused,
		setFocus,
		showOverlay,
		fakeHandle,
		controller,
		inputController: (readText: () => Promise<string>) =>
			new InputController(ctx, { readImage: async () => null, readText }),
		handleInput(data: string): void {
			if (!focused?.handleInput) throw new Error("Expected a focused input component");
			focused.handleInput(data);
		},
		getPrompt(): HookEditorComponent {
			if (!(focused instanceof HookEditorComponent)) throw new Error("Expected the custom answer editor");
			return focused;
		},
		async init(): Promise<ExtensionUIContext> {
			await controller.initHooksAndCustomTools();
			expect(uiContext).toBeDefined();
			return uiContext!;
		},
	};
}

describe("ExtensionUiController Ask dialog input", () => {
	const questions: ExtensionAskDialogQuestion[] = [
		{ id: "answer", question: "Choose an answer?", options: [{ label: "Default" }] },
	];

	it("waits for clipboard text before advancing the custom answer exactly once", async () => {
		const harness = makeHarness();
		const clipboard = Promise.withResolvers<string>();
		const input = harness.inputController(() => clipboard.promise);
		const pending = harness.controller.showAskDialog([
			{ id: "first", question: "Choose several?", options: [{ label: "Alpha" }], multi: true },
			{ id: "second", question: "Next answer?", options: [{ label: "Beta" }, { label: "Gamma" }] },
		]);
		harness.handleInput(" ");
		harness.handleInput("\x1b[B");
		harness.handleInput("\r");
		const prompt = harness.getPrompt();

		const paste = input.handleImagePaste();
		harness.handleInput("\r");
		harness.handleInput("\r");
		await Promise.resolve();
		expect(harness.getFocused()).toBe(prompt);

		clipboard.resolve("clipboard answer");
		expect(await paste).toBe(true);
		await Promise.resolve();
		expect(harness.getFocused()).toBeInstanceOf(AskDialogComponent);
		harness.handleInput("\x1b[B");
		harness.handleInput("\r");
		harness.handleInput("\r");

		expect(await pending).toMatchObject({
			kind: "submit",
			results: [
				{ id: "first", selectedOptions: ["Alpha"], customInput: "clipboard answer" },
				{ id: "second", selectedOptions: ["Gamma"], customInput: undefined },
			],
		});
		expect(harness.editor.getText()).toBe("");
		expect(harness.getFocused()).toBe(harness.editor);
	});

	it("does not expose the Ask dialog before a custom answer is applied", async () => {
		const harness = makeHarness();
		const pending = harness.controller.showAskDialog([
			{ id: "answer", question: "Choose several?", options: [{ label: "Alpha" }], multi: true },
		]);
		harness.handleInput("\x1b[B");
		harness.handleInput("\r");
		harness.handleInput("custom answer");

		harness.handleInput("\r");

		expect(harness.getFocused()).toBeInstanceOf(HookEditorComponent);
		await Promise.resolve();
		expect(harness.getFocused()).toBeInstanceOf(AskDialogComponent);
		harness.handleInput("\r");
		expect(await pending).toMatchObject({
			kind: "submit",
			results: [{ id: "answer", selectedOptions: [], customInput: "custom answer" }],
		});
	});

	it("discards a cancelled prompt's late paste after a new custom editor opens", async () => {
		const harness = makeHarness();
		const clipboard = Promise.withResolvers<string>();
		const input = harness.inputController(() => clipboard.promise);
		const pending = harness.controller.showAskDialog(questions);
		harness.handleInput("\x1b[B");
		harness.handleInput("\r");
		const cancelledPrompt = harness.getPrompt();
		const paste = input.handleImagePaste();
		harness.handleInput("\r");
		harness.handleInput("\x1b");
		await Promise.resolve();
		await Promise.resolve();

		harness.handleInput("\r");
		const replacement = harness.getPrompt();
		expect(replacement).not.toBe(cancelledPrompt);
		harness.handleInput("replacement answer");
		clipboard.resolve("stale clipboard text");
		expect(await paste).toBe(false);
		expect(harness.getFocused()).toBe(replacement);
		harness.handleInput("\r");

		expect(await pending).toMatchObject({
			kind: "submit",
			results: [{ id: "answer", selectedOptions: [], customInput: "replacement answer" }],
		});
		expect(harness.editor.getText()).toBe("");
	});

	it("discards an aborted Ask's late paste without touching the next Ask or hidden draft", async () => {
		const harness = makeHarness();
		const clipboard = Promise.withResolvers<string>();
		const input = harness.inputController(() => clipboard.promise);
		const abort = new AbortController();
		const pending = harness.controller.showAskDialog(questions, { signal: abort.signal });
		harness.handleInput("\x1b[B");
		harness.handleInput("\r");
		const paste = input.handleImagePaste();
		harness.handleInput("\r");
		abort.abort();
		expect(await pending).toBeUndefined();
		expect(harness.getFocused()).toBe(harness.editor);

		const next = harness.controller.showAskDialog(questions);
		harness.handleInput("\x1b[B");
		harness.handleInput("\r");
		const replacement = harness.getPrompt();
		harness.handleInput("next answer");
		clipboard.resolve("stale clipboard text");
		expect(await paste).toBe(false);
		expect(harness.getFocused()).toBe(replacement);
		harness.handleInput("\r");

		expect(await next).toMatchObject({
			kind: "submit",
			results: [{ id: "answer", selectedOptions: [], customInput: "next answer" }],
		});
		expect(harness.editor.getText()).toBe("");
	});

	it("keeps a failed clipboard read editable and discards its queued empty submit", async () => {
		const harness = makeHarness();
		const clipboard = Promise.withResolvers<string>();
		const input = harness.inputController(() => clipboard.promise);
		const pending = harness.controller.showAskDialog(questions);
		harness.handleInput("\x1b[B");
		harness.handleInput("\r");
		const prompt = harness.getPrompt();
		const paste = input.handleImagePaste();
		harness.handleInput("\r");
		await Promise.resolve();
		clipboard.reject(new Error("Clipboard unavailable"));

		expect(await paste).toBe(false);
		expect(harness.getFocused()).toBe(prompt);
		harness.handleInput("typed after failure");
		await Promise.resolve();
		expect(harness.getFocused()).toBe(prompt);
		harness.handleInput("\r");
		expect(await pending).toMatchObject({
			kind: "submit",
			results: [{ id: "answer", selectedOptions: [], customInput: "typed after failure" }],
		});
		expect(harness.editor.getText()).toBe("");
	});
});

describe("ExtensionUiController editor UI", () => {
	it("rejects setHeader / setFooter instead of swallowing the call", async () => {
		// The interactive context is the one place a footer *could* mount, and it
		// still cannot today. Silence here is what shipped: an extension set a
		// footer, got no error, and the footer never appeared.
		const ui = await makeHarness().init();

		expect(() => ui.setFooter(undefined)).toThrow(/setFooter/);
		expect(() => ui.setHeader(undefined)).toThrow(/setHeader/);
	});

	it("names setEditorComponent, the one surface here that mounts a component", async () => {
		// AND, not OR. The previous assertion on this file's sibling used
		// `/setWidget|setStatus|hasUI/`, which stays green when any one alternative is
		// deleted — a gate that only goes red if you remove everything catches nothing.
		// The bead requires both supported alternatives to be named, so each is checked
		// for presence; dropping either one is now a failing test rather than a message
		// that quietly loses a road.
		//
		// `setEditorComponent` is the load-bearing one: `setWidget` renders a component-free
		// overlay and `setStatus` is text, so an author who wanted to draw a component and
		// is sent to those two has been sent to two dead ends.
		const ui = await makeHarness().init();

		const message = (() => {
			try {
				ui.setFooter(undefined);
				return "";
			} catch (error) {
				return (error as Error).message;
			}
		})();
		expect(message).not.toBe("");
		expect(message).toContain("setEditorComponent");
		expect(message).toContain("setWidget");
		// And the surface that actually failed is named, so the reader knows which call
		// to change.
		expect(message).toContain("setFooter");
	});

	it("requests a render after extension pasteToEditor mutates the prompt", async () => {
		const harness = makeHarness();
		const ui = await harness.init();

		ui.pasteToEditor("hello");
		ui.pasteToEditor(" world");

		expect(harness.editor.getText()).toBe("hello world");
		expect(harness.requestRender).toHaveBeenCalledTimes(2);
	});

	it("requests a render after extension setEditorText replaces the prompt", async () => {
		const harness = makeHarness();
		const ui = await harness.init();

		ui.setEditorText("hello");

		expect(harness.editor.getText()).toBe("hello");
		expect(harness.requestRender).toHaveBeenCalledTimes(1);
	});

	it("keeps a populated prompt visible and routes input to it until the draft is cleared", async () => {
		const harness = makeHarness();
		harness.editor.setText("finish this wor");
		const questions: ExtensionAskDialogQuestion[] = [
			{ id: "confirm", question: "Continue?", options: [{ label: "Yes" }, { label: "No" }] },
		];

		const pending = harness.controller.showAskDialog(questions);
		const ask = harness.editorContainer.children[0];
		expect(ask).toBeInstanceOf(AskDialogComponent);
		expect(harness.editorContainer.children).toEqual([ask, harness.editor]);

		ask?.handleInput?.("d");
		expect(harness.editor.getText()).toBe("finish this word");

		harness.editor.setText("");
		ask?.handleInput?.("\n");
		expect(await pending).toEqual({
			kind: "submit",
			results: [
				{
					id: "confirm",
					question: "Continue?",
					options: ["Yes", "No"],
					multi: false,
					selectedOptions: ["Yes"],
					customInput: undefined,
					note: undefined,
					timedOut: undefined,
				},
			],
		});
		expect(harness.editorContainer.children).toEqual([harness.editor]);
	});

	it("does not fire editor-slot shortcuts that would orphan the ask dialog (#6738)", () => {
		const harness = makeHarness();
		harness.editor.setText("draft in progress");
		// Simulate an editor-slot shortcut like the Agent Hub binding, whose
		// handler clears editorContainer and would strand the pending ask.
		let hubOpened = false;
		harness.editor.setCustomKeyHandler("ctrl+s", () => {
			hubOpened = true;
			harness.editorContainer.clear();
		});
		const questions: ExtensionAskDialogQuestion[] = [
			{ id: "confirm", question: "Continue?", options: [{ label: "Yes" }, { label: "No" }] },
		];

		harness.controller.showAskDialog(questions);
		const ask = harness.editorContainer.children[0];
		expect(ask).toBeInstanceOf(AskDialogComponent);

		// Ctrl+S reaches the draft editor while ask is open; the shortcut must be
		// swallowed, the draft untouched, and the ask surface preserved.
		ask?.handleInput?.("\x13");
		expect(hubOpened).toBe(false);
		expect(harness.editor.getText()).toBe("draft in progress");
		expect(harness.editorContainer.children).toEqual([ask, harness.editor]);
	});

	it("exposes the draft editor cursor while it proxies input, and drops it once cleared (#6738)", () => {
		const harness = makeHarness();
		harness.editor.setText("finish this wor");
		const questions: ExtensionAskDialogQuestion[] = [
			{ id: "confirm", question: "Continue?", options: [{ label: "Yes" }, { label: "No" }] },
		];

		harness.controller.showAskDialog(questions);
		const ask = harness.editorContainer.children[0];
		expect(ask).toBeInstanceOf(AskDialogComponent);

		// The ask dialog holds TUI focus, but rendering it must mirror focus onto
		// the draft editor so its insertion cursor is visible.
		ask?.render?.(80);
		expect(harness.editor.focused).toBe(true);

		// Once the draft clears, the ask controls take over and the editor cursor
		// must not linger.
		harness.editor.setText("");
		ask?.render?.(80);
		expect(harness.editor.focused).toBe(false);
	});

	it("lets the clear action empty the draft and lift the ask guard (#6738)", () => {
		const harness = makeHarness();
		// Route Ctrl+C to the guard: keep app.clear on Ctrl+C but move the ask
		// cancel key off it, so Ctrl+C reaches draft editing instead of cancelling.
		setKeybindings(KeybindingsManager.inMemory({ "tui.select.cancel": "ctrl+g" }));
		harness.editor.setActionKeys("app.clear", ["ctrl+c"]);
		let cleared = 0;
		// Mirror interactive wiring: app.clear (Ctrl+C) clears the draft.
		harness.editor.onClear = () => {
			cleared++;
			harness.editor.setText("");
		};
		harness.editor.setText("half typed prompt");
		const questions: ExtensionAskDialogQuestion[] = [
			{ id: "confirm", question: "Continue?", options: [{ label: "Yes" }, { label: "No" }] },
		];

		harness.controller.showAskDialog(questions);
		const ask = harness.editorContainer.children[0];
		expect(ask).toBeInstanceOf(AskDialogComponent);

		// Ctrl+C is reserved by the base editor and never clears; the guard must
		// dispatch the configured clear action so the "finish or clear" hint works.
		ask?.handleInput?.("\x03");
		expect(cleared).toBe(1);
		expect(harness.editor.getText()).toBe("");

		// With the draft gone the guard releases: the next key reaches the ask
		// controls and submits the highlighted option.
		ask?.handleInput?.("\n");
		expect(harness.editorContainer.children).toEqual([harness.editor]);
	});

	it("remounts the draft editor when the ask surface is restored after a nested prompt (#6738)", async () => {
		const harness = makeHarness();
		harness.editor.setText("half typed prompt");
		const questions: ExtensionAskDialogQuestion[] = [
			{ id: "confirm", question: "Continue?", options: [{ label: "Yes" }, { label: "No" }] },
		];

		harness.controller.showAskDialog(questions);
		const ask = harness.editorContainer.children[0];
		expect(ask).toBeInstanceOf(AskDialogComponent);
		expect(harness.editorContainer.children).toEqual([ask, harness.editor]);

		// Draft submitted: the guard lifts and ask controls take input; open the
		// note prompt, which swaps the container to the nested editor.
		harness.editor.setText("");
		ask?.handleInput?.("n");
		const promptEditor = harness.editorContainer.children[0];
		expect(promptEditor).not.toBe(ask);

		// A failed async submission restores the draft while the nested prompt is
		// open, re-blocking the guard.
		harness.editor.setText("half typed prompt");

		// Cancelling the nested prompt settles its awaited state before restoring
		// the ask surface and remounting the guarded draft editor.
		promptEditor?.handleInput?.("\x1b");
		await Promise.resolve();
		expect(harness.editorContainer.children).toEqual([ask, harness.editor]);
		ask?.handleInput?.("!");
		expect(harness.editor.getText()).toBe("half typed prompt!");
	});

	it("bridges addAutocompleteProvider factories to the interactive mode context (#4919)", async () => {
		const harness = makeHarness();
		const ui = await harness.init();

		expect(typeof ui.addAutocompleteProvider).toBe("function");

		const factory = (current: unknown) => current as never;
		ui.addAutocompleteProvider(factory);

		expect(harness.addAutocompleteProvider).toHaveBeenCalledTimes(1);
		expect(harness.addAutocompleteProvider).toHaveBeenCalledWith(factory);
	});
});

describe("ExtensionUiController custom overlay", () => {
	// showHookCustom mounts the overlay in the `.then` of a Promise.try chain;
	// draining the microtask queue a few times settles it without real timers.
	const flushMicrotasks = async () => {
		for (let i = 0; i < 3; i++) await Promise.resolve();
	};

	it("forwards overlayOptions to showOverlay and invokes onHandle", async () => {
		const harness = makeHarness();
		const ui = await harness.init();
		const onHandle = vi.fn();
		const overlayOptions: OverlayOptions = {
			anchor: "bottom-center",
			width: "85%",
			maxHeight: "55%",
			margin: { bottom: 1, left: 2, right: 2 },
		};

		ui.custom<void>(() => new Container(), { overlay: true, overlayOptions, onHandle });

		await flushMicrotasks();
		expect(harness.showOverlay).toHaveBeenCalledTimes(1);
		expect(harness.showOverlay).toHaveBeenCalledWith(expect.any(Container), overlayOptions);
		expect(onHandle).toHaveBeenCalledTimes(1);
		expect(onHandle).toHaveBeenCalledWith(harness.fakeHandle);
	});

	it("resolves overlayOptions factories before showing the overlay", async () => {
		const harness = makeHarness();
		const ui = await harness.init();
		const overlayOptions: OverlayOptions = { anchor: "top-right", width: 40 };
		const resolveOverlayOptions = vi.fn(() => overlayOptions);

		ui.custom<void>(() => new Container(), {
			overlay: true,
			overlayOptions: resolveOverlayOptions,
		});

		await flushMicrotasks();
		expect(resolveOverlayOptions).toHaveBeenCalledTimes(1);
		expect(harness.showOverlay).toHaveBeenCalledWith(expect.any(Container), overlayOptions);
	});

	it("rejects and restores the editor when a custom factory fails", async () => {
		const harness = makeHarness();
		const ui = await harness.init();
		const failure = new Error("custom factory failed");

		await expect(ui.custom(() => Promise.reject(failure))).rejects.toBe(failure);

		expect(harness.editorContainer.children).toEqual([harness.editor]);
		expect(harness.setFocus).toHaveBeenLastCalledWith(harness.editor);
	});

	it("aborts a pending custom factory and disposes its late component", async () => {
		const harness = makeHarness();
		const ui = await harness.init();
		harness.editor.setText("draft before factory");
		const controller = new AbortController();
		const factory = Promise.withResolvers<Container>();
		const component = new Container() as Container & { dispose: Mock<() => void> };
		component.dispose = vi.fn();

		const pending = ui.custom(() => factory.promise, { signal: controller.signal });
		harness.editor.setText("draft typed while factory is pending");
		controller.abort();

		await expect(pending).rejects.toBe(controller.signal.reason);
		factory.resolve(component);
		await flushMicrotasks();

		expect(component.dispose).toHaveBeenCalledTimes(1);
		expect(harness.editorContainer.children).toEqual([harness.editor]);
		expect(harness.editor.getText()).toBe("draft typed while factory is pending");
	});
});

/**
 * A hook widget belongs to the extension that placed it, so a session switch
 * re-seats widgets instead of wiping them.
 *
 * **The regression this defends.** Every session-switch site called
 * `clearHookWidgets()`, which disposed *every* widget. An extension that was
 * not involved in the switch, and had not gone anywhere, lost its widget — and
 * got it back only if it happened to re-register on `session_start`. A status
 * bar from an unrelated extension therefore vanished on `/new`.
 *
 * **Why the assertion is on the container, not on a count.** "One widget was
 * disposed" is also what a *correct* unload produces, so a count cannot tell
 * "took down the wrong extension's widget" from "took down a dead one's". What
 * distinguishes them is WHICH component survives, so every row here names the
 * component it expects to still be mounted.
 */
describe("hook widgets are owned, and a session switch re-seats them", () => {
	const owner = "/ext/alpha";
	const other = "/ext/beta";

	/**
	 * A widget factory plus the component it will produce.
	 *
	 * `setWidget` takes a FACTORY `(ui, theme) => component`, not a component —
	 * so the component has to be reachable after the call for the assertion, and
	 * the factory has to be what is handed in. Returning both keeps a row from
	 * passing a bare `Container` and failing on the type instead of the contract.
	 */
	const widget = () => {
		const component = new Container() as Container & { dispose: Mock<() => void> };
		component.dispose = vi.fn();
		return { component, content: (() => component) as never };
	};

	it("keeps a live extension's widget across a session switch", async () => {
		const harness = makeHarness();
		harness.setLiveExtensions([owner]);
		const ui = await harness.init();
		const alpha = widget();
		ui.setWidget("alpha-status", alpha.content, { owner });

		// The switch. Under the old wipe this emptied the container.
		harness.controller.remountHookWidgets();

		// Presence, not just a count: the component that must still be there is
		// named, so a remount that kept the wrong one cannot pass.
		expect(harness.hookWidgetContainerAbove.children).toContain(alpha.component);
		expect(alpha.component.dispose).not.toHaveBeenCalled();
	});

	it("disposes only the widget whose extension is gone", async () => {
		const harness = makeHarness();
		harness.setLiveExtensions([owner, other]);
		const ui = await harness.init();
		const alpha = widget();
		const beta = widget();
		ui.setWidget("alpha-status", alpha.content, { owner });
		ui.setWidget("beta-status", beta.content, { owner: other });

		// `beta` unloads. `alpha` was never involved.
		harness.setLiveExtensions([owner]);
		harness.controller.remountHookWidgets();

		expect(beta.component.dispose).toHaveBeenCalledTimes(1);
		expect(alpha.component.dispose).not.toHaveBeenCalled();
		expect(harness.hookWidgetContainerAbove.children).toContain(alpha.component);
		expect(harness.hookWidgetContainerAbove.children).not.toContain(beta.component);
	});

	it("keeps a widget placed with no owner rather than guessing who it belongs to", async () => {
		// A tool call's own `ui` carries no extension, so nothing can be named as
		// its author. Disposing it would be a guess, and the guess is the same
		// silent loss the re-seat exists to stop.
		const harness = makeHarness();
		harness.setLiveExtensions([]);
		const ui = await harness.init();
		const anonymous = widget();
		ui.setWidget("tool-status", anonymous.content);

		harness.controller.remountHookWidgets();

		expect(harness.hookWidgetContainerAbove.children).toContain(anonymous.component);
		expect(anonymous.component.dispose).not.toHaveBeenCalled();
	});

	it("re-seats both bands, so a below-editor widget is not left behind", async () => {
		// The two bands are separate containers with separate maps; covering only
		// `above` would leave the disposal path for `below` untested and a widget
		// stranded in a container nothing clears.
		const harness = makeHarness();
		harness.setLiveExtensions([owner]);
		const ui = await harness.init();
		const above = widget();
		const below = widget();
		ui.setWidget("alpha-above", above.content, { owner });
		ui.setWidget("alpha-below", below.content, { owner, placement: "belowEditor" });

		harness.setLiveExtensions([]);
		harness.controller.remountHookWidgets();

		expect(above.component.dispose).toHaveBeenCalledTimes(1);
		expect(below.component.dispose).toHaveBeenCalledTimes(1);
		// Presence, not a child count: both bands carry a spacer of their own (an
		// `EditorTopGap` when empty, a `Spacer(1)` when not), so `children.length` is
		// never the number of widgets. Asserting on it would have made this row pass
		// against a container still holding a disposed widget.
		expect(harness.hookWidgetContainerAbove.children).not.toContain(above.component);
		expect(harness.hookWidgetContainerBelow.children).not.toContain(below.component);
	});

	it("clears a widget when the same key is re-placed, and does not double-mount", async () => {
		// The negative half: re-seating is not an accumulating append. Without the
		// per-key removal, a session switch would leave both the old and new
		// component mounted and the band would grow one row per switch.
		const harness = makeHarness();
		harness.setLiveExtensions([owner]);
		const ui = await harness.init();
		const first = widget();
		const second = widget();
		ui.setWidget("alpha-status", first.content, { owner });
		ui.setWidget("alpha-status", second.content, { owner });

		// The second placement replaces the first — one key is one line. Named
		// components, because the band's leading `Spacer(1)` makes a count of 2
		// indistinguishable from a correct single widget.
		expect(harness.hookWidgetContainerAbove.children).toContain(second.component);
		expect(harness.hookWidgetContainerAbove.children).not.toContain(first.component);
		expect(first.component.dispose).toHaveBeenCalledTimes(1);
	});
});
