import { countRename, parseTable } from "./check-disposition";

/**
 * Classify the occurrences still open under `rename` rows by the shape that
 * decides whether a second copy must change with it.
 *
 * `countRename` is imported from the gate itself, never reimplemented: an
 * earlier hand-rolled count of the same PINNED expression disagreed with the
 * gate by 20, and a reimplementation is exactly how that happens. This script
 * only buckets what the gate already reports.
 */
const ROOT = new URL("../../", import.meta.url).pathname;
const TABLE = `${ROOT}scripts/rename/disposition.tsv`;
const PINNED = /(^|[^a-zA-Z0-9_-])omp(?![\.\-]sh(?![a-zA-Z0-9]))([^a-zA-Z0-9_]|$)/g;

/**
 * Only `after` carries the decision: whether `omp` is the tail of a PATH, a
 * qualified filename, a hyphenated identifier, or a bare product name. The
 * character before it (quote, backtick, slash) is quoting noise.
 */
function classify(after: string): string {
	if (after === "cast") return "format:.ompcast";
	if (after === "/") return "path (…/omp/… or …/omp)";
	if (after === ".") return "filename (omp.<ext>)";
	if (after === "-") return "identifier (omp-…)";
	return "bare (product name in prose)";
}

const table = await Bun.file(TABLE).text();
const { rows } = parseTable(table);
const renameRows = rows.filter(row => row.disposition === "rename");

interface Bucket {
	occurrences: number;
	readonly files: Set<string>;
	readonly samples: string[];
}

const buckets = new Map<string, Bucket>();
let openFiles = 0;
let total = 0;

for (const row of renameRows) {
	const path = `${ROOT}${row.scope === "src" ? "" : ""}${row.path}`;
	let text: string;
	try {
		text = await Bun.file(path).text();
	} catch {
		continue; // not on disk — the gate reports those separately as missing
	}
	if (countRename(text) === 0) continue;
	openFiles++;

	for (const line of text.split("\n")) {
		// The bucket's SIZE is countRename(line), never a token tally: the gate
		// counts occurrences, and a raw match tally over-reports (see the gate's
		// own note about `"omp-wt-"`).
		const magnitude = countRename(line);
		if (magnitude === 0) continue;
		const m = [...line.matchAll(PINNED)][0];
		const key = classify(m?.[2] ?? "");
		const b = buckets.get(key) ?? { occurrences: 0, files: new Set<string>(), samples: [] };
		b.occurrences += magnitude;
		b.files.add(row.path);
		if (b.samples.length < 3) b.samples.push(`${row.path}: ${line.trim().slice(0, 72)}`);
		buckets.set(key, b);
		total += magnitude;
	}
}

console.log(`open rename files : ${openFiles}`);
console.log(`total occurrences : ${total}\n`);
for (const [key, b] of [...buckets].sort((x, y) => y[1].occurrences - x[1].occurrences)) {
	console.log(`${String(b.occurrences).padStart(4)}  ${key}  (${b.files.size} files)`);
	for (const s of b.samples) console.log(`        ${s}`);
}
