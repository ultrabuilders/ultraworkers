/**
 * The determinism prelude is a contract, not hardening.
 *
 * Every later phase caches results in a journal and resumes from it. If a script can
 * observe the wall clock or a random number, a re-run produces different values than
 * the cached journal, and resume quietly stops meaning "continue what happened" — the
 * same failure shape as `#87501`'s `success: true` for a message nobody received, one
 * layer further down.
 *
 * The last three rows are the ones that make this a contract test. A prelude that
 * replaced `Date` with something that throws on every call would pass the first four
 * and break every workflow that parses a timestamp the user passed in.
 */
import { describe, expect, test } from "bun:test";
import { parseWorkflowScript } from "../../src/engine/parse";
import { runWorkflowScript } from "../../src/engine/vm";
import { WorkflowError, WorkflowErrorCode } from "../../src/errors";

const META = { name: "determinism", description: "d" };

/** Run a body the way the engine does, and report what the script observed. */
async function evaluate<T = unknown>(body: string): Promise<T> {
	return await runWorkflowScript<T>(META, body);
}

describe("workflow determinism", () => {
	test("Math.random() throws", async () => {
		await expect(evaluate(`return Math.random();`)).rejects.toThrow(
			"Math.random() is unavailable in a workflow (it breaks resume)",
		);
	});

	test("Date.now() throws", async () => {
		await expect(evaluate(`return Date.now();`)).rejects.toThrow("Date.now() is unavailable in a workflow");
	});

	test("Date() without new throws", async () => {
		await expect(evaluate(`return Date();`)).rejects.toThrow("Date() is unavailable in a workflow");
	});

	test("new Date() with no argument throws", async () => {
		// WHY no-argument only: a script needs the current instant to break resume, but
		// an explicit timestamp is a value the author chose and replaying it is exactly
		// what makes resume reproducible.
		await expect(evaluate(`return new Date();`)).rejects.toThrow("new Date() is unavailable in a workflow");
	});

	test("Date . now() written with spaces is rejected at parse time, not at run time", () => {
		// WHY the parse-time half: the blocklist exists for fast author feedback, and a
		// spaced call is the same nondeterminism wearing a disguise that the prelude
		// would still catch. Catching it earlier means the message names the rule.
		let thrown: unknown;
		try {
			parseWorkflowScript(`export const meta = { name: "n", description: "d" };\nreturn Date . now();`);
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(WorkflowError);
		expect((thrown as WorkflowError).code).toBe(WorkflowErrorCode.SCRIPT_VALIDATION_ERROR);
		expect((thrown as WorkflowError).recoverable).toBe(false);
	});

	test("Date.parse still works", async () => {
		// The negative case. A prelude that neutered Date wholesale would pass every row
		// above and break every workflow that reads a date the user supplied.
		await expect(evaluate(`return Date.parse("2026-01-01");`)).resolves.toBe(1767225600000);
	});

	test("new Date() with an explicit timestamp still works", async () => {
		await expect(evaluate(`return new Date("2026-01-01").getUTCFullYear();`)).resolves.toBe(2026);
	});

	test("Date.UTC still works", async () => {
		await expect(evaluate(`return Date.UTC(2026, 0, 1);`)).resolves.toBe(1767225600000);
	});

	test("a Date instance is still a Date", async () => {
		// WHY: the prelude substitutes a constructor, not a value. If `new Date(x)`
		// returned something that merely had the right fields, every workflow doing
		// `instanceof Date` or `date.toISOString()` would break in a way that looks like
		// a script bug rather than an engine one.
		await expect(evaluate(`return new Date("2026-01-01") instanceof Date;`)).resolves.toBe(true);
		await expect(evaluate(`return new Date("2026-01-01").toISOString();`)).resolves.toBe("2026-01-01T00:00:00.000Z");
	});
});
