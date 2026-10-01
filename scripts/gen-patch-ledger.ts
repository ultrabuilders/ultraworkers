/**
 * Generate `patches/LEDGER.md` from the patch files themselves.
 *
 * The contract this enforces is a **two-way invariant** between three sets that
 * are maintained independently:
 *
 *   1. `package.json` → `patchedDependencies`  — what Bun is told to apply
 *   2. `patches/*.patch`                        — the bytes that actually exist
 *   3. `patches/LEDGER.md`                      — the human half, one row per hunk
 *
 * Every one of the six ways they can disagree is a **silent** failure a
 * maintainer merges without noticing:
 *
 *   - a patch file nobody declared: Bun never applies it, the vendored fix is
 *     inert and nothing says so
 *   - a declared entry with no file on disk: install breaks, or Bun warns and
 *     moves on
 *   - a hunk with no ledger row: a maintainer merges a change nobody can answer
 *     "what does this patch, and when may I drop it" for
 *   - a row with no hunk: the ledger documents a change that is no longer
 *     applied, which reads as current
 *
 * RULE, and it is why the loop below is ordered the way it is: the ledger is
 * reconciled against the diff BEFORE it is written. Building rows from the
 * hunks and then reconciling those same rows against those same hunks can
 * never fail — that is a static echo, and it is the failure mode the file
 * header warns about.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isEnoent } from "@oh-my-pi/pi-utils";

export interface LedgerRow {
	/** Path on the b/ side of the `diff --git` header. */
	readonly file: string;
	/** What this hunk does, in one line. */
	readonly purpose: string;
	/** Upstream issue/PR this hunk works around, or null when there is none. */
	readonly upstream: string | null;
	/** Version in which the hunk can be dropped. */
	readonly dropWhen: string;
}

export interface PatchedDependency {
	/** npm spec including version, e.g. "@ark/schema@0.56.2". */
	readonly spec: string;
	/** Repo-relative path to the patch, e.g. "patches/@ark%2Fschema@0.56.2.patch". */
	readonly patchPath: string;
}

export interface Hunk {
	/** The full `diff --git a/… b/…` header line. */
	readonly header: string;
}

/** All rows for one patched dependency, in patch order. */
export interface LedgerGroup {
	readonly spec: string;
	readonly patchPath: string;
	readonly rows: readonly LedgerRow[];
}

/** Placeholder for a human field nobody has written yet. Never a real value. */
export const UNRECORDED = "_unrecorded_";

export const LEDGER_PATH = "patches/LEDGER.md";

const B_SIDE = /^diff --git a\/(.+?) b\/(.+)$/;

/** The file a hunk touches. `undefined` for a header this script cannot parse. */
export function bSideOf(hunk: Hunk): string | undefined {
	return B_SIDE.exec(hunk.header)?.[2];
}

/**
 * Split a unified diff into per-file hunks, keyed by the b/ path.
 *
 * Pure — takes text, not paths — so the reconciler can be tested against
 * fixtures without touching the real `patches/` tree.
 */
export function parsePatchHunks(patchText: string): Map<string, Hunk[]> {
	const hunks = new Map<string, Hunk[]>();
	for (const line of patchText.split("\n")) {
		const file = B_SIDE.exec(line)?.[2];
		if (file === undefined) continue;
		const hunk: Hunk = { header: line };
		const existing = hunks.get(file);
		if (existing) existing.push(hunk);
		else hunks.set(file, [hunk]);
	}
	return hunks;
}

/**
 * The fail condition: a hunk with no ledger row, or a row with no hunk.
 *
 * Both directions matter, and so does the config↔disk direction — see the file
 * header. `hunksByPatch` must be every patch on disk, not just the declared
 * ones, or the undeclared-patch case is invisible to the check.
 */
export function reconcile(
	patched: readonly PatchedDependency[],
	hunksByPatch: ReadonlyMap<string, readonly Hunk[]>,
	rows: readonly LedgerRow[],
): { ok: true; table: string } | { ok: false; missing: string[]; orphaned: string[] } {
	const declared = patched.map(entry => entry.patchPath);
	const missing: string[] = [];
	const orphaned: string[] = [];

	for (const patchPath of declared) {
		const fileHunks = hunksByPatch.get(patchPath);
		if (fileHunks === undefined) {
			// Declared in package.json, no artifact on disk. Bun cannot apply it.
			missing.push(`${patchPath} (declared in patchedDependencies, no patch file on disk)`);
			continue;
		}
		for (const hunk of fileHunks) {
			const bSide = bSideOf(hunk);
			if (bSide === undefined) continue;
			if (!rows.some(row => row.file === bSide)) missing.push(`${patchPath}: ${bSide}`);
		}
	}

	// A patch file nobody declared would be silently inert, so it is the mirror
	// image of the case above.
	for (const patchPath of hunksByPatch.keys()) {
		if (!declared.includes(patchPath)) orphaned.push(`${patchPath} (patch file on disk, not in patchedDependencies)`);
	}

	// A row pointing at a hunk that is gone reads as current documentation of a
	// change nobody applies.
	const liveFiles = new Set<string>();
	for (const fileHunks of hunksByPatch.values()) {
		for (const hunk of fileHunks) {
			const bSide = bSideOf(hunk);
			if (bSide !== undefined) liveFiles.add(bSide);
		}
	}
	for (const row of rows) {
		if (!liveFiles.has(row.file)) orphaned.push(`ledger row: ${row.file}`);
	}

	if (missing.length > 0 || orphaned.length > 0) return { ok: false, missing, orphaned };
	return { ok: true, table: renderTable(rows) };
}

function renderTable(rows: readonly LedgerRow[]): string {
	const header = ["| file | purpose | upstream | drop-when |", "| --- | --- | --- | --- |"];
	const body = rows.map(row => `| \`${row.file}\` | ${row.purpose} | ${row.upstream ?? "—"} | ${row.dropWhen} |`);
	return [...header, ...body].join("\n");
}

/**
 * Render grouped by patched dependency.
 *
 * The four columns are the prescribed shape and stay as they are; the grouping
 * is added because `out/constraint.js` and `lib/puppeteer/cdp/Frame.js` are
 * indistinguishable in a flat list, and a maintainer reading row 4 has no way to
 * tell which package's patch they are looking at.
 */
function renderGrouped(groups: readonly LedgerGroup[]): string {
	const blocks: string[] = [];
	for (const group of groups) {
		blocks.push(`### \`${group.spec}\` — ${group.patchPath}`);
		blocks.push("");
		blocks.push(renderTable(group.rows));
		blocks.push("");
	}
	return blocks.join("\n");
}

/**
 * Parse the ledger back into groups, so the human half survives a regeneration.
 *
 * Sections are tracked because the ledger is grouped by patched dependency: a
 * row under `@ark/schema` that names a puppeteer file is a row nobody wrote.
 */
export function parseLedger(markdown: string): LedgerGroup[] {
	const groups: LedgerGroup[] = [];
	let current: { spec: string; patchPath: string; rows: LedgerRow[] } | undefined;
	for (const line of markdown.split("\n")) {
		const heading = /^### `(.+?)` — (.+)$/.exec(line);
		if (heading?.[1] !== undefined && heading[2] !== undefined) {
			current = { spec: heading[1], patchPath: heading[2], rows: [] };
			groups.push(current);
			continue;
		}
		if (!line.startsWith("| `")) continue;
		const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
		const file = cells[0]?.replace(/^`|`$/g, "");
		if (file === undefined || file === "") continue;
		const upstream = cells[2] ?? "—";
		// A row before any heading is still a row, and the reconciler must see it
		// or a hand-mangled heading would silently hide half the ledger. It lands
		// in a synthetic group rather than being dropped.
		if (current === undefined) {
			current = { spec: UNRECORDED, patchPath: UNRECORDED, rows: [] };
			groups.push(current);
		}
		current.rows.push({
			file,
			purpose: cells[1] ?? UNRECORDED,
			upstream: upstream === "—" || upstream === "" ? null : upstream,
			dropWhen: cells[3] ?? UNRECORDED,
		});
	}
	return groups;
}

/**
 * Build the rows for one regeneration, carrying the human columns across.
 *
 * `purpose`, `upstream` and `drop-when` are NOT derivable from the diff — a
 * diff does not say which upstream issue a hunk works around, nor which release
 * will swallow it. So a regeneration that rebuilt rows from the hunks alone
 * would drop every `drop-when` a maintainer ever wrote, and nothing would
 * report it: the file column would still match the diff, so the gate would stay
 * green. Carrying them forward is the contract, not a convenience.
 */
export function collectLedger(
	patched: readonly PatchedDependency[],
	hunksByPatch: ReadonlyMap<string, readonly Hunk[]>,
	existing: readonly LedgerGroup[],
): LedgerGroup[] {
	return patched.map(entry => {
		const previous = existing.find(group => group.patchPath === entry.patchPath);
		const known = new Map((previous?.rows ?? []).map(row => [row.file, row]));
		const rows: LedgerRow[] = [];
		for (const hunk of hunksByPatch.get(entry.patchPath) ?? []) {
			const file = bSideOf(hunk);
			if (file === undefined) continue;
			rows.push(known.get(file) ?? { file, purpose: UNRECORDED, upstream: null, dropWhen: UNRECORDED });
		}
		return { spec: entry.spec, patchPath: entry.patchPath, rows };
	});
}

const LEDGER_HEADER = [
	"<!-- The `file` column is GENERATED from patches/*.patch by",
	"     scripts/gen-patch-ledger.ts. The other three columns are yours: they",
	"     cannot be derived from a diff, and this generator carries them across",
	"     regenerations. Fill `_unrecorded_` in place; do not delete the file. -->",
	"",
	"<!-- One row per `diff --git` hunk. `_unrecorded_` is a placeholder a",
	"     maintainer must fill: what the hunk does, which upstream issue it",
	"     works around, and the release that makes it droppable. -->",
	"",
	"<!-- A `.bun-tag-*` row is not upstream source: it is a Bun install tag the",
	"     patch rewrites. It is listed because it is a hunk like any other and",
	"     dropping it silently would change what the patch applies. -->",
	"",
].join("\n");

export function buildLedgerMarkdown(groups: readonly LedgerGroup[]): string {
	return `${LEDGER_HEADER}${renderGrouped(groups)}`;
}

async function readRepoFile(repoRoot: string, relative: string): Promise<string | null> {
	try {
		return await Bun.file(path.join(repoRoot, relative)).text();
	} catch (err) {
		if (isEnoent(err)) return null;
		throw err;
	}
}

/** Read `patchedDependencies`, preserving declaration order. */
export async function readPatchedDependencies(repoRoot: string): Promise<PatchedDependency[]> {
	const text = await readRepoFile(repoRoot, "package.json");
	if (text === null) throw new Error(`no package.json under ${repoRoot}`);
	const parsed = JSON.parse(text) as { patchedDependencies?: Record<string, string> };
	return Object.entries(parsed.patchedDependencies ?? {}).map(([spec, patchPath]) => ({ spec, patchPath }));
}

/**
 * Every `patches/*.patch` on disk, keyed by its repo-relative path.
 *
 * Deliberately NOT filtered by `patchedDependencies` — an undeclared patch is
 * one of the states that must be visible.
 */
export async function readPatchTree(repoRoot: string): Promise<Map<string, Hunk[]>> {
	const tree = new Map<string, Hunk[]>();
	const dir = path.join(repoRoot, "patches");
	const entries = await fs.readdir(dir).catch((err: unknown) => {
		if (isEnoent(err)) return [] as string[];
		throw err;
	});
	for (const name of entries) {
		if (!name.endsWith(".patch")) continue;
		const text = await Bun.file(path.join(dir, name)).text();
		tree.set(`patches/${name}`, [...parsePatchHunks(text).values()].flat());
	}
	return tree;
}

/** `--root <path>` — the tree to reconcile. Defaults to the repo this script lives in. */
function parseRoot(argv: readonly string[]): string {
	const flag = argv.indexOf("--root");
	const value = flag === -1 ? undefined : argv[flag + 1];
	if (value === undefined) return path.resolve(import.meta.dir, "..");
	return path.resolve(value);
}

export async function run(repoRoot: string): Promise<{ ok: true; hunkCount: number } | { ok: false }> {
	const patched = await readPatchedDependencies(repoRoot);
	const hunksByPatch = await readPatchTree(repoRoot);
	const ledgerText = await readRepoFile(repoRoot, LEDGER_PATH);
	const existing = parseLedger(ledgerText ?? "");

	const hunkCount = [...hunksByPatch.values()].reduce((sum, hunks) => sum + hunks.length, 0);
	// Both lists are printed, by name, because one empty beside one full is a
	// completely different diagnosis from two half-full ones. `patches` is sorted
	// because readdir order is filesystem-dependent and a log that reorders
	// itself between runs cannot be diffed against a previous run.
	console.error(
		`LEDGER: root=${repoRoot} hunks=${hunkCount} patches=${JSON.stringify([...hunksByPatch.keys()].sort())}`,
	);

	if (ledgerText === null) {
		// No ledger to reconcile against, so there is nothing that can disagree:
		// every hunk would be "missing" a row out of a file that does not exist,
		// which is not a finding. Write the structure — but say so, loudly: any
		// `purpose` / `upstream` / `drop-when` a maintainer wrote died with the
		// deleted file, and a silent regeneration would leave a fully-blank ledger
		// that passes this gate from then on.
		console.error(`LEDGER: BOOTSTRAP — no ${LEDGER_PATH}, wrote ${hunkCount} rows with blank human columns.`);
		await Bun.write(path.join(repoRoot, LEDGER_PATH), buildLedgerMarkdown(collectLedger(patched, hunksByPatch, existing)));
		console.log(`${LEDGER_PATH}: ${hunkCount} hunk rows, all awaiting a maintainer.`);
		return { ok: true, hunkCount };
	}

	const result = reconcile(patched, hunksByPatch, existing.flatMap(group => group.rows));
	if (!result.ok) {
		console.error(`LEDGER: MISMATCH missing=${JSON.stringify(result.missing)}`);
		console.error(`LEDGER: MISMATCH orphaned=${JSON.stringify(result.orphaned)}`);
		return { ok: false };
	}

	await Bun.write(path.join(repoRoot, LEDGER_PATH), buildLedgerMarkdown(collectLedger(patched, hunksByPatch, existing)));
	const carried = existing.flatMap(group => group.rows);
	const unrecorded = carried.filter(row => row.purpose === UNRECORDED).length;
	console.log(`${LEDGER_PATH}: ${hunkCount} hunk rows, ${unrecorded} awaiting a maintainer.`);
	return { ok: true, hunkCount };
}

async function main(): Promise<void> {
	const result = await run(parseRoot(Bun.argv.slice(2)));
	if (!result.ok) process.exitCode = 1;
}

if (import.meta.main) await main();
