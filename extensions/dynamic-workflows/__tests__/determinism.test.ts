import { expect, test } from "bun:test";
import { createWorkflowContext, wrapBody } from "../determinism.js";

/**
 * Both directions, deliberately.
 *
 * The "it throws" rows alone are not enough: an earlier port of this guard tested only that
 * `Math.random` was intercepted, and breaking the sandbox so that NO arithmetic worked at all
 * still left that file green. So every guard here has a matching row proving the deterministic
 * path still runs — which is also the only way the rejection rows mean anything.
 */

async function run(body: string): Promise<unknown> {
  const script = wrapBody(`return (${body})`, "test");
  return await script.runInContext(createWorkflowContext());
}

async function expectRefusal(body: string, message: RegExp): Promise<void> {
  await expect(run(body)).rejects.toThrow(message);
}

test("Math.random() is refused — a resume would otherwise replay a different value", async () => {
  await expectRefusal("Math.random()", /Math\.random\(\) is unavailable in a workflow/);
});

test("Date.now() is refused, for the same reason", async () => {
  await expectRefusal("Date.now()", /Date\.now\(\) is unavailable in a workflow/);
});

test("Date() with no arguments and `new Date()` with none are both refused", async () => {
  // Both spellings, because the prelude distinguishes them by `new.target` — a check that
  // dropped would let exactly one of the two through.
  await expectRefusal("Date()", /Date\(\) is unavailable in a workflow/);
  await expectRefusal("new Date()", /new Date\(\) is unavailable in a workflow/);
});

test("deterministic Math still works — the guard must not take the sandbox down with it", async () => {
  // The positive half. Without this, a prelude that neutered all of Math would satisfy every
  // rejection row above.
  expect(await run("Math.max(3, 7) + Math.floor(1.9)")).toBe(8);
  expect(await run("Math.abs(-5)")).toBe(5);
});

test("new Date(arg) still works, and the result is the real date, not a stand-in", async () => {
  // The prelude keeps `new Date(arg)` and passes the result through Reflect.construct, so the
  // value must behave like a Date, not merely avoid throwing.
  expect(await run(`new Date('2020-06-12T00:00:00Z').getUTCFullYear()`)).toBe(2020);
  expect(await run("Date.parse('2020-06-12T00:00:00Z')")).toBe(1591920000000);
  expect(await run("typeof Date.UTC(2020, 0, 1)")).toBe("number");
});

test("the script runs with the vm realm's own builtins, not the host's", async () => {
  // The reason the context is built empty. If a host built-in were injected, its `.constructor`
  // would be the host `Function` and the prelude's in-realm neutering could be undone from
  // inside the script. This is the observable consequence, not a restatement of the comment.
  expect(await run("[].constructor === Array")).toBe(true);
  expect(await run("Object.getPrototypeOf([]) === Array.prototype")).toBe(true);
});

test("the wrapper names the script, so a stack trace names the workflow rather than the vm", async () => {
  // `filename` is an option `vm.Script` does not expose as a readable property — it surfaces
  // in the stack trace instead, which is the only place it matters. Measured: with a filename
  // the trace reads `audit.js:1`; without one it reads `evalmachine:1`, which identifies
  // nothing when several workflows are running.
  //
  // The body is an async IIFE, so a throw inside it is a REJECTION, not a synchronous throw —
  // this must be awaited for the catch to see it at all. Unawaited, `stack` stays empty and
  // the assertion below would pass for the wrong reason if it were written the other way.
  const script = wrapBody(`throw new Error("boom")`, "audit");
  let stack = "";
  try {
    await script.runInContext(createWorkflowContext());
  } catch (error) {
    // NOT `error instanceof Error`. The error is constructed inside the vm realm, so it is a
    // different realm's Error and fails the host's `instanceof` — measured: with that guard
    // the catch assigns "" and the assertion below fails while the stack is in fact correct.
    // The realm boundary is this file's entire subject, and it is exactly what makes the
    // naive guard wrong.
    stack = String((error as { stack?: unknown } | null)?.stack ?? "");
  }
  // Asserted as "names the script" rather than a fixed line: the prelude is prepended, so
  // line numbers are a property of the prelude's length and would break on any edit to it.
  expect(stack).toContain("audit.js:");
  expect(stack).not.toContain("evalmachine");
});
