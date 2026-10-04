import { expect, test } from "bun:test";
import {
  DETERMINISM_BLOCKLIST,
  WorkflowError,
  WorkflowErrorCode,
  parseWorkflowScript,
} from "../parseWorkflowScript.js";

/**
 * One row per check in epic-dynamic-workflows-259n.3's table. Each asserts the rejection a
 * user would hit, so a regression names the rule that stopped holding rather than just
 * "threw".
 */

const META = `export const meta = { name: "audit", description: "d" }`;

function expectRejection(script: string, message: RegExp): WorkflowError {
  let thrown: unknown;
  try {
    parseWorkflowScript(script);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(WorkflowError);
  const error = thrown as WorkflowError;
  expect(error.message).toMatch(message);
  // The bead's table names this pair as the contract for every rejection, not just the message.
  expect(error.code).toBe(WorkflowErrorCode.SCRIPT_VALIDATION_ERROR);
  expect(error.recoverable).toBe(false);
  return error;
}

test("row 1 — a script naming a blocked global is refused before it is ever parsed", () => {
  // If the blocklist stopped running, this would parse and fail later (or not at all), and the
  // author would get a runtime failure instead of a load-time one naming the rule.
  expectRejection(`${META}\nreturn Math.random()`, /must be deterministic/);
});

test("row 1 — the blocklist sees through spacing, so `Date . now` cannot slip past", () => {
  // The regex allows whitespace around the dot. A tightened regex would accept this spelling
  // and the author would only discover it when a resume produced a different value.
  expect(DETERMINISM_BLOCKLIST.test(`${META}\nreturn Date . now()`)).toBe(true);
  expect(DETERMINISM_BLOCKLIST.test(`${META}\nreturn new Date ()`)).toBe(true);
});

test("row 3 — meta must be the FIRST statement, not merely present", () => {
  // A script that exports meta second would otherwise run its earlier lines before validation.
  expectRejection(`const x = 1\n${META}`, /must be the first statement/);
});

test("row 4 — `export let meta` is refused; only `const` is accepted", () => {
  // `let` would let the author rebind meta after validation, so the value the engine validated
  // would not be the one the run uses.
  expectRejection(`export let meta = { name: "a", description: "d" }`, /must be `export const meta/);
});

test("row 5 — a second declarator in the same export is refused", () => {
  // The engine reads exactly one declarator. A second binding would be silently ignored, so the
  // author would believe it took effect.
  expectRejection(`export const meta = { name: "a", description: "d" }, other = 1`, /only `meta`/);
});

test("row 6 — a differently-named export is refused even when it is a valid meta literal", () => {
  // Guards against matching "the first export" instead of "the export named meta".
  expectRejection(`export const config = { name: "a", description: "d" }`, /declare `meta`/);
});

test("row 7 — a const meta with no initializer is refused, but by the PARSER, not by row 7", () => {
  // Upstream's `!declarator.init` check cannot fire: `const x;` is a JavaScript syntax error,
  // so acorn rejects it before the AST walk reaches it, and the only declarations that CAN
  // lack an initializer (`let`/`var`) are already refused by row 4. Measured across every
  // spelling — `export const meta;`, `export const meta = ;`, `export const meta = 1, ;` all
  // raise SyntaxError from `parse`; `export let meta;` and `export var meta;` raise row 4.
  //
  // Asserted as-is so the difference is visible: the user-visible contract ("a meta with no
  // value is refused") holds either way, but it is the parser enforcing it. A future acorn
  // that tolerated the syntax would make row 7 live again, and this row would start failing
  // with the parser's message instead of the workflow's — which is the signal worth having.
  expect(() => parseWorkflowScript(`export const meta;`)).toThrow(SyntaxError);
});

test("row 8 — a computed meta value is refused rather than evaluated", () => {
  // The literal evaluator is the boundary that keeps meta data-only. If it accepted a call,
  // meta could carry behaviour, and `evaluateLiteral`'s node switch would have to grow an arm.
  expect(() => parseWorkflowScript(`export const meta = { name: f() }`)).toThrow(/non-literal node type/);
});

test("row 8 — spread, computed keys, methods and __proto__ are each refused in meta", () => {
  // Four distinct ways to smuggle behaviour or a prototype mutation past a naive object copy.
  // Grouped because they are one rule with four spellings, and a copy that allowed any one of
  // them would still pass the other three assertions here.
  expect(() => parseWorkflowScript(`export const meta = { ...base }`)).toThrow(/spread not allowed/);
  expect(() => parseWorkflowScript(`export const meta = { [k]: 1 }`)).toThrow(/computed keys/);
  expect(() => parseWorkflowScript(`export const meta = { run() {} }`)).toThrow(/methods\/accessors/);
  expect(() => parseWorkflowScript(`export const meta = { __proto__: {} }`)).toThrow(/reserved key name/);
});

test("a valid script yields its meta and a body with the export stripped", () => {
  // The body is what the vm runs. If the strip regressed, the prelude would be handed a script
  // whose `export` is a syntax error at run time rather than a load-time failure.
  const { meta, body } = parseWorkflowScript(`${META}\nreturn 1\n`);
  expect(meta.name).toBe("audit");
  expect(meta.description).toBe("d");
  expect(body).not.toContain("export const meta");
  expect(body).toContain("return 1");
});

test("validateMeta rejects a meta that parses but has no usable name or description", () => {
  // Distinct from the AST rules: these scripts are structurally perfect and still unusable.
  expect(() => parseWorkflowScript(`export const meta = { name: "", description: "d" }`)).toThrow(
    /meta\.name must be a non-empty string/,
  );
  expect(() => parseWorkflowScript(`export const meta = { name: "a", description: "  " }`)).toThrow(
    /meta\.description must be a non-empty string/,
  );
});

test("negative number literals and template strings are accepted, so the evaluator is not merely rejecting", () => {
  // Without this, an evaluator that refused everything would pass every rejection row above.
  // This is the pair that makes those rows meaningful.
  const { meta } = parseWorkflowScript(
    `export const meta = { name: \`a\`, description: "d", phases: [{ title: "p" }] }`,
  );
  expect(meta.name).toBe("a");
  expect(meta.phases?.[0]?.title).toBe("p");

  // The negative-literal arm of `evaluateLiteral`, reached through `detail`.
  //
  // `detail` is declared `string?` on WorkflowMetaPhase, but `validateMeta` checks only
  // `name`, `description`, `model`, and each phase's `title`. So a script can put a number
  // there and get it back with no error — the runtime and the declared type disagree, and
  // the cast below is that disagreement made explicit rather than hidden. Reported upstream:
  // any consumer reading `detail` as a string is reading a value the validator never checked.
  //
  // It is not reachable through `model`, which IS validated as a string: `model: -1` is
  // refused. That refusal is the code being right about a bad fixture.
  const neg = parseWorkflowScript(
    `export const meta = { name: "a", description: "d", phases: [{ title: "p", detail: -1 }] }`,
  );
  expect(neg.meta.phases?.[0]?.detail as unknown).toBe(-1);
});
