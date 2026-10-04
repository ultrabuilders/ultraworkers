/**
 * The bridge decides what `agent()` hands back, and one wrong answer here is reported as success.
 *
 * The failure this file exists to prevent is the #87501 shape one layer down: a message saying
 * `success: true` for something that never arrived. Every row below is a way that inversion can
 * happen, and each asserts the value the SCRIPT sees rather than an internal flag.
 */
import { describe, expect, test } from "bun:test";
import { type SubagentResultLike, createStructuredSubagentRunner, readAgentOutcome } from "../../src/agent-runner";

const schema = { type: "object" };

function subagent(over: Partial<SubagentResultLike> = {}): SubagentResultLike {
	return { output: "text", exitCode: 0, ...over };
}

/** A runner whose invoker returns `result`, or throws when `throws` is set. */
function runnerReturning(result: SubagentResultLike | Error) {
	// Records whether the REQUEST carried the key, not whether our record object does — a
	// recorder that always writes `outputSchema` makes `"outputSchema" in call` true forever
	// and the absence assertion passes for the wrong reason.
	const calls: { hasOutputSchema: boolean; outputSchema?: unknown; maxRuntimeMs: number }[] = [];
	return {
		calls,
		runner: createStructuredSubagentRunner({
			invoke: async request => {
				calls.push({
					hasOutputSchema: "outputSchema" in request,
					outputSchema: request.outputSchema,
					maxRuntimeMs: request.maxRuntimeMs,
				});
				if (result instanceof Error) throw result;
				return { result };
			},
		}),
	};
}

describe("agent bridge", () => {
	test("a schema result is trusted ONLY when status is valid", async () => {
		// WHY the whole file hinges on this: strict mode KEEPS the parsed-but-invalid payload for
		// diagnostics, so `data` is present on an `invalid` result. Reading `data` directly turns
		// a schema violation into a success — and the workflow then builds its answer on a
		// payload the host explicitly rejected.
		const { runner } = runnerReturning(
			subagent({
				structuredOutput: { status: "invalid", data: { verdict: "wrong" }, error: "expected string" },
			}),
		);

		expect(await runner.run("p", { schema })).toBeNull();
	});

	test("a valid schema result returns data, and unavailable returns null", async () => {
		// WHY unavailable is grouped with invalid rather than treated as "no schema": the host was
		// ASKED for structured output and could not produce it. Returning the raw text there
		// would hand the script a string where it destructures an object.
		const valid = runnerReturning(subagent({ structuredOutput: { status: "valid", data: { verdict: "ok" } } }));
		expect(await valid.runner.run("p", { schema })).toEqual({ verdict: "ok" });

		const unavailable = runnerReturning(
			subagent({ output: "prose", structuredOutput: { status: "unavailable", data: { v: 1 } } }),
		);
		expect(await unavailable.runner.run("p", { schema })).toBeNull();
	});

	test("with no schema, a failed child returns null however much text it wrote", async () => {
		// WHY exitCode and not the absence of structuredOutput: a child can crash AFTER printing.
		// Its text is the last thing it managed to emit, and serving it as an answer is the
		// partial-output-as-success inversion in its plainest form.
		const { runner } = runnerReturning(subagent({ output: "I got partway through—", exitCode: 1 }));

		expect(await runner.run("p")).toBeNull();
	});

	test("with no schema, the assistant text IS the result", async () => {
		// The positive half of the branch above, without which the failure row could pass against
		// a bridge that returns null for everything.
		const { runner } = runnerReturning(subagent({ output: "the answer" }));

		expect(await runner.run("p")).toBe("the answer");
	});

	test("an invoker that throws becomes null, never a rejected promise", async () => {
		// WHY this is asserted at the runner and not only at readAgentOutcome: the "never throws"
		// promise has exactly ONE place it can break — the try around the invoker. A throw here
		// would cross into the script and abort the whole run, losing every completed step, over
		// one agent failing. §3.1 makes null the contract precisely so the script can branch.
		const { runner } = runnerReturning(new Error("lease denied"));

		expect(await runner.run("p")).toBeNull();
	});

	test("an explicit schema is forwarded by PRESENCE, and a missing one is not sent", async () => {
		// WHY presence and not truthiness: the host documents `outputSchema` as "presence, rather
		// than truthiness, makes this the highest-priority schema". A runner that filtered on
		// truthiness would drop a schema the host must see, and the child would answer in prose
		// where the script destructures an object.
		const withSchema = runnerReturning(subagent({ structuredOutput: { status: "valid", data: { a: 1 } } }));
		await withSchema.runner.run("p", { schema });
		expect(withSchema.calls[0].hasOutputSchema).toBe(true);
		expect(withSchema.calls[0].outputSchema).toBe(schema);

		const without = runnerReturning(subagent());
		await without.runner.run("p");
		// Absent, not `undefined`-valued-and-present: the key must not appear at all.
		expect(without.calls[0].hasOutputSchema).toBe(false);
	});

	test("timeoutMs is forwarded, and absent means 0 rather than undefined", async () => {
		// WHY 0 is the documented "no timeout" sentinel: passing `undefined` would leave the host
		// to pick its own default, which is not the same promise the script was given.
		const { runner, calls } = runnerReturning(subagent());
		await runner.run("p", { timeoutMs: 5000 });
		await runner.run("p");

		expect(calls.map(c => c.maxRuntimeMs)).toEqual([5000, 0]);
	});

	test("readAgentOutcome is total: it never throws on a malformed result", () => {
		// WHY this row: it is the function every path funnels through, and the "never throws"
		// promise is only worth anything if the DECISION holds for shapes nobody designed — a
		// structuredOutput with no status, a result with neither field. Returning null for all of
		// them is the safe answer; throwing would be the contract breaking at the last moment.
		for (const malformed of [
			subagent({ structuredOutput: undefined }),
			subagent({ structuredOutput: { status: "" } as never }),
			subagent({ output: "", exitCode: 0 }),
			subagent({ exitCode: -1, output: "" }),
		]) {
			expect(() => readAgentOutcome(malformed, schema)).not.toThrow();
			expect(readAgentOutcome(malformed, schema)).toBeNull();
		}
	});
});
