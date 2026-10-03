/**
 * An extension composer shape can declare that it is unavailable, and the selector
 * honours that instead of rendering a row that silently does nothing.
 *
 * `epic-m6`'s research recorded this gap as *"a smaller de-hardcoding target on the
 * composer-shape registry"*. What made it implementable rather than a new capability
 * is that `SelectItem.disabled` already exists at `components/select-list.ts:53` —
 * *"Disabled rows stay visible but are skipped by navigation and cannot activate."* The
 * widget shipped the state; nothing let an extension reach it. This closes that reach.
 *
 * The fail-closed cases are the load-bearing ones, and they are copied from
 * `../gajae-ref/packages/coding-agent/src/modes/action-registry.ts:118-140`: a predicate
 * that throws must mark the shape unavailable, never propagate. If it propagated, a
 * selector building its rows would render nothing at all and one broken extension would
 * take out every other composer shape.
 */
import { describe, expect, it } from "bun:test";
import { boxComposerStyle } from "../src";
import {
	BUILTIN_COMPOSER_SHAPES,
	getComposerShapeOptions,
	installExtensionComposerShape,
} from "../src/overlays/composer-shape-registry";

const shapeFor = (id: string) => ({ ...boxComposerStyle, id });

/** The option an extension registered under `id`, or undefined if it is absent. */
function optionFor(id: string) {
	return getComposerShapeOptions().find(option => option.value === id);
}

describe("composer shape availability", () => {
	it("leaves a shape available when no predicate is declared", () => {
		// The non-breaking default: every extension published against the current
		// signature omits `availability`, and must keep working.
		const uninstall = installExtensionComposerShape({ label: "Plain", style: shapeFor("plain-1") });
		expect(optionFor("plain-1")?.unavailableReason).toBeUndefined();
		uninstall();
	});

	it("marks a shape unavailable and carries the reason", () => {
		const uninstall = installExtensionComposerShape({
			label: "Needs Sixel",
			style: shapeFor("needs-sixel-1"),
			availability: () => false,
			unavailableReason: "requires sixel image support",
		});
		expect(optionFor("needs-sixel-1")?.unavailableReason).toBe("requires sixel image support");
		uninstall();
	});

	it("keeps an available shape free of a reason even when one is supplied", () => {
		// A reason left over from a previously-unavailable state must not persist and
		// render an available row as inert.
		const uninstall = installExtensionComposerShape({
			label: "Sometimes",
			style: shapeFor("sometimes-1"),
			availability: () => true,
			unavailableReason: "requires something",
		});
		expect(optionFor("sometimes-1")?.unavailableReason).toBeUndefined();
		uninstall();
	});

	it("fails CLOSED when the predicate throws, and does not propagate", () => {
		// The regression this whole design exists to prevent. A throwing predicate
		// that escaped would abort the option list, so every shape would vanish.
		const uninstall = installExtensionComposerShape({
			label: "Broken",
			style: shapeFor("broken-1"),
			availability: () => {
				throw new Error("capability probe exploded");
			},
			unavailableReason: "capability check failed",
		});
		// Calling it directly IS the not-propagating assertion: a predicate that
		// escaped would throw right here and fail the test.
		const options = getComposerShapeOptions();
		expect(options.find(option => option.value === "broken-1")?.unavailableReason).toBe("capability check failed");
		// Every built-in must survive the failure — one broken extension cannot take
		// out the shapes it has nothing to do with. Exact, so a dropped row is red.
		expect(options.length).toBe(BUILTIN_COMPOSER_SHAPES.length + 1);
		uninstall();
	});

	it("re-evaluates per read, so availability tracks the host rather than install time", () => {
		// A predicate evaluated once at registration would freeze whatever the
		// capability was when the extension loaded.
		let supported = false;
		const uninstall = installExtensionComposerShape({
			label: "Live",
			style: shapeFor("live-1"),
			availability: () => supported,
			unavailableReason: "requires the capability",
		});
		expect(optionFor("live-1")?.unavailableReason).toBe("requires the capability");
		supported = true;
		expect(optionFor("live-1")?.unavailableReason).toBeUndefined();
		uninstall();
	});

	it("removes the shape entirely on uninstall", () => {
		const uninstall = installExtensionComposerShape({
			label: "Temporary",
			style: shapeFor("temp-1"),
			availability: () => true,
		});
		expect(optionFor("temp-1")).toBeDefined();
		uninstall();
		expect(optionFor("temp-1")).toBeUndefined();
	});
});
