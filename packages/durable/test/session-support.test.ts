import { defineDoc } from "@ultraworkers/pi-durable";
import { describe, expect, it } from "bun:test";
import { singleVersion } from "./session-support";

/**
 * Contract: `singleVersion` refuses a value whose keys are not the ones its token declares.
 *
 * This helper narrows the widened `DocumentState`/`DocumentWatch` value back to the shape a token
 * names. `observedOperations` in `session/session.ts` really does replace an observer's root when a
 * commit arrives under a different definition version, so the widened type is honest and the cast is
 * not — it needs a check behind it, and a check nobody has ever watched fire is a cast in disguise.
 *
 * Measured, not assumed: replacing the key comparison with `if (false)` left the whole `durable`
 * suite at **370 pass / 1 skip / 0 fail**. Nothing else in the tree exercises this branch, so these
 * cases are what hold it up.
 */
describe("singleVersion", () => {
	const Doc = defineDoc<{ value: number }>({
		kind: "narrow.single-version",
		version: 1,
		scope: "session",
		initial: () => ({ value: 0 }),
	});

	it("passes a value carrying exactly the declared keys through", () => {
		const value = { value: 7 };
		expect(singleVersion(Doc, value)).toBe(value);
	});

	it("keeps null null, so an unwritten document needs no narrowing", () => {
		expect(singleVersion(Doc, null)).toBeNull();
	});

	it("throws when a second definition version delivered its own keys", () => {
		// The real migration case: `session-checkpoints-migrations.test.ts` proves the runtime hands
		// an observer of version 1 the version 2 value. Reproduced here on the narrowing itself,
		// because that test asserts the runtime and must not also be made to assert this helper.
		expect(() => singleVersion(Doc, { values: [1, 2] })).toThrow(/do not match the declared shape/);
	});

	it("throws when the value keeps some declared keys and gains others", () => {
		expect(() => singleVersion(Doc, { value: 1, migrated: true })).toThrow(/do not match the declared shape/);
	});
});
