/**
 * The capability contract is what makes the engine replaceable, and the only way to know a
 * contract binds is to check that it REFUSES to bind when the sides disagree.
 *
 * A test that assembles a matching set and reads the globals back proves nothing a plain
 * object spread would not: it would pass against an engine that ignores the contract entirely.
 * So every row here supplies a set that disagrees with the declared table and asserts on which
 * diagnostic comes back and what it names.
 *
 * The `console.warn`-shaped failure this file exists to prevent: an engine that assembles
 * globals without consulting the table will happily run a workflow missing `agent`, and the
 * script fails later with `agent is not defined` — pointing at the author's code rather than
 * at the wiring that was incomplete.
 */
import { describe, expect, test } from "bun:test";
import {
	DECLARED_GLOBALS,
	DiagnosticSeverity,
	RUNTIME_BINDINGS,
	WORKFLOW_CAPABILITY_CONTRACT,
	defineWorkflowCapabilityContract,
} from "../../src/engine/contract";
import { runWorkflowScript } from "../../src/engine/vm";
import { WorkflowCapabilityContractError } from "../../src/errors";

/** A supplied set that satisfies every declared global. */
function completeImplementations(): Record<string, unknown> {
	return Object.fromEntries(RUNTIME_BINDINGS.map(binding => [binding.implementation, () => binding.global]));
}

/** A supplied set missing exactly the named globals. */
function without(...omitted: string[]): Record<string, unknown> {
	const complete = completeImplementations();
	for (const name of omitted) delete complete[name];
	return complete;
}

describe("workflow capability contract", () => {
	test("declares the globals a workflow script may reference", () => {
		// WHY this is a contract and not a comment: the count is what a drift diagnostic
		// compares against. An engine and a script that disagree about how many globals exist
		// is exactly the failure diagnoseAlignment exists to name, so the number is asserted
		// rather than described.
		expect(DECLARED_GLOBALS).toHaveLength(18);
		expect(DECLARED_GLOBALS).toContain("agent");
		expect(DECLARED_GLOBALS).toContain("args");
		expect(new Set(DECLARED_GLOBALS).size).toBe(DECLARED_GLOBALS.length);
	});

	test("assembles each implementation under its declared global name", () => {
		const { globals, diagnostics } = WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings(completeImplementations());
		expect(diagnostics).toEqual([]);
		expect(Object.keys(globals).sort()).toEqual([...DECLARED_GLOBALS].sort());
	});

	test("refuses to assemble and names every missing global", () => {
		// The plan's own scenario: the table declares N globals, the owner supplies fewer, and
		// the failure has to say WHICH ones — a bare "invalid implementations" would send the
		// reader hunting through 18 names to find the one they forgot.
		let thrown: unknown;
		try {
			WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings(without("agent", "judgePanel"));
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(WorkflowCapabilityContractError);
		const { diagnostics } = thrown as WorkflowCapabilityContractError;
		expect(diagnostics.map(diagnostic => diagnostic.subject).sort()).toEqual(["agent", "judgePanel"]);
		expect((thrown as WorkflowCapabilityContractError).message).toContain("agent");
		expect((thrown as WorkflowCapabilityContractError).message).toContain("judgePanel");
	});

	test("args is the one global whose value may be undefined", () => {
		// `allowsUndefined` exempts a VALUE, not a KEY. Reading it as "may be omitted" is the
		// natural mistake and it is wrong: the reference's predicate is
		// `!hasOwn(impl) || (supplied[impl] === undefined && !allowsUndefined)`, so a missing
		// key is missing for every global including `args`. A workflow run with no arguments
		// still has to pass `args: undefined` — and this pins that, because relaxing it either
		// way changes which failures are named.
		const { globals } = WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings({
			...completeImplementations(),
			args: undefined,
		});
		expect(globals).toHaveProperty("args");
		expect(globals.args).toBeUndefined();
	});

	test("omitting the args key entirely is still a missing implementation", () => {
		// The row that catches the misreading above. If key-absence were exempted the way
		// value-undefined is, this would assemble; against the reference it must not, and the
		// reason is that `hasOwn` is the first clause of the predicate, so it short-circuits
		// before `allowsUndefined` is ever consulted.
		let thrown: unknown;
		try {
			WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings(without("args"));
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(WorkflowCapabilityContractError);
		expect((thrown as WorkflowCapabilityContractError).diagnostics.map(d => d.subject)).toEqual(["args"]);
	});

	test("an explicitly-undefined required global is still missing", () => {
		// The mirror of the row above, from the other direction: the key IS present, holding
		// undefined. `Object.hasOwn` alone would pass this, which is why the reference's
		// predicate has a second clause. A global bound to undefined is indistinguishable to
		// a script from a missing one, and the ReferenceError that produces is the confusing
		// failure this row converts into a named diagnostic.
		let thrown: unknown;
		try {
			WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings({ ...completeImplementations(), agent: undefined });
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(WorkflowCapabilityContractError);
		expect((thrown as WorkflowCapabilityContractError).diagnostics.map(d => d.subject)).toEqual(["agent"]);
	});

	test("an undeclared implementation is reported and ignored, not assembled", () => {
		// Warning, not error: supplying an extra capability is a legitimate move when an owner
		// is mid-migration. The contract must say so AND leave it out of the globals, or the
		// script sees a global the contract never promised to validate.
		const { globals, diagnostics } = WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings({
			...completeImplementations(),
			experimentalThing: () => 1,
		});
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].code).toBe("UNDECLARED_RUNTIME_IMPLEMENTATION");
		expect(diagnostics[0].severity).toBe(DiagnosticSeverity.WARNING);
		expect(diagnostics[0].subject).toBe("experimentalThing");
		expect(globals).not.toHaveProperty("experimentalThing");
	});

	test("a declared global missing from the assembled context is named", () => {
		// The other direction: the engine assembled a context and the script did not see
		// something the table promised. This is the check the plan proposes using as the
		// contract test — "the script declares 19, the engine injects 18" — and it reads
		// observed names rather than trusting the assembler that just produced them.
		const diagnostics = WORKFLOW_CAPABILITY_CONTRACT.diagnoseAlignment({
			observedProjectGlobals: DECLARED_GLOBALS.filter(name => name !== "budget"),
		});
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].code).toBe("DECLARED_GLOBAL_UNOBSERVED");
		expect(diagnostics[0].severity).toBe(DiagnosticSeverity.ERROR);
		expect(diagnostics[0].subject).toBe("budget");
	});

	test("an observed global the table never declared is named", () => {
		const diagnostics = WORKFLOW_CAPABILITY_CONTRACT.diagnoseAlignment({
			observedProjectGlobals: [...DECLARED_GLOBALS, "sneakyGlobal"],
		});
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].code).toBe("OBSERVED_GLOBAL_UNDECLARED");
		expect(diagnostics[0].subject).toBe("sneakyGlobal");
	});

	test("the installed binding table cannot be mutated by a caller", () => {
		// deepFreeze runs once at install. Without it, a caller could delete a binding after
		// the contract was built, and every later assembly would quietly stop providing that
		// global — a failure that would look like an author bug in the script.
		expect(Object.isFrozen(RUNTIME_BINDINGS)).toBe(true);
		expect(Object.isFrozen(RUNTIME_BINDINGS[0])).toBe(true);
	});

	test("a second contract can be defined over its own table", () => {
		// The three-tier customisation claim only holds if the contract is data, not a
		// hardcoded engine. A narrower table that assembles and refuses independently is the
		// observable difference between "exported API" and "an exported constant".
		const narrow = defineWorkflowCapabilityContract([
			{ global: "log", implementation: "log" },
			{ global: "args", implementation: "args", allowsUndefined: true },
		]);
		expect(Object.keys(narrow.assembleRuntimeBindings({ log: () => 1, args: undefined }).globals).sort()).toEqual([
			"args",
			"log",
		]);
		let thrown: unknown;
		try {
			narrow.assembleRuntimeBindings({ args: 1 });
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(WorkflowCapabilityContractError);
		expect((thrown as WorkflowCapabilityContractError).diagnostics.map(d => d.subject)).toEqual(["log"]);
	});
});

describe("workflow vm capability wiring", () => {
	test("a script sees an owner-supplied capability", () => {
		// The end-to-end half: the point of the contract is that swapping `agent` reaches the
		// script. If assembly were dropped on the way to the vm context, every contract row
		// above would still pass while the engine stayed unreplaceable.
		return runWorkflowScript({ name: "wiring", description: "d" }, `return agent("hello");`, {
			...completeImplementations(),
			agent: (prompt: string) => `ran:${prompt}`,
		} as never).then(result => {
			expect(result).toBe("ran:hello");
		});
	});

	test("an unsupplied capability fails naming the wiring gap, not a ReferenceError", () => {
		// A script calling `parallel` before the agent-bridge phase must be told the capability
		// is unwired. A bare `parallel is not defined` reads as an author typo and sends the
		// reader looking in the wrong file entirely.
		return expect(runWorkflowScript({ name: "wiring", description: "d" }, `return parallel();`)).rejects.toThrow(
			/not implemented yet/,
		);
	});

	test("a non-fatal diagnostic reaches the caller's sink", () => {
		// `onDiagnostic` exists because this module may not use console.*. If diagnostics were
		// dropped instead of handed over, an undeclared implementation would disappear silently
		// — the same silent-drop shape the review loop keeps catching.
		const seen: string[] = [];
		return runWorkflowScript(
			{ name: "wiring", description: "d" },
			`return 1;`,
			{ ...completeImplementations(), experimentalThing: () => 1 } as never,
			diagnostic => seen.push(diagnostic.subject),
		).then(() => {
			expect(seen).toEqual(["experimentalThing"]);
		});
	});
});
