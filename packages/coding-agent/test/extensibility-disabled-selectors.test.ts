/**
 * The `disabledExtensions` opt-out grammar.
 *
 * What this defends is not "a selector matches" — it is that the list is read as
 * an ordered instruction rather than a set. A deny-list that ignores order can
 * express only the sets a user is willing to enumerate, and the families this
 * grammar exists for (`*`, `vendor.*`) are precisely the ones nobody enumerates.
 * So the cases that matter are the pairs that disagree only by order.
 */
import { describe, expect, test } from "bun:test";
import { createExtensionOptOut } from "../src/extensibility/settings";

describe("disabledExtensions selectors", () => {
	test("an exact name disables only that name", () => {
		const disabled = createExtensionOptOut(["mine"]);

		expect(disabled("mine")).toBe(true);
		expect(disabled("yours")).toBe(false);
	});

	test("an empty list disables nothing", () => {
		const disabled = createExtensionOptOut([]);

		expect(disabled("mine")).toBe(false);
		expect(disabled("anything")).toBe(false);
	});

	test("a prefix wildcard disables the family and nothing beside it", () => {
		const disabled = createExtensionOptOut(["vendor.*"]);

		expect(disabled("vendor.one")).toBe(true);
		expect(disabled("vendor.two.deep")).toBe(true);
		// The prefix is anchored at a dot: `vendorish` is a different family, and a
		// rule that disabled it would silently take out extensions the user never named.
		expect(disabled("vendorish")).toBe(false);
	});

	test("`*` disables everything", () => {
		const disabled = createExtensionOptOut(["*"]);

		expect(disabled("mine")).toBe(true);
		expect(disabled("anything.at.all")).toBe(true);
	});

	// The load-bearing pair. Both are "everything except mine", expressed in the two
	// orders a user could plausibly write, and they must disagree: order is the only
	// thing distinguishing them.
	test("order decides, so a later negation re-enables and an earlier one does not", () => {
		expect(createExtensionOptOut(["*", "-mine"])("mine")).toBe(false);
		expect(createExtensionOptOut(["*", "-mine"])("other")).toBe(true);

		expect(createExtensionOptOut(["-mine", "*"])("mine")).toBe(true);
		expect(createExtensionOptOut(["-mine", "*"])("other")).toBe(true);
	});

	test("a negation reaches back through a prefix wildcard", () => {
		const disabled = createExtensionOptOut(["vendor.*", "-vendor.keep"]);

		expect(disabled("vendor.drop")).toBe(true);
		expect(disabled("vendor.keep")).toBe(false);
	});

	test("a later bare entry re-enables after a negation", () => {
		const disabled = createExtensionOptOut(["-mine", "mine"]);

		expect(disabled("mine")).toBe(true);
	});

	test("a negation of something never disabled changes nothing", () => {
		const disabled = createExtensionOptOut(["-mine"]);

		expect(disabled("mine")).toBe(false);
		expect(disabled("other")).toBe(false);
	});

	// Without this the grammar could be satisfied by a set-based implementation that
	// only happens to pass the cases above in one direction.
	test("the last matching entry wins, whichever way it was written", () => {
		expect(createExtensionOptOut(["a", "b"])("b")).toBe(true);
		expect(createExtensionOptOut(["b", "-b", "b"])("b")).toBe(true);
		expect(createExtensionOptOut(["b", "b", "-b"])("b")).toBe(false);
	});
});
