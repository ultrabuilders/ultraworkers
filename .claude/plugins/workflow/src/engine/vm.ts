/**
 * The workflow vm: a script body, a realm with no host built-ins, and the determinism
 * prelude that makes resume honest.
 *
 * Copied from `pi-dynamic-workflows` (MIT, (c) 2026 Quintin Shaw):
 * `src/workflow.ts:1799-1817` (the sandbox) and `src/workflow.ts:529-546`
 * (DETERMINISM_PRELUDE, verbatim).
 *
 * DETERMINISM_PRELUDE is a CONTRACT, not hardening. Remove it and the restart key and
 * resume become lies: a re-run would produce different values than the cached journal,
 * and every guarantee built on the journal would be describing a run that cannot
 * happen. It is best-effort against ACCIDENTAL nondeterminism in trusted scripts, not a
 * security wall — a determined script can still reach a host Function through a
 * capability bridge's `.constructor`.
 */
import * as vm from "node:vm";
import { WorkflowError, WorkflowErrorCode, type WorkflowMeta } from "../errors";
import {
	DECLARED_GLOBALS,
	WORKFLOW_CAPABILITY_CONTRACT,
	type CapabilityDiagnostic,
	type WorkflowRuntimeImplementations,
} from "./contract";

const DETERMINISM_PRELUDE = [
	'"use strict";',
	'Math.random = () => { throw new Error("Math.random() is unavailable in a workflow (it breaks resume); pass randomness via args or vary by index"); };',
	"{",
	"  const RealDate = Date;",
	'  const fail = (w) => { throw new Error(w + " is unavailable in a workflow (it breaks resume); pass a timestamp via args"); };',
	"  const SafeDate = function (...a) {",
	'    if (!new.target) fail("Date()");',
	'    if (a.length === 0) fail("new Date()");',
	"    return Reflect.construct(RealDate, a, SafeDate);",
	"  };",
	"  SafeDate.UTC = RealDate.UTC;",
	"  SafeDate.parse = RealDate.parse;",
	'  SafeDate.now = () => fail("Date.now()");',
	"  SafeDate.prototype = RealDate.prototype;",
	"  globalThis.Date = SafeDate;",
	"}",
].join("\n");

/**
 * The 18 globals a Phase 1 script sees, none of them implemented yet.
 *
 * This exists because the contract refuses to assemble an incomplete set: passing `undefined`
 * (what this module used to do) now throws naming every missing global. Supplying a complete
 * set of *honest* stubs keeps the engine runnable while later phases land, and gives a script
 * that calls a capability too early a message naming the phase instead of a bare
 * `ReferenceError: agent is not defined`.
 *
 * A stub is a callable that throws. The value-shaped globals (`cwd`, `process`, `args`,
 * `budget`) get inert values rather than throwing getters, because a script reading `cwd`
 * before any agent runs is not a mistake worth failing.
 */
function notWired(name: string): () => never {
	return () => {
		throw new WorkflowError(
			`workflow global "${name}" is declared but not implemented yet; it lands with the agent-bridge phase (epic-dynamic-workflows-259n.5)`,
			WorkflowErrorCode.UNKNOWN,
		);
	};
}

function notWiredImplementations(): WorkflowRuntimeImplementations {
	// `satisfies` rather than an annotation, as the reference does at `:1798`. It checks that
	// all 18 declared globals have a value here (so adding one to the contract without a stub
	// is a TYPECHECK failure, not a run-time one) while leaving the literal's own inferred
	// type, which `assembleRuntimeBindings` accepts. An annotation would widen this to the
	// interface and stop it being assignable to the assembly parameter.
	const implementations = {
		agent: notWired("agent"),
		parallel: notWired("parallel"),
		pipeline: notWired("pipeline"),
		workflow: notWired("workflow"),
		verify: notWired("verify"),
		judgePanel: notWired("judgePanel"),
		loopUntilDry: notWired("loopUntilDry"),
		completenessCheck: notWired("completenessCheck"),
		retry: notWired("retry"),
		gate: notWired("gate"),
		checkpoint: notWired("checkpoint"),
		log: notWired("log"),
		phase: notWired("phase"),
		cwd: process.cwd(),
		process: Object.freeze({ cwd: () => process.cwd() }),
		// Present-and-undefined is what `args` is declared as: it is the one global an owner
		// may legitimately omit, and the binding table marks it `allowsUndefined`.
		args: undefined,
		budget: Object.freeze({ total: 0, spent: () => 0, remaining: () => 0 }),
		console: Object.freeze({
			log: notWired("console.log"),
			info: notWired("console.info"),
			warn: notWired("console.warn"),
			error: notWired("console.error"),
		}),
	} satisfies WorkflowRuntimeImplementations;

	// The other direction `satisfies` cannot see: a binding added to RUNTIME_BINDINGS with no
	// interface field and no stub here. Checked against the table rather than the interface, so
	// this fails loudly at the source of truth instead of as a mysteriously undefined global.
	for (const name of DECLARED_GLOBALS) {
		if (!Object.hasOwn(implementations, name)) throw new Error(`notWiredImplementations is missing "${name}"`);
	}
	return implementations;
}

/**
 * Run a workflow body and resolve with whatever it returned.
 *
 * The body is wrapped in an IIFE because scripts have no `import`: there is no module
 * resolution inside a vm realm, so a body written as a module would fail at `import`
 * rather than at the thing the author got wrong.
 *
 * `implementations` defaults to the not-yet-wired set above. Passing a real one is how an
 * owner swaps capabilities; the engine does not change.
 *
 * `onDiagnostic` exists because this module may not write to the console. It runs inside the
 * coding-agent process, so `console.*` would corrupt the TUI and any RPC framing — "lives
 * outside a package" is not a defence. Non-fatal diagnostics (an undeclared implementation
 * supplied, say) are handed to the caller's sink instead of being dropped or printed.
 */
export async function runWorkflowScript<T = unknown>(
	meta: WorkflowMeta,
	body: string,
	implementations: WorkflowRuntimeImplementations = notWiredImplementations(),
	onDiagnostic?: (diagnostic: CapabilityDiagnostic) => void,
): Promise<T> {
	const { globals, diagnostics } = WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings(implementations);
	for (const diagnostic of diagnostics) onDiagnostic?.(diagnostic);
	const context = vm.createContext({
		...globals,
		// Object/Array/JSON/Math/Date/Promise/Set/Map/etc. come from the vm realm
		// itself — we deliberately do NOT inject host built-ins, whose .constructor
		// would be the host Function (a determinism-guard bypass). Math/Date are
		// neutered in-realm by DETERMINISM_PRELUDE below.
	});

	const wrapped = `${DETERMINISM_PRELUDE}\n(async () => {\n${body}\n})()`;
	return (await new vm.Script(wrapped, { filename: `${meta.name || "workflow"}.js` }).runInContext(context)) as T;
}
