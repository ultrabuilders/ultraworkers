/**
 * `rewrite-changelog` promises what its own header says: the model returns
 * structured sections/items, and "markdown is rendered locally so ONLY the
 * Unreleased section changes and formatting stays deterministic."
 *
 * The model call is not what needs defending — a model that returns good JSON is
 * the expected case. What needs defending is the LOCAL path that runs after it:
 * `applyRewrite` mutates only the Unreleased section, then `renderChangelog`
 * re-renders the WHOLE document. So the released sections survive only because
 * `renderChangelog` happens to reproduce them exactly, and that is an accident
 * of the input's formatting rather than a stated guarantee.
 *
 * Measured here, and the accident is real: `renderChangelog` re-renders spacing the
 * released sections already had. `packages/tui/CHANGELOG.md` writes `## [18.4.3]`
 * immediately followed by `### Added` with no blank line, and a plain re-render
 * inserts one — a diff INSIDE a shipped release, produced by a run whose only job
 * was to rewrite `[Unreleased]`. Measured across all 18 real changelogs, this is
 * the only one the renderer touches; on the other 17 the two agree byte-for-byte,
 * which is why a fixture invented to look "messy" is worth less than the real one.
 *
 * So these rows pin the local render contract directly: after a rewrite of
 * `[Unreleased]`, every released section is byte-for-byte what it was, INCLUDING
 * the separator in front of its heading. They need no model and no network, so
 * they are deterministic and safe to run in the full suite.
 *
 * The shared helpers are imported from `fix-changelogs` rather than restated:
 * this file is about what `rewrite-changelog` does with them, and a second
 * copy of the parser could disagree with the one the fixer actually uses.
 */
import { describe, expect, it } from "bun:test";
import { parseChangelog } from "./fix-changelogs";
import { applyRewrite, renderWithReleasedIntact, unreleasedSection } from "./rewrite-changelog";

/** Apply a rewrite to `[Unreleased]` exactly as `run()` does, and return the new document text. */
function rewriteUnreleased(content: string, sections: { category: string; items: string[] }[]): string {
	const document = parseChangelog(content);
	const section = unreleasedSection(document);
	if (!section) throw new Error("fixture has no [Unreleased] section");
	applyRewrite(section, sections);
	return renderWithReleasedIntact(document, content);
}

/**
 * Everything from the first RELEASED heading onward: the heading and its whole body.
 *
 * The blank run in FRONT of that heading is deliberately NOT included. It is the
 * trailing whitespace of the `[Unreleased]` block, which this script owns and is
 * free to normalize — measured, `renderChangelog` collapses a run of blanks above a
 * heading to one, and that is the `[Unreleased]` side of the boundary.
 *
 * My first version of this helper stepped backwards over that run, and the row
 * asserting on it went red against behaviour that is correct. Widening the slice to
 * make a row pass is the exact move that turns a gate into decoration, so instead
 * of widening it I measured what a released region can actually lose:
 *
 *   - blank runs INSIDE a released section body survive parsing and rendering
 *     untouched (verified), so they never needed protecting;
 *   - the only thing a whole-document re-render can damage is released CONTENT,
 *     and `renderWithReleasedIntact` now splices that back from the original text.
 *
 * So the slice starts at the heading, which is the contract's actual boundary.
 */
function releasedRegion(text: string): string {
	const lines = text.split("\n");
	const firstReleased = lines.findIndex(line => line.startsWith("## [") && !line.startsWith("## [Unreleased]"));
	if (firstReleased < 0) throw new Error("fixture has no released section");
	return lines.slice(firstReleased).join("\n");
}

const ONE_RELEASED = [
	"# Changelog",
	"",
	"## [Unreleased]",
	"",
	"### Fixed",
	"",
	"- A messy   entry with   stray spacing",
	"",
	"## [1.0.0] - 2025-01-01",
	"",
	"### Added",
	"",
	"- A released capability.",
	"",
].join("\n");

describe("only [Unreleased] changes", () => {
	it("leaves a released section byte-identical when [Unreleased] is rewritten", () => {
		const before = releasedRegion(ONE_RELEASED);
		const after = releasedRegion(
			rewriteUnreleased(ONE_RELEASED, [{ category: "Fixed", items: ["- One clean entry."] }]),
		);

		// Named so a failure says which side moved. A whole-document re-render that
		// reflows the released section fails here with both texts visible.
		expect(after).toBe(before);
	});

	it("actually rewrites [Unreleased], so the row cannot pass on a no-op", () => {
		// The negative half. Without it, a fixer that silently dropped every
		// rewrite would satisfy "released sections unchanged" perfectly.
		const rewritten = rewriteUnreleased(ONE_RELEASED, [
			{ category: "Fixed", items: ["- One clean entry."] },
			{ category: "Added", items: ["- Something new."] },
		]);

		expect(rewritten).toContain("- One clean entry.");
		expect(rewritten).toContain("- Something new.");
		// The old messy entry is gone from [Unreleased], not merely duplicated.
		expect(rewritten).not.toContain("stray spacing");
	});

	it("leaves every released section intact when there are several", () => {
		// More than one release is the ordinary state of a real changelog, and the
		// section the renderer must leave alone is not always the last one.
		const content = [
			"# Changelog",
			"",
			"## [Unreleased]",
			"",
			"### Fixed",
			"",
			"- Draft entry.",
			"",
			"## [1.1.0] - 2025-02-01",
			"",
			"### Added",
			"",
			"- Newest release item.",
			"",
			"## [1.0.0] - 2025-01-01",
			"",
			"### Added",
			"",
			"- Oldest release item.",
			"",
		].join("\n");

		const before = releasedRegion(content);
		const after = releasedRegion(rewriteUnreleased(content, [{ category: "Fixed", items: ["- Tidied."] }]));

		expect(after).toBe(before);
		// Both survive — one intact section is not evidence the other was.
		expect(after).toContain("- Newest release item.");
		expect(after).toContain("- Oldest release item.");
	});

	it("preserves a released section whose spacing the renderer would rewrite", () => {
		// The row that earns the fix, and it earns it against REAL DATA rather than
		// a shape I invented. `packages/tui/CHANGELOG.md` writes a release heading
		// immediately followed by its category heading, with no blank line:
		//
		//     ## [18.4.3] - 2026-09-28
		//     ### Added
		//
		// `renderChangelog` re-renders the whole document, so it inserts one. That is
		// a diff INSIDE a shipped release, produced by a run whose only job was to
		// rewrite `[Unreleased]` — which is exactly what the header promises not to do.
		//
		// Two earlier attempts at this row proved nothing, and both failures were
		// mine rather than the row's:
		//
		//   - asserting on a run of blank lines ABOVE a released heading. The parser
		//     hands those blanks to the `[Unreleased]` subsection, so they are this
		//     script's own trailing whitespace and the renderer owns them.
		//   - asserting on a blank run BETWEEN two released bullets. Measured, that
		//     survives a plain re-render untouched, so both the plain render and the
		//     splice pass it.
		//
		// Both fixtures were already in the renderer's normalized shape, which is why
		// the mutation survived: reducing `renderWithReleasedIntact` to a bare
		// `renderChangelog` left all four rows green. A pre-normalized fixture cannot
		// observe a renderer whose only defect is to normalize. So the fixture is
		// lifted from the changelog that actually differs — measured across all 18
		// real changelogs, this splice is a byte-for-byte no-op on 17 of them.
		const content = [
			"# Changelog",
			"",
			"## [Unreleased]",
			"",
			"### Fixed",
			"",
			"- Draft entry.",
			"",
			"## [1.0.0] - 2025-01-01",
			"### Added",
			"",
			"- First released item.",
			"",
			"## [0.9.0] - 2024-12-01",
			"### Added",
			"",
			"- Older released item.",
			"",
		].join("\n");

		const before = releasedRegion(content);
		const after = releasedRegion(rewriteUnreleased(content, [{ category: "Fixed", items: ["- Tidied."] }]));

		expect(after).toBe(before);
		// Both releases intact, not just the first the slice happened to reach.
		expect(after).toContain("- First released item.");
		expect(after).toContain("- Older released item.");
	});
});
