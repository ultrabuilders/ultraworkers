#!/usr/bin/env bun
/**
 * Census: what does a `keep_refs` value actually name?
 *
 * WHY THIS IS A SCRIPT
 *
 * `epic-1du7` asks how many `keep_refs` point at something *identified* rather
 * than merely present. The answer was measured by hand and has since changed
 * under us twice — the row count moved 824 → 822 → 822, and the distinct-ref
 * count with it. A hand-measured answer to "how many" expires, so it lives here
 * and reprints its method every run.
 *
 * THE DISTINCTION THIS EXISTS TO ENFORCE
 *
 * An occurrence is not a definition. Every `keep_refs` value appears in at least
 * one place that cannot define it — the table itself, the gate that reads the
 * table, that gate's test fixture, and the bead ledger where this question is
 * being discussed. All of those *use* the name. Counting them as evidence that
 * the name is defined is how a vocabulary with no upstream reads as one with a
 * definition site, so downstream hits are counted and printed separately.
 *
 * USAGE
 *
 *   bun scripts/census-keep-refs.ts [--verbose]
 *
 * `--verbose` prints every distinct ref with its row count and where it matched.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const TABLE = path.join(ROOT, "scripts/rename/disposition.tsv");

/**
 * Files that mention a ref by *using* it, never by defining it.
 *
 * The ledger is here for a measured reason: writing a ref into a bead note makes
 * `grep` find it, which makes an undefined ref look defined. A probe whose own
 * documentation creates the evidence it is hunting is not measuring the tree.
 *
 * `.beads/` is excluded by DIRECTORY, not by listing files: its `br_history/`
 * snapshots are archived copies of the same notes, so excluding only
 * `issues.jsonl` left the history reading as a definition site. Measured — that
 * omission alone turned 0 defined contract names into 5.
 */
const DOWNSTREAM_DIRS: readonly string[] = [".beads"];
const DOWNSTREAM_FILES: readonly string[] = [
	"scripts/rename/disposition.tsv",
	"scripts/rename/check-disposition.ts",
	"scripts/rename/check-disposition.test.ts",
];

/** This file. A probe is not a definition site for anything it searches for. */
const SELF = path.relative(ROOT, path.resolve(import.meta.path));

function isDownstream(rel: string): boolean {
	if (rel === SELF) return true;
	if (DOWNSTREAM_FILES.includes(rel)) return true;
	return DOWNSTREAM_DIRS.some(dir => rel === dir || rel.startsWith(`${dir}/`));
}

/** A ref naming a workstream node rather than a contract. */
const BARE_NODE = /^[A-Za-z]+\d+$/u;

/**
 * Bounded matcher for one ref.
 *
 * A bare node id is a short string in a large corpus, so a substring search
 * resolves `W9` inside `W9b` and `N5` inside unrelated text — measured, 5 to 15 of
 * each id's hits were substring-only. The conclusion survived (every bare id still
 * resolves with boundaries), but the probe was citing files that do not name it.
 * Boundaries also stop `a57q:py-ground` matching `a57q:py-grounds`.
 */
function matcherFor(ref: string): RegExp {
	return new RegExp(`(?<![A-Za-z0-9_-])${ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_-])`, "u");
}

interface Row {
	readonly path: string;
	readonly hits: string;
	readonly disposition: string;
	readonly keepRef: string;
}

async function readRows(): Promise<Row[]> {
	const body = await fs.readFile(TABLE, "utf8");
	const rows: Row[] = [];
	for (const line of body.split("\n")) {
		if (!line) continue;
		const f = line.split("\t");
		// Header, and the shape check the table's own gate performs.
		if (f.length < 6 || f[0] === "scope") continue;
		rows.push({ path: f[1], hits: f[2], disposition: f[3], keepRef: f[5].trim() });
	}
	return rows;
}

/** Every text file worth grepping, minus dependencies and VCS metadata. */
async function collectSearchable(dir: string, into: string[] = []): Promise<string[]> {
	for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules" || entry.name === ".git") continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await collectSearchable(full, into);
		} else if (/\.(ts|tsx|md|json|jsonl|kdl|txt|sh|yml|yaml)$/u.test(entry.name)) {
			into.push(full);
		}
	}
	return into;
}

const rows = await readRows();
const withRef = rows.filter(r => r.keepRef.length > 0);
const distinct = new Map<string, number>();
for (const r of withRef) distinct.set(r.keepRef, (distinct.get(r.keepRef) ?? 0) + 1);

const files = await collectSearchable(ROOT);
const corpus = new Map<string, string>();
await Promise.all(
	files.map(async f => {
		const rel = path.relative(ROOT, f);
		if (isDownstream(rel)) return;
		try {
			corpus.set(rel, await fs.readFile(f, "utf8"));
		} catch {
			// A file that cannot be read is not a definition site.
		}
	}),
);

interface Resolution {
	readonly ref: string;
	readonly rows: number;
	readonly bare: boolean;
	readonly defining: readonly string[];
	readonly downstream: number;
}

const resolutions: Resolution[] = [];
for (const [ref, n] of distinct) {
	const defining: string[] = [];
	let downstreamHits = 0;
	const hit = matcherFor(ref);
	for (const [rel, body] of corpus) {
		if (hit.test(body)) defining.push(rel);
	}
	for (const rel of [...DOWNSTREAM_FILES, ".beads/issues.jsonl"]) {
		const body = await fs.readFile(path.join(ROOT, rel), "utf8").catch(() => null);
		if (body && hit.test(body)) downstreamHits++;
	}
	resolutions.push({ ref, rows: n, bare: BARE_NODE.test(ref), defining, downstream: downstreamHits });
}

// The control that makes a zero mean something: a ref invented here must resolve
// nowhere, so a reported 0 is a measurement and not an unsearched tree.
// Assembled at run time so the literal never appears in this file, which is itself
// in the search domain: a control written as a literal matches its own source and
// reports the search broken when it is not.
const CONTROL = ["N99", "this-ref-is-invented-by-the-probe"].join(":");
const controlHits = [...corpus.values()].filter(b => matcherFor(CONTROL).test(b)).length;

const out: string[] = [];
const say = (s = "") => out.push(s);

say(`table        : scripts/rename/disposition.tsv`);
say(`search domain: working tree, ${corpus.size} files (.ts .tsx .md .json .jsonl .kdl .txt .sh .yml),`);
say(`               node_modules and .git excluded,
               downstream excluded: ${DOWNSTREAM_FILES.length} files + ${DOWNSTREAM_DIRS.join(", ")}/ (ledger and its history) + this probe`);
say(`rows         : ${rows.length} total · ${withRef.length} with a ref · ${rows.length - withRef.length} without`);
say(`distinct refs: ${distinct.size}`);
say();
say("Every row below prints where its ref matched. `defining` excludes the table,");
say("the gate, its test fixture and the bead ledger — those USE a name, and counting");
say("them is how an undefined vocabulary reads as a defined one.");
say();

const bare = resolutions.filter(r => r.bare);
const contracts = resolutions.filter(r => !r.bare);
const definedBare = bare.filter(r => r.defining.length > 0);
const definedContracts = contracts.filter(r => r.defining.length > 0);

say("SUMMARY");
say(
	`  bare node ids (${bare.length}): ${definedBare.length} have a defining site, ${bare.length - definedBare.length} do not`,
);
say(
	`  contract names (${contracts.length}): ${definedContracts.length} have a defining site, ${contracts.length - definedContracts.length} do not`,
);
say(
	`  control "${CONTROL}" matched ${controlHits} file(s) — ${
		controlHits === 0
			? "the search works, so a 0 below is a measurement"
			: "SEARCH IS BROKEN, every count below is void"
	}`,
);
say();

if (resolutions.length > 0) {
	say("PER REF");
	for (const r of resolutions.sort((a, b) => b.rows - a.rows || a.ref.localeCompare(b.ref))) {
		const where = r.defining.length === 0 ? "NOWHERE" : r.defining.slice(0, 2).join(", ");
		const more = r.defining.length > 2 ? ` +${r.defining.length - 2} more` : "";
		say(`  ${String(r.rows).padStart(4)} rows  ${r.bare ? "bare " : "ctrct"}  ${r.ref.padEnd(38)} ${where}${more}`);
	}
	say();
}

say("WHAT THIS DOES NOT ANSWER");
say("  Whether a ref that DOES resolve is still the right label. Resolution is not");
say("  correctness: a contract name can have a home and still describe the wrong");
say("  thing. Deciding that needs someone who owns the vocabulary.");
say();
say("  What a ref should resolve TO is not derivable here. No registry exists, so");
say("  this probe can only report that a name has no upstream — writing one is a");
say("  decision, and epic-1du7 keeps it.");

const report = out.join("\n");
process.stdout.write(`${report}\n`);

if (process.argv.includes("--verbose")) {
	for (const r of resolutions.sort((a, b) => b.rows - a.rows)) {
		if (r.defining.length === 0) continue;
		process.stdout.write(`\n[--verbose] ${r.ref} (${r.rows} rows)\n`);
		for (const f of r.defining) process.stdout.write(`    ${f}\n`);
	}
}
