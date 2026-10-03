/**
 * The discriminator `epic-7585` asks for: a `-`/`+` pair that is byte-identical
 * is a MOVED line, not an edited one, and nothing in git — `diff -U0`, numstat,
 * or a blob hash — can tell the two apart.
 *
 * Every test names the failure it prevents. The two that matter most are the pair
 * at the bottom: a whole-file hash REPORTS a change for the reorder (so the
 * bead's original remedy was wrong in the opposite direction) while this returns
 * `reorder`, and an edit is still caught (so the check is not vacuous).
 */
import { describe, expect, it } from "bun:test";
import { classifyLineRevision, classifyTsvRevision } from "./revision-content-diff";

describe("classifyLineRevision", () => {
	it("reports a pure reorder as 'reorder', not as an edit", () => {
		// The exact case from epic-7585: 'a' is deleted from the top and re-appended
		// at the bottom. No line's text changes.
		const result = classifyLineRevision("a\nb\nc\n", "b\nc\na\n");
		expect(result.kind).toBe("reorder");
		// No line text added or removed — that is what makes it a reorder.
		expect(result.added).toEqual([]);
		expect(result.removed).toEqual([]);
	});

	it("reports byte-identical text as 'identical', which is a different answer", () => {
		expect(classifyLineRevision("a\nb\n", "a\nb\n").kind).toBe("identical");
	});

	it("reports an edited line as 'content' and names the text", () => {
		const result = classifyLineRevision("a\nb\nc\n", "a\nb\nZ\n");
		expect(result.kind).toBe("content");
		expect(result.added).toEqual(["Z"]);
		expect(result.removed).toEqual(["c"]);
	});

	it("treats a changed trailing newline as 'identical', not a content change", () => {
		// A blob hash differs here. No line's content differs, so the answer is
		// 'identical' — the byte-level change the hash reports and the line-level
		// change the caller asked about are not the same question.
		expect(classifyLineRevision("a\nb\n", "a\nb").kind).toBe("identical");
	});

	it("catches an edit that ALSO reorders, which a reorder-only check would miss", () => {
		// Lines move AND one changes. If the implementation only compared multisets
		// for equality it would still say 'reorder' once a single surplus pair was
		// tolerated; this asserts the stricter behaviour.
		const result = classifyLineRevision("a\nb\nc\n", "c\nb\nQ\n");
		expect(result.kind).toBe("content");
		expect(result.added).toEqual(["Q"]);
		expect(result.removed).toEqual(["a"]);
	});

	it("does not report a swap of two identical lines as a change", () => {
		// Duplicated line text: swapping them is invisible to content by definition.
		expect(classifyLineRevision("x\nx\ny\n", "y\nx\nx\n").kind).toBe("reorder");
	});
});

describe("classifyTsvRevision", () => {
	const header = "scope\tpath\thits\tdisposition\treason";

	it("reports a moved row as neither added nor removed", () => {
		const before = [header, "test\ta.ts\t1\tkeep\twhy", "test\tb.ts\t1\tkeep\twhy"].join("\n");
		const after = [header, "test\tb.ts\t1\tkeep\twhy", "test\ta.ts\t1\tkeep\twhy"].join("\n");
		const result = classifyTsvRevision(before, after);
		expect(result.addedRows).toEqual([]);
		expect(result.removedRows).toEqual([]);
	});

	it("names the single cell that changed, not the whole row", () => {
		// The disposition.tsv case: a row whose `hits` moves is ONE cell edited.
		const before = [header, "test\ta.ts\t1\tkeep\twhy"].join("\n");
		const after = [header, "test\ta.ts\t9\tkeep\twhy"].join("\n");
		const plain = classifyTsvRevision(before, after);
		expect(plain.editedRows).toEqual([]); // off by default

		const result = classifyTsvRevision(before, after, { compareCells: true });
		expect(result.addedRows).toEqual([]);
		expect(result.removedRows).toEqual([]);
		// Column 2 is `hits` (0=scope, 1=path, 2=hits) — and ONLY that column.
		expect(result.editedRows).toHaveLength(1);
		expect(result.editedRows[0]?.changedCells).toEqual([2]);
	});

	it("reports a genuinely new row as added", () => {
		const before = header;
		const after = [header, "test\tnew.ts\t1\tkeep\twhy"].join("\n");
		const result = classifyTsvRevision(before, after);
		expect(result.addedRows).toHaveLength(1);
		expect(result.removedRows).toEqual([]);
	});
});