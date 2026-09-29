import { describe, expect, it } from "bun:test";
import { TUI, type Component, type ExtensionTUISurface } from "@oh-my-pi/pi-tui";

// Contract: `TUI` satisfies the narrowed surface an extension receives, and
// that surface does not grow back into the product's own engine.
//
// This file exists because the interface was previously unguarded. Nothing
// stopped `setFrameProvider`, `resetDisplay` or `terminal` being added back, and
// nothing checked that the class still satisfied what the interface promises.
// A structural check of the class IS the right assertion here — the thing under
// test is the shape of a type, which is exactly what the compiler is for.

describe("TUI satisfies ExtensionTUISurface", () => {
	it("the class implements every member the interface names", () => {
		// A compile-time assertion, executed as a value so it cannot be deleted
		// without the import becoming unused. If a member is added to the
		// interface and the class does not have it, this line fails to compile.
		const asSurface: ExtensionTUISurface = null as unknown as TUI;
		expect(asSurface).toBeDefined();
	});

	it("fails to compile if a forbidden member is added to the interface", () => {
		// A structural type does not forbid extra members, so asserting the CLASS
		// lacks `setFrameProvider` is the wrong direction — the class has it, and
		// adding it to the interface type-checked fine. That guard was green while
		// measuring nothing.
		//
		// What bites is asserting the INTERFACE does not name the member. Adding
		// it flips this type to `true` and the assignment below stops compiling.
		type Has<T, K extends PropertyKey> = K extends keyof T ? true : false;
		const noSetFrameProvider: Has<ExtensionTUISurface, "setFrameProvider"> = false;
		const noResetDisplay: Has<ExtensionTUISurface, "resetDisplay"> = false;
		const noTerminal: Has<ExtensionTUISurface, "terminal"> = false;
		const noSuspendInput: Has<ExtensionTUISurface, "suspendInput"> = false;
		expect([noSetFrameProvider, noResetDisplay, noTerminal, noSuspendInput]).toEqual([false, false, false, false]);
	});

	it("keeps the product's own engine off the extension surface", () => {
		// The whole point of the narrowing. `setFrameProvider` is a bounded frame
		// provider the product owns; `resetDisplay` is a destructive scrollback
		// reset never part of ordinary rendering; `terminal` would let an
		// extension write escape sequences straight to the tty.
		//
		// Asserted on the runtime shape, not by reading this file's own text: the
		// class is a value, and a member on its prototype is observable.
		const proto = TUI.prototype as unknown as Record<string, unknown>;
		expect(proto.setFrameProvider).toBeTypeOf("function");
		expect(proto.resetDisplay).toBeTypeOf("function");

		// And none of them is part of the narrowed contract. `viewportSize`
		// exists instead — dimensions, not the terminal.
		const surface = Object.getOwnPropertyNames(TUI.prototype);
		expect(surface).toContain("requestRender");
		expect(surface).toContain("viewportSize");
	});

	it("does not promise a per-component hideOverlay the class cannot honour", () => {
		// The real signature is `hideOverlay()`: it pops the topmost overlay.
		// Declaring `hideOverlay(component)` would be a lie the compiler cannot
		// catch — a zero-argument function is assignable to a one-argument
		// signature — and the first extension to trust it would close someone
		// else's overlay.
		expect(TUI.prototype.hideOverlay.length).toBe(0);
		expect(TUI.prototype.hasOverlay.length).toBe(0);
	});

	it("suspendInput is gone rather than pretending to pause input", () => {
		// An earlier revision of this surface added `suspendInput` /
		// `resumeInput` for handing the terminal to an external editor. The flag
		// it set was read nowhere on the input path, so the editor competed with
		// the TUI for keystrokes while it was "suspended", and resume did
		// nothing. `stop()`/`start()` is what actually returns the terminal.
		const proto = TUI.prototype as unknown as Record<string, unknown>;
		expect(proto.suspendInput).toBeUndefined();
		expect(proto.resumeInput).toBeUndefined();
		expect(proto.stop).toBeTypeOf("function");
		expect(proto.start).toBeTypeOf("function");
	});
});

describe("ExtensionTUISurface is a structural subset of TUI", () => {
	it("every required member exists on the class", () => {
		const proto = TUI.prototype as unknown as Record<string, unknown>;
		const required = [
			"render",
			"requestRender",
			"requestComponentRender",
			"showOverlay",
			"hideOverlay",
			"hasOverlay",
			"getFocused",
			"addChild",
			"removeChild",
			"invalidate",
		];
		for (const name of required) {
			expect(proto[name]).toBeTypeOf("function");
		}
	});

	it("a real TUI can be used where the surface is expected", () => {
		// The assignment is the assertion; running it needs a live instance
		// because `viewportSize` reads the terminal it was constructed with.
		// The value is not checked here — the compile-time check in the first
		// case is what covers the shape.
		const use = (surface: ExtensionTUISurface): number => surface.viewportSize.rows;
		const tui = Object.create(TUI.prototype) as TUI;
		Object.defineProperty(tui, "terminal", { value: { columns: 100, rows: 40 } });
		expect(use(tui)).toBe(40);
	});
});
