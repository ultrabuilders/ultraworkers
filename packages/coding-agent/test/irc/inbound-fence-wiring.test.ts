/**
 * The fence is FINISHED and its tests are green — and none of it ran.
 *
 * ## What was measured before this file existed
 *
 *     new IrcBus(               → irc/bus.ts:137 only, and it passed no fence
 *     IrcBus.global() callers  → messaging.ts:66, wait.ts:52,226, executor.ts:2832,
 *                                 cleanse/agent.ts:204, agent-hub-runtime.ts:39
 *     crossSessionInbound readers → peer/settings.ts only (the declaration itself)
 *
 * `IrcBus.global()` had `#fence = () => undefined`, so `#deliver`'s fence block was
 * skipped on every production send. `fenceInbound` was 455 lines with eleven passing
 * tests that proved the fence works and could prove nothing about the product,
 * because no product code called it.
 *
 * ## Why this file drives the GLOBAL bus and not a constructed one
 *
 * A test that builds `new IrcBus(agents, undefined, someFence)` exercises the fence
 * machinery and would have passed **before this wiring existed** — which is exactly
 * the shape that hides the bug. Every row here goes through `IrcBus.global()`, which
 * is what production uses and which used to be unfenced. If the accessor is dropped,
 * these go red; before the wiring they were all red too, for the right reason.
 *
 * The peer-owned `irc/peer-inbound-fence.test.ts` covers the other half — the bus's
 * three-outcome handling, with the fence stubbed. This file covers the half that did
 * not exist: a fence being INSTALLED, and the receiver context being BUILT from the
 * host's own settings.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { AgentSession } from "@oh-my-pi/pi-coding-agent/session/agent-session";
import type { IrcMessage } from "@oh-my-pi/pi-tui/tools/irc";
import {
	IrcBus,
	type IrcFenceContext,
	type IrcFenceDecision,
	type IrcFenceMessage,
	type IrcFenceReceiver,
} from "@oh-my-pi/pi-coding-agent/irc/bus";
import {
	addInboundFence,
	buildInboundFenceContext,
	hasInboundFence,
} from "@oh-my-pi/pi-coding-agent/irc/inbound-fence";
import { AgentRegistry, MAIN_AGENT_ID } from "@oh-my-pi/pi-coding-agent/registry/agent-registry";

/** A fence that records what it was asked, so a row can assert on the RECEIVER's state. */
function recordingFence(
	action: "accept" | "hold" | "refuse",
	seen?: { message?: IrcFenceMessage; receiver?: IrcFenceReceiver },
): (m: IrcFenceMessage, r: IrcFenceReceiver) => IrcFenceDecision {
	return (message, receiver) => {
		if (seen !== undefined) {
			seen.message = message;
			seen.receiver = receiver;
		}
		if (action === "accept") return { action: "accept" };
		return { action, reason: `${action}ed by test fence` };
	};
}

let disposers: (() => void)[] = [];
/** What reached the recipient, as opposed to what the fence decided. */
let inbox: IrcMessage[] = [];

beforeEach(() => {
	disposers = [];
	inbox = [];
	IrcBus.resetGlobalForTests();
	AgentRegistry.resetGlobalForTests();
	// `session` is what the bus delivers THROUGH, so a null one makes every send fail
	// with "no live session" — which reads as a fence refusal and is not one. The
	// stub is the minimum the bus touches: `isStreaming` picks the branch, and
	// `deliverIrcMessage` is the delivery itself.
	AgentRegistry.global().register({
		id: "peer-a",
		displayName: "Peer A",
		kind: "sub",
		parentId: MAIN_AGENT_ID,
		session: {
			isStreaming: true,
			deliverIrcMessage: async (message: IrcMessage) => {
				inbox.push(message);
				return "injected";
			},
		} as unknown as AgentSession,
	});
});

afterEach(() => {
	// Uninstall in reverse, so the process-wide registry is empty afterwards. Without
	// this a registration leaks into the next file — the failure mode AGENTS.md calls a
	// poisoned global.
	for (const dispose of disposers.reverse()) dispose();
	disposers = [];
	IrcBus.resetGlobalForTests();
});

/** Install a fence and keep its disposer, so unloading is exercised too. */
function install(action: "accept" | "hold" | "refuse", seen?: Parameters<typeof recordingFence>[1]): void {
	const dispose = addInboundFence({
		fence: recordingFence(action, seen),
		context: { policy: action, mode: "default" },
	});
	disposers.push(dispose);
}

describe("the global bus is fenced once a fence is installed", () => {
	it("refuses a message the fence refuses, and does not buffer it", async () => {
		// The row the whole bead is about. Before the wiring this assertion was
		// unreachable: `IrcBus.global()` had no fence, so the message was delivered.
		install("refuse");
		const receipt = await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "do the thing" });

		expect(receipt.outcome).toBe("failed");
		// Neither channel: not delivered, and not buffered. A refusal is the receiver
		// declining, so enqueueing would put the message in the very mailbox the user
		// closed, where a later `wait` would drain it as if it had been accepted.
		expect(inbox).toEqual([]);
		// `unreadCount`, not `take`: take() returns ONE message and drains the mailbox,
		// which would destroy the state the next row asserts on.
		expect(IrcBus.global().unreadCount("peer-a")).toBe(0);
	});

	it("holds a message the fence holds, and this time DOES buffer it", async () => {
		// The contrast that gives the row above meaning. `hold` is a refusal to ACT, not
		// to receive — the message stays visible for review, which is the whole reason
		// it is a distinct value rather than a flavour of `refuse`.
		install("hold");
		const receipt = await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "review me" });

		expect(receipt.outcome).toBe("failed");
		// Buffered for review — and NOT delivered, which is what "refuses to act, not
		// to receive" means. Asserting both sides is what makes this row distinct from
		// the refusal above rather than a restatement of it.
		expect(IrcBus.global().unreadCount("peer-a")).toBe(1);
		expect(inbox).toEqual([]);
	});

	it("delivers when the fence accepts, so the wiring is not merely a wall", async () => {
		// A fence that refused everything would satisfy both rows above. Without this one
		// the pair proves nothing about the accept path.
		install("accept");
		const receipt = await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "hello" });
		expect(receipt.outcome).not.toBe("failed");
		expect(inbox).toHaveLength(1);
	});

	it("uninstalls the fence on disposal, restoring the unfenced state", async () => {
		// Not a nicety: the fence is process-wide, so a leaked registration would fence
		// every later session in the process. This is the row that would catch it.
		install("refuse");
		expect(hasInboundFence()).toBe(true);
		disposers.shift()!();
		expect(hasInboundFence()).toBe(false);
		// Delivery reaches the recipient, which is what "unfenced" means here. The
		// specific outcome (`injected` vs `woken`) is the BUS's business and is covered
		// where it is decided; asserting it here would make this row fail on an
		// unrelated change to delivery routing.
		expect(await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "hi" })).not.toMatchObject({
			outcome: "failed",
		});
		expect(inbox).toHaveLength(1);
	});
});

describe("the fence is handed the receiver's own state, not a default", () => {
	it("passes the context the host built", async () => {
		// The receiver half is the fence's input. A wiring that built the context itself
		// with a constant would pass every delivery test above and this one is what
		// notices.
		const seen: Parameters<typeof recordingFence>[1] = {};
		disposers.push(
			addInboundFence({
				fence: recordingFence("accept", seen),
				context: buildInboundFenceContext({ policy: "hold", policySource: "managed", mode: "default" }),
			}),
		);
		await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "hi" });

		expect(seen.receiver?.policy).toBe("hold");
		// The SOURCE, not just the value: "your setting holds this" and "your org's
		// policy holds this" call for opposite actions by the reader, and only one is
		// fixed by editing your own config.
		expect(seen.receiver?.policySource).toBe("managed");
	});

	it("re-reads the context per send, so a settings change takes effect at once", async () => {
		// A bus that captured the context at construction would need a restart to honour
		// a setting change. `IrcFenceContext.fence` is mutable by design (bus.ts:101-112)
		// precisely so it is not; this is the row that holds that design to its promise.
		//
		// The context object is held and mutated in place, which is what a settings edit
		// does to the live object the accessor keeps handing back.
		//
		// The fence here READS the receiver it is handed rather than returning a
		// canned answer — a stub that ignored its input would pass this row whatever the
		// bus did with the context, which is the exact shape this row exists to rule out.
		const context: IrcFenceContext = { policy: "accept", mode: "default" };
		disposers.push(
			addInboundFence({
				fence: (_message, receiver) =>
					receiver.policy === "refuse" ? { action: "refuse", reason: "refused by policy" } : { action: "accept" },
				context,
			}),
		);
		expect(await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "one" })).not.toMatchObject({
			outcome: "failed",
		});

		context.policy = "refuse";
		expect(await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "two" })).toMatchObject({
			outcome: "failed",
		});
		// And nothing new reached the recipient on the second send — the decision changed,
		// not just the receipt.
		expect(inbox).toHaveLength(1);
	});

	it("does not consult the fence at all when none is installed", async () => {
		// The unfenced state is REAL, not a hole: a host with no peer extension has no
		// peer messages to fence. Asserting it keeps a future change from making an
		// absent fence fail closed — which would break every host that has never heard
		// of a fence.
		expect(hasInboundFence()).toBe(false);
		expect(await IrcBus.global().send({ from: MAIN_AGENT_ID, to: "peer-a", body: "hi" })).not.toMatchObject({
			outcome: "failed",
		});
	});
});

describe("building the receiver context from host settings", () => {
	it("keeps an unset policy unset, because unset is a fourth state and not accept", () => {
		// `peer/settings.ts` registers the enum with NO `default:`, deliberately. A
		// wiring that wrote `policy ?? "accept"` here would admit every peer message on a
		// fresh install by accident, and the difference stays invisible until a message
		// from another machine lands.
		expect(buildInboundFenceContext({ mode: "default" }).policy).toBeUndefined();
	});

	it("holds on an unrecognised value, and fails closed rather than falling through", () => {
		// A typo in a settings file must not resolve to whatever default won a race. This
		// is `policy.ts`'s rule, applied at the host boundary: hold, and say which layer
		// carried the bad value.
		const context = buildInboundFenceContext({
			mode: "default",
			invalid: { source: "repo", value: "ask-me-later" },
		});
		expect(context.policy).toBe("hold");
	});

	it("carries the permission mode through, so the class comparison is live", () => {
		// `mode: "bypassPermissions"` is what makes an unattested sender hold rather than
		// being believed. A wiring that always reported `"default"` would silently accept
		// into exactly the session where there is no downstream prompt to stop it.
		expect(buildInboundFenceContext({ mode: "bypassPermissions" }).mode).toBe("bypassPermissions");
		expect(buildInboundFenceContext({ mode: "default" }).mode).toBe("default");
	});
});
