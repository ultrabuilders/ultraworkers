/**
 * Path rules: the deny/allow decision, and the glob dialect behind it.
 *
 * ## What a regression looks like to a user
 *
 * They write `pathRules.deny: ["**\/.env"]` because that is the rule that means
 * "any .env, anywhere". A `.env` at the root of the project — the file they were
 * picturing — is still readable, because the pattern was compiled by a dialect
 * that turns `**\/` into a *required* separator. Nothing throws and nothing warns;
 * the rule simply does not apply to the one case it was written for.
 *
 * That is why the decisive assertion here is not "a rule was loaded". It is
 * that `**\/.env` matches a root-level `.env`, and it is proved by running the
 * same pattern through the URL dialect this module replaces and watching it
 * answer the other way.
 */
import { describe, expect, it } from "bun:test";
import { orderedSettings } from "@oh-my-pi/pi-coding-agent/config/all-settings";
import { cfgPathRulesAllow, cfgPathRulesDeny } from "@oh-my-pi/pi-coding-agent/config/path-rules";
import { globToRegExp as urlGlobToRegExp } from "@oh-my-pi/pi-coding-agent/tools/browser/network";
import { compilePathRules, evaluatePath, pathGlobToRegExp } from "@oh-my-pi/pi-coding-agent/utils/glob";

describe("the keys reach the user", () => {
	// A setting declared in source but absent from `all-settings.ts` never
	// registers: nothing imports the module, so the key is invisible to the
	// settings panel, to `config migrate`, and to every lookup by id -- while
	// still being importable and looking completely fine in a code review. This
	// row is what makes the omission visible instead of latent.
	it("both path-rule keys appear in the ordered settings", () => {
		const ids = new Set(orderedSettings().map(setting => setting.id));
		expect(ids.has(cfgPathRulesDeny.id)).toBe(true);
		expect(ids.has(cfgPathRulesAllow.id)).toBe(true);
	});

	it("defaults to no rules, so nothing is refused until a user writes one", () => {
		// A default that denies something would refuse paths on upgrade with no
		// way to turn it back off, which is the `CONFIG_DIR_NAME` hazard.
		expect(evaluatePath(".env", compilePathRules([], []))).toBe("no-rule");
		expect(evaluatePath("/etc/passwd", compilePathRules([], []))).toBe("no-rule");
	});
});

describe("path glob dialect", () => {
	it("W4-T2: `**/.env` matches a root-level `.env`, and a nested one", () => {
		// The silent regression. Measured against the URL dialect this module
		// exists to stop being the wrong choice for a path: it compiles `**/.env`
		// to `^.*\/\.env$`, which requires a separator, so the root file is
		// permitted while the rule reads as if it were not.
		const pattern = pathGlobToRegExp("**/.env");
		expect(pattern.test(".env")).toBe(true);
		expect(pattern.test("a/b/.env")).toBe(true);
		expect(pattern.test("sub/.env")).toBe(true);
		expect(pattern.test(".env.local")).toBe(false);
		expect(pattern.test("a/.environment")).toBe(false);

		// The control that makes the assertion above mean something: the same
		// pattern under the other dialect really does disagree, so this is a
		// difference in behaviour and not a tautology.
		expect(urlGlobToRegExp("**/.env").test(".env")).toBe(false);
	});

	it("`*` stays inside one segment and `**` crosses them", () => {
		expect(pathGlobToRegExp("a/*").test("a/b")).toBe(true);
		expect(pathGlobToRegExp("a/*").test("a/b/c")).toBe(false);
		expect(pathGlobToRegExp("a/**").test("a/b/c/d")).toBe(true);
	});

	it("supports `?`, character classes, and nesting-aware `{a,b}` alternation", () => {
		expect(pathGlobToRegExp("a?c").test("abc")).toBe(true);
		expect(pathGlobToRegExp("a?c").test("a/c")).toBe(false);
		expect(pathGlobToRegExp("[abc].txt").test("b.txt")).toBe(true);
		expect(pathGlobToRegExp("[!abc].txt").test("d.txt")).toBe(true);
		expect(pathGlobToRegExp("[!abc].txt").test("a.txt")).toBe(false);
		expect(pathGlobToRegExp("*.{ts,js}").test("a.js")).toBe(true);
		expect(pathGlobToRegExp("*.{ts,js}").test("a.md")).toBe(false);
		// A comma nested one level down belongs to the inner branch, so this is
		// two alternatives and not three.
		expect(pathGlobToRegExp("{a,{b,c}}").test("c")).toBe(true);
		expect(pathGlobToRegExp("{a,{b,c}}").test("a")).toBe(true);
		// A comma inside a class is a literal comma, not a separator.
		expect(pathGlobToRegExp("{[a,b],c}").test("b")).toBe(true);
	});

	it("an unterminated `[` or `{` is a literal, not a swallowed rule", () => {
		expect(pathGlobToRegExp("a[bc").test("a[bc")).toBe(true);
		expect(pathGlobToRegExp("a{b,c").test("a{b,c")).toBe(true);
	});

	it("escapes a metacharacter written with a backslash", () => {
		expect(pathGlobToRegExp(String.raw`a\*b`)).toBeDefined();
		expect(pathGlobToRegExp(String.raw`a\*b`).test("a*b")).toBe(true);
		expect(pathGlobToRegExp(String.raw`a\*b`).test("axb")).toBe(false);
	});
});

describe("deny/allow resolution", () => {
	// W4-T1, the wave-1 gate: two rules of the same shape must be able to reach
	// two different outcomes. An implementation where every path resolves the
	// same way -- including "everything is allowed" -- passes any test that only
	// asserts a rule was loaded, which is the failure this row exists to catch.
	const rules = compilePathRules(["**/.env", "secrets/**"], ["**/*.md", "secrets/public.txt"]);

	it("W4-T1: same-shape rules reach two different results", () => {
		expect(evaluatePath(".env", rules)).toBe("denied");
		expect(evaluatePath(".env", compilePathRules([], ["**"]))).toBe("allowed");
	});

	it("denies a nested match, not only a root one", () => {
		expect(evaluatePath("a/b/.env", rules)).toBe("denied");
		expect(evaluatePath("secrets/key.pem", rules)).toBe("denied");
	});

	it("an allow cannot rescue a path a deny also matches", () => {
		// Deny wins, deliberately. The expressive-looking alternative — an
		// explicit allow beating a broad deny — lets `allow: ["**"]` silently
		// re-open everything the deny list closed.
		const contested = compilePathRules(["**/.env"], ["**"]);
		expect(evaluatePath(".env", contested)).toBe("denied");
		expect(evaluatePath("notes.md", contested)).toBe("allowed");
	});

	it("reports `no-rule` rather than inventing a verdict", () => {
		expect(evaluatePath("src/index.ts", rules)).toBe("no-rule");
	});

	it("matches a backslash path, so one rule works on Windows", () => {
		expect(evaluatePath(String.raw`a\b\.env`, rules)).toBe("denied");
	});
});
