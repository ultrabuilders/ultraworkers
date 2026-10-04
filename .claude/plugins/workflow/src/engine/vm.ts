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
 * happen.
 *
 * The prelude only defends a script that CALLS `Math.random`/`Date.now`. It never defended
 * one that walks to the original through a host value's `.constructor`, because every value
 * this module injects is a HOST value and a host function's `.constructor` is the HOST
 * `Function`. `REALM_GLOBALS_SOURCE` below is what closed that: injected globals are now
 * realm-local stand-ins, so `.constructor` lands on a realm intrinsic and the route stops
 * at the realm. It remains best-effort against ACCIDENTAL nondeterminism in trusted
 * scripts rather than a security wall against a determined one.
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
 * Builds realm-local stand-ins for every injected global.
 *
 * WHY THIS EXISTS. `assembleRuntimeBindings` copies the owner's implementations into the
 * context verbatim, and every one of them is a HOST value. A host function's `.constructor`
 * is the HOST `Function`, and a host object's `.constructor.constructor` is too — so a script
 * holding ANY global could walk back out of the realm and defeat everything
 * DETERMINISM_PRELUDE does:
 *
 *     agent.constructor("return Math.random()")()
 *
 * That route never touches the prelude, so the real `Math.random` runs, a re-run diverges
 * from the journal, and every guarantee built on the journal describes a run that cannot
 * happen. `parse.ts`'s DETERMINISM_BLOCKLIST cannot catch it — it matches source text, and
 * this path is built at runtime.
 *
 * It is not only owner-supplied capabilities. The default globals include host OBJECTS
 * (`process`, `console`, `budget`), so `process.constructor.constructor("return process.env")()`
 * reached real environment variables before this, with nothing wired at all.
 *
 * WHY IT IS BUILT IN-REALM RATHER THAN HOST-SIDE. A wrapper authored on the host would
 * carry the host `Function` in its own `.constructor` and leak by the same door. These
 * wrappers are created by running this source INSIDE the context, so they are realm
 * intrinsics: `agent.constructor` is the realm's `Function`, and realm `Function` compiles
 * into the realm, where the prelude has already replaced `Math.random`.
 *
 * The host implementations live only in these closures. Nothing reachable from a script
 * holds one, so there is no path back to them.
 *
 * WHAT THIS CHANGES. A host object arrives as a realm-local copy with realm-local methods,
 * so identity does not survive: an object passed in is not the same object a script sees.
 * For the declared globals — functions and small frozen stubs — that is the intended trade,
 * and it is the reason this lives here rather than in `assembleRuntimeBindings`: the contract
 * assembles bindings, and deciding what a realm may observe is this module's job.
 *
 * WHAT THIS DOES NOT CLAIM. It closes the `.constructor` ROUTE. It does not make this a data
 * filter, and a copy is still a copy of the DATA: an owner that hands in
 * `{ env: { SECRET } }` has handed the script `env.SECRET`, read directly, with no escape and
 * no trick. Nothing here redacts, because whether a capability may carry data at all is the
 * owner's call, not this module's — so do not read "the realm no longer leaks" as "the realm
 * sees less than it was given". See `epic-tx1e`.
 */
const REALM_GLOBALS_SOURCE = `(hostGlobals) => {
  const wrap = (value) => {
    if (typeof value === "function") {
      return function (...args) { return value.apply(this, args); };
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const copy = {};
      for (const key of Object.keys(value)) copy[key] = wrap(value[key]);
      return copy;
    }
    return value;
  };
  const out = {};
  for (const key of Object.keys(hostGlobals)) out[key] = wrap(hostGlobals[key]);
  return out;
}`;

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
		// Object/Array/JSON/Math/Date/Promise/Set/Map/etc. come from the vm realm
		// itself — we deliberately do NOT inject host built-ins, whose .constructor
		// would be the host Function (a determinism-guard bypass). Math/Date are
		// neutered in-realm by DETERMINISM_PRELUDE below.
	});
	// Assigned after the context exists, because the stand-ins have to be manufactured
	// by the realm — see REALM_GLOBALS_SOURCE.
	Object.assign(context, vm.runInContext(REALM_GLOBALS_SOURCE, context)(globals));

	const wrapped = `${DETERMINISM_PRELUDE}\n(async () => {\n${body}\n})()`;
	return (await new vm.Script(wrapped, { filename: `${meta.name || "workflow"}.js` }).runInContext(context)) as T;
}
