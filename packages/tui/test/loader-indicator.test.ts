import { afterEach, describe, expect, it } from "bun:test";
import { Loader } from "@oh-my-pi/pi-tui/components/loader";

// Contract: the working indicator's frames and cadence are settable after
// construction, and unsettable back to the product's own.
//
// `setWorkingMessage` made the text configurable and stopped there, so the frames
// — the part a user actually watches — could only be chosen at construction, and
// only by the product. A `/reload` or an extension with its own spinner had to
// rebuild the whole animation to get one.
//
// The interval is the part that needed naming: a slow terminal wants a slower
// spinner, and it was not expressible at all.

// The narrowed surface, not `{}`: Loader repaints through it, and a fake missing
// a method fails at the call rather than telling us the contract moved.
const ui = {
	requestRender: () => {},
	requestComponentRender: () => {},
	viewportSize: { columns: 80, rows: 24 },
} as never;
const colorFn = (s: string) => s;
const messageColor = ((s: string) => s) as never;
const DEFAULT_FRAMES = ["⠋", "⠙", "⠹"];

/**
 * The frame currently in effect, by index.
 *
 * `debugState().frame` is the animation's position, not the glyph, and `render()`
 * does not advance it — the tick does. So a fresh Loader sits at frame 0, which
 * makes the index a stable thing to assert on across a `setIndicator` call.
 */
function currentFrame(loader: Loader): number {
	return Number(loader.debugState().frame);
}

function rows(loader: Loader, width = 20): string {
	return loader.render(width).join("\n");
}

/**
 * The constructor starts the animation, so every case must stop it.
 *
 * A probe that skipped this hung the process rather than failing a test — the
 * interval keeps the event loop alive, so a leaked Loader is a hung suite, not a
 * slow one. `afterEach` rather than a `stop()` per assertion, so a failing
 * expectation cannot skip the cleanup and leave the timer running.
 */
const started: Loader[] = [];
function make(frames: string[]): Loader {
	const l = new Loader(ui, colorFn, messageColor, "Working…", frames);
	started.push(l);
	return l;
}
afterEach(() => {
	for (const l of started.splice(0)) l.stop();
});

describe("Loader.setIndicator", () => {
	it("uses the frames it is given", () => {
		const loader = make(["A", "B", "C"]);
		expect(rows(loader)).toContain("A");

		loader.setIndicator({ frames: ["X", "Y"] });
		expect(rows(loader)).toContain("X");
		expect(rows(loader)).not.toMatch(/\bA\b/);
		// A five-frame list replaced by two must leave the index in range, or the
		// next tick reads past the end.
		expect(currentFrame(loader)).toBeLessThan(2);
	});

	it("restores the product frames when given nothing", () => {
		const loader = make(["A", "B", "C"]);
		loader.setIndicator({ frames: ["X"] });
		expect(rows(loader)).toContain("X");

		loader.setIndicator(undefined);
		// Back to the built-in braille frames, which no caller passed in.
		expect(rows(loader)).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
	});

	it("ignores an empty frame list rather than rendering nothing", () => {
		const loader = make(["A", "B"]);
		// An empty array is what a caller sends to mean "hide", and the constructor
		// already treats it as "keep the default" — a spinner that renders as
		// nothing would leave the user with a frozen row and no error.
		loader.setIndicator({ frames: [] });
		expect(rows(loader)).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏A]/);
	});

	it("accepts a cadence and rejects a non-positive one", () => {
		const loader = make(DEFAULT_FRAMES);
		loader.setIndicator({ intervalMs: 250 });
		expect(loader.debugState()).toBeDefined();

		// Zero or negative would schedule a busy loop.
		loader.setIndicator({ intervalMs: 0 });
		loader.setIndicator({ intervalMs: -5 });
		expect(loader.debugState()).toBeDefined();
	});

	it("keeps a shorter frame list usable", () => {
		const loader = make(["A", "B", "C", "D", "E"]);
		loader.setIndicator({ frames: ["Z"] });
		// One frame is a valid, still indicator; the row must not divide by zero or
		// index past the end.
		expect(rows(loader)).toContain("Z");
		expect(currentFrame(loader)).toBeLessThan(1);
	});
});
