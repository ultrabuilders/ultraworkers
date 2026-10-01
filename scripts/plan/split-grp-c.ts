/**
 * Group C candidate list — SPLIT from the "do not cut" list, computed from the tree.
 *
 * WHY THIS EXISTS
 * ---------------
 * `PACKAGE_REORGANIZATION_PLAN.md` §"Nhóm C" presents one list that mixes two different
 * questions: modules that are *cuttable with a seam* and modules that must not be cut at
 * all. A reader cannot tell which is which without reading §4, and §4 is where the plan
 * says the no-cut cases are the important part.
 *
 * The plan also carries numbers that no longer match the tree. Measured here on
 * 2026-10-01, the plan's own Group C candidates came out as:
 *
 *     plan says   eval 126 · capability 136 · task 125 · internal-urls 110 · registry 97
 *                 mcp 97 · discovery 86 · web 66 · slash-commands 65 · async 50 · edit 49
 *     tree says   eval  30 · capability  56 · task  45 · internal-urls  38 · registry 33
 *                 mcp  24 · discovery 41 · web   9 · slash-commands 11 · async  8 · edit 21
 *
 * Nine of eleven fell BELOW the 41-150 band the group is defined by. Copying the plan's
 * table forward would have carried eleven candidates into a list that no longer holds.
 *
 * So the list is derived here, from `measure-fan-in.ts` output, not transcribed. A
 * hand-maintained importer count is a snapshot; this is a measurement you can re-run.
 *
 * WHAT IT DELIBERATELY DOES NOT DECIDE
 * ------------------------------------
 * Being in the band is necessary, not sufficient. `tools`, `session`, `utils` and `cli`
 * all measure inside 41-150 and are all on the plan's no-cut list. This script reports
 * the overlap rather than hiding it, because an overlap is a finding: the plan's numeric
 * criterion and its architectural argument disagree, and only the owner can settle which
 * one wins.
 *
 * Run: `bun run scripts/plan/split-grp-c.ts`
 */
import * as path from "node:path";
import { isSealedIntact } from "../measure-fan-in";

/**
 * The measured baseline, read rather than recomputed.
 *
 * `measure-fan-in.ts` keeps its scanner (`Scan`, `scanTree`) module-private on purpose —
 * the `--check` gate is the only sanctioned consumer, and widening that API just so a
 * second script can read it would put two readers on one pipeline. The sealed baseline is
 * the artifact that pipeline already published, and `isSealedIntact` proves it has not
 * been hand-edited.
 *
 * Consequence worth stating: this reports what the tree looked like when the baseline was
 * captured. Re-run `bun run measure:fan-in:update` after structural moves.
 */
const BASELINE_PATH = path.resolve(import.meta.dir, "../../scripts/fan-in-baseline.json");

/** Exported for tests: the exact file the report reads. */
export const BASELINE_PATH_FOR_TEST = BASELINE_PATH;

/** The band the plan defines Group C by: "cuttable but needs a seam". */
const BAND = { min: 41, max: 150 } as const;

/**
 * Modules the plan argues against cutting, with the reason it gives. Keyed by the name
 * `measure-fan-in.ts` reports. Membership here means "the plan has already ruled on
 * this", NOT "measured as large" — `tui/src/components` has 132 importers yet only 2
 * files outside `tui`, so its count alone would misread as a good candidate.
 */
const NO_CUT_MODULES_INTERNAL = new Map<string, string>([
	["config", "plan §7: every module depends on it; splitting it is a cycle in reverse"],
	["session", "plan §4: public surface, hundreds of imports rewritten for a boundary nobody asked for"],
	["tools", "plan §4: already a public subpath export; 569 imports from coding-agent"],
	["utils", "plan §4: public subpath export, importers spread across three packages"],
	["cli", "plan §4: entry point, not a leaf — everything downstream is behind it"],
	["modes", "plan §3: needs 5 sibling directories in tui"],
	["extensibility", "the de-hardcoding axis; this programme's whole subject"],
	["capability", "registry type consumed across the extension surface — seam, not split"],
	["eval", "M8 W8 is editing eval/ right now — order must be settled first"],
	["internal-urls", "referenced by the installer path, not by feature boundaries"],
	["registry", "plan §5.1: name collides with catalog; the real work is a merge, not a cut"],
	["mcp", "plan §4: boundaries follow the client/server split, not the module name"],
	[
		"web",
		"web SEARCH provider (firecrawl/kagi/parallel/scrapers), not a web server; do not map to client+server+protocol",
	],
	["slash-commands", "public registration surface for extensions"],
	["async", "public extension surface"],
	["edit", "public extension surface"],
	["memory-backend", "already at the right granularity"],
	["exec", "already at the right granularity"],
	["modes-ui", "tui spine — plan §3"],
]);

/**
 * §7: modules `pi` has no counterpart for. The plan rules these `merge`, not `no-cut` —
 * cutting them does nothing for "copy from pi", it only reduces the subdirectory count,
 * so the correct outcome is to fold them into a neighbour.
 *
 * Recorded explicitly because a list of candidates with no rejected rows is a tell that
 * nobody read §7: these eleven look like candidates and are not.
 */
const MERGE = new Map<string, string>([
	["commit", "plan §7: no pi counterpart; cutting does not make copying from pi easier"],
	["commands", "plan §7: no pi counterpart"],
	["dap", "plan §7: no pi counterpart"],
	["stream", "plan §7: no pi counterpart"],
	["security", "plan §7: no pi counterpart"],
	["tts", "plan §7: no pi counterpart"],
	["stt", "plan §7: no pi counterpart"],
	["ida", "plan §7: no pi counterpart"],
	["cleanse", "plan §7: no pi counterpart"],
	["autoresearch", "plan §7: no pi counterpart"],
	["compress", "plan §7: no pi counterpart"],
	["judgment", "plan §3.3: group to merge, not cut"],
]);

/**
 * Rows this script cannot produce, named so their absence is not read as "ruled in".
 *
 * `measure-fan-in.ts` scans `packages/coding-agent/src` only, so the plan's §3 `tui/src`
 * rejections (`apps`, `setup`, `components`, `theme`, `overlays`, `chat`, `render`,
 * `chrome`, `prompt`, `status-line`, `tools`) and §3.3's `rerank` / `speech` /
 * `transcription` / `video` / `embeddings` are outside its view. `rerank`, `speech`,
 * `transcription`, `video` and `embeddings` are not modules of `coding-agent/src` at all.
 *
 * Listing them keeps the report honest about its own reach: a rejection that is merely
 * invisible here is not the same as a rejection that did not happen.
 */
export const OUT_OF_SCOPE_ROWS: readonly string[] = [
	"tui/src/apps (§3, cost/value: bad)",
	"tui/src/setup (§3, cutting pulls 7 siblings)",
	"tui/src/components (§3, central hub, nothing reduced)",
	"tui/src/theme, overlays, chat, render, chrome, prompt, status-line, tools (§3 spine)",
	"rerank, speech, transcription, video, embeddings (§3.3 merge group, not coding-agent/src modules)",
	"ai/auth (§3.1 vs §7 contradict; unsettled, so excluded rather than guessed)",
];

/** Exported for tests: the modules the plan has already ruled on. */
export const NO_CUT_MODULES = new Set(NO_CUT_MODULES_INTERNAL.keys());

/**
 * Modules that satisfy the numeric band AND are on the no-cut list.
 *
 * Split out of the report so a test can assert it, because it is the one output that is
 * worthless if it goes missing: a script that silently stopped surfacing the overlap
 * would still print a clean, plausible table while hiding the disagreement that makes
 * this group undecidable without the owner.
 */
export function overlapOf(split: Split): Verdict[] {
	return split.noCut.filter(verdict => verdict.inBand);
}

export interface Verdict {
	readonly module: string;
	readonly importers: number;
	readonly inBand: boolean;
	readonly decision: "candidate" | "no-cut" | "merge" | "out-of-band";
	readonly reason: string;
}

export interface Split {
	readonly band: { readonly min: number; readonly max: number };
	readonly candidates: Verdict[];
	readonly noCut: Verdict[];
	readonly merge: Verdict[];
	readonly outOfBand: Verdict[];
}

/**
 * Read the sealed baseline and flatten it into rows.
 *
 * The sealed baseline stores one integer per module — the external importer count — and
 * nothing else. That is deliberate: it is the number the gate regresses on, and it is the
 * number Group C's band is defined in terms of. File and line counts are printed by
 * `measure-fan-in.ts` at measure time and are not part of the sealed contract, so this
 * script does not pretend to have them.
 *
 * `isSealedIntact` is what makes reading this file a measurement rather than a transcript
 * of whatever someone typed into it.
 */
export function readBaseline(baseline: { modules: Record<string, number> }): {
	module: string;
	importers: number;
}[] {
	return Object.entries(baseline.modules).map(([module, importers]) => ({ module, importers }));
}

/** Apply the band, then the plan's rulings, to measured counts. */
export function classify(measured: readonly { module: string; importers: number }[]): Split {
	const verdicts: Verdict[] = measured.map(entry => {
		const inBand = entry.importers >= BAND.min && entry.importers <= BAND.max;
		const noCut = NO_CUT_MODULES_INTERNAL.get(entry.module);
		if (noCut !== undefined) {
			return { ...entry, inBand, decision: "no-cut", reason: noCut };
		}
		const merge = MERGE.get(entry.module);
		if (merge !== undefined) {
			return { ...entry, inBand, decision: "merge", reason: merge };
		}
		if (!inBand) {
			return {
				...entry,
				inBand,
				decision: "out-of-band",
				reason: `${entry.importers} importers is outside ${BAND.min}-${BAND.max}`,
			};
		}
		return {
			...entry,
			inBand,
			decision: "candidate",
			reason: `inside the band at ${entry.importers} importers and not ruled on by the plan`,
		};
	});

	const byName = (a: Verdict, b: Verdict) => b.importers - a.importers;
	return {
		band: BAND,
		candidates: verdicts.filter(v => v.decision === "candidate").sort(byName),
		noCut: verdicts.filter(v => v.decision === "no-cut").sort(byName),
		merge: verdicts.filter(v => v.decision === "merge").sort(byName),
		outOfBand: verdicts.filter(v => v.decision === "out-of-band").sort(byName),
	};
}

const width = (s: string, n: number) => s.padEnd(n);
const num = (n: number, w: number) => String(n).padStart(w);

/**
 * Render the report as a pure function of the split.
 *
 * Every row `classify` produced must appear in this text. That is the point of keeping
 * rendering separate from printing: a test can assert "the report mentions every overlap
 * module", which catches a row being dropped, not merely mis-classified. Mutation testing
 * found that gap the hard way — hiding the overlap left the suite 8/8 green, because every
 * other row constrained `classify` and none constrained what got printed.
 */
export function renderReport(split: Split, capturedAt: string): string {
	const out: string[] = [];
	const line = (v: Verdict) => `  ${width(v.module, 22)}${num(v.importers, 5)}  ${v.reason}`;

	out.push(`band ${split.band.min}-${split.band.max} · sealed baseline ${capturedAt}`);
	out.push(`\nCANDIDATES (in band, not ruled on by the plan) — ${split.candidates.length}`);
	for (const v of split.candidates) out.push(line(v));

	// All no-cut rows are printed, not only the in-band ones. `internal-urls` (38) and
	// `config` (166) are both ruled no-cut; the first falls below the band and the second
	// sits in the overlap, so printing only the overlap hid it entirely while the count
	// elsewhere implied a complete accounting.
	const overlap = overlapOf(split);
	out.push(`\nNO-CUT — ${split.noCut.length} (of which ${overlap.length} inside the band)`);
	for (const v of split.noCut) {
		out.push(`${line(v)}${v.inBand ? "   [in band]" : ""}`);
	}

	out.push(`\nMERGE (plan §7: no pi counterpart) — ${split.merge.length}`);
	for (const v of split.merge) out.push(line(v));

	// Every out-of-band row is printed. An earlier version printed the first 12 and
	// labelled the section with the true count, so a no-cut module such as `config` —
	// 166 importers, ruled no-cut — appeared in no section at all. The label said 51 and
	// the reader saw 12, which reads like the rest were empty rather than unprinted.
	out.push(`\nOUT OF BAND — ${split.outOfBand.length}`);
	for (const v of split.outOfBand) out.push(line(v));

	out.push(
		`\nOVERLAP: ${overlap.length ? overlap.map(v => v.module).join(", ") : "none"}`,
		"A non-empty overlap is a finding, not a bug: the numeric criterion and the",
		"architectural argument disagree, and only the owner can settle which wins.",
	);

	// Named so an absent rejection is never mistaken for a module nobody considered.
	out.push(
		`\nRULED OUT BUT OUTSIDE THIS MEASUREMENT (${OUT_OF_SCOPE_ROWS.length})`,
		"  measure-fan-in.ts scans packages/coding-agent/src only, so these cannot appear above:",
	);
	for (const row of OUT_OF_SCOPE_ROWS) out.push(`  - ${row}`);

	return out.join("\n");
}

if (import.meta.main) {
	const baseline = (await Bun.file(BASELINE_PATH).json()) as Parameters<typeof isSealedIntact>[0];
	if (!isSealedIntact(baseline)) {
		// The seal exists so a hand-edited count cannot pass as a measurement.
		console.error(
			"[split-grp-c] FAIL fan-in-baseline.json does not match its own contentHash; " +
				"refusing to report verdicts from it.",
		);
		process.exit(1);
	}
	console.log(renderReport(classify(readBaseline(baseline)), baseline.capturedAt));
}
