import { describe, expect, it } from "bun:test";
import { noOpUIContext } from "../src/extensibility/extensions/runner";

/**
 * `setHeader` / `setFooter` take a component factory. Honouring them means
 * mounting a component into a frame, so a context with no frame cannot succeed
 * — it used to return silently, which meant an extension authored a footer,
 * saw no error, and shipped one that never appeared.
 *
 * These assertions pin the failure, because the failure is the contract: an
 * author who gets an error can fix it, and one who gets silence cannot.
 */
describe("setHeader / setFooter must not swallow", () => {
	it("throws in a frameless context instead of returning silently", () => {
		expect(() => noOpUIContext.setHeader(undefined)).toThrow(/setHeader/);
		expect(() => noOpUIContext.setFooter(undefined)).toThrow(/setFooter/);
	});

	it("distinguishes the two surfaces, so the message points at the offending call", () => {
		let headerMessage = "";
		let footerMessage = "";
		try {
			noOpUIContext.setHeader(undefined);
		} catch (error) {
			headerMessage = (error as Error).message;
		}
		try {
			noOpUIContext.setFooter(undefined);
		} catch (error) {
			footerMessage = (error as Error).message;
		}
		expect(headerMessage).not.toBe(footerMessage);
		expect(headerMessage).not.toBe("");
		expect(footerMessage).not.toBe("");
	});

	it("points the author at a surface that does work without a frame", () => {
		// A bare "unsupported" strands the author. The message must name a way forward.
		expect(() => noOpUIContext.setFooter(undefined)).toThrow(/setWidget|setStatus|hasUI/);
	});

	it("does not send a frameless author to a surface that is a no-op there", () => {
		// `setEditorComponent` is the one surface that mounts a component on a framed
		// context, so it is the natural thing to name. On THIS context it is a silent
		// no-op (`runner.ts:487`) — so naming it would swap a loud failure for the exact
		// silence this file exists to end, and an author following the advice would get
		// nothing and have no way to tell the advice was wrong.
		//
		// This is a negative contract, and it is load-bearing in the other direction too:
		// the fix that added `setEditorComponent` to both messages is exactly the
		// regression this row catches.
		const message = (() => {
			try {
				noOpUIContext.setFooter(undefined);
				return "";
			} catch (error) {
				return (error as Error).message;
			}
		})();
		expect(message).not.toBe("");
		expect(message).not.toContain("setEditorComponent");
		// It must still offer the two that genuinely hold on a frameless context.
		expect(message).toContain("hasUI");
		expect(message).toContain("setStatus");
	});
});

/**
 * The rest of `noOpUIContext`. `setHeader`/`setFooter` were fixed first because they
 * take a component factory and honouring one means mounting a real component; the same
 * reasoning covers every other member that draws, and they were silent no-ops for just
 * as long.
 */
describe("every drawing surface on a frameless context must not swallow", () => {
	// Enumerated rather than looped over a keyof type: a loop would silently skip a
	// member that stopped being a function, and the list IS the contract. `setStatus`
	// is excluded on purpose — see the row that pins why.
	const FRAMELESS_THROWS: ReadonlyArray<readonly [string, () => unknown]> = [
		["setWidget", () => noOpUIContext.setWidget("k", [])],
		["setEditorComponent", () => noOpUIContext.setEditorComponent(undefined)],
		["setEditorText", () => noOpUIContext.setEditorText("x")],
		["setTitle", () => noOpUIContext.setTitle("x")],
		["setWorkingMessage", () => noOpUIContext.setWorkingMessage("x")],
		["setWorkingIndicator", () => noOpUIContext.setWorkingIndicator({ frames: ["."] })],
		["setToolsExpanded", () => noOpUIContext.setToolsExpanded(true)],
	];

	for (const [name, call] of FRAMELESS_THROWS) {
		it(`${name} throws instead of returning silently`, () => {
			// The regression each row defends is an author shipping a UI that never
			// appears: they called it, nothing threw, and there is no way to tell from
			// the extension that the call was dropped.
			let message = "";
			try {
				call();
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message, `${name} returned silently`).not.toBe("");
			// The message must name the surface that actually failed, so the reader
			// knows which call to change rather than which file to open.
			expect(message).toContain(name);
		});
	}

	it("still offers a way forward that works here", () => {
		// A failure with no exit is a wall. `hasUI` and `setStatus` are named because
		// both hold on every frameless context; `setEditorComponent` is named on the
		// TUI message instead, because here it is itself a no-op.
		let message = "";
		try {
			noOpUIContext.setWidget("k", []);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toContain("hasUI");
		expect(message).toContain("setStatus");
		expect(message).not.toContain("setEditorComponent");
	});

	it("leaves setStatus silent, because it is the path the message recommends", () => {
		// The exception, and it is load-bearing in both directions. `setStatus` has two
		// real callers on this context (`annotate/index.ts:286,303`) AND it is what the
		// frameless message tells authors to use — so throwing here would break a live
		// caller and invalidate the advice in the very message that gives it.
		//
		// If this row goes red, the fix is not to make `setStatus` throw: it is to
		// change the message to recommend something that does work.
		expect(() => noOpUIContext.setStatus("key", "text")).not.toThrow();
	});
});
