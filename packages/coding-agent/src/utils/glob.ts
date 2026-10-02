/**
 * One glob dialect for filesystem paths.
 *
 * ## Why this exists
 *
 * The tree grew two hand-rolled `globToRegExp` functions that answer the same
 * question differently, and the difference is invisible at the call site:
 *
 * - `src/skillshare/pack.ts` — gitignore semantics, `**\/` is an *optional*
 *   prefix, so `**\/.env` matches a root-level `.env`.
 * - `src/tools/browser/network.ts` — URL semantics, `**` is "across segments",
 *   so `**\/.env` compiles to `^.*\/\.env$` and does **not** match `.env`.
 *
 * Those are different domains and this module deliberately does not merge them:
 * a URL matcher asked to treat `**` as an optional path prefix would stop
 * matching the URLs it is written for. The bug is not that there are two
 * functions, it is that **nothing said which dialect applies where**, so the
 * next person reaching for "the glob helper" picks whichever they find first
 * and gets a rule that silently does nothing.
 *
 * So: this is the path dialect, and the URL dialect stays where it is. What
 * this buys is that a *path* rule written anywhere in the tree compiles the
 * same way, and that the one behaviour a user cannot debug by reading their own
 * rule — whether `**\/.env` covers the file they are picturing — is specified
 * once, tested, and true.
 *
 * ## The semantics, stated because they are the whole point
 *
 * - `**\/` — optional prefix: matches zero or more leading segments. `**\/.env`
 *   matches `.env`, `a/.env`, and `a/b/.env`.
 * - `**` at the end — `.*`, crossing any number of segments.
 * - `*` — within one segment, never crossing `/`.
 * - `?` — exactly one non-`/` character.
 * - `[abc]`, `[a-z]`, `[!abc]` — one character from the set; `!` negates.
 * - `{a,b}` — alternation, nesting-aware, so `{a,{b,c}}` is two branches.
 * - `\x` — a literal `x`, including `\*` and `\{`.
 * - Matching is anchored: the pattern must cover the whole path.
 *
 * ## The silent regression this prevents
 *
 * A deny rule of `["**\/.env"]` built with the URL dialect compiles to
 * `^.*\/\.env$`, which requires a `/` before `.env`. A `.env` at the root of
 * the project — the overwhelmingly common case — does not match, so the rule
 * permits exactly the file the user wrote it to block. Nothing throws, nothing
 * warns, and the rule looks correct in the config. Measured on both dialects
 * before this module existed: the URL dialect answers `false` for `.env` and
 * the path dialect answers `true`.
 */
/** Why a path was refused, or that it was not. */
/**
 * Split a `{a,b}` body into its top-level branches.
 *
 * Top-level because `{a,{b,c}}` is two branches, not three, and because a comma
 * inside `[...]` is a literal comma rather than a separator. A `}` with no
 * matching `{` is not ours, so the caller can fall back to treating it literally.
 */
function splitAlternatives(body: string): string[] | undefined {
	if (!body.includes(",")) return undefined;
	const branches: string[] = [];
	let depth = 0;
	let inClass = false;
	let current = "";
	for (let index = 0; index < body.length; index++) {
		const char = body[index]!;
		if (char === "\\" && index + 1 < body.length) {
			current += char + body[index + 1];
			index++;
			continue;
		}
		if (inClass) {
			if (char === "]") inClass = false;
			current += char;
			continue;
		}
		if (char === "[") {
			inClass = true;
			current += char;
			continue;
		}
		if (char === "{") depth++;
		if (char === "}") {
			depth--;
			if (depth < 0) return undefined;
		}
		if (char === "," && depth === 0) {
			branches.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	if (depth !== 0) return undefined;
	branches.push(current);
	return branches;
}

/** Index of the `}` closing the `{` at `open`, or -1 when there is no balanced pair. */
function findAlternativesEnd(glob: string, open: number): number {
	let depth = 0;
	let inClass = false;
	for (let index = open; index < glob.length; index++) {
		const char = glob[index]!;
		if (char === "\\") {
			index++;
			continue;
		}
		if (inClass) {
			if (char === "]") inClass = false;
			continue;
		}
		if (char === "[") {
			inClass = true;
			continue;
		}
		if (char === "{") depth++;
		else if (char === "}") {
			depth--;
			if (depth === 0) return index;
		}
	}
	return -1;
}

/** Compile a filesystem-path glob into an anchored RegExp using this module's dialect. */
export function pathGlobToRegExp(glob: string): RegExp {
	let source = "";
	for (let index = 0; index < glob.length; index++) {
		const char = glob[index]!;
		if (char === "\\" && index + 1 < glob.length) {
			index++;
			source += glob[index]!.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
			continue;
		}
		if (char === "*") {
			// A double star only means "optional prefix" at the start or directly
			// after a separator. Mid-segment (`a**b`) it is two ordinary stars,
			// which the `[^/]*` below already collapses.
			if (glob[index + 1] === "*" && (index === 0 || glob[index - 1] === "/")) {
				if (glob[index + 2] === "/") {
					source += "(?:.*/)?";
					index += 2;
					continue;
				}
				if (index + 2 === glob.length) {
					source += ".*";
					index += 1;
					continue;
				}
			}
			source += "[^/]*";
			while (glob[index + 1] === "*") index++;
			continue;
		}
		if (char === "?") {
			source += "[^/]";
			continue;
		}
		if (char === "[") {
			const close = glob.indexOf("]", index + 2);
			if (close === -1) {
				// An unterminated class is a literal `[`, as every glob dialect
				// agrees. Treating it as a class would swallow the rest of the rule.
				source += "\\[";
				continue;
			}
			let body = glob.slice(index + 1, close);
			if (body.startsWith("!")) body = `^${body.slice(1)}`;
			source += `[${body}]`;
			index = close;
			continue;
		}
		if (char === "{") {
			const close = findAlternativesEnd(glob, index);
			const branches = close === -1 ? undefined : splitAlternatives(glob.slice(index + 1, close));
			if (branches) {
				const alternatives = branches.map(branch => pathGlobToRegExp(branch).source.slice(1, -1)).join("|");
				source += `(?:${alternatives})`;
				index = close;
				continue;
			}
			source += "\\{";
			continue;
		}
		source += char.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
	}
	return new RegExp(`^${source}$`);
}

export type PathRuleVerdict = "denied" | "allowed" | "no-rule";

/** The compiled form of one rule set, so a caller pays the compile once. */
export interface PathRuleSet {
	readonly deny: readonly RegExp[];
	readonly allow: readonly RegExp[];
}

/**
 * Compile a deny/allow pair once.
 *
 * Compiled up front rather than per path because a path is checked on every
 * tool call, and a rule list is read far less often than it is consulted.
 */
export function compilePathRules(deny: readonly string[], allow: readonly string[]): PathRuleSet {
	return { deny: deny.map(pathGlobToRegExp), allow: allow.map(pathGlobToRegExp) };
}

/**
 * Decide what a path is allowed to do.
 *
 * **Deny wins, and an allow cannot rescue a deny.** The opposite order is the
 * one that reads as more expressive — an explicit allow ought to beat a broad
 * deny — and it is the wrong default for a rule whose entire purpose is to stop
 * a path from being touched: a user who writes `**\/.env` and an allow list
 * containing `**` would otherwise have silently re-opened every denied file.
 * `allow` therefore only decides paths that **no** deny rule matches, which is
 * the narrow job it can do without being able to widen a denial.
 *
 * Paths are normalised to forward slashes before matching so a rule written
 * once works on Windows, where the tools hand back backslash-separated paths.
 */
export function evaluatePath(path: string, rules: PathRuleSet): PathRuleVerdict {
	const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
	if (rules.deny.some(pattern => pattern.test(normalized))) return "denied";
	if (rules.allow.some(pattern => pattern.test(normalized))) return "allowed";
	return "no-rule";
}
