// Ported VERBATIM from pi-ref packages/tui/src/alt-screen-search.ts (lines 6-195).
// Copied rather than rewritten: the corpus builder and its match ranking ARE the
// behaviour, and a hand-written version would drift from them.
//
// Adaptation, in full:
//   - `getGraphemeSegmenter()` -> `getSegmenter()`, the name this repo exports
//     for the same function (both return the shared `Intl.Segmenter`).
//   - import specifiers are extensionless, per this repo's convention.
// Nothing else was touched.

import { getSegmenter, stripTerminalSequences, visibleWidth } from "../utils";

const segmenter = getSegmenter();

export interface SearchSourceSpan {
	textStart: number;
	textEnd: number;
	row: number;
	startCol: number;
	endCol: number;
	linearColumns: boolean;
}

export interface SearchCorpus {
	text: string;
	spans: SearchSourceSpan[];
}

export interface TranscriptSearchSegment {
	row: number;
	startCol: number;
	endCol: number;
}

export interface TranscriptSearchMatch {
	segments: TranscriptSearchSegment[];
}

const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;

export function buildSearchCorpus(lines: readonly string[]): SearchCorpus {
	const chunks: string[] = [];
	const spans: SearchSourceSpan[] = [];
	let textLength = 0;
	let pendingSeparator = false;

	const appendSeparator = (): void => {
		if (!pendingSeparator) return;
		chunks.push(" ");
		textLength += 1;
		pendingSeparator = false;
	};

	for (let row = 0; row < lines.length; row++) {
		const line = stripTerminalSequences(lines[row] ?? "");
		let column = 0;

		// Rendered transcripts are overwhelmingly ASCII. Index complete non-space
		// runs at once instead of segmenting and allocating one mapping per cell.
		if (PRINTABLE_ASCII.test(line)) {
			let index = 0;
			while (index < line.length) {
				if (line.charCodeAt(index) === 0x20) {
					if (textLength > 0) pendingSeparator = true;
					column += 1;
					index += 1;
					continue;
				}
				let end = index + 1;
				while (end < line.length && line.charCodeAt(end) !== 0x20) end += 1;
				appendSeparator();
				const text = line.slice(index, end);
				chunks.push(text);
				spans.push({
					textStart: textLength,
					textEnd: textLength + text.length,
					row,
					startCol: column,
					endCol: column + text.length,
					linearColumns: true,
				});
				textLength += text.length;
				column += text.length;
				index = end;
			}
		} else {
			for (const grapheme of segmenter.segment(line)) {
				const text = grapheme.segment;
				const width = visibleWidth(text);
				if (/^\s+$/u.test(text)) {
					if (textLength > 0) pendingSeparator = true;
					column += width;
					continue;
				}
				appendSeparator();
				chunks.push(text);
				spans.push({
					textStart: textLength,
					textEnd: textLength + text.length,
					row,
					startCol: column,
					endCol: column + width,
					linearColumns: false,
				});
				textLength += text.length;
				column += width;
			}
		}
		if (textLength > 0) pendingSeparator = true;
	}

	return { text: chunks.join(""), spans };
}

export function normalizeQuery(query: string): string {
	return query.replace(/\s+/gu, " ").trim();
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findSearchCorpusMatches(corpus: SearchCorpus, normalizedQuery: string): TranscriptSearchMatch[] {
	if (!normalizedQuery) return [];
	const expression = new RegExp(escapeRegExp(normalizedQuery), "giu");
	const matches: TranscriptSearchMatch[] = [];
	let spanIndex = 0;

	for (const match of corpus.text.matchAll(expression)) {
		const start = match.index;
		const end = start + match[0].length;
		while (spanIndex < corpus.spans.length && corpus.spans[spanIndex]!.textEnd <= start) spanIndex += 1;

		const segments: TranscriptSearchSegment[] = [];
		for (let index = spanIndex; index < corpus.spans.length; index++) {
			const span = corpus.spans[index]!;
			if (span.textStart >= end) break;
			if (span.textEnd <= start) continue;
			const startCol = span.linearColumns
				? span.startCol + Math.max(start, span.textStart) - span.textStart
				: span.startCol;
			const endCol = span.linearColumns ? span.startCol + Math.min(end, span.textEnd) - span.textStart : span.endCol;
			const previous = segments[segments.length - 1];
			if (previous && previous.row === span.row && startCol <= previous.endCol) {
				previous.endCol = Math.max(previous.endCol, endCol);
			} else {
				segments.push({ row: span.row, startCol, endCol });
			}
		}
		while (spanIndex < corpus.spans.length && corpus.spans[spanIndex]!.textEnd <= end) spanIndex += 1;
		if (segments.length > 0) matches.push({ segments });
	}

	return matches;
}

export interface TranscriptSearchResult {
	matches: TranscriptSearchMatch[];
	changed: boolean;
}

/** Cache the searchable corpus and matches while rendered transcript lines remain unchanged. */
export class TranscriptSearchIndex {
	#sourceLines: string[] | undefined;
	#corpus: SearchCorpus | undefined;
	#normalizedQuery: string | undefined;
	#matches: TranscriptSearchMatch[] = [];

	search(lines: readonly string[], query: string): TranscriptSearchResult {
		let sourceChanged = this.#sourceLines?.length !== lines.length;
		if (!sourceChanged && this.#sourceLines) {
			for (let index = 0; index < lines.length; index++) {
				if (this.#sourceLines[index] === lines[index]) continue;
				sourceChanged = true;
				break;
			}
		}
		if (sourceChanged || !this.#corpus) {
			this.#sourceLines = Array.from(lines);
			this.#corpus = buildSearchCorpus(lines);
		}

		const normalizedQuery = normalizeQuery(query);
		const changed = sourceChanged || normalizedQuery !== this.#normalizedQuery;
		if (changed) {
			this.#normalizedQuery = normalizedQuery;
			this.#matches = findSearchCorpusMatches(this.#corpus, normalizedQuery);
		}
		return { matches: this.#matches, changed };
	}
}

export function findTranscriptSearchMatches(lines: readonly string[], query: string): TranscriptSearchMatch[] {
	const normalizedQuery = normalizeQuery(query);
	return normalizedQuery ? findSearchCorpusMatches(buildSearchCorpus(lines), normalizedQuery) : [];
}

export function getTranscriptSearchMatchKey(match: TranscriptSearchMatch): string {
	const first = match.segments[0];
	const last = match.segments[match.segments.length - 1];
	return first && last ? `${first.row}:${first.startCol}:${last.row}:${last.endCol}` : "";
}
