/**
 * A `docs:<path>#<token>` citation is a claim about a page: "this page says the
 * token is a contract". The claim is only worth carrying if the page really
 * says it, so the token is matched on the page.
 *
 * The matching rule is the whole test. A substring search is what put fourteen
 * wrong rows in one batch — the filter asked whether a page mentioned `OMP`, the
 * page mentioned `OMP_PROFILE`, and the row claimed a contract the page never
 * states. `OMP` and `OMP_PROFILE` are two tokens, and the whole-word rule is
 * what keeps them two.
 */
import { describe, expect, it } from "bun:test";
import { pageContainsToken, parseDocsCitations, parsePorcelainPaths, splitIncoming } from "./propose-rows";

/** A page that mentions one variable, and only that one. */
const PAGE = "Set OMP_PROFILE=1 in your shell. OMP_PROFILE selects the active profile.";

describe("pageContainsToken", () => {
	// The regression. A substring match returns true here, which is precisely the
	// false positive that produced the wrong batch.
	it("does not match a token that occurs only inside a longer one", () => {
		expect(pageContainsToken(PAGE, "OMP")).toBe(false);
	});

	// The control, and the reason the test above is a finding rather than a
	// permanently-false assertion: the very same page does carry the longer token.
	it("matches the longer token on that same page", () => {
		expect(pageContainsToken(PAGE, "OMP_PROFILE")).toBe(true);
	});

	it("matches a token that stands alone", () => {
		expect(pageContainsToken("run OMP now", "OMP")).toBe(true);
	});

	it("does not match across a hyphen, which is part of a token here", () => {
		expect(pageContainsToken("the omp-kata runner", "omp")).toBe(false);
		expect(pageContainsToken("the omp-kata runner", "omp-kata")).toBe(true);
	});

	it("treats a dot as a boundary, because a path separates tokens", () => {
		// `.` is a path and extension separator, so the extension in `loader.ts` is a
		// token of its own rather than the tail of a longer identifier. The rule that
		// matters here is "not part of a LONGER TOKEN", and an extension is not.
		expect(pageContainsToken("src/tsx/loader.ts", "ts")).toBe(true);
	});

	// A token carrying regex metacharacters must be matched literally, or a
	// citation of `a.b` would quietly become a wildcard and pass on `axb`.
	it("treats regex metacharacters in the token literally", () => {
		expect(pageContainsToken("version a.b here", "a.b")).toBe(true);
		expect(pageContainsToken("version axb here", "a.b")).toBe(false);
	});
});

describe("parseDocsCitations", () => {
	it("extracts the path and the token separately", () => {
		expect(parseDocsCitations("documented at docs:docs/reference/env.md#OMP_PROFILE")).toEqual([
			{ path: "docs/reference/env.md", token: "OMP_PROFILE" },
		]);
	});

	it("extracts every citation in a reason that carries several", () => {
		const found = parseDocsCitations("see docs:docs/a.md#ALPHA and docs:docs/b.md#BETA");
		expect(found).toEqual([
			{ path: "docs/a.md", token: "ALPHA" },
			{ path: "docs/b.md", token: "BETA" },
		]);
	});

	// The shape of most reasons in the table. A reason that cites nothing must
	// produce nothing, or every uncited row would be judged against the empty
	// citation list and the check would be theatre.
	it("returns nothing for a reason that cites no page", () => {
		expect(parseDocsCitations("the scheme is first-party and the router dispatches on it")).toEqual([]);
	});

	// A bare path with no token proves nothing: every file in the repo has a
	// path. Requiring the token is what makes the citation checkable.
	it("ignores a docs path that names no token", () => {
		expect(parseDocsCitations("documented at docs/reference/env.md")).toEqual([]);
	});

	// The regression a peer hit on the first real batch. `(\S+)` runs to the next
	// whitespace, so a citation closing a sentence arrived carrying the full stop,
	// and the whole-word check then rejected a page that does carry the token.
	// Left alone it teaches authors to move citations into the middle of sentences
	// to dodge the check, which is prose shaped around its own guard.
	it("drops the sentence punctuation from a citation that ends one", () => {
		expect(
			parseDocsCitations("set it in .env: docs:docs/mcp-config.md#OMP_MCP_TIMEOUT_MS. The name also lives there."),
		).toEqual([{ path: "docs/mcp-config.md", token: "OMP_MCP_TIMEOUT_MS" }]);
	});

	it("drops closing brackets too, and keeps the token whole", () => {
		expect(parseDocsCitations("see (docs:docs/a.md#ALPHA), then docs:docs/b.md#BETA")).toEqual([
			{ path: "docs/a.md", token: "ALPHA" },
			{ path: "docs/b.md", token: "BETA" },
		]);
	});

	// The control, and the reason trimming after the capture is specified the way
	// it is: the trimmed token really does match the page the cited one did not.
	// A lazy group would instead shorten this to `OMP` and fail here.
	it("still matches the real token after the sentence punctuation is dropped", async () => {
		const [{ path, token }] = parseDocsCitations("see docs:docs/mcp-config.md#OMP_MCP_TIMEOUT_MS.");
		const page = await Bun.file(path).text();
		expect(pageContainsToken(page, token)).toBe(true);
	});
});

describe("splitIncoming", () => {
	// The regression. A `rename` row's last cell is an EMPTY `keep_refs`, so the
	// line correctly ends in a tab. Trimming the input — which this function
	// replaced — stripped that tab off the FINAL row, and the batch was rejected
	// for arriving with 5 cells instead of 6. `awk -F'\t' '{print NF}'` said 6 on
	// the very same file, so the author had no way to see the problem: the bytes
	// on disk were right and the tool disagreed with them.
	const renameRow = "src\tpackages/tui/src/debug-server.ts\t1\trename\tcurrent behaviour\t";

	it("keeps the trailing tab that carries an empty final cell", () => {
		expect(splitIncoming(renameRow)).toEqual([renameRow]);
	});

	// The control: the last row must not be the only case that works.
	it("keeps every row's cell count, first and last alike", () => {
		const rows = [renameRow, "src\tpackages/a\t1\tkeep-path\treason\tW11:project-root-.omp"];
		const split = splitIncoming(rows.join("\n"));
		expect(split.map(line => line.split("\t").length)).toEqual([6, 6]);
	});

	// What the trim was actually for, and the reason dropping blank lines is
	// necessary rather than merely tidy: a trailing newline is the normal shape of
	// a batch written by hand or by a heredoc.
	it("drops blank lines and whitespace-only lines", () => {
		expect(splitIncoming(`${renameRow}\n\n   \n\n`)).toEqual([renameRow]);
	});

	it("returns nothing for empty or whitespace-only input", () => {
		expect(splitIncoming("")).toEqual([]);
		expect(splitIncoming("\n\n \n")).toEqual([]);
	});
});

describe("parsePorcelainPaths", () => {
	// The failure this guards: slice the wrong span and every path comes back
	// wrong, so "no file is dirty" is reported as a result when it is really a
	// broken matcher. A guard that cannot fail is not a guard.
	it("reads the path out of a modified entry", () => {
		expect([...parsePorcelainPaths(" M packages/a/src/b.ts")]).toEqual(["packages/a/src/b.ts"]);
	});

	// The control on the same input shape: the two status columns must not be
	// mistaken for part of the path.
	it("reads the same path whether the entry is staged, unstaged, or both", () => {
		const expected = ["packages/a/src/b.ts"];
		expect([...parsePorcelainPaths("M  packages/a/src/b.ts")]).toEqual(expected);
		expect([...parsePorcelainPaths("MM packages/a/src/b.ts")]).toEqual(expected);
		expect([...parsePorcelainPaths("?? packages/a/src/b.ts")]).toEqual(expected);
	});

	// A rename's old path no longer exists in the working tree, so the new one is
	// the path a row could actually be written about.
	it("takes the destination of a rename, not its source", () => {
		expect([...parsePorcelainPaths("R  old/name.ts -> new/name.ts")]).toEqual(["new/name.ts"]);
	});

	// An untracked directory is reported with a trailing slash; the row names the
	// files inside it, so keeping the slash would make every one of them look clean.
	it("strips the trailing slash git puts on an untracked directory", () => {
		expect([...parsePorcelainPaths("?? packages/new/")]).toEqual(["packages/new"]);
	});

	it("returns nothing for a clean tree, and skips blank lines", () => {
		expect([...parsePorcelainPaths("")]).toEqual([]);
		expect([...parsePorcelainPaths("\n\n")]).toEqual([]);
	});
});
