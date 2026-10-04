import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const templateJs = readFileSync(new URL("../src/export/html/template.js", import.meta.url), "utf8");

/**
 * Locate the keydown handler and return its body.
 *
 * The anchor is a regex rather than a literal because the handler is found by
 * its SHAPE, not by its formatting. A literal that hard-codes quote style makes
 * this file fail the moment `template.js` is run through the formatter — which
 * changes how the subject is written, not what it does — and that failure is
 * indistinguishable from the real one it is meant to catch.
 *
 * Everything past the anchor is behavioural: the body is executed below against
 * a synthetic event, so only the locator needs to tolerate formatting.
 */
function extractKeydownHandlerBody(source: string): string {
	const anchor = /document\.addEventListener\(\s*(['"])keydown\1\s*,\s*\(?e\)?\s*=>\s*\{/.exec(source);
	if (anchor === null) throw new Error("template.js has no keydown handler to exercise");
	const bodyStart = source.indexOf("{", anchor.index) + 1;
	let depth = 1;
	for (let i = bodyStart; i < source.length; i++) {
		const ch = source[i];
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return source.slice(bodyStart, i);
		}
	}
	throw new Error("keydown listener did not close");
}

function exerciseShortcut(body: string, eventInit: Record<string, unknown>) {
	const calls: string[] = [];
	let prevented = false;
	const e = {
		key: eventInit.key,
		ctrlKey: Boolean(eventInit.ctrlKey),
		metaKey: Boolean(eventInit.metaKey),
		altKey: Boolean(eventInit.altKey),
		target: eventInit.target ?? { tagName: "BODY", isContentEditable: false },
		preventDefault() {
			prevented = true;
		},
	};
	const run = new Function(
		"e",
		"overlayStack",
		"popSubSession",
		"searchInput",
		"searchQuery",
		"navigateTo",
		"leafId",
		"toggleThinking",
		"toggleToolOutputs",
		body,
	);
	run(
		e,
		[],
		() => calls.push("pop"),
		{ value: "needle" },
		"needle",
		() => calls.push("navigate"),
		"leaf",
		() => calls.push("thinking"),
		() => calls.push("tools"),
	);
	return { calls, prevented };
}

describe("HTML export keyboard shortcuts", () => {
	const keydownBody = extractKeydownHandlerBody(templateJs);

	it("toggles thinking and tool outputs with bare keys", () => {
		expect(exerciseShortcut(keydownBody, { key: "t" })).toEqual({ calls: ["thinking"], prevented: true });
		expect(exerciseShortcut(keydownBody, { key: "T" })).toEqual({ calls: ["thinking"], prevented: true });
		expect(exerciseShortcut(keydownBody, { key: "o" })).toEqual({ calls: ["tools"], prevented: true });
		expect(exerciseShortcut(keydownBody, { key: "O" })).toEqual({ calls: ["tools"], prevented: true });
	});

	it("does not intercept browser-reserved modifier chords", () => {
		expect(exerciseShortcut(keydownBody, { key: "t", ctrlKey: true })).toEqual({ calls: [], prevented: false });
		expect(exerciseShortcut(keydownBody, { key: "o", ctrlKey: true })).toEqual({ calls: [], prevented: false });
		expect(exerciseShortcut(keydownBody, { key: "t", metaKey: true })).toEqual({ calls: [], prevented: false });
		expect(exerciseShortcut(keydownBody, { key: "o", altKey: true })).toEqual({ calls: [], prevented: false });
	});

	it("leaves editable targets alone", () => {
		expect(
			exerciseShortcut(keydownBody, { key: "t", target: { tagName: "INPUT", isContentEditable: false } }),
		).toEqual({ calls: [], prevented: false });
		expect(
			exerciseShortcut(keydownBody, { key: "o", target: { tagName: "TEXTAREA", isContentEditable: false } }),
		).toEqual({ calls: [], prevented: false });
		expect(exerciseShortcut(keydownBody, { key: "T", target: { tagName: "DIV", isContentEditable: true } })).toEqual({
			calls: [],
			prevented: false,
		});
	});
});
