import { describe, expect, it } from "bun:test";
import {
	availableColumns,
	availableRows,
	PANE_BORDER_COLUMNS,
	PANE_BORDER_ROWS,
	viewportColumns,
	viewportRows,
} from "@oh-my-pi/pi-tui";

// One policy for the viewport fallback, in one place.
//
// Nine overlays and PTY panes each needed "rows available to lay out", and they
// disagreed: four fell back to 40 and two to 24, with nothing recording why. Two
// of them also duplicated `Math.max(20, cols - 2)` across packages. This file is
// where that policy is stated once, so it can be checked once.
//
// A consumer observes the difference as a pane rendered at the wrong height in a
// small terminal — the sort of thing that looks like a layout bug and gets
// "fixed" by nudging a constant, which is how the four-way split started.

const withSize = (columns: number, rows: number) => ({ viewportSize: { columns, rows } });
const withNothing = () => ({});

describe("viewportRows / viewportColumns", () => {
	it("reports the surface's own size when it has one", () => {
		expect(viewportRows(withSize(100, 40))).toBe(40);
		expect(viewportColumns(withSize(100, 40))).toBe(100);
	});

	it("falls back to the terminal when the surface has no size", () => {
		// A static render and a test fake both land here. `process.stdout.rows` is
		// 0 off a tty, so the last resort has to be a real number.
		const rows = viewportRows(withNothing());
		const columns = viewportColumns(withNothing());
		expect(rows).toBeGreaterThan(0);
		expect(columns).toBeGreaterThan(0);
	});

	it("treats a reported zero as a measurement, not a missing value", () => {
		// A surface can report 0 before the first resize lands, and a caller that
		// deliberately asks for a collapsed pane must get one. Using `||` here would
		// make "no height" and "height 0" the same answer, which silently gave a
		// collapsed rail a full-height one.
		expect(viewportRows(withSize(100, 0))).toBe(0);
		expect(viewportColumns(withSize(0, 40))).toBe(0);
	});

	it("honours a caller-supplied fallback", () => {
		// The two fallbacks were never interchangeable — a transcript overlay
		// needs room for chrome plus its three-row minimum, a PTY pane does not —
		// so collapsing them to one constant changed what those overlays draw, and
		// nothing failed until a rewind-selector test caught it.
		expect(viewportRows(withNothing(), 40)).toBeGreaterThanOrEqual(24);
		expect(viewportRows(withNothing(), 40)).toBe(viewportRows(withNothing(), 40));
		// A reported size still wins over whatever fallback was passed.
		expect(viewportRows(withSize(100, 33), 40)).toBe(33);
	});
});

describe("availableRows / availableColumns", () => {
	it("subtracts the border inset once, in one place", () => {
		// The `20`/`2` and `5`/`4` pairs are policy — a pane keeps a margin — not
		// arbitrary numbers, which is why they are named rather than inline.
		expect(availableColumns(withSize(100, 40))).toBe(100 - PANE_BORDER_COLUMNS);
		expect(availableRows(withSize(100, 40))).toBe(40 - PANE_BORDER_ROWS);
	});

	it("never returns less than a renderable minimum", () => {
		// A 4-column terminal minus a 2-column border would be 2, and a 0-row one
		// would be negative. Both render as a broken pane rather than a small one.
		expect(availableColumns(withSize(4, 2))).toBeGreaterThan(0);
		expect(availableRows(withSize(100, 1))).toBeGreaterThan(0);
	});
});
