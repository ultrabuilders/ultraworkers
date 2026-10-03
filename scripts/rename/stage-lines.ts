/**
 * Stage exactly the lines you wrote into a shared file, and nothing else.
 *
 * On a shared working tree the index belongs to every session, so the usual
 * staging verbs each take something that is not yours:
 *
 *   git add <path>        the path's ENTIRE current content, including a peer's
 *                         in-flight edits to the same file
 *   git commit --only     narrower, but still the whole current file — it differs
 *                         from `git add` in scope, not in kind
 *   git commit (bare)     the whole index, including rows another session staged
 *
 * Measured today, twice: a bare commit on this tree took a peer's staged rows
 * under my message, and `--only` picked up a blank line another session had
 * added to the same TSV. Content stayed correct in both cases; the attribution
 * did not.
 *
 * This stages the only thing the author can name precisely — the bytes they
 * produced — by writing them straight into the index. Nothing is read from the
 * working tree, so a peer's concurrent edit to the same file cannot be swept in.
 *
 * Usage:
 *   bun scripts/rename/stage-lines.ts <file> <line>...      # 1-indexed, as sed/awk count them
 *   bun scripts/rename/stage-lines.ts --stdin <file>       # one line of content per stdin line
 *
 * It stages against the file's CURRENT HEAD blob plus only the given lines, so
 * it is not a general-purpose "stage these edits" tool: use it for appending or
 * replacing whole lines in a file several sessions edit at once.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { $ } from "bun";

interface Options {
	file: string;
	lines: string[];
}

/** Parse argv, rejecting anything this script cannot stage precisely. */
function parseArgs(argv: string[]): Options {
	if (argv[0] === "--stdin") {
		const file = argv[1];
		if (!file) throw new Error("--stdin needs a file path");
		throw new Error("--stdin reads stdin synchronously; call stageLines() from code instead");
	}
	const [file, ...rest] = argv;
	if (!file) throw new Error("usage: stage-lines.ts <file> <line>...");
	if (rest.length === 0) throw new Error("refusing to stage nothing: name at least one line");
	return { file, lines: rest };
}

export async function stageLines(file: string, contents: string, base: string, cwd = process.cwd()): Promise<string> {
	// `git hash-object -w --stdin` writes the blob and prints its sha; nothing
	// touches the index yet, so a failure here leaves the tree as it was.
	// Bun.spawn rather than $`` because the payload is piped, not interpolated.
	const hashed = Bun.spawn(["git", "hash-object", "-w", "--stdin"], {
		cwd,
		stdin: new Blob([contents]).stream(),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [hashOut, hashErr, hashCode] = await Promise.all([
		new Response(hashed.stdout).text(),
		new Response(hashed.stderr).text(),
		hashed.exited,
	]);
	if (hashCode !== 0) throw new Error(`git hash-object exited ${hashCode}: ${hashErr}`);
	const hash = hashOut.trim();

	// `update-index --cacheinfo` takes mode, object and path as one argument;
	// the mode is 100644, which is what every table in scripts/rename/ is.
	const updated = Bun.spawn(["git", "update-index", "--add", "--cacheinfo", `100644,${hash},${file}`], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [, updateErr, updateCode] = await Promise.all([
		new Response(updated.stdout).text(),
		new Response(updated.stderr).text(),
		updated.exited,
	]);
	if (updateCode !== 0) throw new Error(`git update-index exited ${updateCode}: ${updateErr}`);

	return hash;
}

/** HEAD's committed content for `file`, or "" when the file is new. */
export async function headBlob(file: string, cwd = process.cwd()): Promise<string> {
	const result = await $`git show HEAD:${file}`.cwd(cwd).quiet().nothrow();
	return result.exitCode === 0 ? result.text() : "";
}

/**
 * Replace the lines at `lineNumbers` (1-indexed) of `working`, and stage the
 * result. Lines outside that set are taken from `base`, never from `working`.
 */
export async function stageReplacedLines(
	file: string,
	working: string,
	lineNumbers: number[],
	cwd = process.cwd(),
): Promise<void> {
	const base = await headBlob(file, cwd);
	const hadTrailingNewline = working.endsWith("\n");
	// A trailing newline makes split() produce a final empty element that is not
	// a line; counting it would both reject the last real line as out of range
	// and append a phantom blank line to what gets staged.
	const lines = (text: string): string[] => {
		const parts = text.split("\n");
		if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
		return parts;
	};
	const baseLines = lines(base);
	const workingLines = lines(working);

	// Every named line must exist in the file being staged. Padding a short file
	// out to a higher line number would silently append blanks, which on a
	// shared table is indistinguishable from rows that went missing.
	const missing = lineNumbers.filter(n => n < 1 || n > workingLines.length);
	if (missing.length > 0) {
		throw new Error(
			`line(s) ${missing.join(", ")} do not exist in ${file} (${workingLines.length} line(s)); ` +
				"refusing to pad the file",
		);
	}

	const out: string[] = [];
	const total = Math.max(baseLines.length, workingLines.length);
	for (let i = 0; i < total; i++) {
		if (lineNumbers.includes(i + 1)) {
			out.push(workingLines[i]!);
			continue;
		}
		if (i >= baseLines.length) {
			// A line that exists in neither HEAD nor the named set. Padding it
			// would write a blank row into a table other sessions append to, and
			// a blank row reads as a row that went missing.
			throw new Error(
				`line ${i + 1} of ${file} is not in HEAD and was not named for staging; ` +
					"name every added line explicitly",
			);
		}
		out.push(baseLines[i]!);
	}

	const contents = out.join("\n") + (hadTrailingNewline ? "\n" : "");
	await stageLines(file, contents, base, cwd);
}

if (import.meta.main) {
	const { file, lines } = parseArgs(process.argv.slice(2));
	const working = await fs.readFile(path.resolve(file), "utf8");
	const numbers = lines.map(line => Number(line));
	if (numbers.some(n => !Number.isInteger(n) || n < 1)) {
		throw new Error(`line numbers must be positive integers, got ${lines.join(", ")}`);
	}
	await stageReplacedLines(file, working, numbers);
	const staged = await $`git diff --cached --numstat -- ${file}`.quiet().nothrow();
	process.stdout.write(`staged ${file}: ${staged.text().trim() || "(no change)"}\n`);
}
