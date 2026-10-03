/**
 * Locked, validating batch writer for `disposition.tsv`.
 *
 * WHY THIS EXISTS. Ten sessions share one tree under one git identity, so "only one
 * person writes the table" was never a rule anyone could enforce — it was a habit,
 * and a habit does not survive the session that formed it. This replaces it with
 * something mechanical: one writer at a time, under a lock, with a batch that is
 * written whole or not at all.
 *
 * IT REPLACES DISCIPLINE, NOT THE OWNER. Validation here is a floor, not a verdict.
 * `hits` is a claim about a file that only a reader of that file can settle, and a
 * green run proves nothing about whether a claim is TRUE — it proves the claim is
 * well-formed, names a real class, and balances. A row that says `1 + 5 = 6` passes
 * here whether the split is real or invented; only line-level reading settles that,
 * which is what the `rules` column is for.
 *
 * STDIN, NOT A FILE IN THE TREE. Rows arrive on stdin so a peer's draft never has to
 * land inside the repository. A sweep once reformatted `.lavish-wip/*.ts` and ate
 * another agent's probes; evidence does not belong where a formatter can reach it.
 *
 * USAGE
 *   bun scripts/rename/propose-rows.ts --dry-run < rows.tsv
 *   bun scripts/rename/propose-rows.ts            < rows.tsv
 *
 * A row is matched to the table by `(path, disposition)`. Exactly one match is
 * replaced, no match appends, and MORE THAN ONE IS REFUSED — several rows of one
 * class in one file are indistinguishable by count, so picking among them would be a
 * guess about which occurrence set the author meant. Refusing is the honest answer.
 */

import { $ } from "bun";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { countRename, DISPOSITIONS, parseTable, requiresKeepRefs, RULES_VERSION } from "./check-disposition";

const ROOT = path.resolve(import.meta.dir, "../..");
const TABLE = path.join(ROOT, "scripts/rename/disposition.tsv");
const LOCK = path.join(ROOT, "scripts/rename/.disposition.lock");

/** One incoming line and what became of it. */
interface Outcome {
	readonly line: number;
	readonly raw: string;
	/**
	 * The exact bytes this outcome contributes to the table.
	 *
	 * NOT always `raw`. A 6-cell row under a 7-cell header is normalised to carry
	 * `RULES_VERSION`, and the replace path wrote that normalised form while the
	 * append path wrote `raw` — so every APPENDED row silently lost its stamp.
	 * Appending is what closing a `missing-row` does, so the rows this tool exists
	 * to add were precisely the ones that came out unstamped.
	 */
	readonly row: string;
	readonly verdict: "replace" | "append" | "reject";
	readonly reason: string;
}

/**
 * Structural + semantic checks a row must pass BEFORE any byte is written.
 *
 * Each check names a rule the gate already enforces, so this is the same contract
 * stated earlier rather than a second opinion: an `empty-reason` row is rejected here
 * for the reason `empty-reason` would reject it later, which turns a batch failure
 * into a message instead of a red gate.
 */
function rejectReason(cells: readonly string[]): string | null {
	if (cells.length !== 6 && cells.length !== 7) {
		return `expected 6 or 7 tab-separated cells, got ${cells.length}`;
	}
	const [scope, filePath, hitsRaw, disposition, reason, keepRefs] = cells as readonly string[];
	if (scope.trim() === "") return "scope is empty";
	if (filePath.trim() === "") return "path is empty";
	if (!/^\d+$/.test(hitsRaw.trim())) return `hits is not a non-negative integer: ${JSON.stringify(hitsRaw)}`;
	if (!(DISPOSITIONS as readonly string[]).includes(disposition)) {
		return `disposition ${JSON.stringify(disposition)} is not in the closed vocabulary`;
	}
	// `empty-reason`, stated early. A row with no reason is an approval nobody signed.
	if (reason.trim() === "") return "reason is empty";
	// `missing-keep-refs`: a keep-* row must name its owner.
	if (requiresKeepRefs(disposition) && keepRefs.trim() === "") {
		return `a ${disposition} row must carry keep_refs`;
	}
	// `keep-ref-shape`: a ref is a name, not a sentence. One row in the table had a
	// whole paragraph here, which parsed as a valid cell and was reported as its own
	// kind of ref by the vocabulary report.
	if (/\s/.test(keepRefs.trim())) return "keep_refs contains whitespace — that is prose, not a ref";
	return null;
}

/**
 * A `docs:<path>#<token>` citation inside a reason.
 *
 * The citation is worth something only if the page it names really does say the
 * token is a contract. A path alone proves nothing — every file in the repo has
 * a path — so the token is carried alongside it and checked against the page.
 */
interface DocsCitation {
	readonly path: string;
	readonly token: string;
}

const DOCS_CITATION = /docs:([^\s#]+)#(\S+)/g;

/** Punctuation that can close a sentence or bracket after a citation. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

export function parseDocsCitations(reason: string): DocsCitation[] {
	const found: DocsCitation[] = [];
	for (const match of reason.matchAll(DOCS_CITATION)) {
		// `(\S+)` runs to the next whitespace, so a citation that ends a sentence
		// arrives carrying that sentence's punctuation. It has to be trimmed AFTER
		// the capture: making the group lazy to stop at the delimiter instead would
		// silently shorten `OMP_MCP_TIMEOUT_MS` to `OMP`, and a token that is a
		// prefix of the real one is exactly what the whole-word rule exists to
		// reject — the citation would fail on a page that does carry it.
		//
		// Left unfixed this is worse than a false alarm: every citation placed at
		// the end of a sentence can never pass, so the workaround is to move
		// citations into the middle of sentences, and `reason` becomes prose
		// shaped to dodge its own check.
		const token = match[2]!.replace(TRAILING_PUNCTUATION, "");
		if (token === "") continue;
		found.push({ path: match[1]!, token });
	}
	return found;
}

/**
 * True when `token` occurs in `page` delimited by word characters.
 *
 * `OMP` must NOT match inside `OMP_PROFILE`. That substring match put fourteen
 * wrong rows in one batch: the filter asked "does this page mention OMP", the
 * page mentioned a different variable that merely starts with the same three
 * letters, and the row claimed a contract that the page never states. `_` and
 * `-` count as word characters here precisely so that `OMP_PROFILE` and `OMP`
 * are two tokens rather than one.
 */
export function pageContainsToken(page: string, token: string): boolean {
	const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(page);
}

/**
 * Split a stdin batch into rows, dropping blank lines and nothing else.
 *
 * The whole point is what it does NOT do. A row's final cell may be an empty
 * `keep_refs`, so a `rename` row legitimately ends in a tab, and trimming each
 * line would delete that tab and turn 6 cells into 5. Only a line that is empty
 * or all whitespace is dropped.
 */
export function splitIncoming(input: string): string[] {
	return input.split("\n").filter(line => line.trim() !== "");
}

/** True when no process holds this pid. The one question a lock file can answer. */
function pidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		// EPERM means the process exists and belongs to someone else — alive, and not
		// ours to take. Anything else (ESRCH) means it is gone.
		return (err as NodeJS.ErrnoException).code === "EPERM";
	}
}

interface LockRecord {
	readonly pid: number;
	readonly at: string;
}

/**
 * Take the table's lock, or report who holds it.
 *
 * Liveness is decided by asking the OS whether the recorded pid is alive, not by
 * comparing mtimes. The mtime heuristic earns its keep for a lock this repository
 * does not own — git's `index.lock`, where a dead writer leaves a file with no
 * process to ask. This lock records its own pid precisely so that question has an
 * answer, and a timestamp is recorded alongside it for a human reading the file.
 */
async function acquireLock(): Promise<() => Promise<void>> {
	let existing: LockRecord | null = null;
	try {
		existing = JSON.parse(await Bun.file(LOCK).text()) as LockRecord;
	} catch {
		existing = null; // absent or unreadable: there is no lock to honour
	}
	if (existing && typeof existing.pid === "number" && pidAlive(existing.pid) && existing.pid !== process.pid) {
		throw new Error(
			`disposition.tsv is locked by pid ${existing.pid} since ${existing.at}. ` +
				`Wait for it, or confirm that process is gone before removing ${path.relative(ROOT, LOCK)}.`,
		);
	}
	await Bun.write(LOCK, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString() })}\n`);
	return async () => {
		await fs.rm(LOCK, { force: true });
	};
}

async function main(): Promise<void> {
	const argv = process.argv.slice(2);
	const dryRun = argv.includes("--dry-run");
	const unknown = argv.filter(a => a.startsWith("--") && a !== "--dry-run");
	if (unknown.length > 0) {
		console.error(`unknown flag(s): ${unknown.join(", ")}`);
		process.exit(2);
	}

	// NOT `.trim()`. Trailing whitespace is significant here: a `rename` row's last
	// cell is an EMPTY `keep_refs`, so its line legitimately ends in a tab. Trimming
	// the whole input stripped that tab off the final line, and the batch was
	// rejected for having 5 cells instead of 6 — a shape no author could see or fix,
	// because the file on disk was correct. Blank lines are dropped by
	// `splitIncoming`, which is what the trim was actually for.
	const input = await Bun.stdin.text();
	if (input === "") {
		console.error("no rows on stdin — nothing to do");
		process.exit(2);
	}

	// Everything that DECIDES anything happens inside the lock. Measuring outside it
	// and writing inside it is the defect this tool was built to remove: `hits` would
	// be a claim about a tree read at one moment, stamped into a table written at
	// another. `--dry-run` measures without the lock and says so, because a preview
	// that blocks writers is worse than a preview that can be stale.
	const release = dryRun ? async () => {} : await acquireLock();
	try {
		await apply(input, dryRun);
	} finally {
		await release();
	}
}

/**
 * Parse `git status --porcelain` into the set of paths it reports as changed.
 *
 * Porcelain is `XY <path>`, so the path begins at index 3 — and that offset is
 * the whole risk here. Slicing the wrong span yields a plausible path that
 * matches nothing, and "no file is dirty" then reads as a result instead of a
 * broken matcher. A rename is `R  old -> new`, and the new path is the one that
 * exists in the working tree, so that is what goes in the set.
 */
export function parsePorcelainPaths(status: string): Set<string> {
	const paths = new Set<string>();
	for (const line of status.split("\n")) {
		if (line.trim() === "") continue;
		// Two status columns, one space, then the path.
		const rest = line.slice(3).trim();
		if (rest === "") continue;
		const arrow = rest.indexOf(" -> ");
		const path = (arrow >= 0 ? rest.slice(arrow + 4) : rest).replace(/\/+$/, "");
		if (path !== "") paths.add(path);
	}
	return paths;
}

/**
 * Paths with uncommitted edits, read once per batch.
 *
 * `hits-imbalance` measures the WORKING TREE, so a row can look settled only
 * because a peer is mid-edit: correcting its count now closes the row of a change
 * that has not landed, and the row goes red again the moment that peer commits.
 * That is a row made green by overwriting a fact that has not happened yet.
 *
 * Outside a git repository — or with git unavailable — this is an empty set, so
 * the check simply does not fire rather than blocking every batch.
 */
async function readDirtyPaths(): Promise<Set<string>> {
	try {
		const result = await $`git -C ${ROOT} status --porcelain`.nothrow().quiet();
		if (result.exitCode !== 0) return new Set();
		return parsePorcelainPaths(result.text());
	} catch {
		return new Set();
	}
}

async function apply(input: string, dryRun: boolean): Promise<void> {
	// The bytes as they are on disk right now. Every later write is conditional on
	// this string still being what we read, which is the compare-and-swap that stops
	// a peer who edited the file between our read and our write from being clobbered.
	const before = await Bun.file(TABLE).text();
	const existingLines = before.split("\n");
	const header = existingLines[0] ?? "";
	const hasRulesColumn = (header.split("\t").length ?? 0) === 7;

	// Read once, not per row: `git status` on a batch of twenty rows would cost
	// twenty subprocesses to answer a question that cannot change mid-batch.
	const dirtyPaths = await readDirtyPaths();

	/**
	 * True when `filePath` sits inside something with uncommitted edits.
	 *
	 * The prefix arm matters because git reports an untracked DIRECTORY as a
	 * single `dir/` entry. Holding only `packages/new` and asking
	 * `dirtyPaths.has("packages/new/src/x.ts")` answers false for every file
	 * inside it, so the guard would pass exactly the rows it exists to stop.
	 */
	const isDirty = (filePath: string): boolean => {
		if (dirtyPaths.has(filePath)) return true;
		for (const dirty of dirtyPaths) {
			if (filePath.startsWith(`${dirty}/`)) return true;
		}
		return false;
	};

	const incoming = splitIncoming(input);
	const outcomes: Outcome[] = [];
	const work = new Map<number, string>(); // index into existingLines -> replacement bytes

	for (const [index, raw] of incoming.entries()) {
		const lineNo = index + 1;
		const cells = raw.split("\t");
		const why = rejectReason(cells);
		if (why !== null) {
			outcomes.push({ line: lineNo, raw, row: raw, verdict: "reject", reason: why });
			continue;
		}
		const filePath = cells[1]!;

		// A row about a file someone is currently editing describes a file that
		// does not exist yet. Writing it now produces a row that is green until
		// the peer commits, at which point the gate reopens it — and by then the
		// author has forgotten why the number was chosen.
		if (isDirty(filePath)) {
			outcomes.push({
				line: lineNo,
				raw,
				row: raw,
				verdict: "reject",
				reason: `${filePath} has uncommitted edits; a row written now would describe a file mid-change and reopen the moment that edit lands`,
			});
			continue;
		}
		const disposition = cells[3]!;
		const hits = Number(cells[2]);

		// A ZERO is the one value this tool can disprove, because it is the only one
		// that asserts the file holds nothing of the token at all. Measuring it here,
		// under the lock, is what keeps `hits` and `reason` describing one moment —
		// four `hits = 0` rows were committed already wrong, and a tool that only
		// checked FORM would have written the fifth with a lock instead of a habit.
		//
		// A NON-ZERO is left exactly as its author wrote it. Computing it would mean
		// calling `countRename`, which returns the file-wide pinned total and ignores
		// the keep classes — the script would reproduce, mechanically, the error it
		// exists to catch. Recording the author's number with a `rules` stamp says
		// when it was claimed; only reading the file settles whether it is true, and
		// that is line-level work, not this tool's.
		if (hits === 0) {
			let measured: number | null = null;
			try {
				measured = countRename(await Bun.file(path.join(ROOT, filePath)).text());
			} catch {
				measured = null; // unreadable here is unreadable for the gate too
			}
			if (measured !== null && measured !== 0) {
				outcomes.push({
					line: lineNo,
					raw,
					row: raw,
					verdict: "reject",
					reason: `declares hits = 0, but ${filePath} has ${measured} pinned occurrence(s) right now`,
				});
				continue;
			}
		}

		// A `docs:` citation is a claim ABOUT a page, so the page gets read. This is
		// the one claim in a row that can be disproved mechanically: the token either
		// appears on the cited page as a whole word or it does not. A row asserting
		// otherwise is asserting something its author did not read, and the whole-word
		// rule is the part that matters — see `pageContainsToken`.
		let docsFailure: string | null = null;
		for (const citation of parseDocsCitations(cells[4] ?? "")) {
			const where = `docs:${citation.path}#${citation.token}`;
			let page: string | null = null;
			try {
				page = await Bun.file(path.join(ROOT, citation.path)).text();
			} catch {
				page = null; // unreadable here is unreadable for the gate too
			}
			if (page === null) {
				docsFailure = `reason cites ${where}, but that page is not readable here`;
				break;
			}
			if (!pageContainsToken(page, citation.token)) {
				docsFailure = `reason cites ${where}, but that token does not appear on the page as a whole word`;
				break;
			}
		}
		if (docsFailure !== null) {
			outcomes.push({ line: lineNo, raw, row: raw, verdict: "reject", reason: docsFailure });
			continue;
		}

		// Where does this row go? Matched on (path, disposition) — the same key the
		// gate groups by. Two rows of one class in one file cannot be told apart by
		// count, so choosing between them would be choosing which occurrence set the
		// author meant. Refuse rather than guess.
		const matches: number[] = [];
		for (let i = 1; i < existingLines.length; i++) {
			const cellsHere = (existingLines[i] ?? "").split("\t");
			if (cellsHere[1] === filePath && cellsHere[3] === disposition) matches.push(i);
		}
		if (matches.length > 1) {
			outcomes.push({
				line: lineNo,
				raw,
				row: raw,
				verdict: "reject",
				reason:
					`${filePath} already has ${matches.length} ${disposition} rows ` +
					`(lines ${matches.map(i => i + 1).join(", ")}); they are indistinguishable by count, ` +
					`so this batch will not guess which one to replace`,
			});
			continue;
		}
		// Normalise the cell count to whatever the table's header declares, so a
		// 6-cell row cannot land under a 7-cell header (or the reverse).
		const normalised = hasRulesColumn && cells.length === 6 ? [...cells, RULES_VERSION] : cells;
		if (matches.length === 1) {
			const at = matches[0]!;
			work.set(at, normalised.join("\t"));
			outcomes.push({
				line: lineNo,
				raw,
				row: normalised.join("\t"),
				verdict: "replace",
				reason: `replaces line ${at + 1}`,
			});
		} else {
			outcomes.push({
				line: lineNo,
				raw,
				row: normalised.join("\t"),
				verdict: "append",
				reason: "no existing row for this (path, disposition)",
			});
		}
	}

	// Nothing is written until the WHOLE batch is known to parse. A partial write
	// leaves a table that half-accounts for a file, which is the state this table
	// exists to prevent.
	const candidateLines = [...existingLines];
	for (const [at, replacement] of work) candidateLines[at] = replacement;
	for (const outcome of outcomes.filter(o => o.verdict === "append")) candidateLines.push(outcome.row);
	const candidate = `${candidateLines.join("\n")}`;
	const { problems } = parseTable(candidate);

	const rejected = outcomes.filter(o => o.verdict === "reject");
	const replaces = outcomes.filter(o => o.verdict === "replace");
	const appends = outcomes.filter(o => o.verdict === "append");

	console.log(
		`batch: ${outcomes.length} row(s) — ${replaces.length} replace, ${appends.length} append, ${rejected.length} reject`,
	);
	for (const outcome of outcomes) {
		console.log(`  line ${outcome.line}  ${outcome.verdict.toUpperCase().padEnd(7)}  ${outcome.reason}`);
		if (outcome.verdict === "reject") console.log(`      ${outcome.raw.slice(0, 120)}`);
	}

	if (problems.length > 0) {
		console.error(`\nrefusing to write: the resulting table does not parse (${problems.length} problem(s))`);
		for (const problem of problems.slice(0, 10)) console.error(`  ${problem}`);
		console.error("No bytes were written.");
		process.exit(1);
	}
	if (rejected.length > 0) {
		console.error(
			`\nrefusing to write: ${rejected.length} row(s) rejected above. A batch is written whole or not at all.`,
		);
		console.error("No bytes were written.");
		process.exit(1);
	}
	if (candidate === before) {
		console.log("\nno change: every row already matches what is on disk");
		return;
	}
	if (dryRun) {
		console.log("\n--dry-run: the table WOULD change as above. No bytes were written.");
		return;
	}

	// Compare-and-swap: if the table moved while we were deciding, our decision was
	// made against a file that no longer exists. The lock stops two writers; this
	// stops a writer who started before the lock existed.
	const now = await Bun.file(TABLE).text();
	if (now !== before) {
		console.error("\nrefusing to write: disposition.tsv changed while this batch was being validated.");
		console.error("Re-read it and re-run — the rows were decided against a version that is gone.");
		process.exit(1);
	}
	// Atomic: a crash mid-write leaves the old table intact rather than a half-written one.
	const tmp = `${TABLE}.${process.pid}.tmp`;
	await Bun.write(tmp, candidate);
	await fs.rename(tmp, TABLE);
	console.log(`\nwrote ${replaces.length + appends.length} row(s) to ${path.relative(ROOT, TABLE)}`);
	console.log("Re-run `bun run check:disposition-ratchet` and the gate before pushing.");
}

if (import.meta.main) await main();
