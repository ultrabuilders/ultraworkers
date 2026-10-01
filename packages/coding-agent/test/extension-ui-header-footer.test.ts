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
