import { NAME_GRAPHEME_LIMIT } from "./names";

/**
 * Character classes stripped from a display name.
 *
 * A name reaches a TUI renderer, so an unstripped control character is a
 * display attack rather than a cosmetic problem: a zero-width joiner can hide
 * text, an escape sequence can repaint the line, and a bidi override can make
 * one name *look* like another to whoever is reading the roster.
 *
 * The classes are the ones the reference implementation strips, and the reason
 * for each is the same — none of them carry meaning in a label.
 */
const STRIPPED = /[\p{Cf}\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/gu;

/** Truncation marker, so a cut name does not read as a complete one. */
const ELLIPSIS = "…";

const graphemeSegmenter = new Intl.Segmenter();

/**
 * Count graphemes rather than code units or bytes.
 *
 * Truncating by UTF-16 length cuts a surrogate pair in half and renders a
 * replacement character; truncating by byte length can split a combining
 * sequence and detach the accent from its letter. Either produces a name that
 * is not merely short but *wrong*.
 */
export function countGraphemes(text: string): number {
	let count = 0;
	for (const _ of graphemeSegmenter.segment(text)) count++;
	return count;
}

function truncateGraphemes(text: string, limit: number): string {
	if (countGraphemes(text) <= limit) return text;
	// The ellipsis occupies one grapheme of the budget, so the visible text is
	// one shorter — otherwise the result exceeds `limit` by exactly one.
	const { index } = [...graphemeSegmenter.segment(text)][limit - 1];
	return `${text.slice(0, index)}${ELLIPSIS}`;
}

/**
 * Strip, trim and bound a display name.
 *
 * Returns `null` when nothing usable survives: a name made entirely of
 * stripped characters is a refusal, not a fallback to a generated one. Silently
 * substituting would hand back a name the caller never asked for and then
 * publish it to every peer.
 */
export function sanitiseName(raw: string, limit: number = NAME_GRAPHEME_LIMIT): string | null {
	const stripped = raw.replace(STRIPPED, "").trim();
	if (stripped.length === 0) return null;
	return truncateGraphemes(stripped, limit);
}
