/**
 * Contract: a Markdown transform rewrites the source before it is parsed, and
 * the width it receives is the one the frame will draw at.
 *
 * The transform sits at PARSE time rather than after layout, so a rewrite that
 * changes the text changes what gets wrapped — which is the only placement where
 * an extension can influence the transcript rather than just recolour it.
 *
 * Applying it after the cache key is derived is the failure this guards: the
 * cached lines describe untransformed source, so a component whose transform
 * changed would keep drawing the previous frame's words.
 */
import { describe, expect, it } from "bun:test";
import { Markdown } from "@oh-my-pi/pi-tui/components/markdown";
import { defaultMarkdownTheme } from "./test-themes";

const THEME = defaultMarkdownTheme;

describe("Markdown transform", () => {
	it("renders the transformed text, not the source", () => {
		const plain = new Markdown("hello", 0, 0, THEME);
		const transformed = new Markdown("hello", 0, 0, THEME).setTransform(() => "goodbye");

		// The observable difference a user would see: the source word is gone from
		// the frame entirely, not merely styled.
		expect(transformed.render(60).join("\n")).toContain("goodbye");
		expect(transformed.render(60).join("\n")).not.toContain("hello");
		expect(plain.render(60).join("\n")).toContain("hello");
	});

	it("passes the width the frame will draw at", () => {
		// paddingX 0 in this component, so contentWidth equals the render width —
		// that equality is what makes the assertion meaningful rather than tautological.
		let seen = -1;
		const md = new Markdown("x", 0, 0, THEME).setTransform((_markdown, availableWidth) => {
			seen = availableWidth;
			return "x";
		});

		md.render(72);
		expect(seen).toBe(72);
	});

	it("re-renders when the transform is replaced", () => {
		const md = new Markdown("hello", 0, 0, THEME).setTransform(() => "first");
		expect(md.render(60).join("\n")).toContain("first");

		// Without the invalidation this still reads "first": the cached lines were
		// produced from the previous transform and nothing else would disturb them.
		md.setTransform(() => "second");
		const after = md.render(60).join("\n");
		expect(after).toContain("second");
		expect(after).not.toContain("first");
	});

	it("draws the source unchanged when no transform is set", () => {
		// The negative half: a seam that changed behaviour for everyone who never
		// opted in would be a regression in every transcript, not a new capability.
		const md = new Markdown("unchanged", 0, 0, THEME);
		expect(md.render(60).join("\n")).toContain("unchanged");

		md.setTransform(undefined);
		expect(md.render(60).join("\n")).toContain("unchanged");
	});

	it("applies the transform on a streaming append too", () => {
		const md = new Markdown("", 0, 0, THEME).setTransform(text => text.toUpperCase());
		md.render(60);

		md.setText("streamed");
		const frame = md.render(60).join("\n");
		expect(frame).toContain("STREAMED");
		expect(frame).not.toContain("streamed");
	});
});
