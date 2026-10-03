/**
 * Classify what changed between two revisions of a text: a line's CONTENT
 * changing, or lines only moving.
 *
 * `epic-7585` is the reason this exists. On a unified diff a `-`/`+` pair can be
 * byte-identical — a row pushed down by an insertion above it reads exactly like a
 * row that was edited, and reading it by eye says "this row was changed". The
 * whole-file hash does not settle it either, and the bead's own first correction
 * got the direction wrong: reordering three lines DOES change the blob hash, so a
 * differing hash is not evidence that any line's content changed. Hash answers
 * "did the file change"; nothing in git answers "was a line edited".
 *
 * The discriminator is a MULTISET comparison. Two texts carry the same line
 * content exactly when the multiset of their lines is equal, whatever order those
 * lines appear in. When that holds, the difference is a reorder and no line was
 * touched. When it does not, some line's content genuinely differs.
 *
 * For TSV this is applied per CELL rather than per line, because a disposition
 * row is changed by editing one field — and a whole-line multiset comparison
 * would report that as an edit even when only `hits` moved from 8 to 9, which is
 * the same false positive one level down.
 */

export type RevisionChangeKind = "identical" | "reorder" | "content";

export interface LineContentChange {
	readonly kind: RevisionChangeKind;
	/** Lines whose text appears in `after` and not in `before`, as text-with-count. */
	readonly added: readonly string[];
	/** Lines whose text appears in `before` and not in `after`, as text-with-count. */
	readonly removed: readonly string[];
}

/** Multiset difference: entries of `a` not covered by `b`, each repeated by surplus count. */
function surplus(a: readonly string[], b: readonly string[]): string[] {
	const remaining = new Map<string, number>();
	for (const line of b) remaining.set(line, (remaining.get(line) ?? 0) + 1);
	const out: string[] = [];
	for (const line of a) {
		const left = remaining.get(line) ?? 0;
		if (left > 0) remaining.set(line, left - 1);
		else out.push(line);
	}
	return out;
}

function splitLines(text: string): string[] {
	if (text === "") return [];
	// A trailing newline terminates the last line rather than starting a new one,
	// so "a\nb\n" is two lines, not three. `split` would report the empty tail.
	return text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
}

/**
 * Classify a text revision as unchanged, reordered, or content-changed.
 *
 * Trailing newlines are normalised by `splitLines`, so a file that only gained or
 * lost its final newline is `identical` — that is a byte-level difference with no
 * line content change, which is precisely the class a blob hash would misreport.
 */
export function classifyLineRevision(before: string, after: string): LineContentChange {
	const b = splitLines(before);
	const a = splitLines(after);
	const added = surplus(a, b);
	const removed = surplus(b, a);
	// Equal sequences and equal multisets are different answers: "identical" says
	// the bytes are in the same order, "reorder" says the same lines came back in a
	// different order. Collapsing them would lose the one distinction this module
	// exists to draw, so the sequence is checked before the multiset.
	if (b.length === a.length && b.every((line, i) => line === a[i])) {
		return { kind: "identical", added, removed };
	}
	if (added.length === 0 && removed.length === 0) return { kind: "reorder", added, removed };
	return { kind: "content", added, removed };
}

export interface TsvCellChange {
	/** Rows present in `after` but not `before`, whole-line. */
	readonly addedRows: readonly string[];
	/** Rows present in `before` but not `after`, whole-line. */
	readonly removedRows: readonly string[];
	/**
	 * Rows that differ in at least one CELL but whose row shape is otherwise the
	 * same path/scope. Empty unless `compareCells` was requested.
	 */
	readonly editedRows: ReadonlyArray<{ readonly row: string; readonly changedCells: readonly number[] }>;
}

export interface ClassifyTsvOptions {
	/**
	 * When true, also report rows that kept their identity but changed a cell.
	 * Off by default because it costs a per-cell pass and most callers only need
	 * the row-level answer.
	 */
	readonly compareCells?: boolean;
}

/**
 * Classify a TSV revision, optionally naming the cells that changed.
 *
 * A row is identified by its leading identity columns — scope and path — so a row
 * whose `hits` moved from 8 to 9 is reported as an edit to that one cell rather
 * than as one row removed plus one unrelated row added.
 */
export function classifyTsvRevision(before: string, after: string, options: ClassifyTsvOptions = {}): TsvCellChange {
	const rowsOf = (text: string): Map<string, string[]> => {
		const out = new Map<string, string[]>();
		for (const line of splitLines(text)) {
			if (line === "") continue;
			const cells = line.split("\t");
			// Rows sharing an identity are kept in encounter order; a table whose
			// identity is not unique cannot be compared per-cell and is reported by
			// whole row instead.
			const key = `${cells[0] ?? ""}\u0000${cells[1] ?? ""}`;
			const existing = out.get(key);
			if (existing) existing.push(line);
			else out.set(key, [line]);
		}
		return out;
	};

	const bRows = rowsOf(before);
	const aRows = rowsOf(after);
	const addedRows: string[] = [];
	const removedRows: string[] = [];
	const editedRows: Array<{ row: string; changedCells: number[] }> = [];

	for (const [key, aList] of aRows) {
		const bList = bRows.get(key);
		if (!bList) {
			addedRows.push(...aList);
			continue;
		}
		if (!options.compareCells) continue;
		const aSorted = [...aList].sort();
		const bSorted = [...bList].sort();
		for (let i = 0; i < Math.max(aSorted.length, bSorted.length); i++) {
			const aLine = aSorted[i];
			const bLine = bSorted[i];
			if (aLine === bLine) continue;
			const aCells = (aLine ?? "").split("\t");
			const bCells = (bLine ?? "").split("\t");
			const changed: number[] = [];
			for (let c = 0; c < Math.max(aCells.length, bCells.length); c++) {
				if (aCells[c] !== bCells[c]) changed.push(c);
			}
			editedRows.push({ row: aLine ?? "", changedCells: changed });
		}
	}
	for (const [key, bList] of bRows) {
		if (!aRows.has(key)) removedRows.push(...bList);
	}

	return { addedRows, removedRows, editedRows };
}
