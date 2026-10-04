// Copied from `@quintinshaw/pi-dynamic-workflows` v3.13.1 — `src/workflow.ts`.
// Copy source per epic-dynamic-workflows-259n.3: prelude at :517-546, sandbox at :1799-1817.
//
// WHAT IS COPIED VERBATIM: DETERMINISM_PRELUDE, the vm context construction, and the
// body-wrapping expression.
//
// WHAT IS NOT, and why: upstream's `vm.createContext({ ...projectGlobals })` is fed by
// `WORKFLOW_CAPABILITY_CONTRACT.assembleRuntimeBindings(runtimeImplementations)`. That
// contract is a separate concern from this bead (it is the `agent`/`phase`/`workflow`
// bridge), so it is not copied here and the context is built empty. The property that
// matters to this bead is preserved verbatim and is the reason the empty object is safe:
// host built-ins are still NOT injected, so `Object`/`Math`/`Date`/`Function` resolve to the
// vm realm's own, and the prelude neuters Math/Date in-realm rather than wrapping host ones.

import * as vm from "node:vm";

/**
 * Runtime determinism hardening, run inside the vm realm BEFORE the user script.
 * It neuters the nondeterministic builtins that would break resume (they'd make a
 * re-run produce different values than the cached journal):
 *   - Math.random()        -> throws
 *   - Date.now()           -> throws
 *   - Date() / new Date()  -> throws (no-arg); new Date(arg) still works
 * Using the vm realm's own Math/Date/Reflect (not host objects) means this adds
 * no host-`Function` escape. Note: vm is not a security sandbox — an injected
 * bridge function's `.constructor` is still the host Function, so a determined
 * script could bypass this. The guard is best-effort against ACCIDENTAL
 * nondeterminism from trusted (user / guided-LLM) scripts, not a security wall.
 */
export const DETERMINISM_PRELUDE = [
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
 * A vm realm carrying no host built-ins.
 *
 * The empty spread is the load-bearing part, and it is upstream's reasoning rather than an
 * omission: `Object`/`Array`/`JSON`/`Math`/`Date`/`Promise`/`Set`/`Map` come from the vm
 * realm itself, because injecting the host's versions would hand a script a `.constructor`
 * that is the host `Function` — a determinism-guard bypass. Math and Date are neutered
 * in-realm by DETERMINISM_PRELUDE, not wrapped from the host.
 */
export function createWorkflowContext(bindings: Record<string, unknown> = {}): vm.Context {
  return vm.createContext({ ...bindings });
}

/**
 * The prelude, then the user body as an async IIFE — upstream's expression, unchanged.
 *
 * `filename` is what a stack trace from inside a script will name, so a failing workflow
 * reports its own name rather than "evalmachine".
 */
export function wrapBody(body: string, filename: string): vm.Script {
  const wrapped = `${DETERMINISM_PRELUDE}\n(async () => {\n${body}\n})()`;
  return new vm.Script(wrapped, { filename: `${filename}.js` });
}
