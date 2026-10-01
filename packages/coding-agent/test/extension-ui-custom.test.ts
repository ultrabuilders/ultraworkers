import { describe, expect, it } from "bun:test";
import { noOpUIContext } from "../src/extensibility/extensions/runner";
import { createNoOpUIContext } from "../src/extensibility/utils";

/**
 * `ui.custom` mounts an author's own component and resolves with whatever that
 * component's value is. A context that cannot mount it has no value to produce —
 * and the failure it used to report was not a failure at all: `undefined as never`
 * satisfies the declared `Promise<T>`, so an author who awaited a result got
 * `undefined`, saw no error, and had no way to tell their factory had never run.
 *
 * That lie shipped in FOUR contexts. One was fixed and three were not, which is
 * the whole shape of the defect: `c91879c944` stated a claim about `ui.custom`
 * that was true of the implementation its author had measured and false of the
 * other three. A fix that holds only on the path its author tried is not a fix of
 * the contract, it is a fix of an instance.
 *
 * So the invariant below is deliberately cross-context: it names every frameless
 * context a test can construct, and asserts they agree. Adding a context without
 * a row here is how the next instance gets shipped.
 */
describe("a context that cannot render `custom` must throw, not resolve", () => {
	// Enumerated, not looped over a keyof: the list IS the contract, and a loop would
	// quietly skip a context that stopped being a function.
	//
	// COVERAGE GAP, stated rather than hidden: `RpcExtensionUIContext`
	// (`modes/rpc/rpc-mode.ts`) and the ACP context (`modes/acp/acp-agent.ts`) both
	// carry this member and both now throw, but neither is constructible from a test
	// — one is a class nested inside `runRpcMode`, the other an object literal inside a
	// module-private function. They are held by review, not by this file.
	const FRAMELESS: ReadonlyArray<readonly [string, () => { custom: (f: () => never) => unknown }]> = [
		["noOpUIContext", () => noOpUIContext],
		["createNoOpUIContext", () => createNoOpUIContext()],
	];

	for (const [name, make] of FRAMELESS) {
		it(`${name} throws instead of resolving a value no factory produced`, () => {
			// The value the factory would have returned, to prove it never came back.
			const sentinel = { produced: true };
			let message = "";
			try {
				void make().custom(() => sentinel as never);
			} catch (error) {
				message = (error as Error).message;
			}
			expect(message, `${name} resolved a value its factory never produced`).not.toBe("");
			expect(message).toContain("custom");
		});

		it(`${name} does not run the factory`, async () => {
			// The other half of the same contract. A context that cannot mount the
			// component has no business invoking it — and an extension that relied on
			// the factory's side effects would otherwise get them in a mode with no
			// frame to show the result in.
			let invoked = false;
			let threw = false;
			try {
				void make().custom(() => {
					invoked = true;
					return undefined as never;
				});
			} catch {
				threw = true;
			}
			expect(threw).toBe(true);
			expect(invoked, `${name} ran a factory it cannot render the result of`).toBe(false);
		});
	}

	it("the message omits setStatus, because custom returns the caller's own value", () => {
		// Without this, unifying the message across surfaces keeps every other row in
		// this file green — which is precisely how the split could be lost.
		let message = "";
		try {
			void noOpUIContext.custom(() => null as never);
		} catch (error) {
			message = (error as Error).message;
		}
		expect(message).toContain("hasUI");
		expect(message, "pointed an author at a surface that cannot return their value").not.toContain("setStatus");
	});
});
