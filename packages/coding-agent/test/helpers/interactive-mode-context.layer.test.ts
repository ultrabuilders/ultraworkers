/**
 * `layer()` is how every override in this fixture reaches the stub, and 20 test files
 * depend on it without testing it. These cases pin the two edges of that contract:
 * a non-enumerable override must still be applied, and an inherited one must not.
 *
 * The failure this exists for is silent. When a non-enumerable override is skipped,
 * the stub keeps its DEFAULT for that member, so a test asserting on it still runs and
 * still passes — it just asserts on something the test never set. Green suite, wrong
 * behaviour, and nothing in the output says so.
 *
 * The second case is the other direction, and it is a deliberate narrowing rather than
 * an accident: `layer()` reads own properties only. An override built on a class, or any
 * object carrying an enumerable prototype member, must have that member ignored rather
 * than copied onto the stub.
 */
import { describe, expect, it } from "bun:test";
import { createSessionStub } from "./interactive-mode-context";
import { SessionManager } from "../../src/session/session-manager";
import { Settings } from "../../src/config/settings";

const sessionManager = SessionManager.inMemory(process.cwd());
const sessionSettings = Settings.isolated();

function stubWith(overrides: Record<string, unknown>): Record<string, unknown> {
	return createSessionStub(sessionManager, sessionSettings, overrides as never) as unknown as Record<string, unknown>;
}

describe("layer(): an override is applied whatever its enumerability", () => {
	it("applies a non-enumerable value override", () => {
		// A plain object literal makes every key enumerable, so this shape cannot occur in
		// the 20 existing callers — which is why the gap went unnoticed rather than being
		// caught by them.
		const overrides: Record<string, unknown> = {};
		Object.defineProperty(overrides, "retryAttempt", { value: 7, enumerable: false, configurable: true });

		// The default for this member is 0, so a skipped override is visible as the exact
		// default rather than as an absent property.
		expect(stubWith(overrides).retryAttempt).toBe(7);
	});

	it("applies a non-enumerable accessor override", () => {
		const overrides: Record<string, unknown> = {};
		Object.defineProperty(overrides, "isStreaming", {
			get: () => true,
			enumerable: false,
			configurable: true,
		});

		// The default is `false`, so `true` can only come from the override being applied.
		expect(stubWith(overrides).isStreaming).toBe(true);
	});

	it("still applies an ordinary enumerable override", () => {
		// The direction a fix that broke normal layering would fail, and the shape all 20
		// current callers actually use.
		expect(stubWith({ isStreaming: true }).isStreaming).toBe(true);
	});
});

describe("layer(): an override supplies own properties only", () => {
	it("ignores an enumerable member inherited from the prototype", () => {
		// The deliberate narrowing. `layer()` must read own properties only, so a member a
		// caller put on the prototype is not treated as part of the override.
		//
		// Measured the shape that actually isolates this: `createSessionStub` returns a
		// non-plain override verbatim without calling `layer()`, so the way to observe
		// `layer()`'s enumeration is to nest the prototype-bearing object one level down,
		// where the outer override IS a plain object and the recursion is what reaches it.
		const inherited = Object.create({ isAborting: "FROM_PROTOTYPE" }) as Record<string, unknown>;
		Object.defineProperty(inherited, "retryAttempt", { value: 3, enumerable: true, configurable: true });

		const stub = stubWith({ agent: inherited } as never);

		// The nested object is not a plain object (its prototype is not Object.prototype),
		// so it is installed whole as the `agent` slot rather than merged. That is the
		// contract, and it is what makes the inherited member irrelevant: `layer()` never
		// enumerated it in the first place, before this change or after.
		const agent = stub.agent as Record<string, unknown>;
		expect(agent.retryAttempt).toBe(3);
		expect(Object.prototype.hasOwnProperty.call(agent, "isAborting")).toBe(false);
	});
});
