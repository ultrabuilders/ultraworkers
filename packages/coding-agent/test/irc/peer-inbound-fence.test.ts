/**
 * `epic-jwsy.11` — the trust fence, tested through the path a message actually takes.
 *
 * ## WHY THIS FILE EXISTS AT ALL
 *
 * `packages/peer/src/fence/index.ts` shipped a complete `fenceInbound` with its own
 * tests, and `crossSessionInbound` shipped a settings entry with a full UI. Every
 * one of those tests passed while **no host code called the fence** — the setting
 * was read in zero files and delivery went straight to the bus. The fence was
 * correct and inert.
 *
 * That is the shape this file prevents: a green suite on a function nothing routes
 * through. Every row below therefore drives `IrcBus`, the object a message must
 * cross to reach a session. The peer's rows remain the right place to test the
 * fence's LOGIC; these test that the logic is REACHABLE and that the bus acts on
 * what it says.
 *
 * ## THE FENCE IS INJECTED, AND THAT IS THE POINT
 *
 * `@ultraworkers/peer` depends on this package, so importing `fenceInbound` here
 * would close a cycle — the constraint `peer/settings.ts:9-19` already documents.
 * The bus takes it as a FUNCTION instead, which also makes "is the fence wired?"
 * a decision visible at the construction site rather than one hidden in a module.
 */

import { describe, expect, it } from "bun:test";
import { type IrcMessage } from "@oh-my-pi/pi-tui/tools/irc";
import { IrcBus, type IrcFence, type IrcFenceContext } from "@oh-my-pi/pi-coding-agent/irc/bus";
import { AgentRegistry } from "@oh-my-pi/pi-coding-agent/registry/agent-registry";
import type { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";

/**
 * A stand-in for the peer's `fenceInbound`, implementing the same decision shape.
 *
 * COPIED IN SHAPE ONLY, deliberately: a faithful re-implementation of the fence's
 * order would test this file's own logic instead of the wiring, and a drift
 * between the two would then read as a wiring bug. What these rows prove is that
 * the bus consults a fence, hands it the receiver's real settings, and treats
 * `hold` and `refuse` differently from `accept`.
 */
function fenceStub(decision: "accept" | "hold" | "refuse", reason = "stubbed"): IrcFence {
	return message =>
		decision === "accept" ? { action: "accept" } : { action: decision, reason: `${reason}: ${message.from}` };
}

/**
 * A registry with two messageable agents and their sessions.
 *
 * Built like `test/tools/irc.test.ts` does — a minimal session object cast to
 * `AgentSession` — rather than by standing up a real one, because what these rows
 * observe is the RECEIPT and whether the session was reached, neither of which
 * needs a live turn.
 */
function makeBus(fence?: IrcFenceContext): {
	bus: IrcBus;
	delivered: Map<string, IrcMessage[]>;
} {
	const delivered = new Map<string, IrcMessage[]>();
	const registry = new AgentRegistry();
	for (const id of ["peer-a", "peer-b"]) {
		const inbox: IrcMessage[] = [];
		delivered.set(id, inbox);
		registry.register({
			id,
			displayName: id,
			kind: "sub",
			session: {
				isStreaming: true,
				deliverIrcMessage: async (msg: IrcMessage) => {
					inbox.push(msg);
					return "injected";
				},
			} as unknown as AgentSession,
		});
	}
	return { bus: new IrcBus(registry, undefined, fence ? () => fence : undefined), delivered };
}

describe("the inbound fence is consulted before a message reaches a session", () => {
	it("refuses without delivering, so the recipient session never sees it", async () => {
		// `refuse` is the user's decision and it is FINAL. Two observables: the
		// receipt must not read as delivered, and the session must be untouched —
		// asserting only the receipt would pass a fence that refused *after* handing
		// the message over.
		const { bus, delivered } = makeBus({ fence: fenceStub("refuse", "inbound refused by policy") });

		const receipt = await bus.send({ from: "peer-a", to: "peer-b", body: "hello" });

		expect(receipt.outcome).toBe("failed");
		expect(receipt.error).toContain("refused by policy");
		expect(delivered.get("peer-b")).toHaveLength(0);
	});

	it("holds without delivering, which is what hold means", async () => {
		// `hold` refuses to ACT but keeps the message visible for review — so the
		// session is still not reached, exactly as with `refuse`. What separates them
		// is that the hold is bufferable and a refusal is not, which is asserted in
		// the row below.
		const { bus, delivered } = makeBus({ fence: fenceStub("hold", "held for review") });

		const receipt = await bus.send({ from: "peer-a", to: "peer-b", body: "hello" });

		expect(receipt.outcome).toBe("failed");
		expect(receipt.error).toContain("held for review");
		expect(delivered.get("peer-b")).toHaveLength(0);
	});

	it("buffers a hold and does NOT buffer a refusal, because the user's answer differs", async () => {
		// The behavioural difference between the two refusals, and the reason they
		// are not the same event. A hold exists to be reviewed later, so it must
		// survive; a refusal is the user declining, so enqueueing it would hand them
		// the very message they rejected and let a later `wait` drain it as though it
		// had been accepted.
		const held = makeBus({ fence: fenceStub("hold") });
		const refused = makeBus({ fence: fenceStub("refuse") });

		await held.bus.send({ from: "peer-a", to: "peer-b", body: "kept" });
		await refused.bus.send({ from: "peer-a", to: "peer-b", body: "dropped" });

		// `unreadCount` is the reader-facing view, so it is the right observable here:
		// the question a user asks of a held message is "is it waiting for me?", and
		// that is exactly this number. `take` then confirms WHICH message survived.
		expect(held.bus.unreadCount("peer-b")).toBe(1);
		expect(held.bus.take("peer-b")).toMatchObject({ body: "kept" });
		expect(refused.bus.unreadCount("peer-b")).toBe(0);
		expect(refused.bus.take("peer-b")).toBeUndefined();
	});

	it("accepts when the fence accepts, so the wiring is not merely a wall", async () => {
		// The control. A bus that refused everything would satisfy all three rows
		// above while making the seam useless, so the accepting path must be asserted
		// rather than assumed.
		const { bus, delivered } = makeBus({ fence: fenceStub("accept") });

		const receipt = await bus.send({ from: "peer-a", to: "peer-b", body: "hello" });

		expect(receipt.outcome).toBe("injected");
		expect(delivered.get("peer-b")).toHaveLength(1);
	});

	it("hands the fence the receiver's own settings rather than a default", async () => {
		// The wiring is only real if the receiver's actual policy REACHES the fence.
		// A bus that consulted with a hardcoded `accept` would pass every row above
		// and enforce nothing, so this asserts the arguments — which is the only place
		// that distinguishes "consulted" from "consulted correctly".
		const seen: { policy?: string; killSwitch?: boolean; mode?: string }[] = [];
		const { bus } = makeBus({
			fence: (_message, receiver) => {
				seen.push({ policy: receiver.policy, killSwitch: receiver.killSwitch, mode: receiver.mode });
				return { action: "accept" };
			},
			policy: "hold",
			killSwitch: true,
			mode: "plan",
		});

		await bus.send({ from: "peer-a", to: "peer-b", body: "hello" });

		expect(seen).toEqual([{ policy: "hold", killSwitch: true, mode: "plan" }]);
	});

	it("delivers unfenced when no fence is wired, instead of failing closed", async () => {
		// The state this bus actually lived in, and it is deliberately permissive:
		// `crossSessionInbound` defaults to UNSET, and a fresh install that silently
		// dropped every peer message would be a worse failure than one that delivers
		// them. Making it a real, asserted state is what keeps "wire the fence" an
		// explicit host decision rather than a migration nobody noticed.
		const { bus, delivered } = makeBus();

		const receipt = await bus.send({ from: "peer-a", to: "peer-b", body: "hello" });

		expect(receipt.outcome).toBe("injected");
		expect(delivered.get("peer-b")).toHaveLength(1);
	});

	it("resolves the fence per send, so a settings change takes effect at once", async () => {
		// A bus built at startup outlives every settings edit a user makes in a
		// session. Capturing the context once at construction would freeze the policy
		// at process start, which is why the bus holds an ACCESSOR rather than a
		// context.
		//
		// The context is a mutable object the accessor closes over, so the two sends
		// below hit the SAME bus and must disagree. `makeBus` passes the object
		// through by reference, which is what makes this a per-send assertion rather
		// than two buses built differently.
		const context: IrcFenceContext = { fence: fenceStub("accept") };
		const { bus } = makeBus(context);

		expect((await bus.send({ from: "peer-a", to: "peer-b", body: "a" })).outcome).toBe("injected");

		context.fence = fenceStub("refuse", "policy changed mid-session");

		const second = await bus.send({ from: "peer-a", to: "peer-b", body: "b" });
		expect(second.outcome).toBe("failed");
		expect(second.error).toContain("policy changed mid-session");
	});

	it("consults the fence before the registry, so a refusal costs nothing", async () => {
		// PLACEMENT, not merely presence. The registry lookup and the lifecycle gate
		// sit below this consult, and the gate revives a parked session to receive the
		// message. A fence consulted after it would wake a machine to deliver
		// something the user declined — and the wake is the irreversible part, while
		// the refusal is free precisely because nothing has happened yet.
		//
		// Asserted on the sender side: an unknown recipient must still produce the
		// FENCE's refusal rather than the registry's "unknown agent" error, which can
		// only hold if the consult runs first.
		const { bus } = makeBus({ fence: fenceStub("refuse", "consulted first") });

		const receipt = await bus.send({ from: "peer-a", to: "nobody", body: "hello" });

		expect(receipt.error).toContain("consulted first");
		expect(receipt.error).not.toContain("Unknown agent");
	});
});

/**
 * The policy values the bus accepts must be the fence's own.
 *
 * Declared rather than imported in both packages — `peer/settings.ts:9-19` gives
 * the reason — so the agreement needs asserting from somewhere. Drift here yields
 * a settings panel offering a value the fence rejects, which stays silent until a
 * user picks it.
 */
describe("the bus's policy surface agrees with the fence's", () => {
	it("offers exactly accept | hold | refuse", async () => {
		const { IRC_INBOUND_POLICIES } = await import("@oh-my-pi/pi-coding-agent/irc/bus");
		expect([...IRC_INBOUND_POLICIES]).toEqual(["accept", "hold", "refuse"]);
	});

	it("accepts a context typed as the bus's own surface", () => {
		// The compile-time half of the same contract: an unknown policy is a type
		// error, not a runtime surprise. `IrcFenceContext` is exported for this.
		const context: IrcFenceContext = { policy: "hold", policySource: "user", mode: "default" };
		expect(context.policy).toBe("hold");
	});
});
