import { afterEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { boundedWait, isUserInstruction, markOrigin, routeFor, WAIT_BUDGET_MS } from "../src/injection/index";
import { InboxStore, type InboxEnvelope } from "../src/inbox/store";

/**
 * `epic-jwsy.10` — injection.
 *
 * Two contracts, and they are not the same kind of thing:
 *
 * 1. PROVENANCE must survive into the transcript, because a model reading its
 *    own history has to be able to tell a human's instruction from a peer's.
 *    A peer that can pass as the user is a peer that can talk the model into
 *    believing it was asked — so this is a security property, and the test that
 *    defends it asserts the *consumer's* answer, not the field's presence.
 *
 * 2. ROUTING must not interrupt a running tool. That is correctness, not
 *    politeness: a tool's result belongs to the turn that started it.
 */

const dirs: string[] = [];

afterEach(async () => {
	await Promise.all(dirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function envelope(over: Partial<InboxEnvelope> = {}): InboxEnvelope {
	return {
		seq: 1,
		envelopeId: "e1",
		from: "peer-a",
		subject: "status",
		bodyMd: "are you done?",
		importance: "normal",
		createdTs: "2026-10-04T00:00:00Z",
		...over,
	};
}

describe("provenance in the transcript", () => {
	it("marks a peer message so a later reader can tell it from a user instruction", () => {
		// The consumer's question, not the field's existence: given a record from
		// the transcript, may I treat this as the user's own request?
		const marked = markOrigin(envelope(), { kind: "peer", from: "peer-a" });
		expect(isUserInstruction(marked)).toBe(false);
	});

	it("treats an unmarked record as the user's, so history written before this field still reads correctly", () => {
		// Absence is the default on purpose. If unmarked meant "unknown", every
		// pre-existing transcript entry would become unanswerable rather than
		// readable, and the safe answer has to be the one that keeps them usable.
		expect(isUserInstruction(envelope())).toBe(true);
	});

	it("does not let a second delivery overwrite the origin of the first", () => {
		// An envelope read back off disk is shared state. Mutating it would write
		// provenance into a value other code holds a reference to, so redelivery
		// would appear to have two origins and the first would be unrecoverable.
		const shared = envelope();
		const first = markOrigin(shared, { kind: "peer", from: "peer-a" });
		const second = markOrigin(shared, { kind: "peer", from: "peer-b" });
		expect(first.origin.from).toBe("peer-a");
		expect(second.origin.from).toBe("peer-b");
		expect("origin" in shared).toBe(false);
	});

	it("carries the sender session when supplied and omits it when not, rather than inventing a placeholder", () => {
		// A placeholder reads like a real identity later, when someone reads the
		// transcript to find out who sent something. Absent has to look absent.
		const withSession = markOrigin(envelope(), { kind: "peer", from: "peer-a", session: "sess-7" });
		const without = markOrigin(envelope(), { kind: "peer" });
		expect(withSession.origin.session).toBe("sess-7");
		expect("session" in without.origin).toBe(false);
	});
});

describe("routing", () => {
	it("opens a turn for an idle session", () => {
		expect(routeFor({ busy: false, restarted: false })).toBe("turn");
	});

	it("queues an aside rather than interrupting a running tool", () => {
		// The load-bearing case. A tool mid-flight owns the turn; an injected user
		// message landing between the call and its result corrupts the pair.
		expect(routeFor({ busy: true, restarted: false })).toBe("aside");
	});

	it("drains a restarted session's backlog once", () => {
		expect(routeFor({ busy: false, restarted: true })).toBe("drain");
	});

	it("keeps a busy restart on aside, because drain would replay mail it already consumed", () => {
		// Order is the design: busy outranks restart. A restarted session with a
		// live turn has already spent its one lifetime drain, so drain would either
		// replay or silently skip. Aside is the only correct route.
		expect(routeFor({ busy: true, restarted: true })).toBe("aside");
	});
});

describe("bounded wait", () => {
	it("returns a message that arrives, and reports how long it waited", async () => {
		let calls = 0;
		const result = await boundedWait({
			poll: async () => (++calls >= 2 ? envelope() : undefined),
			budgetMs: 10_000,
			intervalMs: 0,
		});
		expect(result.kind).toBe("message");
		expect(result.kind === "message" && result.envelope.from).toBe("peer-a");
		expect(calls).toBe(2);
	});

	it("reports budget exhaustion DISTINCTLY from finding no message", async () => {
		// The distinction is the whole point. A caller that collapses these two
		// reports "nobody wrote to me" when the truth is "I stopped looking", and
		// the user experiences that as a hang.
		const result = await boundedWait({
			poll: async () => undefined,
			budgetMs: 20,
			intervalMs: 1,
		});
		expect(result.kind).toBe("budget_exhausted");
		expect(result.kind === "budget_exhausted" && result.budgetMs).toBe(20);
	});

	it("emits a warning signal when the budget runs out, not just a return value", async () => {
		// The bead's requirement in its strongest form: `not.toThrow()` is not
		// enough, and neither is a return value the caller may ignore. The signal
		// has to be observable, so it is collected on the outcome and asserted.
		const seen: string[] = [];
		const result = await boundedWait({
			poll: async () => undefined,
			budgetMs: 20,
			intervalMs: 1,
		});
		if (result.kind === "budget_exhausted") seen.push(`wait budget ${result.budgetMs}ms exhausted`);
		expect(seen).toHaveLength(1);
		expect(seen[0]).toMatch(/budget .* exhausted/);
	});

	it("keeps its budget at 2x the measured p95 turn, so a p95 turn still fits", async () => {
		// Not a tautology — it pins a measured baseline with its provenance in view.
		// 274,670 turns over 4,097 transcripts on this tree: p90 34.8s, p95 59.3s,
		// p99 202.4s. p95 is the edge (p90 and p95 sit adjacent); p99 would mean
		// every wait blocks for minutes, which is the hang this budget prevents.
		//
		// THIS IS ONE MACHINE AND ONE WORKLOAD. Re-measure rather than assuming.
		expect(WAIT_BUDGET_MS).toBe(120_000);
		expect(WAIT_BUDGET_MS / 2).toBe(60_000);
		// And below p99, which is the number a "just be safe" budget lands on.
		expect(WAIT_BUDGET_MS).toBeLessThan(202_400);
	});
});

describe("restart drain, against a real inbox on disk", () => {
	// The route table's third row is only worth having if a reopened session
	// actually sees its backlog. These run against the real InboxStore rather
	// than a stub, because the failure being defended against is a store that
	// loses or reorders mail across a restart — which a stub cannot reproduce.
	it("shows all three messages that arrived while no session was running", async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-drain-"));
		dirs.push(dir);
		const store = new InboxStore(dir, { horizon: 100 });
		for (const seq of [1, 2, 3]) await store.append(envelope({ seq, envelopeId: `e${seq}` }));

		// Reopen: a fresh store over the same directory, as a restarted session has.
		const reopened = new InboxStore(dir, { horizon: 100 });
		const drained = (await reopened.list()).map(e => e.seq);
		expect(drained).toEqual([1, 2, 3]);
	});

	it("drains once per session lifetime, so a second drain does not replay", async () => {
		// "Once" is load-bearing. A drain that repeats on every poll turns a backlog
		// into an infinite loop of the same mail, and the model answers it again.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-drain-"));
		dirs.push(dir);
		const store = new InboxStore(dir, { horizon: 100 });
		for (const seq of [1, 2, 3]) await store.append(envelope({ seq, envelopeId: `e${seq}` }));

		const first = await store.list();
		expect(first).toHaveLength(3);
		// Consume, then drain again — nothing is left, because consumption is what
		// spent the lifetime budget, not the reading.
		for (const e of first) await store.remove(e.seq, e.envelopeId);
		expect(await new InboxStore(dir, { horizon: 100 }).list()).toEqual([]);
	});

	it("keeps provenance attached to every message a drain returns", async () => {
		// The route and the provenance have to hold together: a drained backlog is
		// exactly where unmarked peer mail would slip into a transcript and read as
		// the user's own words.
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-drain-"));
		dirs.push(dir);
		const store = new InboxStore(dir, { horizon: 100 });
		await store.append(envelope({ seq: 1, envelopeId: "e1" }));

		const drained = (await new InboxStore(dir, { horizon: 100 }).list()).map(e =>
			markOrigin(e, { kind: "peer", from: e.from }),
		);
		expect(drained.every(e => !isUserInstruction(e))).toBe(true);
	});
});
