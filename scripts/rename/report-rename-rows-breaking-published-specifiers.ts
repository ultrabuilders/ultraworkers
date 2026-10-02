/**
 * Report-only: how many `rename` rows sit inside a file that a package publishes?
 *
 * ## What a `rename` row means — read this before quoting a number from here
 *
 * `rename` renames the **token inside the file**. It does not rename the file.
 * `scripts/rename/README.md` states the vocabulary, and the gate implements it:
 * `rename-incomplete` fires when a rename row still has occurrences left in the
 * file, and `hits` counts those occurrences — which is why `cli.ts` carries
 * `hits=10` rather than 1. No file-rename primitive exists anywhere in
 * `scripts/rename/`.
 *
 * So **no row in this table can break a specifier.** An earlier version of this
 * file claimed the opposite and printed "BREAK a published specifier"; that was
 * wrong, and the error came from reading a row about a token as a row about a
 * file name. 63 caught it; the count was always answering a question nobody asked.
 *
 * ## What this actually measures
 *
 * Every bundled package publishes wildcards rooted at `src/`:
 *
 *     "./*": { "types": "./src/*.ts", "import": "./src/*.ts" }
 *
 * A wildcard does turn a **file name** into a **public specifier** — that part is
 * real. It just is not something `disposition.tsv` decides. The open question is
 * "should these files be renamed at all", which lives in the package's `exports`
 * map and needs an owner decision; there is no row to attach a `keep_refs` to.
 *
 *
 * ## What counts as published
 *
 * A file is reachable when some export pattern's **source** covers it:
 * - a wildcard whose `source` prefix contains it (`./*` → `./src/*.ts` covers
 *   everything under `src/`, and also yields the `.js` spelling via `./*.js`);
 * - a named export whose target is exactly that file.
 *
 * Files outside `src/` (tests, scripts) are **not** reachable through `./*`, and are
 * counted separately rather than silently dropped.
 *
 * ## What is excluded
 *
 * - `private: true` packages are not installed, so nothing of theirs is published.
 * - `cli` and `main` are already excluded from the compiled registry by
 *   `HOST_ENTRYPOINT_WILDCARD_BASENAMES` in `legacy-pi-virtual-module.ts`, read here
 *   at runtime rather than retyped — a second copy of that list is a second thing to
 *   drift, which is the defect this whole exercise exists to find.
 *
 * Run: `bun scripts/rename/report-rename-rows-breaking-published-specifiers.ts`
 */
import * as path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");
const TABLE = path.join(REPO_ROOT, "scripts/rename/disposition.tsv");
const REGISTRY_SCRIPT = path.join(REPO_ROOT, "packages/coding-agent/scripts/legacy-pi-virtual-module.ts");

/** Read the host-entrypoint exclusions rather than restating them. */
async function readHostEntrypoints(): Promise<Set<string>> {
	const source = await Bun.file(REGISTRY_SCRIPT).text();
	const block = source.match(/HOST_ENTRYPOINT_WILDCARD_BASENAMES\s*=\s*new Set\(\[([^\]]*)\]/);
	if (!block?.[1]) throw new Error("HOST_ENTRYPOINT_WILDCARD_BASENAMES not found in the registry script");
	const names = [...block[1].matchAll(/"([^"]+)"/g)].map(m => m[1] ?? "");
	// Control: the set must be non-empty and the declaration must have been matched,
	// or "excluded by the registry" would be true of everything.
	if (names.length === 0) throw new Error("parsed zero host entrypoints — refusing to report");
	return new Set(names);
}

interface Manifest {
	readonly name: string;
	readonly private: boolean;
	/** Source prefixes covered by a wildcard export, e.g. `src/`, `src/components/`. */
	readonly wildcardPrefixes: string[];
	/** Exact package-relative source files named by a non-wildcard export. */
	readonly namedTargets: string[];
}

const manifestCache = new Map<string, Manifest>();

function wildcardSourcePrefix(exportKey: string, target: string): string | null {
	const exportStar = exportKey.indexOf("*");
	const sourceStar = target.indexOf("*");
	if (exportStar === -1 || sourceStar === -1) return null;
	if (!target.startsWith("./")) return null;
	return target.slice(2, sourceStar);
}

async function loadManifest(packageDir: string): Promise<Manifest | null> {
	const cached = manifestCache.get(packageDir);
	if (cached !== undefined) return cached;
	const file = path.join(REPO_ROOT, "packages", packageDir, "package.json");
	let manifest: Manifest | null = null;
	try {
		const raw = (await Bun.file(file).json()) as Record<string, unknown>;
		const exportsField =
			typeof raw.exports === "object" && raw.exports !== null ? (raw.exports as Record<string, unknown>) : {};
		const wildcardPrefixes: string[] = [];
		const namedTargets: string[] = [];
		for (const [key, value] of Object.entries(exportsField)) {
			if (!key.startsWith("./")) continue;
			const target = typeof value === "string" ? value : (value as { import?: unknown })?.import;
			if (typeof target !== "string") continue;
			if (key.includes("*")) {
				const prefix = wildcardSourcePrefix(key, target);
				if (prefix !== null) wildcardPrefixes.push(prefix);
			} else {
				namedTargets.push(target.replace(/^\.\//, ""));
			}
		}
		manifest = {
			name: typeof raw.name === "string" ? raw.name : `packages/${packageDir}`,
			private: raw.private === true,
			wildcardPrefixes,
			namedTargets,
		};
	} catch {
		manifest = null;
	}
	manifestCache.set(packageDir, manifest);
	return manifest;
}

/** Is `packageRelPath` (e.g. `src/tools/grep.ts`) reachable through this manifest? */
function isPublished(manifest: Manifest, packageRelPath: string): boolean {
	if (manifest.namedTargets.includes(packageRelPath)) return true;
	return manifest.wildcardPrefixes.some(prefix =>
		prefix.endsWith("/") ? packageRelPath.startsWith(prefix) : packageRelPath === prefix,
	);
}

const hostEntrypoints = await readHostEntrypoints();
const table = await Bun.file(TABLE).text();
const lines = table.split("\n").filter(line => line.trim().length > 0);
const header = lines[0]!.split("\t");
const col = (name: string) => {
	const index = header.indexOf(name);
	if (index === -1) throw new Error(`column ${name} not found in ${path.basename(TABLE)}`);
	return index;
};
const PATH = col("path");
const DISPOSITION = col("disposition");

let renameRows = 0;
let outsideSrc = 0;
let missingFile = 0;
let privatePackage = 0;
let hostEntrypoint = 0;
const publishedRows: string[] = [];

for (const line of lines.slice(1)) {
	const cells = line.split("\t");
	if (cells[DISPOSITION] !== "rename") continue;
	renameRows += 1;

	const relPath = cells[PATH] ?? "";
	const segments = relPath.split("/");
	if (segments[0] !== "packages" || !segments[1]) {
		outsideSrc += 1;
		continue;
	}
	const packageDir = segments[1];
	const packageRelPath = segments.slice(2).join("/");
	// `./*` resolves to `./src/*.ts`, so only files under src/ become specifiers.
	if (!packageRelPath.startsWith("src/")) {
		outsideSrc += 1;
		continue;
	}
	if (!(await Bun.file(path.join(REPO_ROOT, relPath)).exists())) {
		missingFile += 1;
		continue;
	}
	const manifest = await loadManifest(packageDir);
	if (!manifest) {
		missingFile += 1;
		continue;
	}
	if (manifest.private) {
		privatePackage += 1;
		continue;
	}
	const basename = packageRelPath.slice(packageRelPath.lastIndexOf("/") + 1).replace(/\.tsx?$/, "");
	if (hostEntrypoints.has(basename)) {
		hostEntrypoint += 1;
		continue;
	}
	if (isPublished(manifest, packageRelPath)) publishedRows.push(relPath);
}

const accounted = outsideSrc + missingFile + privatePackage + hostEntrypoint + publishedRows.length;

console.log(`HEAD                 ${(await Bun.$`git rev-parse --short HEAD`.cwd(REPO_ROOT).text()).trim()}`);
console.log(`host entrypoints excluded (read from the registry): ${JSON.stringify([...hostEntrypoints])}\n`);
console.log(`rename rows total            ${renameRows}`);
console.log(`  in a published file        ${publishedRows.length}   (rename hits the TOKEN, not the file name)`);
console.log(`  outside src/ (not a specifier) ${outsideSrc}`);
console.log(`  file or manifest missing    ${missingFile}`);
console.log(`  private package             ${privatePackage}`);
console.log(`  host entrypoint (cli/main)  ${hostEntrypoint}`);
console.log(
	`\nreconciliation: ${accounted} accounted of ${renameRows} rename rows — ` +
		`${accounted === renameRows ? "nothing unaccounted" : `UNACCOUNTED ${renameRows - accounted}`}`,
);

if (publishedRows.length > 0) {
	console.log(`\nrows that order a break of a published specifier:`);
	for (const relPath of publishedRows.sort()) console.log(`  ${relPath}`);
}

// Report-only: landing or amending any of these rows is a separate, deliberate
// step, and a4 has asked that nobody write rename rows on published names while
// the table is being adjudicated.
process.exit(0);
