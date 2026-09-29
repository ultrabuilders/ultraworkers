import { readFileSync } from "node:fs";

const SRC = "/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/m5-index/corrections-b.json";
const DOC = "/Users/tranquangdang21/Projects/ultraworkers/.lavish-wip/m5-md/90-back2b.md";
const ROW = /^\| (W8b|W9|W10|W11|W12|W13|W13p)-B\d+ \|/;

const all = JSON.parse(readFileSync(SRC, "utf8"));
const flat = readFileSync(DOC, "utf8");
const lines = flat.split("\n");

let bad = 0;

// the two source spans that carry their own backticks are rendered with a two-backtick
// delimiter; this is the only sanctioned departure from verbatim
const SPAN_FIXES = [
	[
		"` * `__omp_worker_text_predict`, started through the `text-predict` global broker).`",
		"`` ` * `__omp_worker_text_predict`, started through the `text-predict` global broker). ``",
	],
	[
		'`for (const k in result) { if (k.startsWith("OMP_")) result[\\`PI_${k.slice(4)}\\`] = result[k]; }`',
		'``for (const k in result) { if (k.startsWith("OMP_")) result[`PI_${k.slice(4)}`] = result[k]; }``',
	],
];
const applyFixes = s => SPAN_FIXES.reduce((acc, [from, to]) => acc.split(from).join(to), s);

let fixHits = 0;
for (const c of all) {
	for (const k of ["claim", "verdict", "correction", "evidence"]) {
		for (const [from] of SPAN_FIXES) if (c[k].includes(from)) fixHits++;
	}
}
console.log(`nested-backtick span fixes applied: ${fixHits} (expected 2)`);
if (fixHits !== 2) bad++;

// 1. every table row keeps exactly 4 cells
for (const [n, l] of lines.entries()) {
	if (ROW.test(l)) {
		const pipes = (l.match(/(?<!\\)\|/g) || []).length;
		if (pipes !== 5) {
			console.log(`BAD ROW line ${n + 1}: ${pipes} unescaped pipes`);
			bad++;
		}
	}
}

// 2. no source string lost: compare with the two documented span fixes and table
//    pipe-escaping undone on both sides
const norm = s => applyFixes(s).replace(/\n/g, " ").replace(/\\\|/g, "|");
const flatN = norm(flat);
for (const [i, c] of all.entries()) {
	for (const k of ["claim", "verdict", "correction", "evidence"]) {
		if (!flatN.includes(norm(c[k]))) {
			console.log(`MISSING #${i + 1} ${c.id} ${k}: ${c[k].slice(0, 90)}`);
			bad++;
		}
	}
}

// 3. row codes unique and matched one-to-one by the evidence list
const rows = lines.filter(l => ROW.test(l));
const codes = rows.map(l => l.match(/^\| ([^|]+) \|/)[1].trim());
const evCodes = lines
	.filter(l => /^\d+\. \*\*(W8b|W9|W10|W11|W12|W13|W13p)-B\d+\*\*/.test(l))
	.map(l => l.match(/\*\*([^**]+)\*\*/)[1]);
if (new Set(codes).size !== codes.length) {
	console.log("DUPLICATE row codes");
	bad++;
}
if (codes.join(",") !== evCodes.join(",")) {
	console.log("ROW/EVIDENCE code mismatch");
	bad++;
}

// 4. per-work-item counts against the source
for (const w of ["W8b", "W9", "W10", "W11", "W12", "W13", "W13p"]) {
	const src = all.filter(c => c.id === w).length;
	const doc = codes.filter(c => c.startsWith(`${w}-B`)).length;
	if (src !== doc) bad++;
	console.log(`${w}: src=${src} doc=${doc} ${src === doc ? "ok" : "MISMATCH"}`);
}

// 5. code spans: every line's single-backtick runs must pair up, and no span opened by
//    one backtick may contain a backtick (those need the two-backtick delimiter)
for (const [n, l] of lines.entries()) {
	const runs = [...l.matchAll(/`+/g)].map(m => ({ len: m[0].length, at: m.index }));
	let open = null;
	for (const r of runs) {
		if (open === null) {
			open = r;
		} else if (r.len === open.len) {
			const content = l.slice(open.at + open.len, r.at);
			if (open.len === 1 && content.includes("`")) {
				console.log(`NESTED BACKTICK line ${n + 1}: ${content.slice(0, 80)}`);
				bad++;
			}
			open = null;
		}
		// a different-length run while open is literal text
	}
	if (open !== null) {
		console.log(`UNCLOSED span line ${n + 1}: ${l.slice(0, 80)}`);
		bad++;
	}
}

// 6. markdown hygiene
const fences = (flat.match(/^```/gm) || []).length;
if (fences % 2 !== 0) {
	console.log(`UNBALANCED: ${fences} fences`);
	bad++;
}
if (/^## /.test(flat)) {
	console.log("NOTE: file carries a level-2 heading (assembler pastes one)");
	bad++;
}
if (/\btsc\b/.test(flat)) {
	console.log("NOTE: the string 'tsc' appears in the file");
}

console.log(
	bad === 0
		? `PASS: ${all.length} corrections, ${rows.length} rows, ${evCodes.length} evidence items, 0 code fences`
		: `FAIL: ${bad} problem(s)`,
);
