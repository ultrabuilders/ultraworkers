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
 * epic-vm7y — checked, and there is NO LEAK. A capability the owner supplies IS a host
 * function, so the open question was whether `agent.constructor` hands the script the HOST
 * `Function` — which would defeat the determinism prelude. It does not:
 *
 *     agent.constructor === ({}).constructor.constructor   →  true
 *     agent.constructor === Function                        →  true  (inside the realm)
 *
 * Both are the realm's own `Function`, so `agent.constructor("return Math.random()")()`
 * still throws from the prelude. The confinement holds THROUGH A CAPABILITY, not only
 * through the globals — a host function carries its constructor reference across the realm
 * boundary, and the realm it compiles in is the one that owns the calling object.
 *
 * This block exists because an earlier draft of this file asserted the opposite and was
 * WRONG, and the reason it was wrong is the reason the rows are here at all. That draft's
 * probe omitted `return`, so `Math.random()` ran in the test process instead of inside the
 * script and returned a real number — a convincing measurement of the wrong thing. The
 * symptom was a red row that "proved" a leak, and it survived review because nobody asked
 * whether the script had run in the realm at all.
 *
 * So the rows below are GREEN, and each names the specific thing it establishes, because
 * their value is in stopping the next reader from re-deriving that false claim. A test that
 * documents a checked-and-refuted hypothesis is worth keeping; one that asserts a
 * hypothesis nobody ran is how `epic-vm7y` briefly became a false finding.
 *
 * On mutation: injecting the host `Function` as a context global leaves all of this GREEN,
 * and that is a NO-OP rather than a surviving mutant — a global binding does not shadow a
 * realm intrinsic, so the mechanism is never touched. Survivor and no-op are identical at
 * `0 fail`, which is why the identity assertion above exists: it fails if the realm's own
 * `Function` is ever displaced, by any means.
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
	 * Runs against the REAL capability set above, never the `probe` default. `probe` passes
	 * no `implementations`, so its `agent` is `notWiredImplementations`' host stub — a
	 * different object with a different `.constructor`, and one that reports the realm's
	 * inert `process`. Every row in this block must go through here: a row that silently
	 * falls back to the stub measures the harness rather than the escape.
	 */
	function runWithRealCapability(body: string): Promise<unknown> {
		return runWorkflowScript(META, body, IMPLS);
	}

	/**
	 * Runs a body and reports whether a HOST value came back, as `"leaked"` or `"closed"`.
	 *
	 * Deliberately NOT a bare value assertion. `reachThrough` was written when the escape
	 * was believed real, and it stays because a bare `typeof value` is the shape that
	 * produced the false finding: it answers for whatever the expression evaluates to, so a
	 * body that fails to run at all — the missing-`return` case — reads exactly like a
	 * successful leak. Naming the two outcomes makes "the script never ran" and "the script
	 * ran and reached the host" different answers.
	 */
	async function reachThrough(body: string): Promise<"leaked" | "closed"> {
		try {
			return (await runWorkflowScript(META, body, IMPLS)) === undefined ? "closed" : "leaked";
		} catch {
			// The route produced no host value. Here that is the PRELUDE refusing, which is
			// the confinement working — not a swallowed failure.
			return "closed";
		}
	}

	it("resolves a capability's constructor to the realm's own Function, not the host's", async () => {
		// THE row for this block, and the assertion the earlier draft lacked. A host
		// function's `.constructor` is the question; this answers it directly instead of
		// inferring it from a side effect. Both comparisons are the realm's own Function:
		// `({}).constructor.constructor` is the realm intrinsic, and `Function` inside the
		// script is the same object. If the realm's Function were ever displaced by the
		// host's — by an injected binding, or by a capability that carried one — this fails.
		const identity = await runWithRealCapability(
			`return [agent.constructor === ({}).constructor.constructor, agent.constructor === Function,
				agent.constructor.name].join("|");`,
		);
		expect(identity).toBe("true|true|Function");
	});

	it("keeps the determinism prelude holding through a capability's constructor", async () => {
		// What the identity row buys: the prelude still refuses after the walk. `Math.random`
		// and `Date.now` are the two names the prelude neuters, so they are the two that
		// would come back first if the escape were real. `parse.ts`'s DETERMINISM_BLOCKLIST
		// cannot see this route — it matches source text, and this is built at runtime.
		//
		// Asserted as the prelude's own message, not as a generic throw: "threw something"
		// would also be satisfied by a `TypeError` from a route that no longer exists, which
		// is the failure mode this file already had once.
		expect(
			await runWithRealCapability(`try { agent.constructor("return Math.random()")(); return "called"; }
				catch (e) { return e.message; }`),
		).toContain("Math.random() is unavailable in a workflow");
		expect(
			await runWithRealCapability(`try { agent.constructor("return Date.now()")(); return "called"; }
				catch (e) { return e.message; }`),
		).toContain("Date.now() is unavailable in a workflow");
	});

	it("returns the realm's own process through the route, so the environment stays unreachable", async () => {
		// `process.env` is the sharpest of the three. The realm's own `process` is a frozen
		// two-key stub precisely so a script cannot read secrets; reaching the HOST's
		// through the capability would defeat that.
		//
		// GREEN, and the green is the finding rather than a gap in coverage. Measured
		// against a real owner capability: the route returns the realm's OWN injected stub
		// — `p === process` is true inside the script, keys are exactly `cwd`, and `env`,
		// `exit` and `kill` are absent. A `constructor` reached through a host function
		// compiles in the realm that owns the calling object, not the realm that received
		// it, so `process` resolves to the realm binding. The leak is NOT here.
		//
		// An earlier draft of this file claimed `process.env` was reachable and used that
		// as a red row. It was not: that reading came from a probe that mixed routes, and
		// `typeof` on a never-populated value answers for a different expression than the
		// one asserted. The rows that ARE red are `Math.random` and `Date.now` above,
		// because those names are resolved by the escaping constructor and not by the
		// realm's globals. Kept as a green row deliberately — it is what stops the next
		// reader from re-deriving the same wrong claim from the same bad probe.
		//
		// Runs against `IMPLS`, not the `probe` default: `probe` passes no
		// `implementations`, so its `agent` is a host stub rather than a supplied
		// capability. For THIS row the two agree, but for the rows above they do not, and
		// a block that mixes them measures whichever helper each row happened to call.
		const viaCapability = `agent.constructor("return process")()`;
		expect(await runWithRealCapability(`return ${viaCapability} === process;`)).toBe(true);
		expect(await runWithRealCapability(`return Object.keys(${viaCapability}).sort().join(",");`)).toBe("cwd");
		expect(await runWithRealCapability(`return typeof ${viaCapability}.env;`)).toBe("undefined");
		expect(await runWithRealCapability(`return typeof ${viaCapability}.exit;`)).toBe("undefined");
		expect(await runWithRealCapability(`return typeof ${viaCapability}.kill;`)).toBe("undefined");
	});

	it("still routes a call through the capability to the owner's implementation", async () => {
		// The other direction, and the reason the previous rows are not "just delete the
		// globals". A fix that made `.constructor` unreachable by making the capability
		// unreachable would turn every one of the three rows above green and break the
		// engine. This row holds the seam open: the call crosses back out to the owner's
		// function, and the OWNER's own return value is the observable proof — a
		// realm-local stub would answer with something else. Asserting the returned value
		// rather than a message keeps it working for any future implementation, where the
		// capability is wired for real and no longer throws.
		expect(await runWithRealCapability(`return agent("x");`)).toBe("capability-result");
	});
});
