/**
 * List the `omp`-prefixed WORD occurrences still open under `rename` rows, for
 * a human to read. It deliberately does not classify them.
 *
 * ## Why this lists instead of deciding
 *
 * Two classifiers already exist for the same 540 occurrences, and they disagree
 * because they measure different axes:
 *
 * - `classify-open-rename-occurrences.ts` buckets by the character AFTER `omp`:
 *   `-` → identifier, `/` → path, `.` → filename, otherwise "bare product name".
 * - An earlier shape-based pass treated any `omp-…` token as a live artifact.
 *
 * Both produced a class that does not exist. `omp-coding-agent` matches the
 * `omp-` shape, but the package is `@oh-my-pi/pi-coding-agent` — a stale name,
 * not a live artifact. `OMP_AUTH_BROKER_URL` has no trailing character, so it
 * lands in "bare product name", yet it is read literally at 8 sites and can
 * never be renamed.
 *
 * **Shape does not say whether an artifact is alive.** Only its value at HEAD
 * does. So this script's only job is to make that value easy to look at: it
 * prints `file:line` and the line, and stops. Deciding is the reader's job, and
 * a bucket name would quietly become that verdict again.
 *
 * Usage:
 *   bun scripts/rename/list-rename-word-occurrences.ts
 */
import { countRename, parseTable, PINNED } from "./check-disposition";

const ROOT = new URL("../../", import.meta.url).pathname;
const TABLE = `${ROOT}scripts/rename/disposition.tsv`;

/** The whole name a match belongs to — `PINNED` only spans `omp` and its boundary. */
function wordAt(text: string, at: number): string {
	// `PINNED` CONSUMES its leading boundary character, so `m.index` points at the
	// space or slash BEFORE the name, never at the `o` — for `shipped with
	// omp-coding-agent` it is the space at index 34 and the name starts at 35.
	// Stepping FORWARD to the first alphanumeric finds the real start; stepping
	// back from the index lands mid-word and yields an empty token.
	let start = at;
	while (start < text.length && !/[A-Za-z0-9]/.test(text[start]!)) start++;
	// Take the name whole. Stopping at `-` would return `omp` from `omp-mark-grad`
	// — the prefix every row shares, which says nothing about which artifact this
	// is, and is the whole reason this file exists.
	let end = start;
	while (end < text.length && /[A-Za-z0-9_.-]/.test(text[end]!)) end++;
	return text.slice(start, end);
}

/** Every `PINNED` match in `lines`, with the line it sits on. */
function matched(lines: readonly string[]): { token: string; line: number }[] {
	return lines.flatMap((text, index) => {
		const out: { token: string; line: number }[] = [];
		for (const m of text.matchAll(new RegExp(PINNED.source, `${PINNED.flags}g`))) {
			out.push({ token: wordAt(text, m.index!), line: index + 1 });
		}
		return out;
	});
}

const { rows } = parseTable(await Bun.file(TABLE).text());

interface Site {
	readonly path: string;
	readonly line: number;
	readonly token: string;
	readonly text: string;
}

const sites: Site[] = [];
let openFiles = 0;
let occurrences = 0;

for (const row of rows) {
	if (row.disposition !== "rename") continue;
	const path = `${ROOT}${row.path}`;
	let text: string;
	try {
		text = await Bun.file(path).text();
	} catch {
		continue; // not on disk — the gate reports those as missing rows
	}
	if (countRename(text) === 0) continue;
	openFiles++;

	const lines = text.split("\n");
	for (const hit of matched(lines)) {
		// The population is a name that RUNS `omp-`: `omp-plugins`, `omp-dev`,
		// `omp-coding-agent`. A bare `omp` is the product name and needs no
		// reading. `.omp` alone is a path segment the resolver decides, so it is
		// neither of those; a DOTFILE that runs `omp-` (`.omp-plugin`, `.omp-tmp`)
		// is a real name and is listed, marked so its leading dot is not mistaken
		// for that segment.
		const isDotfile = hit.token.startsWith(".") && hit.token.includes("omp-");
		if (!isDotfile && !hit.token.startsWith("omp-")) continue;
		sites.push({ path: row.path, line: hit.line, token: hit.token, text: lines[hit.line - 1]!.trim() });
		occurrences++;
	}
}

console.log(`open rename files            : ${openFiles}`);
console.log(`omp-prefixed word occurrences: ${occurrences} over ${new Set(sites.map(s => s.path)).size} file(s)\n`);
for (const site of sites.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)) {
	console.log(`${site.path}:${site.line}  \`${site.token}\``);
	console.log(`    ${site.text.slice(0, 150)}`);
}
