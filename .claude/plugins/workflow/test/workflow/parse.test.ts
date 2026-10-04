/**
 * The one shape that runs.
 *
 * A workflow script is only a workflow if it exports a literal `meta` as its first
 * statement. Everything a user can get wrong at the top of a script — a different
 * export name, `let` instead of `const`, a computed key, a spread — has to be a
 * rejection with a message that names the fix, because the alternative is a script
 * that loads and then behaves as something the author did not write.
 *
 * The last row is the permissive half and is not optional. `validateMeta` rejects
 * unknown keys in most config surfaces; here it must not, or every future meta field
 * becomes a breaking change to the parser.
 */
import { describe, expect, test } from "bun:test";
import { parseWorkflowScript } from "../../src/engine/parse";
import { WorkflowError, WorkflowErrorCode } from "../../src/errors";

/** Assert the failure a user actually sees: our error class and its stable code. */
function expectScriptError(run: () => unknown, messageFragment: string): void {
	let thrown: unknown;
	try {
		run();
	} catch (err) {
		thrown = err;
	}
	expect(thrown).toBeInstanceOf(WorkflowError);
	expect((thrown as WorkflowError).code).toBe(WorkflowErrorCode.SCRIPT_VALIDATION_ERROR);
	expect((thrown as WorkflowError).recoverable).toBe(false);
	expect((thrown as WorkflowError).message).toContain(messageFragment);
}

describe("parseWorkflowScript", () => {
	test("a meta export that is not the first statement is rejected", () => {
		// WHY: the body is produced by slicing the export out of the source. If the
		// export were second, everything before it would silently become executable
		// body — the author's imports or setup would run as workflow code.
		expectScriptError(
			() => parseWorkflowScript(`const before = 1;\nexport const meta = { name: "n", description: "d" };`),
			"must be the first statement",
		);
	});

	test("`export let meta` is rejected", () => {
		// WHY: the meta literal is stripped from the body, not executed. A `let` binding
		// would have to be re-bound by code the author wrote after it, which is exactly
		// the indirection a literal header exists to remove.
		expectScriptError(
			() => parseWorkflowScript(`export let meta = { name: "n", description: "d" };`),
			"export const meta",
		);
	});

	test("`export var meta` is rejected", () => {
		expectScriptError(
			() => parseWorkflowScript(`export var meta = { name: "n", description: "d" };`),
			"export const meta",
		);
	});

	test("an export named anything but `meta` is rejected", () => {
		expectScriptError(
			() => parseWorkflowScript(`export const metadata = { name: "n", description: "d" };`),
			"must declare `meta`",
		);
	});

	test("two declarators in one export are rejected", () => {
		// WHY: the header is sliced by node range, so a second declarator would be
		// dropped along with the meta and never run.
		expectScriptError(
			() => parseWorkflowScript(`export const meta = { name: "n", description: "d" }, other = 1;`),
			"only `meta`",
		);
	});

	test("a `__proto__` key in the meta literal is rejected", () => {
		// WHY: prototype pollution. `JSON`-style meta is read by later phases and spread
		// into plain objects; a `__proto__` key would rewrite their prototype rather than
		// adding a field, and nothing downstream would report it.
		expect(() =>
			parseWorkflowScript(`export const meta = { name: "n", description: "d", __proto__: { polluted: true } };`),
		).toThrow("reserved key name not allowed in meta: __proto__");
	});

	test("a computed key is rejected", () => {
		expect(() => parseWorkflowScript(`export const meta = { name: "n", ["description"]: "d" };`)).toThrow(
			"computed keys not allowed",
		);
	});

	test("a spread is rejected", () => {
		expect(() => parseWorkflowScript(`export const meta = { name: "n", ...{ description: "d" } };`)).toThrow(
			"spread not allowed",
		);
	});

	test("an interpolated template is rejected", () => {
		// WHY: meta must be statically known so the navigator can list a workflow before
		// running it. An interpolated value is only knowable at run time.
		// Concatenation avoids the noTemplateCurlyInString lint rule on a literal `${`.
		const interpolation = "$" + "{1}";
		const script = "export const meta = { name: `n" + interpolation + '`, description: "d" };';
		expect(() => parseWorkflowScript(script)).toThrow("template interpolation not allowed");
	});

	test("a phase without a title is rejected", () => {
		expect(() => parseWorkflowScript(`export const meta = { name: "n", description: "d", phases: [{}] };`)).toThrow(
			"each meta phase must have a title string",
		);
	});

	test("an unknown extra key is accepted", () => {
		// WHY THIS ROW — the permissive half. If meta rejected unknown keys, adding any
		// field later would break every script that used it, and this parser would have
		// to change in lockstep with the feature. A workflow author adding a `comment`
		// is not making an error.
		const parsed = parseWorkflowScript(`export const meta = { name: "n", description: "d", comment: "hi" };`);

		expect(parsed.meta.name).toBe("n");
		expect((parsed.meta as { comment?: string }).comment).toBe("hi");
	});

	test("the body is the script with the export removed and the top-level return kept", () => {
		// WHY: the whole engine depends on this. A workflow body IS a top-level
		// `return`, so a parser that rejects one ships an engine that cannot run a
		// workflow at all — and reports it as a syntax error, which names nothing the
		// author can act on.
		const parsed = parseWorkflowScript(
			`export const meta = { name: "demo", description: "d" };\nconst total = 1 + 1;\nreturn { total };`,
		);

		expect(parsed.body).not.toContain("export const meta");
		expect(parsed.body).toContain("return { total };");
	});
});
