import { describe, expect, it } from "bun:test";
import { runWorkflowScript } from "../../src/engine/vm";
import type { WorkflowMeta } from "../../src/errors";

/**
 * The realm does not hand a script the HOST's `Function`, and that is the property
 * the whole `vm.ts` design rests on. `vm.createContext` is called with the 18 declared
 * globals only — no host built-ins are injected — so `Object`/`Function`/`Promise` inside
 * the script resolve to the REALM's own, and a script that reaches for a constructor gets
 * a realm constructor whose reach stops at the realm.
 *
 * WHY THIS FILE EXISTS, stated as the failure mode: `vm.ts:12-14` already admits the
 * design is "best-effort against ACCIDENTAL nondeterminism in trusted scripts, not a
 * security wall". That admission was true and safe only because nothing tested the
 * part that IS load-bearing. A later edit that injects one host built-in to make a
 * capability easier would turn `({}).constructor.constructor("return process")()` into
 * a working escape to the host process — `process.exit`, `process.env`, `process.kill`
 * all become reachable, and every determinism guarantee built on the journal becomes
 * describing a run that cannot happen. The suite would stay green: no other row
 * inspects what the realm's constructors resolve to.
 *
 * WHAT THESE ROWS ARE NOT. They do not claim the realm is a security boundary. A
 * capability bridge that passes a host FUNCTION into the realm does leak — `vm.ts:12`
 * says so, and `.claude/plugins/workflow/src/agent-bridge.ts` is the module that will
 * do it when the capability phase lands. What is proven here is narrower and is the
 * thing the file under test controls: with the globals it injects today, the escape
 * does not reach the host.
 */

const META: WorkflowMeta = { name: "confinement-probe" } as WorkflowMeta;

async function probe(body: string): Promise<unknown> {
	return runWorkflowScript(META, body);
}

describe("the workflow realm does not leak the host's constructors", () => {
	it("resolves Object/Function from the realm, so a constructor reached by a script is not the host's", async () => {
		// The identity test, and the only row here that could distinguish "confined" from
		// "confined by accident". A script reaches its Function the way any script would:
		// through `({}).constructor.constructor`. That value is a FUNCTION in every realm
		// — `typeof` is `"function"` either way and cannot tell the two apart. What tells
		// them apart is what it can REACH, asserted in the rows below; this row fixes the
		// shape so a later edit cannot quietly make the probe itself stop being a probe.
		expect(await probe(`return typeof ({}).constructor.constructor;`)).toBe("function");
	});

	it("cannot reach the host process through a constructor, so its capabilities stay unreachable", async () => {
		// THE load-bearing row, and ONE row rather than four. `process` is one of the 18
		// declared globals, supplied by `notWiredImplementations` as
		// `Object.freeze({ cwd: () => process.cwd() })` — an inert stub. If the realm ever
		// handed the script the HOST `Function`, `constructor("return process")()` would
		// yield the host's real process and every capability below would be live: `exit`
		// kills the process mid-workflow with no journal entry, `env` leaks secrets, `kill`
		// kills a sibling, `exitCode` reads process state the realm must not observe.
		//
		// These four were separate `it` rows once, and mutation showed they are NOT
		// independent evidence: injecting the host `process` turned ALL of them red in one
		// run. Four assertions that cannot disagree are one assertion written four times,
		// and splitting them inflates the count without adding reach. They stay as four
		// assertions inside one row — each names a capability that would actually be lost —
		// but the row is the unit, and it dies or survives as one.
		const reach = `({}).constructor.constructor("return process")()`;
		expect(await probe(`return typeof ${reach}.exit;`)).toBe("undefined");
		expect(await probe(`return typeof ${reach}.env;`)).toBe("undefined");
		expect(await probe(`return typeof ${reach}.kill;`)).toBe("undefined");
		expect(await probe(`return typeof ${reach}.exitCode;`)).toBe("undefined");
	});

	it("resolves `process` to the injected inert stub, not the host's", async () => {
		// A reader who sees the row above may reasonably ask whether `process` is absent
		// from the realm entirely — and if so, whether the realm injects host built-ins at
		// all. It does not: `process` is a DECLARED global (`DECLARED_GLOBALS`), present as
		// a two-key frozen object. So `typeof process` is `"object"`, and a test asserting
		// `"undefined"` here would be asserting a falsehood — it would go red against a
		// correct engine and "pass" only after someone deleted the stub, which is the
		// opposite of the fix. What distinguishes the stub from the host's process is its
		// SHAPE: no `exit`, no `env`, no `kill` (the rows above), and a `cwd` that answers.
		expect(await probe(`return typeof process;`)).toBe("object");
		expect(await probe(`return typeof process.cwd;`)).toBe("function");
	});

	it("has no `require`, so a script cannot pull a host module in by name", async () => {
		// The one escape vector that is genuinely absent rather than neutered. A vm realm
		// has no module loader, so `require` is not merely undefined here — no injection
		// could make it a loader without replacing it with a host one, which the rows above
		// would catch. Asserted because it is the cheapest possible regression: one line,
		// and its failure names the exact property that broke.
		expect(await probe(`return typeof require;`)).toBe("undefined");
	});

	it("keeps the determinism prelude holding against a constructor reach, since that is the same escape", async () => {
		// The prelude neuters `Math.random` and `Date.now` by REASSIGNMENT on the realm's
		// globals — `globalThis.Date = SafeDate`. Reassignment defends against a script
		// that calls them, and does nothing against a script that walks to the original
		// constructor. So this row states the boundary honestly instead of implying the
		// prelude is a wall: with the globals injected today the original constructors are
		// out of reach, and these two assertions are what would notice if that changed.
		expect(await probe(`try { Math.random(); return "called"; } catch { return "threw"; }`)).toBe("threw");
		expect(await probe(`try { new Date().getTime(); return "called"; } catch { return "threw"; }`)).toBe("threw");
	});
});

/**
 * epic-vm7y — a capability the OWNER supplies is a HOST function, and a host function's
 * `.constructor` is the HOST `Function`. That is a working escape out of the realm, and it
 * defeats the determinism prelude outright.
 *
 * These rows are RED today and are expected to stay red until the capability handoff is
 * fixed. They are the falsifier for that fix — written before it, red because the leak is
 * real, and they become the proof when it closes. Written before the leak they would be
 * green and prove nothing; written after the fix they would be a description, not evidence.
 *
 * WHY THE ROWS ABOVE DID NOT CATCH THIS, though they were written to hold the same
 * property. They hold a NARROWER one, and the difference is the whole point. They probe
 * `({}).constructor.constructor`, which resolves through the REALM's
 * `Object.prototype.constructor`. A capability is reachable BY REFERENCE — that is what it
 * is for — and a host function carries the host `Function` in its `.constructor` slot with
 * no realm intrinsic in between. So the rows above prove no host built-in is reachable by
 * NAME; these prove none is reachable through a REFERENCE.
 *
 * A note on how these rows were checked, because a survivor and a no-op look identical at
 * `0 fail`. Injecting the host `Function` as a context global leaves every row above GREEN
 * — but that is a NO-OP mutation, not a surviving one: a global binding does not shadow a
 * realm intrinsic, so the mechanism was never touched. The escape that IS real bypasses the
 * realm entirely, by carrying the host `Function` in with a host object.
 */
describe("epic-vm7y — a supplied capability does not hand the script the host Function", () => {
	/** The full 18-global set the contract requires; only `agent` is a real capability. */
	function implementationsWithHostAgent(): Parameters<typeof runWorkflowScript>[2] {
		const unwired = (name: string) => () => {
			throw new Error(`${name} not wired`);
		};
		return {
			// A plain host arrow function — the shape every real capability will have.
			agent: () => "capability-result",
			parallel: unwired("parallel"),
			pipeline: unwired("pipeline"),
			workflow: unwired("workflow"),
			verify: unwired("verify"),
			judgePanel: unwired("judgePanel"),
			loopUntilDry: unwired("loopUntilDry"),
			completenessCheck: unwired("completenessCheck"),
			retry: unwired("retry"),
			gate: unwired("gate"),
			checkpoint: unwired("checkpoint"),
			log: unwired("log"),
			phase: unwired("phase"),
			cwd: process.cwd(),
			process: Object.freeze({ cwd: () => process.cwd() }),
			args: undefined,
			budget: Object.freeze({ total: 0, spent: () => 0, remaining: () => 0 }),
			console: Object.freeze({
				log: unwired("log"),
				info: unwired("info"),
				warn: unwired("warn"),
				error: unwired("error"),
			}),
		} as never;
	}

	const IMPLS = implementationsWithHostAgent();

	/**
	 * Runs a body and reports whether it reached a HOST capability, as `"leaked"` or
	 * `"closed"`. NOT a boolean, and not a bare value: the property under test is
	 * INACCESSIBLE, and there are two honest ways to achieve that — the constructor route
	 * fails, or it is gone. A row that asserted on the returned value could only see the
	 * first, so a fix that made `agent.constructor` throw would satisfy the intent and
	 * still read red. Measured: rebinding each capability with `constructor` shadowed made
	 * the route throw `TypeError: agent.constructor is not a function` — the escape WAS
	 * closed — while a value-asserting row stayed red. That is a row that punishes the fix.
	 *
	 * `"closed"` for a throw is not a way of making red go away by catching everything: a
	 * script-internal failure is the mechanism working. The alternative — asserting on a
	 * value — is what forced the contortion.
	 */
	async function reachThrough(body: string): Promise<"leaked" | "closed"> {
		try {
			return (await runWorkflowScript(META, body, IMPLS)) === undefined ? "closed" : "leaked";
		} catch {
			// The route did not produce a host value, because the route did not exist.
			return "closed";
		}
	}

	it("does not yield a constructor that can run the host's Math.random, so a resume reproduces", async () => {
		// THE row. DETERMINISM_PRELUDE exists so a re-run reproduces the values in the
		// journal; a script that reaches the real `Math.random` through its own capability
		// produces numbers the cached run can never match, and every guarantee built on the
		// journal describes a run that cannot happen. `parse.ts`'s DETERMINISM_BLOCKLIST
		// cannot catch this — it matches source text, and this path is built at runtime.
		expect(await reachThrough(`return agent.constructor("return Math.random()")();`)).toBe("closed");
	});

	it("does not yield a constructor that can read the host clock, which is what a journal records", async () => {
		// `Date.now()` is the other half of the prelude, and the more dangerous half in
		// practice: a random number is visibly wrong when a resume diverges, a plausible
		// timestamp is not. A SEPARATE row from the random one because it is a different
		// capability — a fix could neuter one and not the other — but the same route.
		expect(await reachThrough(`return agent.constructor("return Date.now()")();`)).toBe("closed");
	});

	it("does not yield a constructor that can read the host environment, so secrets stay in the realm", async () => {
		// `process.env` is the sharpest of the three. The realm's own `process` is a frozen
		// two-key stub precisely so a script cannot read secrets; reaching the HOST's
		// through the capability defeats that. Asked as "does this route hand back the host
		// process at all", because a realm `process` with no `env` and a host one are
		// indistinguishable to any assertion made after the route returns.
		expect(await reachThrough(`return agent.constructor("return process")();`)).toBe("closed");
	});
});
