import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { SyntaxKind } from "typescript/unstable/ast";
import {
	isCallExpression,
	isExportDeclaration,
	isImportDeclaration,
	isImportTypeNode,
	isLiteralTypeNode,
	isNoSubstitutionTemplateLiteral,
	isStringLiteral,
} from "typescript/unstable/ast/is";
import { API } from "typescript/unstable/async";

const PREFIX = "[ts-relative-imports]";
// `.claude` is here for a different reason than `.git`, and the two guards do not
// overlap. `isNestedRepositoryRoot` below catches a worktree because that
// checkout carries a `.git` entry; it does not catch an ordinary dot-directory at
// the same path. Probed against this gate: a `.ts` file under `.wt/` holding the
// violation this gate exists for IS reported, so the walk does reach plain
// dot-directories and only the nested-repository guard was standing in the way.
//
// Excluding it costs nothing: `git ls-files | grep -E '(^|/)\.claude/'` is empty,
// at any depth, so no tracked file of this repository lives under one.
//
// THIS SET IS MATCHED BY NAME AT EVERY LEVEL, NOT BY A ROOT-ANCHORED PREFIX, and
// that is deliberate rather than a slip — do not "fix" it to `.claude/` at the
// root. A `.claude/` at any depth is project-scoped agent configuration, which is
// exactly the content no gate should be reading: it is not shipped source, it is
// not in this repository's index, and it changes per machine. Naming it once here
// states that rule for every level; a prefix would state it for one and leave the
// rest to be re-decided. Reviewed and kept in this form (epic-wh2q).
//
// The cost of that choice is a walk-up-to-root gate losing a `packages/foo/.claude/`
// it was never entitled to scan, so the coverage argument does not apply against
// it — and the measurement above is what says so rather than assuming it.
const ignoredDirectories = new Set([".git", ".claude", "coverage", "dist", "node_modules"]);
const files = [];

/**
 * True when `directory` is itself the root of another repository.
 *
 * `readdirSync` returns dotfile entries unconditionally — it has no `dot`
 * option at all, so there is nothing to switch off. Walking into a nested
 * checkout therefore re-reports every finding the parent repository already
 * owns: `EnterWorktree` writes a complete tree under `.claude/worktrees/<name>/`
 * with its own `.git` file, and the parent gate then reports files governed by
 * a different index. Measured at 661 phantom findings from one worktree.
 *
 * The rule is deliberately NOT "skip dot-directories". This repository tracks
 * 532 files under dot-directories, and two of them are load-bearing for these
 * gates: `.omp/tools/package.json` is an explicitly-exempt workspace in
 * `check-pinned-deps`, and `.omp/tools/tui.ts` is a gated TypeScript source.
 * A blanket dot-skip would delete that coverage silently while still printing
 * a clean report — the one failure mode a gate must never have.
 *
 * A separate repository is the distinction that actually separates the two:
 * its files belong to a different index.
 */
function isNestedRepositoryRoot(directory) {
	return existsSync(join(directory, ".git"));
}

function collectTypescriptFiles(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!ignoredDirectories.has(entry.name) && !isNestedRepositoryRoot(join(directory, entry.name))) {
				collectTypescriptFiles(join(directory, entry.name));
			}
			continue;
		}

		// `.tsx` is collected for the same reason `.ts` is: a specifier that lies
		// is a lie in any file that carries imports. Skipping it would leave the
		// 116 `.tsx` files in this tree silently uninspected — a gate that cannot
		// see a file type reports nothing about it, which reads exactly like
		// "clean". `.d.ts` stays excluded: it is declarations, not a module that
		// resolves at runtime.
		if (
			entry.isFile() &&
			(entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
			!entry.name.endsWith(".d.ts")
		) {
			files.push(join(directory, entry.name));
		}
	}
}

function isStringLiteralLike(node) {
	return node !== undefined && (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node));
}

function getImportTypeSpecifier(node) {
	if (!isLiteralTypeNode(node.argument)) return undefined;
	if (!isStringLiteralLike(node.argument.literal)) return undefined;
	return node.argument.literal;
}

/**
 * The verdict for one relative specifier, or `undefined` when it is legal.
 *
 * `pi` states this rule as "no relative `.js` specifier". That is only true in a
 * tree whose sources are all TypeScript, and it is **not** true here, so porting
 * it verbatim would demand deleting 28 imports that are correct — native bindings
 * (`packages/natives/native/*.js`) and asset imports carrying `with { type }`
 * attributes, both of which point at a real `.js` file on disk. Measured on this
 * tree, exactly 8 of the 36 hits were a `.js` suffix lying about a `.ts` sibling;
 * those are the ones worth policing.
 *
 * So the rule became the one those 8 actually violate: a `.js` suffix is only
 * wrong when **no such `.js` file exists**, i.e. when the author meant the `.ts`
 * sibling next to it. That admits real `.js` files without an allowlist of paths,
 * which matters because a path allowlist is exactly the kind of suppression this
 * repo's other gate had to be argued out of using.
 *
 * `.ts` suffixes are policed outright — there is never a reason to write one.
 *
 * `.d.ts` is the one exemption, and it is not a path allowlist: a declaration
 * file has no runtime module to point at, so naming it is the only way to refer
 * to it. Both uses on this tree read it as text (`with { type: "text" }`) to
 * inline browser/computer prelude declarations, which is exactly why the name
 * has to survive. Keying on the extension rather than on those two paths means a
 * third such read does not have to come back here for a decision.
 */
function relativeSpecifierViolation(specifier, file) {
	if (!/^\.\.?\//.test(specifier)) return undefined;
	if (/\.d\.ts(?:[?#].*)?$/.test(specifier)) return undefined;
	if (/\.ts(?:[?#].*)?$/.test(specifier)) return "relative specifier carries a .ts suffix, drop it";

	const path = specifier.split(/[?#]/)[0];
	if (!path.endsWith(".js")) return undefined;
	if (existsSync(resolve(dirname(file), path))) return undefined;
	return "no .js file at this path, so the .js suffix lies about a .ts sibling";
}

const failures = [];

collectTypescriptFiles(".");

// Parse every file through one synthetic project. noResolve keeps the program to exactly these files.
const configPath = resolve("tsconfig.check-ts-relative-imports.json");
const config = JSON.stringify({
	compilerOptions: { noResolve: true, noLib: true, types: [] },
	files: files.map(file => resolve(file)),
});
const api = new API({
	cwd: process.cwd(),
	fs: {
		fileExists: fileName => (resolve(fileName) === configPath ? true : undefined),
		readFile: fileName => (resolve(fileName) === configPath ? config : undefined),
	},
});

try {
	const program = (await api.updateSnapshot({ openProjects: [configPath] })).getProject(configPath).program;
	for (const file of files.sort()) {
		// Only the client entry points are remote — they hand back promises that
		// resolve to ordinary in-process nodes. Once resolved, `kind`, `text`,
		// `getStart` and `forEachChild` are all plain synchronous members.
		const sourceFile = await program.getSourceFile(resolve(file));

		function checkSpecifier(node) {
			const reason = relativeSpecifierViolation(node.text, file);
			if (reason === undefined) return;
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
			failures.push(`${PREFIX} FAIL ${relative(".", file)}:${line + 1}:${character + 1} ${reason} (${node.text})`);
		}

		function visit(node) {
			if (isImportDeclaration(node) && isStringLiteralLike(node.moduleSpecifier)) {
				checkSpecifier(node.moduleSpecifier);
			} else if (isExportDeclaration(node) && isStringLiteralLike(node.moduleSpecifier)) {
				checkSpecifier(node.moduleSpecifier);
			} else if (
				isCallExpression(node) &&
				node.expression.kind === SyntaxKind.ImportKeyword &&
				isStringLiteralLike(node.arguments[0])
			) {
				checkSpecifier(node.arguments[0]);
			} else if (isImportTypeNode(node)) {
				const specifier = getImportTypeSpecifier(node);
				if (specifier) checkSpecifier(specifier);
			}

			// `forEachChild` is TypeScript's early-exit walk: any truthy return from
			// the callback stops the iteration. `visit` returns undefined on every
			// path, so the whole subtree is walked.
			node.forEachChild(visit);
		}

		visit(sourceFile);
	}
} finally {
	// `close()` rejects when a response is still in flight, and the async client
	// keeps one pending even after the program is built. The work is done by then,
	// so a rejected teardown must not turn a clean scan into a crash.
	await api.close().catch(() => {});
}

// The scanned-file count is not decoration: without it a gate that silently
// scanned nothing still prints "0 errors" and is indistinguishable from clean.
console.error(`${PREFIX} ${failures.length} lỗi / ${files.length} tệp đã quét`);
if (failures.length > 0) {
	for (const failure of failures) console.error(failure);
	process.exit(1);
}
